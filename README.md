# 🎙️ VoiceAI Game - Singularidad Conversacional

Aplicación web de conversación por voz en tiempo real que integra **Whisper** (Speech-to-Text), **ChatGPT** (IA conversacional) y **ElevenLabs/CoquiTTS** (Text-to-Speech) con una interfaz visual impresionante.

## ✨ Características

- 🌐 **Interfaz Minimalista**: Esfera 3D interactiva como elemento central único
- 🎵 **Visualización de Audio en Tiempo Real**: La esfera reacciona al ritmo de las voces
- 🎨 **Animaciones Premium**: GSAP con efectos de expansión, distorsión y pulsación
- 🎤 **STT con Whisper**: Transcripción precisa de voz a texto en español
- 🤖 **ChatGPT**: Respuestas conversacionales inteligentes
- 🔊 **TTS Dual**: ElevenLabs como primario y CoquiTTS local como respaldo
- 🌌 **Partículas Flotantes**: Fondo animado con efecto de singularidad
- 📱 **Diseño Responsivo**: Funciona en desktop y móvil
- 🛡️ **Arquitectura Modular**: Código limpio siguiendo principios SOLID

## 🎯 Flujo de Conversación

1. **Click en la esfera** → Se expande e inicia la grabación
2. **Habla** → La esfera reacciona a tu voz en tiempo real
3. **Click nuevamente** → Detiene grabación y procesa
4. **Whisper** → Transcribe tu audio a texto
5. **ChatGPT** → Genera una respuesta inteligente
6. **ElevenLabs** → Convierte la respuesta a voz (con fallback a CoquiTTS)
7. **Reproducción** → La esfera se mueve al ritmo de la respuesta

## 📋 Requisitos Previos

- **Node.js** 16 o superior
- **npm** o **yarn**
- **API Keys**:
  - OpenAI API Key (para Whisper + ChatGPT)
  - ElevenLabs API Key (para TTS premium)

## 🚀 Instalación

### 1. Clonar o descargar el proyecto

```bash
cd VoiceAIGame
```


### 4. Configurar modelos (opcional)

Puedes personalizar los modelos en `backend/config/appsettings.json`:

```json
{
  "openai": {
    "model": "gpt-4-turbo-preview",
    "whisperModel": "whisper-1",
    "maxTokens": 500,
    "temperature": 0.7
  },
  "elevenlabs": {
    "model": "eleven_turbo_v2",
    "voiceSettings": {
      "stability": 0.5,
      "similarity_boost": 0.75
    }
  }
}
```

## 🎮 Uso

### Iniciar el servidor

```bash
npm run dev
```

El servidor se iniciará en `http://localhost:3000`

### Usar la aplicación

1. Abre tu navegador en `http://localhost:3000`
2. Permite el acceso al micrófono
3. **Click en la esfera central** para iniciar
4. **Habla** y observa cómo la esfera reacciona
5. **Click nuevamente** para detener y procesar
6. Escucha la respuesta mientras la esfera se mueve al ritmo

### Verificar estado de servicios

```bash
curl http://localhost:3000/api/status
```

## 🏗️ Arquitectura del Proyecto

```
VoiceAIGame/
├── backend/
│   ├── server.js                 # Servidor Express principal
│   ├── config/
│   │   └── appsettings.json      # Configuración de modelos
│   ├── routes/
│   │   └── conversationRoutes.js # Endpoint /api/conversar
│   ├── services/
│   │   ├── WhisperService.js     # STT con Whisper API
│   │   ├── ChatGPTService.js     # Conversación con ChatGPT
│   │   └── ElevenLabsService.js  # TTS con ElevenLabs
│   └── temp/                     # Archivos temporales (auto-generado)
├── frontend/
│   ├── index.html                # Interfaz minimalista
│   ├── styles.css                # Estilos de esfera y animaciones
│   ├── app.js                    # Lógica principal de la app
│   └── audioVisualizer.js        # Análisis de audio en tiempo real
├── .env                          # Variables de entorno (NO COMMITEAR)
├── .gitignore
├── package.json
└── README.md
```

