import { google } from 'googleapis';
import crypto from 'crypto';

type CreateEventOpts = {
  summary: string;
  description?: string;
  start: string; // ISO string
  end: string; // ISO string
  attendees?: string[]; // emails
};

/**
 * Create a Google Calendar event with conferenceData (Google Meet) using a service account.
 *
 * Environment variables expected:
 * - GOOGLE_SERVICE_ACCOUNT_JSON: the full JSON of the service account key (or path to JSON file not supported here)
 * - GOOGLE_CALENDAR_ID: the calendar email or 'primary' to create the event on
 *
 * Returns: { htmlLink, meetUrl, eventId }
 */
export async function createGoogleMeetEvent(opts: CreateEventOpts) {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(keyJson);
  } catch (e) {
    throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON');
  }

  const jwtClient = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  const calendar = google.calendar({ version: 'v3', auth: jwtClient });

  // Build attendees
  const attendees = (opts.attendees || []).map(email => ({ email }));

  // Use random requestId for conference creation
  const requestId = crypto.randomBytes(8).toString('hex');

  const eventBody: any = {
    summary: opts.summary,
    description: opts.description ?? '',
    start: { dateTime: opts.start },
    end: { dateTime: opts.end },
    attendees,
    conferenceData: { createRequest: { requestId } },
  };

  const res = await calendar.events.insert({
    calendarId,
    requestBody: eventBody,
    conferenceDataVersion: 1,
    sendUpdates: 'all',
  } as any);

  const event = res.data as any;
  const htmlLink = event?.htmlLink;

  // Try to extract Meet URL from conferenceData.entryPoints
  let meetUrl: string | undefined = undefined;
  const entryPoints = event?.conferenceData?.entryPoints as any[] | undefined;
  if (Array.isArray(entryPoints)) {
    const video = entryPoints.find((e: any) => e.entryPointType === 'video' || e.entryPointType === 'video' || e?.entryPointType === 'video' || e?.entryPointType === 'hangout' || e?.entryPointType === 'hangoutsMeet');
    if (video && video.uri) meetUrl = video.uri;
  }

  // Some events expose conferenceData.conferenceSolution or conferenceData.entryPoints differently
  // as a fallback check conferenceData?.conferenceSolution?.name
  if (!meetUrl && event?.conferenceData?.conferenceSolution) {
    // sometimes the event contains a hangout link under conferenceData?.entryPoints
    const eps = event?.conferenceData?.entryPoints || [];
    for (const ep of eps) {
      if (ep?.uri) {
        meetUrl = ep.uri; break;
      }
    }
  }

  return { htmlLink, meetUrl, eventId: event?.id };
}

export default { createGoogleMeetEvent };
