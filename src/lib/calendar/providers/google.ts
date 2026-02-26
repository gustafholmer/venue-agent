import { google } from 'googleapis'
import type { CalendarProvider, TokenSet, ExternalCalendar, CalendarEvent } from '../types'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
]

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
}

export class GoogleCalendarProvider implements CalendarProvider {
  getAuthUrl(redirectUri: string, state: string): string {
    const client = getOAuth2Client()
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
      redirect_uri: redirectUri,
      state,
    })
  }

  async exchangeCode(code: string, redirectUri: string): Promise<TokenSet> {
    const client = getOAuth2Client()
    const { tokens } = await client.getToken({
      code,
      redirect_uri: redirectUri,
    })

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to get tokens from Google')
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expiry_date || Date.now() + 3600 * 1000),
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenSet> {
    const client = getOAuth2Client()
    client.setCredentials({ refresh_token: refreshToken })
    const { credentials } = await client.refreshAccessToken()

    if (!credentials.access_token) {
      throw new Error('Failed to refresh Google access token')
    }

    return {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || refreshToken,
      expiresAt: new Date(credentials.expiry_date || Date.now() + 3600 * 1000),
    }
  }

  async listCalendars(accessToken: string): Promise<ExternalCalendar[]> {
    const client = getOAuth2Client()
    client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: client })
    const res = await calendar.calendarList.list()

    return (res.data.items || []).map((cal) => ({
      id: cal.id || '',
      name: cal.summary || '',
      primary: cal.primary || false,
    }))
  }

  async createEvent(accessToken: string, calendarId: string, event: CalendarEvent): Promise<string> {
    const client = getOAuth2Client()
    client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: client })

    // All-day event: date (not dateTime), end date is exclusive (next day)
    const endDate = new Date(event.date)
    endDate.setDate(endDate.getDate() + 1)
    const endDateStr = endDate.toISOString().split('T')[0]

    const res = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: event.title,
        description: event.description,
        start: { date: event.date },
        end: { date: endDateStr },
        status: event.status,
        transparency: 'opaque',
      },
    })

    if (!res.data.id) {
      throw new Error('Google Calendar did not return an event ID')
    }

    return res.data.id
  }

  async updateEvent(accessToken: string, calendarId: string, eventId: string, event: CalendarEvent): Promise<void> {
    const client = getOAuth2Client()
    client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: client })

    const endDate = new Date(event.date)
    endDate.setDate(endDate.getDate() + 1)
    const endDateStr = endDate.toISOString().split('T')[0]

    await calendar.events.update({
      calendarId,
      eventId,
      requestBody: {
        summary: event.title,
        description: event.description,
        start: { date: event.date },
        end: { date: endDateStr },
        status: event.status,
        transparency: 'opaque',
      },
    })
  }

  async deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
    const client = getOAuth2Client()
    client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: client })

    await calendar.events.delete({
      calendarId,
      eventId,
    })
  }
}
