import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface ContactFormPayload {
  fullName: string;
  email: string;
  mobileNumber: string;
  date: string;
  subject: string;
  message: string;
  website: string;
}

export interface ContactApiResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class ContactApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;

  sendContactMessage(payload: ContactFormPayload): Observable<ContactApiResponse> {
    return this.http.post<ContactApiResponse>(`${this.apiBaseUrl}/contact`, payload);
  }
}