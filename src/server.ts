import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import nodemailer from 'nodemailer';

interface BookingRequestPayload {
  selectedPackage?: string;
  name?: string;
  email?: string;
  phone?: string;
  date?: string;
  time?: string;
  pax?: number;
  occasion?: string;
  venue?: string;
  message?: string;
}

const browserDistFolder = join(import.meta.dirname, '../browser');
const defaultRecipientEmail = 'euanjosh.amor@evsu.edu.ph';
const mailSendTimeoutMs = Number(process.env['MAIL_SEND_TIMEOUT_MS'] || '25000');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json({ limit: '1mb' }));

app.post('/api/bookings', async (req, res) => {
  const payload = normalizeBookingRequest(req.body as BookingRequestPayload);

  if (!payload.name || !payload.email || !payload.phone || !payload.date) {
    res.status(400).json({
      message: 'Please complete your name, email, mobile number, and event date before sending.',
    });
    return;
  }

  const recipientEmail = cleanText(process.env['BOOKING_RECIPIENT_EMAIL']) || defaultRecipientEmail;
  const fromEmail =
    cleanText(process.env['BOOKING_FROM_EMAIL']) ||
    cleanText(process.env['SMTP_USER']) ||
    `no-reply@${new URL('http://localhost').hostname}`;

  const smtpTransport = getSmtpTransport();
  if (!smtpTransport) {
    res.status(503).json({
      message:
        'Email service is not configured. Set BOOKING_SMTP_URL or SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS on the server.',
    });
    return;
  }

  const subject = buildSubject(payload);
  const text = buildTextBody(payload);
  const html = buildHtmlBody(payload);

  try {
    await withTimeout(
      smtpTransport.sendMail({
        from: `Mess Catering <${fromEmail}>`,
        to: recipientEmail,
        replyTo: payload.email,
        subject,
        text,
        html,
      }),
      mailSendTimeoutMs,
      'Booking email send timed out.',
    );

    res.status(200).json({
      success: true,
      message: 'Booking email sent successfully.',
      booking: payload,
    });
  } catch (error) {
    console.error('Failed to send booking email:', error);
    res.status(error instanceof Error && error.message === 'Booking email send timed out.' ? 504 : 502).json({
      success: false,
      message:
        error instanceof Error && error.message === 'Booking email send timed out.'
          ? 'The email service took too long to respond. Please try again.'
          : 'Could not deliver booking request right now.',
    });
  }
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,  // Don't auto-serve index.html
  }),
);

/**
 * Special handler for root path to ensure it reaches Angular engine
 */
app.get('/', (req, res, next) => {
  // Explicitly pass root path to Angular engine
  next();
});

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

function getSmtpTransport() {
  const smtpUrl = cleanText(process.env['BOOKING_SMTP_URL']) || cleanText(process.env['SMTP_URL']);
  if (smtpUrl) {
    return nodemailer.createTransport(smtpUrl);
  }

  const host = cleanText(process.env['SMTP_HOST']);
  const port = Number(process.env['SMTP_PORT'] || '0');
  const user = cleanText(process.env['SMTP_USER']);
  const pass = cleanText(process.env['SMTP_PASS']);

  if (!host || !port || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: String(process.env['SMTP_SECURE']).toLowerCase() === 'true' || port === 465,
    connectionTimeout: mailSendTimeoutMs,
    greetingTimeout: mailSendTimeoutMs,
    socketTimeout: mailSendTimeoutMs,
    auth: {
      user,
      pass,
    },
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs).unref();
    }),
  ]);
}

function normalizeBookingRequest(payload: BookingRequestPayload): Required<BookingRequestPayload> {
  return {
    selectedPackage: cleanText(payload?.selectedPackage),
    name: cleanText(payload?.name),
    email: cleanText(payload?.email),
    phone: cleanText(payload?.phone),
    date: cleanText(payload?.date),
    time: cleanText(payload?.time),
    pax: Number(payload?.pax) || 1,
    occasion: cleanText(payload?.occasion),
    venue: cleanText(payload?.venue),
    message: cleanMultilineText(payload?.message),
  };
}

function buildSubject(payload: Required<BookingRequestPayload>): string {
  const subjectParts = ['Booking inquiry'];
  if (payload.name) {
    subjectParts.push(`from ${payload.name}`);
  }
  if (payload.selectedPackage) {
    subjectParts.push(`for ${payload.selectedPackage}`);
  }

  return subjectParts.join(' ');
}

function buildTextBody(payload: Required<BookingRequestPayload>): string {
  return [
    'Booking inquiry details:',
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Mobile number: ${payload.phone}`,
    `Event date: ${payload.date}`,
    `Preferred time: ${payload.time}`,
    `Number of guests: ${payload.pax}`,
    `Occasion: ${payload.occasion}`,
    `Venue: ${payload.venue}`,
    `Selected package: ${payload.selectedPackage}`,
    '',
    'Message / requirements:',
    payload.message,
  ].join('\n');
}

function buildHtmlBody(payload: Required<BookingRequestPayload>): string {
  const rows = [
    ['Name', payload.name],
    ['Email', payload.email],
    ['Mobile number', payload.phone],
    ['Event date', payload.date],
    ['Preferred time', payload.time],
    ['Number of guests', String(payload.pax)],
    ['Occasion', payload.occasion],
    ['Venue', payload.venue],
    ['Selected package', payload.selectedPackage],
  ]
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;white-space:nowrap;">${escapeHtml(label)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join('');

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;">
      <h2 style="margin:0 0 16px;">Booking inquiry details</h2>
      <table style="border-collapse:collapse;width:100%;max-width:720px;">
        <tbody>${rows}</tbody>
      </table>
      <h3 style="margin:24px 0 8px;">Message / requirements</h3>
      <div style="white-space:pre-wrap;padding:12px 14px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;">${escapeHtml(payload.message || 'No message provided.')}</div>
    </div>
  `;
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function cleanMultilineText(value: unknown): string {
  return cleanText(value).replace(/\r\n?/g, '\n');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
