/**
 * ============================================================
 * 🔌 WEBSOCKET HANDLER - Comunicación en Tiempo Real
 * ============================================================
 * 
 * CONCEPTO PEDAGÓGICO: ¿Qué son los WebSockets?
 * ---------------------------------------------
 * 
 * ANALOGÍA: Carta por Correo vs Llamada Telefónica
 * 
 * HTTP (método anterior):
 * - Escribes una carta (request)
 * - La envías por correo
 * - Esperas días
 * - Recibes una respuesta (response)
 * - Se cierra la comunicación
 * 
 * WebSocket (método nuevo):
 * - Haces una llamada telefónica
 * - La línea queda abierta
 * - Puedes hablar cuando quieras (cliente → servidor)
 * - La otra persona puede hablar cuando quiera (servidor → cliente)
 * - La conexión permanece abierta hasta que cuelgas
 * 
 * VENTAJAS:
 * 1. Bidireccional: Ambos pueden enviar mensajes sin esperar
 * 2. Baja latencia: No hay que "marcar" cada vez (no overhead HTTP)
 * 3. Streaming: Puedes enviar datos en pedazos (chunks)
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import WhisperService from '../services/WhisperService.js';
import ChatGPTService from '../services/ChatGPTService.js';
import ElevenLabsService from '../services/ElevenLabsService.js';

// ============================================================
// FUNCIÓN PRINCIPAL: Setup de WebSocket Server
// ============================================================

/**
 * Configura Socket.IO en el servidor Express existente
 * 
 * @param {Express} app - Aplicación Express
 * @param {http.Server} httpServer - Servidor HTTP
 * @returns {Server} - Instancia de Socket.IO
 */
