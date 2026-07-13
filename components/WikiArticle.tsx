'use client'
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
        .wiki-article {
          color: var(--text2);
          font-size: 15.5px;
          font-family: 'Source Serif 4', Georgia, serif;
          line-height: 1.8;
        }
        .wiki-article h2, .wiki-article h3 {
          font-family: 'Source Serif 4', Georgia, serif;
          color: var(--text1);
          border-bottom: 1px solid var(--border);
          padding-bottom: 8px;
          margin: 28px 0 14px;
        }
        .wiki-article h4, .wiki-article h5 { color: var(--text2); margin: 16px 0 8px; }
        .wiki-article p { margin-bottom: 14px; }
        .wiki-article ul, .wiki-article ol { padding-left: 24px; margin-bottom: 14px; }
        .wiki-article li { margin-bottom: 5px; }

        .wiki-article a.wiki-link {
          color: var(--accent);
          text-decoration: none;
          border-bottom: 1px solid var(--accent-border);
          transition: color .15s, border-color .15s, background .15s;
          cursor: pointer;
          border-radius: 2px;
          padding: 0 1px;
        }
        .wiki-article a.wiki-link:hover {
          border-bottom-color: var(--accent);
          background: var(--accent-bg);
        }

        .wiki-article a.wiki-link--target {
          color: var(--warn) !important;
          border-bottom: 2px solid var(--warn-border) !important;
          font-weight: 600;
          animation: wr-pulse 2s ease-in-out infinite;
        }
        .wiki-article a.wiki-link--target:hover {
          background: var(--warn-bg) !important;
          border-bottom-color: var(--warn) !important;
        }

        .wiki-article a.wiki-link--disabled {
          color: var(--text3);
          pointer-events: none;
          cursor: default;
        }

        .wiki-article table { display: none; }
        .wiki-article .thumb, .wiki-article figure { display: none; }
        .wiki-article .infobox { display: none; }
        .wiki-article .navbox { display: none; }
        .wiki-article .mw-editsection { display: none; }
        .wiki-article .toc { display: none; }
        .wiki-article .hatnote {
          color: var(--text2);
          font-style: italic;
          padding: 6px 12px;
          border-left: 3px solid var(--border);
          margin-bottom: 12px;
          font-size: 14px;
        }
        .wiki-article sup { font-size: 10px; vertical-align: super; }
        .wiki-article sup a { color: var(--text3) !important; border: none !important; pointer-events: none; }
        .wiki-article .reference { display: none; }
        .wiki-article .references { display: none; }
        .wiki-article .reflist { display: none; }
        .wiki-article .mw-references-wrap { display: none; }

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
