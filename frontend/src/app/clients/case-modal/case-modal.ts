import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CaseService, Case } from '../../services/case.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-case-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './case-modal.html',
})
export class CaseModalComponent {
  @Input() clientId!: string;
  @Input() centerId!: string;
  @Output() saved = new EventEmitter<Case>();
  @Output() closed = new EventEmitter<void>();

  caseData: Case = {
    title: '',
    type: 'CIVIL',
    courtName: '',
    opponentName: '',
    primaryNumber: '',
    appealNumber: '',
    supremeCourtNumber: '',
    clientId: '',
    centerId: ''
  };

  isLoading = false;

  constructor(private caseService: CaseService) {}

  save() {
    this.isLoading = true;
    this.caseData.clientId = this.clientId;
    this.caseData.centerId = this.centerId;

    this.caseService.createCase(this.caseData).pipe(
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
