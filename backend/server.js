import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import conversationRoutes, { initializeServices, getServices } from './routes/conversationRoutes.js';
import setupWebSocket from './routes/socketHandler.js';

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// CONCEPTO PEDAGÓGICO: HTTP Server + WebSockets
// ============================================================
/**
 * ANTES (solo HTTP):
 * const app = express();
 * app.listen(PORT);
 * 
 * AHORA (HTTP + WebSockets):
 * const app = express();
 * const httpServer = createServer(app);  ← Servidor HTTP explícito
 * const io = setupWebSocket(httpServer); ← WebSocket sobre HTTP
 * httpServer.listen(PORT);
 * 
 * ANALOGÍA: Casa con dos puertas
 * - Puerta principal (HTTP): Para visitas normales (requests)
 * - Puerta trasera (WebSocket): Para amigos que vienen a quedarse (conexión persistente)
 */
const httpServer = createServer(app);

// Middlewares - CORS configuration for development and production
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    `http://localhost:${PORT}`,
    `http://127.0.0.1:${PORT}`
];

// Add production frontend URL if available
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST']
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend (Build de producción)
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Inicializar servicios
let services;
try {
    initializeServices();
    services = getServices(); // Obtener servicios para WebSocket
} catch (error) {
    console.error('❌ Error al inicializar servicios:', error.message);
    process.exit(1);
}

// ============================================================
// SETUP DE WEBSOCKET
// ============================================================
/**
 * Configurar Socket.IO con los servicios (Whisper, ChatGPT, ElevenLabs)
 * Esto permite comunicación bidireccional en tiempo real
 */
const io = setupWebSocket(httpServer, services);

// Rutas de API (mantener compatibilidad con HTTP)
app.use('/api', conversationRoutes);

// Health check endpoint for monitoring services
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Ruta principal (SPA fallback)
app.get('*', (req, res) => {
    // Ignorar peticiones a /api que no coincidieron
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Endpoint API no encontrado' });
    }
    res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

// Ruta 404
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador de errores global
app.use((err, req, res, next) => {
    console.error('❌ Error no manejado:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Iniciar servidor (ahora con HTTP + WebSocket)
httpServer.listen(PORT, () => {
    console.log('\n🚀 ============================================');
    console.log(`🎙️  VoiceAI Game Server - Full-Duplex Edition`);
    console.log(`📡 Servidor HTTP en http://localhost:${PORT}`);
    console.log(`🔌 WebSocket Server activo`);
    console.log(`🌍 CORS habilitado`);
    console.log(`🤖 Usando OpenAI Assistants API`);
    console.log(`🎤 Whisper STT en español`);
    console.log(`🔊 ElevenLabs TTS con streaming`);
    console.log(`🎯 VAD (Voice Activity Detection) disponible`);
    console.log('🚀 ============================================\n');
});

// Manejo de cierre graceful
process.on('SIGINT', () => {
    console.log('\n👋 Cerrando servidor...');
    io.close(() => {
        console.log('✅ WebSocket cerrado');
        process.exit(0);
    });
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
});

