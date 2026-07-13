'use client'
// components/WikiArticle.tsx
import { useCallback } from 'react'
import { processWikiHtml } from '@/lib/wiki'

interface Props {
  title: string
  html: string
  targetUrl: string
  onLinkClick: (url: string, title: string) => void
  disabled?: boolean
}

export default function WikiArticle({ title, html, targetUrl, onLinkClick, disabled }: Props) {
  const processed = processWikiHtml(html, targetUrl)

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return
    const target = e.target as HTMLElement
    const link = target.closest('a[data-wiki-url]') as HTMLAnchorElement | null
    if (!link) return
    e.preventDefault()
    const url = link.getAttribute('data-wiki-url')!
    const linkTitle = link.textContent?.trim() || url
    onLinkClick(url, linkTitle)
  }, [disabled, onLinkClick])

  return (
    <>
      <style>{`
        /* Reset Wikipedia styles */
        .wiki-article { color: #c9d1d9; font-size: 15px; font-family: 'Linux Libertine', Georgia, serif; line-height: 1.75; }
        .wiki-article h1, .wiki-article h2 {
          color: #e6edf3; font-family: 'Linux Libertine', Georgia, serif;
          border-bottom: 1px solid #21262d; padding-bottom: 8px; margin: 28px 0 14px;
        }
        .wiki-article h3 { color: #cdd9e5; margin: 20px 0 10px; }
        .wiki-article h4, .wiki-article h5 { color: #adbac7; margin: 16px 0 8px; }
        .wiki-article p { margin-bottom: 14px; }
        .wiki-article ul, .wiki-article ol { padding-left: 24px; margin-bottom: 14px; }
        .wiki-article li { margin-bottom: 5px; }

        /* Liens cliquables */
        .wiki-article a.wiki-link {
          color: #58a6ff;
          text-decoration: none;
          border-bottom: 1px solid #58a6ff44;
          transition: color 0.15s, border-color 0.15s, background 0.15s;
          cursor: pointer;
          border-radius: 2px;
          padding: 0 1px;
        }
        .wiki-article a.wiki-link:hover {
          color: #79b8ff;
          border-bottom-color: #58a6ff;
          background: #58a6ff11;
        }

        /* Lien cible — mis en surbrillance */
        .wiki-article a.wiki-link--target {
          color: #f0c040 !important;
          border-bottom: 2px solid #f0c04077 !important;
          font-weight: 600;
          animation: target-pulse 2s ease-in-out infinite;
        }
        .wiki-article a.wiki-link--target:hover {
          background: #f0c04018 !important;
          border-bottom-color: #f0c040 !important;
        }
        @keyframes target-pulse {
          0%, 100% { background: transparent; }
          50% { background: #f0c04014; border-radius: 3px; }
        }

        /* Liens désactivés */
        .wiki-article a.wiki-link--disabled {
          color: #484f58;
          pointer-events: none;
          text-decoration: none;
          cursor: default;
        }

        /* Éléments masqués */
        .wiki-article table { display: none; }
        .wiki-article .thumb, .wiki-article figure { display: none; }
        .wiki-article .infobox { display: none; }
        .wiki-article .navbox { display: none; }
        .wiki-article .mw-editsection { display: none; }
        .wiki-article .toc { display: none; }
        .wiki-article .hatnote {
          color: #8b949e;
          font-style: italic;
          padding: 6px 12px;
          border-left: 3px solid #30363d;
          margin-bottom: 12px;
          font-size: 14px;
        }
        .wiki-article sup { font-size: 10px; vertical-align: super; }
        .wiki-article sup a { color: #484f58 !important; border: none !important; pointer-events: none; }
        .wiki-article .reference { display: none; }
        .wiki-article .references { display: none; }
        .wiki-article .reflist { display: none; }
        .wiki-article .mw-references-wrap { display: none; }

        /* Disable pointer when game is over */
        .wiki-article--disabled a.wiki-link {
          pointer-events: none;
          opacity: 0.5;
        }
      `}</style>

      <div
        className={`wiki-article${disabled ? ' wiki-article--disabled' : ''}`}
        dangerouslySetInnerHTML={{ __html: processed }}
        onClick={handleClick}
      />
    </>
  )
}
