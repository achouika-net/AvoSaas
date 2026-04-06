import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CaseService, Case } from '../../services/case.service';
import { AiService } from '../../services/ai.service';
import { finalize, timeout, catchError, of } from 'rxjs';
import { MOROCCAN_COURTS, Court } from '../../shared/constants/courts';
import { ChangeDetectorRef } from '@angular/core';

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

  constructor(
    private caseService: CaseService,
    private aiService: AiService,
    private cdr: ChangeDetectorRef
  ) {
    this.filteredCourts = [...this.courts];
  }

  ngOnInit() {
    if (this.editData) {
      this.caseData = { ...this.editData };
    }
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

  async recordNarrative() {
    this.isRecording = true;
    this.cdr.detectChanges();
    try {
      const transcript = await this.aiService.startRecording();
      this.caseData.narrative = (this.caseData.narrative || '') + ' ' + transcript;
    } catch (err: any) {
      console.error('Speech recognition error:', err);
      if (err === 'no-speech') {
        alert('لم يتم رصد أي صوت. يرجى المحاولة مرة أخرى والتحدث بوضوح.');
      } else {
        alert('خطأ في التسجيل الصوتي. تأكد من إذن الميكروفون في المتصفح.');
      }
    } finally {
      this.isRecording = false;
      this.cdr.detectChanges();
    }
  }

  generateMemo() {
    if (!this.caseData.narrative) return;
    this.isLoading = true;
    
    // Safety fallback: ensure loader closes after 20s even if network hangs
    const safetyTimer = setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
        this.caseData.legalMemo = this.caseData.legalMemo || 'استغرق الطلب وقتاً طويلاً. يمكنك تحرير المذكرة يدوياً.';
        this.currentStep = 3;
        this.cdr.detectChanges();
      }
    }, 20000);

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
          this.caseData.legalMemo = res.content || res.memo || 'لم يتم توليد المذكرة بشكل صحيح.';
          this.hasLibraryMatch = res.privateArchiveMatch || false;
          this.currentStep = 3;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('AI Memo error:', err);
          this.caseData.legalMemo = 'عذراً، فشل الاتصال بتوليفة النصوص القانونية. يرجى مراجعة نصوص مدونة الشغل أو المسطرة المدنية يدوياً.';
          this.currentStep = 3;
          this.cdr.detectChanges();
        }
      });
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

  close() {
    this.closed.emit();
  }
}
