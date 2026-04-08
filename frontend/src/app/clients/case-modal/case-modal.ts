import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CaseService, Case } from '../../services/case.service';
import { AiService } from '../../services/ai.service';
import { LibraryService } from '../../services/library.service';
import { finalize, timeout, catchError, of } from 'rxjs';
import { MOROCCAN_COURTS, Court } from '../../shared/constants/courts';
import { ChangeDetectorRef } from '@angular/core';

import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-case-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './case-modal.html',
})
export class CaseModalComponent implements OnInit {
  @Input() clientId!: string;
  @Input() centerId!: string;
  @Input() editData: Case | null = null;
  @Output() saved = new EventEmitter<Case>();
  @Output() closed = new EventEmitter<void>();

  courts = MOROCCAN_COURTS;
  filteredCourts: Court[] = [];
  showCourtDropdown = false;
  currentStep = 1;

  caseData: Case = {
    title: '',
    type: 'CIVIL',
    courtName: '',
    opponentName: '',
    opponentLawyerName: '',
    opponentLawyerOffice: '',
    agreedFees: 0,
    primaryNumber: '',
    appealNumber: '',
    supremeCourtNumber: '',
    clientId: '',
    centerId: '',
    currentStage: 'FIRST_INSTANCE',
    narrative: '',
    legalMemo: ''
  };

  isLoading = false;
  isRecording = false;
  hasLibraryMatch = false;
  isSavingLibrary = false;
  safeMemoHtml: SafeHtml = '';
  officeLogo: string = '';
  headerTextAr: string = '';
  headerTextFr: string = '';
  footerTextAr: string = '';
  footerTextFr: string = '';


  constructor(
    private caseService: CaseService,
    private aiService: AiService,
    private libraryService: LibraryService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {
    this.filteredCourts = [...this.courts];
  }

  ngOnInit() {
    this.loadOfficeSettings();
    if (this.editData) {
      this.caseData = { ...this.editData };
      if (this.caseData.legalMemo) {
        this.safeMemoHtml = this.sanitizer.bypassSecurityTrustHtml(this.caseData.legalMemo);
      }
    }
  }

  loadOfficeSettings() {
    if (!this.centerId) return;
    this.aiService.getSettings(this.centerId).subscribe({
      next: (data) => {
        if (data) {
          this.officeLogo = data.logo || '';
          this.headerTextAr = data.headerTextAr || '';
          this.headerTextFr = data.headerTextFr || '';
          this.footerTextAr = data.footerTextAr || '';
          this.footerTextFr = data.footerTextFr || '';
        }
      },
      error: (err) => console.error('Error fetching office settings:', err)
    });
  }

  filterCourts(event: any) {
    const query = event.target.value.toLowerCase();
    this.filteredCourts = this.courts.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.city.toLowerCase().includes(query)
    );
    this.showCourtDropdown = true;
  }

  selectCourt(court: Court) {
    this.caseData.courtName = court.name;
    this.showCourtDropdown = false;
  }

  nextStep() {
    if (this.currentStep === 1) {
      // Early persistence: Save Step 1 data before moving to Narrative
      this.saveDraft();
    } else if (this.currentStep < 3) {
      this.currentStep++;
    }
  }

