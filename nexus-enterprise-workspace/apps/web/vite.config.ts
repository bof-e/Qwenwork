import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Serveur de dev autonome (port 5173 par défaut) — ne dépend plus du
 * backend NestJS pour démarrer. Le proxy ci-dessous route les appels API
 * vers apps/backend-nestjs (port 3000) : plus besoin de fusionner les deux
 * serveurs dans un seul processus.
 *
 * Chaque module ajouté au backend (organizations, projects, etc.) doit
 * apparaître ici pour être proxifié en développement.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:3000',
      '/example': 'http://localhost:3000', // à retirer une fois le vrai module IAM en place
      '/api': 'http://localhost:3000',
      '/organizations': 'http://localhost:3000',
      '/kobo': 'http://localhost:3000',
      '/data-batches': 'http://localhost:3000',
      '/reports': 'http://localhost:3000',
      '/indicators': 'http://localhost:3000',
      '/logical-frameworks': 'http://localhost:3000',
      '/threads': 'http://localhost:3000',
      '/ai': 'http://localhost:3000',
      '/dashboards': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
});
