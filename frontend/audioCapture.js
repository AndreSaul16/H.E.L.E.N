/**
 * ============================================================
 * 🎙️ MÓDULO DE CAPTURA DE AUDIO CON VAD (Voice Activity Detection)
 * ============================================================
 * 
 * CONCEPTO PEDAGÓGICO: ¿Qué es este módulo?
 * -----------------------------------------
 * Imagina que este módulo es como un "asistente inteligente" que escucha
 * constantemente tu micrófono y sabe distinguir cuándo estás hablando
 * vs cuándo hay silencio o ruido de fondo.
 * 
 * ANALOGÍA DEL SEMÁFORO INTELIGENTE:
 * - 🟢 VERDE (voz detectada): La gente está cruzando → Acumula audio
 * - 🔴 ROJO (silencio): No hay gente → Si ha pasado suficiente tiempo, envía lo acumulado
 * 
 * FLUJO DE TRABAJO:
 * 1. Micrófono captura audio continuamente (como un grifo abierto)
 * 2. El audio se divide en "chunks" pequeños (512 bytes cada uno)
 * 3. Cada chunk pasa por el VAD (detector de voz)
 * 4. Si detecta voz: guarda el chunk en un buffer (cubo acumulador)
 * 5. Si detecta silencio durante >1 segundo: dispara evento "commit" y vacía el cubo
 */

// import { MicVAD } from '@ricky0123/vad-web'; // Usamos CDN global window.vad

// ============================================================
// CLASE PRINCIPAL: AudioCaptureVAD
// ============================================================

class AudioCaptureVAD {
    constructor(options = {}) {
        console.log('🎙️ [AudioCaptureVAD] Inicializando sistema de captura con VAD...');

        // ============================================================
        // CONFIGURACIÓN PEDAGÓGICA
        // ============================================================

        /**
         * CONCEPTO: Sample Rate (Frecuencia de Muestreo)
         * ----------------------------------------------
         * Es la "calidad" del audio. 16000 Hz significa que tomamos 16,000 "fotos"
         * del sonido cada segundo.
         * 
         * ANALOGÍA: Como los FPS en un video
         * - 24 FPS = video normal
         * - 60 FPS = video más fluido
         * - 16,000 "fotos de audio" por segundo = calidad telefónica (suficiente para voz)
         */
        this.sampleRate = options.sampleRate || 16000;

        /**
         * CONCEPTO: Umbral de Silencio (Silence Threshold)
         * ------------------------------------------------
         * Tiempo en milisegundos que debe pasar sin detectar voz
         * para considerar que "terminaste de hablar"
         * 
         * ANALOGÍA: Tiempo de espera en un ascensor
         * Si pasaron 1000ms (1 segundo) sin que entre nadie más,
         * el ascensor cierra las puertas y se va.
         */
        this.silenceThreshold = options.silenceThreshold || 1000; // 1 segundo

        /**
         * CONCEPTO: Probabilidad de Voz (Voice Probability)
         * -------------------------------------------------
         * El VAD no dice "sí/no" rotundamente, sino que da una probabilidad
         * entre 0.0 (definitivamente no es voz) y 1.0 (definitivamente es voz)
         * 
         * ANALOGÍA: Nivel de confianza
         * - 0.2 = "Probablemente es ruido de fondo"
         * - 0.5 = "No estoy seguro, podría ser voz o no"
         * - 0.8 = "Muy seguro de que es voz humana"
         */
        this.positiveSpeechThreshold = options.positiveSpeechThreshold || 0.5;

        // ============================================================
        // ESTADO INTERNO
        // ============================================================

        /**
         * CONCEPTO: Buffer (Búffer de Audio)
         * ----------------------------------
         * Es un "cubo temporal" donde vamos acumulando los chunks de audio
         * que contienen voz, hasta que detectamos silencio.
         * 
         * ANALOGÍA: Carrito de compras
         * Vas añadiendo productos (chunks) al carrito (buffer) hasta que
         * decides ir a la caja (commit/enviar)
         */
        this.audioBuffer = [];

        /**
         * CONCEPTO: Timestamp (Marca de Tiempo)
         * -------------------------------------
         * Guarda el momento exacto (en milisegundos) de la última vez
         * que detectamos voz.
         * 
         * ANALOGÍA: Última vez que viste movimiento
         * Como un sensor de movimiento que recuerda "a las 10:32:15 fue
         * la última vez que vi movimiento"
         */
        this.lastSpeechTimestamp = null;

        /**
         * Estado de grabación: ¿Estamos escuchando activamente?
         */
        this.isRecording = false;

        /**
         * Instancia del VAD (se inicializa en start())
         */
        this.vad = null;

        /**
         * CONCEPTO: Callbacks (Funciones de Retorno)
         * ------------------------------------------
         * Son funciones que TÚ defines y este módulo las "llama de vuelta"
         * cuando sucede algo importante.
         * 
         * ANALOGÍA: Timbre de tu casa
         * Tú defines qué hacer cuando suena el timbre (abrir la puerta,
         * mirar por la ventana, ignorarlo...). El timbre solo te avisa.
         */
        this.onSpeechStart = options.onSpeechStart || (() => { });
        this.onSpeechEnd = options.onSpeechEnd || (() => { });
        this.onVoiceDetected = options.onVoiceDetected || (() => { });
        this.onSilenceDetected = options.onSilenceDetected || (() => { });
        this.onAudioCommit = options.onAudioCommit || (() => { }); // 🔥 EL MÁS IMPORTANTE
        this.onError = options.onError || ((err) => console.error('Error en VAD:', err));
    }

