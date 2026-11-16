// Material types, viewers and download links.
export const KINDS = [
  { key: 'pdf', label: 'PDF', icon: '📄', color: '#ef4444' },
  { key: 'docs', label: 'Docs', icon: '📝', color: '#3b82f6' },
  { key: 'slides', label: 'Slides', icon: '📊', color: '#f97316' },
  { key: 'video', label: 'Video', icon: '▶️', color: '#ec4899' },
  { key: 'link', label: 'Link', icon: '🔗', color: '#14b8a6' },
]
export const kindOf = (k) => KINDS.find((x) => x.key === k) || KINDS[4]

export function kindFromFile(file) {
  const n = file.name.toLowerCase()
  if (n.endsWith('.pdf')) return 'pdf'
  if (/\.(docx?|odt|rtf)$/.test(n)) return 'docs'
  if (/\.(pptx?|odp)$/.test(n)) return 'slides'
  return null
}

export function youtubeId(url) {
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}
const driveId = (url) => String(url).match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/)?.[1]
const gdoc = (url) => String(url).match(/docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([\w-]+)/)

export function kindFromUrl(url) {
  if (youtubeId(url) || /vimeo\.com|\.mp4($|\?)/i.test(url)) return 'video'
  const g = gdoc(url)
  if (g) return g[1] === 'presentation' ? 'slides' : 'docs'
  if (/\.pdf($|\?)/i.test(url)) return 'pdf'
  return 'link'
}

// The real file type, from the file name / URL (labels are only for display and filters).
export function fileType(m) {
  const name = String(m.file_name || m.storage_path || m.url || '').toLowerCase().split('?')[0]
  if (name.endsWith('.pdf')) return 'pdf'
  if (/\.(docx?|odt|rtf)$/.test(name)) return 'docs'
  if (/\.(pptx?|odp)$/.test(name)) return 'slides'
  return null
}

// PDFs we draw ourselves with PDF.js (stays on the site, works on phones).
export const usePdfViewer = (m) => fileType(m) === 'pdf'

// What to put in the on-site viewer (iframe src), or null = open in a new tab.
export function embedUrl(m) {
  const yt = youtubeId(m.url)
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}`
  const d = driveId(m.url)
  if (d) return `https://drive.google.com/file/d/${d}/preview`
  const g = gdoc(m.url)
  if (g) return `https://docs.google.com/${g[1]}/d/${g[2]}/preview`
  const t = fileType(m)
  if (t === 'pdf') return m.url
  if (m.storage_path && (t === 'docs' || t === 'slides'))
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(m.url)}`
  return null
}

// Forces a download for files stored on Supabase.
export function downloadUrl(m) {
  if (!m.storage_path) return null
  return `${m.url}?download=${encodeURIComponent(m.file_name || 'file')}`
}

export const fmtSize = (b) => (!b ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
