import { defineConfig } from 'vite';

export default defineConfig({
    root: './frontend',
    server: {
        port: 5173,
        proxy: {
            // Proxy de las llamadas API al backend
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true
            },
            // Proxy de WebSocket
            '/socket.io': {
                target: 'http://localhost:3000',
                ws: true
            }
        }
    },
    build: {
        outDir: '../dist',
        emptyOutDir: true
    }
});
