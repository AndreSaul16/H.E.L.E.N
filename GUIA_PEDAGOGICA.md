# 📚 GUÍA PEDAGÓGICA DE H.E.L.E.N

**Una explicación completa y accesible para todos**

## 🎯 ¿Qué es H.E.L.E.N?

H.E.L.E.N (**H**erramienta **E**lectrónica de **L**lamadas, **E**ventos y **N**otificaciones) es un asistente virtual con el que puedes hablar naturalmente, como si fuera una persona real. No necesitas escribir ni presionar botones: solo hablas y ella te escucha, entiende y responde con voz.

**Ejemplo de uso:**
1. Abres la aplicación en tu navegador
2. Haces click en la esfera que aparece
3. Empiezas a hablar: "Hola, ¿cómo estás?"
4. H trabajar para ti

---

## 🧩 Las Piezas del Proyecto (Componentes)

Imagina que H.E.L.E.N es como una orquesta, donde cada músico tiene un papel específico:

### 1. 👂 El "Oído" (VAD - Voice Activity Detection)

**¿Qué hace?**
Detecta cuando empiezas y terminas de hablar

**Analogía:**
Es como un micrófono inteligente que sabe cuándo abrir y cerrar. Si estás en silencio, no envía nada. Cuando hablas, empieza a grabar. Cuando te callas por 1 segundo, entiende que terminaste y envía lo que dijiste.

**En código simple:**
```javascript
// El VAD escucha constantemente el micrófono
VAD.onSpeechStart(() => {
    console.log("Usuario empezó a hablar");
    // Empieza a grabar
});

VAD.onSpeechEnd(() => {
    console.log("Usuario dejó de hablar");
    // Termina de grabar y envía el audio
});
```

**Archivos relacionados:**
- `frontend/audioCapture.js` (líneas 144-285)

---

### 2. 🎤 El "Traductor de Voz a Texto" (Whisper)

**¿Qué hace?**
Convierte tu voz en texto escrito

**Analogía:**
Es como un secretario súper rápido que escucha lo que dices y lo escribe palabra por palabra en menos de 1 segundo.

**Ejemplo:**
- Tú dices: "Hola buenos días"
- Whisper escribe: `"Hola buenos días"`

**En código simple:**
```javascript
// Recibe el audio y lo convierte a texto
async function transcribirAudio(audio) {
    const texto = await whisper.transcribe(audio);
    console.log("Usuario dijo:", texto);
    return texto;
}
```

**Archivos relacionados:**
- `backend/services/WhisperService.js` (líneas 11-45)

---

### 3. 🧠 El "Cerebro" (ChatGPT)

**¿Qué hace?**
Entiende lo que dijiste y decide qué responder

**Analogía:**
Es como un amigo muy inteligente que:
1. Lee lo que escribió el secretario (Whisper)
2. Lo entiende en contexto
3. Piensa una respuesta apropiada
4. La escribe para que otra persona la lea

**Ejemplo:**
- Texto que llega: `"¿Qué hora es?"`
- ChatGPT piensa: "El usuario quiere saber la hora actual"
- ChatGPT responde: `"Son las 3:45 de la tarde"`

**En código simple:**
```javascript
// Envía el texto a ChatGPT y obtiene una respuesta
async function obtenerRespuesta(textoDelUsuario) {
    const respuesta = await chatgpt.sendMessage(textoDelUsuario);
    console.log("ChatGPT responde:", respuesta);
    return respuesta;
}
```

**Archivos relacionados:**
- `backend/services/ChatGPTService.js` (líneas 25-102)

---

### 4. 🔊 El "Locutor" (ElevenLabs)

**¿Qué hace?**
Convierte el texto de la respuesta en voz que puedes escuchar

**Analogía:**
Es como un locutor profesional de radio que lee el texto que escribió ChatGPT y lo dice con una voz natural y expresiva.

**Ejemplo:**
- Texto: `"Son las 3:45 de la tarde"`
- ElevenLabs dice: 🔊 "Son las tres cuarenta y cinco de la tarde"

