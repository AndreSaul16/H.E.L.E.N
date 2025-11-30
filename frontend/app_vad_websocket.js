/**
 * ============================================================
 * 🎮 EJEMPLO COMPLETO: Integración de VAD + WebSocket
 * ============================================================
 * 
 * Este archivo muestra cómo usar el sistema completo:
 * - VAD para detección automática de voz
 * - WebSocket para comunicación en tiempo real
 * - Streaming de audio para baja latencia
 */

import AudioCaptureVAD from './audioCapture.js';
import { io } from 'socket.io-client';

// ============================================================
// Estado de la Aplicación
// ============================================================
const appState = {
    current: 'IDLE', // IDLE | RECORDING | PROCESSING | SPEAKING
    vadCapture: null,
    socket: null,
    audioContext: null,
    audioQueue: [],
    isPlayingAudio: false
};

// ============================================================
// PASO 1: Inicializar la Aplicación
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Aplicación iniciando...');

    // Conectar WebSocket
    initializeWebSocket();

    // Configurar botón de inicio
    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.addEventListener('click', startVAD);
    }
});

// ============================================================
// PASO 2: Conectar WebSocket
// ============================================================

function initializeWebSocket() {
    console.log('🔌 Conectando a WebSocket...');

    appState.socket = io({
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });

    appState.socket.on('connect', () => {
        console.log('✅ WebSocket conectado:', appState.socket.id);
        updateStatus('Conectado. Haz click para empezar a hablar');
        document.getElementById('connectionIndicator').className = 'w-4 h-4 rounded-full bg-green-500';
    });

    appState.socket.on('transcript', (data) => {
        console.log('📝 Transcripción recibida:', data.text);
        displayTranscript(data.text);
    });

    appState.socket.on('response', (data) => {
        console.log('🤖 Respuesta recibida:', data.text);
        displayResponse(data.text);
    });

    appState.socket.on('audio-chunk', (data) => {
        console.log(`📦 Audio chunk #${data.chunkNumber} recibido`);

        const audioBlob = base64ToBlob(data.chunk, data.mimeType);
        appState.audioQueue.push(audioBlob);

        if (!appState.isPlayingAudio) {
            playNextAudioChunk();
        }
    });

    appState.socket.on('audio-end', (data) => {
        console.log(`✅ Audio completado:`);
        console.log(`   - Chunks totales: ${data.totalChunks}`);
        console.log(`   - Tiempo hasta primer chunk: ${data.timeToFirstChunk}ms`);
        console.log(`   - Tiempo total: ${data.processingTime}ms`);

        // Actualizar métricas en UI
        document.getElementById('metric-ttfc').textContent = data.timeToFirstChunk;
        document.getElementById('metric-latency').textContent = data.processingTime;
        document.getElementById('metric-chunks').textContent = data.totalChunks;

        updateStatus('Audio completo. Puedes hablar de nuevo');
    });

    appState.socket.on('status', (data) => {
        console.log(`📊 Estado: ${data.message}`);
        updateStatus(data.message);

        if (data.stage === 'done') {
            appState.current = 'IDLE';
            document.getElementById('metric-status').textContent = 'IDLE';
        } else if (data.stage === 'whisper' || data.stage === 'chatgpt' || data.stage === 'tts') {
            appState.current = 'PROCESSING';
            document.getElementById('metric-status').textContent = 'PROCESSING';
        }
    });

    appState.socket.on('error', (data) => {
        console.error('❌ Error del servidor:', data);
        displayError(data.message);
        appState.current = 'IDLE';
    });

    appState.socket.on('disconnect', () => {
        console.log('🔌 WebSocket desconectado');
        updateStatus('Desconectado. Intentando reconectar...');
        document.getElementById('connectionIndicator').className = 'w-4 h-4 rounded-full bg-red-500 animate-pulse';
    });

    appState.socket.on('reconnect', (attemptNumber) => {
        console.log(`✅ Reconectado después de ${attemptNumber} intentos`);
        updateStatus('Reconectado');
        document.getElementById('connectionIndicator').className = 'w-4 h-4 rounded-full bg-green-500';
    });
}

// ============================================================
// PASO 3: Iniciar VAD
// ============================================================

async function startVAD() {
    if (appState.vadCapture) {
        console.log('⚠️ VAD ya está activo');
        return;
    }

    try {
        console.log('🎙️ Iniciando VAD...');
        updateStatus('Iniciando...');

        appState.vadCapture = new AudioCaptureVAD({
            sampleRate: 16000,
            silenceThreshold: 1000,
            positiveSpeechThreshold: 0.5,

            onSpeechStart: () => {
                console.log('🟢 Voz detectada - Grabando...');
                appState.current = 'RECORDING';
                document.getElementById('metric-status').textContent = 'RECORDING';
                updateStatus('Escuchando... 🎙️');
                animateSphere('listening');
            },

            onSpeechEnd: (audioChunk) => {
                console.log('🔴 Fin de segmento de voz');
            },

            onVoiceDetected: (probability) => {
                // Feedback visual continuo
            },

            onSilenceDetected: (probability) => {
                // Silencio detectado
            },

            onAudioCommit: (audioBlob) => {
                console.log('🔥 COMMIT! Enviando audio al servidor...');
                appState.current = 'PROCESSING';
                document.getElementById('metric-status').textContent = 'PROCESSING';
                updateStatus('Procesando... 🤔');
                sendAudioToServer(audioBlob);
            },

            onError: (error) => {
                console.error('❌ Error en VAD:', error);
                displayError('Error al acceder al micrófono');
                appState.current = 'IDLE';
            }
        });

        await appState.vadCapture.start();

        console.log('✅ VAD iniciado correctamente');
        updateStatus('Escuchando continuamente... Habla cuando quieras 🎤');
        appState.current = 'RECORDING';

        const startButton = document.getElementById('startButton');
        if (startButton) {
            startButton.textContent = 'Detener';
            startButton.onclick = stopVAD;
            startButton.className = 'px-8 py-4 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 rounded-full text-xl font-bold shadow-lg transform hover:scale-105 transition-all duration-200';
        }

    } catch (error) {
        console.error('❌ Error al iniciar VAD:', error);
        displayError('No se pudo acceder al micrófono. Verifica los permisos.');
    }
}

