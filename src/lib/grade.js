// Lenient answer checking: case, accents, punctuation and small typos are forgiven.

export function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function lev(a, b) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[b.length]
}

export function close(expected, given) {
  const a = norm(expected)
  const b = norm(given)
  if (!a || !b) return false
  if (a === b) return true
  const L = Math.max(a.length, b.length)
  return L >= 5 && lev(a, b) / L <= 0.2
}

const alts = (x) => (Array.isArray(x) ? x : [x])

export function splitList(text) {
  return String(text || '')
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function grade(q, response) {
  switch (q.type) {
    case 'mcq':
      return { correct: response != null && norm(response) === norm(q.answer) }
    case 'true_false':
      return { correct: response != null && String(response) === String(q.answer) }
    case 'identification':
      return { correct: alts(q.answer).some((a) => close(a, response)) }
    case 'enumeration': {
      const items = splitList(response)
      const used = new Set()
      let hit = 0
      for (const expected of q.answer) {
        const i = items.findIndex((it, ix) => !used.has(ix) && alts(expected).some((e) => close(e, it)))
        if (i > -1) {
          used.add(i)
          hit++
        }
      }
      return { correct: hit === q.answer.length, partial: hit, of: q.answer.length }
    }
    default:
      return { correct: false }
  }
}

export function formatAnswer(q) {
  if (q.type === 'true_false') return q.answer ? 'True' : 'False'
  if (q.type === 'enumeration') return q.answer.map((a) => alts(a)[0]).join(', ')
  return alts(q.answer)[0]
}

export function isAnswered(q, response) {
  if (q.type === 'true_false') return response === true || response === false
  return String(response ?? '').trim() !== ''
}

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
