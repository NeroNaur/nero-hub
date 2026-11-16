import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ gfm: true, breaks: true })

export function renderMarkdown(src) {
  return DOMPurify.sanitize(marked.parse(src || ''))
}
