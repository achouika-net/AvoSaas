import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-ai-assistant-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-assistant-panel.html',
})
export class AiAssistantPanelComponent {
  @Input() caseType: string = 'CIVIL';
  
  isOpen = false;
  query = '';
  isSearching = false;
  suggestion: any = null;

  constructor(private http: HttpClient) {}

  toggle() {
    this.isOpen = !this.isOpen;
  }

  askAI() {
    if (!this.query.trim()) return;

    this.isSearching = true;
    this.suggestion = null;

    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const apiUrl = `http://${host}:3005/api/ai/suggest`;

    this.http.post(apiUrl, {
      type: this.caseType,
      description: this.query
    }).subscribe({
      next: (res) => {
        this.suggestion = res;
        this.isSearching = false;
      },
      error: (err) => {
        console.error('AI Assistant Error:', err);
        this.isSearching = false;
      }
    });
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    // Add a toast notification here if available
  }
}
