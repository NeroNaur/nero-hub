import { supabase } from './supabase'
import { mockSubjects, mockSubjectFull } from './mock'

const MOCK = import.meta.env.VITE_MOCK === '1'
const cache = new Map()

function unwrap({ data, error }) {
  if (error) throw error
  return data
}

export async function listSubjects() {
  if (MOCK) return mockSubjects()
  return unwrap(
    await supabase
      .from('subjects')
      .select('id, slug, code, name, term, color, modules(count)')
      .order('sort_order'),
  )
}

const MODULE_FIELDS =
  'id, slug, title, summary, sort_order, reviews(id, title, content, sort_order), questions(id, type, prompt, choices, answer, explanation, difficulty)'

// Loads everything for one subject in a single request (small data, fast tabs).
export async function getSubjectFull(slug, { fresh = false } = {}) {
  if (!fresh && cache.has(slug)) return cache.get(slug)
  let subject
  if (MOCK) {
    subject = mockSubjectFull(slug)
  } else {
    const base = `id, slug, code, name, term, color, modules(${MODULE_FIELDS}, flashcards(id, front, back, sort_order))`
    let res = await supabase.from('subjects').select(base).eq('slug', slug).maybeSingle()
    if (res.error) {
      // flashcards table not created yet (002 migration) → load without it
      res = await supabase
        .from('subjects')
        .select(`id, slug, code, name, term, color, modules(${MODULE_FIELDS})`)
        .eq('slug', slug)
        .maybeSingle()
    }
    subject = unwrap(res)
  }
  if (!subject) return null

  const bySort = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  subject.modules.sort(bySort)
  for (const m of subject.modules) {
    m.reviews = (m.reviews || []).sort(bySort)
    m.flashcards = (m.flashcards || []).sort(bySort)
    m.questions = (m.questions || []).map((q) => ({ ...q, module_id: m.id }))
  }
  subject.questions = subject.modules.flatMap((m) => m.questions)
  subject.flashcards = subject.modules.flatMap((m) => m.flashcards.map((c) => ({ ...c, module_id: m.id })))
  subject.moduleById = Object.fromEntries(subject.modules.map((m) => [m.id, m]))
  cache.set(slug, subject)
  return subject
}
