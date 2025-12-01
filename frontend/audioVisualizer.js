/**
 * AudioVisualizer - Clase para análisis y visualización de audio en tiempo real
 * Responsabilidad: Analizar frecuencias de audio y mapearlas a parámetros visuales
 */
export class AudioVisualizer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.bufferLength = 0;
        this.animationId = null;
        this.isActive = false;

        // Callbacks para actualizar visuales
        this.onFrequencyUpdate = null;

        // Parámetros de smoothing
        this.smoothingFactor = 0.8;
        this.previousValues = {
            bass: 0,
            mid: 0,
            treble: 0,
            overall: 0
        };

        // Detección de silencio deshabilitada - solo push-to-talk manual
    }

    /**
     * Inicializa el contexto de audio
     */
    async initialize() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();

            // Configuración del analizador
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.85;

            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);

            console.log('[AudioVisualizer] Inicializado correctamente');
            return true;
        } catch (error) {
            console.error('[AudioVisualizer] Error al inicializar:', error);
            return false;
        }
    }

    /**
     * Conecta una fuente de audio (micrófono o elemento de audio)
     * @param {MediaStream|HTMLAudioElement} source 
     */
    connectSource(source) {
        if (!this.audioContext || !this.analyser) {
            console.error('[AudioVisualizer] No inicializado');
            return null;
        }

        let audioSource;

        if (source instanceof MediaStream) {
            // Conexión desde micrófono
            audioSource = this.audioContext.createMediaStreamSource(source);
        } else if (source instanceof HTMLAudioElement) {
            // Conexión desde elemento de audio
            audioSource = this.audioContext.createMediaElementSource(source);
        } else {
            console.error('[AudioVisualizer] Fuente de audio no válida');
            return null;
        }

        audioSource.connect(this.analyser);

        // Si es un elemento de audio, conectar también a la salida
        if (source instanceof HTMLAudioElement) {
            this.analyser.connect(this.audioContext.destination);
        }

        console.log('[AudioVisualizer] Fuente conectada');
        return audioSource;
    }

    /**
     * Inicia el análisis de audio en tiempo real
     * @param {Function} callback - Función a llamar con los datos de frecuencia
     */
    start(callback) {
        if (!this.analyser) {
            console.error('[AudioVisualizer] Analyser no disponible');
            return;
        }

        this.isActive = true;
        this.onFrequencyUpdate = callback;
        this._analyze();

        console.log('[AudioVisualizer] Análisis iniciado');
    }

    /**
     * Detiene el análisis de audio
     */
    stop() {
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        console.log('[AudioVisualizer] Análisis detenido');
    }

    /**
     * Bucle de análisis principal
     * @private
     */
    _analyze() {
        if (!this.isActive) return;

        this.animationId = requestAnimationFrame(() => this._analyze());

        // Obtener datos de frecuencia
        this.analyser.getByteFrequencyData(this.dataArray);

        // Analizar rangos de frecuencia
        const frequencyData = this._analyzeFrequencyRanges();

        // Aplicar smoothing
        const smoothedData = this._applySmoothing(frequencyData);

        // Llamar al callback con los datos procesados
        if (this.onFrequencyUpdate) {
            this.onFrequencyUpdate(smoothedData);
        }
    }



    /**
     * Analiza diferentes rangos de frecuencia
     * @private
     * @returns {Object} Datos de frecuencia por rango
     */
    _analyzeFrequencyRanges() {
        const bass = this._getAverageFrequency(0, 60);        // 0-250 Hz
        const mid = this._getAverageFrequency(60, 180);       // 250-1000 Hz
        const treble = this._getAverageFrequency(180, 512);   // 1000+ Hz
        const overall = this._getAverageFrequency(0, 512);    // Todo el rango

        return {
            bass: bass / 255,           // Normalizado 0-1
            mid: mid / 255,
            treble: treble / 255,
            overall: overall / 255,
            peak: this._getPeakFrequency(),
            rawData: this.dataArray
        };
    }

    /**
     * Obtiene el promedio de frecuencia en un rango
     * @private
     */
    _getAverageFrequency(startIndex, endIndex) {
        let sum = 0;
        const count = endIndex - startIndex;

        for (let i = startIndex; i < endIndex; i++) {
            sum += this.dataArray[i];
        }

        return sum / count;
    }

    /**
     * Detecta el pico de frecuencia
     * @private
     */
    _getPeakFrequency() {
        let max = 0;
        for (let i = 0; i < this.bufferLength; i++) {
            if (this.dataArray[i] > max) {
                max = this.dataArray[i];
            }
        }
        return max / 255;
    }

    /**
     * Aplica smoothing a los datos para animaciones más fluidas
     * @private
     */
    _applySmoothing(data) {
        const smoothed = {
            bass: this._smooth(data.bass, this.previousValues.bass),
            mid: this._smooth(data.mid, this.previousValues.mid),
            treble: this._smooth(data.treble, this.previousValues.treble),
            overall: this._smooth(data.overall, this.previousValues.overall),
            peak: data.peak,
            rawData: data.rawData
        };

        // Actualizar valores anteriores
        this.previousValues = {
            bass: smoothed.bass,
            mid: smoothed.mid,
            treble: smoothed.treble,
            overall: smoothed.overall
        };

        return smoothed;
    }

    /**
     * Función de smoothing simple
     * @private
     */
    _smooth(current, previous) {
        return previous * this.smoothingFactor + current * (1 - this.smoothingFactor);
    }

    /**
     * Mapea datos de frecuencia a parámetros visuales
     * @param {Object} frequencyData 
     * @returns {Object} Parámetros para GSAP
     */
    mapToVisuals(frequencyData) {
        const { bass, mid, treble, overall, peak } = frequencyData;

        return {
            // Escala de la esfera (basada en overall)
            scale: 1 + overall * 0.5,

            // Intensidad del glow (basada en peak)
            glowIntensity: 0.5 + peak * 0.5,

            // Velocidad de rotación (basada en mid)
            rotationSpeed: mid * 3,

            // Distorsión X (basada en bass)
            distortionX: bass * 20,

            // Distorsión Y (basada en treble)
            distortionY: treble * 20,

            // Brillo general
            brightness: 1 + overall * 0.5,

            // Color shift (cambio de color basado en frecuencias)
            hueShift: (bass * 30 + mid * 30 + treble * 30) % 360
        };
    }

    /**
     * Limpia recursos
     */
    dispose() {
        this.stop();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        console.log('[AudioVisualizer] Recursos liberados');
    }
}

export default AudioVisualizer;
