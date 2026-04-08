import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
  fileUrl?: string;
  mimeType?: string;
  type?: 'TEXT' | 'ATTACHMENT';
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

  isUploadingDoc = false;
  generatedNiyaba: string | null = null;
  
  // Real file upload
  docTitle: string = '';
  selectedCaseIdForDoc: string = '';
  selectedFile: File | null = null;
  selectedFileBase64: string | null = null;
  
  // Camera & OCR
  isCameraOpen = false;
  isProcessingOcr = false;
  editingDocId: string | null = null;
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement?: ElementRef<HTMLCanvasElement>;

  // In-App Previewer State
  isPreviewModalOpen = false;
  safePreviewUrl: SafeResourceUrl | null = null;
  currentlyViewingDocTitle: string = '';

  constructor(
    private route: ActivatedRoute,
    private clientService: ClientService,
    private caseService: CaseService,
    private invoiceService: InvoiceService,
    private documentService: DocumentService,
    private sanitizer: DomSanitizer,
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
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.docTitle = file.name.split('.')[0];
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedFileBase64 = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadDocument() {
    if (!this.selectedCaseIdForDoc) {
      alert('الرجاء اختيار القضية أولاً');
      return;
    }

    this.isUploadingDoc = true;
    const caseName = this.cases.find(c => c.id === this.selectedCaseIdForDoc)?.title || '';

    const payload: any = {
      title: this.docTitle || (this.selectedFile ? this.selectedFile.name : 'مستند بدون عنوان'),
      caseId: this.selectedCaseIdForDoc,
      type: this.selectedFile ? 'ATTACHMENT' : 'TEXT',
      mimeType: this.selectedFile ? this.selectedFile.type : 'text/plain',
      fileUrl: this.selectedFileBase64 || null,
      content: this.selectedFile ? '' : 'مذكرة يدوية'
    };

    console.log('[Upload] Payload:', { ...payload, fileUrl: payload.fileUrl ? '(base64...)' : 'null' });

    this.documentService.createDocument(payload).pipe(
      finalize(() => {
        this.isUploadingDoc = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        const newDoc: DocumentWithCase = {...res, caseName};
        this.documents = [newDoc, ...this.documents];
        this.docTitle = '';
        this.selectedFile = null;
        this.selectedFileBase64 = null;
        this.selectedCaseIdForDoc = '';
      },
      error: (err) => {
        console.error('Error uploading document:', err);
        alert('حدث خطأ أثناء الرفع');
      }
    });
  }

  deleteDocument(docId: string) {
    if (!confirm('هل أنت متأكد من حذف هذه الوثيقة؟')) return;
    this.documentService.deleteDocument(docId).subscribe({
      next: () => {
        this.documents = this.documents.filter(d => d.id !== docId);
        this.cdr.detectChanges();
      }
    });
  }

  editDocument(doc: DocumentWithCase) {
    this.editingDocId = doc.id || null;
  }

  saveDocEdit(doc: DocumentWithCase) {
    if (this.editingDocId === doc.id) {
      this.editingDocId = null;
      if (doc.id) {
        this.documentService.updateDocument(doc.id, { title: doc.title }).subscribe();
      }
    }
  }

  viewDocument(doc: DocumentWithCase) {
    if (doc.type === 'ATTACHMENT' && doc.fileUrl && doc.fileUrl.startsWith('data:')) {
      try {
        const base64Data = doc.fileUrl.split(',')[1];
        const contentType = doc.fileUrl.split(',')[0].split(':')[1].split(';')[0];
        
        const blob = this.base64ToBlob(base64Data, contentType);
        const blobUrl = URL.createObjectURL(blob);
        
        console.log('Generating In-App Secure Preview:', blobUrl);
        
        // SECURITY: Use Sanitizer to trust the app-internal Blob URL
        this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
        this.currentlyViewingDocTitle = doc.title;
        this.isPreviewModalOpen = true;
        
      } catch (e) {
        console.error('Document rendering error:', e);
        this.generatedNiyaba = doc.content;
      }
    } else {
      this.generatedNiyaba = doc.content;
    }
  }

  closePreviewModal() {
    this.isPreviewModalOpen = false;
    // Clean up memory
    if (this.safePreviewUrl) {
      // Note: Actual revocation happens via URL.revokeObjectURL if we tracked it
      this.safePreviewUrl = null;
    }
  }

  private base64ToBlob(base64: string, contentType: string): Blob {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  }

  downloadDocument(doc: DocumentWithCase) {
    if (doc.type === 'ATTACHMENT' && doc.fileUrl) {
      if (doc.fileUrl.startsWith('data:')) {
        const base64Data = doc.fileUrl.split(',')[1];
        const contentType = doc.fileUrl.split(',')[0].split(':')[1].split(';')[0];
        const blob = this.base64ToBlob(base64Data, contentType);
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = doc.title;
        link.click();
        URL.revokeObjectURL(blobUrl);
      } else {
        const link = document.createElement('a');
        link.href = doc.fileUrl;
        link.download = doc.title;
        link.click();
      }
    } else {
      // Original Word generation for TEXT memos
      const content = `
        <html dir="rtl" charset="utf-8">
          <head>
            <meta charset="utf-8">
            <title>${doc.title}</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>${doc.title}</h2>
            <div>${doc.content?.replace(/\n/g, '<br>') || ''}</div>
          </body>
        </html>
      `;
      const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.title}.doc`;
      link.click();
      URL.revokeObjectURL(url);
    }
  }

  // ─── Camera OCR Scanning ───────────────────────
  openCameraScanner() {
    this.isCameraOpen = true;
    this.cdr.detectChanges();
    this.initCamera();
  }

  closeCameraPlanner() {
    this.isCameraOpen = false;
    this.stopCamera();
    this.cdr.detectChanges();
  }

  async initCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('لا يمكن الوصول إلى الكاميرا. يرجى التحقق من أذونات المتصفح.');
    }
  }

  stopCamera() {
    if (this.videoElement?.nativeElement?.srcObject) {
      const stream = this.videoElement.nativeElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  }

  captureImage() {
    if (!this.videoElement || !this.canvasElement) return;
    
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');
    
    if (context && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
      
      // We will handle the decision (Photo vs OCR) via UI buttons
      this.selectedFileBase64 = imageBase64;
      this.stopCamera();
    }
  }

  saveCameraAsAttachment() {
    if (!this.selectedFileBase64 || !this.selectedCaseIdForDoc) {
      alert('الرجاء اختيار القضية أولاً');
      return;
    }

    this.isProcessingOcr = true;
    const caseName = this.cases.find(c => c.id === this.selectedCaseIdForDoc)?.title || '';

    const payload: any = {
      title: this.docTitle || 'صورة من الكاميرا',
      caseId: this.selectedCaseIdForDoc,
      type: 'ATTACHMENT',
      mimeType: 'image/jpeg',
      fileUrl: this.selectedFileBase64,
      content: 'مرفق مصور'
    };

    console.log('[Camera Attachment] Payload:', { ...payload, fileUrl: '(base64...)' });

    this.documentService.createDocument(payload).pipe(
      finalize(() => {
        this.isProcessingOcr = false;
        this.selectedFileBase64 = null;
        this.closeCameraPlanner();
      })
    ).subscribe({
      next: (res) => {
        const newDoc: DocumentWithCase = {...res, caseName};
        this.documents = [newDoc, ...this.documents];
        this.docTitle = '';
        this.selectedCaseIdForDoc = '';
      }
    });
  }

  processOcr() {
    if (!this.selectedFileBase64 || !this.selectedCaseIdForDoc) {
       alert('الرجاء اختيار القضية أولاً');
       return;
    }

    this.isProcessingOcr = true;
    const caseName = this.cases.find(c => c.id === this.selectedCaseIdForDoc)?.title || '';
    const centerId = this.client?.centerId || '';

    this.documentService.scanOcr(this.selectedFileBase64, this.docTitle, this.selectedCaseIdForDoc, centerId).pipe(
      finalize(() => {
        this.isProcessingOcr = false;
        this.selectedFileBase64 = null;
        this.closeCameraPlanner();
      })
    ).subscribe({
      next: (res) => {
        const newDoc: DocumentWithCase = {...res, caseName};
        this.documents = [newDoc, ...this.documents];
        this.docTitle = '';
        this.selectedCaseIdForDoc = '';
      },
      error: (err) => {
        console.error('OCR error:', err);
        alert('حدث خطأ أثناء إجراء المسح الضوئي عبر الذكاء الاصطناعي.');
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