  saveDraft() {
    this.isLoading = true;
    this.caseData.clientId = this.clientId;
    this.caseData.centerId = this.centerId;

    const request = this.caseData.id 
      ? this.caseService.updateCase(this.caseData.id, this.caseData)
      : this.caseService.createCase(this.caseData);

    request.pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        this.caseData.id = res.id;
        this.currentStep = 2;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error saving draft:', err);
        // Still move to step 2 but warn user
        this.currentStep = 2;
        this.cdr.detectChanges();
      }
    });
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  recognitionInstance: any = null;

  recordNarrative() {
    if (this.isRecording) {
      // Toggle off
      this.isRecording = false;
      if (this.recognitionInstance) {
        this.recognitionInstance.stop();
        this.recognitionInstance = null;
      }
      this.cdr.detectChanges();
      return;
    }

    this.isRecording = true;
    this.cdr.detectChanges();
    
    this.recognitionInstance = this.aiService.startRecording(
      (text: string) => {
        this.caseData.narrative = (this.caseData.narrative || '') + ' ' + text;
        this.cdr.detectChanges();
      },
      (err: any) => {
        console.error('Speech recognition error:', err);
        this.isRecording = false;
        this.recognitionInstance = null;
        this.cdr.detectChanges();
      }
    );
  }

  generateMemo() {
    if (!this.caseData.narrative) return;
    this.isLoading = true;
    
    const safetyTimer = setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
        this.applyLegalTemplate('استغرق الطلب وقتاً طويلاً. يرجى التحقق من الاتصال.');
        this.currentStep = 3;
        this.cdr.detectChanges();
      }
    }, 25000);

    this.aiService.generateLegalMemo(this.caseData.title, this.caseData.narrative, this.caseData.type, this.centerId)
      .pipe(
        timeout(60000),
        finalize(() => {
          clearTimeout(safetyTimer);
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          this.applyLegalTemplate(res.content || res.memo || 'خطأ في التوليد.');
          this.hasLibraryMatch = res.privateArchiveMatch || false;
          this.currentStep = 3;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('AI Memo error:', err);
          this.applyLegalTemplate('فشل الاتصال بالذكاء الاصطناعي. المرجو الصياغة اليدوية.');
          this.currentStep = 3;
          this.cdr.detectChanges();
        }
      });
  }

  cleanAiResponse(text: string): string {
    // List of patterns to strip if they appear at the very beginning (duplicates of template)
    const patternsToStrip = [
      /^.*مذكرة.*$/m,
      /^.*إلى السيد رئيس.*$/m,
      /^.*المحترم.*$/m,
      /^.*لفائدة.*:.*$/m,
      /^.*في مواجهة.*:.*$/m,
      /^.*السيد الرئيس.*$/m,
      /^\*\*.*\*\*$/m // Bold headers
    ];
    
    let cleaned = text.trim();
    // Basic heuristic: if the AI repeats the title or court in the first few lines, strip them
    const lines = cleaned.split('\n');
    const filteredLines = lines.filter((line, index) => {
      // Only strip if it's in the first 7 lines (headers/intro)
      if (index < 7) {
        return !patternsToStrip.some(p => p.test(line));
      }
      return true;
    });

    return filteredLines.join('\n');
  }

  applyLegalTemplate(aiResponse: string) {
    const cleanedContent = this.cleanAiResponse(aiResponse);
    const safeAiContent = cleanedContent.replace(/\n/g, '<br>');
    
    // Choose the correct logo HTML BEFORE the template string
    const logoTag = this.officeLogo 
      ? `<img src="${this.officeLogo}" style="max-height: 100px; width: auto; margin: 0 auto; display: block;" alt="Office Logo">`
      : `<img src="assets/legal_logo.png" style="max-height: 80px; width: auto; margin: 0 auto; display: block;" alt="Logo">`;

    const htmlTemplate = `
      <div dir="rtl" style="font-family: Arial, serif; line-height: 1.6; color: #000; text-align: right; padding: 0;">
        <br>
        <!-- الرأسية -->
        <table style="width: 100%; margin-bottom: 5px;">
          <tr>
            <td style="text-align: center; width: 35%; vertical-align: top; font-weight: bold; line-height: 1.3; font-size: 1rem;">
              ${(this.headerTextAr || 'الأستاذ إدريس الكرارصي<br>محام بهيئة الرباط').replace(/\n/g, '<br>')}
            </td>
            <td style="text-align: center; width: 30%; vertical-align: middle;">
              ${logoTag}
            </td>
            <td style="text-align: center; width: 35%; vertical-align: top; font-weight: bold; line-height: 1.3; font-size: 1rem;" dir="ltr">
              ${(this.headerTextFr || 'Maitre Driss LAKRARSI<br>Avocat au Barreau de Rabat').replace(/\n/g, '<br>')}
            </td>
          </tr>
        </table>
        
        <hr style="border: none; border-top: 2px solid #000; margin: 2px 0 10px 0;" />

        <!-- التاريخ والمدينة -->
        <div style="text-align: center; font-weight: bold; margin-bottom: 15px; font-size: 1rem;">
          - الرباط في: ${new Date().toLocaleDateString('ar-MA')} -
        </div>

        <!-- حيز نصي: معلومات الملف (أقصى الشمال/اليسار) -->
        <table style="width: 100%; margin-bottom: 20px;">
          <tr>
            <td></td>
            <td style="width: auto; text-align: right; font-weight: bold; font-size: 1rem; line-height: 1.5; border-right: 2px solid #000; padding-right: 15px; white-space: nowrap;">
              - ملف عدد: <span dir="ltr">${this.caseData.primaryNumber || '............'}</span><br>
              - ق. م: ............<br>
              - جلسة: ............
            </td>
          </tr>
        </table>

        <!-- حيز نصي يتوسط الصفحة: العنوان والمحكمة -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; padding: 10px 20px;">
            <h2 style="font-size: 1.4rem; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 15px;">
              مقال إفتتاحي / مذكرة
            </h2>
            <h3 style="font-size: 1.2rem; font-weight: bold; text-decoration: underline; margin-top: 10px;">
              إلى السيد رئيس ${this.caseData.courtName || 'المحكمة الابتدائية بالرباط'}
            </h3>
          </div>
        </div>

        <br>
        <!-- الديباجة -->
        <div style="margin-bottom: 25px;">
          <h4 style="font-weight: bold; text-decoration: underline; margin-bottom: 10px;">السيد الرئيس المحترم،</h4>
          <p style="margin-bottom: 5px;">
            نيابة عن موكلي السيد(ة) <strong>${this.caseData.opponentName || '........'}</strong>، ومن معه، أبسط على أنظار سيادتكم ما يلي:
          </p>
        </div>

        <!-- جسم المذكرة (المحتوى المولد) -->
        <div style="margin-bottom: 20px; text-align: justify; border-right: 3px solid #000; padding-right: 15px; padding-bottom: 4.8cm; min-height: 15cm;">
          ${safeAiContent.replace('[[الملتمسات]]', '<div class="last-page-section" style="border-top: 2px solid #000; margin-top: 30px; padding-top: 15px;"><strong style="font-size: 1.2rem; text-decoration: underline;">الملتمسات:</strong><br>').replace('[[الوثائق]]', '<br><strong style="font-size: 1.1rem; text-decoration: underline;">لائحة الوثائق المرفقة:</strong><br>')}
        </div>
        
        <!-- Footer Section (2-Line Pro Layout) -->
        <div class="memo-footer" style="position: absolute; bottom: 0.8cm; left: 0.8cm; right: 0.8cm; border-top: 2.5px solid #000; padding-top: 12px; font-size: 0.88rem; text-align: center; color: #000; font-weight: bold;">
          <div style="margin-bottom: 4px;">
            ${(this.footerTextAr || '').replace(/\n/g, ' - ')}
          </div>
          <div dir="ltr" style="font-size: 0.82rem;">
            ${(this.footerTextFr || '').replace(/\n/g, ' | ')}
          </div>
        </div>
      </div>
    `;

    this.caseData.legalMemo = htmlTemplate;
    this.safeMemoHtml = this.sanitizer.bypassSecurityTrustHtml(this.caseData.legalMemo);
  }

  onMemoContentChange(event: any) {
    this.caseData.legalMemo = event.target.innerHTML;
  }

  save() {
    this.isLoading = true;
    this.caseData.clientId = this.clientId;
    this.caseData.centerId = this.centerId;

    const request = this.caseData.id 
      ? this.caseService.updateCase(this.caseData.id, this.caseData)
      : this.caseService.createCase(this.caseData);

    request.pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (res) => {
        this.saved.emit(res);
        this.close();
      },
      error: (err) => console.error('Error saving case:', err)
    });
  }

  printMemo() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = this.caseData.legalMemo || '';
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${this.caseData.title}</title>
          <style>
            @page { 
              size: A4; 
              margin: 1cm; 
            }
            body { 
              font-family: Arial, "Times New Roman", serif; 
              direction: rtl; 
              color: #000;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
            }
            .print-content {
              width: 100%;
              position: relative;
              min-height: 27.7cm; /* Approximate A4 height minus margins */
            }
          </style>
        </head>
        <body onload="window.print();window.close()">
          <div class="print-content">
            ${content}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  saveToLibrary() {
    if (!this.caseData.legalMemo) return;
    this.isSavingLibrary = true;
    
    this.libraryService.indexMemo({
      title: this.caseData.title || 'مذكرة قضائية',
      content: this.caseData.legalMemo,
      category: this.caseData.type,
      centerId: this.centerId
    }).pipe(
      finalize(() => {
        this.isSavingLibrary = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        alert('تم حفظ المذكرة في المكتبة القانونية بنجاح.');
      },
      error: (err) => {
        console.error('Library saving error:', err);
        alert('فشل حفظ المذكرة في المكتبة.');
      }
    });
  }

  close() {
    this.closed.emit();
  }
}
