'use client'
const F = "'Manrope',system-ui,sans-serif"

function RuleStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      <div style={{
        width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
        background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 800, color: 'var(--accent)', fontFamily: F,
      }}>
        {n}
      </div>
      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text2)', lineHeight: 1.55, fontFamily: F }}>
        {children}
      </p>
    </div>
  )
}

function ModeRow({ icon, label, hue, children }: {
  icon: React.ReactNode; label: string; hue: string; children: React.ReactNode
}) {
  return (
    <div style={{
      background: `var(--${hue}-bg)`, border: `1px solid var(--${hue}-border)`,
      borderRadius: '10px', padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
        {icon}
        <span style={{ fontSize: '12.5px', fontWeight: 700, color: `var(--${hue})`, fontFamily: F }}>
          {label}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5, fontFamily: F }}>
        {children}
      </p>
    </div>
  )
}

export default function RulesCard() {
  return (
    <div style={{
      background: 'var(--bg1)', border: '1px solid var(--border)',
      borderRadius: '14px', padding: '24px', fontFamily: F,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text1)' }}>Règles du jeu</div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 500 }}>Comment jouer</div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        <RuleStep n={1}>
          Tout le monde part de la <strong style={{ color: 'var(--text1)' }}>même page Wikipedia aléatoire</strong>.
        </RuleStep>
        <RuleStep n={2}>
          Clique sur les <strong style={{ color: 'var(--accent)' }}>liens bleus</strong> dans le texte de l&apos;article pour naviguer vers d&apos;autres pages.
        </RuleStep>
        <RuleStep n={3}>
          Atteins la <strong style={{ color: 'var(--warn)' }}>page cible</strong> affichée en haut de l&apos;écran. Le vainqueur dépend du mode choisi.
        </RuleStep>
        <RuleStep n={4}>
          Les liens dans les infoboxes, tableaux et galeries sont aussi cliquables.
        </RuleStep>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border)', margin: '0 0 16px' }} />

      {/* Modes */}
      <div style={{
        fontSize: '10px', color: 'var(--text3)', fontWeight: 700,
        letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '10px',
      }}>
        Modes de jeu
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <ModeRow
          hue="success"
          label="Premier arrivé"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
              <line x1="4" y1="22" x2="4" y2="15"/>
            </svg>
          }
        >
          Le premier joueur à atteindre la cible <strong style={{ color: 'var(--success)' }}>gagne immédiatement</strong>. La partie s&apos;arrête pour tout le monde.
        </ModeRow>

        <ModeRow
          hue="accent"
          label="Moins de clics"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2v11l3-3 3 6 2-1-3-6h4z"/>
            </svg>
          }
        >
          Tout le monde joue jusqu&apos;à trouver la cible. Le vainqueur est celui qui a utilisé le <strong style={{ color: 'var(--accent)' }}>moins de clics</strong>. La partie continue jusqu&apos;à ce que tous aient terminé.
        </ModeRow>

        <ModeRow
          hue="warn"
          label="Plus rapide"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          }
        >
          Le premier à atteindre la cible gagne — l&apos;accent est mis sur le <strong style={{ color: 'var(--warn)' }}>temps écoulé</strong>. La partie s&apos;arrête dès qu&apos;un joueur arrive.
        </ModeRow>
      </div>
    </div>
  )
}
