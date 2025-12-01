import AudioVisualizer from './audioVisualizer.js';
import AudioCaptureVAD from './audioCapture.js';

/**
 * VoiceAI App - Aplicación principal de conversación por voz
 * Maneja la interacción con la esfera, grabación de audio, comunicación con backend
 * y visualización reactiva al audio
 */
class VoiceAIApp {
    constructor() {
        console.log('🔧 Constructor VoiceAIApp iniciado');
        // Estados de la aplicación
        this.state = 'idle'; // idle, listening, processing, speaking, error
        this.vadCapture = null; // VAD en lugar de MediaRecorder
        this.currentAudioElement = null;
        this.socket = null; // WebSocket connection
        this.audioQueue = []; // Cola de audio para streaming
        this.isPlayingAudio = false; // Control de reproducción
        this.nextChunkScheduledTime = 0; // Tiempo programado para el siguiente chunk
        this.visualizerConnected = false; // Flag para saber si ya conectamos el visualizador

        // Servicios
        console.log('🔧 Inicializando servicios...');
        this.audioVisualizer = new AudioVisualizer();

        // Elementos DOM
        this.sphereContainer = document.getElementById('sphereContainer');
        this.statusText = document.getElementById('statusText');
        this.statusBar = document.getElementById('statusBar');
        this.transcriptArea = document.getElementById('transcriptArea');
        this.transcriptText = document.getElementById('transcriptText');
        this.responseArea = document.getElementById('responseArea');
        this.responseText = document.getElementById('responseText');
        this.errorMessage = document.getElementById('errorMessage');
        this.particlesCanvas = document.getElementById('particlesCanvas');

        // Configuración
        this.API_URL = '/api';

        // Inicializar WebSocket
        this.initializeWebSocket();

        // Inicializar
        this.init();
    }

    /**
     * Inicializa la aplicación
     */
    async init() {
        console.log('🚀 Inicializando VoiceAI App (init)...');

        // Configurar event listeners
        this.setupEventListeners();

        // Inicializar visualizador de audio
        console.log('🔊 Inicializando AudioVisualizer...');
        const audioInit = await this.audioVisualizer.initialize();
        if (audioInit) {
            console.log('✅ AudioVisualizer listo');
        } else {
            console.error('❌ Fallo al inicializar AudioVisualizer');
        }

        // Sistema de detección de silencio deshabilitado - push-to-talk manual
        // Los usuarios deben hacer click para detener la grabación

        // Inicializar partículas de fondo
        console.log('✨ Inicializando partículas...');
        this.initParticles();

        // Animación inicial de la esfera
        this.animateSphereIdle();

        console.log('✅ App inicializada completamente');
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Click en la esfera
        this.sphereContainer.addEventListener('click', () => this.handleSphereClick());

        // Detectar permisos de micrófono en el primer click
        document.addEventListener('click', async () => {
            if (this.audioVisualizer.audioContext?.state === 'suspended') {
                await this.audioVisualizer.audioContext.resume();
            }
        }, { once: true });
    }

