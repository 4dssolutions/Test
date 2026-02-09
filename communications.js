const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || '';
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || '';
const TWILIO_CALL_FROM = process.env.TWILIO_CALL_FROM || '';

const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@refined-digital.local';

function hasTwilioCredentials() {
  return TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN;
}

async function twilioRequest(endpoint, body) {
  if (!hasTwilioCredentials()) {
    console.warn('Twilio credentials missing. Skipping request.');
    return { skipped: true };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/${endpoint}`;
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.warn('Twilio request failed:', errorText);
    return { error: errorText };
  }

  return response.json();
}

async function sendSms(to, message) {
  if (!TWILIO_FROM_NUMBER) {
    console.warn('Twilio from number missing. SMS skipped.');
    return { skipped: true };
  }

  return twilioRequest('Messages.json', {
    From: TWILIO_FROM_NUMBER,
    To: to,
    Body: message,
  });
}

async function sendWhatsApp(to, message) {
  if (!TWILIO_WHATSAPP_FROM) {
    console.warn('Twilio WhatsApp from missing. WhatsApp skipped.');
    return { skipped: true };
  }

  return twilioRequest('Messages.json', {
    From: `whatsapp:${TWILIO_WHATSAPP_FROM}`,
    To: `whatsapp:${to}`,
    Body: message,
  });
}

async function makeCall(to, message) {
  const from = TWILIO_CALL_FROM || TWILIO_FROM_NUMBER;
  if (!from) {
    console.warn('Twilio call from missing. Call skipped.');
    return { skipped: true };
  }

  const twiml = `<Response><Say>${escapeXml(message)}</Say></Response>`;

  return twilioRequest('Calls.json', {
    From: from,
    To: to,
    Twiml: twiml,
  });
}

async function sendEmail(to, subject, body) {
  console.info('Email queued:', { from: EMAIL_FROM, to, subject, body });
  return { queued: true };
}

async function sendBookingConfirmation(booking) {
  const clientName = booking.contact_name || booking.name || 'Client';
  const time = booking.scheduled_at || 'the scheduled time';
  const message = `Hi ${clientName}, your booking is confirmed for ${time}. We will be in touch shortly.`;

  if (booking.contact_phone) {
    await sendSms(booking.contact_phone, message);
    await sendWhatsApp(booking.contact_phone, message);
  }

  if (booking.contact_email) {
    await sendEmail(booking.contact_email, 'Booking Confirmation', message);
  }
}

function escapeXml(input) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = {
  sendSms,
  sendWhatsApp,
  makeCall,
  sendEmail,
  sendBookingConfirmation,
};
