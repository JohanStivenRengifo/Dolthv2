import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '@shared/schema';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Intentar cargar .env desde diferentes ubicaciones
const envPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log('Cargando .env desde:', envPath);
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.error('No se encontró el archivo .env en ninguna de estas ubicaciones:', envPaths);
}

// Cargar DATABASE_URL directamente si está en las variables de entorno
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dT84wtbEWNmz@ep-muddy-dust-a8m1f7e7-pooler.eastus2.azure.neon.tech/neondb?sslmode=require';

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL no está definida');
  console.error('Ubicaciones de .env probadas:', envPaths);
  console.error('Variables de entorno disponibles:', Object.keys(process.env));
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

let pool: Pool;
let db: ReturnType<typeof drizzle>;

try {
  // Configurar WebSocket para Neon
  neonConfig.webSocketConstructor = ws;

  // Crear el pool de conexión
  pool = new Pool({ connectionString: DATABASE_URL });

  // Inicializar Drizzle con el esquema
  db = drizzle(pool, { schema });

  console.log('Conexión a la base de datos establecida correctamente');
} catch (error) {
  console.error('Error al configurar la conexión a la base de datos:', error);
  throw error;
}

export { pool, db };