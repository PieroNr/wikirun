'use client'
// app/page.tsx — Landing : créer ou rejoindre une room
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { randomAvatar, randomTarget, FAMOUS_TARGETS, WinCondition, TargetMode } from '@/lib/game'
import { searchWiki } from '@/lib/wiki'

export default function HomePage() {
  const router = useRouter()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Champs "créer"
  const [name, setName] = useState('')
  const [avatar] = useState(randomAvatar())
  const [winCondition, setWinCondition] = useState<WinCondition>('first')
  const [targetMode, setTargetMode] = useState<TargetMode>('random')
  const [customSearch, setCustomSearch] = useState('')
  const [searchResults, setSearchResults] = useState<{ title: string; url: string; snippet: string }[]>([])
  const [selectedTarget, setSelectedTarget] = useState<{ title: string; url: string } | null>(null)
  const [selectedFamous, setSelectedFamous] = useState<string>('')

  // Champs "rejoindre"
  const [joinName, setJoinName] = useState('')
  const [joinCode, setJoinCode] = useState('')

  // ---- Recherche Wikipedia custom ----
  async function handleSearch() {
    if (!customSearch.trim()) return
    const results = await searchWiki(customSearch)
    setSearchResults(results)
  }

  // ---- Créer une room ----
  async function handleCreate() {
    if (!name.trim()) { setError('Entre ton pseudo'); return }
    if (targetMode === 'custom' && !selectedTarget && !selectedFamous) {
      setError('Choisis une page cible'); return
    }
    setLoading(true)
    setError(null)
    try {
      // Générer un code unique
      let code = ''
      let exists = true
      while (exists) {
        const { data: fn } = await supabase.rpc('generate_room_code')
        code = fn
        const { data } = await supabase.from('rooms').select('id').eq('code', code).maybeSingle()
        exists = !!data
      }

      // Déterminer la cible
      let target = { title: '', url: '' }
      if (targetMode === 'random') {
        target = randomTarget()
      } else if (selectedTarget) {
        target = selectedTarget
      } else {
        const found = FAMOUS_TARGETS.find(t => t.title === selectedFamous)
        target = found ?? randomTarget()
      }

      // Créer la room
      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .insert({
          code,
          host_id: 'pending', // sera mis à jour avec l'id joueur
          status: 'lobby',
          target_mode: targetMode,
          target_title: target.title,
          target_url: target.url,
          win_condition: winCondition,
        })
        .select()
        .single()

      if (roomErr) throw roomErr

      // Créer le joueur host
      const { data: player, error: playerErr } = await supabase
        .from('players')
        .insert({
          room_id: room.id,
          name: name.trim(),
          avatar,
          is_host: true,
          status: 'waiting',
        })
        .select()
        .single()

      if (playerErr) throw playerErr

      // Mettre à jour host_id
      await supabase.from('rooms').update({ host_id: player.id }).eq('id', room.id)

      // Sauvegarder en session
      sessionStorage.setItem('wikirun_player_id', player.id)
      sessionStorage.setItem('wikirun_player_name', name.trim())

      router.push(`/room/${code}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inattendue')
    } finally {
      setLoading(false)
    }
  }

  // ---- Rejoindre une room ----
  async function handleJoin() {
    if (!joinName.trim()) { setError('Entre ton pseudo'); return }
    if (!joinCode.trim()) { setError('Entre le code de la room'); return }
    setLoading(true)
    setError(null)
    try {
      const code = joinCode.trim().toUpperCase()
      const { data: room } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', code)
        .single()

      if (!room) { setError('Room introuvable'); setLoading(false); return }
      if (room.status === 'finished') { setError('Cette partie est terminée'); setLoading(false); return }

      const { data: existingPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('room_id', room.id)
        .neq('status', 'disconnected')

      if ((existingPlayers?.length ?? 0) >= room.max_players) {
        setError('Room pleine'); setLoading(false); return
      }

      const { data: player, error: playerErr } = await supabase
        .from('players')
        .insert({
          room_id: room.id,
          name: joinName.trim(),
          avatar: randomAvatar(),
          is_host: false,
          status: 'waiting',
        })
        .select()
        .single()

      if (playerErr) throw playerErr

      sessionStorage.setItem('wikirun_player_id', player.id)
      sessionStorage.setItem('wikirun_player_name', joinName.trim())

      router.push(`/room/${code}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inattendue')
    } finally {
      setLoading(false)
    }
  }

  // ---- UI ----
  const inputStyle: React.CSSProperties = {
    background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3',
    padding: '10px 14px', borderRadius: '8px', fontSize: '14px',
    width: '100%', outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box',
  }
  const btnPrimary: React.CSSProperties = {
    background: '#238636', color: '#fff', border: 'none',
    padding: '12px 28px', borderRadius: '8px', fontSize: '15px',
    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
    fontFamily: 'monospace', fontWeight: 'bold', width: '100%',
    transition: 'background 0.2s',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0d1117', color: '#e6edf3',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔗</div>
        <h1 style={{
          fontSize: '36px', fontWeight: 700, margin: 0,
          fontFamily: 'monospace', letterSpacing: '-1px',
        }}>
          wiki<span style={{ color: '#238636' }}>run</span>
        </h1>
        <p style={{ color: '#8b949e', marginTop: '8px', fontSize: '15px' }}>
          Navigue de page en page. Le premier arrivé gagne.
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: '#161b22', border: '1px solid #21262d',
        borderRadius: '12px', width: '100%', maxWidth: '480px', overflow: 'hidden',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #21262d' }}>
          {(['create', 'join'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null) }}
              style={{
                flex: 1, padding: '14px', border: 'none',
                background: tab === t ? '#0d1117' : 'transparent',
                color: tab === t ? '#e6edf3' : '#8b949e',
                cursor: 'pointer', fontFamily: 'monospace', fontSize: '13px',
                fontWeight: tab === t ? 700 : 400,
                borderBottom: tab === t ? '2px solid #238636' : '2px solid transparent',
                transition: 'all 0.2s',
              }}
            >
              {t === 'create' ? '➕ Créer une room' : '🚪 Rejoindre'}
            </button>
          ))}
        </div>

        <div style={{ padding: '24px' }}>
          {/* CRÉER */}
          {tab === 'create' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Ton pseudo</label>
                <input
                  style={inputStyle}
                  placeholder="ex: WikiMaster42"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={20}
                />
              </div>

              <div>
                <label style={labelStyle}>Condition de victoire</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { value: 'first', label: '🏁 Premier arrivé' },
                    { value: 'clicks', label: '🖱️ Moins de clics' },
                    { value: 'time', label: '⏱️ Plus rapide' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setWinCondition(opt.value as WinCondition)}
                      style={{
                        flex: 1, padding: '8px 4px', border: '1px solid',
                        borderColor: winCondition === opt.value ? '#238636' : '#30363d',
                        background: winCondition === opt.value ? '#1a2e1a' : '#0d1117',
                        color: winCondition === opt.value ? '#3fb950' : '#8b949e',
                        borderRadius: '6px', cursor: 'pointer', fontSize: '11px',
                        fontFamily: 'monospace', transition: 'all 0.15s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Page cible</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  {[
                    { value: 'random', label: '🎲 Aléatoire' },
                    { value: 'famous', label: '⭐ Célèbre' },
                    { value: 'custom', label: '🔍 Personnalisée' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setTargetMode(opt.value as TargetMode | 'famous' as unknown as TargetMode)}
                      style={{
                        flex: 1, padding: '8px 4px', border: '1px solid',
                        borderColor: targetMode === opt.value ? '#58a6ff' : '#30363d',
                        background: targetMode === opt.value ? '#1a2235' : '#0d1117',
                        color: targetMode === opt.value ? '#58a6ff' : '#8b949e',
                        borderRadius: '6px', cursor: 'pointer', fontSize: '11px',
                        fontFamily: 'monospace', transition: 'all 0.15s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Famous list */}
                {(targetMode as string) === 'famous' && (
                  <select
                    style={{ ...inputStyle }}
                    value={selectedFamous}
                    onChange={e => setSelectedFamous(e.target.value)}
                  >
                    <option value="">-- Choisir une page --</option>
                    {FAMOUS_TARGETS.map(t => (
                      <option key={t.url} value={t.title}>{t.title}</option>
                    ))}
                  </select>
                )}

                {/* Custom search */}
                {targetMode === 'custom' && (
                  <div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        style={{ ...inputStyle, flex: 1 }}
                        placeholder="Rechercher sur Wikipedia..."
                        value={customSearch}
                        onChange={e => setCustomSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      />
                      <button
                        onClick={handleSearch}
                        style={{
                          background: '#21262d', border: '1px solid #30363d',
                          color: '#e6edf3', padding: '10px 14px', borderRadius: '8px',
                          cursor: 'pointer', fontSize: '14px',
                        }}
                      >🔍</button>
                    </div>
                    {searchResults.length > 0 && (
                      <div style={{
                        marginTop: '8px', border: '1px solid #21262d',
                        borderRadius: '8px', overflow: 'hidden',
                        maxHeight: '200px', overflowY: 'auto',
                      }}>
                        {searchResults.map(r => (
                          <div
                            key={r.url}
                            onClick={() => { setSelectedTarget(r); setSearchResults([]) }}
                            style={{
                              padding: '10px 14px', cursor: 'pointer',
                              background: selectedTarget?.url === r.url ? '#1c2a3a' : '#0d1117',
                              borderBottom: '1px solid #21262d',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#161b22')}
                            onMouseLeave={e => (e.currentTarget.style.background = selectedTarget?.url === r.url ? '#1c2a3a' : '#0d1117')}
                          >
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#58a6ff' }}>{r.title}</div>
                            <div style={{ fontSize: '11px', color: '#484f58', marginTop: '2px' }}>{r.snippet.slice(0, 80)}…</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedTarget && (
                      <div style={{
                        marginTop: '8px', padding: '8px 12px',
                        background: '#1c2a3a', border: '1px solid #58a6ff44',
                        borderRadius: '6px', fontSize: '13px', color: '#58a6ff',
                      }}>
                        ✓ Sélectionné : <strong>{selectedTarget.title}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {error && <p style={{ color: '#f85149', fontFamily: 'monospace', fontSize: '13px', margin: 0 }}>{error}</p>}

              <button style={btnPrimary} onClick={handleCreate} disabled={loading}>
                {loading ? 'Création…' : 'Créer la room →'}
              </button>
            </div>
          )}

          {/* REJOINDRE */}
          {tab === 'join' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Ton pseudo</label>
                <input
                  style={inputStyle}
                  placeholder="ex: WikiMaster42"
                  value={joinName}
                  onChange={e => setJoinName(e.target.value)}
                  maxLength={20}
                />
              </div>
              <div>
                <label style={labelStyle}>Code de la room</label>
                <input
                  style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '4px', fontSize: '18px', fontFamily: 'monospace' }}
                  placeholder="ABC123"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
              </div>

              {error && <p style={{ color: '#f85149', fontFamily: 'monospace', fontSize: '13px', margin: 0 }}>{error}</p>}

              <button style={btnPrimary} onClick={handleJoin} disabled={loading}>
                {loading ? 'Connexion…' : 'Rejoindre →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', color: '#8b949e',
  fontFamily: 'monospace', letterSpacing: '1px',
  marginBottom: '6px', textTransform: 'uppercase',
}
