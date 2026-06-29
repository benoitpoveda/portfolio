// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Mettre le vrai domaine avant le deploiement (utilise pour les URLs canoniques / OpenGraph / sitemap).
  site: 'https://benoitpoveda.fr',
  // Genere /sitemap-index.xml + /sitemap-0.xml (reference dans public/robots.txt).
  integrations: [sitemap()],
  // Sortie statique par defaut — parfait pour un portfolio (deployable sur Netlify / Vercel / GitHub Pages).
  build: {
    format: 'directory',
  },
  // Pas de barre d'outils de dev (captures propres ; aucun impact en prod).
  devToolbar: {
    enabled: false,
  },
});
