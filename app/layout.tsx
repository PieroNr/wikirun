// app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'WikiRun — Multijoueur Wikipedia',
  description: 'Navigue de page en page sur Wikipedia. Le premier arrivé gagne.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, padding: 0, background: '#0d1117' }}>
        {children}
      </body>
    </html>
  )
}
