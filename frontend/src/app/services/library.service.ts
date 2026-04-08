import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LibraryMemo {
  id?: string;
  title: string;
  content: string;
  category: string;
  centerId: string;
  createdAt?: string | Date;
}

@Injectable({
  providedIn: 'root'
})
export class LibraryService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    this.apiUrl = `http://${host}:3005/api/library`;
  }

  indexMemo(memo: LibraryMemo): Observable<LibraryMemo> {
    return this.http.post<LibraryMemo>(this.apiUrl, memo);
  }

  getLibraryDocs(centerId: string, search?: string, category?: string, skip: number = 0, take: number = 20): Observable<{docs: any[], total: number}> {
    let url = `${this.apiUrl}?centerId=${centerId}&skip=${skip}&take=${take}`;
    if (search) url += `&search=${search}`;
    if (category) url += `&category=${category}`;
    return this.http.get<{docs: any[], total: number}>(url);
  }

  getMemoById(id: string): Observable<LibraryMemo> {
    return this.http.get<LibraryMemo>(`${this.apiUrl}/${id}`);
  }
}
