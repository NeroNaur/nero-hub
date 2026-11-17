// Remembers the selected term per subject (carries over between tabs).
import { progress } from './progress'
import { modulesInTerm, setsInTerm, quizzesInTerm, TERMS } from './api'

export function currentTerm(subject) {
  const saved = progress.term?.[subject.slug]
  if (saved) return saved
  // default: first term that has anything in it
  const withContent = TERMS.find((t) => modulesInTerm(subject, t.key).length || setsInTerm(subject, t.key).length || quizzesInTerm(subject, t.key).length)
  return withContent?.key || 'prelim'
}

export function setTerm(subject, term) {
  progress.term ||= {}
  progress.term[subject.slug] = term
}
