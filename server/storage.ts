import { db } from "./db";
import { eq } from "drizzle-orm";
import { 
  messages, reminders, userPreferences,
  type Message, type InsertMessage,
  type Reminder, type InsertReminder,
  type UserPreferences, type InsertUserPreferences
} from "@shared/schema";

export interface IStorage {
  // Messages
  getMessage(id: number): Promise<Message | undefined>;
  getMessages(): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessageProcessed(id: number, processed: boolean): Promise<Message>;

  // Reminders
  getReminder(id: number): Promise<Reminder | undefined>;
  getReminders(): Promise<Reminder[]>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminderCompleted(id: number, completed: boolean): Promise<Reminder>;
  shareReminder(id: number, sharedWith: string[]): Promise<Reminder>;

  // User Preferences
  getUserPreferences(phone: string): Promise<UserPreferences | undefined>;
  getAllUserPreferences(): Promise<UserPreferences[]>;
  createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(phone: string, preferences: Partial<InsertUserPreferences>): Promise<UserPreferences>;
}

export class DatabaseStorage implements IStorage {
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async getMessages(): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async updateMessageProcessed(id: number, processed: boolean): Promise<Message> {
    const [message] = await db
      .update(messages)
      .set({ processed })
      .where(eq(messages.id, id))
      .returning();

    if (!message) throw new Error("Message not found");
    return message;
  }

  async getReminder(id: number): Promise<Reminder | undefined> {
    const [reminder] = await db.select().from(reminders).where(eq(reminders.id, id));
    return reminder;
  }

  async getReminders(): Promise<Reminder[]> {
    return await db
      .select()
      .from(reminders)
      .orderBy(reminders.datetime);
  }

  async createReminder(insertReminder: InsertReminder): Promise<Reminder> {
    const [reminder] = await db
      .insert(reminders)
      .values(insertReminder)
      .returning();
    return reminder;
  }

  async updateReminderCompleted(id: number, completed: boolean): Promise<Reminder> {
    const [reminder] = await db
      .update(reminders)
      .set({ completed })
      .where(eq(reminders.id, id))
      .returning();

    if (!reminder) throw new Error("Reminder not found");
    return reminder;
  }

  async shareReminder(id: number, sharedWith: string[]): Promise<Reminder> {
    const [reminder] = await db
      .update(reminders)
      .set({ shared: true, sharedWith })
      .where(eq(reminders.id, id))
      .returning();

    if (!reminder) throw new Error("Reminder not found");
    return reminder;
  }

  async getUserPreferences(phone: string): Promise<UserPreferences | undefined> {
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.phone, phone));
    return prefs;
  }

  async getAllUserPreferences(): Promise<UserPreferences[]> {
    return await db
      .select()
      .from(userPreferences);
  }

  async createUserPreferences(insertPreferences: InsertUserPreferences): Promise<UserPreferences> {
    const [prefs] = await db
      .insert(userPreferences)
      .values(insertPreferences)
      .returning();
    return prefs;
  }

  async updateUserPreferences(
    phone: string,
    preferences: Partial<InsertUserPreferences>
  ): Promise<UserPreferences> {
    const [prefs] = await db
      .update(userPreferences)
      .set({ ...preferences, updatedAt: new Date() })
      .where(eq(userPreferences.phone, phone))
      .returning();

    if (!prefs) throw new Error("User preferences not found");
    return prefs;
  }
}

export const storage = new DatabaseStorage();