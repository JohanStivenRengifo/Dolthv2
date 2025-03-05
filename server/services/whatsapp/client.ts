import { Client } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { log } from "../../vite";

class WhatsAppClient {
  private static instance: WhatsAppClient;
  private client: Client;
  private isReady: boolean = false;

  private constructor() {
    this.client = new Client({
      authStrategy: "local",
      puppeteer: {
        args: ["--no-sandbox"],
      },
    });

    this.setupEventHandlers();
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

    this.client.on("authenticated", () => {
      log("WhatsApp client authenticated successfully!");
    });

    this.client.on("auth_failure", (msg) => {
      log(`WhatsApp authentication failed: ${msg}`);
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