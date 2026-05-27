import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface BookingPayload {
  selectedPackage?: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time?: string;
  pax: number;
  occasion?: string;
  venue?: string;
  message: string;
  website?: string;
}

export interface BookingResponse {
  success: boolean;
  message?: string;
  booking?: BookingPayload;
}

@Injectable({ providedIn: 'root' })
export class BookingApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  sendBooking(payload: BookingPayload): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.base}/bookings`, payload);
  }
}
