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
const QUIZ_FIELDS =
  'id, term, title, quiz_date, note, time_limit_min, module_ids, sort_order, created_at, quiz_questions(id, type, prompt, choices, answer, explanation, sort_order, created_at)'
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
    const MAT = ', materials(id, kind, title, url, storage_path, file_name, size_bytes, sort_order, created_at)'
    const QUIZ = `, quizzes(${QUIZ_FIELDS})`
    // Newest first; each step drops one feature whose SQL file may not have been run yet.
    const variants = [
      { sel: `${head}, modules(${MODULE_FIELDS}${MAT}), flashcard_sets(${SET_FIELDS})${QUIZ}`, flags: {} },
      { sel: `${head}, modules(${MODULE_FIELDS}${MAT}), flashcard_sets(${SET_FIELDS})`, flags: { needsQuizzes: true } },
      { sel: `${head}, modules(${MODULE_FIELDS}), flashcard_sets(${SET_FIELDS})`, flags: { needsQuizzes: true, needsMaterials: true } },
      { sel: `${head}, modules(${MODULE_FIELDS.replace(' term,', '')})`, flags: { needsQuizzes: true, needsMaterials: true, needsMigration: true } },
    ]
    let res
    for (const v of variants) {
      res = await supabase.from('subjects').select(v.sel).eq('slug', slug).maybeSingle()
      if (!res.error) {
        if (res.data) Object.assign(res.data, v.flags)
        break
      }
    }
    subject = unwrap(res)
    if (subject) {
      // settings column comes from 006; missing column → defaults
      const st = await supabase.from('subjects').select('settings').eq('id', subject.id).maybeSingle()
      subject.settings = st.error ? {} : st.data?.settings || {}
      if (st.error) subject.needsSettings = true
    }
  }
  if (!subject) return null
  subject.settings ||= {}

  const bySort = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.created_at).localeCompare(String(b.created_at))
  subject.modules.sort(bySort)
  for (const m of subject.modules) {
    m.reviews = (m.reviews || []).sort(bySort)
    m.questions = (m.questions || []).map((q) => ({ ...q, module_id: m.id }))
    m.materials = (m.materials || []).sort(bySort)
  }
  subject.sets = (subject.flashcard_sets || []).sort(bySort)
  delete subject.flashcard_sets
  for (const st of subject.sets) st.flashcards = (st.flashcards || []).sort(bySort)
  subject.quizzes = (subject.quizzes || [])
    .map((qz) => ({
      ...qz,
      module_ids: qz.module_ids || [],
      questions: (qz.quiz_questions || []).sort(bySort).map((q) => ({ ...q, quiz_id: qz.id })),
    }))
    .sort((a, b) => String(b.quiz_date || '').localeCompare(String(a.quiz_date || '')) || bySort(a, b))
  for (const qz of subject.quizzes) delete qz.quiz_questions
  subject.questions = subject.modules.flatMap((m) => m.questions)
  // every question incl. class quizzes (used by the Review mistake bank)
  subject.allQuestions = [...subject.questions, ...subject.quizzes.flatMap((qz) => qz.questions)]
  subject.flashcards = subject.sets.flatMap((st) => st.flashcards)
  subject.moduleById = Object.fromEntries(subject.modules.map((m) => [m.id, m]))
  cache.set(slug, subject)
  return subject
}

export const modulesInTerm = (subject, term) => subject.modules.filter((m) => m.term === term)
export const setsInTerm = (subject, term) => subject.sets.filter((s) => s.term === term)
export const quizzesInTerm = (subject, term) => subject.quizzes.filter((q) => q.term === term)

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

// Deleting a lesson also deletes its uploaded files from storage (otherwise they'd sit there using space).
export async function deleteModule(moduleId) {
  await removeMaterialFiles([moduleId])
  check(await supabase.from('modules').delete().eq('id', moduleId), 'module')
}

async function materialRows(moduleIds) {
  if (!moduleIds.length) return []
  const res = await supabase.from('materials').select('storage_path, size_bytes').in('module_id', moduleIds)
  return res.error ? [] : res.data.filter((r) => r.storage_path) // table missing → nothing to clean
}
async function removeMaterialFiles(moduleIds) {
  const paths = (await materialRows(moduleIds)).map((r) => r.storage_path)
  for (let i = 0; i < paths.length; i += 900) {
    const { error } = await supabase.storage.from('materials').remove(paths.slice(i, i + 900))
    if (error) throw new Error(`Couldn't delete stored files: ${error.message}`)
  }
}
// Card images are stored as public URLs; turn them back into storage paths.
const cardImagePath = (url) => (url ? decodeURIComponent(String(url).split('/flashcard-images/')[1] || '') || null : null)
async function removeCardImages(setIds) {
  if (!setIds.length) return
  const res = await supabase.from('flashcards').select('front_image, back_image').in('set_id', setIds)
  if (res.error) return
  const paths = res.data.flatMap((c) => [cardImagePath(c.front_image), cardImagePath(c.back_image)]).filter(Boolean)
  if (paths.length) await supabase.storage.from('flashcard-images').remove(paths)
}