**En código simple:**
```javascript
// Convierte texto a voz
async function convertirTextoAVoz(texto) {
    const audio = await elevenlabs.textToSpeech(texto);
    // Reproduce el audio
    reproducir(audio);
}
```

**Archivos relacionados:**
- `backend/services/ElevenLabsService.js` (líneas 19-89)

---

### 5. 📡 El "Cartero" (WebSocket)

**¿Qué hace?**
Lleva mensajes entre tu navegador y el servidor de forma instantánea

**Analogía:**
Es como un cartero súper rápido que:
- Va de tu casa (navegador) al servidor
- Lleva tu audio grabado
- Trae la respuesta en voz
- Todo en tiempo real, como una llamada telefónica

**Diferencia con HTTP normal:**
- **HTTP**: Es como enviar una carta y esperar la respuesta (lento)
- **WebSocket**: Es como una llamada telefónica (instantáneo y bidireccional)

**En código simple:**
```javascript
// En el navegador (frontend)
socket.emit('audio-data', miAudio); // Envía audio al servidor

// En el servidor (backend)
socket.on('audio-data', (audio) => {
    // Procesa el audio y envía la respuesta
});
```

**Archivos relacionados:**
- `backend/routes/socketHandler.js` (todo el archivo)
- `frontend/app.js` (líneas 93-173)

---

### 6. 🎨 La "Interfaz Visual" (Frontend)

**¿Qué hace?**
Muestra la esfera con la que interactúas y las animaciones

**Componentes visuales:**

#### a) Esfera 3D
La esfera grande en el centro que pulsa al ritmo de la voz

**En código:**
```javascript
// Hace que la esfera crezca y se encoja
function animarEsfera(intensidadDeVoz) {
    const escala = 1 + (intensidadDeVoz * 0.5); // Más voz = más grande
    esfera.scale.set(escala, escala, escala);
}
```

#### b) Sistema de Partículas
Las pequeñas esferas que flotan alrededor y reaccionan al audio

**En código:**
```javascript
// Cada partícula se mueve según el audio
function actualizarParticulas(frecuenciasDeAudio) {
    particulas.forEach((particula, indice) => {
        const frecuencia = frecuenciasDeAudio[indice];
        particula.y += frecuencia * 0.1; // Sube según la frecuencia
    });
}
```

#### c) Visualizador de Audio
Analiza el audio para crear las animaciones

**Cómo funciona:**
1. Toma el audio (tu voz o la de H.E.L.E.N)
2. Lo divide en frecuencias (graves, medios, agudos)
3. Usa esas frecuencias para mover la esfera y las partículas

**Archivos relacionados:**
- `frontend/app.js` (gestión general)
- `frontend/particleSystem.js` (partículas)
- `frontend/audioVisualizer.js` (análisis de audio)

---

## 🔄 El Flujo Completo (Paso a Paso)

Veamos qué pasa desde que hablas hasta que escuchas la respuesta:

### Paso 1: Inicio 🚀
```
Usuario → Hace click en la esfera
Frontend → Activa el micrófono
VAD → Empieza a escuchar
```

### Paso 2: Hablas 🎤
```
Usuario → "Hola, ¿cómo estás?"
VAD → Detecta voz, graba
VAD → Detecta 1 segundo de silencio
VAD → Dice "usuario terminó de hablar"
```

### Paso 3: Envío al Servidor 📤
```
Frontend → Convierte grabación a formato WAV
Frontend → Envía por WebSocket al backend
Backend → Recibe el audio
```

### Paso 4: Transcripción 📝
```
Backend → Envía audio a Whisper
Whisper → "Hola, ¿cómo estás?"
Backend → Recibe el texto
Backend → Envía texto al frontend (para mostrarlo)
```

### Paso 5: Pensamiento 🧠
```
Backend → Envía texto a ChatGPT
ChatGPT → Piensa la respuesta
ChatGPT → "¡Hola! Estoy muy bien, gracias por preguntar. ¿En qué puedo ayudarte hoy?"
Backend → Recibe respuesta
```