    // ============================================================
    // MÉTODO: Iniciar Captura
    // ============================================================

    /**
     * Inicia el sistema de captura de audio con VAD
     * 
     * FLUJO INTERNO:
     * 1. Solicita permiso al micrófono del navegador
     * 2. Inicializa el modelo de VAD (Silero)
     * 3. Empieza a escuchar y analizar audio continuamente
     */
    async start() {
        try {
            console.log('🚀 [AudioCaptureVAD] Iniciando captura...');
            console.log('🚀 [AudioCaptureVAD] window.vad disponible:', typeof window.vad !== 'undefined');
            console.log('🚀 [AudioCaptureVAD] window.vad.MicVAD disponible:', typeof window.vad?.MicVAD !== 'undefined');

            // ============================================================
            // PASO 1: Inicializar VAD
            // ============================================================
            console.log('📡 [AudioCaptureVAD] Configurando VAD con:');
            console.log('📡 [AudioCaptureVAD]   - positiveSpeechThreshold:', this.positiveSpeechThreshold);
            console.log('📡 [AudioCaptureVAD]   - silenceThreshold:', this.silenceThreshold, 'ms');
            console.log('📡 [AudioCaptureVAD]   - sampleRate:', this.sampleRate, 'Hz');

            // Usamos la versión global del CDN
            console.log('🎤 [AudioCaptureVAD] Llamando a window.vad.MicVAD.new()...');
            this.vad = await window.vad.MicVAD.new({
                // Configuración crítica para CDN (Evita errores de carga local)
                workletURL: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.7/dist/vad.worklet.bundle.min.js",
                modelURL: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.7/dist/silero_vad.onnx",
                onnxWASMPaths: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/",
                // Sample rate: 16kHz es el estándar para voz (Whisper lo requiere)
                positiveSpeechThreshold: this.positiveSpeechThreshold,

                // Callbacks del VAD:

                /**
                 * onSpeechStart: Se llama cuando empieza a detectar voz
                 * ANALOGÍA: "Alguien empezó a hablar"
                 */
                onSpeechStart: () => {
                    console.log('🟢 [VAD] Inicio de voz detectado');
                    this.lastSpeechTimestamp = Date.now();
                    this.onSpeechStart();
                },

                /**
                 * onSpeechEnd: Se llama cuando termina de detectar voz
                 * ANALOGÍA: "La persona dejó de hablar"
                 */
                onSpeechEnd: (audio) => {
                    console.log('🔴 [VAD] Fin de voz detectado');

                    /**
                     * CONCEPTO: ¿Qué es el parámetro "audio"?
                     * ---------------------------------------
                     * Es un Float32Array con las muestras de audio capturadas
                     * durante el período de voz.
                     * 
                     * Float32Array: Array de números decimales entre -1.0 y 1.0
                     * que representan la "onda sonora"
                     * 
                     * Ejemplo: [0.0, 0.1, 0.3, 0.2, -0.1, -0.3, ...]
                     *           ^    ^    ^           ^     ^
                     *         silencio  sonido   sonido  silencio
                     */

                    // Añadir audio al buffer
                    this.audioBuffer.push(audio);

                    // Actualizar timestamp
                    this.lastSpeechTimestamp = Date.now();

                    this.onSpeechEnd(audio);

                    // Verificar si debemos hacer "commit" (enviar)
                    this.checkForCommit();
                },

                /**
                 * onVADMisfire: Falsa alarma (detectó voz pero no era)
                 * ANALOGÍA: Sensor de movimiento activado por una mascota
                 */
                onVADMisfire: () => {
                    console.log('⚠️ [VAD] Falsa alarma - no era voz');
                },

                /**
                 * onFrameProcessed: Se llama por cada "frame" de audio procesado
                 * CONCEPTO: Frame = chunk pequeño de audio (~30ms)
                 */
                onFrameProcessed: (probabilities) => {
                    /**
                     * CONCEPTO: Probabilities
                     * -----------------------
                     * Es un objeto con:
                     * - isSpeech: probabilidad de que sea voz (0.0 - 1.0)
                     * - notSpeech: probabilidad de que NO sea voz
                     * 
                     * Ejemplo:
                     * { isSpeech: 0.85, notSpeech: 0.15 }
                     * → 85% seguro de que es voz
                     */

                    // Log cada 100 frames para no saturar consola
                    if (!this.frameCount) this.frameCount = 0;
                    this.frameCount++;

                    if (this.frameCount % 100 === 0) {
                        console.log(`📊 [VAD FRAME #${this.frameCount}] isSpeech: ${probabilities.isSpeech.toFixed(3)}, notSpeech: ${probabilities.notSpeech.toFixed(3)}`);
                    }

                    if (probabilities.isSpeech > this.positiveSpeechThreshold) {
                        this.onVoiceDetected(probabilities.isSpeech);
                    } else {
                        this.onSilenceDetected(probabilities.isSpeech);
                    }
                }
            });

            this.isRecording = true;
            console.log('✅ [AudioCaptureVAD] VAD iniciado correctamente');
            console.log('✅ [AudioCaptureVAD] Estado isRecording:', this.isRecording);
            console.log('✅ [AudioCaptureVAD] VAD instance:', this.vad);
            console.log('✅ [AudioCaptureVAD] listening (antes de start):', this.vad.listening);

            // ============================================================
            // PASO CRÍTICO: INICIAR ESCUCHA DEL MICRÓFONO
            // ============================================================
            console.log('🎤 [AudioCaptureVAD] Llamando a vad.start() para empezar a escuchar...');
            this.vad.start();
            console.log('✅ [AudioCaptureVAD] vad.start() ejecutado');
            console.log('✅ [AudioCaptureVAD] listening (después de start):', this.vad.listening);
            console.log('✅ [AudioCaptureVAD] Esperando frames de audio del micrófono...');

            // ============================================================
            // CONECTAR STREAM AL VISUALIZADOR PARA PARTÍCULAS
            // ============================================================
            if (this.vad.stream) {
                console.log('🎨 [AudioCaptureVAD] VAD tiene stream de micrófono, disponible para visualización');
                console.log('🎨 [AudioCaptureVAD] Stream ID:', this.vad.stream.id);
                console.log('🎨 [AudioCaptureVAD] Audio tracks:', this.vad.stream.getAudioTracks().length);
            } else {
                console.warn('⚠️ [AudioCaptureVAD] VAD no tiene stream de micrófono disponible');
            }

            // ============================================================
            // INICIAR MONITOREO DE SILENCIO
            // ============================================================
            /**
             * CONCEPTO: ¿Por qué un intervalo?
             * --------------------------------
             * Necesitamos verificar periódicamente si ha pasado suficiente
             * tiempo SIN voz para hacer "commit"
             * 
             * ANALOGÍA: Reloj checador
             * Cada 500ms (medio segundo) revisamos:
             * "¿Ha pasado más de 1 segundo desde la última vez que escuchamos voz?"
             */
            this.silenceCheckInterval = setInterval(() => {
                this.checkForCommit();
            }, 500); // Revisar cada medio segundo

        } catch (error) {
            console.error('❌ [AudioCaptureVAD] Error al iniciar:', error);
            this.onError(error);
        }
    }

