import axios from 'axios';

/**
 * ElevenLabsService - Servicio para conversión de texto a voz usando ElevenLabs API
 * Responsabilidad única: Convertir texto a audio de alta calidad
 */
class ElevenLabsService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.voiceId = process.env.ELEVENLABS_VOICE_ID; // Rachel por defecto
        this.model = 'eleven_multilingual_v2'; // Modelo multilingüe con mejor español
        this.voiceSettings = {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
        };
        this.outputFormat = 'mp3_44100_128';
        this.baseUrl = 'https://api.elevenlabs.io/v1';

        console.log(`[ElevenLabsService] ✅ Configurado con voz: ${this.voiceId} (multilingüe)`);
    }

    /**
     * Convierte texto a voz usando ElevenLabs
     * @param {string} text - Texto a convertir
     * @returns {Promise<Buffer>} - Buffer del audio generado
     */
    async textToSpeech(text) {
        try {
            console.log('[ElevenLabsService] Generando audio para texto:', text.substring(0, 50) + '...');

            const url = `${this.baseUrl}/text-to-speech/${this.voiceId}`;

            const response = await axios.post(
                url,
                {
                    text: text,
                    model_id: this.model,
                    voice_settings: this.voiceSettings
                },
                {
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': this.apiKey
                    },
                    responseType: 'arraybuffer',
                    timeout: 30000 // 30 segundos timeout
                }
            );

            console.log('[ElevenLabsService] Audio generado exitosamente');
            return Buffer.from(response.data);

        } catch (error) {
            console.error('[ElevenLabsService] Error al generar audio:', error.message);

            // Proporcionar información específica del error
            if (error.response) {
                console.error('[ElevenLabsService] Status Code:', error.response.status);
                console.error('[ElevenLabsService] Detalles del error:', error.response.data);
                console.error('[ElevenLabsService] Headers:', error.response.headers);

                const status = error.response.status;
                if (status === 401) {
                    throw new Error('ElevenLabs API key inválida - Verifica que tu API key sea correcta');
                } else if (status === 400) {
                    const detail = typeof error.response.data === 'object'
                        ? JSON.stringify(error.response.data)
                        : error.response.data;
                    throw new Error(`Bad Request a ElevenLabs (400): ${detail}`);
                } else if (status === 429) {
                    throw new Error('Límite de ElevenLabs alcanzado - sin créditos');
                } else if (status === 422) {
                    throw new Error('Texto inválido para ElevenLabs');
                }
            } else {
                console.error('[ElevenLabsService] Error de red o timeout:', error.code);
            }

            throw new Error(`Error en ElevenLabs: ${error.message}`);
        }
    }

    /**
     * Verifica si la API key es válida y tiene créditos
     * @returns {Promise<Object>} - Información de la cuenta
     */
    async checkCredits() {
        try {
            const response = await axios.get(`${this.baseUrl}/user`, {
                headers: {
                    'xi-api-key': this.apiKey
                }
            });

            const subscription = response.data.subscription;
            console.log('[ElevenLabsService] Créditos disponibles:', subscription.character_count, '/', subscription.character_limit);

            return {
                available: subscription.character_count,
                limit: subscription.character_limit,
                hasCredits: subscription.character_count < subscription.character_limit
            };

        } catch (error) {
            console.error('[ElevenLabsService] Error al verificar créditos:', error.message);
            throw new Error('No se pudo verificar el estado de ElevenLabs');
        }
    }

    /**
     * Lista las voces disponibles
     * @returns {Promise<Array>} - Lista de voces
     */
    async getAvailableVoices() {
        try {
            const response = await axios.get(`${this.baseUrl}/voices`, {
                headers: {
                    'xi-api-key': this.apiKey
                }
            });

            return response.data.voices.map(voice => ({
                id: voice.voice_id,
                name: voice.name,
                category: voice.category,
                labels: voice.labels
            }));

        } catch (error) {
            console.error('[ElevenLabsService] Error al obtener voces:', error.message);
            throw new Error('No se pudieron obtener las voces disponibles');
        }
    }
    /**
     * Genera audio en streaming desde ElevenLabs
     * @param {string} text - Texto a convertir
     * @returns {Promise<NodeJS.ReadableStream>} - Stream de audio
     */
    async streamTextToSpeech(text) {
        try {
            console.log('[ElevenLabsService] Iniciando streaming para:', text.substring(0, 50) + '...');

            const url = `${this.baseUrl}/text-to-speech/${this.voiceId}/stream`;

            const response = await axios.post(
                url,
                {
                    text: text,
                    model_id: this.model,
                    voice_settings: this.voiceSettings
                },
                {
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': this.apiKey
                    },
                    responseType: 'stream' // Importante para recibir stream
                }
            );

            return response.data;

        } catch (error) {
            console.error('[ElevenLabsService] Error en streaming:', error.message);
            if (error.response) {
                console.error('Detalles:', error.response.status);
            }
            throw error;
        }
    }
}

export default ElevenLabsService;
