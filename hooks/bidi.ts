// Display-only bidi marks for lines that hold Hebrew. No closing PDF at a line's end.
export const RLM = '‏'
export const LRM = '‎'
export const RLE = '‫'
export const LRE = '‪'
export const PDF = '‬'

const H = '\\u05D0-\\u05EA\\u05F0-\\u05F2\\uFB1D-\\uFB4F'
const L = 'A-Za-z\\u00C0-\\u024F'
const HEBREW = new RegExp(`[${H}]`, 'g')
const LATIN = new RegExp(`[${L}]`, 'g')

// A `"` between two Hebrew letters is gershayim (צה"ל), not a quotation mark.
// shortcut: a prefix letter before a quote (ב"שלום") reads as gershayim too; upgrade if it shows up.
const QUOTE_MARK = `(?:(?<![${H}])"|"(?![${H}]))`
const TOKEN = new RegExp(
  [
    '(`+)[^\\n]*?\\1', // code span
    '\\[[^\\]\\n]*\\]\\([^)\\s]*\\)|<https?:\\/\\/[^>\\s]+>|https?:\\/\\/\\S+', // link
    `${QUOTE_MARK}(?:[^"\\n]|(?<=[${H}])"(?=[${H}]))*?${QUOTE_MARK}|“[^”\\n]*”`, // quote
  ].join('|'),
  'g',
)
// A Hebrew stretch with no Latin letter in it, and the punctuation that ends it.
const HEBREW_RUN = new RegExp(`[${H}](?:[^${L}\\n]*[${H}\\u0591-\\u05C7])?[.,;:!?…]*`, 'g')
const MARKER = /^\s*(?:>\s?)*\s*(?:#{1,6}\s+|[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+)?/
const FENCE = /^\s*(`{3,}|~{3,})/

type Kind = 'text' | 'code' | 'link' | 'quote'
type Part = { kind: Kind; text: string }

const count = (s: string, re: RegExp) => s.match(re)?.length ?? 0
const isMostlyHebrew = (s: string) => count(s, HEBREW) > count(s, LATIN)

function split(s: string): Part[] {
  const parts: Part[] = []
  let at = 0
  for (const m of s.matchAll(TOKEN)) {
    if (m.index > at) parts.push({ kind: 'text', text: s.slice(at, m.index) })
    const c = m[0][0]
    parts.push({ kind: c === '`' ? 'code' : c === '"' || c === '“' ? 'quote' : 'link', text: m[0] })
    at = m.index + m[0].length
  }
  if (at < s.length) parts.push({ kind: 'text', text: s.slice(at) })
  return parts
}

function content(s: string): string {
  if (count(s, HEBREW) === 0) return s
  const parts = split(s)
  const plain = parts.filter(p => p.kind === 'text').map(p => p.text).join('')
  if (count(plain, HEBREW) >= count(plain, LATIN)) {
    return RLM + RLE + parts
      .map(p => (p.kind === 'code' && !isMostlyHebrew(p.text) ? LRE + p.text + PDF : p.text))
      .join('')
  }
  return LRM + LRE + parts
    .map(p => {
      if (p.kind === 'text') return p.text.replace(HEBREW_RUN, run => RLE + run + PDF)
      if (p.kind !== 'quote') return p.text
      const inner = p.text.slice(1, -1)
      return isMostlyHebrew(inner) ? p.text[0] + RLE + inner + PDF + p.text.slice(-1) : p.text
    })
    .join('')
}

function line(s: string): string {
  const marker = MARKER.exec(s)?.[0] ?? ''
  return marker + content(s.slice(marker.length))
}

export function rtlText(text: string): string {
  let fence = ''
  return text
    .split('\n')
    .map(row => {
      const mark = FENCE.exec(row)?.[1]
      if (fence) {
        const closes = mark && mark[0] === fence[0] && mark.length >= fence.length && row.trim() === mark
        if (closes) fence = ''
        return row
      }
      if (mark) {
        fence = mark
        return row
      }
      // A table row: each cell on its own.
      return /^\s*\|/.test(row) ? row.split(/(?<!\\)\|/).map(line).join('|') : line(row)
    })
    .join('\n')
}
