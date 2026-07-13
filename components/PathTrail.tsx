'use client'
// components/PathTrail.tsx
import { useEffect, useRef } from 'react'

interface Props {
  path: string[]
}

export function PathTrail({ path }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth
  }, [path])

  if (path.length === 0) return null

  return (
    <div
      ref={ref}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        overflowX: 'auto', padding: '8px 0',
        scrollbarWidth: 'none',
      }}
    >
      {path.map((page, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span style={{
            background: i === path.length - 1 ? '#1c2a3a' : 'transparent',
            border: i === path.length - 1 ? '1px solid #58a6ff44' : '1px solid #21262d',
            color: i === path.length - 1 ? '#58a6ff' : '#484f58',
            padding: '3px 10px', borderRadius: '4px',
            fontSize: '12px', fontFamily: 'monospace',
            whiteSpace: 'nowrap', maxWidth: '160px',
            overflow: 'hidden', textOverflow: 'ellipsis',
            transition: 'all 0.3s',
          }}>
            {page}
          </span>
          {i < path.length - 1 && (
            <span style={{ color: '#30363d', fontSize: '12px' }}>›</span>
          )}
        </span>
      ))}
    </div>
  )
}

// ============================================================
// TargetBanner
// ============================================================
interface TargetBannerProps {
  targetTitle: string
  startTitle: string
  clicks: number
  elapsed: number
}

export function TargetBanner({ targetTitle, startTitle, clicks, elapsed }: TargetBannerProps) {
  const m = Math.floor(elapsed / 60).toString().padStart(2, '0')
  const s = (elapsed % 60).toString().padStart(2, '0')

  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #21262d',
      borderRadius: '10px',
      padding: '14px 20px',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
    }}>
      {/* Cible */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#484f58', letterSpacing: '1px', marginBottom: '4px' }}>
            OBJECTIF
          </div>
          <div style={{
            background: '#1c1a0d', border: '1px solid #f0c04044',
            color: '#f0c040', padding: '5px 14px', borderRadius: '6px',
            fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold',
          }}>
            🎯 {targetTitle}
          </div>
        </div>

        <div style={{ color: '#21262d', fontSize: '18px' }}>·</div>

        <div>
          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#484f58', letterSpacing: '1px', marginBottom: '4px' }}>
            DÉPART
          </div>
          <div style={{
            color: '#8b949e', fontFamily: 'monospace', fontSize: '13px',
          }}>
            {startTitle}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '24px' }}>
        <Stat label="CLICS" value={String(clicks)} />
        <Stat label="TEMPS" value={`${m}:${s}`} accent />
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#484f58', letterSpacing: '1px' }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'monospace', fontSize: '20px', fontWeight: 'bold',
        color: accent ? '#58a6ff' : '#e6edf3',
      }}>
        {value}
      </div>
    </div>
  )
}