export function setupWebSocket(httpServer, services) {
    console.log('🔌 [WebSocket] Configurando Socket.IO...');

    /**
     * CONCEPTO: ¿Qué es Socket.IO?
     * ----------------------------
     * Es una librería que hace WebSockets más fáciles de usar.
     * Maneja automáticamente:
     * - Reconexiones si se pierde la conexión
     * - Fallback a HTTP si WebSockets no está disponible
     * - Rooms y namespaces para organizar conexiones
     */
    const io = new Server(httpServer, {
        cors: {
            origin: '*', // En producción, especifica tu dominio
            methods: ['GET', 'POST']
        },
        /**
         * CONCEPTO: Max HTTP Buffer Size
         * ------------------------------
         * Es el tamaño máximo de un mensaje que puede enviarse
         * Aumentamos a 10MB porque el audio puede ser grande
         */
        maxHttpBufferSize: 10 * 1024 * 1024 // 10MB
    });

    /**
     * CONCEPTO: Eventos de Socket.IO
     * ------------------------------
     * Los eventos son como "canales de radio":
     * - Cliente emite en un canal: socket.emit('canal', datos)
     * - Servidor escucha ese canal: socket.on('canal', (datos) => {...})
     * 
     * ANALOGÍA: Walkie-talkie con canales
     * - Canal 1: Para enviar audio
     * - Canal 2: Para recibir transcripciones
     * - Canal 3: Para recibir respuestas
     * - Canal 4: Para recibir audio de respuesta
     */

    // ============================================================
    // EVENTO: Conexión de un cliente
    // ============================================================

    io.on('connection', (socket) => {
        console.log(`✅ [WebSocket] Cliente conectado: ${socket.id}`);

        /**
         * CONCEPTO: Socket ID
         * ------------------
         * Cada cliente que se conecta recibe un ID único
         * Es como un "número de teléfono temporal" para esa conexión
         */

        // Estado de este cliente específico
        const clientState = {
            sessionId: socket.id,
            isProcessing: false,
            audioChunks: []
        };

        // ============================================================
        // EVENTO: Recibir audio del cliente
        // ============================================================

        /**
         * FLUJO PEDAGÓGICO: Pipeline de Procesamiento
         * -------------------------------------------
         * 1. Cliente envía audio (Blob/Buffer)
         * 2. Whisper transcribe → texto
         * 3. ChatGPT genera respuesta → texto
         * 4. ElevenLabs convierte a voz → audio stream
         * 5. Servidor envía chunks de audio al cliente
         * 
         * ANALOGÍA: Cadena de montaje en fábrica
         * Audio → [Whisper] → Texto → [ChatGPT] → Respuesta → [ElevenLabs] → Audio
         */
        socket.on('audio-data', async (audioBlob) => {
            if (clientState.isProcessing) {
                console.log('⚠️ [WebSocket] Ya hay un procesamiento en curso, ignorando...');
                return;
            }

            clientState.isProcessing = true;
            const startTime = Date.now();

            try {
                console.log(`🎙️ [WebSocket] Audio recibido de ${socket.id}`);
                socket.emit('status', { message: 'Transcribiendo...', stage: 'whisper' });

                // ============================================================
                // PASO 1: Whisper - Transcripción (STT)
                // ============================================================
                /**
                 * CONCEPTO: Speech-to-Text (STT)
                 * ------------------------------
                 * Convierte ondas sonoras en palabras escritas
                 * 
                 * ANALOGÍA: Taquígrafo en un juzgado
                 * Escucha lo que dices y lo escribe
                 */
                const transcript = await services.whisper.transcribeAudio(
                    Buffer.from(audioBlob),
                    `audio-${Date.now()}.webm`
                );

                console.log(`📝 [WebSocket] Transcripción: "${transcript}"`);

                // Enviar transcripción al cliente inmediatamente
                socket.emit('transcript', { text: transcript });
                socket.emit('status', { message: 'Generando respuesta...', stage: 'chatgpt' });

                // ============================================================
                // PASO 2: ChatGPT - Generar Respuesta
                // ============================================================
                /**
                 * CONCEPTO: Conversational AI
                 * ---------------------------
                 * Entiende el contexto y genera respuestas coherentes
                 * 
                 * ANALOGÍA: Compañero de conversación inteligente
                 * Recuerda lo que dijiste antes y responde apropiadamente
                 */
                const response = await services.chatgpt.chat(transcript);

                console.log(`🤖 [WebSocket] Respuesta: "${response}"`);

                // Enviar respuesta al cliente
                socket.emit('response', { text: response });
                socket.emit('status', { message: 'Generando audio...', stage: 'tts' });

                // ============================================================
                // PASO 3: ElevenLabs - Text-to-Speech con STREAMING
                // ============================================================
                /**
                 * CONCEPTO CLAVE: ¿Qué es Streaming y por qué reduce latencia?
                 * ------------------------------------------------------------
                 * 
                 * SIN STREAMING (método anterior):
                 * - Esperas a que ElevenLabs genere TODO el audio (5 segundos)
                 * - Luego lo envías completo
                 * - Usuario espera 5 segundos sin oír nada
                 * 
                 * CON STREAMING (método nuevo):
                 * - ElevenLabs genera audio en pedazos (chunks)
                 * - Apenas genera el primer chunk (0.3 segundos) → lo envía
                 * - Cliente empieza a reproducir inmediatamente
                 * - Mientras reproduce el primer chunk, llegan los siguientes
                 * 
                 * ANALOGÍA: Netflix vs Descarga Completa
                 * 
                 * Descarga completa:
                 * |xxxxxxxxxxxxxxxxxx| → 100% descargado → Reproducir
                 *       (esperas)
                 * 
                 * Streaming:
                 * |xxx|   |   |   |  | → 15% descargado → Reproducir inmediatamente
                 *  ↑ Reproduces esto mientras descarga el resto
                 * 
                 * REDUCCIÓN DE LATENCIA:
                 * - Antes: 5 segundos de espera
                 * - Ahora: 0.3 segundos hasta primer audio ⚡
                 */

                console.log('🎵 [WebSocket] Iniciando streaming de audio...');

                const audioStream = await services.elevenlabs.streamTextToSpeech(response);

                /**
                 * CONCEPTO: Stream Events (Eventos de flujo)
                 * ------------------------------------------
                 * Un stream es como una manguera de agua:
                 * - 'data': Sale un chorro de agua (chunk de audio)
                 * - 'end': Se cerró la llave (terminó el audio)
                 * - 'error': Se rompió la manguera (error)
                 */

                let chunkCount = 0;
                let firstChunkTime = null;

                audioStream.on('data', (chunk) => {
                    /**
                     * CONCEPTO: Chunk (Pedazo)
                     * -----------------------
                     * Es un Buffer (array de bytes) con un pedacito de audio
                     * Típicamente ~1-2 segundos de audio por chunk
                     * 
                     * ANALOGÍA: Paquetes en una cinta transportadora
                     * En vez de esperar todo el pedido, te van llegando
                     * paquetes que puedes ir abriendo
                     */

                    if (chunkCount === 0) {
                        firstChunkTime = Date.now() - startTime;
                        console.log(`⚡ [WebSocket] Primer chunk en ${firstChunkTime}ms`);
                    }

                    chunkCount++;

                    // Convertir chunk a Base64 para enviarlo por WebSocket
                    /**
                     * CONCEPTO: ¿Por qué Base64?
                     * -------------------------
                     * Los bytes crudos pueden tener caracteres especiales que
                     * rompen la transmisión. Base64 convierte bytes a texto seguro.
                     * 
                     * ANALOGÍA: Empaquetar frágiles
                     * Los bytes son como vasos de cristal (frágiles)
                     * Base64 es como envolverlos en burbujas (protección)
                     */
                    const base64Chunk = chunk.toString('base64');

                    // Enviar chunk al cliente
                    socket.emit('audio-chunk', {
                        chunk: base64Chunk,
                        chunkNumber: chunkCount,
                        mimeType: 'audio/mpeg'
                    });

                    console.log(`📦 [WebSocket] Chunk ${chunkCount} enviado (${chunk.length} bytes)`);
                });

                audioStream.on('end', () => {
                    const totalTime = Date.now() - startTime;

                    console.log(`✅ [WebSocket] Streaming completado:`);
                    console.log(`   - Total de chunks: ${chunkCount}`);
                    console.log(`   - Tiempo hasta primer chunk: ${firstChunkTime}ms`);
                    console.log(`   - Tiempo total: ${totalTime}ms`);

                    // Notificar al cliente que terminó
                    socket.emit('audio-end', {
                        totalChunks: chunkCount,
                        processingTime: totalTime,
                        timeToFirstChunk: firstChunkTime
                    });

                    socket.emit('status', { message: 'Completado', stage: 'done' });
                    clientState.isProcessing = false;
                });

                audioStream.on('error', (error) => {
                    console.error(`❌ [WebSocket] Error en streaming:`, error);
                    socket.emit('error', {
                        message: 'Error al generar audio',
                        details: error.message
                    });
                    clientState.isProcessing = false;
                });

            } catch (error) {
                console.error(`❌ [WebSocket] Error en procesamiento:`, error);
                socket.emit('error', {
                    message: 'Error al procesar audio',
                    details: error.message,
                    stage: clientState.isProcessing ? 'processing' : 'unknown'
                });
                clientState.isProcessing = false;
            }
        });

        // ============================================================
        // EVENTO: Cliente solicita detener procesamiento
        // ============================================================

        socket.on('cancel-processing', () => {
            console.log(`🛑 [WebSocket] ${socket.id} canceló el procesamiento`);
            clientState.isProcessing = false;
            socket.emit('status', { message: 'Cancelado', stage: 'cancelled' });
        });

        // ============================================================
        // EVENTO: Cliente se desconecta
        // ============================================================

        socket.on('disconnect', () => {
            console.log(`👋 [WebSocket] Cliente desconectado: ${socket.id}`);
            // Limpiar recursos si es necesario
        });

        // ============================================================
        // EVENTO: Ping-Pong (Keep-Alive)
        // ============================================================
        /**
         * CONCEPTO: Keep-Alive
         * -------------------
         * Mensajes periódicos para mantener la conexión viva
         * 
         * ANALOGÍA: "¿Sigues ahí?"
         * Como en una llamada larga donde preguntas cada tanto
         * si la otra persona sigue escuchando
         */
        socket.on('ping', () => {
            socket.emit('pong');
        });
    });

    console.log('✅ [WebSocket] Socket.IO configurado correctamente');

    return io;
}

