import { supabase } from './supabase'

function unwrap({ data, error }) {
  if (error) throw error
  return data
}

export async function listSubjects() {
  return unwrap(
    await supabase
      .from('subjects')
      .select('id, slug, code, name, term, color, modules(count)')
      .order('sort_order'),
  )
}

export async function getSubject(slug) {
  return unwrap(
    await supabase
      .from('subjects')
      .select('id, slug, code, name, term, color, modules(id, slug, title, summary, sort_order, questions(count))')
      .eq('slug', slug)
      .order('sort_order', { referencedTable: 'modules' })
      .maybeSingle(),
  )
}

export async function getModule(subjectSlug, moduleSlug) {
  const subject = await getSubject(subjectSlug)
  if (!subject) return null
  const mod = subject.modules.find((m) => m.slug === moduleSlug)
  return mod ? { subject, module: mod } : null
}