    /**
     * Inicializa WebSocket para comunicación en tiempo real
     */
    initializeWebSocket() {
        console.log('🔌 [WEBSOCKET] Conectando a WebSocket...');
        console.log('🔌 [WEBSOCKET] window.io disponible:', typeof window.io !== 'undefined');

        // Use environment variable for backend URL, fallback to window.location.origin
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin;
        console.log('🔌 [WEBSOCKET] Backend URL:', BACKEND_URL);

        this.socket = window.io(BACKEND_URL, {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            transports: ['websocket', 'polling'],
            secure: true
        });

        this.socket.on('connect', () => {
            console.log('✅ [WEBSOCKET] Conectado exitosamente');
            console.log('✅ [WEBSOCKET] Socket ID:', this.socket.id);
            console.log('✅ [WEBSOCKET] Estado:', this.socket.connected ? 'CONNECTED' : 'DISCONNECTED');
        });

        this.socket.on('transcript', (data) => {
            console.log('📝 [WEBSOCKET] ← Transcripción recibida');
            console.log('📝 [WEBSOCKET] Texto:', data.text);
            this.showTranscript(data.text);
        });

        this.socket.on('response', (data) => {
            console.log('🤖 [WEBSOCKET] ← Respuesta de IA recibida');
            console.log('🤖 [WEBSOCKET] Texto:', data.text);
            this.showResponse(data.text);
        });

        this.socket.on('audio-chunk', (data) => {
            console.log(`📦 [WEBSOCKET] ← Audio chunk #${data.chunkNumber} recibido`);
            console.log(`📦 [WEBSOCKET] Tamaño chunk: ${data.chunk.length} bytes (base64)`);

            // Filtrar chunks muy pequeños (probablemente vacíos o padding)
            const estimatedSize = (data.chunk.length * 3) / 4; // Tamaño aproximado después de base64
            if (estimatedSize < 100) {
                console.log(`⏭️ [WEBSOCKET] Chunk muy pequeño (${estimatedSize} bytes), ignorando`);
                return;
            }

            const audioBlob = this.base64ToBlob(data.chunk, data.mimeType);
            console.log(`📦 [WEBSOCKET] Blob creado: ${audioBlob.size} bytes`);

            // ACUMULAR en la cola, NO reproducir aún
            this.audioQueue.push(audioBlob);
            console.log(`📦 [WEBSOCKET] Chunks acumulados: ${this.audioQueue.length}`);
        });

        this.socket.on('audio-end', (data) => {
            console.log('✅ Audio completado:', data.totalChunks, 'chunks,', data.totalTime, 'ms');
            console.log('🎵 [PLAYBACK] Combinando', this.audioQueue.length, 'chunks para reproducción fluida...');

            // Reproducir todos los chunks acumulados
            if (this.audioQueue.length > 0) {
                this.playAllAudioAtOnce();
            }

            this.updateStatus('Completado');
        });

        this.socket.on('status', (data) => {
            console.log(`📊 Estado: ${data.message}`);
            if (data.stage === 'whisper') {
                this.updateStatus('Transcribiendo...');
            } else if (data.stage === 'chatgpt') {
                this.updateStatus('Pensando...');
            } else if (data.stage === 'tts') {
                this.updateStatus('Generando voz...');
            } else if (data.stage === 'done') {
                // VAD sigue activo, listo para siguiente turno
            }
        });

        this.socket.on('error', (data) => {
            console.error('❌ Error del servidor:', data);
            this.showError(data.message);
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 WebSocket desconectado');
        });
    }