// ============================================================
// PASO 4: Enviar Audio al Servidor
// ============================================================

async function sendAudioToServer(audioBlob) {
    if (!appState.socket || !appState.socket.connected) {
        console.error('❌ WebSocket no está conectado');
        displayError('Conexión perdida. Reconectando...');
        return;
    }

    try {
        console.log(`📤 Enviando audio (${audioBlob.size} bytes)...`);
        const arrayBuffer = await audioBlob.arrayBuffer();
        appState.socket.emit('audio-data', arrayBuffer);
        console.log('✅ Audio enviado. Esperando transcripción...');

    } catch (error) {
        console.error('❌ Error al enviar audio:', error);
        displayError('Error al enviar audio');
        appState.current = 'IDLE';
    }
}

// ============================================================
// PASO 5: Reproducir Audio en Streaming
// ============================================================

async function playNextAudioChunk() {
    if (appState.audioQueue.length === 0) {
        console.log('✅ Cola de audio vacía - Reproducción terminada');
        appState.isPlayingAudio = false;
        appState.current = 'IDLE';
        document.getElementById('metric-status').textContent = 'IDLE';
        updateStatus('Listo. Puedes hablar de nuevo 🎤');
        animateSphere('idle');
        return;
    }

    appState.isPlayingAudio = true;
    appState.current = 'SPEAKING';
    document.getElementById('metric-status').textContent = 'SPEAKING';

    const audioBlob = appState.audioQueue.shift();

    console.log(`▶️ Reproduciendo chunk (${audioBlob.size} bytes), quedan ${appState.audioQueue.length} en cola`);
    updateStatus('Reproduciendo respuesta... 🔊');

    try {
        if (!appState.audioContext) {
            appState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await appState.audioContext.decodeAudioData(arrayBuffer);

        const source = appState.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(appState.audioContext.destination);

        source.onended = () => {
            console.log('✅ Chunk reproducido');
            playNextAudioChunk();
        };

        source.start(0);
        animateSphere('speaking');

    } catch (error) {
        console.error('❌ Error al reproducir audio:', error);
        playNextAudioChunk();
    }
}

// ============================================================
// PASO 6: Detener VAD
// ============================================================

function stopVAD() {
    if (!appState.vadCapture) return;

    console.log('🛑 Deteniendo VAD...');
    appState.vadCapture.stop();
    appState.vadCapture = null;
    appState.current = 'IDLE';
    document.getElementById('metric-status').textContent = 'IDLE';

    updateStatus('Detenido. Haz click para reiniciar');
    animateSphere('idle');

    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.textContent = 'Iniciar VAD 🎤';
        startButton.onclick = startVAD;
        startButton.className = 'px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full text-xl font-bold shadow-lg transform hover:scale-105 transition-all duration-200';
    }
}

// ============================================================
// UTILIDADES
// ============================================================

function base64ToBlob(base64, mimeType = 'audio/mpeg') {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);

        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: mimeType });
}

function updateStatus(message) {
    const statusElement = document.getElementById('statusText');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

function displayTranscript(text) {
    console.log('📝 Mostrando transcripción:', text);
    const transcriptElement = document.getElementById('transcriptText');
    if (transcriptElement) {
        transcriptElement.textContent = `Tú: ${text}`;
    }
}

function displayResponse(text) {
    console.log('🤖 Mostrando respuesta:', text);
    const responseElement = document.getElementById('responseText');
    if (responseElement) {
        responseElement.textContent = `AI: ${text}`;
    }
}

function displayError(message) {
    console.error('❌', message);
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
        const errorText = errorElement.querySelector('p');
        if (errorText) {
            errorText.textContent = message;
        }
        errorElement.style.opacity = '1';
        errorElement.style.pointerEvents = 'auto';

        setTimeout(() => {
            errorElement.style.opacity = '0';
            errorElement.style.pointerEvents = 'none';
        }, 5000);
    }
}

function animateSphere(state) {
    const sphere = document.getElementById('sphere');
    if (!sphere) return;

    sphere.classList.remove('listening-pulse', 'speaking-animation');

    switch (state) {
        case 'listening':
            sphere.classList.add('listening-pulse');
            break;
        case 'speaking':
            sphere.classList.add('speaking-animation');
            break;
        default:
            // idle - sin animación
            break;
    }
}
