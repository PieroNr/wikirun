// ============================================================
// lib/game.ts — Types & constantes du jeu
// ============================================================

export type RoomStatus = 'lobby' | 'playing' | 'finished'
export type PlayerStatus = 'waiting' | 'playing' | 'finished' | 'disconnected'
export type TargetMode = 'random' | 'custom'
export type WinCondition = 'first' | 'clicks' | 'time'

export interface Room {
  id: string
  code: string
  host_id: string
  status: RoomStatus
  target_mode: TargetMode
  target_title: string | null
  target_url: string | null
  start_title: string | null
  start_url: string | null
  win_condition: WinCondition
  max_players: number
  created_at: string
  started_at: string | null
  finished_at: string | null
}

export interface Player {
  id: string
  room_id: string
  name: string
  avatar: string
  is_host: boolean
  status: PlayerStatus
  current_title: string | null
  current_url: string | null
  clicks: number
  path: string[]
  rank: number | null
  joined_at: string
  finished_at: string | null
  last_seen_at: string
}

// Events broadcast Supabase Realtime
export type GameEvent =
  | { type: 'player_navigated'; player_id: string; title: string; clicks: number }
  | { type: 'player_finished'; player_id: string; clicks: number; time_ms: number; rank: number }
  | { type: 'game_started'; start_title: string; start_url: string; target_title: string; target_url: string }
  | { type: 'game_finished'; winner_id: string }
  | { type: 'player_joined'; player_id: string; name: string; avatar: string }
  | { type: 'player_left'; player_id: string }

// ============================================================
// Pages cibles célèbres (Wikipedia FR)
// ============================================================
export const FAMOUS_TARGETS: { title: string; url: string }[] = [
  { title: 'Adolf Hitler', url: 'Adolf_Hitler' },
  { title: 'Albert Einstein', url: 'Albert_Einstein' },
  { title: 'Napoléon Ier', url: 'Napoléon_Ier' },
  { title: 'Cléopâtre VII', url: 'Cléopâtre_VII' },
  { title: 'Jules César', url: 'Jules_César' },
  { title: 'Marie Curie', url: 'Marie_Curie' },
  { title: 'Léonard de Vinci', url: 'Léonard_de_Vinci' },
  { title: 'William Shakespeare', url: 'William_Shakespeare' },
  { title: 'Isaac Newton', url: 'Isaac_Newton' },
  { title: 'Charles Darwin', url: 'Charles_Darwin' },
  { title: 'Aristote', url: 'Aristote' },
  { title: 'Platon', url: 'Platon' },
  { title: 'États-Unis', url: 'États-Unis' },
  { title: 'Seconde Guerre mondiale', url: 'Seconde_Guerre_mondiale' },
  { title: 'Lune', url: 'Lune' },
  { title: 'Soleil', url: 'Soleil' },
  { title: 'Paris', url: 'Paris' },
  { title: 'Rome', url: 'Rome' },
  { title: 'Londres', url: 'Londres' },
  { title: 'Chine', url: 'Chine' },
  { title: 'Christianisme', url: 'Christianisme' },
  { title: 'Islam', url: 'Islam' },
  { title: 'Bouddhisme', url: 'Bouddhisme' },
  { title: 'Démocratie', url: 'Démocratie' },
  { title: 'Capitalisme', url: 'Capitalisme' },
  { title: 'Communisme', url: 'Communisme' },
  { title: 'Évolution (biologie)', url: 'Évolution_(biologie)' },
  { title: 'Mécanique quantique', url: 'Mécanique_quantique' },
  { title: 'Internet', url: 'Internet' },
  { title: 'Intelligence artificielle', url: 'Intelligence_artificielle' },
  { title: 'ADN', url: 'Acide_désoxyribonucléique' },
  { title: 'Révolution française', url: 'Révolution_française' },
  { title: 'Jeux olympiques', url: 'Jeux_olympiques' },
  { title: 'Football', url: 'Football' },
  { title: 'Musique', url: 'Musique' },
  { title: 'Philosophie', url: 'Philosophie' },
  { title: 'Mathématiques', url: 'Mathématiques' },
  { title: 'Europe', url: 'Europe' },
  { title: 'Afrique', url: 'Afrique' },
  { title: 'Asie', url: 'Asie' },
  { title: 'Océan', url: 'Océan' },
  { title: 'Changement climatique', url: 'Changement_climatique' },
  { title: 'Électricité', url: 'Électricité' },
  { title: 'Univers', url: 'Univers' },
  { title: 'Trou noir', url: 'Trou_noir' },
  { title: 'Dinosaure', url: 'Dinosaure' },
  { title: 'Homo sapiens', url: 'Homo_sapiens' },
  { title: 'Première Guerre mondiale', url: 'Première_Guerre_mondiale' },
  { title: 'Guerre froide', url: 'Guerre_froide' },
  { title: 'Égypte antique', url: 'Égypte_antique' },
]

export const AVATARS = ['🧑', '👩', '🧔', '👱', '🧕', '👨‍🦱', '👩‍🦰', '🧑‍🦳', '👴', '👵', '🦊', '🐼', '🐸', '🦄', '🐙', '🦁', '🐯', '🐺', '🦅', '🐲']

export function randomAvatar() {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)]
}

export function randomTarget() {
  return FAMOUS_TARGETS[Math.floor(Math.random() * FAMOUS_TARGETS.length)]
}

export function formatTime(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

export function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
