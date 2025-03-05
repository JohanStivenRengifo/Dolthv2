import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  phone: text("phone").notNull(),
  sentiment: text("sentiment"),
  processed: boolean("processed").default(false),
  attachmentUrl: text("attachment_url"),
  attachmentType: text("attachment_type"), // image, audio, etc.
  metadata: jsonb("metadata"), // Para almacenar análisis de IA, intenciones, etc.
  createdAt: timestamp("created_at").defaultNow()
});

export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  start: timestamp("start").notNull(),
  end: timestamp("end"),
  frequency: text("frequency"),
  endDate: timestamp("end_date"),
  userId: text("user_id").notNull(),
  priority: text("priority"), // high, medium, low
  category: text("category"),
  metadata: jsonb("metadata"), // Para almacenar análisis de IA, sentimiento, etc.
  createdAt: timestamp("created_at").defaultNow()
});

export const calendars = pgTable("calendars", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  type: text("type").notNull(), // google, outlook, apple, etc.
  name: text("name").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  calendarId: integer("calendar_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  shared: boolean("shared").default(false),
  sharedWith: text("shared_with").array(),
  createdAt: timestamp("created_at").defaultNow()
});

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  weatherLocation: text("weather_location"),
  weatherAlerts: boolean("weather_alerts").default(true),
  morningGreeting: boolean("morning_greeting").default(true),
  greetingTime: text("greeting_time").default("08:00"),
  language: text("language").default("es"),
  notificationPreferences: jsonb("notification_preferences"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  messageCount: integer("message_count").default(0),
  reminderCount: integer("reminder_count").default(0),
  completedReminders: integer("completed_reminders").default(0),
  missedReminders: integer("missed_reminders").default(0),
  averageResponseTime: integer("average_response_time"),
  commonTimes: text("common_times").array(),
  commonDays: text("common_days").array(),
  weatherChecks: integer("weather_checks").default(0),
  sharedEvents: integer("shared_events").default(0),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Schemas de inserción
export const insertMessageSchema = createInsertSchema(messages);
export const insertReminderSchema = createInsertSchema(reminders);

export const insertCalendarSchema = createInsertSchema(calendars).pick({
  phone: true,
  type: true,
  name: true,
  accessToken: true,
  refreshToken: true,
  expiresAt: true
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).pick({
  calendarId: true,
  title: true,
  description: true,
  startTime: true,
  endTime: true,
  location: true,
  shared: true,
  sharedWith: true
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).pick({
  phone: true,
  timezone: true,
  weatherLocation: true,
  weatherAlerts: true,
  morningGreeting: true,
  greetingTime: true,
  language: true,
  notificationPreferences: true
});

// Tipos de inferencia
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = {
  title: string;
  description?: string | null;
  start: Date;
  end: Date;
  frequency?: string | null;
  endDate?: Date | null;
  userId: string;
  priority?: string | null;
  category?: string | null;
  metadata?: any | null;
};

export type Calendar = typeof calendars.$inferSelect;
export type InsertCalendar = z.infer<typeof insertCalendarSchema>;

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;

export type Analytics = typeof analytics.$inferSelect;