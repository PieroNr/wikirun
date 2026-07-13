import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WikiRoad — Le jeu Wikipedia multijoueur',
    short_name: 'WikiRoad',
    description:
      'Navigue de lien en lien sur Wikipedia. Atteins la page cible avant tes adversaires !',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0d1117',
    theme_color: '#0d1117',
    categories: ['games', 'entertainment', 'education'],
    lang: 'fr',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        // @ts-expect-error purpose is valid in the spec
        purpose: 'any maskable',
      },
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
    ],
    screenshots: [],
  }
}
