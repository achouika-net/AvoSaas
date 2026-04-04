import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService, Client } from '../../services/client.service';

@Component({
  selector: 'app-client-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-modal.html',
})
export class ClientModalComponent {
  @Input() isOpen = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() clientSaved = new EventEmitter<Client>();
  
  isSaving = false;
  client: Client = this.resetClient();

  constructor(private clientService: ClientService) {}

  resetClient(): Client {
    return {
      name: '',
      type: 'INDIVIDUAL',
      identityNumber: '',
      phone: '',
      email: '',
      address: '',
      status: 'ACTIVE',
      centerId: 'center-1' // Default for now, should come from active center
    };
  }

  save() {
    if (!this.client.name || this.isSaving) return;

    this.isSaving = true;
    this.clientService.createClient(this.client).subscribe({
      next: (newClient) => {
        this.clientSaved.emit(newClient);
        this.close();
      },
      error: (err) => {
        console.error('Error creating client:', err);
      },
      complete: () => {
        this.isSaving = false;
      }
    });
  }

  close() {
    this.client = this.resetClient();
    this.closeModal.emit();
  }
}
