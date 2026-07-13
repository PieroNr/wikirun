import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0d1117',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '20%',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontFamily: 'monospace',
            fontWeight: 900,
            fontSize: 220,
            lineHeight: 1,
          }}
        >
          <span style={{ color: '#e6edf3' }}>W</span>
          <span style={{ color: '#238636' }}>R</span>
        </div>
      </div>
    ),
    size
  )
}