### Paso 6: Conversión a Voz 🔊
```
Backend → Envía texto a ElevenLabs
ElevenLabs → Genera audio de la voz
ElevenLabs → Envía en "chunks" (pedazos pequeños)
Backend → Acumula los chunks
Backend → Cuando tiene suficientes, los envía al frontend
```

### Paso 7: Reproducción ▶️
```
Frontend → Recibe chunks de audio
Frontend → Los combina en un solo archivo
Frontend → Decodifica el audio
Frontend → Reproduce la voz de H.E.L.E.N
Frontend → Mueve las partículas al ritmo de la voz
```

### Paso 8: Ciclo Continúa 🔄
```
VAD → Sigue escuchando
Usuario → Puede responder inmediatamente
... El ciclo se repite ...
```

---

## 📂 Estructura de Archivos Explicada

```
H.E.L.E.N/
│
├── backend/                          # El "servidor" - Procesa todo
│   ├── server.js                    # Punto de entrada, inicia todo
│   ├── routes/
│   │   └── socketHandler.js         # Maneja la comunicación WebSocket
│   └── services/                     # Los "expertos" en cada tarea
│       ├── WhisperService.js        # Voz → Texto
│       ├── ChatGPTService.js        # Piensa las respuestas
│       └── ElevenLabsService.js     # Texto → Voz
│
├── frontend/                         # Lo que ves en el navegador
│   ├── index.html                   # La página web
│   ├── styles.css                   # Los colores y estilos
│   ├── app.js                       # Coordina toda la funcionalidad
│   ├── audioCapture.js              # Captura tu voz con VAD
│   ├── audioVisualizer.js           # Analiza el audio
│   └── particleSystem.js            # Las partículas flotantes
│
├── .env                              # Configuración secreta (API keys)
├── .gitignore                        # Qué NO subir a GitHub
├── package.json                      # Lista de dependencias del proyecto
└── README.md                         # Documentación principal
```

---

## 🔑 Conceptos Clave Para Entender

### 1. **API (Application Programming Interface)**

**¿Qué es?**
Una forma de que dos programas hablen entre sí.

**Analogía:**
Es como el menú de un restaurante:
- Tú (el programa) pides un plato (una función)
- La cocina (el servicio) lo prepara
- Te lo traen (devuelve el resultado)

**Ejemplo en H.E.L.E.N:**
```javascript
// Pedimos a la API de Whisper que transcriba
const texto = await whisper.transcribe(audio);
// Whisper "prepara" la transcripción y nos la devuelve
```

### 2. **Async/Await (Asíncrono)**

**¿Qué es?**
Una forma de esperar a que algo termine sin bloquear todo.

**Analogía:**
Es como pedir una pizza a domicilio:
- Llamas y pides (async)
- Mientras tanto, haces otras cosas
- Cuando llega (await), la comes

**Sin async:**
```javascript
// Tienes que esperar sin hacer nada (bloquea)
const respuesta = obtenerRespuesta(); // Esperas 5 segundos parado
console.log(respuesta);
```

**Con async/await:**
```javascript
//Puedes hacer otras cosas mientras esperas
async function procesar() {
    const respuesta = await obtenerRespuesta(); // Esperas, pero no bloqueas
    console.log(respuesta);
}
```

### 3. **Callback1994** (Función de Retrollamada)**

**¿Qué es?**
Una función que se ejecuta cuando algo específico sucede.

**Analogía:**
Es como decirle a alguien: "Cuando suene el timbre, abre la puerta"

**Ejemplo en H.E.L.E.N:**
```javascript
// Cuando el VAD detecte voz, ejecuta esta función
VAD.onSpeechStart(() => {
    console.log("¡Empezó a hablar!");
});
```

### 4. **WebSocket vs HTTP**

**HTTP** (Como enviar cartas):
```
Cliente: "¿Qué hora es?"
[Espera...]
Servidor: "Son las 3pm"
[Conexión se cierra]
```

