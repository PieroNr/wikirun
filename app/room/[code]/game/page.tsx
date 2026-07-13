'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase, getRoomChannel } from '@/lib/supabase'
import { Room, Player, GameEvent, formatElapsed } from '@/lib/game'
import { fetchWikiPage } from '@/lib/wiki'
import WikiArticle from '@/components/WikiArticle'
import PlayerList from '@/components/PlayerList'
import { PathTrail, TargetBanner } from '@/components/PathTrail'
import type { RealtimeChannel } from '@supabase/supabase-js'

const F = "'Manrope',system-ui,sans-serif"
const SERIF = "'Source Serif 4',Georgia,serif"
const HUES = ['accent', 'success', 'warn'] as const

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase() || '?'
}

function Avatar({ name, index, size = 28 }: { name: string; index: number; size?: number }) {
  const hue = HUES[index % HUES.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '6px', flexShrink: 0,
      background: `var(--${hue}-bg)`, border: `1px solid var(--${hue}-border)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.36), fontWeight: 700, color: `var(--${hue})`, fontFamily: F,
    }}>
      {getInitials(name)}
    </div>
  )
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

export default function GamePage() {
  const router = useRouter()
  const params = useParams()
  const code = (params.code as string).toUpperCase()
  const isMobile = useIsMobile()

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
  const [confirmStop, setConfirmStop] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [myPath, setMyPath] = useState<string[]>([])

  const channelRef = useRef<RealtimeChannel | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const myPlayerIdRef = useRef<string | null>(null)
  const roomRef = useRef<Room | null>(null)
  const articleScrollRef = useRef<HTMLDivElement | null>(null)

  // Keep roomRef in sync for callbacks
  useEffect(() => { roomRef.current = room }, [room])

  const loadInitialData = useCallback(async () => {
    const playerId = sessionStorage.getItem('wikiroad_player_id')
    myPlayerIdRef.current = playerId

    const { data: roomData } = await supabase.from('rooms').select('*').eq('code', code).single()
    if (!roomData) { router.push('/'); return }
    setRoom(roomData)

    const { data: playersData } = await supabase.from('players').select('*').eq('room_id', roomData.id)
    const all = playersData ?? []
    setPlayers(all)

    const me = all.find(p => p.id === playerId) ?? null
    setMyPlayer(me)
    if (me?.path) setMyPath(me.path)

    if (roomData.started_at) {
      startTimeRef.current = new Date(roomData.started_at).getTime()
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current!) / 1000))
      }, 1000)
    }

    const pageToLoad = me?.current_url ?? roomData.start_url ?? ''
    if (pageToLoad) {
      setLoadingPage(true)
      try {
        const { html, title } = await fetchWikiPage(pageToLoad)
        setPageHtml(html)
        setPageTitle(title)
      } catch { /* silent */ }
      finally { setLoadingPage(false) }
    }
  }, [code, router])

  useEffect(() => {
    loadInitialData()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [loadInitialData])

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
        if (payload.type === 'game_stopped') {
          if (timerRef.current) clearInterval(timerRef.current)
          router.push('/')
        }
      })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` },
        (payload) => {
          setPlayers(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } as Player : p))
        }
      )
      .subscribe()

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [room, code])

  // Clicks mode: detect all finished
  useEffect(() => {
    if (!room || room.win_condition !== 'clicks' || gameFinished) return
    if (players.length === 0) return
    const allDone = players.every(p => p.status === 'finished')
    if (allDone) {
      if (timerRef.current) clearInterval(timerRef.current)
      const sorted = [...players].sort((a, b) => (a.clicks ?? 999) - (b.clicks ?? 999))
      setWinner(sorted[0])
      setGameFinished(true)
      supabase.from('rooms')
        .update({ status: 'finished', finished_at: new Date().toISOString() })
        .eq('id', room.id)
        .then(() => {})
    }
  }, [players, room, gameFinished])

  const handleLinkClick = useCallback(async (url: string, _title: string) => {
    if (!myPlayer || won || gameFinished) return

    const newClicks = (myPlayer.clicks ?? 0) + 1
    setLoadingPage(true)
    try {
      const { html, title } = await fetchWikiPage(url)
      setPageHtml(html)
      setPageTitle(title)

      const newPath = [...(myPlayer.path ?? []), title]
      const targetUrl = roomRef.current?.target_url ?? ''
      const isTarget = url.toLowerCase() === decodeURIComponent(targetUrl).toLowerCase()
        || title.toLowerCase() === (roomRef.current?.target_title ?? '').toLowerCase()

      const updateData: Partial<Player> = {
        current_title: title, current_url: url, clicks: newClicks, path: newPath,
      }

      if (isTarget) {
        const timeMs = startTimeRef.current ? Date.now() - startTimeRef.current : 0
        const finishedPlayers = players.filter(p => p.status === 'finished').length
        const rank = finishedPlayers + 1

        updateData.status = 'finished'
        updateData.finished_at = new Date().toISOString()
        updateData.rank = rank
        setWon(true)
        setMyPath(newPath)

        await supabase.from('players').update(updateData).eq('id', myPlayer.id)
        setMyPlayer(prev => prev ? { ...prev, ...updateData } as Player : null)

        channelRef.current?.send({
          type: 'broadcast', event: 'game_event',
          payload: { type: 'player_finished', player_id: myPlayer.id, clicks: newClicks, time_ms: timeMs, rank } as GameEvent,
        })

        const wc = roomRef.current?.win_condition
        if (wc === 'first' || wc === 'time') {
          await supabase.from('rooms').update({ status: 'finished', finished_at: new Date().toISOString() }).eq('id', roomRef.current!.id)
          channelRef.current?.send({
            type: 'broadcast', event: 'game_event',
            payload: { type: 'game_finished', winner_id: myPlayer.id } as GameEvent,
          })
          const finishedMe = { ...myPlayer, ...updateData } as Player
          setWinner(finishedMe)
          setGameFinished(true)
          if (timerRef.current) clearInterval(timerRef.current)
        }
        // clicks mode: won=true, wait for all_finished useEffect
      } else {
        await supabase.from('players').update(updateData).eq('id', myPlayer.id)
        setMyPlayer(prev => {
          const updated = prev ? { ...prev, ...updateData } as Player : null
          return updated
        })
        setMyPath(newPath)

        channelRef.current?.send({
          type: 'broadcast', event: 'game_event',
          payload: { type: 'player_navigated', player_id: myPlayer.id, title, clicks: newClicks } as GameEvent,
        })
      }
    } catch { /* silent */ }
    finally {
      setLoadingPage(false)
      if (articleScrollRef.current) articleScrollRef.current.scrollTop = 0
    }
  }, [myPlayer, won, gameFinished, players])

  async function handleStop() {
    if (!room || !myPlayer?.is_host) return
    setStopping(true)
    try {
      await supabase.from('rooms').update({ status: 'finished', finished_at: new Date().toISOString() }).eq('id', room.id)
      await channelRef.current?.send({
        type: 'broadcast', event: 'game_event',
        payload: { type: 'game_stopped', stopped_by: myPlayer.id } as GameEvent,
      })
      if (timerRef.current) clearInterval(timerRef.current)
      router.push('/')
    } catch {
      setStopping(false)
      setConfirmStop(false)
    }
  }

  if (!room || !myPlayer) return <LoadingScreen />

  const m = Math.floor(elapsed / 60).toString().padStart(2, '0')
  const s = (elapsed % 60).toString().padStart(2, '0')

  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: 'var(--bg0)', color: 'var(--text1)', fontFamily: F,
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0, zIndex: 100,
        background: 'oklch(21% 0.022 250 / 0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)', padding: '0 20px',
        display: 'flex', alignItems: 'center', height: '54px', gap: '12px',
      }}>
        <span style={{ fontFamily: F, fontWeight: 800, fontSize: '16px' }}>
          wiki<span style={{ color: 'var(--accent)' }}>road</span>
        </span>
        <span style={{ color: 'var(--border)', fontSize: '14px' }}>·</span>
        <span style={{
          fontSize: '12px', color: 'var(--accent)',
          background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
          padding: '3px 10px', borderRadius: '5px', fontWeight: 700, letterSpacing: '1px',
        }}>
          {code}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {won && !gameFinished && (
            <span style={{
              fontSize: '12px', color: 'var(--success)',
              background: 'var(--success-bg)', border: '1px solid var(--success-border)',
              padding: '3px 10px', borderRadius: '5px', fontWeight: 600,
            }}>
              ✓ Trouvé ! En attente…
            </span>
          )}

          {isMobile && (
            <button onClick={() => setDrawerOpen(true)} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              color: 'var(--text1)', padding: '5px 10px', borderRadius: '7px',
              cursor: 'pointer', fontFamily: F, fontSize: '12px', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '5px',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              {players.length}
            </button>
          )}

          {myPlayer.is_host && !gameFinished && (
            <button
              onClick={() => setConfirmStop(true)}
              style={{
                background: 'transparent', border: '1px solid var(--danger-border)',
                color: 'var(--danger)', padding: '5px 12px', borderRadius: '7px',
                cursor: 'pointer', fontFamily: F, fontSize: '12px', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '5px',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
              </svg>
              Arrêter
            </button>
          )}
        </div>
      </div>

      {/* Main content row */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* Article column — only this scrolls */}
        <div ref={articleScrollRef} style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0,
          padding: isMobile ? '16px 12px 16px' : '20px 24px',
        }}>
          <TargetBanner
            targetTitle={room.target_title ?? ''}
            startTitle={room.start_title ?? ''}
            clicks={myPlayer.clicks ?? 0}
            elapsed={elapsed}
            hideStats={isMobile}
          />

          <div style={{ margin: '10px 0' }}>
            <PathTrail path={myPath} />
          </div>

          <div style={{
            background: 'var(--bg1)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: isMobile ? '20px 16px' : '28px 36px',
            position: 'relative', minHeight: '300px',
          }}>
            {loadingPage && (
              <div style={{
                position: 'absolute', inset: 0, background: 'oklch(17% 0.02 250 / 0.8)',
                borderRadius: '12px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', zIndex: 10, backdropFilter: 'blur(4px)',
              }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
                  animation: 'wr-spin .7s linear infinite',
                }} />
              </div>
            )}

            <h1 style={{
              fontFamily: SERIF, fontSize: isMobile ? '22px' : '26px', color: 'var(--text1)',
              margin: '0 0 20px', paddingBottom: '14px', borderBottom: '1px solid var(--border)',
              fontWeight: 600,
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

        {/* Desktop sidebar */}
        {!isMobile && (
          <div style={{
            width: '256px', flexShrink: 0,
            borderLeft: '1px solid var(--border)',
            overflowY: 'auto',
            padding: '20px 16px',
          }}>
            <PlayerList
              players={players}
              currentPlayerId={myPlayer.id}
              startedAt={room.started_at}
              winCondition={room.win_condition}
            />
          </div>
        )}
      </div>

      {/* Mobile bottom stats bar — flex item, never moves */}
      {isMobile && (
        <div style={{
          flexShrink: 0,
          background: 'oklch(21% 0.022 250 / 0.97)', borderTop: '1px solid var(--border)',
          padding: '10px 28px', display: 'flex', justifyContent: 'space-around',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: F }}>Clics</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text1)', fontFamily: F, fontVariantNumeric: 'tabular-nums' }}>
              {myPlayer.clicks ?? 0}
            </div>
          </div>
          <div style={{ width: '1px', background: 'var(--border)', margin: '4px 0' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: F }}>Temps</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent)', fontFamily: F, fontVariantNumeric: 'tabular-nums' }}>
              {m}:{s}
            </div>
          </div>
        </div>
      )}

      {/* Confirm stop modal */}
      {confirmStop && (
        <div style={{
          position: 'fixed', inset: 0, background: 'oklch(17% 0.02 250 / 0.85)',
          backdropFilter: 'blur(8px)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div style={{
            background: 'var(--bg1)', border: '1px solid var(--danger-border)',
            borderRadius: '16px', padding: '36px', maxWidth: '380px', width: '100%',
            textAlign: 'center', boxShadow: '0 20px 60px #00000088',
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--danger)" stroke="none">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
              </svg>
            </div>
            <h2 style={{ fontFamily: F, fontSize: '18px', color: 'var(--text1)', margin: '0 0 8px', fontWeight: 800 }}>
              Arrêter la partie ?
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: '13px', margin: '0 0 24px', lineHeight: 1.6 }}>
              Tous les joueurs seront redirigés vers l&apos;accueil.
              Cette action est irréversible.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmStop(false)}
                disabled={stopping}
                style={{
                  flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)',
                  color: 'var(--text1)', padding: '11px', borderRadius: '9px',
                  cursor: 'pointer', fontFamily: F, fontSize: '13px', fontWeight: 600,
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleStop}
                disabled={stopping}
                style={{
                  flex: 1, background: 'var(--danger)', border: 'none',
                  color: '#fff', padding: '11px', borderRadius: '9px',
                  cursor: stopping ? 'not-allowed' : 'pointer',
                  opacity: stopping ? 0.6 : 1,
                  fontFamily: F, fontSize: '13px', fontWeight: 700,
                }}
              >
                {stopping ? 'Arrêt…' : 'Arrêter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Win modal :
          - first/time : dès que gameFinished (tout le monde voit)
          - clicks     : dès que won===true pour MOI (les autres continuent) */}
      {((room.win_condition !== 'clicks' && gameFinished && winner) ||
        (room.win_condition === 'clicks' && won)) && (
        <WinModal
          winner={winner}
          players={players}
          myPlayerId={myPlayer.id}
          myPath={myPath}
          myClicks={myPlayer.clicks ?? 0}
          winCondition={room.win_condition}
          elapsed={elapsed}
          isWaiting={room.win_condition === 'clicks' && !gameFinished}
          onLobby={() => router.push(`/room/${code}`)}
          onHome={() => router.push('/')}
        />
      )}

      {/* Mobile drawer backdrop */}
      {isMobile && drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'oklch(17% 0.02 250 / 0.7)', zIndex: 250 }}
        />
      )}

      {/* Mobile player drawer */}
      {isMobile && (
        <div style={{
          position: 'fixed', top: 0, right: 0, height: '100%', width: '82%', maxWidth: '340px',
          background: 'var(--bg1)', zIndex: 300,
          transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform .28s ease', display: 'flex', flexDirection: 'column',
          borderLeft: '1px solid var(--border)',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Joueurs
            </span>
            <button onClick={() => setDrawerOpen(false)} style={{
              background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer',
              padding: '4px', fontSize: '18px', lineHeight: 1,
            }}>✕</button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <PlayerList players={players} currentPlayerId={myPlayer.id} startedAt={room.started_at} winCondition={room.win_condition} />
          </div>
        </div>
      )}
    </div>
  )
}

