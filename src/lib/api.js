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

export function clearCache(slug) {
  slug ? cache.delete(slug) : cache.clear()
}

// ---------- Admin writes (RLS: only the owner account can do these) ----------
function check(res, what) {
  if (res.error) {
    const msg = res.error.message || String(res.error)
    if (/flashcards/.test(msg) && /(does not exist|schema cache)/.test(msg))
      throw new Error('Flashcards table missing — run supabase/002_flashcards.sql first.')
    if (/row-level security|permission denied/i.test(msg))
      throw new Error(`Not allowed to write ${what}. Is your account in app_owner?`)
    throw new Error(`${what}: ${msg}`)
  }
  return res.data
}

export async function listSubjectsWithModules() {
  return check(
    await supabase
      .from('subjects')
      .select('id, slug, name, modules(id, slug, title, sort_order)')
      .order('sort_order')
      .order('sort_order', { referencedTable: 'modules' }),
    'subjects',
  )
}

export async function importModule(subjectId, mod, { replace = true } = {}) {
  const [row] = check(
    await supabase
      .from('modules')
      .upsert(
        { subject_id: subjectId, slug: mod.slug, title: mod.title, summary: mod.summary ?? null, sort_order: mod.order ?? 0 },
        { onConflict: 'subject_id,slug' },
      )
      .select('id'),
    'module',
  )
  const id = row.id
  // Replace only the parts this import provides (a notes-only import keeps existing questions).
  if (replace) {
    const parts = { reviews: mod.notes, questions: mod.questions, flashcards: mod.flashcards }
    for (const [t, arr] of Object.entries(parts)) {
      if (arr.length) check(await supabase.from(t).delete().eq('module_id', id), t)
    }
  }
  const withId = (arr, extra = () => ({})) => arr.map((x, i) => ({ ...x, ...extra(x, i), module_id: id }))
  if (mod.notes.length)
    check(await supabase.from('reviews').insert(withId(mod.notes, (_, i) => ({ sort_order: i + 1 }))), 'notes')
  if (mod.questions.length) check(await supabase.from('questions').insert(withId(mod.questions)), 'questions')
  if (mod.flashcards.length)
    check(await supabase.from('flashcards').insert(withId(mod.flashcards, (_, i) => ({ sort_order: i + 1 }))), 'flashcards')
  return id
}

export async function deleteModule(moduleId) {
  check(await supabase.from('modules').delete().eq('id', moduleId), 'module')
}
