import OpenAI from 'openai';

/**
 * ChatGPTService - Servicio para usar OpenAI Assistants API
 * Responsabilidad única: Procesar texto usando el asistente configurado
 */
class ChatGPTService {
    constructor(apiKey) {
        this.openai = new OpenAI({ apiKey });
        this.assistantId = process.env.OPENAI_ASSISTANT_ID;
        this.model = 'gpt-4-turbo';
        this.maxTokens = 500;
        this.temperature = 0.7;

        // Thread management (cada conversación usa un thread)
        this.currentThreadId = null;

        if (!this.assistantId) {
            console.warn('[ChatGPTService] ⚠️ OPENAI_ASSISTANT_ID no configurado, usando chat normal en español');
        } else {
            console.log(`[ChatGPTService] ✅ Usando asistente: ${this.assistantId}`);
        }
    }

    /**
     * Envía un mensaje al asistente
     * @param {string} userMessage - Mensaje del usuario  
     * @returns {Promise<string>} - Respuesta del asistente
     */
    async sendMessage(userMessage) {
        try {
            console.log('[ChatGPTService] Procesando mensaje:', userMessage);

            // Si no hay assistant ID, usar chat normal como fallback
            if (!this.assistantId) {
                return await this._sendChatMessage(userMessage);
            }

            // Crear thread si no existe
            if (!this.currentThreadId) {
                const thread = await this.openai.beta.threads.create();
                this.currentThreadId = thread.id;
                console.log('[ChatGPTService] Thread creado:', this.currentThreadId);
            }

            // Añadir mensaje del usuario al thread
            await this.openai.beta.threads.messages.create(
                this.currentThreadId,
                {
                    role: 'user',
                    content: userMessage
                }
            );

            // Ejecutar el asistente
            const run = await this.openai.beta.threads.runs.create(
                this.currentThreadId,
                {
                    assistant_id: this.assistantId
                }
            );

            // Esperar a que complete
            let runStatus = await this.openai.beta.threads.runs.retrieve(
                this.currentThreadId,
                run.id
            );

            // Poll hasta que complete (max 30 segundos)
            let attempts = 0;
            const maxAttempts = 60; //30 segundos (500ms * 60)

            while (runStatus.status !== 'completed' && attempts < maxAttempts) {
                if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
                    throw new Error(`Run falló con estado: ${runStatus.status}`);
                }

                await new Promise(resolve => setTimeout(resolve, 500));
                runStatus = await this.openai.beta.threads.runs.retrieve(
                    this.currentThreadId,
                    run.id
                );
                attempts++;
            }

            if (runStatus.status !== 'completed') {
                throw new Error('Timeout esperando respuesta del asistente');
            }

            // Obtener mensajes del thread
            const messages = await this.openai.beta.threads.messages.list(
                this.currentThreadId
            );

            // El mensaje más reciente es la respuesta del asistente
            const assistantMessage = messages.data[0];
            const response = assistantMessage.content[0].text.value;

            console.log('[ChatGPTService] Respuesta recibida:', response);
            return response;

        } catch (error) {
            console.error('[ChatGPTService] Error al procesar mensaje:', error);
            throw new Error(`Error en ChatGPT: ${error.message}`);
        }
    }

    /**
     * Fallback a chat normal si no hay asistente configurado
     * @private
     */
    async _sendChatMessage(userMessage) {
        const completion = await this.openai.chat.completions.create({
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: 'Eres un asistente de servicio al cliente amigable y profesional. Responde SIEMPRE en español de manera concisa y natural para conversaciones de voz. Mantén tus respuestas breves y claras.'
                },
                {
                    role: 'user',
                    content: userMessage
                }
            ],
            max_tokens: this.maxTokens,
            temperature: this.temperature,
        });

        return completion.choices[0].message.content;
    }

    /**
     * Reinicia la conversación (crea un nuevo thread)
     */
    async resetConversation() {
        if (this.currentThreadId) {
            // Intentar eliminar el thread anterior (opcional)
            try {
                await this.openai.beta.threads.del(this.currentThreadId);
            } catch (error) {
                console.warn('[ChatGPTService] No se pudo eliminar thread anterior:', error.message);
            }
        }

        this.currentThreadId = null;
        console.log('[ChatGPTService] Conversación reiniciada');
    }

    /**
     * Obtiene el ID del thread actual
     * @returns {string|null}
     */
    getThreadId() {
        return this.currentThreadId;
    }
}

export default ChatGPTService;
