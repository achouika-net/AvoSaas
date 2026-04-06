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
  editingCase: Case | null = null;
  editingInvoice: Invoice | null = null;

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
  openCaseModal(caseToEdit: Case | null = null) { 
    this.editingCase = caseToEdit;
    this.isCaseModalOpen = true; 
  }
  closeCaseModal() { 
    this.isCaseModalOpen = false; 
    this.editingCase = null;
  }
  
  openInvoiceModal(invoiceToEdit: Invoice | null = null) { 
    this.editingInvoice = invoiceToEdit;
    this.isInvoiceModalOpen = true; 
  }
  closeInvoiceModal() { 
    this.isInvoiceModalOpen = false; 
    this.editingInvoice = null;
  }

  onCaseSaved(savedCase: Case) {
    const index = this.cases.findIndex(c => c.id === savedCase.id);
    if (index > -1) {
      this.cases[index] = savedCase;
    } else {
      this.cases = [savedCase, ...this.cases];
    }
    this.cdr.detectChanges();
  }

  onInvoiceSaved(savedInvoice: Invoice) {
    const index = this.invoices.findIndex(i => i.id === savedInvoice.id);
    if (index > -1) {
      this.invoices[index] = savedInvoice;
    } else {
      this.invoices = [savedInvoice, ...this.invoices];
    }
    this.cdr.detectChanges();
  }

  deleteCase(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذه القضية؟ سيتم حذف جميع المواعيد والوثائق المرتبطة بها.')) return;
    this.caseService.deleteCase(id).subscribe({
      next: () => {
        this.cases = this.cases.filter(c => c.id !== id);
        this.cdr.detectChanges();
      }
    });
  }

  deleteInvoice(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذه الفاتورة/الدفعة؟')) return;
    this.invoiceService.deleteInvoice(id).subscribe({
      next: () => {
        this.invoices = this.invoices.filter(i => i.id !== id);
        this.cdr.detectChanges();
      }
    });
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

  // ─── Financial Calculations ────────────────────
  get totalAgreedFees(): number {
    return this.cases.reduce((sum, c) => sum + (c.agreedFees || 0), 0);
  }

  get totalPaidFees(): number {
    return this.invoices
      .filter(inv => inv.status === 'PAID' && (inv.type === 'FEES' || inv.type === 'PREPAYMENT'))
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }

  get totalExpenses(): number {
    return this.invoices
      .filter(inv => inv.type === 'EXPENSE')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }

  get remainingBalance(): number {
    return this.totalAgreedFees - this.totalPaidFees;
  }

  get ongoingCasesCount(): number {
    return this.cases.filter(c => c.status === 'ONGOING').length;
  }

  // ─── Helpers ───────────────────────────────────
  setTab(tab: 'SUMMARY' | 'CASES' | 'FINANCE' | 'DOCUMENTS') {
    this.activeTab = tab;
  }

  translateCourtName(name?: string): string {
    if (!name) return '---';
    const mapping: { [key: string]: string } = {
      'Casablanca First Instance Court': 'المحكمة الابتدائية بالدار البيضاء',
      'Rabat First Instance Court': 'المحكمة الابتدائية بالرباط',
      'Marrakech First Instance Court': 'المحكمة الابتدائية بمراكش',
      'Fes First Instance Court': 'المحكمة الابتدائية بفاس',
      'Tangier First Instance Court': 'المحكمة الابتدائية بطنجة',
      'Casablanca Commercial Court': 'المحكمة التجارية بالدار البيضاء',
      'Rabat Commercial Court': 'المحكمة التجارية بالرباط',
      'Casablanca Appeal Court': 'محكمة الاستئناف بالدار البيضاء',
      'Rabat Appeal Court': 'محكمة الاستئناف بالرباط'
    };
    return mapping[name] || name;
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
      case 'FIRST_INSTANCE':
      case 'PRIMARY': return 'ابتدائي';
      case 'APPEAL': return 'الاستئناف';
      case 'SUPREME': return 'النقض';
      default: return stage || 'غير معروف';
    }
  }

  getInvoiceTypeLabel(type?: string): string {
    switch (type) {
      case 'FEES': return 'أتعاب';
      case 'PREPAYMENT': return 'تسبيق';
      case 'EXPENSE': return 'مصاريف';
      default: return type || 'أتعاب';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PAID': return 'خالص';
      case 'UNPAID': return 'غير مؤدى عنه';
      case 'PARTIAL': return 'أداء جزئي';
      case 'BALANCE': return 'الباقي';
      default: return status;
    }
  }

  getClientTypeLabel(type?: string): string {
    switch (type) {
      case 'INDIVIDUAL': return 'شخص ذاتي';
      case 'COMPANY': return 'شركة / شخص معنوي';
      case 'PROFESSIONAL': return 'مهني';
      default: return type || 'غير محدد';
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

  openFilePicker() {
    this.activeTab = 'DOCUMENTS';
    this.cdr.detectChanges();
  }

  generateNiyaba(caseData: Case) {
    this.generatedNiyaba = this.caseService.getNiyabaTemplate(caseData, 'الأستاذ أحمد');
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
