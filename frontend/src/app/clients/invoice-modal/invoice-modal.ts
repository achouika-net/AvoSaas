import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvoiceService, Invoice } from '../../services/invoice.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-invoice-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoice-modal.html',
})
export class InvoiceModalComponent {
  @Input() clientId!: string;
  @Output() saved = new EventEmitter<Invoice>();
  @Output() closed = new EventEmitter<void>();

  invoiceData: Invoice = {
    amount: 0,
    status: 'UNPAID',
    clientId: ''
  };

  isLoading = false;

  constructor(private invoiceService: InvoiceService) {}

  save() {
    this.isLoading = true;
    this.invoiceData.clientId = this.clientId;

    this.invoiceService.createInvoice(this.invoiceData).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (res) => {
        this.saved.emit(res);
        this.close();
      },
      error: (err) => console.error('Error saving invoice:', err)
    });
  }

  close() {
    this.closed.emit();
  }
}