**WebSocket** (Como una llamada telefónica):
```
Cliente: "¿Qué hora es?"
Servidor: "Son las 3pm"
Cliente: "Gracias"
Servidor: "De nada"
[Conexión permanece abierta]
```

### 5. **Buffer** (Búfer/Almacenamiento Temporal)

**¿Qué es?**
Un lugar temporal donde guardas datos antes de usarlos.

**Analogía:**
Es como llenar un vaso de agua antes de beberla. No bebes directo de la manguera,sino que llenas el vaso (buffer) primero.

**En H.E.L.E.N:**
```javascript
// Acumulamos chunks de audio antes de reproducirlos
this.audioQueue.push(nuevoChunk); // Añadimos al buffer
// Cuando tenemos suficientes...
reproducirTodo(this.audioQueue); // Reproducimos el buffer completo
```

---

## 🎓 Línea por Línea: Código Explicado

### Ejemplo 1: Iniciando la Conversación

**Archivo:** `frontend/app.js` (líneas 280-295)

```javascript
// Esta función se ejecuta cuando haces click en la esfera
async handleSphereClick() {
    // Si estamos en estado inicial (idle = inactivo)
    if (this.currentState === 'idle') {
        // Empezamos una conversación con VAD
        await this.startVADConversation();
    } else {
        // Si ya estamos hablando, detenemos todo
        await this.stopVADConversation();
    }
}
```

**Explicación:**
- `handleSphereClick`: Nombre de la función (qué hacer cuando clickeas)
- `async`: Indica que esta función puede esperar cosas (como async=asíncrono)
- `if (this.currentState === 'idle')`: Pregunta "¿estamos inactivos?"
- `await`: Espera a que termine antes de continuar
- `else`: Si no estamos inactivos, entonces...

### Ejemplo 2: Detectando Voz

**Archivo:** `frontend/audioCapture.js` (líneas 173-179)

```javascript
onSpeechStart: () => {
    // Cuando el VAD detecta que empezaste a hablar
    console.log('🟢 [VAD] Inicio de voz detectado');
    
    // Guardamos cuándo empezaste a hablar
    this.lastSpeechTimestamp = Date.now();
    
    // Avisamos al resto de la aplicación
    this.onSpeechStart();
},
```

**Explicación:**
- `onSpeechStart`: Se ejecuta cuando detecta voz
- `console.log`: Escribe un mensaje en la consola del navegador (F12)
- `Date.now()`: Obtiene la hora actual en milisegundos
- `this.lastSpeechTimestamp`: Guarda cuándo empezaste a hablar

### Ejemplo 3: Enviando Audio al Servidor

**Archivo:** `frontend/app.js` (líneas 433-461)

```javascript
async sendAudioToServer(audioBlob) {
    // 1. Verificamos que el WebSocket esté conectado
    if (!this.socket || !this.socket.connected) {
        // Si no está conectado, mostramos un error
        console.error('❌ WebSocket no conectado');
        return; // Salimos de la función
    }
    
    // 2. Convertimos el audio a un formato que podemos enviar
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // 3. Lo enviamos por WebSocket
    this.socket.emit('audio-data', {
        audio: arrayBuffer,
        mimeType: 'audio/wav'
    });
    
    // 4. Avisamos que se envió correctamente
    console.log('✅ Audio enviado');
}
```

**Explicación:**
- `audioBlob`: El audio grabado (como un archivo)
- `!this.socket.connected`: El símbolo `!` significa "NO", entonces pregunta "¿NO está conectado?"
- `return`: Sale de la función inmediatamente
- `arrayBuffer()`: Convierte el audio a bytes puros
- `emit`: "Emite" o envía el mensaje por WebSocket

### Ejemplo 4: Recibiendo la Transcripción

**Archivo:** `frontend/app.js` (líneas 111-116)

```javascript
this.socket.on('transcript', (data) => {
    // Cuando recibimos el texto transcrito desde el servidor
    console.log('📝 Transcripción:', data.text);
    
    // Mostramos el texto en la pantalla
    this.showTranscript(data.text);
    
    // Cambiamos el estado a "pensando"
    this.setState('thinking');
});
```

