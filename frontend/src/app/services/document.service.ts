import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Document {
  id?: string;
  title: string;
  content: string;
  fileUrl?: string;
  mimeType?: string;
  type?: 'TEXT' | 'ATTACHMENT';
  caseId: string;
  createdAt?: string | Date;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    this.apiUrl = `http://${host}:3005/api/documents`;
  }

  getDocuments(caseId: string): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.apiUrl}?caseId=${caseId}`);
  }

  createDocument(doc: Document): Observable<Document> {
    return this.http.post<Document>(this.apiUrl, doc);
  }

  updateDocument(id: string, doc: Partial<Document>): Observable<Document> {
    return this.http.put<Document>(`${this.apiUrl}/${id}`, doc);
  }

  deleteDocument(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  scanOcr(imageBase64: string, title: string, caseId: string, centerId: string): Observable<Document> {
    return this.http.post<Document>(`${this.apiUrl}/ocr`, { imageBase64, title, caseId, centerId });
  }
}
