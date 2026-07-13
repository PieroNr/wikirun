'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase, getRoomChannel } from '@/lib/supabase'
import { Room, Player, GameEvent } from '@/lib/game'
import { fetchRandomWikiPage } from '@/lib/wiki'
import type { RealtimeChannel } from '@supabase/supabase-js'

const F = "'Manrope',system-ui,sans-serif"

const HUES = ['accent', 'success', 'warn'] as const

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase() || '?'
}

function Avatar({ name, index, size = 36 }: { name: string; index: number; size?: number }) {
  const hue = HUES[index % HUES.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '9px', flexShrink: 0,
      background: `var(--${hue}-bg)`, border: `1px solid var(--${hue}-border)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: `var(--${hue})`, fontFamily: F,
    }}>
      {getInitials(name)}
    </div>
  )
}

export default function LobbyPage() {
  const router = useRouter()
  const params = useParams()
  const code = (params.code as string).toUpperCase()

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isHost = players.find(p => p.id === myPlayerId)?.is_host ?? false

  const loadData = useCallback(async () => {
    const playerId = sessionStorage.getItem('wikiroad_player_id')
    setMyPlayerId(playerId)
    const { data: roomData } = await supabase.from('rooms').select('*').eq('code', code).single()
    if (!roomData) { setError('Room introuvable'); setLoading(false); return }
    setRoom(roomData)
    const { data: playersData } = await supabase
      .from('players').select('*').eq('room_id', roomData.id).neq('status', 'disconnected')
    setPlayers(playersData ?? [])
    setLoading(false)
    if (roomData.status === 'playing') router.push(`/room/${code}/game`)
  }, [code, router])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!room) return
    let channel: RealtimeChannel
    channel = getRoomChannel(code)
      .on('broadcast', { event: 'game_event' }, ({ payload }: { payload: GameEvent }) => {
        if (payload.type === 'game_started') router.push(`/room/${code}/game`)
        if (payload.type === 'player_joined' || payload.type === 'player_left') loadData()
      })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` },
        () => loadData()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [room, code, router, loadData])

  async function handleStart() {
    if (!room || !isHost) return
    setStarting(true)
    try {
      const startPage = await fetchRandomWikiPage()
      await supabase.from('rooms').update({
        status: 'playing', start_title: startPage.title,
        start_url: startPage.url, started_at: new Date().toISOString(),
      }).eq('id', room.id)
      await supabase.from('players').update({
        status: 'playing', current_title: startPage.title,
        current_url: startPage.url, path: [startPage.title],
      }).eq('room_id', room.id)
      const channel = getRoomChannel(code)
      await channel.subscribe()
      await channel.send({
        type: 'broadcast', event: 'game_event',
        payload: {
          type: 'game_started', start_title: startPage.title,
          start_url: startPage.url, target_title: room.target_title,
          target_url: room.target_url,
        } as GameEvent,
      })
      router.push(`/room/${code}/game`)
    } catch {
      setError('Erreur au lancement')
      setStarting(false)
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/room/${code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <LoadingScreen />
  if (error) return <ErrorScreen message={error} />

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg0)', color: 'var(--text1)', fontFamily: F }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid var(--border)', padding: '0 32px',
        display: 'flex', alignItems: 'center', height: '54px', gap: '12px',
      }}>
        <span style={{ fontFamily: F, fontWeight: 800, fontSize: '18px' }}>
          wiki<span style={{ color: 'var(--accent)' }}>road</span>
        </span>
        <span style={{ color: 'var(--border)', fontSize: '16px' }}>·</span>
        <span style={{ color: 'var(--text2)', fontSize: '14px', fontWeight: 500 }}>Lobby</span>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Code room */}
        <div style={{
          background: 'var(--bg1)', border: '1px solid var(--border)',
          borderRadius: '14px', padding: '32px', marginBottom: '20px', textAlign: 'center',
        }}>
          <div style={{
            fontSize: '11px', color: 'var(--text3)', fontWeight: 700,
            letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '14px', fontFamily: F,
          }}>
            Code de la room
          </div>
          <div style={{
            fontFamily: F, fontSize: '46px', fontWeight: 800,
            color: 'var(--text1)', letterSpacing: '10px', marginBottom: '20px',
          }}>
            {code}
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button onClick={copyCode} style={ghostBtn}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              {copied ? 'Copié !' : 'Copier le code'}
            </button>
            <button onClick={copyLink} style={ghostBtn}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Copier le lien
            </button>
          </div>
        </div>

        {/* Config */}
        {room && (
          <div style={{
            background: 'var(--bg1)', border: '1px solid var(--border)',
            borderRadius: '14px', padding: '20px 24px', marginBottom: '20px',
          }}>
            <div style={{
              fontSize: '11px', color: 'var(--text3)', fontWeight: 700,
              letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '14px',
            }}>
              Configuration
            </div>
            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
              <ConfigItem
                label="Cible"
                value={room.target_mode === 'random' ? 'Aléatoire au lancement' : room.target_title ?? ''}
              />
              <ConfigItem
                label="Victoire"
                value={
                  room.win_condition === 'first' ? 'Premier arrivé' :
                  room.win_condition === 'clicks' ? 'Moins de clics' : 'Plus rapide'
                }
              />
            </div>
          </div>
        )}

        {/* Joueurs */}
        <div style={{
          background: 'var(--bg1)', border: '1px solid var(--border)',
          borderRadius: '14px', overflow: 'hidden', marginBottom: '20px',
        }}>
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid var(--border)',
            fontSize: '11px', color: 'var(--text3)', fontWeight: 700,
            letterSpacing: '1.5px', textTransform: 'uppercase',
          }}>
            Joueurs ({players.length}/{room?.max_players ?? 8})
          </div>
          {players.map((player, idx) => (
            <div key={player.id} style={{
              padding: '14px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: '12px',
              background: player.id === myPlayerId ? 'var(--success-bg)' : 'transparent',
              borderLeft: player.id === myPlayerId ? '3px solid var(--success)' : '3px solid transparent',
            }}>
              <Avatar name={player.name} index={idx} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: player.id === myPlayerId ? 'var(--success)' : 'var(--text1)' }}>
                    {player.name}
                  </span>
                  {player.is_host && (
                    <span style={{
                      fontSize: '10px', color: 'var(--warn)',
                      background: 'var(--warn-bg)', border: '1px solid var(--warn-border)',
                      padding: '1px 6px', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.5px',
                    }}>HOST</span>
                  )}
                  {player.id === myPlayerId && (
                    <span style={{
                      fontSize: '10px', color: 'var(--success)',
                      background: 'var(--success-bg)', border: '1px solid var(--success-border)',
                      padding: '1px 6px', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.5px',
                    }}>MOI</span>
                  )}
                </div>
              </div>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
            </div>
          ))}
        </div>

        {/* Actions */}
        {isHost ? (
          <div>
            <button
              onClick={handleStart}
              disabled={starting || players.length < 1}
              style={{
                width: '100%', background: 'var(--success)', color: '#0a0a0a', border: 'none',
                padding: '14px', borderRadius: '9px', fontSize: '15px', cursor: starting ? 'not-allowed' : 'pointer',
                opacity: starting ? 0.6 : 1, fontFamily: F, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {starting ? 'Lancement…' : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Lancer la partie ({players.length} joueur{players.length > 1 ? 's' : ''})
                </>
              )}
            </button>
            {players.length < 2 && (
              <p style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '13px', marginTop: '8px' }}>
                Invite des amis pour jouer à plusieurs !
              </p>
            )}
          </div>
        ) : (
          <div style={{
            textAlign: 'center', padding: '20px',
            color: 'var(--text2)', fontSize: '14px',
          }}>
            <div style={{ marginBottom: '8px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            En attente que le host lance la partie…
          </div>
        )}

        {error && <p style={{ color: 'var(--danger)', fontSize: '13px', marginTop: '12px' }}>{error}</p>}
      </div>
    </div>
  )
}

const ghostBtn: React.CSSProperties = {
  background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text1)',
  padding: '8px 14px', borderRadius: '7px', cursor: 'pointer',
  fontFamily: "'Manrope',system-ui,sans-serif", fontSize: '12.5px', fontWeight: 600,
  display: 'flex', alignItems: 'center', gap: '6px', transition: 'all .15s',
}

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: 'var(--text1)', fontWeight: 500 }}>{value}</div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg0)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      color: 'var(--text2)', fontSize: '14px', fontFamily: "'Manrope',system-ui,sans-serif",
    }}>
      Chargement…
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg0)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px',
      fontFamily: "'Manrope',system-ui,sans-serif",
    }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <p style={{ color: 'var(--danger)' }}>{message}</p>
    </div>
  )
}
