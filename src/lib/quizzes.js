import { progress } from './progress'

export const quizAttempts = (quizId) => progress.attempts.filter((a) => a.kind === 'class-quiz' && a.quiz_id === quizId)
export function quizScores(quizId) {
  const list = quizAttempts(quizId)
  if (!list.length) return null
  const pct = (a) => Math.round((a.score / a.total) * 100)
  return { last: pct(list[0]), best: Math.max(...list.map(pct)), tries: list.length }
}
export const fmtDate = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null
