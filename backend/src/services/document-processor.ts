import * as fs from 'fs';
import * as path from 'path';
import * as mammoth from 'mammoth';
const pdf = require('pdf-parse');
const WordExtractor = require('word-extractor');

export interface ExtractedDoc {
  title: string;
  content: string;
  category: string;
}

export class DocumentProcessor {
  /**
   * Extracts text from .docx using Mammoth
   */
  static async processDocx(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      console.error(`Error processing docx ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Extracts text from legacy .doc using word-extractor
   */
  static async processDoc(filePath: string): Promise<string> {
    try {
      const extractor = new WordExtractor();
      const doc = await extractor.extract(filePath);
      return doc.getBody();
    } catch (error) {
      console.error(`Error processing doc ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Extracts text from .pdf using pdf-parse
   */
  static async processPdf(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } catch (error) {
      console.error(`Error processing pdf ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Simple heuristic to determine legal category from text
   */
  static detectCategory(text: string, filePath: string = ''): string {
    const content = text.toLowerCase();
    const pathLower = filePath.toLowerCase();

    // 1. Path-based detection (Highly reliable since lawyers organize files in named folders)
    if (pathLower.includes('تجاري') || pathLower.includes('commercial')) return 'COMMERCIAL';
    if (pathLower.includes('اداري') || pathLower.includes('إداري') || pathLower.includes('administrative')) return 'ADMINISTRATIVE';
    if (pathLower.includes('جنائي') || pathLower.includes('جنحي') || pathLower.includes('penal') || pathLower.includes('جنايات')) return 'CRIMINAL';
    if (pathLower.includes('شغل') || pathLower.includes('اجتماعي') || pathLower.includes('social') || pathLower.includes('labour')) return 'LABOUR';
    if (pathLower.includes('أسرة') || pathLower.includes('اسرة') || pathLower.includes('famille') || pathLower.includes('طلاق')) return 'FAMILY';

    // 2. Strict Content-based detection
    // Uses specific court names rather than generic words (e.g., skips "أب لأسرة")
    if (content.includes('المحكمة الإدارية')) return 'ADMINISTRATIVE';
    if (content.includes('المحكمة التجارية') || content.includes('سجل تجاري') || content.includes('عقد تسيير حر')) return 'COMMERCIAL';
    if (content.includes('غرفة الجنايات') || content.includes('وكيل الملك') || content.includes('محضر الضابطة القضائية')) return 'CRIMINAL';
    if (content.includes('قسم قضاء الأسرة') || content.includes('محكمة الأسرة') || content.includes('تطليق للشقاق') || content.includes('النفقة')) return 'FAMILY';
    if (content.includes('طرد تعسفي') || content.includes('مفتش الشغل') || content.includes('نزاعات الشغل')) return 'LABOUR';

    return 'CIVIL'; // Default
  }
}
