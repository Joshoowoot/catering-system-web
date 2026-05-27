import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError, firstValueFrom, timeout } from 'rxjs';
import { BookingApiService } from './booking-api.service';

const MIN_MESSAGE_LENGTH = 20;

interface BookingRequestPayload {
  selectedPackage: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  pax: number;
  occasion: string;
  venue: string;
  message: string;
}

@Component({
  standalone: true,
  selector: 'app-booking',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css'],
})
export class BookingComponent {
  form: any;

  submitting = false;
  errorMessage = '';
  private readonly requestTimeoutMs = 30000;
  private readonly bookingApi = inject(BookingApiService);

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router) {
    this.form = this.fb.group({
      selectedPackage: [''],
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9+()\-\s]{7,20}$/)]],
      date: ['', Validators.required],
      time: [''],
      website: [''],
      pax: [1, [Validators.required, Validators.min(1)]],
      occasion: [''],
      venue: [''],
      message: ['', [Validators.required, Validators.minLength(MIN_MESSAGE_LENGTH)]],
    });
    // read query params to prefill form when navigated from a package
    this.route.queryParams.subscribe((qp) => {
      if (!qp) return;
      const patch: any = {};
      if (qp['package']) patch.selectedPackage = qp['package'];
      if (qp['pax']) {
        const paxMatch = String(qp['pax']).match(/\d+/);
        patch.pax = paxMatch ? Number(paxMatch[0]) || 1 : 1;
      }
      if (Object.keys(patch).length) this.form.patchValue(patch);
    });
  }

  hasSelectedPackage(): boolean {
    return Boolean(String(this.form.get('selectedPackage')?.value ?? '').trim());
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const rawValue = this.form.getRawValue();
    const payload: BookingRequestPayload = {
      selectedPackage: this.cleanText(rawValue.selectedPackage),
      name: this.cleanText(rawValue.name),
      email: this.cleanText(rawValue.email),
      phone: this.cleanText(rawValue.phone),
      date: this.cleanText(rawValue.date),
      time: this.cleanText(rawValue.time),
      pax: Number(rawValue.pax) || 1,
      occasion: this.cleanText(rawValue.occasion),
      venue: this.cleanText(rawValue.venue),
      message: this.cleanMultilineText(rawValue.message),
    };

    try {
      console.log('Sending booking payload', payload);
      const response = await this.sendBookingWithTimeout(payload);
      console.log('Booking API response', response);

      if (!response || !response.success) {
        throw new Error(response?.message || 'We could not send your booking email right now.');
      }

      const booking = response.booking ?? payload;
      this.form.reset({ pax: 1 });
      await this.router.navigate(['/booking/thank-you'], {
        state: { booking },
      });
    } catch (error) {
      console.error('Booking API error', error);
      this.errorMessage = this.getFriendlyErrorMessage(error);
    } finally {
      this.submitting = false;
    }
  }

  private cleanText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
  }

  private cleanMultilineText(value: unknown): string {
    return this.cleanText(value).replace(/\r\n?/g, '\n');
  }

  private async sendBookingWithTimeout(payload: BookingRequestPayload) {
    return firstValueFrom(this.bookingApi.sendBooking(payload).pipe(timeout(this.requestTimeoutMs)));
  }

  private getFriendlyErrorMessage(error: unknown): string {
    if (error instanceof TimeoutError) {
      return 'The booking request took too long to respond. Please try again.';
    }

    if (error instanceof HttpErrorResponse) {
      if (typeof error.error?.message === 'string' && error.error.message.trim()) {
        return error.error.message;
      }

      if (error.status === 429) {
        return 'Too many submissions. Please wait a few minutes and try again.';
      }

      if (error.status === 504) {
        return 'The email service took too long to respond. Please try again.';
      }

      return 'We could not send your booking email right now.';
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return 'We could not send your booking email right now.';
  }
}
