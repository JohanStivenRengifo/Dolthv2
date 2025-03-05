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
                // Process message through AI service
                const aiService = new AIService();
                const aiAnalysis = await aiService.analyzeMessage(message.body);

                // Guardar el mensaje y su análisis
                await storage.createMessage({
                    content: message.body,
                    phone: message.from,
                    sentiment: aiAnalysis.sentiment,
                    processed: true,
                    metadata: {
                        intent: aiAnalysis.intent,
                        confidence: aiAnalysis.confidence,
                        entities: aiAnalysis.entities
                    }
                });

                if (aiAnalysis.intent === "reminder" || aiAnalysis.intent === "recurring_reminder") {
                    // Crear el recordatorio
                    const reminder: NewReminder = {
                        title: aiAnalysis.entities.task || "Reminder",
                        start: aiAnalysis.entities.datetime || new Date(),
                        end: aiAnalysis.entities.datetime || new Date(),
                        description: message.body,
                        frequency: aiAnalysis.entities.frequency,
                        endDate: aiAnalysis.entities.endDate || null,
                        userId: message.from,
                        priority: aiAnalysis.entities.priority,
                        category: aiAnalysis.entities.category,
                        metadata: {
                            sentiment: aiAnalysis.sentiment,
                            confidence: aiAnalysis.confidence
                        }
                    };

                    const savedReminder = await storage.createReminder(reminder);

                    // Crear el evento en el calendario
                    const calendarService = new LocalCalendarProvider();
                    const event = await calendarService.createEvent({
                        calendarId: 1, // ID del calendario por defecto
                        title: reminder.title,
                        startTime: reminder.start,
                        endTime: reminder.end,
                        description: reminder.description,
                        location: null,
                        shared: false,
                        sharedWith: []
                    });

                    let response = `¡Entendido! He creado un recordatorio para "${reminder.title}" `;
                    
                    if (reminder.frequency) {
                        response += `que se repetirá ${reminder.frequency} `;
                    }
                    
                    if (reminder.priority) {
                        response += `con prioridad ${reminder.priority} `;
                    }
                    
                    if (reminder.category) {
                        response += `en la categoría ${reminder.category} `;
                    }
                    
                    response += `para el ${reminder.start.toLocaleString()}`;
                    
                    if (reminder.endDate) {
                        response += ` hasta el ${reminder.endDate.toLocaleDateString()}`;
                    }

                    await message.reply(response);
                } else {
                    await message.reply(aiAnalysis.contextualResponse);
                }
            } catch (error) {
                log(`Error processing message: ${error}`);
                await message.reply('Lo siento, encontré un error al procesar tu mensaje. Por favor, intenta expresarlo de otra manera.');
            }
        });
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