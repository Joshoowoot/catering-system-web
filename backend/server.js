const path = require('path');

const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const nodemailer = require('nodemailer');

dotenv.config({ path: path.join(__dirname, '.env') });

const PORT = Number(process.env.PORT || 3000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:4200';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const SENDER_NAME = process.env.SENDER_NAME || 'Promotional Website Contact Form';
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 25);
const MIN_MESSAGE_LENGTH = Number(process.env.MIN_MESSAGE_LENGTH || 20);
const MAIL_SEND_TIMEOUT_MS = Number(process.env.MAIL_SEND_TIMEOUT_MS || 25000);

const requiredEnv = ['GMAIL_USER', 'GMAIL_APP_PASSWORD'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  connectionTimeout: MAIL_SEND_TIMEOUT_MS,
  greetingTimeout: MAIL_SEND_TIMEOUT_MS,
  socketTimeout: MAIL_SEND_TIMEOUT_MS,
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

const rateLimitBuckets = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateLimitBuckets.entries()) {
    if (now - bucket.startedAt > RATE_LIMIT_WINDOW_MS) {
      rateLimitBuckets.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS).unref();

app.use(express.json({ limit: '20kb' }));
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);

// JSON parse error handler - returns clean JSON for malformed requests
app.use((err, _req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Malformed JSON in request body.' });
  }

  // delegate to default error handler
  next(err);
});

// Simple request logger for API endpoints (helpful during debugging)
app.use((req, _res, next) => {
  if (req.path && req.path.startsWith('/api/')) {
    try {
      console.log(`API ${req.method} ${req.path} — body keys: ${Object.keys(req.body || {}).join(', ')}`);
    } catch (e) {
      console.log(`API ${req.method} ${req.path} — body unreadable`);
    }
  }
  next();
});

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidDate(dateValue) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateValue) && !Number.isNaN(new Date(dateValue).getTime());
}

function validatePayload(body) {
  const payload = {
    fullName: cleanText(body?.fullName),
    email: cleanText(body?.email),
    mobileNumber: cleanText(body?.mobileNumber),
    date: cleanText(body?.date),
    subject: cleanText(body?.subject),
    message: cleanText(body?.message),
    website: cleanText(body?.website),
  };

  const errors = {};

  if (!payload.fullName) errors.fullName = 'Full name is required.';
  if (payload.fullName && payload.fullName.length < 2) errors.fullName = 'Full name is too short.';
  if (!payload.email) errors.email = 'Email is required.';
  else if (!isValidEmail(payload.email)) errors.email = 'Email format is invalid.';
  if (!payload.mobileNumber) errors.mobileNumber = 'Mobile number is required.';
  else if (!/^[0-9+()\-\s]{7,20}$/.test(payload.mobileNumber)) {
    errors.mobileNumber = 'Mobile number format is invalid.';
  }
  if (!payload.date) errors.date = 'Date is required.';
  else if (!isValidDate(payload.date)) errors.date = 'Date format is invalid.';
  if (!payload.subject) errors.subject = 'Subject is required.';
  if (payload.subject && payload.subject.length < 3) errors.subject = 'Subject is too short.';
  if (!payload.message) errors.message = 'Message is required.';
  else if (payload.message.length < MIN_MESSAGE_LENGTH) {
    errors.message = `Message must be at least ${MIN_MESSAGE_LENGTH} characters.`;
  }
  if (payload.website) errors.website = 'Spam detected.';

  return { payload, errors };
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs).unref();
    }),
  ]);
}

function isRateLimited(ip) {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(ip);

  if (!bucket || now - bucket.startedAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(ip, { startedAt: now, count: 1 });
    return false;
  }

  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX_REQUESTS;
}

app.post('/api/contact', async (req, res) => {
  const ip = getClientIp(req);

  if (isRateLimited(ip)) {
    return res.status(429).json({
      success: false,
      message: 'Too many submissions. Please wait before trying again.',
    });
  }

  const { payload, errors } = validatePayload(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Please fix the highlighted fields and try again.',
      errors,
    });
  }

  const subjectLine = `[Website Contact] ${payload.subject}`;
  const safeMessage = escapeHtml(payload.message).replace(/\n/g, '<br>');
  const html = `
    <div style="font-family: Arial, sans-serif; color: #10253f; line-height: 1.6;">
      <h2 style="margin-top: 0;">New contact form submission</h2>
      <p><strong>Full Name:</strong> ${escapeHtml(payload.fullName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
      <p><strong>Mobile Number:</strong> ${escapeHtml(payload.mobileNumber)}</p>
      <p><strong>Date:</strong> ${escapeHtml(payload.date)}</p>
      <p><strong>Subject:</strong> ${escapeHtml(payload.subject)}</p>
      <p><strong>Message:</strong><br>${safeMessage}</p>
    </div>
  `;

  const text = [
    'New contact form submission',
    `Full Name: ${payload.fullName}`,
    `Email: ${payload.email}`,
    `Mobile Number: ${payload.mobileNumber}`,
    `Date: ${payload.date}`,
    `Subject: ${payload.subject}`,
    `Message: ${payload.message}`,
  ].join('\n');

  try {
    await withTimeout(
      transporter.sendMail({
        from: `"${SENDER_NAME}" <${GMAIL_USER}>`,
        to: ADMIN_EMAIL,
        replyTo: payload.email,
        subject: subjectLine,
        text,
        html,
      }),
      MAIL_SEND_TIMEOUT_MS,
      'Contact email send timed out.'
    );

    return res.status(200).json({
      success: true,
      message: 'Your message has been sent to the Gmail inbox successfully.',
    });
  } catch (error) {
    console.error('Failed to send contact email:', error);
    return res.status(error?.message === 'Contact email send timed out.' ? 504 : 502).json({
      success: false,
      message:
        error?.message === 'Contact email send timed out.'
          ? 'The email service took too long to respond. Please try again.'
          : 'The message could not be delivered right now. Please try again later.',
    });
  }
});

