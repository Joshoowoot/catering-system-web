import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

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

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router) {
    this.form = this.fb.group({
      selectedPackage: [''],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      date: ['', Validators.required],
      time: [''],
      pax: [1, [Validators.required, Validators.min(1)]],
      occasion: [''],
      venue: [''],
      message: [''],
    });
    // read query params to prefill form when navigated from a package
    this.route.queryParams.subscribe((qp) => {
      if (!qp) return;
      const patch: any = {};
      if (qp['package']) patch.selectedPackage = qp['package'];
      if (qp['pax']) patch.pax = Number(qp['pax']) || 1;
      if (Object.keys(patch).length) this.form.patchValue(patch);
    });
  }
  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    const payload = this.form.value;
    console.log('Booking submitted', payload);
    // TODO: replace with real submission (HTTP) later
    // Navigate to thank-you page after submission
    this.submitting = false;
    // capture payload to show on thank-you page, navigate with state
    const bookingPayload = { ...payload };
    this.form.reset({ pax: 1 });
    this.router.navigate(['/booking/thank-you'], { state: { booking: bookingPayload } });
  }
}
