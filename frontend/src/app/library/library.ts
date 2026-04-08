import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './library.html'
})
export class LibraryComponent implements OnInit, OnDestroy {
  memos: any[] = [];
  totalMemos: number = 0;
  isLoading = false;
  isSyncing = false;
  syncStatus: any = null;
  Math = Math;
  private pollInterval: any;
  
  // Pagination & Filtering
  page = 0;
  take = 20;
  searchQuery = '';
  selectedCategory = '';

  // Form for new memo
  showAddModal = false;
  showPreviewModal = false;
  selectedMemo: any = null;
  newMemo = {
    title: '',
    content: '',
    category: 'CIVIL',
    centerId: 'center-1'
  };

  private apiUrl: string;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    this.apiUrl = `http://${host}:3005/api/library`;
  }

  ngOnInit() {
    this.fetchMemos();
    this.fetchSyncStatus(); // Check if a sync is already running
  }

  fetchMemos(resetPage = false) {
    if (resetPage) this.page = 0;
    this.isLoading = true;
    this.cdr.detectChanges();
    
    let url = `${this.apiUrl}?centerId=${this.newMemo.centerId}&skip=${this.page * this.take}&take=${this.take}`;
    if (this.searchQuery) url += `&search=${encodeURIComponent(this.searchQuery)}`;
    if (this.selectedCategory) url += `&category=${this.selectedCategory}`;

    this.http.get(url)
      .subscribe({
        next: (data: any) => {
          this.memos = data.docs || [];
          this.totalMemos = data.total || 0;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error("fetchMemos Error:", err);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  nextPage() {
    if ((this.page + 1) * this.take < this.totalMemos) {
      this.page++;
      this.fetchMemos();
    }
  }

  prevPage() {
    if (this.page > 0) {
      this.page--;
      this.fetchMemos();
    }
  }

  previewMemo(id: string) {
    this.isLoading = true;
    this.http.get(`${this.apiUrl}/${id}`).subscribe({
      next: (memo: any) => {
        this.selectedMemo = memo;
        this.showPreviewModal = true;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => this.isLoading = false
    });
  }

  downloadMemo(id: string, title: string) {
    this.http.get(`${this.apiUrl}/${id}`).subscribe((memo: any) => {
      const fileName = `${title || 'memo'}.docx`;
      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${title}</title></head>
        <body style='font-family: Arial; direction: rtl; text-align: right;'>
          ${memo.content}
        </body>
        </html>
      `;
      const blob = new Blob(['\ufeff', htmlContent], {
        type: 'application/msword'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
    });
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  saveMemo() {
    if (!this.newMemo.title || !this.newMemo.content) return;

    this.http.post(this.apiUrl, this.newMemo)
      .subscribe({
        next: () => {
          this.fetchMemos(true);
          this.showAddModal = false;
          this.newMemo.title = '';
          this.newMemo.content = '';
        }
      });
  }

  deleteMemo(id: string) {
    if (confirm('هل أنت متأكد من حذف هذه المذكرة من الأرشيف؟')) {
      this.http.delete(`${this.apiUrl}/${id}`)
        .subscribe(() => this.fetchMemos());
    }
  }

  syncArchive() {
    this.isSyncing = true;
    this.syncStatus = { scanned: 0, total: 31922, new: 0, updated: 0, errors: 0, isSyncing: true };
    this.http.post(`${this.apiUrl}/sync`, { centerId: this.newMemo.centerId })
      .subscribe({
        next: (res: any) => {
          this.syncStatus = res;
          this.startPolling();
        },
        error: () => this.isSyncing = false
      });
  }

  fetchSyncStatus() {
    this.http.get(`${this.apiUrl}/status?centerId=${this.newMemo.centerId}`)
      .subscribe({
        next: (status: any) => {
          this.syncStatus = status;
          this.isSyncing = (status as any).isSyncing;
          if (this.isSyncing) {
            this.startPolling();
          }
        },
        error: (err) => console.error('Error fetching sync status:', err)
      });
  }

  private lastFetchTime = 0;

  private startPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    
    this.pollInterval = setInterval(() => {
      this.http.get(`${this.apiUrl}/status?centerId=${this.newMemo.centerId}`)
        .subscribe({
          next: (status: any) => {
            this.syncStatus = status;
            
            // Re-fetch table every 4 seconds during sync to show progress
            const now = Date.now();
            if (this.syncStatus && this.syncStatus.isSyncing && (now - this.lastFetchTime > 4000)) {
              this.fetchMemos();
              this.lastFetchTime = now;
            }

            if (!status.isSyncing) {
              clearInterval(this.pollInterval);
              this.isSyncing = false;
              this.fetchMemos();
            }
          },
          error: (err) => {
            console.warn('Transient polling error ignored:', err);
          }
        });
    }, 2000);
  }

  getCategoryLabel(category: string): string {
    switch (category) {
      case 'CIVIL': return 'مدني';
      case 'COMMERCIAL': return 'تجاري';
      case 'LABOUR': return 'اجتماعي (شغل)';
      case 'FAMILY': return 'قضاء الأسرة';
      case 'ADMINISTRATIVE': return 'إداري';
      case 'CRIMINAL': return 'جنائي';
      default: return category;
    }
  }

  getShortTitle(title: string): string {
    if (!title) return 'مذكرة بدون عنوان';
    // Split by either forward slash or backslash and get the last part
    const parts = title.split(/[/\\]/);
    return parts[parts.length - 1];
  }
}