    // ============================================================
    // MÉTODO: Verificar Commit (Lógica del Silencio Semántico)
    // ============================================================

    /**
     * CONCEPTO PEDAGÓGICO: ¿Qué es "Commit"?
     * --------------------------------------
     * Es el momento en que decidimos que "ya terminaste de hablar"
     * y enviamos todo el audio acumulado para procesarlo.
     * 
     * ANALOGÍA: Enviar un mensaje de WhatsApp
     * Escribes varias palabras... haces pausas... sigues escribiendo...
     * y cuando dejas de escribir por 1 segundo, el sistema podría
     * auto-enviarlo (eso sería un commit)
     * 
     * LÓGICA:
     * - Si NO hay audio en buffer → ignorar
     * - Si NO ha pasado suficiente tiempo → ignorar
     * - Si todo está OK → COMMIT (enviar y limpiar buffer)
     */
    checkForCommit() {
        // Condición 1: ¿Hay algo que enviar?
        if (this.audioBuffer.length === 0) {
            return; // Buffer vacío, nada que hacer
        }

        // Condición 2: ¿Ha pasado suficiente tiempo sin voz?
        if (!this.lastSpeechTimestamp) {
            return; // Nunca hemos detectado voz aún
        }

        const timeSinceLastSpeech = Date.now() - this.lastSpeechTimestamp;

        if (timeSinceLastSpeech >= this.silenceThreshold) {
            console.log(`🔥 [VAD] COMMIT! Han pasado ${timeSinceLastSpeech}ms sin voz`);
            this.commitAudio();
        }
    }