### Servicios Backend (Módulos SOLID)

| Servicio | Responsabilidad |
|----------|----------------|
| `WhisperService` | Transcribir audio a texto |
| `ChatGPTService` | Generar respuestas conversacionales |
| `ElevenLabsService` | Convertir texto a voz (premium) |

### Frontend (Reactivo y Visual)


**Request:**
```
FormData con campo 'audio' (archivo de audio)
```

**Response:**
```json
{
  "success": true,
  "transcript": "texto transcrito por whisper",
  "response": "respuesta de chatgpt",
  "audio": "base64-encoded-audio",
  "ttsProvider": "elevenlabs" | "coqui-client",
  "processingTime": 1234
}
```

### `GET /api/status`

Verifica el estado de los servicios.

**Response:**
```json
{
  "whisper": "OK",
  "chatgpt": "OK",
  "elevenlabs": "OK",
  "elevenLabsCredits": {
    "available": 12345,
    "limit": 50000,
    "hasCredits": true
  }
}
```

### `POST /api/reset`

Reinicia el historial de conversación.

## 🎭 Personalización

### Cambiar la voz de ElevenLabs

1. Obtén las voces disponibles:
```bash
curl -X GET https://api.elevenlabs.io/v1/voices \
  -H "xi-api-key: TU_API_KEY"
```

2. Actualiza `ELEVENLABS_VOICE_ID` en `.env`

### Ajustar colores de la esfera

Edita las variables CSS en `frontend/styles.css`:

```css
:root {
  --primary-purple: #a855f7;
  --primary-cyan: #06b6d4;
  --primary-pink: #ec4899;
  --glow-color: rgba(168, 85, 247, 0.6);
}
```

### Modificar parámetros de ChatGPT

Edita `backend/config/appsettings.json`:

```json
{
  "openai": {
    "temperature": 0.7,  // Creatividad (0-2)
    "maxTokens": 500,    // Longitud máxima
    "systemPrompt": "Tu personalización aquí"
  }
}
```

## 🐛 Troubleshooting

### La esfera no reacciona

- Verifica que has permitido el acceso al micrófono
- Abre la consola del navegador (F12) para ver errores
- Asegúrate de que el servidor está corriendo

### Error "No se pudo acceder al micrófono"

- El navegador necesita **HTTPS** o **localhost**
- Verifica permisos del navegador
- Intenta con Chrome/Edge (mejor soporte de Web Audio API)

### ElevenLabs no funciona

- Verifica tu API key en `.env`
- Revisa créditos disponibles: `GET /api/status`
- El sistema usará CoquiTTS local como respaldo (próximamente)

### El audio no se reproduce

- Verifica que el navegador soporta `audio/mpeg`
- Revisa la consola para errores de CORS
- Asegúrate de que el audio se generó correctamente

## 🔮 Próximas Características (TODO)

- [ ] **CoquiTTS Local con WebGPU**: TTS completamente offline
- [ ] **Streaming End-to-End**: Respuestas en tiempo real
- [ ] **Historial de Conversaciones**: Persistencia con LocalStorage
- [ ] **Temas Personalizables**: Dark/Light/Custom
- [ ] **Soporte Multiidioma**: Automático según idioma detectado
- [ ] **Análisis de Sentimiento**: Cambio de colores según emoción

## 📝 Licencia

MIT License - Siéntete libre de usar y modificar.

## 🙏 Créditos

- **OpenAI**: Whisper y ChatGPT
- **ElevenLabs**: Text-to-Speech premium
- **GSAP**: Animaciones fluidas
- **Tailwind CSS**: Estilos utility-first

---

**Desarrollado con ❤️ para crear experiencias conversacionales inmersivas**

🌟 Si te gusta este proyecto, ¡dale una estrella en GitHub!
