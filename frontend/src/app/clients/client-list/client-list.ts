import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService, Client } from '../../services/client.service';
import { ClientModalComponent } from '../client-modal/client-modal';
import { finalize } from 'rxjs';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ClientModalComponent, RouterModule],
  templateUrl: './client-list.html',
})
export class ClientListComponent implements OnInit {
  clients: Client[] = [];
  filteredClients: Client[] = [];
  searchTerm: string = '';
  selectedType: string = 'ALL';
  isLoading: boolean = false;
  isModalOpen: boolean = false;

  constructor(
    private clientService: ClientService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    console.log('ClientListComponent: Initializing...');
    
    // 1. Subscribe to the stream (BehaviorSubject)
    this.clientService.clients$.subscribe(data => {
      console.log('ClientListComponent: Received data from stream', data.length);
      this.clients = data;
      this.filterClients();
      this.cdr.detectChanges(); // Force UI refresh
    });

    // 2. Trigger initial load or background refresh
    if (this.clients.length === 0) {
      this.loadClients();
    } else {
      this.loadClients(true);
    }
  }

  loadClients(silent = false) {
    if (!silent) this.isLoading = true;
    this.clientService.getClients().pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (data) => {
        // Data is handled by the subscription in ngOnInit
      },
      error: (err) => {
        console.error('Error loading clients:', err);
      }
    });
  }

  filterClients() {
    this.filteredClients = this.clients.filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
                           client.phone?.includes(this.searchTerm) || 
                           client.identityNumber?.includes(this.searchTerm);
      const matchesType = this.selectedType === 'ALL' || client.type === this.selectedType;
      return matchesSearch && matchesType;
    });
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'INDIVIDUAL': return 'فرد';
      case 'COMPANY': return 'شركة';
      case 'PROFESSIONAL': return 'مهني';
      default: return type;
    }
  }

  getStatusLabel(status: string): string {
    return status === 'ACTIVE' ? 'نشط' : 'مغلق';
  }

  openModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  onClientSaved(newClient: Client) {
    // BehaviorSubject in service already handles adding the client
    // but we ensure filter runs
    this.filterClients();
  }
}
