import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * WhisperService - Servicio para transcripción de audio a texto usando Whisper API
 * Responsabilidad única: Convertir audio a texto
 */
class WhisperService {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
    this.model = 'whisper-1';
    this.language = 'es'; // Español por defecto

    console.log('[WhisperService] ✅ Configurado para español');
  }

  /**
   * Transcribe un archivo de audio a texto
   * @param {Buffer} audioBuffer - Buffer del archivo de audio
   * @param {string} filename - Nombre del archivo (con extensión)
   * @returns {Promise<string>} - Texto transcrito
   */
  async transcribeAudio(audioBuffer, filename = 'audio.webm') {
    try {
      console.log('[WhisperService] Iniciando transcripción...');

      // Guardar temporalmente el audio para la API
      const tempPath = path.join(__dirname, '..', 'temp', filename);
      const tempDir = path.dirname(tempPath);

      // Crear directorio temporal si no existe
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      fs.writeFileSync(tempPath, audioBuffer);

      // Crear stream de lectura para la API
      const audioFile = fs.createReadStream(tempPath);

      // Llamar a la API de Whisper
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: this.model,
        language: this.language,
        response_format: 'text'
      });

      // Limpiar archivo temporal
      fs.unlinkSync(tempPath);

      console.log('[WhisperService] Transcripción completada:', transcription);
      return transcription;

    } catch (error) {
      console.error('[WhisperService] Error en transcripción:', error);
      throw new Error(`Error al transcribir audio: ${error.message}`);
    }
  }

  /**
   * Valida que el formato de audio sea compatible
   * @param {string} mimetype - Tipo MIME del archivo
   * @returns {boolean}
   */
  isValidAudioFormat(mimetype) {
    const validFormats = [
      'audio/webm',
      'audio/wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/mp4',
      'audio/m4a',
      'audio/ogg'
    ];
    return validFormats.includes(mimetype);
  }
}

export default WhisperService;
