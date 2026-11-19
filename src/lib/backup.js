// Backups in the SAME format the import boxes read, so a backup can be re-imported.
const q = (x) => ({ type: x.type, prompt: x.prompt, choices: x.type === 'mcq' ? x.choices : undefined, answer: x.answer, explanation: x.explanation ?? null })

export function lessonFile(subject, m) {
  return {
    subject: subject.slug,
    modules: [
      {
        slug: m.slug,
        title: m.title,
        summary: m.summary ?? null,
        order: m.sort_order ?? 0,
        term: m.term ?? null,
        notes: m.reviews.map((r) => ({ title: r.title ?? null, content: r.content })),
        questions: m.questions.map(q),
      },
    ],
  }
}

export function subjectFile(subject) {
  const slugOf = Object.fromEntries(subject.modules.map((m) => [m.id, m.slug]))
  return {
    backup_of: subject.name,
    backup_date: new Date().toISOString(),
    note: 'Lessons re-import with "+ Add lesson"; quizzes with "+ Add quiz/mock quiz/mock exam". Flashcards and materials are listed for reference (files stay in storage).',
    subject: subject.slug,
    modules: subject.modules.map((m) => lessonFile(subject, m).modules[0]),
    quizzes: subject.quizzes.map((z) => ({
      type: z.kind || 'quiz',
      title: z.title,
      date: z.quiz_date ?? null,
      term: z.term,
      note: z.note ?? null,
      time_limit: z.time_limit_min ?? null,
      lessons: z.module_ids.map((id) => slugOf[id]).filter(Boolean),
      questions: z.questions.map(q),
    })),
    flashcard_sets: subject.sets.map((s) => ({
      title: s.title,
      description: s.description ?? null,
      term: s.term,
      lesson: slugOf[s.module_id] ?? null,
      cards: s.flashcards.map((c) => ({ front: c.front, back: c.back, front_image: c.front_image ?? null, back_image: c.back_image ?? null })),
    })),
    materials: subject.modules.flatMap((m) =>
      (m.materials || []).map((x) => ({ lesson: m.slug, title: x.title, kind: x.kind, url: x.url, file_name: x.file_name ?? null })),
    ),
  }
}

export function download(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export const stamp = () => new Date().toISOString().slice(0, 10)