**Explicación:**
- `.on('transcript',...)`: "Cuando recibas un mensaje llamado 'transcript', ejecuta esto"
- `(data) =>`: Los datos que vienen del servidor
- `data.text`: El texto dentro de los datos
- `this.showTranscript()`: Función que muestra el texto en pantalla

### Ejemplo 5: Reproduciendo el Audio

**Archivo:** `frontend/app.js` (líneas 206-264)

```javascript
async playAllAudioAtOnce() {
    // 1. Verificamos que tengamos audio para reproducir
    if (this.audioQueue.length === 0) {
        console.log('⚠️ No hay audio');
        return;
    }
    
    // 2. Combinamos todos los pedazos de audio en uno solo
    const combinedBlob = new Blob(this.audioQueue, { 
        type: 'audio/mpeg' 
    });
    
    // 3. Lo convertimos a un formato que el navegador puede reproducir
    const arrayBuffer = await combinedBlob.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    
    // 4. Creamos un "reproductor" de audio
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    
    // 5. Lo reproducimos
    source.start(0);
    
    // 6. Cuando termine, volvemos al estado de "escuchando"
    source.onended = () => {
        this.setState('listening');
    };
}
```

**Explicación:**
- `this.audioQueue`: La "cola" donde guardamos pedazos de audio
- `new Blob()`: Crea un "bloque" de datos (el audio completo)
- `decodeAudioData()`: Convierte bytes a datos de audio que se pueden reproducir
- `createBufferSource()`: Crea un reproductor virtual
- `.start(0)`: Empieza a reproducir desde el segundo 0
- `onended`: Cuando termine de reproducir, ejecuta esto

---

## 🎨 Cómo Funcionan las Animaciones

### Las Partículas

**Archivo:** `frontend/particleSystem.js`

```javascript
// Cada partícula es como una pequeña esfera flotante
class Particle {
    constructor(x, y, z) {
        this.x = x; // Posición horizontal
        this.y = y; // Posición vertical
        this.z = z; // Profundidad
        this.velocityY = Math.random() * 0.02; // Qué tan rápido sube/baja
    }
    
    update(audioData) {
        // Movemos la partícula según el audio
        const intensity = audioData[this.index]; // Intensidad del audio en esta frecuencia
        this.y += this.velocityY + (intensity * 0.1); // Súbela más si hay sonido fuerte
        
        // Si se sale de la pantalla, la regresamos
        if (this.y > 10) {
            this.y = -10;
        }
    }
}
```

**¿Cómo se ve?**
```
Sin audio:      Con audio fuerte:
  . .              . . .
 .   .            .     .
.     .          .   ↑   .
 .   .            . ↑ ↑ .
  . .              .  ↑  .
```

### El Análisis de Audio

**Archivo:** `frontend/audioVisualizer.js`

```javascript
// Analizamos el audio para obtener las frecuencias
getFrequencyData() {
    // 1. Obtenemos los datos del audio del micrófono
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // 2. El dataArray ahora tiene 128 números (0-255)
    // Cada número representa una frecuencia diferente:
    // [graves, graves, medios, medios, ..., agudos, agudos]
    
    // 3. Los devolvemos para usarlos en las animaciones
    return this.dataArray;
}
```

**Visualización de frecuencias:**
```
Frecuencias bajas (graves):    |████████|
Frecuencias medias:            |██████  |
Frecuencias altas (agudos):    |████    |
```

---

## 🌟 Casos de Uso Reales

### Caso 1: Pregunta Simple

**Usuario habla:** "Hola, ¿cuál es tu nombre?"

1. **VAD detecta** voz durante 2 segundos
2. **VAD detecta** 1 segundo de silencio → envía audio
3. **Whisper transcribe:** `"Hola, ¿cuál es tu nombre?"`
4. **ChatGPT responde:** `"Mi nombre es H.E.L.E.N, soy tu asistente virtual. ¿En qué puedo ayudarte?"`
5. **ElevenLabs genera voz** de la respuesta
6. **Frontend reproduce** la voz con animaciones

