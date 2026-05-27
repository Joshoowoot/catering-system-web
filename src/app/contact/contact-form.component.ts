import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { ContactApiService } from './contact-api.service';

const MIN_MESSAGE_LENGTH = 20;

@Component({
  selector: 'app-contact-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.css',
})
export class ContactFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly contactApi = inject(ContactApiService);

  protected readonly isSubmitting = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  protected readonly contactForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    mobileNumber: ['', [Validators.required, Validators.pattern(/^[0-9+()\-\s]{7,20}$/)]],
    date: ['', [Validators.required]],
    subject: ['', [Validators.required, Validators.minLength(3)]],
    message: ['', [Validators.required, Validators.minLength(MIN_MESSAGE_LENGTH)]],
    website: [''],
  });

  async submit(): Promise<void> {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const raw = this.contactForm.getRawValue();
    const payload = {
      fullName: this.cleanValue(raw.fullName),
      email: this.cleanValue(raw.email),
      mobileNumber: this.cleanValue(raw.mobileNumber),
      date: this.cleanValue(raw.date),
      subject: this.cleanValue(raw.subject),
      message: this.cleanValue(raw.message).replace(/\r\n?/g, '\n'),
      website: this.cleanValue(raw.website),
    };

    try {
      const response = await firstValueFrom(this.contactApi.sendContactMessage(payload));
      this.contactForm.reset({
        fullName: '',
        email: '',
        mobileNumber: '',
        date: '',
        subject: '',
        message: '',
        website: '',
      });
      this.successMessage.set(response.message || 'Your message has been sent successfully.');
    } catch (error) {
      this.errorMessage.set(this.resolveErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected hasError(controlName: keyof typeof this.contactForm.controls, errorCode: string): boolean {
    const control = this.contactForm.controls[controlName];
    return control.touched && control.hasError(errorCode);
  }

  protected remainingCharacters(): number {
    const message = this.contactForm.controls.message.value ?? '';
    return Math.max(0, MIN_MESSAGE_LENGTH - message.trim().length);
  }

  private cleanValue(value: string): string {
    return value.trim();
  }

  private resolveErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const response = error as { error?: { message?: string } };
      return response.error?.message || 'We could not send your message right now.';
    }

    return 'We could not send your message right now.';
  }
}