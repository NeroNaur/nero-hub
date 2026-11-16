// Validates and normalizes an import file.
// Accepts { subject, modules: [...] } or a single module with a "subject" field.
const TYPES = ['mcq', 'true_false', 'identification', 'enumeration']

export const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

// ctx = { subject, term } from where "+ Add lesson" was clicked; the file's own values become a double-check.
export function parseImport(text, ctx = {}) {
  let raw
  try {
    raw = JSON.parse(text)
  } catch (e) {
    return { errors: [`Not valid JSON: ${e.message}`] }
  }
  const errors = []
  const warnings = []
  const subject = ctx.subject || raw.subject
  if (!subject) errors.push('Missing "subject" (e.g. "art-appreciation").')
  if (ctx.subject && raw.subject && raw.subject !== ctx.subject)
    warnings.push(`File says subject "${raw.subject}", but you're adding it to "${ctx.subject}".`)
  const list = Array.isArray(raw.modules) ? raw.modules : raw.title ? [raw] : []
  if (!list.length) errors.push('No modules found. Use "modules": [ ... ].')

  const modules = list.map((m, mi) => {
    const where = `Module ${mi + 1}${m.title ? ` (${m.title})` : ''}`
    if (!m.title) errors.push(`${where}: missing "title".`)
    const notes = (m.notes || []).map((n) => (typeof n === 'string' ? { title: null, content: n } : { title: n.title || null, content: n.content || '' }))
    const questions = (m.questions || []).map((q, qi) => {
      const at = `${where} Q${qi + 1}`
      if (!TYPES.includes(q.type)) errors.push(`${at}: type must be one of ${TYPES.join(', ')}.`)
      if (!q.prompt) errors.push(`${at}: missing "prompt".`)
      if (q.answer === undefined || q.answer === null || q.answer === '') errors.push(`${at}: missing "answer".`)
      if (q.type === 'mcq') {
        if (!Array.isArray(q.choices) || q.choices.length < 2) errors.push(`${at}: mcq needs a "choices" array.`)
        else if (!q.choices.includes(q.answer)) errors.push(`${at}: answer must exactly match one of the choices.`)
      }
      if (q.type === 'true_false' && typeof q.answer !== 'boolean') errors.push(`${at}: true_false answer must be true or false (no quotes).`)
      if (q.type === 'enumeration' && !Array.isArray(q.answer)) errors.push(`${at}: enumeration answer must be an array.`)
      return {
        type: q.type,
        prompt: q.prompt,
        choices: q.type === 'mcq' ? q.choices : null,
        answer: q.answer,
        explanation: q.explanation || null,
        difficulty: q.difficulty || 1,
      }
    })
    if (m.term && !['prelim', 'midterm', 'finals'].includes(m.term))
      errors.push(`${where}: "term" must be "prelim", "midterm" or "finals".`)
    if (ctx.term && m.term && m.term !== ctx.term)
      warnings.push(`${where}: file says "${m.term}", but you're adding it to "${ctx.term}".`)
    return {
      slug: m.slug || slugify(m.title),
      title: m.title,
      summary: m.summary || null,
      order: m.order ?? mi + 1,
      term: ctx.term || m.term || null,
      notes,
      questions,
    }
  })
  return { subject, modules, errors, warnings }
}