**Tiempo total:** ~3-4 segundos

### Caso 2: Conversación Larga

**Usuario:** "Cuéntame un chiste"
**H.E.L.E.N:** "¿Por qué los pájaros no usan Facebook? Porque ya tienen Twitter"
**Usuario:** (se ríe) "Tienes más?"
**H.E.L.E.N:** "Claro! ¿Qué le dice...

(La conversación continúa automáticamente sin necesidad de clicks)

---

## 🔧 Configuración y Personalización

### Cambiar la Voz

**Archivo:** `.env`

```env
# Cambiar a otra voz de ElevenLabs
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Rachel (inglés)
ELEVENLABS_VOICE_ID=qHkrJuifPpn95wK3rm2A  # Carmen (español)
```

### Ajustar Sensibilidad del VAD

**Archivo:** `frontend/audioCapture.js` (línea 158)

```javascript
positiveSpeechThreshold: 0.5,  // Valores: 0.0 - 1.0
// Más bajo (0.3) = Más sensible (detecta susurros)
// Más alto (0.8) = Menos sensible (solo voz clara)
```

### Cambiar Tiempo de Silencio

**Archivo:** `frontend/audioCapture.js` (Línea 322)

```javascript
const SILENCE_THRESHOLD = 1000; // milisegundos
// 500ms = Más rápido pero puede cortar palabras
// 2000ms = Más lento pero más preciso
```

---

## 🐛 Solución de Problemas Comunes

### Problema 1: "No escucha mi voz"

**Posibles causas:**
1. Permisos de micrófono bloqueados
   - **Solución:** Permitir micrófono en el navegador (click en el icono de candado en la barra de direcciones)

2. VAD muy poco sensible
   - **Solución:** Bajar el `positiveSpeechThreshold` a 0.3

3. Micrófono no detectado
   - **Solución:** Verificar que funciona en otras apps

### Problema 2: "Se corta mientras hablo"

**Causa:** Tiempo de silencio muy corto

**Solución:**
Aumentar `SILENCE_THRESHOLD` a 1500ms o 2000ms

### Problema 3: "El audio suena entrecortado"

**Causa:** Chunks muy pequeños o conexión lenta

**Solución:**
En `backend/routes/socketHandler.js`, aumentar `MIN_CHUNK_SIZE` a 2000

---

## 📖 Glosario de Términos

- **API**: Forma de que dos programas se comuniquen
- **Async/Await**: Esperar sin bloquear
- **Backend**: El servidor, lo que procesa en segundo plano
- **Blob**: Un "pedazo" de datos (como un archivo)
- **Buffer**: Almacenamiento temporal
- **Callback**: Función que se ejecuta cuando pasa algo
- **CDN**: Servidor de donde se descargan librerías
- **Chunk**: Pedazo pequeño de datos
- **Frontend**: Lo que ves en el navegador
- **npm**: Gestor de paquetes de Node.js
- **Socket**: Conexión de red (como un cable virtual)
- **STT**: Speech-to-Text (voz a texto)
- **TTS**: Text-to-Speech (texto a voz)
- **VAD**: Voice Activity Detection (detección de actividad de voz)
- **WebSocket**: Conexión bidireccional en tiempo real

---

## 🎓 Próximos Pasos Para Aprender

1. **Experimenta cambiando valores** en los archivos
2. **Lee los console.log** en la consola del navegador (F12)
3. **Modifica los mensajes** de console.log para entender el flujo
4. **Cambia los tiempos** de animación y observa qué pasa
5. **Lee el código línea por línea** siguiendo esta guía

---

## 🤝 Contribuir

¿Encontraste algo confuso en esta guía? 
¿Tienes sugerencias para mejorarla?

**Abre un issue en GitHub** con:
- Qué parte no entendiste
- Qué te gustaría que se explicara mejor
- Errores o inconsistencias

---

*Esta guía está en constante evolución. Última actualización: Diciembre 2024*
