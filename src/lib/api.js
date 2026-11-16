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
  'id, slug, title, summary, term, sort_order, reviews(id, title, content, sort_order), questions(id, type, prompt, choices, answer, explanation, difficulty)'
const SET_FIELDS =
  'id, term, module_id, title, description, sort_order, created_at, flashcards(id, front, back, front_image, back_image, sort_order)'

export const TERMS = [
  { key: 'prelim', label: 'Prelim' },
  { key: 'midterm', label: 'Midterm' },
  { key: 'finals', label: 'Finals' },
]

// Loads everything for one subject in a single request (small data, fast tabs).
export async function getSubjectFull(slug, { fresh = false } = {}) {
  if (!fresh && cache.has(slug)) return cache.get(slug)
  let subject
  if (MOCK) {
    subject = mockSubjectFull(slug)
  } else {
    const head = 'id, slug, code, name, term, color'
    let res = await supabase
      .from('subjects')
      .select(`${head}, modules(${MODULE_FIELDS}), flashcard_sets(${SET_FIELDS})`)
      .eq('slug', slug)
      .maybeSingle()
    if (res.error) {
      // 003 migration not run yet → load without terms/sets
      res = await supabase
        .from('subjects')
        .select(`${head}, modules(${MODULE_FIELDS.replace(' term,', '')})`)
        .eq('slug', slug)
        .maybeSingle()
      if (res.data) res.data.needsMigration = true
    }
    subject = unwrap(res)
  }
  if (!subject) return null

  const bySort = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.created_at).localeCompare(String(b.created_at))
  subject.modules.sort(bySort)
  for (const m of subject.modules) {
    m.reviews = (m.reviews || []).sort(bySort)
    m.questions = (m.questions || []).map((q) => ({ ...q, module_id: m.id }))
  }
  subject.sets = (subject.flashcard_sets || []).sort(bySort)
  delete subject.flashcard_sets
  for (const st of subject.sets) st.flashcards = (st.flashcards || []).sort(bySort)
  subject.questions = subject.modules.flatMap((m) => m.questions)
  subject.flashcards = subject.sets.flatMap((st) => st.flashcards)
  subject.moduleById = Object.fromEntries(subject.modules.map((m) => [m.id, m]))
  cache.set(slug, subject)
  return subject
}

export const modulesInTerm = (subject, term) => subject.modules.filter((m) => m.term === term)
export const setsInTerm = (subject, term) => subject.sets.filter((s) => s.term === term)

export function clearCache(slug) {
  slug ? cache.delete(slug) : cache.clear()
}

// ---------- Admin writes (RLS: only the owner account can do these) ----------
function check(res, what) {
  if (res.error) {
    const msg = res.error.message || String(res.error)
    if (/flashcards/.test(msg) && /(does not exist|schema cache)/.test(msg))
      throw new Error('Flashcards table missing — run supabase/003_terms_flashcard_sets.sql first.')
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
      .select('id, slug, name, modules(id, slug, title, term, sort_order)')
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
        { subject_id: subjectId, slug: mod.slug, title: mod.title, summary: mod.summary ?? null, sort_order: mod.order ?? 0, ...(mod.term ? { term: mod.term } : {}) },
        { onConflict: 'subject_id,slug' },
      )
      .select('id'),
    'module',
  )
  const id = row.id
  // Replace only the parts this import provides (a notes-only import keeps existing questions).
  if (replace) {
    const parts = { reviews: mod.notes, questions: mod.questions }
    for (const [t, arr] of Object.entries(parts)) {
      if (arr.length) check(await supabase.from(t).delete().eq('module_id', id), t)
    }
  }
  const withId = (arr, extra = () => ({})) => arr.map((x, i) => ({ ...x, ...extra(x, i), module_id: id }))
  if (mod.notes.length)
    check(await supabase.from('reviews').insert(withId(mod.notes, (_, i) => ({ sort_order: i + 1 }))), 'notes')
  if (mod.questions.length) check(await supabase.from('questions').insert(withId(mod.questions)), 'questions')
  return id
}

export async function deleteModule(moduleId) {
  check(await supabase.from('modules').delete().eq('id', moduleId), 'module')
}

