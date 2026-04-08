import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    this.apiUrl = `http://${host}:3005/api/ai`;
  }

  getSettings(centerId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/settings/${centerId}`);
  }

  generateLegalMemo(caseTitle: string, narrative: string, caseType: string, centerId?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/suggest`, {
      type: caseType,
      centerId: centerId,
      description: `اكتب فقط المحتوى الموضوعي (الوقائع + المناقشة القانونية + الملتمسات) لمذكرة قانونية مغربية باحترافية.
      ⚠️ **تنبيه حرج جداً**: يمنع منعاً باتاً تكرار أي من العناصر التالية لأنها مدمجة مسبقاً في التصميم:
      1. لا تكتب اسم الأستاذ المحامي أو الهيئة.
      2. لا تكتب "إلى السيد رئيس المحكمة..." أو "المحترم".
      3. لا تكتب عنوان المذكرة (مثل: "مذكرة في طلب...") أو التاريخ.
      4. لا تكتب الديباجة الافتتاحية (مثل: "نيابة عن موكلي...").
      
      ابدأ مباشرة بفقرة عنوانها **(الوقائع)** أو **(حيثيات النزاع)**، ثم **(المساندة القانونية)**.
      
      في النهاية، أضف قسمين منفصلين تماماً بالعناوين التالية حصراً:
      1. **[[الملتمسات]]**: لسرد المطالب النهائية.
      2. **[[الوثائق]]**: لسرد لائحة المرفقات.

      عنوان القضية: ${caseTitle}
      سرد الواقعة: ${narrative}
      
      الصياغة يجب أن تكون بأسلوب قانوني مغربي رصين مع الاستشهاد بالفصول القانونية ذات الصلة.`
    });
  }

  // Voice to Text helper using Web Speech API
  // Voice to Text helper using Web Speech API (Continuous Mode)
  startRecording(onResult: (text: string) => void, onError: (err: any) => void): any {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      onError('Speech recognition not supported in this browser.');
      return null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'ar-MA'; // Moroccan Arabic
    recognition.continuous = true; // Key fix: Keep recording even with pauses
    recognition.interimResults = true; // Provides fluid results
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        onResult(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      // Don't stop for minor network/no-speech errors if continuous
      if (event.error !== 'no-speech') {
        onError(event.error);
      }
    };

    recognition.start();
    return recognition;
  }
}
