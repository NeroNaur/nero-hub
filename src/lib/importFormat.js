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
    const questions = (m.questions || []).map((q, qi) => checkQuestion(q, `${where} Q${qi + 1}`, errors))
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

// One question, validated the same way for lessons and quizzes.
export function checkQuestion(q, at, errors) {
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
  }
}

// Quiz files: { subject, quizzes: [{ title, date, term, note, time_limit, lessons, questions }] }
export function parseQuizImport(text, ctx = {}) {
  let raw
  try {
    raw = JSON.parse(text)
  } catch (e) {
    return { errors: [`Not valid JSON: ${e.message}`], warnings: [], quizzes: [] }
  }
  const errors = []
  const warnings = []
  if (ctx.subject && raw.subject && raw.subject !== ctx.subject)
    warnings.push(`File says subject "${raw.subject}", but you're adding it to "${ctx.subject}".`)
  const list = Array.isArray(raw.quizzes) ? raw.quizzes : raw.title ? [raw] : []
  if (!list.length) errors.push('No quizzes found. Use "quizzes": [ ... ].')
  const quizzes = list.map((z, zi) => {
    const where = `Quiz ${zi + 1}${z.title ? ` (${z.title})` : ''}`
    if (!z.title) errors.push(`${where}: missing "title".`)
    if (z.date && !/^\d{4}-\d{2}-\d{2}$/.test(z.date)) errors.push(`${where}: "date" must look like 2026-11-14.`)
    if (z.term && !['prelim', 'midterm', 'finals'].includes(z.term)) errors.push(`${where}: "term" must be "prelim", "midterm" or "finals".`)
    if (ctx.term && z.term && z.term !== ctx.term) warnings.push(`${where}: file says "${z.term}", but you're adding it to "${ctx.term}".`)
    if (!(z.questions || []).length) errors.push(`${where}: has no questions.`)
    return {
      title: z.title,
      quiz_date: z.date || null,
      term: ctx.term || z.term || 'prelim',
      note: z.note || null,
      time_limit_min: z.time_limit || null,
      lessons: z.lessons || [], // lesson slugs; turned into ids when importing
      questions: (z.questions || []).map((q, qi) => checkQuestion(q, `${where} Q${qi + 1}`, errors)),
    }
  })
  return { quizzes, errors, warnings }
}
