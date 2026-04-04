import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout, catchError, throwError, BehaviorSubject, tap } from 'rxjs';

export interface Client {
  id?: string;
  name: string;
  type: 'INDIVIDUAL' | 'COMPANY' | 'PROFESSIONAL';
  identityNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: 'ACTIVE' | 'CLOSED';
  centerId: string;
  createdAt?: string | Date;
  _count?: {
    cases: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private apiUrl: string;
  private clientsSubject = new BehaviorSubject<Client[]>([]);
  public clients$ = this.clientsSubject.asObservable();

  constructor(private http: HttpClient) {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    this.apiUrl = `http://${host}:3005/api/clients`;
  }

  private handleRequest<T>(req: Observable<T>): Observable<T> {
    return req.pipe(
      timeout(10000),
      catchError(err => {
        console.error('API Request Error:', err);
        return throwError(() => err);
      })
    );
  }

  getClients(centerId?: string): Observable<Client[]> {
    const url = centerId ? `${this.apiUrl}?centerId=${centerId}` : this.apiUrl;
    return this.handleRequest(this.http.get<Client[]>(url)).pipe(
      tap(clients => this.clientsSubject.next(clients))
    );
  }

  getClientById(id: string): Observable<Client> {
    return this.handleRequest(this.http.get<Client>(`${this.apiUrl}/${id}`));
  }

  createClient(client: Client): Observable<Client> {
    return this.handleRequest(this.http.post<Client>(this.apiUrl, client)).pipe(
      tap(newClient => {
        const current = this.clientsSubject.value;
        this.clientsSubject.next([newClient, ...current]);
      })
    );
  }

  updateClient(id: string, client: Partial<Client>): Observable<Client> {
    return this.handleRequest(this.http.put<Client>(`${this.apiUrl}/${id}`, client)).pipe(
      tap(updated => {
        const current = this.clientsSubject.value;
        this.clientsSubject.next(current.map(c => c.id === id ? updated : c));
      })
    );
  }

  deleteClient(id: string): Observable<any> {
    return this.handleRequest(this.http.delete(`${this.apiUrl}/${id}`)).pipe(
      tap(() => {
        const current = this.clientsSubject.value;
        this.clientsSubject.next(current.filter(c => c.id !== id));
      })
    );
  }
}
