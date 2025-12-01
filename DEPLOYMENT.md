# 🚀 GUÍA DE DEPLOYMENT

## Despliegue de H.E.L.E.N a Producción

Esta guía te ayudará a desplegar tu frontend y backend en servicios gratuitos/económicos.

---

## 📋 Tabla de Contenidos

1. [Arquitectura de Deployment](#arquitectura-de-deployment)
2. [Frontend: Netlify/Vercel](#frontend-netlifyvercel)
3. [Backend: Opciones](#backend-opciones)
4. [Configuración Recomendada](#configuración-recomendada-render)
5. [Variables de Entorno](#variables-de-entorno)
6. [Troubleshooting](#troubleshooting)

---

## 🏗️ Arquitectura de Deployment

```
┌─────────────────────────────────────────────────┐
│                   USUARIO                        │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌───────────────┐   ┌───────────────┐
│   Frontend    │   │   Backend     │
│   (Netlify)   │   │   (Render)    │
│               │   │               │
│ Static Files  │   │ Node.js +     │
│ + Vite Build  │   │ Socket.IO     │
└───────────────┘   └───────┬───────┘
                            │
                    ┌───────┴────────┐
                    │                │
                    ▼                ▼
            ┌──────────────┐  ┌────────────┐
            │ OpenAI API   │  │ ElevenLabs │
            │ (Whisper+GPT)│  │    API     │
            └──────────────┘  └────────────┘
```

---

## 🌐 Frontend: Netlify/Vercel

### Opción 1: Netlify (Recomendado)

**Ventajas**:
- ✅ Tier gratuito generoso
- ✅ Auto-deploy desde GitHub
- ✅ SSL/HTTPS automático
- ✅ CDN global
- ✅ Fácil configuración

**Pasos de Deployment**:

1. **Preparar el proyecto**

Crea `netlify.toml` en la raíz:

```toml
[build]
  command = "npm run build"
  publish = "frontend/dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "20"
```

Asegúrate de que `package.json` tenga:

```json
{
  "scripts": {
    "build": "vite build --outDir frontend/dist"
  }
}
```

2. **Desplegar en Netlify**

**Método 1: Netlify UI**
```bash
# 1. Ve a https://app.netlify.com
# 2. Click en "Add new site" > "Import an existing project"
# 3. Conecta con GitHub
# 4. Selecciona el repo H.E.L.E.N
# 5. Configuración:
#    - Build command: npm run build
#    - Publish directory: frontend/dist
# 6. Deploy!
```

**Método 2: Netlify CLI**
```bash
# Instalar CLI
npm install -g netlify-cli

# Login
netlify login

# Inicializar
netlify init

# Deploy
netlify deploy --prod
```

3. **Configurar Variables de Entorno**

En Netlify Dashboard:
```
Site Settings > Environment Variables > Add variable

VITE_BACKEND_URL=https://tu-backend.onrender.com
```

Actualiza `frontend/app.js`:

```javascript
// Cambiar la URL del WebSocket según el entorno
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

this.socket = window.io(BACKEND_URL, {
    transports: ['websocket', 'polling'],
    secure: true
});
```

### Opción 2: Vercel

Similar a Netlify, pero con `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "frontend/dist",
  "framework": "vite"
}
```

---

## 🖥️ Backend: Opciones

### Comparativa de Servicios

| Servicio | WebSocket | Tier Gratuito | Pros | Contras |
|----------|-----------|---------------|------|---------|
| **Render** ⭐ | ✅ | Sí | Fácil, auto-deploy, HTTPS | Sleep después de 15min inactividad |
| **Railway** | ✅ | $5/mes crédito | Muy rápido, buena UX | Se acaba el crédito |
| **Fly.io** | ✅ | Sí | Global, rápido | CLI solo, más complejo |
| **Heroku** | ✅ | ❌ (desde 2022) | Robusto, maduro | Mínimo $7/mes |
| **DigitalOcean** | ✅ | ❌ | Control total | $5/mes mínimo |
| **Vercel/Netlify Functions** | ❌ | Sí | Serverless | NO soporta WebSocket |

---

## ⭐ Configuración Recomendada: Render

### ¿Por qué Render?

- ✅ Soporta WebSocket/Socket.IO nativamente
- ✅ Tier gratuito (con sleep en inactividad)
- ✅ Auto-deploy desde GitHub
- ✅ SSL/HTTPS automático
- ✅ Variables de entorno seguras
- ✅ Logs en tiempo real

### Paso a Paso: Render

#### 1. Preparar el Proyecto

**a) Crear `render.yaml`** (opcional, para infraestructura como código):

```yaml
services:
  - type: web
    name: helen-backend
    env: node
    region: frankfurt  # o oregon, singapore
    plan: free
    buildCommand: npm install
    startCommand: node backend/server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: OPENAI_API_KEY
        sync: false
      - key: OPENAI_ASSISTANT_ID
        sync: false
      - key: ELEVENLABS_API_KEY
        sync: false
      - key: ELEVENLABS_VOICE_ID
        sync: false
```

**b) Actualizar `backend/server.js`** para producción:

```javascript
// CORS configuration para producción
const corsOptions = {
    origin: [
        'http://localhost:5173',
        'https://tu-app.netlify.app',  // Tu dominio de Netlify
        process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST']
};

const io = new Server(server, {
    cors: corsOptions,
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// Puerto dinámico
const PORT = process.env.PORT || 4000;
```

**c) Añadir health check endpoint**:

```javascript
// En server.js, antes de las rutas de Socket.IO
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});
```

#### 2. Desplegar en Render

**Método 1: Render Dashboard**

```bash
# 1. Ve a https://dashboard.render.com
# 2. Sign up/Login con GitHub
# 3. New > Web Service
# 4. Conecta tu repositorio H.E.L.E.N
# 5. Configuración:
#    Name: helen-backend
#    Environment: Node
#    Region: Frankfurt (más cercano a Europa)
#    Branch: main
#    Build Command: npm install
#    Start Command: node backend/server.js
# 6. Plan: Free
# 7. Añade Environment Variables (ver abajo)
# 8. Create Web Service
```

**Método 2: Render CLI**

```bash
# Instalar CLI
npm install -g render-cli

# Login
render login

# Deploy
render deploy
```

#### 3. Configurar Variables de Entorno en Render

En Render Dashboard > tu servicio > Environment:

```
NODE_ENV=production
PORT=10000
OPENAI_API_KEY=sk-...
OPENAI_ASSISTANT_ID=asst_...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=qHkrJuifPpn95wK3rm2A
FRONTEND_URL=https://tu-app.netlify.app
```

#### 4. Obtener URL del Backend

Render te dará una URL como:
```
https://helen-backend.onrender.com
```

#### 5. Actualizar Frontend con la URL del Backend

En Netlify > Environment Variables:
```
VITE_BACKEND_URL=https://helen-backend.onrender.com
```

Rebuild el frontend en Netlify.

---

## 🔧 Configuración Alternativa: Railway

Si prefieres Railway (más rápido pero con límite de crédito):

### Pasos Railway

1. **Signup**: https://railway.app (con GitHub)

2. **Crear proyecto**:
```bash
# Instalar CLI
npm install -g @railway/cli

# Login
railway login

# Iniciar proyecto
railway init

# Link con código
railway link

# Añadir variables
railway variables set OPENAI_API_KEY=sk-...
railway variables set ELEVENLABS_API_KEY=...

# Deploy
railway up
```

3. **Configuración automática**:
Railway detecta Node.js y usa:
- Build: `npm install`
- Start: `npm start` (asegúrate de tenerlo en package.json)

Añade en `package.json`:
```json
{
  "scripts": {
    "start": "node backend/server.js"
  }
}
```

---

## 🔐 Variables de Entorno

### Lista Completa

**Backend** (Render/Railway):
```env
# Required
OPENAI_API_KEY=sk-proj-...
OPENAI_ASSISTANT_ID=asst_...
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=qHkrJuifPpn95wK3rm2A

# Optional but recommended
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://tu-app.netlify.app
```

**Frontend** (Netlify/Vercel):
```env
VITE_BACKEND_URL=https://helen-backend.onrender.com
```

### ⚠️ NUNCA subas `.env` a Git

Asegúrate de que `.gitignore` incluye:
```
.env
.env.local
.env.production
```

Crea `.env.example` para referencia:
```env
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_ASSISTANT_ID=asst_...

# ElevenLabs
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...

# Server
PORT=4000
FRONTEND_URL=http://localhost:5173
```

---

## 🐛 Troubleshooting

### Problema: WebSocket no conecta

**Síntomas**:
```
WebSocket connection failed
net::ERR_CONNECTION_REFUSED
```

**Soluciones**:

1. **Verifica CORS en backend**:
```javascript
const corsOptions = {
    origin: 'https://tu-frontend.netlify.app',
    credentials: true
};
```

2. **Añade fallback a polling**:
```javascript
// En frontend
this.socket = window.io(BACKEND_URL, {
    transports: ['websocket', 'polling'],  // Fallback a polling
    secure: true,
    rejectUnauthorized: false  // Solo en desarrollo
});
```

3. **Verifica que el backend esté en HTTPS**

### Problema: Backend se "duerme" (Render Free Tier)

**Síntomas**:
Primera solicitud tarda 30-60 segundos

**Soluciones**:

1. **Usar cron job para ping** (no recomendado, viola ToS):
```javascript
// NO HACER ESTO en producción
// Render detecta y puede banear tu cuenta
```

2. **Upgrade a plan pagado** ($7/mes):
   - Sin sleep
   - Más recursos

3. **Usar Railway** (tiene sleep pero con más tiempo)

4. **Advertir al usuario**:
```javascript
// En frontend
if (firstConnection) {
    this.updateStatus('Despertando servidor... (puede tardar 30s en el primer uso)');
}
```

### Problema: API Limit Exceeded

**Síntomas**:
```
Error 429: Rate limit exceeded
```

**Soluciones**:

1. **Implementar rate limiting**:
```javascript
// En backend
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100  // requests por IP
});

app.use(limiter);
```

2. **Añadir caché de respuestas comunes**

3. **Monitorear uso de API keys**

### Problema: Variables de entorno no se cargan

**Verificación**:
```javascript
// En server.js
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('Environment:', process.env.NODE_ENV);
```

**Si falla**:
1. Verifica que las variables estén en Render Dashboard
2. Redeploy después de añadir variables
3. No uses `.env` en producción (usa las del servicio)

---

## 📊 Costos Estimados

### Opción 1: Completamente Gratis

| Servicio | Costo | Limitaciones |
|----------|-------|--------------|
| Netlify (Frontend) | $0 | 100GB bandwidth/mes |
| Render Free (Backend) | $0 | Sleep después 15min inactividad |
| **TOTAL** | **$0/mes** | Ideal para demos/portafolio |

### Opción 2: Óptimo para Producción

| Servicio | Costo | Beneficios |
|----------|-------|------------|
| Netlify (Frontend) | $0 | Sin cambios |
| Render Starter (Backend) | $7/mes | Sin sleep, más recursos |
| **TOTAL** | **$7/mes** | Ideal para uso real |

### APIs de IA (adicionales)

- OpenAI: Pay-as-you-go (~$0.02 por conversación)
- ElevenLabs: 10,000 caracteres/mes gratis

---

## ✅ Checklist de Deployment

### Pre-Deployment

- [ ] `.env.example` creado (sin keys reales)
- [ ] `.env` en `.gitignore`
- [ ] Health check endpoint añadido
- [ ] CORS configurado para producción
- [ ] Variables de entorno documentadas

### Frontend (Netlify)

- [ ] Build command configurado
- [ ] Publish directory especificado
- [ ] `VITE_BACKEND_URL` configurada
- [ ] HTTPS habilitado
- [ ] Custom domain (opcional)

### Backend (Render)

- [ ] Todas las env vars configuradas
- [ ] Start command correcto
- [ ] Región seleccionada (cercana a usuarios)
- [ ] Health check funcionando
- [ ] Logs revisados

### Testing Post-Deployment

- [ ] Frontend carga correctamente
- [ ] WebSocket conecta
- [ ] Micrófono funciona (requiere HTTPS)
- [ ] Conversación completa funciona
- [ ] Audio se reproduce sin cortes
- [ ] Logs del backend sin errores

---

## 🚀 Comandos Rápidos

### Deploy completo desde cero

```bash
# 1. Preparar frontend para producción
cd H.E.L.E.N
echo "VITE_BACKEND_URL=https://helen-backend.onrender.com" > frontend/.env.production

# 2. Build local para verificar
npm run build

# 3. Deploy backend (Render)
# - Hacerlo via dashboard (más fácil)
# - O usar render.yaml

# 4. Deploy frontend (Netlify)
netlify deploy --prod

# 5. Verificar
curl https://tu-app.netlify.app
curl https://helen-backend.onrender.com/health
```

---

## 📚 Recursos

- [Render Docs](https://render.com/docs)
- [Netlify Docs](https://docs.netlify.com)
- [Railway Docs](https://docs.railway.app)
- [Socket.IO Deployment](https://socket.io/docs/v4/deploying/)

---

## 💡 Recomendación Final

**Para H.E.L.E.N**:

1. **Frontend**: Netlify (gratis, simple, rápido)
2. **Backend**: Render Free tier para empezar
   - Upgrade a Starter ($7/mes) cuando tengas usuarios reales
3. **Monitoreo**: Render logs + Netlify analytics

**Siguiente paso después de deployment**:
- Añadir analytics (Google Analytics, Plausible)
- Configurar error tracking (Sentry)
- Implementar rate limiting
- Añadir tests automáticos

---

*Última actualización: Diciembre 2024*
