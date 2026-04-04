import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Case {
  id?: string;
  title: string;
  type: string;
  courtName: string;
  opponentName?: string;
  primaryNumber?: string;
  appealNumber?: string;
  supremeCourtNumber?: string;
  status?: string;
  currentStage?: string;
  clientId: string;
  centerId: string;
  createdAt?: string | Date;
}

@Injectable({
  providedIn: 'root'
})
export class CaseService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    this.apiUrl = `http://${host}:3005/api/cases`;
  }

  getCases(clientId?: string): Observable<Case[]> {
    const url = clientId ? `${this.apiUrl}?clientId=${clientId}` : this.apiUrl;
    return this.http.get<Case[]>(url);
  }

  createCase(caseData: Case): Observable<Case> {
    return this.http.post<Case>(this.apiUrl, caseData);
  }

  updateCase(id: string, caseData: Partial<Case>): Observable<Case> {
    return this.http.put<Case>(`${this.apiUrl}/${id}`, caseData);
  }

  deleteCase(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
