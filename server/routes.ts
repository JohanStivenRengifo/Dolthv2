import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { whatsappService } from "./services/whatsapp";
import { aiService } from "./services/ai";
import { insertMessageSchema, insertReminderSchema } from "@shared/schema";
import { calendarService } from "./services/calendar";

export async function registerRoutes(app: Express): Promise<Server> {
  // Messages
  app.get("/api/messages", async (_req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      console.error('Error obteniendo mensajes:', error);
      res.status(500).json({ error: "Error al obtener mensajes" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const parsed = insertMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          error: "Datos de mensaje inválidos",
          details: parsed.error.issues
        });
      }

      const message = await storage.createMessage(parsed.data);

      // Procesar con IA en segundo plano
      aiService.analyzeMessage(message.content)
        .then(async (analysis) => {
          await storage.updateMessageProcessed(message.id, true);
          console.log(`Mensaje ${message.id} procesado con análisis:`, analysis);
        })
        .catch(error => {
          console.error(`Error procesando mensaje ${message.id}:`, error);
        });

      res.json(message);
    } catch (error) {
      console.error('Error creando mensaje:', error);
      res.status(500).json({ error: "Error al crear mensaje" });
    }
  });

  // Reminders
  app.get("/api/reminders", async (_req, res) => {
    try {
      const reminders = await storage.getReminders();
      res.json(reminders);
    } catch (error) {
      console.error('Error obteniendo recordatorios:', error);
      res.status(500).json({ error: "Error al obtener recordatorios" });
    }
  });

  app.post("/api/reminders", async (req, res) => {
    try {
      const parsed = insertReminderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          error: "Datos de recordatorio inválidos",
          details: parsed.error.issues
        });
      }

      const reminder = await storage.createReminder(parsed.data);
      res.json(reminder);
    } catch (error) {
      console.error('Error creando recordatorio:', error);
      res.status(500).json({ error: "Error al crear recordatorio" });
    }
  });

  app.post("/api/reminders/:id/complete", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de recordatorio inválido" });
      }

      const reminder = await storage.updateReminderCompleted(id, true);
      res.json(reminder);
    } catch (error) {
      console.error('Error completando recordatorio:', error);
      res.status(500).json({ error: "Error al completar recordatorio" });
    }
  });

  // WhatsApp webhook y estado
  app.get("/api/whatsapp/status", (_req, res) => {
    const status = whatsappService.getStatus();
    res.json(status);
  });

  app.post("/api/webhook", async (req, res) => {
    try {
      const { phone, content } = req.body;
      if (!phone || !content) {
        return res.status(400).json({ error: "Se requiere phone y content" });
      }

      await whatsappService.receiveMessage({ phone, content });
      res.sendStatus(200);
    } catch (error) {
      console.error('Error en webhook:', error);
      res.status(500).json({ error: "Error procesando webhook" });
    }
  });

  // Rutas de calendario
  app.get("/api/calendars", async (req, res) => {
    try {
      const phone = req.query.phone as string;
      if (!phone) {
        return res.status(400).json({ error: "Se requiere el número de teléfono" });
      }

      const calendars = await storage.getCalendars(phone);
      res.json(calendars);
    } catch (error) {
      console.error('Error obteniendo calendarios:', error);
      res.status(500).json({ error: "Error al obtener calendarios" });
    }
  });

  app.get("/api/calendar-providers", (_req, res) => {
    const providers = calendarService.getProviders();
    res.json(providers);
  });

  app.post("/api/calendars", async (req, res) => {
    try {
      const { phone, type, name } = req.body;
      if (!phone || !type || !name) {
        return res.status(400).json({ 
          error: "Se requiere phone, type y name" 
        });
      }

      const calendar = await calendarService.connectCalendar(phone, type, name);
      res.json(calendar);
    } catch (error) {
      console.error('Error conectando calendario:', error);
      res.status(500).json({ error: "Error al conectar calendario" });
    }
  });

  app.get("/api/calendars/:id/events", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de calendario inválido" });
      }

      const events = await storage.getCalendarEvents(id);
      res.json(events);
    } catch (error) {
      console.error('Error obteniendo eventos:', error);
      res.status(500).json({ error: "Error al obtener eventos" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}