import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

// Reproduit le Wikirun Redesign Favicon (cercle vide → ligne → cercle plein)
// Proportions basées sur le SVG 32×32 (scale ×16 → 512×512)
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{
        width: 512, height: 512,
        background: '#12151c',
        borderRadius: 128,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
      }}>
        {/* Cercle gauche — contour gris */}
        <div style={{
          width: 128, height: 128,
          borderRadius: '50%',
          border: '22px solid #a7b0bd',
          display: 'flex',
          flexShrink: 0,
        }} />
        {/* Ligne de connexion — ambre */}
        <div style={{
          width: 88, height: 22,
          background: '#e6b84d',
          borderRadius: 11,
          flexShrink: 0,
        }} />
        {/* Cercle droit — plein bleu */}
        <div style={{
          width: 128, height: 128,
          borderRadius: '50%',
          background: '#5c9fe6',
          display: 'flex',
          flexShrink: 0,
        }} />
      </div>
    ),
    size
  )
}
