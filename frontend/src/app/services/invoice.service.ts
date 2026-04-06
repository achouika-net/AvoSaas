import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Invoice {
  id?: string;
  amount: number;
  status: 'PAID' | 'UNPAID' | 'PARTIAL';
  type: 'FEES' | 'EXPENSE' | 'PREPAYMENT';
  description?: string;
  clientId: string;
  caseId?: string;
  createdAt?: string | Date;
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    this.apiUrl = `http://${host}:3005/api/invoices`;
  }

  getInvoices(clientId: string): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(`${this.apiUrl}?clientId=${clientId}`);
  }

  createInvoice(invoice: Invoice): Observable<Invoice> {
    return this.http.post<Invoice>(this.apiUrl, invoice);
  }

  updateInvoice(id: string, invoice: Partial<Invoice>): Observable<Invoice> {
    return this.http.put<Invoice>(`${this.apiUrl}/${id}`, invoice);
  }

  deleteInvoice(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  updateStatus(id: string, status: string): Observable<Invoice> {
    return this.http.put<Invoice>(`${this.apiUrl}/${id}/status`, { status });
  }
}