    // ============================================================
    // MÉTODO: Commit (Enviar Audio Acumulado)
    // ============================================================

    /**
     * Combina todos los chunks del buffer en un solo archivo de audio
     * y lo envía para procesamiento (Whisper → ChatGPT → ElevenLabs)
     * 
     * CONCEPTO: Concatenación de Arrays
     * ---------------------------------
     * Tenemos múltiples Float32Array pequeños, los juntamos en uno grande
     * 
     * ANALOGÍA: Unir piezas de Lego
     * [ chunk1 ][ chunk2 ][ chunk3 ] → [ chunk1chunk2chunk3 ]
     */
    commitAudio() {
        if (this.audioBuffer.length === 0) return;

        // ============================================================
        // PASO 1: Calcular tamaño total
        // ============================================================
        /**
         * CONCEPTO: ¿Por qué calcular longitud total?
         * -------------------------------------------
         * Necesitamos saber cuántos "espacios" reservar en memoria
         * para el array final
         * 
         * Ejemplo:
         * chunk1 tiene 1000 muestras
         * chunk2 tiene 500 muestras
         * chunk3 tiene 800 muestras
         * → Total: 2300 muestras
         */
        let totalLength = 0;
        for (const chunk of this.audioBuffer) {
            totalLength += chunk.length;
        }

        console.log(`📦 [VAD] Commit: ${this.audioBuffer.length} chunks, ${totalLength} muestras`);

        // ============================================================
        // PASO 2: Crear array concatenado
        // ============================================================
        /**
         * CONCEPTO: Float32Array
         * ----------------------
         * Tipo de array optimizado para datos de audio
         * Cada elemento es un número decimal de 32 bits
         */
        const concatenated = new Float32Array(totalLength);

        let offset = 0; // Posición actual donde escribir
        for (const chunk of this.audioBuffer) {
            concatenated.set(chunk, offset);
            offset += chunk.length;
        }

        // ============================================================
        // PASO 3: Convertir a formato WAV
        // ============================================================
        /**
         * CONCEPTO: ¿Por qué WAV?
         * -----------------------
         * Float32Array es "audio crudo" (solo números)
         * WAV es un "archivo de audio" con headers que indican:
         * - Sample rate (16000 Hz)
         * - Número de canales (1 = mono)
         * - Bits por muestra (16 bits)
         * 
         * ANALOGÍA: Empaquetar un regalo
         * Los números son el regalo, el WAV es la caja con etiqueta
         */
        const wavBlob = this.floatArrayToWav(concatenated, this.sampleRate);

        // ============================================================
        // PASO 4: Llamar al callback con el audio
        // ============================================================
        this.onAudioCommit(wavBlob);

        // ============================================================
        // PASO 5: Limpiar buffer para el próximo ciclo
        // ============================================================
        this.audioBuffer = [];
        this.lastSpeechTimestamp = null;

        console.log('✅ [VAD] Audio enviado y buffer limpiado');
    }