function WinModal({
  winner, players, myPlayerId, myPath, myClicks, elapsed, isWaiting, onLobby, onHome,
}: {
  winner: Player | null; players: Player[]; myPlayerId: string
  myPath: string[]; myClicks: number; winCondition: string; elapsed: number
  isWaiting: boolean
  onLobby: () => void; onHome: () => void
}) {
  const iAmWinner = !isWaiting && winner?.id === myPlayerId
  const finishedCount = players.filter(p => p.status === 'finished').length
  const totalCount = players.length
  const sorted = [...players].sort((a, b) => {
    if (a.status === 'finished' && b.status !== 'finished') return -1
    if (b.status === 'finished' && a.status !== 'finished') return 1
    if (a.rank !== null && b.rank !== null) return a.rank - b.rank
    return (a.clicks ?? 999) - (b.clicks ?? 999)
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'oklch(17% 0.02 250 / 0.92)',
      backdropFilter: 'blur(10px)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
      overflowY: 'auto',
    }}>
      <div style={{
        background: 'var(--bg1)', border: '1px solid var(--border)',
        borderRadius: '18px', padding: '36px', maxWidth: '480px', width: '100%',
        textAlign: 'center', boxShadow: '0 24px 80px #00000066', fontFamily: F,
        margin: 'auto',
      }}>
        {/* Icon */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '18px', margin: '0 auto 18px',
          background: isWaiting ? 'var(--accent-bg)' : iAmWinner ? 'var(--warn-bg)' : 'var(--bg2)',
          border: `1px solid ${isWaiting ? 'var(--accent-border)' : iAmWinner ? 'var(--warn-border)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isWaiting ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          ) : iAmWinner ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--warn)" stroke="none">
              <path d="M6 9H2V6h4V4h12v2h4v3h-4c0 2.21-1.79 4-4 4H10c-2.21 0-4-1.79-4-4z"/>
              <path d="M6 9c0 2.21 1.79 4 4 4h4c2.21 0 4-1.79 4-4"/>
              <path d="M9 13v5"/><path d="M15 13v5"/><path d="M7 18h10"/>
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="6"/>
              <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
            </svg>
          )}
        </div>

        {isWaiting ? (
          <>
            <h2 style={{ fontSize: '20px', margin: '0 0 6px', fontWeight: 800, color: 'var(--accent)' }}>
              Objectif atteint !
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: '14px', marginBottom: '20px' }}>
              {myClicks} clics · en attente des autres ({finishedCount}/{totalCount})
            </p>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '22px', margin: '0 0 6px', fontWeight: 800, color: iAmWinner ? 'var(--warn)' : 'var(--text1)' }}>
              {iAmWinner ? 'Tu as gagné !' : `${winner?.name} a gagné !`}
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: '14px', marginBottom: '20px' }}>
              {winner?.clicks} clics · {formatElapsed(elapsed)}
            </p>
          </>
        )}

        {/* My path */}
        {myPath.length > 0 && (
          <div style={{
            background: 'var(--bg0)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', textAlign: 'left',
          }}>
            <div style={{
              fontSize: '10px', color: 'var(--text3)', fontWeight: 700,
              letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '10px',
            }}>
              Ton parcours ({myClicks} clics)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {myPath.map((page, i) => {
                const isLast = i === myPath.length - 1
                return (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{
                      background: isLast ? 'var(--warn-bg)' : 'var(--bg2)',
                      border: `1px solid ${isLast ? 'var(--warn-border)' : 'var(--border)'}`,
                      color: isLast ? 'var(--warn)' : 'var(--text2)',
                      padding: '3px 8px', borderRadius: '5px',
                      fontSize: '11px', fontWeight: isLast ? 700 : 500, whiteSpace: 'nowrap',
                      maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis',
                      display: 'inline-block',
                    }}>
                      {page}
                    </span>
                    {i < myPath.length - 1 && (
                      <span style={{ color: 'var(--border)', fontSize: '12px' }}>›</span>
                    )}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Classement */}
        <div style={{
          background: 'var(--bg0)', border: '1px solid var(--border)',
          borderRadius: '10px', overflow: 'hidden', marginBottom: '20px', textAlign: 'left',
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid var(--border)',
            fontSize: '10px', color: 'var(--text3)', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase',
          }}>
            {isWaiting ? `Classement en cours (${finishedCount}/${totalCount})` : 'Classement final'}
          </div>
          {sorted.map((p, i) => {
            const originalIdx = players.findIndex(pl => pl.id === p.id)
            const isFinished = p.status === 'finished'
            return (
              <div key={p.id} style={{
                padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px',
                borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none',
                background: p.id === myPlayerId ? 'var(--success-bg)' : 'transparent',
              }}>
                <span style={{
                  fontSize: '13px', fontWeight: 700, width: '20px',
                  color: !isWaiting && i === 0 ? 'var(--warn)' : isFinished ? 'var(--text2)' : 'var(--text3)',
                }}>
                  {isFinished ? `#${i + 1}` : '—'}
                </span>
                <Avatar name={p.name} index={originalIdx} size={26} />
                <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: p.id === myPlayerId ? 'var(--success)' : 'var(--text1)' }}>
                  {p.name}
                </span>
                <span style={{ fontSize: '12px', color: isFinished ? 'var(--text2)' : 'var(--text3)', fontStyle: isFinished ? 'normal' : 'italic' }}>
                  {isFinished ? `${p.clicks} clics` : 'En cours…'}
                </span>
              </div>
            )
          })}
        </div>

        {!isWaiting && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onHome} style={{
              flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)',
              color: 'var(--text1)', padding: '11px', borderRadius: '9px',
              cursor: 'pointer', fontFamily: F, fontSize: '13px', fontWeight: 600,
            }}>
              Accueil
            </button>
            <button onClick={onLobby} style={{
              flex: 1, background: 'var(--success)', border: 'none',
              color: '#0a0a0a', padding: '11px', borderRadius: '9px',
              cursor: 'pointer', fontFamily: F, fontSize: '13px', fontWeight: 800,
            }}>
              Retour au lobby
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{
      height: '100dvh', background: 'var(--bg0)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Manrope',system-ui,sans-serif", color: 'var(--text2)', fontSize: '14px',
    }}>
      Chargement de la partie…
    </div>
  )
}
