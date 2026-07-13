'use client'
import { Player, formatElapsed } from '@/lib/game'

const F = "'Manrope',system-ui,sans-serif"
const HUES = ['accent', 'success', 'warn'] as const

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase() || '?'
}

function Avatar({ name, index, size = 32 }: { name: string; index: number; size?: number }) {
  const hue = HUES[index % HUES.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '7px', flexShrink: 0,
      background: `var(--${hue}-bg)`, border: `1px solid var(--${hue}-border)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.36), fontWeight: 700, color: `var(--${hue})`, fontFamily: F,
    }}>
      {getInitials(name)}
    </div>
  )
}

interface Props {
  players: Player[]
  currentPlayerId: string
  startedAt: string | null
  winCondition: 'first' | 'clicks' | 'time'
}

export default function PlayerList({ players, currentPlayerId, startedAt, winCondition }: Props) {
  const sorted = [...players].sort((a, b) => {
    if (a.rank !== null && b.rank !== null) return a.rank - b.rank
    if (a.rank !== null) return -1
    if (b.rank !== null) return 1
    return a.clicks - b.clicks
  })

  return (
    <div style={{
      background: 'var(--bg1)', border: '1px solid var(--border)',
      borderRadius: '12px', overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span style={{ fontSize: '11px', color: 'var(--text3)', letterSpacing: '1px', fontWeight: 700, textTransform: 'uppercase' }}>
          Joueurs ({players.length})
        </span>
      </div>

      <div style={{ padding: '6px 0' }}>
        {sorted.map((player, sortedIdx) => {
          const isMe = player.id === currentPlayerId
          const isFinished = player.status === 'finished'
          const isPlaying = player.status === 'playing'
          const originalIdx = players.findIndex(p => p.id === player.id)

          let timeElapsed: string | null = null
          if (isFinished && startedAt && player.finished_at) {
            const ms = new Date(player.finished_at).getTime() - new Date(startedAt).getTime()
            timeElapsed = formatElapsed(Math.floor(ms / 1000))
          }

          return (
            <div key={player.id} style={{
              padding: '10px 16px',
              background: isMe ? 'var(--success-bg)' : 'transparent',
              borderLeft: `3px solid ${isMe ? 'var(--success)' : 'transparent'}`,
              transition: 'background .2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Avatar name={player.name} index={originalIdx} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '13px', fontWeight: 600,
                      color: isMe ? 'var(--success)' : 'var(--text1)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {player.name}
                    </span>
                    {player.is_host && (
                      <span style={{
                        fontSize: '10px', color: 'var(--warn)',
                        background: 'var(--warn-bg)', border: '1px solid var(--warn-border)',
                        padding: '1px 5px', borderRadius: '3px', fontWeight: 700,
                      }}>HOST</span>
                    )}
                    {isMe && (
                      <span style={{
                        fontSize: '10px', color: 'var(--success)',
                        background: 'var(--success-bg)', border: '1px solid var(--success-border)',
                        padding: '1px 5px', borderRadius: '3px', fontWeight: 700,
                      }}>MOI</span>
                    )}
                  </div>

                  {isPlaying && player.current_title && (
                    <div style={{
                      fontSize: '11px', color: 'var(--text3)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      marginTop: '2px',
                    }}>
                      {player.current_title}
                    </div>
                  )}
                  {isFinished && (
                    <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '2px', fontWeight: 600 }}>
                      Arrivé{player.rank ? ` · #${player.rank}` : ''}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {(isPlaying || isFinished) && (
                    <>
                      <div style={{
                        fontSize: '15px', fontWeight: 700,
                        color: isFinished ? 'var(--warn)' : 'var(--text1)',
                      }}>
                        {player.clicks}
                        <span style={{ fontSize: '10px', color: 'var(--text3)', marginLeft: '2px', fontWeight: 500 }}>clics</span>
                      </div>
                      {timeElapsed && (
                        <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{timeElapsed}</div>
                      )}
                    </>
                  )}
                  {player.status === 'waiting' && (
                    <span style={{ fontSize: '11px', color: 'var(--text3)' }}>En attente</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