    // ============================================================
    // MÉTODO: Convertir Float32Array a WAV
    // ============================================================

    /**
     * CONCEPTO PEDAGÓGICO: Formato WAV
     * --------------------------------
     * Un archivo WAV tiene dos partes:
     * 1. HEADER (44 bytes): Información sobre el audio
     * 2. DATA: Los datos de audio en sí
     * 
     * ANALOGÍA: Carta con sobre
     * - HEADER = Info del sobre (destinatario, remitente, fecha)
     * - DATA = Contenido de la carta
     */
    floatArrayToWav(floatArray, sampleRate) {
        /**
         * PASO 1: Convertir Float32 (-1.0 a 1.0) a Int16 (-32768 a 32767)
         * ---------------------------------------------------------------
         * Los archivos WAV usan enteros de 16 bits, no decimales
         * 
         * CONCEPTO: Escalado
         * -----------------
         * 0.5 en Float32 → 0.5 * 32767 = 16383 en Int16
         * -1.0 en Float32 → -1.0 * 32768 = -32768 en Int16
         */
        const int16Array = new Int16Array(floatArray.length);
        for (let i = 0; i < floatArray.length; i++) {
            const sample = Math.max(-1, Math.min(1, floatArray[i])); // Clamp entre -1 y 1
            int16Array[i] = sample < 0 ? sample * 32768 : sample * 32767;
        }

        /**
         * PASO 2: Crear buffer con HEADER + DATA
         */
        const buffer = new ArrayBuffer(44 + int16Array.length * 2);
        const view = new DataView(buffer);

        /**
         * PASO 3: Escribir HEADER WAV (44 bytes)
         * ---------------------------------------
         * Es una estructura estándar con campos específicos
         */

        // "RIFF" chunk descriptor
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + int16Array.length * 2, true); // Tamaño del archivo
        this.writeString(view, 8, 'WAVE');

        // "fmt " sub-chunk (formato del audio)
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // Tamaño del sub-chunk
        view.setUint16(20, 1, true); // Audio format (1 = PCM)
        view.setUint16(22, 1, true); // Número de canales (1 = mono)
        view.setUint32(24, sampleRate, true); // Sample rate
        view.setUint32(28, sampleRate * 2, true); // Byte rate
        view.setUint16(32, 2, true); // Block align
        view.setUint16(34, 16, true); // Bits por muestra

        // "data" sub-chunk (los datos en sí)
        this.writeString(view, 36, 'data');
        view.setUint32(40, int16Array.length * 2, true); // Tamaño de los datos

        /**
         * PASO 4: Escribir los datos de audio
         */
        const dataOffset = 44;
        for (let i = 0; i < int16Array.length; i++) {
            view.setInt16(dataOffset + i * 2, int16Array[i], true);
        }

        /**
         * PASO 5: Crear Blob (archivo en memoria)
         * ---------------------------------------
         * CONCEPTO: Blob = Binary Large Object
         * Es como un "archivo virtual" que podemos enviar por la red
         */
        return new Blob([buffer], { type: 'audio/wav' });
    }

    /**
     * Utilidad para escribir strings en DataView
     */
    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    // ============================================================
    // MÉTODO: Detener Captura
    // ============================================================

    async stop() {
        console.log('🛑 [AudioCaptureVAD] Deteniendo captura...');

        if (this.vad) {
            this.vad.pause(); // Pausar VAD
            // NOTA: La versión CDN 0.0.7 no tiene destroy(), solo pause()
            this.vad = null;
        }

        if (this.silenceCheckInterval) {
            clearInterval(this.silenceCheckInterval);
            this.silenceCheckInterval = null;
        }

        this.isRecording = false;
        this.audioBuffer = [];

        console.log('✅ [AudioCaptureVAD] Captura detenida');
    }

    // ============================================================
    // MÉTODO: Pausar (sin destruir)
    // ============================================================

    pause() {
        if (this.vad) {
            this.vad.pause();
            console.log('⏸️ [AudioCaptureVAD] Pausado');
        }
    }

    // ============================================================
    // MÉTODO: Reanudar
    // ============================================================

    resume() {
        if (this.vad) {
            this.vad.start();
            console.log('▶️ [AudioCaptureVAD] Reanudado');
        }
    }
}

// ============================================================
// EXPORTAR MÓDULO
// ============================================================

export default AudioCaptureVAD;
