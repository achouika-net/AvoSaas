import * as fs from 'fs';
import * as path from 'path';
import prisma from '../lib/prisma';
import { DocumentProcessor } from './document-processor';

export interface SyncStatus {
  isSyncing: boolean;
  scanned: number;
  total: number;
  new: number;
  updated: number;
  errors: number;
  lastSync?: Date | null;
}

export class LibraryScanner {
  private static SCAN_DIR = path.join(process.cwd(), 'office_archive');

  static async getStatus(centerId: string): Promise<SyncStatus> {
    const job = await prisma.syncJob.findUnique({
      where: { centerId }
    });
    
    if (!job) {
      return {
        isSyncing: false,
        scanned: 0,
        total: 0,
        new: 0,
        updated: 0,
        errors: 0
      };
    }
    
    return {
      isSyncing: job.isSyncing,
      scanned: job.scanned,
      total: job.total,
      new: job.new,
      updated: job.updated,
      errors: job.errors,
      lastSync: job.lastSync
    };
  }

  /**
   * Main sync function, now purely asynchronous (Background)
   */
  static async startSync(centerId: string) {
    const existingJob = await prisma.syncJob.findUnique({ where: { centerId } });
    if (existingJob?.isSyncing) return;

    if (!fs.existsSync(this.SCAN_DIR)) {
      fs.mkdirSync(this.SCAN_DIR, { recursive: true });
    }

    // Initialize job immediately so frontend UI can show loading state instantly
    await prisma.syncJob.upsert({
      where: { centerId },
      update: {
        isSyncing: true,
        scanned: 0,
        total: 0, // Will be updated correctly by the background job
        new: 0,
        updated: 0,
        errors: 0
      },
      create: {
        centerId,
        isSyncing: true,
        scanned: 0,
        total: 0,
        new: 0,
        updated: 0,
        errors: 0
      }
    });

    // Fire & forget background processing (Start with Directory Discovery)
    this.discoverAndProcessFiles(centerId).catch(err => {
      console.error(`Critical sync fail for ${centerId}:`, err);
      prisma.syncJob.update({
        where: { centerId },
        data: { isSyncing: false }
      }).catch(() => {});
    });
  }

  private static async discoverAndProcessFiles(centerId: string) {
    console.log(`Starting recursive discovery in ${this.SCAN_DIR}...`);
    // 'readdir' for 30k+ files can take a minute on Windows Docker, doing it in background
    const allFiles = await fs.promises.readdir(this.SCAN_DIR, { recursive: true }) as string[];
    const files = allFiles.filter(f => f.match(/\.(docx|doc|pdf)$/i));
    
    console.log(`Scanner found ${files.length} supported files across all subdirectories.`);
    
    // Update the total now that discovery is done
    await prisma.syncJob.update({
      where: { centerId },
      data: { total: files.length }
    });

    await this.processFilesParallel(centerId, files);
  }

  private static async processFilesParallel(centerId: string, files: string[]) {
    const total = files.length;
    let scanned = 0;
    let newlyCreated = 0;
    let updatedCount = 0;
    let errorCount = 0;

    console.log(`Starting stable serial sync for ${total} files...`);

    // Process everything sequentially (one-by-one) for 100% memory safety
    const BATCH_SIZE = 500;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const currentBatch = files.slice(i, i + BATCH_SIZE);
      
      // Fetch metadata for existence checks to optimize DB hits
      const existingMemos = await prisma.libraryMemo.findMany({
        where: { centerId, filePath: { in: currentBatch } },
        select: { id: true, filePath: true, lastModified: true }
      });

      const memoMap = new Map<string, { id: string, lastModified: Date | null }>();
      existingMemos.forEach(m => {
        if (m.filePath) memoMap.set(m.filePath, { id: m.id, lastModified: m.lastModified });
      });

      for (const file of currentBatch) {
        try {
          const filePath = path.join(this.SCAN_DIR, file);
          
          // Safety: Skip if file doesn't exist or is too large (>10MB)
          if (!fs.existsSync(filePath)) {
            continue;
          }
          const stats = fs.statSync(filePath);
          if (stats.size > 10 * 1024 * 1024) {
            console.warn(`Skipping large file (>10MB): ${file}`);
            errorCount++;
            continue;
          }

          const existing = memoMap.get(file);

          // Skip if same modification date
          if (existing && existing.lastModified?.getTime() === stats.mtime.getTime()) {
            continue;
          }

          console.log(`[${scanned + 1}/${total}] Processing: ${file}`);

          // Extract content
          let content = '';
          const ext = path.extname(file).toLowerCase();
          
          if (ext === '.docx') {
            content = await DocumentProcessor.processDocx(filePath);
          } else if (ext === '.doc') {
            content = await DocumentProcessor.processDoc(filePath);
          } else if (ext === '.pdf') {
            content = await DocumentProcessor.processPdf(filePath);
          }

          const category = DocumentProcessor.detectCategory(content, file);

          // Update or Create
          if (existing) {
            await prisma.libraryMemo.update({
              where: { id: existing.id },
              data: { content, category, lastModified: stats.mtime }
            });
            updatedCount++;
          } else {
            await prisma.libraryMemo.create({
              data: {
                title: file.replace(/\.(docx|doc|pdf)$/i, ''),
                content,
                category,
                centerId,
                filePath: file,
                lastModified: stats.mtime
              }
            });
            newlyCreated++;
          }
        } catch (err) {
          console.error(`Error processing ${file}:`, err);
          errorCount++;
        } finally {
          scanned++;
          
          // Granular Heartbeat: Every file for first 100, then every 50
          const shouldUpdate = scanned < 100 || scanned % 50 === 0 || scanned === total;
          if (shouldUpdate) {
            await prisma.syncJob.update({
              where: { centerId },
              data: {
                scanned,
                new: newlyCreated,
                updated: updatedCount,
                errors: errorCount
              }
            }).catch(() => {});
          }
        }
      }
    }

    // Mark Job as finished
    await prisma.syncJob.update({
      where: { centerId },
      data: { isSyncing: false, lastSync: new Date() }
    }).catch(() => {});
    
    console.log(`Ultra-stable sync completed: ${newlyCreated} newly created, ${updatedCount} updated.`);
  }
}
