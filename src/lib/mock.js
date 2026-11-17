// Local test data, used only when VITE_MOCK=1 (never in production builds on Vercel).
const subjects = [
  { id: 's1', slug: 'blockchain', code: 'BLOCKTECH', name: 'Blockchain Technology', term: 'Second Semester SY 2026-2027', color: '#f59e0b' },
  { id: 's2', slug: 'art-appreciation', code: 'ARTAPP', name: 'Art Appreciation', term: 'Second Semester SY 2026-2027', color: '#e11d48' },
]

const modules = [
  {
    id: 'm1',
    subject_id: 's1',
    slug: 'hashing',
    term: 'prelim',
    title: 'Hashing Basics',
    summary: 'What hash functions are and why blockchains need them.',
    materials: [
      { id: 'mat1', kind: 'pdf', title: 'Hashing slides', url: 'https://example.com/hash.pdf', storage_path: 'm1/x-hash.pdf', file_name: 'hash.pdf', size_bytes: 2400000, sort_order: 1 },
      { id: 'mat2', kind: 'video', title: 'SHA-256 explained', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', sort_order: 2 },
      { id: 'mat3', kind: 'slides', title: 'Lecture deck', url: 'https://example.com/deck.pptx', storage_path: 'm1/y-deck.pptx', file_name: 'deck.pptx', size_bytes: 5100000, sort_order: 3 },
    ],
    sort_order: 1,
    reviews: [
      {
        id: 'r1',
        title: 'Hash functions',
        sort_order: 1,
        content:
          '## What is a hash?\nA **hash function** maps data of any size to a fixed-size output.\n\n- Deterministic: same input, same output\n- **Avalanche effect**: a tiny change flips about half the output bits\n- SHA-256 outputs 256 bits (64 hex characters)\n\n> Blocks store the hash of the previous block, which links the chain.',
      },
    ],
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'How many bits does SHA-256 output?', choices: ['128', '160', '256', '512'], answer: '256', explanation: 'The number in the name is the output size in bits.' },
      { id: 'q2', type: 'true_false', prompt: 'A hash function always produces the same output for the same input.', answer: true, explanation: 'This property is called determinism.' },
      { id: 'q3', type: 'identification', prompt: 'A tiny change in input drastically changes the hash. What is this property called?', answer: ['avalanche effect', 'avalanche'], explanation: null },
      { id: 'q4', type: 'enumeration', prompt: 'Give the three security properties of cryptographic hash functions.', answer: [['pre-image resistance', 'preimage resistance'], ['second pre-image resistance', 'second preimage resistance'], 'collision resistance'], explanation: null },
    ],
  },
  {
    id: 'm2',
    subject_id: 's1',
    slug: 'consensus',
    term: 'midterm',
    title: 'Consensus',
    summary: 'How nodes agree on one history.',
    sort_order: 2,
    reviews: [{ id: 'r2', title: null, sort_order: 1, content: '## Proof of Work\nMiners race to find a nonce that makes the block hash fall below a target.' }],
    questions: [
      { id: 'q5', type: 'mcq', prompt: 'Which consensus mechanism does Bitcoin use?', choices: ['Proof of Stake', 'Proof of Work', 'Proof of Authority', 'Delegated PoS'], answer: 'Proof of Work', explanation: null },
      { id: 'q6', type: 'identification', prompt: 'The number miners change to find a valid block hash.', answer: 'nonce', explanation: null },
    ],
  },
]

const sets = [
  {
    id: 'set1', subject_id: 's1', term: 'prelim', module_id: 'm1', title: 'Hashing terms', description: 'Key words from the hashing lesson', sort_order: 1,
    flashcards: [
      { id: 'f1', front: 'Hash function', back: 'Maps any-size input to a fixed-size output.', sort_order: 1 },
      { id: 'f2', front: 'Avalanche effect', back: 'Small input change → very different hash.', sort_order: 2 },
      { id: 'f3', front: 'SHA-256 output length', back: '256 bits / 64 hex characters', sort_order: 3, back_image: 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22120%22><rect width=%22300%22 height=%22120%22 fill=%22%23f59e0b%22/><text x=%2220%22 y=%2270%22 font-size=%2232%22>256 bits</text></svg>' },
    ],
  },
  { id: 'set2', subject_id: 's1', term: 'midterm', module_id: 'm2', title: 'Consensus terms', description: null, sort_order: 1, flashcards: [{ id: 'f4', front: 'Nonce', back: 'Number used once; miners vary it to find a valid hash.', sort_order: 1 }] },
]

const quizzes = [
  {
    id: 'qz1', subject_id: 's1', term: 'prelim', title: 'Quiz 1: Hashing', quiz_date: '2026-11-14', note: '5 items', time_limit_min: 2,
    module_ids: ['m1'], sort_order: 1, created_at: 'x',
    quiz_questions: [
      { id: 'zq1', type: 'mcq', prompt: 'SHA-256 output size?', choices: ['128 bits', '256 bits'], answer: '256 bits', explanation: null, sort_order: 1 },
      { id: 'zq2', type: 'true_false', prompt: 'Hashes are deterministic.', answer: true, explanation: 'Same input, same output.', sort_order: 2 },
      { id: 'zq3', type: 'identification', prompt: 'Small change → very different hash. Called the ______ effect.', answer: ['avalanche', 'avalanche effect'], explanation: null, sort_order: 3 },
    ],
  },
]

const clone = (x) => JSON.parse(JSON.stringify(x))

export function mockSubjects() {
  return subjects.map((s) => ({ ...s, modules: [{ count: modules.filter((m) => m.subject_id === s.id).length }] }))
}

export function mockSubjectFull(slug) {
  const s = subjects.find((x) => x.slug === slug)
  if (!s) return null
  return clone({ ...s, modules: modules.filter((m) => m.subject_id === s.id), flashcard_sets: sets.filter((x) => x.subject_id === s.id), quizzes: quizzes.filter((x) => x.subject_id === s.id) })
}