    /**
     * Convierte Base64 a Blob
     */
    base64ToBlob(base64, mimeType = 'audio/mpeg') {
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

    /**
     * Reproduce TODOS los chunks de audio como UN SOLO archivo continuo
     */
    async playAllAudioAtOnce() {
        console.log('🎵 [PLAYBACK] Iniciando reproducción de audio completo');

        if (this.audioQueue.length === 0) {
            console.log('⚠️ [PLAYBACK] No hay chunks para reproducir');
            return;
        }

        this.isPlayingAudio = true;
        this.setState('speaking');

        try {
            // Crear AudioContext si no existe
            if (!this.audioVisualizer.audioContext) {
                this.audioVisualizer.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            console.log(`🔗 [PLAYBACK] Combinando ${this.audioQueue.length} chunks...`);

            // Combinar todos los blobs en uno solo
            const combinedBlob = new Blob(this.audioQueue, { type: 'audio/mpeg' });
            console.log(`✅ [PLAYBACK] Audio combinado: ${combinedBlob.size} bytes`);

            // Limpiar cola
            this.audioQueue = [];

            // Decodificar el audio combinado
            console.log('🔊 [PLAYBACK] Decodificando audio completo...');
            const arrayBuffer = await combinedBlob.arrayBuffer();
            const audioBuffer = await this.audioVisualizer.audioContext.decodeAudioData(arrayBuffer);

            console.log(`✅ [PLAYBACK] Audio decodificado: ${audioBuffer.duration.toFixed(2)}s`);

            // Crear source node
            const source = this.audioVisualizer.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioVisualizer.audioContext.destination);

            // Conectar visualizador para partículas
            this.audioVisualizer.connectSource(source);
            this.audioVisualizer.start((data) => this.updateSphereFromAudio(data));

            // Cuando termine
            source.onended = () => {
                console.log('✅ [PLAYBACK] Reproducción completada');
                this.isPlayingAudio = false;
                this.audioVisualizer.stop();
                this.setState('listening');
                this.updateStatus('🎙️ Escuchando... (Click para detener)');
            };

            // Iniciar reproducción
            console.log('▶️ [PLAYBACK] Iniciando reproducción...');
            source.start(0);

        } catch (error) {
            console.error('❌ [PLAYBACK] Error al reproducir audio:', error);
            this.isPlayingAudio = false;
            this.audioQueue = [];
            this.setState('listening');
            this.updateStatus('🎙️ Escuchando... (Click para detener)');
        }
    }
    /**
     * Maneja el click en la esfera
     * FLUJO VAD: Click inicial → VAD automático → Click para detener
     */
    async handleSphereClick() {
        console.log(`🖱️ Click en esfera. Estado actual: ${this.state}`);

        if (this.state === 'idle') {
            //Transición visual: Explotar esfera
            const sphere = document.getElementById('sphere');
            if (sphere && sphere.style.display !== 'none') {
                console.log('💥 Iniciando animación de explosión de esfera...');

                // Crear flash
                const flash = document.createElement('div');
                flash.className = 'fixed inset-0 bg-white z-50 pointer-events-none';
                flash.style.opacity = '0';
                document.body.appendChild(flash);

                // Secuencia de animación
                const tl = gsap.timeline({
                    onComplete: () => {
                        sphere.style.display = 'none';
                        console.log('✨ Esfera oculta, partículas activas');
                        flash.remove();
                    }
                });

                // 1. Contracción rápida y Shake
                tl.to(sphere, { scale: 0.9, duration: 0.1, ease: 'power2.in' })
                    .to(sphere, { x: "+=5", yoyo: true, repeat: 5, duration: 0.02 }, "<")

                    // 2. Explosión y Flash
                    .to(sphere, { scale: 4, opacity: 0, duration: 0.4, ease: 'power4.out' }, 'explode')
                    .to(flash, { opacity: 0.8, duration: 0.1, ease: 'power2.in' }, 'explode')

                    // 3. Fade out flash y Fade in partículas
                    .to(flash, { opacity: 0, duration: 0.5, ease: 'power2.out' })
                    .to(this.particlesCanvas, { opacity: 1, duration: 0.5 }, 'explode+=0.1');
            } else {
                this.particlesCanvas.style.opacity = '1';
            }

            await this.startVADConversation();

        } else {
            // Si está en cualquier otro estado, detener VAD completamente
            console.log('🛑 Deteniendo VAD completamente...');
            await this.stopVADConversation();
        }
    }

    /**
     * Inicia conversación con VAD automático
     */
    async startVADConversation() {
        try {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🎙️ [VAD] INICIANDO SISTEMA VAD');
            console.log('🎙️ [VAD] window.vad disponible:', typeof window.vad !== 'undefined');
            console.log('🎙️ [VAD] AudioCaptureVAD importado:', typeof AudioCaptureVAD !== 'undefined');
            this.updateStatus('Iniciando micrófono...');

            console.log('🎙️ [VAD] Creando instancia de AudioCaptureVAD...');
            this.vadCapture = new AudioCaptureVAD({
                sampleRate: 16000,
                silenceThreshold: 1000,
                positiveSpeechThreshold: 0.5,

                onSpeechStart: () => {
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('🟢 [VAD CALLBACK] onSpeechStart ejecutado');
                    console.log('🟢 [VAD CALLBACK] Voz detectada - Empezando a grabar...');
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    this.setState('listening');
                    this.updateStatus('🎙️ ESCUCHANDO...');
                },

                onSpeechEnd: (audioChunk) => {
                    console.log('🔴 [VAD CALLBACK] onSpeechEnd ejecutado');
                    console.log('🔴 [VAD CALLBACK] Tamaño del chunk:', audioChunk.length, 'muestras');
                },

                onVoiceDetected: (probability) => {
                    if (probability > 0.7) {
                        console.log('🎤 [VAD FRAME] Voz detectada - Probabilidad:', probability.toFixed(3));
                    }
                },

                onSilenceDetected: (probability) => {
                    if (probability < 0.3) {
                        console.log('🤫 [VAD FRAME] Silencio detec - Probabilidad:', probability.toFixed(3));
                    }
                },

                onAudioCommit: (audioBlob) => {
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('🔥 [VAD CALLBACK] onAudioCommit ejecutado');
                    console.log('🔥 [VAD CALLBACK] COMMIT! Silencio detectado por >1 segundo');
                    console.log('🔥 [VAD CALLBACK] Tamaño del audio:', audioBlob.size, 'bytes');
                    console.log('🔥 [VAD CALLBACK] Tipo:', audioBlob.type);
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    this.setState('processing');
                    this.updateStatus('Procesando...');
                    this.sendAudioToServer(audioBlob);
                },

                onError: (error) => {
                    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.error('❌ [VAD CALLBACK] onError ejecutado');
                    console.error('❌ [VAD CALLBACK] Error:', error);
                    console.error('❌ [VAD CALLBACK] Stack:', error.stack);
                    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    this.showError('Error al acceder al micrófono');
                    this.setState('idle');
                }
            });

            console.log('🎙️ [VAD] Llamando a vadCapture.start()...');
            await this.vadCapture.start();

            console.log('✅ [VAD] VAD iniciado correctamente');
            console.log('✅ [VAD] Estado del VAD:', this.vadCapture.isRecording ? 'GRABANDO' : 'NO GRABANDO');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            // ============================================================
            // CONECTAR MICRÓFONO AL VISUALIZADOR DE PARTÍCULAS
            // ============================================================
            if (this.vadCapture.vad && this.vadCapture.vad.stream) {
                console.log('🎨 [VAD] Conectando stream del micrófono al visualizador de partículas...');
                this.audioVisualizer.connectSource(this.vadCapture.vad.stream);
                this.audioVisualizer.start((data) => this.updateSphereFromAudio(data));
                console.log('✅ [VAD] Visualizador conectado - Las partículas deberían reaccionar al audio');
            } else {
                console.warn('⚠️ [VAD] No se pudo conectar al visualizador - stream no disponible');
            }

            this.setState('listening');
            this.updateStatus('🎙️ Escuchando... (Click para detener)');

        } catch (error) {
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('❌ [VAD] ERROR CRÍTICO al iniciar VAD');
            console.error('❌ [VAD] Error:', error);
            console.error('❌ [VAD] Mensaje:', error.message);
            console.error('❌ [VAD] Stack:', error.stack);
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            this.showError('No se pudo acceder al micrófono. Verifica los permisos.');
            this.setState('idle');
        }
    }

    /**
     * Detiene VAD completamente
     */
    async stopVADConversation() {
        if (this.vadCapture) {
            console.log('🛑 Deteniendo VAD...');
            await this.vadCapture.stop();
            this.vadCapture = null;
        }

        // Detener cualquier audio reproduciéndose
        if (this.currentAudioElement) {
            this.currentAudioElement.pause();
            this.currentAudioElement = null;
        }

        this.audioVisualizer.stop();
        this.audioQueue = [];
        this.isPlayingAudio = false;

        // Volver a estado inicial
        this.setState('idle');
        this.updateStatus('Click en la esfera para comenzar');

        // Restaurar esfera
        const sphere = document.getElementById('sphere');
        if (sphere) {
            sphere.style.display = 'flex';
            gsap.to(sphere, { scale: 1, opacity: 1, duration: 0.5 });
            gsap.to(this.particlesCanvas, { opacity: 0, duration: 0.5 });
        }

        this.animateSphereIdle();
    }

    /**
     * Envía audio al servidor via WebSocket
     */
    async sendAudioToServer(audioBlob) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📤 [SEND] Enviando audio al servidor via WebSocket');
        console.log('📤 [SEND] Estado WebSocket:', this.socket ? 'EXISTE' : 'NULL');
        console.log('📤 [SEND] WebSocket conectado:', this.socket?.connected);

        if (!this.socket || !this.socket.connected) {
            console.error('❌ [SEND] WebSocket no está conectado');
            console.error('❌ [SEND] Socket:', this.socket);
            console.error('❌ [SEND] Connected:', this.socket?.connected);
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            this.showError('Conexión perdida. Reconectando...');
            return;
        }

        try {
            console.log('📤 [SEND] Tamaño del blob:', audioBlob.size, 'bytes');
            console.log('📤 [SEND] Tipo del blob:', audioBlob.type);
            console.log('📤 [SEND] Convirtiendo a ArrayBuffer...');

            const arrayBuffer = await audioBlob.arrayBuffer();

            console.log('📤 [SEND] ArrayBuffer creado:', arrayBuffer.byteLength, 'bytes');
            console.log('📤 [SEND] Emitiendo evento "audio-data"...');

            this.socket.emit('audio-data', arrayBuffer);

            console.log('✅ [SEND] Audio enviado exitosamente');
            console.log('✅ [SEND] Esperando transcripción del servidor...');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        } catch (error) {
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('❌ [SEND] Error al enviar audio');
            console.error('❌ [SEND] Error:', error);
            console.error('❌ [SEND] Stack:', error.stack);
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            this.showError('Error al enviar audio');
            this.setState('listening'); // Volver a escuchar
        }
    }

