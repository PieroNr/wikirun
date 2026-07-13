'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { randomAvatar, randomTarget, FAMOUS_TARGETS, WinCondition, TargetMode } from '@/lib/game'
import { searchWiki } from '@/lib/wiki'
import { IconPlus, IconLogin, IconFlag, IconClick, IconClock, IconDice, IconStar, IconSearch } from '@/components/icons'

const F = "'Manrope',system-ui,sans-serif"

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', color: 'var(--text3)',
  fontFamily: F, letterSpacing: '1px', marginBottom: '6px',
  fontWeight: 700, textTransform: 'uppercase',
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg0)', border: '1px solid var(--border)',
  color: 'var(--text1)', padding: '11px 14px', borderRadius: '9px',
  fontSize: '14px', width: '100%', outline: 'none', fontFamily: F,
}

function SegBtn({ active, hue = 'success', onClick, children }: {
  active: boolean; hue?: string; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '9px 4px',
      border: `1px solid ${active ? `var(--${hue})` : 'var(--border)'}`,
      background: active ? 'var(--bg2)' : 'var(--bg0)',
      color: active ? `var(--${hue})` : 'var(--text2)',
      borderRadius: '7px', cursor: 'pointer', fontSize: '11.5px',
      fontFamily: F, fontWeight: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
      transition: 'all .15s',
    }}>
      {children}
    </button>
  )
}



