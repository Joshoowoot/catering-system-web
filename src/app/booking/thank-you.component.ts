import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-booking-thank-you',
  imports: [CommonModule, RouterLink],
  template: `
    <section class="thank-you-hero" aria-labelledby="thank-you-title">
      <div class="thank-you-overlay"></div>

      <div class="section-block thank-you-section">
        <div class="section-heading thank-you-heading">
          <p class="eyebrow">Reservation Complete</p>
          <h2 id="thank-you-title">Your booking request is in our queue</h2>
          <p class="package-copy">
            We appreciate your reservation. Our team will review the details and reach out shortly to confirm availability, pricing, and final arrangements.
          </p>
        </div>

        <div class="thank-you-grid">
          <article class="thank-you-card confirmation-card">
            <div class="confirmation-badge">Received</div>
            <h3>Booking Summary</h3>

            <dl class="summary-list" *ngIf="booking; else noBooking">
              <div>
                <dt>Package</dt>
                <dd>{{ booking.selectedPackage || '—' }}</dd>
              </div>
              <div>
                <dt>Name</dt>
                <dd>{{ booking.name || '—' }}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{{ booking.date || '—' }}</dd>
              </div>
              <div>
                <dt>Guests</dt>
                <dd>{{ booking.pax || '—' }}</dd>
              </div>
            </dl>

            <ng-template #noBooking>
              <p class="package-copy compact-copy">
                Your booking details were not available on this page, but the reservation was submitted successfully.
              </p>
            </ng-template>
          </article>

          <aside class="thank-you-card next-steps-card">
            <h3>What happens next</h3>
            <div class="next-step">
              <strong>1. Review</strong>
              <span>We verify your selected package and event requirements.</span>
            </div>
            <div class="next-step">
              <strong>2. Confirm</strong>
              <span>We contact you with availability and final details.</span>
            </div>
            <div class="next-step">
              <strong>3. Prepare</strong>
              <span>Your catering and equipment arrangement is scheduled.</span>
            </div>

            <a class="primary-action home-link" [routerLink]="['/']">Back to Homepage</a>
          </aside>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
    .thank-you-hero {
      position: relative;
      padding: 4rem 0 5rem;
      background:
        radial-gradient(circle at top left, rgba(91, 136, 178, 0.16), transparent 24%),
        radial-gradient(circle at bottom right, rgba(18, 44, 79, 0.08), transparent 28%),
        linear-gradient(180deg, #fffdfb 0%, #faf9f0 100%);
    }

    .thank-you-overlay {
      position: absolute;
      inset: 0;
      background-image: linear-gradient(rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.22));
      pointer-events: none;
    }

    .thank-you-section {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      width: min(1200px, calc(100% - 2rem));
      margin: 0 auto;
    }

    .thank-you-heading {
      max-width: 50rem;
    }

    .thank-you-heading .package-copy {
      max-width: 46rem;
    }

    .thank-you-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
      gap: 1.25rem;
      align-items: stretch;
    }

    .thank-you-card {
      background: rgba(251, 249, 228, 0.96);
      border: 1px solid var(--line);
      border-radius: 1.5rem;
      box-shadow: var(--shadow);
      backdrop-filter: blur(12px);
    }

    .confirmation-card,
    .next-steps-card {
      padding: 1.8rem;
    }

    .confirmation-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
      padding: 0.45rem 0.8rem;
      border-radius: 999px;
      background: rgba(90, 22, 45, 0.08);
      color: var(--maroon);
      font-family: 'Inter', sans-serif;
      font-size: 0.8rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .confirmation-card h3,
    .next-steps-card h3 {
      margin-bottom: 1rem;
    }

    .summary-list {
      display: grid;
      gap: 0.9rem;
      margin: 0;
    }

    .summary-list div {
      padding: 0.9rem 1rem;
      border-radius: 1rem;
      background: rgba(18, 44, 79, 0.05);
    }

    .summary-list dt {
      color: var(--ink-soft);
      font-family: 'Inter', sans-serif;
      font-size: 0.8rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 0.35rem;
    }

    .summary-list dd {
      margin: 0;
      color: var(--maroon-dark);
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 1.35rem;
      line-height: 1.2;
    }

    .next-step {
      display: grid;
      gap: 0.35rem;
      padding: 0.95rem 1rem;
      margin-bottom: 0.8rem;
      border-left: 3px solid rgba(90, 22, 45, 0.45);
      background: rgba(255, 255, 255, 0.5);
      border-radius: 0.85rem;
    }

    .next-step strong {
      color: var(--maroon-dark);
      font-family: 'Inter', sans-serif;
    }

    .next-step span,
    .compact-copy {
      color: var(--ink-soft);
      font-family: 'Inter', sans-serif;
      line-height: 1.7;
    }

    .home-link {
      display: inline-flex;
      margin-top: 0.75rem;
      text-decoration: none;
    }

    @media (max-width: 900px) {
      .thank-you-grid {
        grid-template-columns: 1fr;
      }
    }
    `,
  ],
})
export class ThankYouComponent {
  booking: any;

  constructor(private location: Location) {
    this.booking = (this.location.getState() as any)?.booking ?? null;
  }
}
