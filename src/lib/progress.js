// Per-browser progress (localStorage). Each visitor keeps their own.
import { reactive, watch } from 'vue'

const KEY = 'nero-hub:v1'

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

const init = read()
export const progress = reactive({
  attempts: init.attempts || [], // {subject, kind, modules[], score, total, duration, at, byModule}
  stats: init.stats || {}, // questionId -> {r, w, at}
  mistakes: init.mistakes || {}, // subjectSlug -> [questionId]
  flash: init.flash || {}, // cardId -> 'known' | 'again'
  last: init.last || {}, // subjectSlug -> {module}
})

watch(
  progress,
  (v) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(v))
    } catch {
      /* storage full or blocked: progress just won't persist */
    }
  },
  { deep: true },
)

export function recordAnswer(subjectSlug, questionId, correct, { fromReview = false } = {}) {
  const s = (progress.stats[questionId] ||= { r: 0, w: 0 })
  correct ? s.r++ : s.w++
  s.at = Date.now()
  const list = (progress.mistakes[subjectSlug] ||= [])
  const i = list.indexOf(questionId)
  if (!correct && i < 0) list.push(questionId)
  if (correct && i > -1 && fromReview) list.splice(i, 1)
}

export function recordAttempt(attempt) {
  progress.attempts.unshift({ ...attempt, at: Date.now() })
  if (progress.attempts.length > 300) progress.attempts.length = 300
  return progress.attempts[0]
}

export function moduleAccuracy(module) {
  let r = 0
  let w = 0
  for (const q of module.questions) {
    const s = progress.stats[q.id]
    if (s) {
      r += s.r
      w += s.w
    }
  }
  return r + w ? { pct: Math.round((r / (r + w)) * 100), seen: r + w } : null
}

export function resetSubject(subject) {
  progress.attempts = progress.attempts.filter((a) => a.subject !== subject.slug)
  delete progress.mistakes[subject.slug]
  delete progress.last[subject.slug]
  for (const q of subject.questions) delete progress.stats[q.id]
  for (const c of subject.flashcards) delete progress.flash[c.id]
}

// "I was right": flip a recorded wrong answer to right.
export function overrideAnswer(subjectSlug, questionId) {
  const s = progress.stats[questionId]
  if (s && s.w > 0) {
    s.w--
    s.r++
  }
  const list = progress.mistakes[subjectSlug] || []
  const i = list.indexOf(questionId)
  if (i > -1) list.splice(i, 1)
}
