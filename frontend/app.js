import AudioVisualizer from './audioVisualizer.js';

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
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.currentAudioElement = null;

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
     * Maneja el click en la esfera
     * NUEVA FUNCIONALIDAD: Transición de esfera a partículas
     */
    async handleSphereClick() {
        console.log(`🖱️ Click en esfera. Estado actual: ${this.state}`);

        if (this.state === 'idle') {
            // Transición visual: Explotar esfera
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

            await this.startConversation();

        } else if (this.state === 'listening') {
            console.log('🛑 Deteniendo grabación manualmente...');
            await this.stopRecording();

        } else if (this.state === 'speaking') {
            console.log('⏸️ Interrumpiendo reproducción...');
            await this.interruptAndListen();
        }
    }



    /**
     * Inicia una conversación (grabación de audio)
     */
    async startConversation() {
        try {
            console.log('🎤 Iniciando proceso de grabación...');

            // Solicitar permiso de micrófono
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            console.log('✅ Permiso de micrófono concedido');

            // Configurar MediaRecorder
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm'
            });

            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    // console.log(`📦 Chunk de audio recibido: ${event.data.size} bytes`);
                }
            };

            this.mediaRecorder.onstop = async () => {
                console.log('🛑 MediaRecorder detenido. Procesando audio...');
                await this.processAudio();

                // Detener el stream del micrófono
                stream.getTracks().forEach(track => track.stop());
                console.log('🔌 Stream de micrófono cerrado');
            };

            // Iniciar grabación
            this.mediaRecorder.start();
            this.isRecording = true;
            console.log('🔴 Grabación iniciada');

            // Cambiar estado visual
            this.setState('listening');
            this.updateStatus('🎙️ GRABANDO - Click para detener');

            // Conectar visualizador al micrófono
            this.audioVisualizer.connectSource(stream);
            this.audioVisualizer.start((data) => this.updateSphereFromAudio(data));

        } catch (error) {
            console.error('❌ Error crítico al acceder al micrófono:', error);
            this.showError('No se pudo acceder al micrófono. Verifica los permisos.');
        }
    }

    /**
     * Detiene la grabación
     */
    async stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            console.log('⏹️ Deteniendo grabación...');
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.audioVisualizer.stop();

            this.setState('processing');
            this.updateStatus('Procesando...');
        }
    }

    /**
     * Procesa el audio grabado y envía al backend
     */
    async processAudio() {
        try {
            console.log('🔄 Procesando audio grabado...');
            // Crear blob de audio
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            console.log(`📦 Audio grabado: ${audioBlob.size} bytes`);

            // Crear FormData para enviar
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            // Enviar al backend
            this.updateStatus('Enviando audio...');
            console.log('📡 Enviando petición a /api/conversar...');

            const response = await fetch(`${this.API_URL}/conversar`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                console.error(`❌ Error HTTP del servidor: ${response.status}`);
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const data = await response.json();
            console.log('📥 Respuesta recibida del backend:', data);

            // Mostrar transcripción
            this.showTranscript(data.transcript);

            // Mostrar respuesta con efecto typing
            await this.showResponse(data.response);

            // ⭐ Streaming con ElevenLabs
            console.log('🔊 Iniciando streaming de audio (ElevenLabs)...');
            await this.playAudioStream(data.response);

        } catch (error) {
            console.error('❌ Error al procesar audio:', error);
            this.showError('Error al procesar la conversación. Intenta de nuevo.');
            this.setState('idle');

            // Restaurar esfera si hubo error
            const sphere = document.getElementById('sphere');
            if (sphere) sphere.style.display = 'flex';
            gsap.to(sphere, { scale: 1, opacity: 1, duration: 0.5 });

            this.animateSphereIdle();
            this.updateStatus('Click en la esfera para comenzar');
        }
    }

    /**
     * Reproduce el audio de respuesta
     */
    async playAudio(audioBase64, provider = 'elevenlabs') {
        return new Promise((resolve) => {
            try {
                this.setState('speaking');
                this.updateStatus(`Hablando (Click para interrumpir)...`);

                // Crear elemento de audio
                const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
                this.currentAudioElement = audio;

                // Conectar al visualizador
                this.audioVisualizer.connectSource(audio);
                this.audioVisualizer.start((data) => this.updateSphereFromAudio(data));

                audio.onended = () => {
                    this.audioVisualizer.stop();
                    resolve();
                };

                audio.onerror = (error) => {
                    console.error('❌ Error al reproducir audio:', error);
                    this.audioVisualizer.stop();
                    resolve();
                };

                audio.play();

            } catch (error) {
                console.error('❌ Error al reproducir:', error);
                resolve();
            }
        });
    }

    async playAudioElevenLabs(text) {
        console.log('🔊 Solicitando TTS fallback a ElevenLabs...');
        // Llamar al backend para obtener audio de ElevenLabs
        const response = await fetch(`${this.API_URL}/tts-fallback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            console.error('❌ Error en API TTS fallback');
            throw new Error('ElevenLabs API falló');
        }

        const data = await response.json();

        if (data.audio) {
            console.log('📥 Audio fallback recibido, reproduciendo...');
            await this.playAudio(data.audio, 'elevenlabs');
        }
    }

    /**
     * Reproduce audio desde ElevenLabs (audio completo, no streaming)
     */
    async playAudioStream(text) {
        console.log('🔊 Generando audio completo para:', text.substring(0, 50) + '...');

        try {
            // Usar endpoint de audio completo en lugar de streaming
            const response = await fetch(`${this.API_URL}/tts-fallback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (!response.ok) throw new Error(`Error TTS: ${response.status}`);

            const data = await response.json();
            console.log('📥 Audio recibido de ElevenLabs');

            if (data.audio) {
                // Reproducir audio completo
                await this.playAudio(data.audio, 'elevenlabs');

                // Cuando termine, volver a idle
                console.log('🏁 Reproducción finalizada');
                this.setState('idle');
                this.animateSphereIdle();
                this.updateStatus('Click para hablar');
            }

        } catch (error) {
            console.error('❌ Error al generar/reproducir audio:', error);
            this.showError('Error al reproducir la respuesta');
            this.setState('idle');
            this.animateSphereIdle();
            this.updateStatus('Click para hablar');
        }
    }

    /**
     * NUEVA FUNCIONALIDAD: Interrumpe la IA y empieza a escuchar
     */
    async interruptAndListen() {
        console.log('⏸️ Usuario interrumpe a la IA...');

        // Detener cualquier audio que esté reproduciéndose
        if (this.currentAudioElement) {
            this.currentAudioElement.pause();
            this.currentAudioElement.currentTime = 0;
            this.currentAudioElement = null;
        }

        // Detener visualizador
        this.audioVisualizer.stop();

        // Limpiar áreas de texto
        gsap.to([this.transcriptArea, this.responseArea], {
            opacity: 0,
            duration: 0.3
        });

        // Iniciar grabación inmediatamente
        await this.startConversation();
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
