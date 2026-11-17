import { progress } from './progress'

export const quizAttempts = (quizId) => progress.attempts.filter((a) => a.quiz_id === quizId)
export function quizScores(quizId) {
  const list = quizAttempts(quizId)
  if (!list.length) return null
  const pct = (a) => Math.round((a.score / a.total) * 100)
  return { last: pct(list[0]), best: Math.max(...list.map(pct)), tries: list.length }
}
export const fmtDate = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null

// Per-kind wording, which tab lists them, and how attempts are labelled in Progress.
export const KIND = {
  quiz: { one: 'quiz', One: 'Quiz', many: 'quizzes', tab: 'quizzes', runner: 'class-quiz', start: 'Retake' },
  mock_quiz: { one: 'mock quiz', One: 'Mock quiz', many: 'mock quizzes', tab: 'practice', runner: 'quiz', start: 'Take' },
  mock_exam: { one: 'mock exam', One: 'Mock exam', many: 'mock exams', tab: 'exam', runner: 'exam', start: 'Take' },
}
export const kindInfo = (k) => KIND[k] || KIND.quiz
