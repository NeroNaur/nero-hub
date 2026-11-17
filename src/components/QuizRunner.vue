<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { grade, isAnswered, formatAnswer } from '@/lib/grade'
import { recordAnswer, recordAttempt, overrideAnswer } from '@/lib/progress'
import QuestionCard from './QuestionCard.vue'

const props = defineProps({
  subject: Object,
  questions: Array,
  mode: { type: String, default: 'instant' }, // 'instant' = feedback each question, 'deferred' = graded at the end
  kind: { type: String, default: 'practice' }, // practice | quiz | exam | review
  timeLimit: { type: Number, default: 0 }, // seconds; 0 = untimed
  term: { type: String, default: null },
  quizId: { type: String, default: null }, // class quiz being retaken
})
const emit = defineEmits(['restart', 'exit'])
const kindLabel = { practice: 'Practice', quiz: 'Mock quiz', exam: 'Mock exam', review: 'Review', 'class-quiz': 'Quiz' }

const list = ref([...props.questions])
const index = ref(0)
const responses = reactive({})
const results = reactive({})
const finished = ref(false)
const startedAt = ref(Date.now())
const attempt = ref(null)
const now = ref(Date.now())
let timer

const q = computed(() => list.value[index.value])
const isLast = computed(() => index.value === list.value.length - 1)
const revealed = computed(() => props.mode === 'instant' && Boolean(results[q.value?.id]))
const answeredCount = computed(() => list.value.filter((x) => isAnswered(x, responses[x.id])).length)
const remaining = computed(() =>
  props.timeLimit ? Math.max(0, props.timeLimit - Math.floor((now.value - startedAt.value) / 1000)) : null,
)
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

const score = computed(() => list.value.filter((x) => results[x.id]?.correct).length)
const byModule = computed(() => {
  const out = {}
  for (const x of list.value) {
    const m = (out[x.module_id] ||= { title: props.subject.moduleById[x.module_id]?.title, right: 0, total: 0 })
    m.total++
    if (results[x.id]?.correct) m.right++
  }
  return Object.values(out)
})
const wrong = computed(() => list.value.filter((x) => !results[x.id]?.correct))

function check() {
  if (!q.value || results[q.value.id]) return
  const r = grade(q.value, responses[q.value.id])
  results[q.value.id] = r
  recordAnswer(props.subject.slug, q.value.id, r.correct, { fromReview: props.kind === 'review' })
}

function next() {
  if (isLast.value) return finish()
  index.value++
}

function primary() {
  if (props.mode === 'instant') {
    if (!revealed.value) {
      if (isAnswered(q.value, responses[q.value.id])) check()
    } else next()
  } else if (!isLast.value) index.value++
}

function finish(force = false) {
  if (finished.value) return
  if (props.mode === 'deferred') {
    const unanswered = list.value.length - answeredCount.value
    if (!force && unanswered && !confirm(`${unanswered} unanswered. Submit anyway?`)) return
    for (const x of list.value) {
      const r = grade(x, responses[x.id])
      results[x.id] = r
      recordAnswer(props.subject.slug, x.id, r.correct, { fromReview: props.kind === 'review' })
    }
  }
  finished.value = true
  clearInterval(timer)
  attempt.value = recordAttempt({
    subject: props.subject.slug,
    kind: props.kind,
    term: props.term,
    quiz_id: props.quizId,
    modules: [...new Set(list.value.map((x) => x.module_id))],
    score: score.value,
    total: list.value.length,
    duration: Math.round((Date.now() - startedAt.value) / 1000),
    byModule: byModule.value,
  })
  window.scrollTo({ top: 0 })
}

function override(x) {
  const r = results[x.id]
  if (!r || r.correct) return
  r.correct = true
  r.overridden = true
  overrideAnswer(props.subject.slug, x.id)
  if (attempt.value) {
    attempt.value.score = score.value
    attempt.value.byModule = byModule.value
  }
}

function retryWrong() {
  const again = wrong.value
  list.value = again
  for (const k of Object.keys(responses)) delete responses[k]
  for (const k of Object.keys(results)) delete results[k]
  index.value = 0
  finished.value = false
  attempt.value = null
  startedAt.value = Date.now()
}

