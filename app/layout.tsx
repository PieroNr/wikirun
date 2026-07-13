import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://wikiroad.app'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    template: '%s | WikiRoad',
    default: 'WikiRoad — Le jeu Wikipedia multijoueur',
  },
  description:
    'WikiRoad est un jeu multijoueur en temps réel : pars d\'une page Wikipedia aléatoire et navigue de lien en lien pour atteindre la page cible. Le premier arrivé gagne !',
  keywords: [
    'wikipedia',
    'jeu wikipedia',
    'wiki game',
    'wikiroad',
    'jeu multijoueur',
    'jeu en ligne',
    'navigation wikipedia',
    'jeu de liens',
    'wikispeedia',
    'jeu culture générale',
  ],
  applicationName: 'WikiRoad',
  authors: [{ name: 'WikiRoad', url: BASE_URL }],
  creator: 'WikiRoad',
  publisher: 'WikiRoad',
  referrer: 'origin-when-cross-origin',
  formatDetection: { email: false, address: false, telephone: false },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  alternates: {
    canonical: '/',
  },

  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: BASE_URL,
    siteName: 'WikiRoad',
    title: 'WikiRoad — Le jeu Wikipedia multijoueur',
    description:
      'Navigue de lien en lien sur Wikipedia. Atteins la page cible avant tes adversaires !',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'WikiRoad — Le jeu Wikipedia multijoueur',
        type: 'image/png',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    site: '@wikiroad',
    creator: '@wikiroad',
    title: 'WikiRoad — Le jeu Wikipedia multijoueur',
    description:
      'Navigue de lien en lien sur Wikipedia. Atteins la page cible avant tes adversaires !',
    images: ['/opengraph-image.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#12151c',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'WikiRoad',
  url: BASE_URL,
  description:
    'Jeu multijoueur en temps réel basé sur la navigation Wikipedia. Atteins la page cible avant tes adversaires en cliquant sur les liens.',
  applicationCategory: 'Game',
  genre: 'Trivia',
  inLanguage: 'fr',
  isAccessibleForFree: true,
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '5',
    ratingCount: '1',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))}`,
          }}
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
