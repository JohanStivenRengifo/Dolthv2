import moment from 'moment';

type AIResponse = {
  sentiment: string;
  intent: string;
  entities: {
    datetime?: Date | null;
    task?: string;
    calendar?: string;
    frequency?: string;
    endDate?: Date | null;
    priority?: 'high' | 'medium' | 'low';
    category?: string;
    location?: string;
    participants?: string[];
    queryType?: string;
    [key: string]: any;
  };
  confidence: number;
  contextualResponse: string;
};

export class AIService {
  private huggingfaceApiKey: string;
  private deepseekApiKey: string;
  private personalityTraits = {
    friendly: true,
    professional: true,
    empathetic: true,
    proactive: true
  };

  constructor() {
    this.huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY || "";
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY || "";
  }

  async analyzeMessage(content: string): Promise<AIResponse> {
    try {
      // 1. Análisis de sentimientos avanzado usando HuggingFace
      let sentiment = "NEU";
      let confidence = 0.5;

      if (this.huggingfaceApiKey) {
        try {
          const response = await fetch(
            "https://api-inference.huggingface.co/models/finiteautomata/beto-sentiment-analysis",
            {
              headers: { Authorization: `Bearer ${this.huggingfaceApiKey}` },
              method: "POST",
              body: JSON.stringify({ inputs: content }),
            }
          );

          const result = await response.json();
          if (Array.isArray(result) && result.length > 0) {
            sentiment = result[0][0].label;
            confidence = result[0][0].score;
          }
        } catch (error) {
          console.error('Error en análisis de sentimientos:', error);
        }
      }

      // 2. Análisis de intención mejorado
      const intentions = {
        reminder: {
          keywords: ['recordar', 'recordatorio', 'recuérdame', 'agenda', 'programar', 'alarma', 'tarea', 'pendiente'],
          recurring: ['cada', 'todos', 'semanalmente', 'mensualmente', 'diariamente'],
          priority: {
            high: ['urgente', 'importante', 'prioridad', 'rápido', 'inmediato'],
            medium: ['normal', 'regular', 'cuando puedas'],
            low: ['cuando tengas tiempo', 'sin prisa', 'eventualmente']
          }
        },
        calendar: {
          keywords: ['calendario', 'evento', 'cita', 'reunión', 'meeting', 'compromiso', 'agenda'],
          types: ['google', 'outlook', 'apple', 'ical'],
          categories: ['trabajo', 'personal', 'familia', 'amigos', 'salud', 'educación']
        },
        query: {
          keywords: ['mostrar', 'ver', 'cuándo', 'cuando', 'qué', 'que', 'cuál', 'cual', 'lista', 'buscar'],
          types: ['eventos', 'recordatorios', 'tareas', 'citas']
        },
        help: {
          keywords: ['ayuda', 'help', 'cómo', 'como', 'qué puedes', 'que puedes', 'funciones', 'capacidades']
        },
        greeting: {
          keywords: ['hola', 'buenos días', 'buenas tardes', 'buenas noches', 'hey', 'buen día']
        },
        farewell: {
          keywords: ['adiós', 'chao', 'hasta luego', 'nos vemos', 'hasta pronto']
        },
        gratitude: {
          keywords: ['gracias', 'te agradezco', 'muchas gracias', 'mil gracias']
        },
        weather: {
          keywords: ['clima', 'tiempo', 'lluvia', 'temperatura', 'pronóstico', 'meteorológico']
        }
      };

      // 3. Detección de patrones temporales mejorada
      const timePatterns = {
        recurring: {
          daily: /todos los días|diariamente|cada día/i,
          weekly: /cada semana|semanalmente|todos los (lunes|martes|miércoles|jueves|viernes|sábados|domingos)/i,
          monthly: /cada mes|mensualmente|el \d{1,2} de cada mes/i,
          yearly: /cada año|anualmente|todos los años/i
        },
        relative: {
          tomorrow: /mañana/i,
          dayAfterTomorrow: /pasado mañana/i,
          nextWeek: /próxima semana|siguiente semana/i,
          nextMonth: /próximo mes|siguiente mes/i,
          today: /hoy/i,
          now: /ahora|inmediatamente/i
        }
      };

      // 4. Determinar la intención principal y extraer entidades
      let intent = "conversation";
      let entities: AIResponse['entities'] = {};

      // Detectar saludos y despedidas
      if (intentions.greeting.keywords.some(k => content.toLowerCase().includes(k))) {
        intent = "greeting";
      } else if (intentions.farewell.keywords.some(k => content.toLowerCase().includes(k))) {
        intent = "farewell";
      } else if (intentions.gratitude.keywords.some(k => content.toLowerCase().includes(k))) {
        intent = "gratitude";
      } else if (intentions.weather.keywords.some(k => content.toLowerCase().includes(k))) {
        intent = "weather";
      }
      // Detectar recordatorios recurrentes
      else if (intentions.reminder.keywords.some(k => content.toLowerCase().includes(k))) {
        intent = "reminder";
        let isRecurring = false;
        let frequency = "";

        // Analizar patrones recurrentes
        for (const [type, pattern] of Object.entries(timePatterns.recurring)) {
          if (pattern.test(content)) {
            isRecurring = true;
            frequency = type;
            break;
          }
        }

        if (isRecurring) {
          intent = "recurring_reminder";
          entities.frequency = frequency;

          // Detectar fecha de finalización si existe
          const endDateMatch = content.match(/hasta el (\d{1,2}\/\d{1,2}(?:\/\d{4})?)/i);
          if (endDateMatch) {
            entities.endDate = moment(endDateMatch[1], ["DD/MM/YYYY", "DD/MM"]).toDate();
          }
        }

        // Detectar prioridad
        for (const [level, keywords] of Object.entries(intentions.reminder.priority)) {
          if (keywords.some(k => content.toLowerCase().includes(k))) {
            entities.priority = level as 'high' | 'medium' | 'low';
            break;
          }
        }

        // Detectar categoría
        for (const category of intentions.calendar.categories) {
          if (content.toLowerCase().includes(category)) {
            entities.category = category;
            break;
          }
        }

        // Extraer fecha y hora específica
        const timeRegex = /(\d{1,2}):?(\d{2})?\s*(am|pm|h|hrs)?/i;
        const timeMatch = content.match(timeRegex);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          const period = timeMatch[3]?.toLowerCase();

          let adjustedHours = hours;
          if (period === 'pm' && hours < 12) adjustedHours += 12;
          if (period === 'am' && hours === 12) adjustedHours = 0;

          let datetime = moment();

          // Ajustar fecha según palabras clave
          for (const [key, pattern] of Object.entries(timePatterns.relative)) {
            if (pattern.test(content)) {
              switch(key) {
                case 'tomorrow':
                  datetime.add(1, 'day');
                  break;
                case 'dayAfterTomorrow':
                  datetime.add(2, 'days');
                  break;
                case 'nextWeek':
                  datetime.add(1, 'week');
                  break;
                case 'nextMonth':
                  datetime.add(1, 'month');
                  break;
                case 'now':
                  datetime = moment();
                  break;
              }
              break;
            }
          }

          entities.datetime = datetime
            .hours(adjustedHours)
            .minutes(minutes)
            .seconds(0)
            .milliseconds(0)
            .toDate();
        }

        // Extraer la tarea, eliminando referencias temporales y otros patrones
        const task = content
          .replace(new RegExp(intentions.reminder.keywords.join('|'), 'gi'), '')
          .replace(new RegExp(Object.values(timePatterns.recurring).map(p => p.source).join('|'), 'gi'), '')
          .replace(new RegExp(Object.values(timePatterns.relative).map(p => p.source).join('|'), 'gi'), '')
          .replace(timeRegex, '')
          .replace(new RegExp(Object.values(intentions.reminder.priority).flat().join('|'), 'gi'), '')
          .replace(new RegExp(intentions.calendar.categories.join('|'), 'gi'), '')
          .replace(/\s+/g, ' ')
          .trim();

        entities.task = task;
      }

      // Detectar consultas de calendario
      else if (intentions.calendar.keywords.some(k => content.toLowerCase().includes(k))) {
        intent = "calendar";
        // Detectar tipo de calendario
        for (const type of intentions.calendar.types) {
          if (content.toLowerCase().includes(type)) {
            entities.calendar = type;
            break;
          }
        }
        // Detectar categoría
        for (const category of intentions.calendar.categories) {
          if (content.toLowerCase().includes(category)) {
            entities.category = category;
            break;
          }
        }
      }

      // Detectar consultas generales
      else if (intentions.query.keywords.some(k => content.toLowerCase().includes(k))) {
        intent = "query";
        // Detectar tipo de consulta
        for (const type of intentions.query.types) {
          if (content.toLowerCase().includes(type)) {
            entities.queryType = type;
            break;
          }
        }
      }

      // Detectar solicitudes de ayuda
      else if (intentions.help.keywords.some(k => content.toLowerCase().includes(k))) {
        intent = "help";
      }

      // 5. Generar respuesta contextual basada en personalidad
      let contextualResponse = this.generateContextualResponse(intent, sentiment, entities);

      return {
        sentiment,
        intent,
        entities,
        confidence,
        contextualResponse
      };

    } catch (error) {
      console.error('Error en el análisis de IA:', error);
      return {
        sentiment: "neutral",
        intent: "error",
        entities: {
          error: error instanceof Error ? error.message : 'Error desconocido'
        },
        confidence: 0,
        contextualResponse: "Lo siento, tuve un problema procesando tu mensaje. ¿Podrías intentar expresarlo de otra manera? 🤔"
      };
    }
  }

  private generateContextualResponse(intent: string, sentiment: string, entities: any): string {
    type ResponseType = {
      [key: string]: {
        base?: string;
        POS?: string;
        NEU?: string;
        NEG?: string;
      };
    };
    
    const responses: ResponseType = {
      greeting: {
        base: "¡Hola! ",
        POS: "¡Me alegra mucho verte! 😊 ",
        NEU: "¿Cómo estás? 🌟 ",
        NEG: "Espero poder ayudarte a mejorar tu día. 💝 "
      },
      farewell: {
        POS: "¡Hasta pronto! 👋 Ha sido un placer ayudarte. ",
        NEU: "¡Nos vemos! 😊 Aquí estaré cuando me necesites. ",
        NEG: "¡Cuídate mucho! 💝 Espero que la próxima vez estés mejor. "
      },
      gratitude: {
        POS: "¡Es un placer ayudarte! 💖 Tu alegría es mi alegría. ",
        NEU: "¡No hay de qué! 😊 Para eso estoy aquí. ",
        NEG: "Me alegra poder ayudar. 💫 ¡Ánimo! "
      },
      reminder: {
        base: "Entendido, ",
        POS: "¡con gusto te ayudo a recordar eso! ✨ ",
        NEU: "voy a ayudarte con ese recordatorio. 📝 ",
        NEG: "me aseguraré de recordártelo para que no te preocupes. 💫 "
      },
      recurring_reminder: {
        base: "¡Perfecto! ",
        POS: "¡Me encanta ayudarte a organizar tu rutina! ✨ ",
        NEU: "He configurado el recordatorio periódico. 🔄 ",
        NEG: "Me encargaré de recordártelo regularmente para que no te estreses. 💫 "
      },
      calendar: {
        base: "De acuerdo, ",
        POS: "¡con mucho gusto te ayudo con tu calendario! 📅 ",
        NEU: "trabajemos con tu calendario. ✨ ",
        NEG: "organizaremos mejor tu agenda. 💫 "
      },
      query: {
        base: "¡Claro! ",
        POS: "¡Con mucho gusto te muestro esa información! 📊 ",
        NEU: "Te mostraré lo que necesitas. 📝 ",
        NEG: "Te ayudaré a encontrar lo que buscas. 🔍 "
      },
      help: {
        base: "¡Por supuesto! ",
        POS: "¡Me encanta explicar cómo puedo ayudarte! 💡 ",
        NEU: "Te explico cómo puedo ayudarte. ℹ️ ",
        NEG: "Te mostraré todas las formas en que puedo ayudarte. 💫 "
      },
      weather: {
        base: "¡Claro! ",
        POS: "¡Con gusto te informo sobre el clima! ☀️ ",
        NEU: "Te cuento cómo está el clima. 🌤️ ",
        NEG: "Déjame revisar el pronóstico para ti. 🌈 "
      },
      error: {
        base: "¡Ups! Lo siento, hubo un pequeño problema. ",
        POS: "Pero no te preocupes, ¡intentémoslo de otra manera! 💫 ",
        NEU: "¿Podrías intentar expresarlo de otra forma? 🤔 ",
        NEG: "Entiendo tu frustración, intentemos de nuevo de otra manera. 💝 "
      }
    };

    let response = responses[intent]?.base || "¡Entiendo! ";{}
    response += (responses[intent] && (responses[intent][sentiment as 'POS' | 'NEU' | 'NEG'] || responses[intent].NEU)) || "";

    if (entities.datetime) {
      response += `Te recordaré "${entities.task}" el ${moment(entities.datetime).format('LLLL')}. ⏰ `;
    }

    if (entities.frequency) {
      response += `Este recordatorio se repetirá ${entities.frequency} 🔄`;
      if (entities.endDate) {
        response += ` hasta el ${moment(entities.endDate).format('LL')}`;
      }
      response += ". ";
    }

    if (this.personalityTraits.proactive) {
      response += this.generateProactiveSuggestion(intent, entities);
    }

    return response.trim();
  }

  private generateProactiveSuggestion(intent: string, entities: any): string {
    type SuggestionType = {
      reminder: string;
      recurring_reminder: string;
      calendar: string;
      query: string;
      help: string;
      weather: string;
    };

    const suggestions: SuggestionType = {
      reminder: "¿Te gustaría que te envíe una notificación previa como recordatorio? ⏰",
      recurring_reminder: "¡Genial! ¿Necesitas organizar más eventos recurrentes? 📅",
      calendar: "¿Te gustaría que sincronice esto con tus otros calendarios? 🔄",
      query: "¿Hay algo más específico que quieras saber? 🤔",
      help: "¿Hay algún tema en particular sobre el que quieras saber más? 💡",
      weather: "¿Te gustaría recibir actualizaciones diarias del clima? ☀️"
    };

    return `\n\n${(intent in suggestions ? suggestions[intent as keyof SuggestionType] : "¿Hay algo más en lo que pueda ayudarte? 😊")}`;
  }
}

export const aiService = new AIService();