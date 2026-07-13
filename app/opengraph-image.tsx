import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0d1117',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          gap: 24,
        }}
      >
        <div style={{ fontSize: 28, color: '#3fb950', letterSpacing: 6, display: 'flex' }}>
          🔗 WIKIROAD
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
          <span style={{ fontSize: 96, fontWeight: 900, color: '#e6edf3' }}>wiki</span>
          <span style={{ fontSize: 96, fontWeight: 900, color: '#238636' }}>road</span>
        </div>

        <div
          style={{
            fontSize: 28,
            color: '#8b949e',
            textAlign: 'center',
            maxWidth: 800,
            lineHeight: 1.5,
            display: 'flex',
          }}
        >
          Navigue de lien en lien sur Wikipedia.
          <br />
          Le premier à atteindre la page cible gagne !
        </div>

        <div
          style={{
            marginTop: 32,
            display: 'flex',
            gap: 48,
          }}
        >
          {['🎲 Cible aléatoire', '🖱️ Moins de clics', '⏱️ Plus rapide'].map((label) => (
            <div
              key={label}
              style={{
                background: '#161b22',
                border: '1px solid #21262d',
                borderRadius: 12,
                padding: '12px 24px',
                fontSize: 20,
                color: '#8b949e',
                display: 'flex',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 32,
            right: 48,
            fontSize: 18,
            color: '#30363d',
            display: 'flex',
          }}
        >
          wikiroad.app
        </div>
      </div>
    ),
    size
  )
}
