'use client'
// app/room/[code]/game/page.tsx — Jeu principal
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase, getRoomChannel } from '@/lib/supabase'
import { Room, Player, GameEvent, formatElapsed } from '@/lib/game'
import { fetchWikiPage } from '@/lib/wiki'
import WikiArticle from '@/components/WikiArticle'
import PlayerList from '@/components/PlayerList'
import { PathTrail, TargetBanner } from '@/components/PathTrail'
import type { RealtimeChannel } from '@supabase/supabase-js'

export default function GamePage() {
  const router = useRouter()
  const params = useParams()
  const code = (params.code as string).toUpperCase()

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)
  const [pageHtml, setPageHtml] = useState('')
  const [pageTitle, setPageTitle] = useState('')
  const [loadingPage, setLoadingPage] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const [won, setWon] = useState(false)
  const [gameFinished, setGameFinished] = useState(false)
  const [winner, setWinner] = useState<Player | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const myPlayerIdRef = useRef<string | null>(null)

  // ---- Chargement initial ----
  const loadInitialData = useCallback(async () => {
    const playerId = sessionStorage.getItem('wikirun_player_id')
    myPlayerIdRef.current = playerId

    const { data: roomData } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code)
      .single()

    if (!roomData) { router.push('/'); return }
    setRoom(roomData)

    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomData.id)

    const all = playersData ?? []
    setPlayers(all)

    const me = all.find(p => p.id === playerId) ?? null
    setMyPlayer(me)

    // Chrono
    if (roomData.started_at) {
      startTimeRef.current = new Date(roomData.started_at).getTime()
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current!) / 1000))
      }, 1000)
    }

    // Charger la page courante du joueur
    const pageToLoad = me?.current_url ?? roomData.start_url ?? ''
    if (pageToLoad) {
      setLoadingPage(true)
      try {
        const { html, title } = await fetchWikiPage(pageToLoad)
        setPageHtml(html)
        setPageTitle(title)
      } catch {
        // silent
      } finally {
        setLoadingPage(false)
      }
    }
  }, [code, router])

  useEffect(() => {
    loadInitialData()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [loadInitialData])

  // ---- Realtime ----
  useEffect(() => {
    if (!room) return

    channelRef.current = getRoomChannel(code)
      .on('broadcast', { event: 'game_event' }, ({ payload }: { payload: GameEvent }) => {
        if (payload.type === 'player_navigated') {
          setPlayers(prev => prev.map(p =>
            p.id === payload.player_id
              ? { ...p, current_title: payload.title, clicks: payload.clicks }
              : p
          ))
        }
        if (payload.type === 'player_finished') {
          setPlayers(prev => prev.map(p =>
            p.id === payload.player_id
              ? { ...p, status: 'finished', clicks: payload.clicks, rank: payload.rank, finished_at: new Date().toISOString() }
              : p
          ))
        }
        if (payload.type === 'game_finished') {
          if (timerRef.current) clearInterval(timerRef.current)
          setGameFinished(true)
          setPlayers(prev => {
            const w = prev.find(p => p.id === payload.winner_id)
            if (w) setWinner(w)
            return prev
          })
        }
      })
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` },
        (payload) => {
          setPlayers(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } as Player : p))
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [room, code])

  // ---- Navigation ----
  const handleLinkClick = useCallback(async (url: string, _title: string) => {
    if (!myPlayer || won || gameFinished) return

    const newClicks = (myPlayer.clicks ?? 0) + 1

    // Charger la nouvelle page
    setLoadingPage(true)
    try {
      const { html, title } = await fetchWikiPage(url)
      setPageHtml(html)
      setPageTitle(title)

      const newPath = [...(myPlayer.path ?? []), title]
      const targetUrl = room?.target_url ?? ''
      const isTarget = url.toLowerCase() === decodeURIComponent(targetUrl).toLowerCase()
        || title.toLowerCase() === (room?.target_title ?? '').toLowerCase()

      // Mettre à jour en DB
      const updateData: Partial<Player> = {
        current_title: title,
        current_url: url,
        clicks: newClicks,
        path: newPath,
      }

      if (isTarget) {
        const timeMs = startTimeRef.current ? Date.now() - startTimeRef.current : 0
        const finishedPlayers = players.filter(p => p.status === 'finished').length
        const rank = finishedPlayers + 1

        updateData.status = 'finished'
        updateData.finished_at = new Date().toISOString()
        updateData.rank = rank

        setWon(true)

        await supabase.from('players').update(updateData).eq('id', myPlayer.id)
        setMyPlayer(prev => prev ? { ...prev, ...updateData } as Player : null)

        // Broadcast finish
        channelRef.current?.send({
          type: 'broadcast',
          event: 'game_event',
          payload: {
            type: 'player_finished',
            player_id: myPlayer.id,
            clicks: newClicks,
            time_ms: timeMs,
            rank,
          } as GameEvent,
        })

        // Si premier arrivé → fin de partie
        if (room?.win_condition === 'first' || rank === 1) {
          await supabase.from('rooms').update({ status: 'finished', finished_at: new Date().toISOString() }).eq('id', room!.id)
          channelRef.current?.send({
            type: 'broadcast',
            event: 'game_event',
            payload: { type: 'game_finished', winner_id: myPlayer.id } as GameEvent,
          })
          setWinner({ ...myPlayer, ...updateData } as Player)
          setGameFinished(true)
          if (timerRef.current) clearInterval(timerRef.current)
        }
      } else {
        await supabase.from('players').update(updateData).eq('id', myPlayer.id)
        setMyPlayer(prev => prev ? { ...prev, ...updateData } as Player : null)

        // Broadcast navigation
        channelRef.current?.send({
          type: 'broadcast',
          event: 'game_event',
          payload: {
            type: 'player_navigated',
            player_id: myPlayer.id,
            title,
            clicks: newClicks,
          } as GameEvent,
        })
      }
    } catch {
      // Page non trouvée, silencieux
    } finally {
      setLoadingPage(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [myPlayer, won, gameFinished, room, players])

  if (!room || !myPlayer) return <LoadingScreen />

  return (
    <div style={{
      minHeight: '100vh', background: '#0d1117', color: '#e6edf3',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#161b22cc', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #21262d', padding: '0 24px',
        display: 'flex', alignItems: 'center', height: '52px', gap: '12px',
      }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '16px' }}>
          wiki<span style={{ color: '#238636' }}>run</span>
        </span>
        <span style={{ color: '#30363d' }}>·</span>
        <span style={{
          fontFamily: 'monospace', fontSize: '12px', color: '#58a6ff',
          background: '#1c2a3a', border: '1px solid #58a6ff33',
          padding: '3px 10px', borderRadius: '4px',
        }}>
          {code}
        </span>
        {won && !gameFinished && (
          <span style={{
            fontFamily: 'monospace', fontSize: '12px', color: '#3fb950',
            background: '#1a2e1a', border: '1px solid #3fb95033',
            padding: '3px 10px', borderRadius: '4px', marginLeft: 'auto',
          }}>
            ✓ Tu as trouvé ! Attente des autres…
          </span>
        )}
      </div>

      {/* Win modal */}
      {gameFinished && winner && (
        <WinModal
          winner={winner}
          players={players}
          myPlayerId={myPlayer.id}
          winCondition={room.win_condition}
          roomCode={code}
          elapsed={elapsed}
          onReplay={() => router.push(`/room/${code}`)}
          onHome={() => router.push('/')}
        />
      )}

      <div style={{ display: 'flex', maxWidth: '1400px', margin: '0 auto', padding: '0 24px', gap: '24px' }}>
        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: '20px', paddingBottom: '60px' }}>
          {/* Target banner */}
          <TargetBanner
            targetTitle={room.target_title ?? ''}
            startTitle={room.start_title ?? ''}
            clicks={myPlayer.clicks}
            elapsed={elapsed}
          />

          {/* Path trail */}
          <div style={{ margin: '12px 0' }}>
            <PathTrail path={myPlayer.path ?? []} />
          </div>

          {/* Article */}
          <div style={{
            background: '#161b22', border: '1px solid #21262d',
            borderRadius: '10px', padding: '28px 36px',
            position: 'relative', minHeight: '300px',
          }}>
            {loadingPage && (
              <div style={{
                position: 'absolute', inset: 0, background: '#0d1117bb',
                borderRadius: '10px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', zIndex: 10, backdropFilter: 'blur(4px)',
              }}>
                <span style={{ fontFamily: 'monospace', color: '#58a6ff', fontSize: '14px' }}>
                  Chargement…
                </span>
              </div>
            )}

            <h1 style={{
              fontFamily: 'Linux Libertine, Georgia, serif',
              fontSize: '26px', color: '#e6edf3', margin: '0 0 20px',
              paddingBottom: '14px', borderBottom: '1px solid #21262d',
            }}>
              {pageTitle}
            </h1>

            {pageHtml && (
              <WikiArticle
                title={pageTitle}
                html={pageHtml}
                targetUrl={room.target_url ?? ''}
                onLinkClick={handleLinkClick}
                disabled={won || gameFinished}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ width: '260px', flexShrink: 0, paddingTop: '20px' }}>
          <div style={{ position: 'sticky', top: '72px' }}>
            <PlayerList
              players={players}
              currentPlayerId={myPlayer.id}
              startedAt={room.started_at}
              winCondition={room.win_condition}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// WinModal
// ============================================================
function WinModal({
  winner, players, myPlayerId, winCondition, elapsed, onReplay, onHome
}: {
  winner: Player
  players: Player[]
  myPlayerId: string
  winCondition: string
  roomCode: string
  elapsed: number
  onReplay: () => void
  onHome: () => void
}) {
  const iAmWinner = winner.id === myPlayerId
  const sorted = [...players].sort((a, b) => {
    if (a.rank !== null && b.rank !== null) return a.rank - b.rank
    if (a.rank !== null) return -1
    if (b.rank !== null) return 1
    return a.clicks - b.clicks
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0d1117ee',
      backdropFilter: 'blur(8px)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: '#161b22', border: '1px solid #21262d',
        borderRadius: '16px', padding: '40px', maxWidth: '480px', width: '100%',
        textAlign: 'center', boxShadow: '0 24px 80px #00000088',
      }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>
          {iAmWinner ? '🏆' : '🎉'}
        </div>
        <h2 style={{
          fontFamily: 'monospace', fontSize: '24px', margin: '0 0 8px',
          color: iAmWinner ? '#f0c040' : '#e6edf3',
        }}>
          {iAmWinner ? 'Tu as gagné !' : `${winner.avatar} ${winner.name} a gagné !`}
        </h2>
        <p style={{ color: '#8b949e', fontFamily: 'monospace', fontSize: '14px', marginBottom: '28px' }}>
          {winner.clicks} clics · {formatElapsed(elapsed)}
        </p>

        {/* Classement */}
        <div style={{
          background: '#0d1117', border: '1px solid #21262d',
          borderRadius: '8px', overflow: 'hidden', marginBottom: '24px',
          textAlign: 'left',
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid #21262d',
            fontFamily: 'monospace', fontSize: '10px', color: '#484f58', letterSpacing: '1px',
          }}>
            CLASSEMENT FINAL
          </div>
          {sorted.map((p, i) => (
            <div key={p.id} style={{
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px',
              borderBottom: i < sorted.length - 1 ? '1px solid #21262d' : 'none',
              background: p.id === myPlayerId ? '#1a2e1a' : 'transparent',
            }}>
              <span style={{
                fontFamily: 'monospace', fontSize: '13px', fontWeight: 'bold',
                color: i === 0 ? '#f0c040' : '#484f58', width: '20px',
              }}>#{i + 1}</span>
              <span style={{ fontSize: '18px' }}>{p.avatar}</span>
              <span style={{ flex: 1, fontSize: '13px', color: p.id === myPlayerId ? '#3fb950' : '#e6edf3' }}>
                {p.name}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#8b949e' }}>
                {p.status === 'finished' ? `${p.clicks} clics` : 'En cours…'}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onHome} style={{
            flex: 1, background: '#21262d', border: '1px solid #30363d',
            color: '#e6edf3', padding: '11px', borderRadius: '8px',
            cursor: 'pointer', fontFamily: 'monospace', fontSize: '13px',
          }}>
            🏠 Accueil
          </button>
          <button onClick={onReplay} style={{
            flex: 1, background: '#238636', border: 'none',
            color: '#fff', padding: '11px', borderRadius: '8px',
            cursor: 'pointer', fontFamily: 'monospace', fontSize: '13px', fontWeight: 'bold',
          }}>
            🔁 Rejouer
          </button>
        </div>
      </div>
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
      Chargement de la partie…
    </div>
  )
}
