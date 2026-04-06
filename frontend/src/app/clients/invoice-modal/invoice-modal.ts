import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvoiceService, Invoice } from '../../services/invoice.service';
import { CaseService, Case } from '../../services/case.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-invoice-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoice-modal.html',
})
export class InvoiceModalComponent implements OnInit {
  @Input() clientId!: string;
  @Input() editData: Invoice | null = null;
  @Output() saved = new EventEmitter<Invoice>();
  @Output() closed = new EventEmitter<void>();

  invoiceData: Invoice = {
    amount: 0,
    status: 'PAID',
    type: 'FEES',
    description: '',
    clientId: '',
    caseId: ''
  };

  clientCases: Case[] = [];
  isLoading = false;

  constructor(
    private invoiceService: InvoiceService,
    private caseService: CaseService
  ) {}

  ngOnInit() {
    if (this.editData) {
      this.invoiceData = { ...this.editData };
    }
    this.loadClientCases();
  }

  loadClientCases() {
    this.caseService.getCases(this.clientId).subscribe({
      next: (cases) => this.clientCases = cases,
      error: (err) => console.error('Error loading cases for invoice:', err)
    });
  }

  save() {
    if (this.invoiceData.amount <= 0) {
      alert('الرجاء إدخال مبلغ صالح.');
      return;
    }

    this.isLoading = true;
    this.invoiceData.clientId = this.clientId;

    const request = this.invoiceData.id
      ? this.invoiceService.updateInvoice(this.invoiceData.id, this.invoiceData)
      : this.invoiceService.createInvoice(this.invoiceData);

    request.pipe(
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
