import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CaseService, Case } from '../../services/case.service';
import { finalize } from 'rxjs';
import { MOROCCAN_COURTS, Court } from '../../shared/constants/courts';

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

  courts = MOROCCAN_COURTS;
  filteredCourts: Court[] = [];
  showCourtDropdown = false;

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
    currentStage: 'FIRST_INSTANCE'
  };

  isLoading = false;

  constructor(private caseService: CaseService) {
    this.filteredCourts = [...this.courts];
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
