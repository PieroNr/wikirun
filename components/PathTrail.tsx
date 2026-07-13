'use client'
import { useEffect, useRef } from 'react'

const F = "'Manrope',system-ui,sans-serif"

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
        display: 'flex', alignItems: 'center', gap: '5px',
        overflowX: 'auto', padding: '6px 0',
        scrollbarWidth: 'none',
      }}
    >
      {path.map((page, i) => {
        const isLast = i === path.length - 1
        return (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            <span style={{
              background: isLast ? 'var(--accent-bg)' : 'transparent',
              border: `1px solid ${isLast ? 'var(--accent-border)' : 'var(--border)'}`,
              color: isLast ? 'var(--accent)' : 'var(--text3)',
              padding: '4px 10px', borderRadius: '6px',
              fontSize: '12px', fontFamily: F, fontWeight: isLast ? 600 : 500,
              whiteSpace: 'nowrap', maxWidth: '160px',
              overflow: 'hidden', textOverflow: 'ellipsis',
              transition: 'all .3s',
            }}>
              {page}
            </span>
            {!isLast && (
              <span style={{ color: 'var(--border)', fontSize: '14px', lineHeight: 1 }}>›</span>
            )}
          </span>
        )
      })}
    </div>
  )
}

interface TargetBannerProps {
  targetTitle: string
  startTitle: string
  clicks: number
  elapsed: number
  hideStats?: boolean
}

export function TargetBanner({ targetTitle, startTitle, clicks, elapsed, hideStats }: TargetBannerProps) {
  const m = Math.floor(elapsed / 60).toString().padStart(2, '0')
  const s = (elapsed % 60).toString().padStart(2, '0')

  return (
    <div style={{
      background: 'var(--bg0)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '14px 20px',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
      fontFamily: F,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{
            fontSize: '10px', color: 'var(--text3)', fontWeight: 700,
            letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '5px',
          }}>
            Objectif
          </div>
          <div style={{
            background: 'var(--warn-bg)', border: '1px solid var(--warn-border)',
            color: 'var(--warn)', padding: '5px 14px', borderRadius: '7px',
            fontSize: '14px', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: '7px',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <circle cx="12" cy="12" r="2" fill="currentColor"/>
            </svg>
            {targetTitle}
          </div>
        </div>

        <div style={{ width: '1px', height: '32px', background: 'var(--border)' }} />

        <div>
          <div style={{
            fontSize: '10px', color: 'var(--text3)', fontWeight: 700,
            letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '5px',
          }}>
            Départ
          </div>
          <div style={{ color: 'var(--text2)', fontSize: '13px', fontWeight: 500 }}>
            {startTitle}
          </div>
        </div>
      </div>

      {!hideStats && (
        <div style={{ display: 'flex', gap: '28px', flexShrink: 0 }}>
          <Stat label="Clics" value={String(clicks)} />
          <Stat label="Temps" value={`${m}:${s}`} accent />
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: '10px', color: 'var(--text3)', fontWeight: 700,
        letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: F,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '22px', fontWeight: 700, color: accent ? 'var(--accent)' : 'var(--text1)',
        fontFamily: F, fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
    </div>
  )
}
