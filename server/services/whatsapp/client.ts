import { Client, ClientSession } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { log } from "../../vite";
import fetch from "node-fetch";
import type { Response } from 'node-fetch';
import path from 'path';
import fs from 'fs';
import { AIService } from '../ai';
import { LocalCalendarProvider } from '../calendar';
import { storage } from '../../storage';
import { type NewReminder } from '@shared/schema';
import { AIResponse } from '../ai';

class WhatsAppClient {
    private static instance: WhatsAppClient;
    private client: Client;
    private isReady: boolean = false;
    private readonly SESSION_FILE_PATH = path.join(
        path.dirname(new URL(import.meta.url).pathname),
        './session.json'
    ).replace(/^\/?/, '');

    private constructor() {
        this.client = new Client({
            puppeteer: {
                args: ["--no-sandbox"],
                executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
            },
            session: this.loadSession()
        });

        this.setupEventHandlers();
    }

    private loadSession(): ClientSession | undefined {
        try {
            if (fs.existsSync(this.SESSION_FILE_PATH)) {
                const sessionData = fs.readFileSync(this.SESSION_FILE_PATH, 'utf8');
                const parsedSession = JSON.parse(sessionData);
                
                // Validate that the session has all required properties
                if (typeof parsedSession === 'object' && parsedSession !== null &&
                    'WABrowserId' in parsedSession &&
                    'WASecretBundle' in parsedSession &&
                    'WAToken1' in parsedSession &&
                    'WAToken2' in parsedSession) {
                    return parsedSession as ClientSession;
                }
                
                log('Invalid session format');
                return undefined;
            }
            return undefined;
        } catch (error) {
            log(`Error loading session: ${error}`);
            return undefined;
        }
    }

    private saveSession(session: ClientSession) {
        try {
            fs.writeFileSync(this.SESSION_FILE_PATH, JSON.stringify(session));
            log('Session saved successfully!');
        } catch (error) {
            log(`Error saving session: ${error}`);
        }
    }

    public static getInstance(): WhatsAppClient {
        if (!WhatsAppClient.instance) {
            WhatsAppClient.instance = new WhatsAppClient();
        }
        return WhatsAppClient.instance;
    }

    private setupEventHandlers() {
        this.client.on("qr", (qr) => {
            log("Please scan the QR code below to authenticate WhatsApp Web:");
            qrcode.generate(qr, { small: true });
        });

        this.client.on("ready", () => {
            this.isReady = true;
            log("WhatsApp client is ready!");
        });

        this.client.on("authenticated", (session) => {
            log("WhatsApp client authenticated successfully!");
            if (session) {
                this.saveSession(session);
            }
        });

        this.client.on("auth_failure", (msg) => {
            log(`WhatsApp authentication failed: ${msg}`);
            if (fs.existsSync(this.SESSION_FILE_PATH)) {
                fs.unlinkSync(this.SESSION_FILE_PATH);
                log('Removed invalid session file');
            }
        });

        this.client.on("message", async (message) => {
            try {
                log(`Received message: ${message.body}`);
                
                let attachmentUrl;
                let attachmentType;

                // Procesar archivos adjuntos
                if (message.hasMedia) {
                    const media = await message.downloadMedia();
                    if (media) {
                        // Guardar el archivo en el sistema
                        const fileName = `${Date.now()}-${media.filename || 'attachment'}`;
                        const filePath = path.join('uploads', fileName);
                        
                        await fs.promises.writeFile(filePath, media.data, 'base64');
                        attachmentUrl = filePath;
                        attachmentType = media.mimetype;
                    }
                }

                // Procesar mensaje con IA
                const aiService = new AIService();
                const aiAnalysis = await aiService.analyzeMessage(
                    message.body,
                    message.from,
                    attachmentUrl
                );

                // Guardar el mensaje y su análisis
                await storage.createMessage({
                    content: message.body,
                    phone: message.from,
                    sentiment: aiAnalysis.sentiment,
                    processed: true,
                    attachmentUrl,
                    attachmentType,
                    metadata: {
                        intent: aiAnalysis.intent,
                        confidence: aiAnalysis.confidence,
                        entities: aiAnalysis.entities,
                        imageAnalysis: aiAnalysis.imageAnalysis,
                        suggestedActions: aiAnalysis.suggestedActions
                    }
                });

                // Procesar acciones sugeridas
                for (const action of aiAnalysis.suggestedActions) {
                    switch (action) {
                        case 'create_reminder':
                            await this.handleReminderCreation(aiAnalysis, message);
                            break;
                        case 'create_calendar_event':
                            await this.handleCalendarEvent(aiAnalysis, message);
                            break;
                        case 'update_preferences':
                            await this.handlePreferencesUpdate(aiAnalysis, message);
                            break;
                        // Agregar más acciones según sea necesario
                    }
                }

                // Enviar respuesta
                await message.reply(aiAnalysis.contextualResponse);

            } catch (error) {
                log(`Error processing message: ${error}`);
                await message.reply('Lo siento, encontré un error al procesar tu mensaje. Por favor, intenta expresarlo de otra manera.');
            }
        });
    }

    private async handleReminderCreation(analysis: AIResponse, message: any) {
        try {
            if (!analysis.entities.task || !analysis.entities.datetime) {
                return;
            }

            const reminder: NewReminder = {
                title: analysis.entities.task,
                start: analysis.entities.datetime,
                end: analysis.entities.datetime,
                description: message.body,
                frequency: analysis.entities.frequency,
                endDate: analysis.entities.endDate,
                userId: message.from,
                priority: analysis.entities.priority,
                category: analysis.entities.category,
                metadata: {
                    sentiment: analysis.sentiment,
                    confidence: analysis.confidence,
                    imageAnalysis: analysis.imageAnalysis
                }
            };

            await storage.createReminder(reminder);
        } catch (error) {
            log(`Error creating reminder: ${error}`);
        }
    }

    private async handleCalendarEvent(analysis: AIResponse, message: any) {
        try {
            if (!analysis.entities.task || !analysis.entities.datetime) {
                return;
            }

            const calendarProvider = new LocalCalendarProvider();
            await calendarProvider.createEvent({
                calendarId: 1, // ID por defecto
                title: analysis.entities.task,
                startTime: analysis.entities.datetime,
                endTime: analysis.entities.datetime,
                description: message.body,
                location: analysis.entities.location || null,
                shared: Boolean(analysis.entities.people?.length),
                sharedWith: analysis.entities.people || []
            });
        } catch (error) {
            log(`Error creating calendar event: ${error}`);
        }
    }

    private async handlePreferencesUpdate(analysis: AIResponse, message: any) {
        try {
            if (!analysis.entities.preferences) {
                return;
            }

            await storage.updateUserPreferences(message.from, analysis.entities.preferences);
        } catch (error) {
            log(`Error updating preferences: ${error}`);
        }
    }

    public async initialize() {
        if (!this.client) {
            throw new Error("WhatsApp client not initialized");
        }

        try {
            await this.client.initialize();
        } catch (error) {
            log(`Error initializing WhatsApp client: ${error}`);
            throw error;
        }
    }

    public getClient(): Client {
        return this.client;
    }

    public isClientReady(): boolean {
        return this.isReady;
    }
}

export const whatsappClient = WhatsAppClient.getInstance();