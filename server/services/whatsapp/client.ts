import { Client, ClientSession } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { log } from "../../vite";
import fetch from "node-fetch";
import type { Response } from 'node-fetch';
import path from 'path';
import fs from 'fs';
import { AIService } from '../ai';
import { LocalCalendarProvider } from '../calendar';

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

                if (aiAnalysis.intent === "reminder" || aiAnalysis.intent === "recurring_reminder") {
                    const calendarService = new LocalCalendarProvider();
                    const event = await calendarService.createEvent({
                        title: aiAnalysis.entities.task || "Reminder",
                        start: aiAnalysis.entities.datetime || new Date(),
                        end: aiAnalysis.entities.datetime || new Date(),
                        description: message.body,
                        frequency: aiAnalysis.entities.frequency,
                        endDate: aiAnalysis.entities.endDate,
                        userId: message.from
                    });

                    await message.reply(`¡Entendido! He creado un recordatorio para ${aiAnalysis.entities.task} ${event.frequency ? 'que se repetirá ' + event.frequency : ''} para el ${new Date(event.start).toLocaleString()}`);
                } else {
                    await message.reply(aiAnalysis.contextualResponse);
                }
            } catch (error) {
                log(`Error processing message: ${error}`);
                await message.reply('Lo siento, encontré un error al procesar tu mensaje.');
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