function validateBookingPayload(body) {
  const payload = {
    selectedPackage: cleanText(body?.selectedPackage),
    name: cleanText(body?.name),
    email: cleanText(body?.email),
    phone: cleanText(body?.phone),
    date: cleanText(body?.date),
    time: cleanText(body?.time),
    pax: Number(body?.pax) || 1,
    occasion: cleanText(body?.occasion),
    venue: cleanText(body?.venue),
    message: cleanText(body?.message),
  };

  const errors = {};

  if (!payload.name) errors.name = 'Full name is required.';
  if (payload.name && payload.name.length < 2) errors.name = 'Full name is too short.';
  if (!payload.email) errors.email = 'Email is required.';
  else if (!isValidEmail(payload.email)) errors.email = 'Email format is invalid.';
  if (!payload.phone) errors.phone = 'Phone is required.';
  else if (!/^[0-9+()\-\s]{7,20}$/.test(payload.phone)) errors.phone = 'Phone format is invalid.';
  if (!payload.date) errors.date = 'Date is required.';
  else if (!isValidDate(payload.date)) errors.date = 'Date format is invalid.';
  if (payload.pax <= 0) errors.pax = 'Number of guests must be at least 1.';
  if (!payload.message) errors.message = 'Message is required.';
  else if (payload.message.length < MIN_MESSAGE_LENGTH) errors.message = `Message must be at least ${MIN_MESSAGE_LENGTH} characters.`;

  return { payload, errors };
}

app.post('/api/bookings', async (req, res) => {
  const ip = getClientIp(req);

  if (isRateLimited(ip)) {
    return res.status(429).json({ success: false, message: 'Too many submissions. Please wait before trying again.' });
  }

  const { payload, errors } = validateBookingPayload(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Please fix the highlighted fields and try again.', errors });
  }

  const subjectLine = `[Website Booking] ${payload.name} - ${payload.selectedPackage || 'Booking'}`;
  const safeMessage = escapeHtml(payload.message).replace(/\n/g, '<br>');
  const html = `
    <div style="font-family: Arial, sans-serif; color: #10253f; line-height: 1.6;">
      <h2 style="margin-top: 0;">New booking request</h2>
      <p><strong>Name:</strong> ${escapeHtml(payload.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(payload.phone)}</p>
      <p><strong>Date:</strong> ${escapeHtml(payload.date)} ${escapeHtml(payload.time || '')}</p>
      <p><strong>Package:</strong> ${escapeHtml(payload.selectedPackage || '')}</p>
      <p><strong>Guests (pax):</strong> ${escapeHtml(String(payload.pax))}</p>
      <p><strong>Occasion:</strong> ${escapeHtml(payload.occasion || '')}</p>
      <p><strong>Venue:</strong> ${escapeHtml(payload.venue || '')}</p>
      <p><strong>Message:</strong><br>${safeMessage}</p>
    </div>
  `;

  const text = [
    'New booking request',
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone}`,
    `Date: ${payload.date} ${payload.time || ''}`,
    `Package: ${payload.selectedPackage || ''}`,
    `Pax: ${payload.pax}`,
    `Occasion: ${payload.occasion || ''}`,
    `Venue: ${payload.venue || ''}`,
    `Message: ${payload.message}`,
  ].join('\n');

  try {
    await withTimeout(
      transporter.sendMail({
        from: `"${SENDER_NAME}" <${GMAIL_USER}>`,
        to: ADMIN_EMAIL,
        replyTo: payload.email,
        subject: subjectLine,
        text,
        html,
      }),
      MAIL_SEND_TIMEOUT_MS,
      'Booking email send timed out.'
    );

    return res.status(200).json({ success: true, message: 'Booking request sent successfully.', booking: payload });
  } catch (error) {
    console.error('Failed to send booking email:', error);
    return res.status(error?.message === 'Booking email send timed out.' ? 504 : 502).json({
      success: false,
      message:
        error?.message === 'Booking email send timed out.'
          ? 'The email service took too long to respond. Please try again.'
          : 'Could not deliver booking request right now.',
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy.' });
});

async function startServer() {
  try {
    await transporter.verify();
    app.listen(PORT, () => {
      console.log(`Contact API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start the mail transporter:', error);
    process.exit(1);
  }
}

startServer();