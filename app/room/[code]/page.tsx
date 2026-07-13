'use client'
// app/room/[code]/page.tsx — Lobby
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase, getRoomChannel } from '@/lib/supabase'
import { Room, Player, GameEvent } from '@/lib/game'
import { fetchRandomWikiPage } from '@/lib/wiki'
import type { RealtimeChannel } from '@supabase/supabase-js'

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

  // ---- Charger room + players ----
  const loadData = useCallback(async () => {
    const playerId = sessionStorage.getItem('wikirun_player_id')
    setMyPlayerId(playerId)

    const { data: roomData } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code)
      .single()

    if (!roomData) { setError('Room introuvable'); setLoading(false); return }
    setRoom(roomData)

    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomData.id)
      .neq('status', 'disconnected')

    setPlayers(playersData ?? [])
    setLoading(false)

    // Si la partie a déjà commencé
    if (roomData.status === 'playing') {
      router.push(`/room/${code}/game`)
    }
  }, [code, router])

  useEffect(() => { loadData() }, [loadData])

  // ---- Realtime ----
  useEffect(() => {
    if (!room) return

    let channel: RealtimeChannel

    channel = getRoomChannel(code)
      .on('broadcast', { event: 'game_event' }, ({ payload }: { payload: GameEvent }) => {
        if (payload.type === 'game_started') {
          router.push(`/room/${code}/game`)
        }
        if (payload.type === 'player_joined' || payload.type === 'player_left') {
          loadData()
        }
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` },
        () => loadData()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [room, code, router, loadData])

  // ---- Démarrer la partie (host only) ----
  async function handleStart() {
    if (!room || !isHost) return
    setStarting(true)
    try {
      // Page de départ aléatoire
      const startPage = await fetchRandomWikiPage()

      // Mettre à jour la room
      await supabase
        .from('rooms')
        .update({
          status: 'playing',
          start_title: startPage.title,
          start_url: startPage.url,
          started_at: new Date().toISOString(),
        })
        .eq('id', room.id)

      // Mettre à jour tous les joueurs
      await supabase
        .from('players')
        .update({
          status: 'playing',
          current_title: startPage.title,
          current_url: startPage.url,
          path: [startPage.title],
        })
        .eq('room_id', room.id)

      // Broadcast
      const channel = getRoomChannel(code)
      await channel.subscribe()
      await channel.send({
        type: 'broadcast',
        event: 'game_event',
        payload: {
          type: 'game_started',
          start_title: startPage.title,
          start_url: startPage.url,
          target_title: room.target_title,
          target_url: room.target_url,
        } as GameEvent,
      })

      router.push(`/room/${code}/game`)
    } catch (e) {
      setError('Erreur au lancement')
      setStarting(false)
    }
  }

  // ---- Copy link ----
  function copyLink() {
    const url = `${window.location.origin}/room/${code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyCode() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <LoadingScreen />
  if (error) return <ErrorScreen message={error} />

  return (
    <div style={{
      minHeight: '100vh', background: '#0d1117', color: '#e6edf3',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid #21262d', padding: '0 32px',
        display: 'flex', alignItems: 'center', height: '56px', gap: '12px',
      }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '18px' }}>
          wiki<span style={{ color: '#238636' }}>run</span>
        </span>
        <span style={{ color: '#30363d' }}>·</span>
        <span style={{ color: '#8b949e', fontSize: '14px' }}>Lobby</span>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Code room */}
        <div style={{
          background: '#161b22', border: '1px solid #21262d',
          borderRadius: '12px', padding: '28px', marginBottom: '24px', textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#484f58', letterSpacing: '1px', marginBottom: '12px' }}>
            CODE DE LA ROOM
          </div>
          <div style={{
            fontFamily: 'monospace', fontSize: '48px', fontWeight: 'bold',
            color: '#e6edf3', letterSpacing: '12px', marginBottom: '16px',
          }}>
            {code}
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button onClick={copyCode} style={ghostBtn}>
              {copied ? '✓ Copié' : '📋 Copier le code'}
            </button>
            <button onClick={copyLink} style={ghostBtn}>
              🔗 Copier le lien
            </button>
          </div>
        </div>

        {/* Config */}
        {room && (
          <div style={{
            background: '#161b22', border: '1px solid #21262d',
            borderRadius: '12px', padding: '20px', marginBottom: '24px',
          }}>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#484f58', letterSpacing: '1px', marginBottom: '14px' }}>
              CONFIGURATION
            </div>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <ConfigItem label="Cible" value={room.target_mode === 'random' ? '🎲 Aléatoire au lancement' : `🎯 ${room.target_title}`} />
              <ConfigItem label="Victoire" value={
                room.win_condition === 'first' ? '🏁 Premier arrivé' :
                room.win_condition === 'clicks' ? '🖱️ Moins de clics' : '⏱️ Plus rapide'
              } />
            </div>
          </div>
        )}

        {/* Joueurs */}
        <div style={{
          background: '#161b22', border: '1px solid #21262d',
          borderRadius: '12px', overflow: 'hidden', marginBottom: '24px',
        }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid #21262d',
            fontFamily: 'monospace', fontSize: '11px', color: '#484f58', letterSpacing: '1px',
          }}>
            JOUEURS ({players.length}/{room?.max_players ?? 8})
          </div>
          {players.map(player => (
            <div key={player.id} style={{
              padding: '14px 20px', borderBottom: '1px solid #21262d',
              display: 'flex', alignItems: 'center', gap: '12px',
              background: player.id === myPlayerId ? '#1a2e1a' : 'transparent',
            }}>
              <span style={{ fontSize: '24px' }}>{player.avatar}</span>
              <span style={{ fontWeight: 600, color: player.id === myPlayerId ? '#3fb950' : '#e6edf3' }}>
                {player.name}
              </span>
              {player.is_host && (
                <span style={{
                  fontSize: '10px', color: '#f0c040',
                  background: '#f0c04018', border: '1px solid #f0c04033',
                  padding: '2px 7px', borderRadius: '4px', fontFamily: 'monospace',
                }}>HOST</span>
              )}
              {player.id === myPlayerId && (
                <span style={{
                  fontSize: '10px', color: '#3fb950',
                  background: '#3fb95018', border: '1px solid #3fb95033',
                  padding: '2px 7px', borderRadius: '4px', fontFamily: 'monospace',
                }}>MOI</span>
              )}
              <span style={{ marginLeft: 'auto', width: '10px', height: '10px', borderRadius: '50%', background: '#3fb950' }} />
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
                width: '100%', background: '#238636', color: '#fff', border: 'none',
                padding: '14px', borderRadius: '8px', fontSize: '16px',
                cursor: starting ? 'not-allowed' : 'pointer',
                opacity: starting ? 0.6 : 1, fontFamily: 'monospace', fontWeight: 'bold',
              }}
            >
              {starting ? 'Lancement…' : `🚀 Lancer la partie (${players.length} joueur${players.length > 1 ? 's' : ''})`}
            </button>
            {players.length < 2 && (
              <p style={{ textAlign: 'center', color: '#484f58', fontSize: '13px', fontFamily: 'monospace', marginTop: '8px' }}>
                Invite des amis pour jouer à plusieurs !
              </p>
            )}
          </div>
        ) : (
          <div style={{
            textAlign: 'center', padding: '16px',
            color: '#8b949e', fontFamily: 'monospace', fontSize: '14px',
          }}>
            <div style={{ marginBottom: '8px', fontSize: '24px' }}>⏳</div>
            En attente que le host lance la partie…
          </div>
        )}

        {error && <p style={{ color: '#f85149', fontFamily: 'monospace', fontSize: '13px', marginTop: '12px' }}>{error}</p>}
      </div>
    </div>
  )
}

const ghostBtn: React.CSSProperties = {
  background: '#21262d', border: '1px solid #30363d', color: '#e6edf3',
  padding: '8px 16px', borderRadius: '6px', cursor: 'pointer',
  fontFamily: 'monospace', fontSize: '12px', transition: 'all 0.15s',
}

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#484f58', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: '#e6edf3' }}>{value}</div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0d1117', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace', color: '#8b949e', fontSize: '14px',
    }}>
      Chargement…
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#0d1117', display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px',
    }}>
      <span style={{ fontSize: '32px' }}>⚠️</span>
      <p style={{ fontFamily: 'monospace', color: '#f85149' }}>{message}</p>
    </div>
  )
}
