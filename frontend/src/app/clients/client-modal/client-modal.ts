import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService, Client } from '../../services/client.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-client-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-modal.html',
})
export class ClientModalComponent implements OnInit {
  @Input() editData: Client | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Client>();
  
  isSaving = false;
  client: Client = this.resetClient();

  constructor(private clientService: ClientService) {}

  ngOnInit() {
    if (this.editData) {
      this.client = { ...this.editData };
    }
  }

  resetClient(): Client {
    return {
      name: '',
      type: 'INDIVIDUAL',
      identityNumber: '',
      phone: '',
      email: '',
      address: '',
      status: 'ACTIVE',
      centerId: 'center-1'
    };
  }

  save() {
    if (!this.client.name || this.isSaving) return;

    this.isSaving = true;
    const request = this.client.id 
      ? this.clientService.updateClient(this.client.id, this.client)
      : this.clientService.createClient(this.client);

    request.pipe(
      finalize(() => this.isSaving = false)
    ).subscribe({
      next: (res) => {
        this.saved.emit(res);
        this.close();
      },
      error: (err) => console.error('Error saving client:', err)
    });
  }

  close() {
    this.closed.emit();
  }
}
