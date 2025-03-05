import moment from 'moment-timezone';
import { storage } from '../storage';
import { weatherService } from './weather';
import { whatsappService } from './whatsapp';
import type { UserPreferences, Reminder } from '@shared/schema';

export class NotificationService {
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startNotificationService();
  }

  private startNotificationService() {
    // Revisar notificaciones cada minuto
    this.checkInterval = setInterval(async () => {
      try {
        await this.checkAndSendNotifications();
      } catch (error) {
        console.error('Error en servicio de notificaciones:', error);
      }
    }, 60000);
  }

  private async checkAndSendNotifications() {
    const now = moment();

    // Obtener todos los usuarios con sus preferencias
    const preferences = await storage.getAllUserPreferences();

    for (const pref of preferences) {
      try {
        await this.processUserNotifications(pref, now);
      } catch (error) {
        console.error(`Error procesando notificaciones para ${pref.phone}:`, error);
      }
    }
  }

  private async processUserNotifications(pref: UserPreferences, now: moment.Moment) {
    const userTime = moment.tz(now, pref.timezone || 'UTC');

    // Saludo matutino
    if (pref.morningGreeting && pref.timezone && pref.weatherLocation && pref.greetingTime) {
      const greetingTime = moment.tz(pref.greetingTime, 'HH:mm', pref.timezone);
      if (userTime.format('HH:mm') === greetingTime.format('HH:mm')) {
        await this.sendMorningGreeting(pref);
      }
    }

    // Notificaciones del clima
    if (pref.weatherAlerts && pref.weatherLocation) {
      // Enviar pronóstico del clima a las 8 AM
      if (userTime.format('HH:mm') === '08:00') {
        await this.sendWeatherUpdate(pref);
      }
    }

    // Recordatorios próximos
    await this.checkUpcomingReminders(pref);
  }

  private async sendMorningGreeting(pref: UserPreferences) {
    try {
      // Obtener recordatorios del día
      const todayReminders = await this.getTodayReminders(pref.phone);

      // Obtener el clima si está configurado
      let weatherInfo = '';
      if (pref.weatherLocation) {
        const weather = await weatherService.getCurrentWeather(pref.weatherLocation);
        if (weather) {
          weatherInfo = `\n\n${weatherService.formatWeatherMessage(weather)}`;
        }
      }

      // Construir mensaje de saludo
      const greeting = this.getMorningGreeting();
      const remindersText = todayReminders.length > 0
        ? `\n\n📅 Tus eventos para hoy:\n${this.formatReminders(todayReminders)}`
        : '\n\n📅 No tienes eventos programados para hoy.';

      const message = `${greeting}${weatherInfo}${remindersText}\n\n¿En qué puedo ayudarte hoy? 😊`;

      await whatsappService.sendMessage(pref.phone, message);
    } catch (error) {
      console.error('Error enviando saludo matutino:', error);
    }
  }

  private async sendWeatherUpdate(pref: UserPreferences) {
    try {
      // Early return if weatherLocation is null
      if (!pref.weatherLocation) {
        return;
      }

      const weather = await weatherService.getCurrentWeather(pref.weatherLocation);
      if (weather) {
        const forecast = await weatherService.getForecast(pref.weatherLocation, 3);
        const message = weatherService.formatWeatherMessage(weather) + 
                       '\n\n' + 
                       weatherService.formatForecastMessage(forecast);

        await whatsappService.sendMessage(pref.phone, message);
      }
    } catch (error) {
      console.error('Error enviando actualización del clima:', error);
    }
  }

  private async checkUpcomingReminders(pref: UserPreferences) {
    const reminders = await storage.getReminders();
    const userReminders = reminders.filter(r => 
      r.phone === pref.phone && 
      !r.completed &&
      moment(r.datetime).isAfter(moment())
    );

    for (const reminder of userReminders) {
      const reminderTime = moment(reminder.datetime);
      const now = moment();

      // Notificar 30 minutos antes
      if (reminderTime.diff(now, 'minutes') === 30) {
        await this.sendReminderNotification(reminder, true);
      }
      // Notificar en el momento exacto
      else if (reminderTime.format('YYYY-MM-DD HH:mm') === now.format('YYYY-MM-DD HH:mm')) {
        await this.sendReminderNotification(reminder, false);
      }
    }
  }

  private async getTodayReminders(phone: string): Promise<Reminder[]> {
    const reminders = await storage.getReminders();
    const today = moment().startOf('day');
    const tomorrow = moment().endOf('day');

    return reminders.filter(r => 
      r.phone === phone &&
      !r.completed &&
      moment(r.datetime).isBetween(today, tomorrow)
    );
  }

  private getMorningGreeting(): string {
    const greetings = [
      "¡Buenos días! 🌅 Espero que hayas descansado bien.",
      "¡Que tengas un excelente día! ✨ Estoy aquí para ayudarte.",
      "¡Feliz día! 🌟 ¿Listo/a para empezar con energía?",
      "¡Buen día! ☀️ ¿Cómo amaneciste hoy?",
      "¡Que sea un día maravilloso! 🌈 Cuenta conmigo para lo que necesites."
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  private formatReminders(reminders: Reminder[]): string {
    return reminders
      .sort((a, b) => moment(a.datetime).diff(moment(b.datetime)))
      .map(r => {
        const time = moment(r.datetime).format('HH:mm');
        const shared = r.shared ? ' 👥' : '';
        const recurring = r.recurring ? ` 🔄 ${r.frequency}` : '';
        return `⏰ ${time} - ${r.title}${shared}${recurring}`;
      })
      .join('\n');
  }

  private async sendReminderNotification(reminder: Reminder, isPreview: boolean) {
    const time = moment(reminder.datetime).format('HH:mm');
    const recurringInfo = reminder.recurring ? ` (${reminder.frequency})` : '';
    const sharedInfo = reminder.shared ? '\n👥 Evento compartido' : '';

    const message = isPreview
      ? `🔔 Recordatorio en 30 minutos:\n\n📝 ${reminder.title}\n⏰ ${time}${recurringInfo}${sharedInfo}`
      : `🔔 ¡Es hora de tu recordatorio!\n\n📝 ${reminder.title}${recurringInfo}${sharedInfo}`;

    await whatsappService.sendMessage(reminder.phone, message);

    // Si el recordatorio está compartido, notificar a los demás usuarios
    if (reminder.shared && reminder.sharedWith) {
      for (const phone of reminder.sharedWith) {
        await whatsappService.sendMessage(phone, message);
      }
    }
  }
}

export const notificationService = new NotificationService();