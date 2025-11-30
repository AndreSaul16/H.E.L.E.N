import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import ElevenLabsService from '../services/ElevenLabsService.js';

// Configurar dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

async function testElevenLabs() {
    const logFile = path.join(__dirname, '..', '..', 'elevenlabs_test.log');
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    // Limpiar log anterior
    if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
    }

    log('🧪 Iniciando prueba de ElevenLabs...');

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        log('❌ ELEVENLABS_API_KEY no encontrada en .env');
        process.exit(1);
    }

    log(`🔑 API Key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}`);
    log(`📏 Longitud de API Key: ${apiKey.length} caracteres`);
    log(`🗣️ Voice ID: ${process.env.ELEVENLABS_VOICE_ID}`);

    const service = new ElevenLabsService(apiKey);

    try {
        // 1. Verificar créditos (GET /user)
        log('\n1️⃣ Verificando créditos...');
        const credits = await service.checkCredits();
        log('✅ Créditos: ' + JSON.stringify(credits, null, 2));

        // 2. Probar síntesis (POST /text-to-speech)
        log('\n2️⃣ Probando síntesis...');
        const text = 'Hola, esto es una prueba de síntesis.';
        const audioBuffer = await service.textToSpeech(text);
        log(`✅ Audio generado: ${audioBuffer.length} bytes`);
        log('\n✅✅✅ TODAS LAS PRUEBAS PASARON ✅✅✅');

    } catch (error) {
        log('\n❌ Prueba fallida: ' + error.message);
        if (error.response) {
            log('Status: ' + error.response.status);
            log('Status Text: ' + error.response.statusText);
            log('Detalles: ' + JSON.stringify(error.response.data, null, 2));
            log('Headers: ' + JSON.stringify(error.response.headers, null, 2));
        }
        if (error.request) {
            log('Request URL: ' + error.config?.url);
            log('Request Headers: ' + JSON.stringify(error.config?.headers, null, 2));
        }
        log('\n🔍 Stack completo:\n' + error.stack);
        log('\n📄 Ver más detalles en: ' + logFile);
        process.exit(1);
    }
}

testElevenLabs();