export default function HomePage() {
  const router = useRouter()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [avatar] = useState(randomAvatar())
  const [winCondition, setWinCondition] = useState<WinCondition>('first')
  const [targetMode, setTargetMode] = useState<TargetMode>('random')
  const [customSearch, setCustomSearch] = useState('')
  const [searchResults, setSearchResults] = useState<{ title: string; url: string; snippet: string }[]>([])
  const [selectedTarget, setSelectedTarget] = useState<{ title: string; url: string } | null>(null)
  const [selectedFamous, setSelectedFamous] = useState<string>('')

  const [joinName, setJoinName] = useState('')
  const [joinCode, setJoinCode] = useState('')

  async function handleSearch() {
    if (!customSearch.trim()) return
    const results = await searchWiki(customSearch)
    setSearchResults(results)
  }

  async function handleCreate() {
    if (!name.trim()) { setError('Entre ton pseudo'); return }
    if (targetMode === 'custom' && !selectedTarget && !selectedFamous) {
      setError('Choisis une page cible'); return
    }
    setLoading(true); setError(null)
    try {
      let code = ''; let exists = true
      while (exists) {
        const { data: fn } = await supabase.rpc('generate_room_code')
        code = fn
        const { data } = await supabase.from('rooms').select('id').eq('code', code).maybeSingle()
        exists = !!data
      }
      let target = { title: '', url: '' }
      if (targetMode === 'random') {
        target = randomTarget()
      } else if (selectedTarget) {
        target = selectedTarget
      } else {
        const found = FAMOUS_TARGETS.find(t => t.title === selectedFamous)
        target = found ?? randomTarget()
      }
      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .insert({ code, host_id: 'pending', status: 'lobby', target_mode: targetMode,
          target_title: target.title, target_url: target.url, win_condition: winCondition })
        .select().single()
      if (roomErr) throw roomErr
      const { data: player, error: playerErr } = await supabase
        .from('players')
        .insert({ room_id: room.id, name: name.trim(), avatar, is_host: true, status: 'waiting' })
        .select().single()
      if (playerErr) throw playerErr
      await supabase.from('rooms').update({ host_id: player.id }).eq('id', room.id)
      sessionStorage.setItem('wikiroad_player_id', player.id)
      sessionStorage.setItem('wikiroad_player_name', name.trim())
      router.push(`/room/${code}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inattendue')
    } finally { setLoading(false) }
  }

  async function handleJoin() {
    if (!joinName.trim()) { setError('Entre ton pseudo'); return }
    if (!joinCode.trim()) { setError('Entre le code de la room'); return }
    setLoading(true); setError(null)
    try {
      const code = joinCode.trim().toUpperCase()
      const { data: room } = await supabase.from('rooms').select('*').eq('code', code).single()
      if (!room) { setError('Room introuvable'); setLoading(false); return }
      if (room.status === 'finished') { setError('Cette partie est terminée'); setLoading(false); return }
      const { data: existingPlayers } = await supabase
        .from('players').select('id').eq('room_id', room.id).neq('status', 'disconnected')
      if ((existingPlayers?.length ?? 0) >= room.max_players) {
        setError('Room pleine'); setLoading(false); return
      }
      const { data: player, error: playerErr } = await supabase
        .from('players')
        .insert({ room_id: room.id, name: joinName.trim(), avatar: randomAvatar(), is_host: false, status: 'waiting' })
        .select().single()
      if (playerErr) throw playerErr
      sessionStorage.setItem('wikiroad_player_id', player.id)
      sessionStorage.setItem('wikiroad_player_name', joinName.trim())
      router.push(`/room/${code}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inattendue')
    } finally { setLoading(false) }
  }

  const btnPrimary: React.CSSProperties = {
    background: 'var(--success)', color: '#0a0a0a', border: 'none',
    padding: '13px 28px', borderRadius: '9px', fontSize: '15px',
    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
    fontFamily: F, fontWeight: 800, width: '100%',
  }

  const tabs = [
    { id: 'create' as const, label: 'Créer une room', icon: <IconPlus /> },
    { id: 'join' as const, label: 'Rejoindre', icon: <IconLogin /> },
  ]

  return (
    <div style={{
      height: '100dvh', overflowY: 'auto', background: 'var(--bg0)', color: 'var(--text1)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px', fontFamily: F,
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'inline-block', marginBottom: '16px' }}>
          <svg viewBox="0 0 32 32" width="56" height="56">
            <rect width="32" height="32" rx="8" fill="#12151c"/>
            <circle cx="10.5" cy="16" r="4" fill="none" stroke="#a7b0bd" strokeWidth="2.6"/>
            <path d="M14.5 16h6" stroke="#e6b84d" strokeWidth="2.6" strokeLinecap="round"/>
            <circle cx="23" cy="16" r="4" fill="#5c9fe6"/>
          </svg>
        </div>
        <h1 style={{ fontFamily: F, fontSize: '34px', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.5px' }}>
          wiki<span style={{ color: 'var(--accent)' }}>road</span>
        </h1>
        <p style={{ color: 'var(--text2)', margin: 0, fontSize: '15px' }}>
          Navigue de page en page. Le premier arrivé gagne.
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--bg1)', border: '1px solid var(--border)',
        borderRadius: '14px', width: '100%', maxWidth: '480px', overflow: 'hidden',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError(null) }}
              style={{
                flex: 1, padding: '14px', border: 'none', background: 'transparent',
                color: tab === t.id ? 'var(--text1)' : 'var(--text2)',
                cursor: 'pointer', fontFamily: F, fontSize: '13.5px',
                fontWeight: tab === t.id ? 700 : 500,
                borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
                transition: 'all .2s', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '7px',
              }}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '24px' }}>
          {tab === 'create' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={labelStyle}>Ton pseudo</label>
                <input style={inputStyle} placeholder="ex: WikiMaster42"
                  value={name} onChange={e => setName(e.target.value)} maxLength={20} />
              </div>

              <div>
                <label style={labelStyle}>Condition de victoire</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <SegBtn active={winCondition === 'first'} hue="success" onClick={() => setWinCondition('first')}>
                    <IconFlag />Premier arrivé
                  </SegBtn>
                  <SegBtn active={winCondition === 'clicks'} hue="success" onClick={() => setWinCondition('clicks')}>
                    <IconClick />Moins de clics
                  </SegBtn>
                  <SegBtn active={winCondition === 'time'} hue="success" onClick={() => setWinCondition('time')}>
                    <IconClock />Plus rapide
                  </SegBtn>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Page cible</label>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  <SegBtn active={targetMode === 'random'} hue="accent" onClick={() => setTargetMode('random')}>
                    <IconDice />Aléatoire
                  </SegBtn>
                  <SegBtn active={(targetMode as string) === 'famous'} hue="accent"
                    onClick={() => setTargetMode('famous' as unknown as TargetMode)}>
                    <IconStar />Célèbre
                  </SegBtn>
                  <SegBtn active={targetMode === 'custom'} hue="accent" onClick={() => setTargetMode('custom')}>
                    <IconSearch size={12} />Perso
                  </SegBtn>
                </div>

                {(targetMode as string) === 'famous' && (
                  <select style={{ ...inputStyle }} value={selectedFamous} onChange={e => setSelectedFamous(e.target.value)}>
                    <option value="">-- Choisir une page --</option>
                    {FAMOUS_TARGETS.map(t => <option key={t.url} value={t.title}>{t.title}</option>)}
                  </select>
                )}

                {targetMode === 'custom' && (
                  <div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        style={{ ...inputStyle, flex: 1 }}
                        placeholder="Rechercher sur Wikipedia…"
                        value={customSearch}
                        onChange={e => setCustomSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      />
                      <button onClick={handleSearch} style={{
                        background: 'var(--bg2)', border: '1px solid var(--border)',
                        color: 'var(--text1)', padding: '11px 14px', borderRadius: '9px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                      }}>
                        <IconSearch />
                      </button>
                    </div>
                    {searchResults.length > 0 && (
                      <div style={{
                        marginTop: '8px', border: '1px solid var(--border)',
                        borderRadius: '9px', overflow: 'hidden', maxHeight: '200px', overflowY: 'auto',
                      }}>
                        {searchResults.map(r => (
                          <div
                            key={r.url}
                            onClick={() => { setSelectedTarget(r); setSearchResults([]) }}
                            style={{
                              padding: '10px 14px', cursor: 'pointer',
                              background: selectedTarget?.url === r.url ? 'var(--bg2)' : 'var(--bg0)',
                              borderBottom: '1px solid var(--border)',
                              transition: 'background .15s',
                            }}
                          >
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>{r.title}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{r.snippet.slice(0, 80)}…</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedTarget && (
                      <div style={{
                        marginTop: '8px', padding: '8px 12px',
                        background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
                        borderRadius: '7px', fontSize: '13px', color: 'var(--accent)',
                      }}>
                        ✓ <strong>{selectedTarget.title}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {error && <p style={{ color: 'var(--danger)', fontFamily: F, fontSize: '13px', margin: 0 }}>{error}</p>}
              <button style={btnPrimary} onClick={handleCreate} disabled={loading}>
                {loading ? 'Création…' : 'Créer la room'}
              </button>
            </div>
          )}

          {tab === 'join' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={labelStyle}>Ton pseudo</label>
                <input style={inputStyle} placeholder="ex: WikiMaster42"
                  value={joinName} onChange={e => setJoinName(e.target.value)} maxLength={20} />
              </div>
              <div>
                <label style={labelStyle}>Code de la room</label>
                <input
                  style={{
                    ...inputStyle, textTransform: 'uppercase', letterSpacing: '10px',
                    fontSize: '22px', fontWeight: 800, textAlign: 'center',
                  }}
                  placeholder="ABC123"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
              </div>
              {error && <p style={{ color: 'var(--danger)', fontFamily: F, fontSize: '13px', margin: 0 }}>{error}</p>}
              <button style={btnPrimary} onClick={handleJoin} disabled={loading}>
                {loading ? 'Connexion…' : 'Rejoindre'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
