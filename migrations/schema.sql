
-- Creación de tablas

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  phone TEXT NOT NULL,
  sentiment TEXT,
  processed BOOLEAN DEFAULT false,
  attachment_url TEXT,
  attachment_type TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de recordatorios
CREATE TABLE IF NOT EXISTS reminders (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  datetime TIMESTAMP NOT NULL,
  phone TEXT NOT NULL,
  recurring BOOLEAN DEFAULT false,
  frequency TEXT,
  end_date TIMESTAMP,
  attachment_url TEXT,
  completed BOOLEAN DEFAULT false,
  shared BOOLEAN DEFAULT false,
  shared_with TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de calendarios
CREATE TABLE IF NOT EXISTS calendars (
  id SERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de eventos de calendario
CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  calendar_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  location TEXT,
  shared BOOLEAN DEFAULT false,
  shared_with TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de preferencias de usuario
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  weather_location TEXT,
  weather_alerts BOOLEAN DEFAULT true,
  morning_greeting BOOLEAN DEFAULT true,
  greeting_time TEXT DEFAULT '08:00',
  language TEXT DEFAULT 'es',
  notification_preferences JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de análisis
CREATE TABLE IF NOT EXISTS analytics (
  id SERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  message_count INTEGER DEFAULT 0,
  reminder_count INTEGER DEFAULT 0,
  completed_reminders INTEGER DEFAULT 0,
  missed_reminders INTEGER DEFAULT 0,
  average_response_time INTEGER,
  common_times TEXT[],
  common_days TEXT[],
  weather_checks INTEGER DEFAULT 0,
  shared_events INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para mejoras de rendimiento
CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages (phone);
CREATE INDEX IF NOT EXISTS idx_reminders_phone ON reminders (phone);
CREATE INDEX IF NOT EXISTS idx_reminders_datetime ON reminders (datetime);
CREATE INDEX IF NOT EXISTS idx_calendars_phone ON calendars (phone);
CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar_id ON calendar_events (calendar_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_phone ON user_preferences (phone);
CREATE INDEX IF NOT EXISTS idx_analytics_phone ON analytics (phone);