export async function subjectFileStats(subjectId) {
  const mods = await supabase.from('modules').select('id').eq('subject_id', subjectId)
  const rows = await materialRows((mods.data || []).map((m) => m.id))
  return { count: rows.length, bytes: rows.reduce((n, r) => n + (r.size_bytes || 0), 0) }
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
  await removeCardImages([id])
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
  const mods = await supabase.from('modules').select('id').eq('subject_id', id)
  await removeMaterialFiles((mods.data || []).map((m) => m.id))
  const sets = await supabase.from('flashcard_sets').select('id').eq('subject_id', id)
  await removeCardImages((sets.data || []).map((x) => x.id))
  check(await supabase.from('subjects').delete().eq('id', id), 'subject')
}

// ---------- Lesson materials ----------
const MAT_BUCKET = 'materials'
export const MAX_FILE_MB = 50

export async function addMaterial({ module_id, kind, title, url, file, sort_order }, onStage = () => {}) {
  let row = { module_id, kind, title: title.trim(), url, sort_order }
  if (file) {
    if (file.size > MAX_FILE_MB * 1024 * 1024)
      throw new Error(`That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${MAX_FILE_MB} MB; compress it or add it as a Google Drive link.`)
    onStage('Uploading…')
    const safe = file.name.replace(/[^\w.\-]+/g, '_')
    const path = `${module_id}/${crypto.randomUUID()}-${safe}`
    const { error } = await supabase.storage.from(MAT_BUCKET).upload(path, file, { contentType: file.type || undefined })
    if (error) {
      if (/bucket/i.test(error.message)) throw new Error('File storage missing — run supabase/004_lesson_materials.sql.')
      if (/mime|type/i.test(error.message)) throw new Error('Only PDF, Word (.doc/.docx) and PowerPoint (.ppt/.pptx) files can be uploaded.')
      throw new Error(`Upload: ${error.message}`)
    }
    row = { ...row, url: supabase.storage.from(MAT_BUCKET).getPublicUrl(path).data.publicUrl, storage_path: path, file_name: file.name, size_bytes: file.size }
  }
  onStage('Saving…')
  return check(await supabase.from('materials').insert(row).select().single(), 'material')
}

export async function updateMaterial(id, patch) {
  check(await supabase.from('materials').update(patch).eq('id', id), 'material')
}

export async function deleteMaterial(m) {
  check(await supabase.from('materials').delete().eq('id', m.id), 'material')
  if (m.storage_path) await supabase.storage.from(MAT_BUCKET).remove([m.storage_path])
}

// ---------- Class quizzes ----------
export async function listRecentQuizzes(limit = 6) {
  if (MOCK) return []
  const res = await supabase
    .from('quizzes')
    .select('id, title, quiz_date, term, created_at, subject:subjects(slug, name, code, color), quiz_questions(count)')
    .order('quiz_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit)
  return res.error ? [] : res.data // table not created yet → just show nothing
}

const quizRow = (qz) => ({
  subject_id: qz.subject_id,
  term: qz.term,
  title: qz.title.trim(),
  quiz_date: qz.quiz_date || null,
  note: qz.note?.trim() || null,
  time_limit_min: Number(qz.time_limit_min) || null,
  module_ids: qz.module_ids || [],
  sort_order: qz.sort_order ?? 0,
})
export async function saveQuizMeta(qz) {
  if (qz.id) {
    check(await supabase.from('quizzes').update(quizRow(qz)).eq('id', qz.id), 'quiz')
    return qz.id
  }
  return check(await supabase.from('quizzes').insert(quizRow(qz)).select('id').single(), 'quiz').id
}
export async function importQuiz(qz) {
  const id = await saveQuizMeta(qz)
  if (qz.questions.length)
    check(
      await supabase.from('quiz_questions').insert(qz.questions.map((q, i) => ({ ...q, quiz_id: id, sort_order: i + 1 }))),
      'quiz questions',
    )
  return id
}
export async function deleteQuiz(id) {
  check(await supabase.from('quizzes').delete().eq('id', id), 'quiz')
}

export async function saveSubjectSettings(subjectId, settings) {
  const res = await supabase.from('subjects').update({ settings }).eq('id', subjectId)
  if (res.error && /settings/.test(res.error.message)) throw new Error('Run supabase/006_subject_settings.sql first.')
  check(res, 'settings')
}
