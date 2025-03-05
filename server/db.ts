import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '@shared/schema';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Verificar que DATABASE_URL esté definida
const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

// Configurar WebSocket para Neon
neonConfig.webSocketConstructor = ws;

// Crear el pool de conexión
const pool = new Pool({ connectionString: DATABASE_URL });

// Inicializar Drizzle con el esquema
const db = drizzle(pool, { schema });

export { pool, db };