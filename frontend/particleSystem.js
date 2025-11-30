/**
 * ParticleSystem - Sistema de partículas interactivo y reactivo al audio
 * Inspirado en Google Antigravity y visualizaciones orgánicas.
 */
export class ParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('❌ Canvas de partículas no encontrado:', canvasId);
            return;
        }
        this.ctx = this.canvas.getContext('2d');

        // Configuración
        this.particleCount = 300; // Cantidad de partículas (ajustable)
        this.particles = [];
        this.audioData = { bass: 0, mid: 0, treble: 0, overall: 0, peak: 0 };
        this.mouse = { x: -1000, y: -1000, active: false };
        this.time = 0;

        // Simplex Noise (asumiendo que está cargado globalmente o pasamos la referencia)
        this.simplex = typeof SimplexNoise !== 'undefined' ? new SimplexNoise() : { noise2D: () => Math.random() };

        // Color unificado premium (Cyan/Blue eléctrico)
        this.unifiedColor = '#00F0FF';

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Mouse interaction
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.mouse.active = true;
        });

        window.addEventListener('mouseleave', () => {
            this.mouse.active = false;
        });

        this.createParticles();
        this.animate();
        console.log('✨ ParticleSystem inicializado');
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
    }

    /**
     * Resetea las partículas a su estado original
     */
    resetParticles() {
        this.particles = [];
        this.createParticles();
    }

    createParticles() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push(this.createParticle());
        }
    }

    createParticle() {
        // Distribuir tipos de partículas
        const rand = Math.random();
        let type = 'mid';
        if (rand < 0.33) type = 'bass';
        else if (rand < 0.66) type = 'treble';

        const sizeBase = type === 'bass' ? 3 : (type === 'mid' ? 2 : 1.5);

        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            sizeBase: sizeBase,
            size: sizeBase,
            color: this.unifiedColor, // Color unificado premium
            alpha: Math.random() * 0.5 + 0.3, // Transparencia variable
            type: type,
            angle: Math.random() * Math.PI * 2,
            life: Math.random()
        };
    }

    /**
     * Actualiza los datos de audio para la visualización
     * @param {Object} data - { bass, mid, treble, overall, peak } (0.0 - 1.0)
     */
    updateAudioData(data) {
        this.audioData = data;
    }

    animate() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; // Trail effect suave
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.time += 0.005;
        const { bass, mid, treble, overall, peak } = this.audioData;

        // Efecto global de "explosión" o shake si el volumen es muy alto
        let globalShakeX = 0;
        let globalShakeY = 0;
        if (peak > 0.8) {
            globalShakeX = (Math.random() - 0.5) * 10 * peak;
            globalShakeY = (Math.random() - 0.5) * 10 * peak;
        }

        this.particles.forEach(p => {
            // 1. Movimiento base orgánico (Simplex Noise)
            const noiseX = this.simplex.noise2D(p.x * 0.001, this.time) * 2;
            const noiseY = this.simplex.noise2D(p.y * 0.001, this.time + 100) * 2;

            // 2. Reactividad al Audio por Tipo
            let audioForceX = 0;
            let audioForceY = 0;
            let sizeMult = 1;

            if (p.type === 'bass') {
                // Graves: Movimiento lento y expansivo, tamaño aumenta
                sizeMult = 1 + bass * 3;
                audioForceX = Math.cos(p.angle) * bass * 2;
                audioForceY = Math.sin(p.angle) * bass * 2;
            } else if (p.type === 'mid') {
                // Medios: Movimiento moderado
                sizeMult = 1 + mid * 2;
                audioForceX = (Math.random() - 0.5) * mid * 5;
                audioForceY = (Math.random() - 0.5) * mid * 5;
            } else if (p.type === 'treble') {
                // Agudos: Movimiento rápido, jitter
                sizeMult = 1 + treble;
                audioForceX = (Math.random() - 0.5) * treble * 15;
                audioForceY = (Math.random() - 0.5) * treble * 15;
                // Destellos
                if (Math.random() < treble * 0.5) {
                    this.ctx.globalCompositeOperation = 'lighter';
                    sizeMult *= 2;
                }
            }

            // 3. Interacción con Mouse (Repulsión)
            let mouseForceX = 0;
            let mouseForceY = 0;
            if (this.mouse.active) {
                const dx = p.x - this.mouse.x;
                const dy = p.y - this.mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200) {
                    const force = (200 - dist) / 200;
                    mouseForceX = (dx / dist) * force * 5;
                    mouseForceY = (dy / dist) * force * 5;
                }
            }

            // Aplicar fuerzas
            p.vx += noiseX * 0.05 + audioForceX * 0.05 + mouseForceX * 0.1;
            p.vy += noiseY * 0.05 + audioForceY * 0.05 + mouseForceY * 0.1;

            // Fricción para que no se aceleren infinitamente
            p.vx *= 0.95;
            p.vy *= 0.95;

            // Actualizar posición
            p.x += p.vx + globalShakeX;
            p.y += p.vy + globalShakeY;

            // Bordes (Wrap around)
            if (p.x < 0) p.x = this.canvas.width;
            if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height;
            if (p.y > this.canvas.height) p.y = 0;

            // Dibujar
            p.size = p.sizeBase * sizeMult;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.alpha; // Usar alpha individual
            this.ctx.fill();
            this.ctx.globalAlpha = 1; // Reset alpha
            this.ctx.globalCompositeOperation = 'source-over';
        });

        requestAnimationFrame(() => this.animate());
    }
}
