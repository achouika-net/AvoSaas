import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ClientService, Client } from '../../services/client.service';
import { FormsModule } from '@angular/forms';
import { AiAssistantPanelComponent } from '../../shared/ai-assistant-panel/ai-assistant-panel';
import { finalize } from 'rxjs';
import { CaseService, Case } from '../../services/case.service';
import { InvoiceService, Invoice } from '../../services/invoice.service';
import { DocumentService, Document } from '../../services/document.service';
import { CaseModalComponent } from '../case-modal/case-modal';
import { InvoiceModalComponent } from '../invoice-modal/invoice-modal';

interface DocumentWithCase extends Document {
  caseName?: string;
}

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    AiAssistantPanelComponent,
    CaseModalComponent,
    InvoiceModalComponent
  ],
  templateUrl: './client-detail.html',
})
export class ClientDetailComponent implements OnInit {
  clientId: string | null = null;
  client: Client | null = null;
  activeTab: 'SUMMARY' | 'CASES' | 'FINANCE' | 'DOCUMENTS' = 'SUMMARY';
  isLoading: boolean = true;

  cases: Case[] = [];
  invoices: Invoice[] = [];
  documents: DocumentWithCase[] = [];

  isCaseModalOpen = false;
  isInvoiceModalOpen = false;

  // Document upload
  selectedCaseIdForDoc: string = '';
  docTitle: string = '';
  isUploadingDoc = false;
  generatedNiyaba: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private clientService: ClientService,
    private caseService: CaseService,
    private invoiceService: InvoiceService,
    private documentService: DocumentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.clientId = this.route.snapshot.paramMap.get('id');
    if (this.clientId) {
      this.loadClientData();
    } else {
      this.isLoading = false;
    }
  }

  loadClientData() {
    this.isLoading = true;
    if (!this.clientId) {
      this.isLoading = false;
      return;
    }

    this.clientService.getClientById(this.clientId).pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (data) => {
        this.client = data;
        this.cases = (data as any).cases || [];
        this.invoices = (data as any).invoices || [];
        // Load documents for all cases
        this.loadAllDocuments();
      },
      error: (err) => {
        console.error('ClientDetailComponent: Error loading client dossier:', err);
      }
    });
  }

  loadAllDocuments() {
    this.documents = [];
    if (this.cases.length === 0) return;
    
    this.cases.forEach(c => {
      if (c.id) {
        this.documentService.getDocuments(c.id).subscribe({
          next: (docs) => {
            const docsWithCase: DocumentWithCase[] = docs.map(d => ({...d, caseName: c.title}));
            this.documents = [...this.documents, ...docsWithCase];
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  // ─── Modal Controls ────────────────────────────
  openCaseModal() { this.isCaseModalOpen = true; }
  closeCaseModal() { this.isCaseModalOpen = false; }
  
  openInvoiceModal() { this.isInvoiceModalOpen = true; }
  closeInvoiceModal() { this.isInvoiceModalOpen = false; }

  onCaseSaved(newCase: Case) {
    this.cases = [newCase, ...this.cases];
    this.cdr.detectChanges();
  }

  onInvoiceSaved(newInvoice: Invoice) {
    this.invoices = [newInvoice, ...this.invoices];
    this.cdr.detectChanges();
  }

  // ─── Document Upload ───────────────────────────
  uploadDocument() {
    if (!this.docTitle || !this.selectedCaseIdForDoc) return;
    this.isUploadingDoc = true;

    const doc: Document = {
      title: this.docTitle,
      content: 'uploaded-file-ref-' + Date.now(),
      caseId: this.selectedCaseIdForDoc
    };

    const caseName = this.cases.find(c => c.id === this.selectedCaseIdForDoc)?.title || '';

    this.documentService.createDocument(doc).pipe(
      finalize(() => {
        this.isUploadingDoc = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        const newDoc: DocumentWithCase = {...res, caseName};
        this.documents = [newDoc, ...this.documents];
        this.docTitle = '';
        this.selectedCaseIdForDoc = '';
      },
      error: (err) => console.error('Error uploading document:', err)
    });
  }

  deleteDocument(docId: string) {
    this.documentService.deleteDocument(docId).subscribe({
      next: () => {
        this.documents = this.documents.filter(d => d.id !== docId);
        this.cdr.detectChanges();
      }
    });
  }

  openFilePicker() {
    // Switch to documents tab and let user use the inline form
    this.activeTab = 'DOCUMENTS';
  }

  // ─── Invoice Status Update ─────────────────────
  updateInvoiceStatus(invoiceId: string, newStatus: string) {
    this.invoiceService.updateStatus(invoiceId, newStatus).subscribe({
      next: (updated) => {
        this.invoices = this.invoices.map(inv => inv.id === invoiceId ? updated : inv);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error updating invoice status:', err)
    });
  }

  // ─── Financial Calculations ────────────────────
  get totalBilled(): number {
    return this.invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }

  get totalPaid(): number {
    return this.invoices
      .filter(inv => inv.status === 'PAID')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }

  get totalUnpaid(): number {
    return this.invoices
      .filter(inv => inv.status === 'UNPAID' || inv.status === 'PARTIAL')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }

  get ongoingCasesCount(): number {
    return this.cases.filter(c => c.status === 'ONGOING').length;
  }

  get closedCasesCount(): number {
    return this.cases.filter(c => c.status !== 'ONGOING').length;
  }

  // ─── Helpers ───────────────────────────────────
  setTab(tab: 'SUMMARY' | 'CASES' | 'FINANCE' | 'DOCUMENTS') {
    this.activeTab = tab;
  }

  getTypeLabel(type: string | undefined): string {
    if (!type) return '';
    switch (type) {
      case 'INDIVIDUAL': return 'فرد';
      case 'COMPANY': return 'شركة';
      case 'PROFESSIONAL': return 'مهني';
      default: return type;
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PAID': return 'مدفوعة';
      case 'UNPAID': return 'غير مدفوعة';
      case 'PARTIAL': return 'جزئية';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PAID': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'UNPAID': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'PARTIAL': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  }

  getCaseTypeLabel(type: string): string {
    switch (type) {
      case 'CIVIL': return 'مدني';
      case 'COMMERCIAL': return 'تجاري';
      case 'CRIMINAL': return 'جنحي';
      case 'TRAFFIC': return 'سير';
      case 'FAMILY': return 'أسرة';
      case 'ADMINISTRATIVE': return 'إداري';
      default: return type;
    }
  }

  getCaseStageLabel(stage?: string): string {
    switch (stage) {
      case 'FIRST_INSTANCE': return 'المحكمة الابتدائية';
      case 'APPEAL': return 'الاستئناف';
      case 'SUPREME': return 'النقض';
      default: return stage || 'غير معروف';
    }
  }

  generateNiyaba(caseData: Case) {
    this.generatedNiyaba = this.caseService.getNiyabaTemplate(caseData, 'الأستاذ أحمد');
    this.activeTab = 'SUMMARY'; // Show it in summary or just stay here
    this.cdr.detectChanges();
  }

  closeNiyaba() {
    this.generatedNiyaba = null;
    this.cdr.detectChanges();
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return '---';
    return new Date(date).toLocaleDateString('ar-MA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
