// Converts questions to/from simple text fields for the editor.
const alts = (x) => (Array.isArray(x) ? x : [x])
const lines = (t) => String(t || '').split('\n').map((s) => s.trim()).filter(Boolean)

export function toForm(q) {
  const f = { type: q.type, prompt: q.prompt || '', explanation: q.explanation || '', choicesText: '', answerText: '', answerBool: true }
  if (q.type === 'mcq') {
    f.choicesText = (q.choices || []).join('\n')
    f.answerText = q.answer ?? ''
  } else if (q.type === 'true_false') f.answerBool = q.answer !== false
  else if (q.type === 'identification') f.answerText = alts(q.answer ?? '').join('\n')
  else if (q.type === 'enumeration') f.answerText = (q.answer || []).map((a) => alts(a).join(' | ')).join('\n')
  return f
}

export function fromForm(f) {
  const errors = []
  const q = { type: f.type, prompt: f.prompt.trim(), explanation: f.explanation.trim() || null, choices: null }
  if (!q.prompt) errors.push('Prompt is empty.')
  if (f.type === 'mcq') {
    q.choices = lines(f.choicesText)
    q.answer = f.answerText
    if (q.choices.length < 2) errors.push('Add at least 2 choices (one per line).')
    else if (!q.choices.includes(q.answer)) errors.push('Pick the correct choice.')
  } else if (f.type === 'true_false') q.answer = Boolean(f.answerBool)
  else if (f.type === 'identification') {
    const a = lines(f.answerText)
    if (!a.length) errors.push('Add the answer.')
    q.answer = a.length === 1 ? a[0] : a
  } else if (f.type === 'enumeration') {
    q.answer = lines(f.answerText).map((l) => {
      const parts = l.split('|').map((s) => s.trim()).filter(Boolean)
      return parts.length === 1 ? parts[0] : parts
    })
    if (!q.answer.length) errors.push('Add at least one item.')
  }
  return { q, errors }
}

export const choiceLines = (f) => lines(f.choicesText)
