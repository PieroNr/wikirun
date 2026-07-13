'use client'
// components/PlayerList.tsx
import { Player } from '@/lib/game'
import { formatElapsed } from '@/lib/game'

interface Props {
  players: Player[]
  currentPlayerId: string
  startedAt: string | null
  winCondition: 'first' | 'clicks' | 'time'
}

export default function PlayerList({ players, currentPlayerId, startedAt, winCondition }: Props) {
  const sorted = [...players].sort((a, b) => {
    // Finished players first (by rank)
    if (a.rank !== null && b.rank !== null) return a.rank - b.rank
    if (a.rank !== null) return -1
    if (b.rank !== null) return 1
    // Then by clicks
    return a.clicks - b.clicks
  })

  return (
    <div style={{
      background: '#161b22',
      border: '1px solid #21262d',
      borderRadius: '10px',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #21262d',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span style={{ fontSize: '14px' }}>👥</span>
        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#8b949e', letterSpacing: '1px' }}>
          JOUEURS ({players.length})
        </span>
      </div>

      <div style={{ padding: '8px 0' }}>
        {sorted.map((player) => {
          const isMe = player.id === currentPlayerId
          const isFinished = player.status === 'finished'
          const isPlaying = player.status === 'playing'

          let timeElapsed: string | null = null
          if (isFinished && startedAt && player.finished_at) {
            const ms = new Date(player.finished_at).getTime() - new Date(startedAt).getTime()
            timeElapsed = formatElapsed(Math.floor(ms / 1000))
          }

          return (
            <div key={player.id} style={{
              padding: '10px 16px',
              background: isMe ? '#1f2d1f' : 'transparent',
              borderLeft: isMe ? '3px solid #3fb950' : '3px solid transparent',
              transition: 'background 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Avatar */}
                <span style={{ fontSize: '20px', lineHeight: 1 }}>{player.avatar}</span>

                {/* Nom + badges */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '13px', fontWeight: 600,
                      color: isMe ? '#3fb950' : '#e6edf3',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {player.name}
                    </span>
                    {player.is_host && (
                      <span style={{
                        fontSize: '10px', color: '#f0c040',
                        background: '#f0c04018', border: '1px solid #f0c04033',
                        padding: '1px 5px', borderRadius: '3px', fontFamily: 'monospace',
                      }}>HOST</span>
                    )}
                    {isMe && (
                      <span style={{
                        fontSize: '10px', color: '#3fb950',
                        background: '#3fb95018', border: '1px solid #3fb95033',
                        padding: '1px 5px', borderRadius: '3px', fontFamily: 'monospace',
                      }}>MOI</span>
                    )}
                  </div>

                  {/* Page actuelle */}
                  {player.current_title && isPlaying && (
                    <div style={{
                      fontSize: '11px', color: '#484f58',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      marginTop: '2px',
                    }}>
                      📄 {player.current_title}
                    </div>
                  )}
                  {isFinished && (
                    <div style={{ fontSize: '11px', color: '#3fb950', marginTop: '2px' }}>
                      ✓ Arrivé{player.rank ? ` — #${player.rank}` : ''}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {(isPlaying || isFinished) && (
                    <>
                      <div style={{
                        fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold',
                        color: isFinished ? '#f0c040' : '#e6edf3',
                      }}>
                        {player.clicks}
                        <span style={{ fontSize: '10px', color: '#484f58', marginLeft: '3px' }}>clics</span>
                      </div>
                      {timeElapsed && (
                        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#484f58' }}>
                          {timeElapsed}
                        </div>
                      )}
                    </>
                  )}
                  {player.status === 'waiting' && (
                    <span style={{ fontSize: '11px', color: '#484f58' }}>En attente</span>
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
