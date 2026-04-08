import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html'
})
export class SettingsComponent implements OnInit {
  apiKey: string = '';
  logo: string = '';
  headerTextAr: string = '';
  headerTextFr: string = '';
  footerTextAr: string = '';
  footerTextFr: string = '';
  isSaving = false;
  saveSuccess = false;
  saveError = false;
  centerId = 'center-1'; // Hardcoded for demo/current office

  private apiUrl: string;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    this.apiUrl = `http://${host}:3005/api/ai/settings`;
  }

  ngOnInit() {
    this.fetchSettings();
  }

  fetchSettings() {
    this.http.get(`${this.apiUrl}/${this.centerId}`)
      .subscribe({
        next: (data: any) => {
          this.apiKey = data.apiKey || '';
          this.logo = data.logo || '';
          this.headerTextAr = data.headerTextAr || '';
          this.headerTextFr = data.headerTextFr || '';
          this.footerTextAr = data.footerTextAr || '';
          this.footerTextFr = data.footerTextFr || '';
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error fetching settings:', err)
      });
  }

  saveSettings() {
    if (this.isSaving) return; // Prevent double-click
    this.isSaving = true;
    this.saveSuccess = false;
    this.saveError = false;
    this.cdr.detectChanges();

    this.http.post(this.apiUrl, { 
      centerId: this.centerId, 
      apiKey: this.apiKey, 
      logo: this.logo,
      headerTextAr: this.headerTextAr,
      headerTextFr: this.headerTextFr,
      footerTextAr: this.footerTextAr,
      footerTextFr: this.footerTextFr
    })
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.saveSuccess = true;
          this.cdr.detectChanges();
          setTimeout(() => {
            this.saveSuccess = false;
            this.cdr.detectChanges();
          }, 3000);
        },
        error: (err) => {
          this.isSaving = false;
          this.saveError = true;
          this.cdr.detectChanges();
          console.error('Error saving settings:', err);
          setTimeout(() => {
            this.saveError = false;
            this.cdr.detectChanges();
          }, 4000);
        }
      });
  }
 
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.logo = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }
}