function onKey(e) {
  if (finished.value || !q.value) return
  const tag = e.target.tagName
  const typing = tag === 'INPUT' || tag === 'TEXTAREA'
  if (!typing && !revealed.value) {
    if (q.value.type === 'mcq' && /^[1-9]$/.test(e.key)) {
      const c = q.value.choices[Number(e.key) - 1]
      if (c != null) responses[q.value.id] = c
    }
    if (q.value.type === 'true_false' && (e.key === 't' || e.key === 'f')) responses[q.value.id] = e.key === 't'
  }
  if (e.key === 'Enter' && !typing) {
    e.preventDefault()
    primary()
  }
  if (!typing && props.mode === 'deferred') {
    if (e.key === 'ArrowRight' && !isLast.value) index.value++
    if (e.key === 'ArrowLeft' && index.value > 0) index.value--
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  if (props.timeLimit) {
    timer = setInterval(() => {
      now.value = Date.now()
      if (remaining.value === 0) finish(true)
    }, 500)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  clearInterval(timer)
})
</script>

<template>
  <!-- ===== Results ===== -->
  <div v-if="finished" class="space-y-6">
    <div class="rounded-2xl border border-line bg-panel p-6 sm:p-8 text-center">
      <p class="font-mono text-xs text-muted uppercase">{{ kindLabel[kind] || kind }} result</p>
      <p class="font-display text-6xl font-bold mt-2" :style="{ color: subject.color }">
        {{ Math.round((score / list.length) * 100) }}%
      </p>
      <p class="text-muted mt-1">{{ score }} / {{ list.length }} correct</p>
      <div class="mt-6 flex flex-wrap justify-center gap-2">
        <button v-if="wrong.length" class="rounded-lg border border-line px-4 py-2 text-sm hover:border-white/40" @click="retryWrong">
          Retry {{ wrong.length }} wrong
        </button>
        <button class="rounded-lg px-4 py-2 text-sm font-semibold text-ink" :style="{ background: subject.color }" @click="emit('restart')">
          New set
        </button>
      </div>
    </div>

    <div v-if="byModule.length > 1" class="rounded-2xl border border-line bg-panel p-6">
      <p class="font-mono text-xs text-muted mb-4">BY MODULE</p>
      <div v-for="m in byModule" :key="m.title" class="mb-3">
        <div class="flex justify-between text-sm"><span>{{ m.title }}</span><span class="font-mono">{{ m.right }}/{{ m.total }}</span></div>
        <div class="h-1.5 rounded bg-line mt-1 overflow-hidden">
          <div class="h-full rounded" :style="{ width: (m.right / m.total) * 100 + '%', background: subject.color }" />
        </div>
      </div>
    </div>

    <div class="space-y-2">
      <p class="font-mono text-xs text-muted">ANSWERS</p>
      <div
        v-for="(x, i) in list"
        :key="x.id"
        class="rounded-xl border p-4"
        :class="results[x.id]?.correct ? 'border-line' : 'border-red-500/40 bg-red-500/5'"
      >
        <p class="text-sm"><span class="font-mono text-muted mr-2">{{ i + 1 }}.</span>{{ x.prompt }}</p>
        <p class="text-sm mt-2">
          <span class="text-muted">You: </span>
          <span :class="results[x.id]?.correct ? 'text-green-300' : 'text-red-300'">
            {{ responses[x.id] === undefined || responses[x.id] === '' ? '—' : x.type === 'true_false' ? (responses[x.id] ? 'True' : 'False') : responses[x.id] }}
          </span>
          <template v-if="!results[x.id]?.correct">
            <span class="text-muted ml-3">Answer: </span><span class="font-semibold">{{ formatAnswer(x) }}</span>
          </template>
        </p>
        <button
          v-if="!results[x.id]?.correct && ['identification', 'enumeration'].includes(x.type)"
          class="mt-2 text-xs font-mono text-muted underline hover:text-white"
          @click="override(x)"
        >I was right — count it</button>
      </div>
    </div>
  </div>

  <!-- ===== In progress ===== -->
  <div v-else-if="q">
    <div class="mb-4 flex items-center gap-4">
      <div class="flex-1 h-1.5 rounded bg-line overflow-hidden">
        <div
          class="h-full transition-all"
          :style="{ width: ((mode === 'instant' ? index + (revealed ? 1 : 0) : answeredCount) / list.length) * 100 + '%', background: subject.color }"
        />
      </div>
      <span class="font-mono text-xs text-muted">{{ index + 1 }}/{{ list.length }}</span>
      <span
        v-if="remaining !== null"
        class="font-mono text-sm rounded px-2 py-0.5"
        :class="remaining < 60 ? 'bg-red-500/20 text-red-300' : 'bg-white/5'"
      >{{ fmt(remaining) }}</span>
    </div>

    <QuestionCard
      :key="q.id"
      v-model="responses[q.id]"
      :q="q"
      :number="index + 1"
      :revealed="revealed"
      :result="results[q.id]"
      :module-title="subject.moduleById[q.module_id]?.title"
      :color="subject.color"
      @override="override(q)"
      @submit="primary"
    />

    <div class="mt-4 flex items-center gap-2">
      <button
        v-if="mode === 'deferred'"
        class="rounded-lg border border-line px-4 py-2 text-sm disabled:opacity-30"
        :disabled="index === 0"
        @click="index--"
      >← Prev</button>
      <button class="text-sm text-muted hover:text-white" @click="emit('exit')">Quit</button>
      <div class="ml-auto flex gap-2">
        <template v-if="mode === 'instant'">
          <button
            v-if="!revealed"
            class="rounded-lg px-5 py-2 text-sm font-semibold text-ink disabled:opacity-40"
            :style="{ background: subject.color }"
            :disabled="!isAnswered(q, responses[q.id])"
            @click="check"
          >Check</button>
          <button v-else class="rounded-lg px-5 py-2 text-sm font-semibold text-ink" :style="{ background: subject.color }" @click="next">
            {{ isLast ? 'See results' : 'Next →' }}
          </button>
        </template>
        <template v-else>
          <button v-if="!isLast" class="rounded-lg border border-line px-4 py-2 text-sm" @click="index++">Next →</button>
          <button class="rounded-lg px-5 py-2 text-sm font-semibold text-ink" :style="{ background: subject.color }" @click="finish()">
            Submit
          </button>
        </template>
      </div>
    </div>

    <div v-if="mode === 'deferred'" class="mt-6 flex flex-wrap gap-1.5">
      <button
        v-for="(x, i) in list"
        :key="x.id"
        class="size-8 rounded-md border font-mono text-xs transition"
        :class="[
          i === index ? 'border-white text-white' : 'border-line text-muted',
          isAnswered(x, responses[x.id]) ? 'bg-white/10' : '',
        ]"
        @click="index = i"
      >{{ i + 1 }}</button>
    </div>

    <p class="mt-6 font-mono text-[11px] text-muted hidden sm:block">
      Keys: 1–4 pick choice · T/F · Enter {{ mode === 'instant' ? 'check / next' : 'next' }}<template v-if="mode === 'deferred'"> · ← → move</template>
    </p>
  </div>
</template>
