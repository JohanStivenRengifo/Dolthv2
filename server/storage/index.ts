import type { Calendar, CalendarEvent } from '@shared/schema';

export interface DatabaseStorage {
  // Calendar methods
  getCalendars(phone: string): Promise<Calendar[]>;
  getCalendarEvents(calendarId: string): Promise<CalendarEvent[]>;
  createCalendar(calendar: Omit<Calendar, 'id'>): Promise<Calendar>;
}