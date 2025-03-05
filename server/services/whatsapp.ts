import { Client } from 'whatsapp-web.js';
import { storage } from '../storage';
import { aiService } from './ai';

type WhatsAppMessage = {
  phone: string;
  content: string;
};

export class WhatsAppService {
  private ready: boolean = false;
  private initializationError: string | null = null;

  constructor() {
    console.log('WhatsApp service iniciado en modo simulación');
    this.ready = true;
  }

  async sendMessage(phone: string, content: string): Promise<void> {
    // En modo simulación, solo registramos el mensaje
    console.log(`[WhatsApp Simulado] Mensaje para ${phone}:`, content);
  }

  async receiveMessage(message: WhatsAppMessage): Promise<void> {
    try {
      // Guardar el mensaje
      const savedMessage = await storage.createMessage({
        content: message.content,
        phone: message.phone,
        sentiment: null
      });

      // Procesar con IA en segundo plano
      aiService.analyzeMessage(message.content)
        .then(async (analysis) => {
          await storage.updateMessageProcessed(savedMessage.id, true);
          console.log(`✅ Mensaje ${savedMessage.id} procesado con análisis:`, analysis);
        })
        .catch(error => {
          console.error(`❌ Error procesando mensaje ${savedMessage.id}:`, error);
        });

    } catch (error) {
      console.error('Error procesando mensaje via API:', error);
      throw error;
    }
  }

  getStatus(): { ready: boolean; error: string | null } {
    return {
      ready: this.ready,
      error: this.initializationError
    };
  }
}

export const whatsappService = new WhatsAppService();