/**
 * ============================================================
 * RESUMEN PEDAGÓGICO: ¿Qué logramos con este módulo?
 * ============================================================
 * 
 * 1. COMUNICACIÓN BIDIRECCIONAL:
 *    - Cliente puede enviar audio cuando quiera
 *    - Servidor puede enviar resultados cuando quiera
 *    - No hay "request/response" rígido
 * 
 * 2. STREAMING DE AUDIO:
 *    - Audio llega en pedazos (chunks)
 *    - Cliente puede empezar a reproducir inmediatamente
 *    - Reduce latencia de 5 segundos a 0.3 segundos ⚡
 * 
 * 3. FEEDBACK EN TIEMPO REAL:
 *    - Cliente sabe en qué etapa está (transcribiendo, generando, etc.)
 *    - Puede mostrar UI apropiada para cada etapa
 * 
 * 4. MANEJO DE ERRORES:
 *    - Si algo falla, el cliente se entera inmediatamente
 *    - Puede reintentar o mostrar mensaje al usuario
 * 
 * FLUJO COMPLETO:
 * 
 * Cliente                          Servidor
 *   |                                 |
 *   |--- audio-data ----------------→|
 *   |                                 | [Whisper]
 *   |←-- transcript -----------------| "Hola, ¿cómo estás?"
 *   |                                 | [ChatGPT]
 *   |←-- response -------------------| "¡Hola! Estoy muy bien..."
 *   |                                 | [ElevenLabs streaming]
 *   |←-- audio-chunk #1 -------------| 🎵 (0.3s)
 *   |    (empieza a reproducir)       |
 *   |←-- audio-chunk #2 -------------| 🎵 (0.3s)
 *   |    (sigue reproduciendo)        |
 *   |←-- audio-chunk #3 -------------| 🎵 (0.3s)
 *   |                                 |
 *   |←-- audio-end ------------------| ✅ Completado
 *   |                                 |
 */

export default setupWebSocket;