// ---------- Admin editor ----------
export async function getModuleAdmin(id) {
  const m = check(
    await supabase
      .from('modules')
      .select('id, slug, title, summary, term, sort_order, reviews(id, title, content, sort_order), questions(id, type, prompt, choices, answer, explanation, created_at)')
      .eq('id', id)
      .single(),
    'module',
  )
  const bySort = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  m.reviews.sort(bySort)
  m.questions.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
  return m
}

export async function updateRow(table, id, patch) {
  return check(await supabase.from(table).update(patch).eq('id', id).select().single(), table)
}
export async function insertRow(table, row) {
  return check(await supabase.from(table).insert(row).select().single(), table)
}
export async function deleteRow(table, id) {
  check(await supabase.from(table).delete().eq('id', id), table)
}

// ---------- Flashcard sets ----------
const BUCKET = 'flashcard-images'

export async function saveFlashcardSet(set, cards) {
  const row = {
    subject_id: set.subject_id,
    term: set.term,
    module_id: set.module_id || null,
    title: set.title.trim(),
    description: set.description?.trim() || null,
    sort_order: set.sort_order ?? 0,
  }
  let id = set.id
  if (id) check(await supabase.from('flashcard_sets').update(row).eq('id', id), 'set')
  else id = check(await supabase.from('flashcard_sets').insert(row).select('id').single(), 'set').id

  const clean = cards
    .map((c, i) => ({ ...c, sort_order: i + 1 }))
    .filter((c) => (c.front || '').trim() || (c.back || '').trim() || c.front_image || c.back_image)
  const fields = (c) => ({
    set_id: id,
    front: (c.front || '').trim(),
    back: (c.back || '').trim(),
    front_image: c.front_image || null,
    back_image: c.back_image || null,
    sort_order: c.sort_order,
  })

  // delete cards that were removed
  const keep = clean.filter((c) => c.id).map((c) => c.id)
  let del = supabase.from('flashcards').delete().eq('set_id', id)
  if (keep.length) del = del.not('id', 'in', `(${keep.join(',')})`)
  check(await del, 'flashcards')

  const existing = clean.filter((c) => c.id).map((c) => ({ id: c.id, ...fields(c) }))
  if (existing.length) check(await supabase.from('flashcards').upsert(existing), 'flashcards')
  const fresh = clean.filter((c) => !c.id).map(fields)
  if (fresh.length) check(await supabase.from('flashcards').insert(fresh), 'flashcards')
  return id
}

export async function deleteFlashcardSet(id) {
  check(await supabase.from('flashcard_sets').delete().eq('id', id), 'set')
}

// Shrinks a photo to max 1200px WebP before upload (a 5 MB photo → ~150 KB).
async function compress(file) {
  const img = await createImageBitmap(file)
  const scale = Math.min(1, 1200 / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((res) => canvas.toBlob(res, 'image/webp', 0.82))
}

export async function uploadCardImage(file) {
  const blob = file.type === 'image/gif' ? file : await compress(file)
  const ext = file.type === 'image/gif' ? 'gif' : 'webp'
  const path = `cards/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || 'image/webp' })
  if (error) {
    if (/bucket/i.test(error.message)) throw new Error('Image storage missing — run supabase/003_terms_flashcard_sets.sql.')
    throw new Error(`Image upload: ${error.message}`)
  }
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

// ---------- Subjects (Admin page) ----------
export async function listSubjectsAdmin() {
  return check(
    await supabase.from('subjects').select('id, slug, code, name, term, color, sort_order, modules(count)').order('sort_order'),
    'subjects',
  )
}
export async function saveSubject(sub) {
  const row = {
    slug: sub.slug,
    code: sub.code?.trim() || null,
    name: sub.name.trim(),
    term: sub.term?.trim() || null,
    color: sub.color,
    sort_order: Number(sub.sort_order) || 0,
  }
  if (sub.id) return check(await supabase.from('subjects').update(row).eq('id', sub.id).select().single(), 'subject')
  return check(await supabase.from('subjects').insert(row).select().single(), 'subject')
}
export async function deleteSubject(id) {
  check(await supabase.from('subjects').delete().eq('id', id), 'subject')
}
