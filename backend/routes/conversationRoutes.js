import express from 'express';
import multer from 'multer';
import WhisperService from '../services/WhisperService.js';
import ChatGPTService from '../services/ChatGPTService.js';
import ElevenLabsService from '../services/ElevenLabsService.js';

const router = express.Router();

// Configurar multer para recibir archivos de audio
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB máximo
});

// Inicializar servicios
let whisperService;
let chatGPTService;
let elevenLabsService;

/**
 * Inicializa los servicios (cada servicio maneja su propia configuración)
 */
export function initializeServices() {
    const openaiKey = process.env.OPENAI_API_KEY;
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

    if (!openaiKey) {
        throw new Error('OPENAI_API_KEY no está configurada');
    }
    if (!elevenLabsKey) {
        throw new Error('ELEVENLABS_API_KEY no está configurada');
    }

    // Cada servicio se auto-configura
    whisperService = new WhisperService(openaiKey);
    chatGPTService = new ChatGPTService(openaiKey);
    elevenLabsService = new ElevenLabsService(elevenLabsKey);

    console.log('✅ Servicios inicializados correctamente');
}

/**
 * Obtener instancias de servicios para WebSocket
 */
export function getServices() {
    return {
        whisper: whisperService,
        chatgpt: chatGPTService,
        elevenlabs: elevenLabsService
    };
}


/**
 * POST /api/conversar
 * Endpoint principal para el flujo completo de conversación
 * Recibe: audio
 * Retorna: { transcript, response, audio }
 */
router.post('/conversar', upload.single('audio'), async (req, res) => {
    const startTime = Date.now();

    try {
        console.log('\n🎤 [API] Nueva solicitud de conversación');

        // 1. Validar que se recibió un archivo de audio
        if (!req.file) {
            return res.status(400).json({
                error: 'No se recibió ningún archivo de audio'
            });
        }

        const audioBuffer = req.file.buffer;
        const audioMimetype = req.file.mimetype;

        console.log(`📊 [API] Audio recibido: ${audioBuffer.length} bytes, tipo: ${audioMimetype}`);

        // Validar formato de audio
        if (!whisperService.isValidAudioFormat(audioMimetype)) {
            return res.status(400).json({
                error: 'Formato de audio no válido'
            });
        }

        // 2. Transcribir audio a texto usando Whisper
        console.log('🔄 [API] Paso 1: Transcribiendo audio...');
        const transcript = await whisperService.transcribeAudio(audioBuffer, req.file.originalname);

        if (!transcript || transcript.trim().length === 0) {
            return res.status(400).json({
                error: 'No se pudo transcribir el audio. Intenta hablar más claro.'
            });
        }

        console.log(`✅ [API] Transcripción: "${transcript}"`);

        // 3. Generar respuesta con ChatGPT (usando Carmen - Assistants API)
        console.log('🔄 [API] Paso 2: Generando respuesta con Carmen...');
        const aiResponse = await chatGPTService.sendMessage(transcript);

        console.log(`✅ [API] Respuesta: "${aiResponse}"`);

        // ⭐ Ya no generamos audio en el backend - el cliente usa TTS local (PiperTTS)
        // Esto elimina la latencia de ElevenLabs (~2-5s) y reduce costo

        // 4. Preparar respuesta (solo texto, sin audio)
        const response = {
            success: true,
            transcript: transcript,
            response: aiResponse,
            // audio: null, // Ya no se envía
            ttsProvider: 'piper-local', // Indica que el cliente debe usar TTS local
            processingTime: Date.now() - startTime
        };

        console.log(`✅ [API] Conversación completada en ${response.processingTime}ms\n`);
        res.json(response);

    } catch (error) {
        console.error('❌ [API] Error en conversación:', error);
        res.status(500).json({
            error: 'Error al procesar la conversación',
            details: error.message
        });
    }
});

/**
 * GET /api/status
 * Verifica el estado de los servicios
 */
router.get('/status', async (req, res) => {
    try {
        const status = {
            whisper: 'OK',
            chatgpt: 'OK',
            elevenlabs: 'Unknown'
        };

        // Intentar verificar créditos de ElevenLabs
        try {
            const credits = await elevenLabsService.checkCredits();
            status.elevenlabs = credits.hasCredits ? 'OK' : 'No credits';
            status.elevenLabsCredits = credits;
        } catch (error) {
            status.elevenlabs = 'Error';
            status.elevenLabsError = error.message;
        }

        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/reset
 * Reinicia el historial de conversación
 */
router.post('/reset', async (req, res) => {
    try {
        await chatGPTService.resetConversation();
        res.json({ success: true, message: 'Conversación reiniciada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/tts-fallback
 * Genera audio con ElevenLabs cuando TTS local falla
 */
router.post('/tts-fallback', async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Se requiere el parámetro "text"' });
        }

        console.log('[API] 🔄 Fallback a ElevenLabs para:', text.substring(0, 50) + '...');

        // Generar audio con ElevenLabs
        const audioBuffer = await elevenLabsService.textToSpeech(text);
        const audioBase64 = audioBuffer.toString('base64');

        res.json({
            success: true,
            audio: audioBase64,
            provider: 'elevenlabs'
        });

    } catch (error) {
        console.error('[API] ❌ Error en fallback TTS:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/tts-stream
 * Endpoint para streaming de audio desde ElevenLabs
 */
router.post('/tts-stream', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Texto requerido' });

        const audioStream = await elevenLabsService.streamTextToSpeech(text);

        // Configurar headers para streaming
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Pipe del stream de ElevenLabs a la respuesta
        audioStream.pipe(res);

    } catch (error) {
        console.error('[API] Error en TTS Stream:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
});

export default router;