    /**
     * Inicializa el sistema de partículas
     */
    initParticles() {
        // Importar dinámicamente para asegurar que el módulo existe
        import('./particleSystem.js').then(module => {
            this.particleSystem = new module.ParticleSystem('particlesCanvas');
            console.log('✅ Sistema de partículas integrado');
        }).catch(err => {
            console.error('❌ Error al cargar ParticleSystem:', err);
        });
    }

    /**
     * Actualiza el estado de la aplicación
     */
    setState(newState) {
        this.state = newState;
        console.log(`🔄 Estado cambiado a: ${newState}`);

        // Actualizar UI según estado
        if (newState === 'idle') {
            // Restaurar esfera si volvemos a idle
            const sphere = document.getElementById('sphere');
            if (sphere) {
                sphere.style.display = 'flex';
                gsap.to(sphere, { scale: 1, opacity: 1, duration: 0.5 });
                gsap.to(this.particlesCanvas, { opacity: 0, duration: 0.5 });
            }

            // Resetear partículas
            if (this.particleSystem) {
                this.particleSystem.resetParticles();
            }
        }
    }

    /**
     * Actualiza el texto de estado
     */
    updateStatus(text) {
        if (this.statusText) {
            this.statusText.textContent = text;
            gsap.from(this.statusText, { opacity: 0, y: -10, duration: 0.3 });
        }
    }

