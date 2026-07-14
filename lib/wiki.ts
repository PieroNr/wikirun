// lib/wiki.ts — Helpers Wikipedia FR

const WIKI_BASE = 'https://fr.wikipedia.org/w/api.php'

export interface WikiSection {
  toclevel: number
  number: string
  line: string
  anchor: string
}

export interface WikiPage {
  title: string
  url: string   // slug (ex: "Albert_Einstein")
  html: string
  sections: WikiSection[]
}

// Récupère le HTML parsé d'un article Wikipedia FR
export async function fetchWikiPage(titleOrSlug: string): Promise<WikiPage> {
  const params = new URLSearchParams({
    action: 'parse',
    page: decodeURIComponent(titleOrSlug.replace(/_/g, ' ')),
    prop: 'text|sections',
    format: 'json',
    origin: '*',
    disableeditsection: '1',
  })

  const res = await fetch(`${WIKI_BASE}?${params}`)
  if (!res.ok) throw new Error(`Erreur réseau Wikipedia: ${res.status}`)

  const data = await res.json()
  if (data.error) throw new Error(`Wikipedia: ${data.error.info}`)

  const title: string = data.parse.title
  const html: string = data.parse.text['*']
  const url = title.replace(/ /g, '_')
  const sections: WikiSection[] = (data.parse.sections ?? []).map((s: Record<string, unknown>) => ({
    toclevel: s.toclevel as number,
    number: s.number as string,
    line: (s.line as string).replace(/<[^>]+>/g, ''),
    anchor: s.anchor as string,
  }))

  return { title, url, html, sections }
}

// Récupère une page aléatoire Wikipedia FR (namespace 0 = articles)
export async function fetchRandomWikiPage(): Promise<{ title: string; url: string }> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'random',
    rnnamespace: '0',
    rnlimit: '1',
    format: 'json',
    origin: '*',
  })

  const res = await fetch(`${WIKI_BASE}?${params}`)
  const data = await res.json()
  const title: string = data.query.random[0].title
  return { title, url: title.replace(/ /g, '_') }
}

// Recherche Wikipedia FR (pour choisir une cible custom)
export async function searchWiki(query: string): Promise<{ title: string; url: string; snippet: string }[]> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: '8',
    srnamespace: '0',
    format: 'json',
    origin: '*',
  })

  const res = await fetch(`${WIKI_BASE}?${params}`)
  const data = await res.json()

  return (data.query?.search ?? []).map((r: { title: string; snippet: string }) => ({
    title: r.title,
    url: r.title.replace(/ /g, '_'),
    snippet: r.snippet.replace(/<[^>]+>/g, ''),
  }))
}

// Transforme le HTML Wikipedia pour le jeu :
// - Rend les liens /wiki/Article cliquables (data-wiki-url)
// - Met en surbrillance le lien cible
// - Supprime les liens non-articles (Fichier:, Aide:, etc.)
export function processWikiHtml(html: string, targetUrl: string): string {
  return html
    // Liens articles → cliquables avec data attribute
    .replace(
      /<a\s+href="\/wiki\/([^"#:]+)"([^>]*)>/gi,
      (_, slug, rest) => {
        const decoded = decodeURIComponent(slug)
        const isTarget = decoded.toLowerCase() === decodeURIComponent(targetUrl).toLowerCase()
        const cls = isTarget ? 'wiki-link wiki-link--target' : 'wiki-link'
        return `<a href="#" data-wiki-url="${decoded}" class="${cls}"${rest}>`
      }
    )
    // Liens non-articles (Fichier:, Aide:, Catégorie:, etc.) → désactivés
    .replace(/<a\s+href="\/wiki\/[^"]*:[^"]*"[^>]*>/gi, '<a class="wiki-link--disabled">')
    // Liens externes → désactivés
    .replace(/<a\s+href="https?:\/\/(?!fr\.wikipedia)[^"]*"[^>]*>/gi, '<a class="wiki-link--disabled">')
}