    /**
     * Anima la esfera en estado idle
     */
    animateSphereIdle() {
        const sphere = document.getElementById('sphere');
        if (sphere) {
            gsap.to(sphere, {
                scale: 1.05,
                duration: 2,
                yoyo: true,
                repeat: -1,
                ease: "sine.inOut"
            });
        }
    }

    /**
     * Inicializa el sistema de partículas
     */
    initParticles() {
        // Importar dinámicamente para asegurar que el módulo existe
        import('./particleSystem.js').then(module => {
            this.particleSystem = new module.ParticleSystem('particlesCanvas');
            console.log('✅ Sistema de partículas integrado');
        }).catch(err => {
            console.error('❌ Error al cargar ParticleSystem:', err);
        });
    }

    /**
     * Actualiza la visualización basada en datos de audio
     */
    updateSphereFromAudio(data) {
        // Pasar datos al sistema de partículas si está listo
        if (this.particleSystem) {
            this.particleSystem.updateAudioData(data);
        }

        // Efecto de sombra en bordes para picos altos
        if (data.peak > 0.9) {
            document.body.style.boxShadow = `inset 0 0 50px rgba(168, 85, 247, ${data.peak * 0.5})`;
        } else {
            document.body.style.boxShadow = 'none';
        }
    }

    // Métodos de animación antiguos (vacíos o redirigidos)
    animateSphereIdle() { /* Ya manejado por loop de partículas */ }
    animateSphereExpand() { /* Ya manejado por estado */ }
    animateSphereThinking() { /* Ya manejado por estado */ }
    animateSphereError() {
        // Flash rojo
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // ... Resto de métodos ...
    /**
     * Actualiza el texto de estado
     */
    updateStatus(text) {
        this.statusText.textContent = text;

        // Animar barra de estado
        if (this.state !== 'idle') {
            this.statusBar.style.opacity = '1';
            this.statusBar.classList.add('active');
        } else {
            this.statusBar.style.opacity = '0';
            this.statusBar.classList.remove('active');
        }
    }

    /**
     * Muestra la transcripción SOLO EN CONSOLA
     */
    showTranscript(text) {
        console.log('📝 TRANSCRIPCIÓN:', text);
        // No mostrar en UI - solo consola
    }

    /**
     * Muestra la respuesta SOLO EN CONSOLA
     */
    async showResponse(text) {
        console.log('💬 RESPUESTA IA:', text);
        // No mostrar en UI - solo consola
    }

    /**
     * Muestra un mensaje de error
     */
    showError(message) {
        const errorDiv = this.errorMessage;
        errorDiv.querySelector('p').textContent = message;

        gsap.to(errorDiv, {
            opacity: 1,
            duration: 0.3,
            onComplete: () => {
                setTimeout(() => {
                    gsap.to(errorDiv, { opacity: 0, duration: 0.3 });
                }, 4000);
            }
        });
    }
}

// Inicializar la aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new VoiceAIApp());
} else {
    new VoiceAIApp();
}
