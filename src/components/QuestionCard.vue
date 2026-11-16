<script setup>
import { computed } from 'vue'
import { formatAnswer } from '@/lib/grade'

const props = defineProps({
  q: Object,
  revealed: Boolean,
  result: Object, // { correct, partial, of, overridden }
  moduleTitle: String,
  number: Number,
  color: { type: String, default: '#a3e635' },
})
const response = defineModel({ default: null })
const emit = defineEmits(['override', 'submit'])

const typeLabel = { mcq: 'Multiple choice', true_false: 'True or false', identification: 'Identification', enumeration: 'Enumeration' }

function choiceClass(value) {
  const picked = response.value === value
  if (!props.revealed) return picked ? 'border-white bg-white/10' : 'border-line hover:border-white/40'
  const right = props.q.type === 'true_false' ? value === props.q.answer : value === formatAnswer(props.q)
  if (right) return 'border-green-500 bg-green-500/15'
  if (picked) return 'border-red-500 bg-red-500/15'
  return 'border-line opacity-60'
}
const canOverride = computed(
  () => props.revealed && props.result && !props.result.correct && ['identification', 'enumeration'].includes(props.q.type),
)
function onEnter(e) {
  if (props.q.type === 'enumeration' && !(e.ctrlKey || e.metaKey)) return
  e.preventDefault()
  emit('submit')
}
</script>

<template>
  <div class="rounded-2xl border border-line bg-panel p-6 sm:p-8">
    <div class="flex flex-wrap items-center gap-2 font-mono text-xs text-muted mb-4">
      <span v-if="number" class="text-white">Q{{ number }}</span>
      <span>· {{ typeLabel[q.type] }}</span>
      <span v-if="moduleTitle">· {{ moduleTitle }}</span>
    </div>
    <p class="text-lg sm:text-xl leading-relaxed whitespace-pre-line">{{ q.prompt }}</p>

    <div class="mt-6">
      <div v-if="q.type === 'mcq'" class="grid gap-2">
        <button
          v-for="(c, i) in q.choices"
          :key="c"
          type="button"
          :disabled="revealed"
          class="flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition"
          :class="choiceClass(c)"
          @click="response = c"
        >
          <span class="font-mono text-xs text-muted mt-0.5">{{ String.fromCharCode(65 + i) }}</span>
          <span>{{ c }}</span>
        </button>
      </div>

      <div v-else-if="q.type === 'true_false'" class="grid grid-cols-2 gap-2">
        <button
          v-for="v in [true, false]"
          :key="String(v)"
          type="button"
          :disabled="revealed"
          class="rounded-xl border px-4 py-3 font-semibold transition"
          :class="choiceClass(v)"
          @click="response = v"
        >
          {{ v ? 'True' : 'False' }}
        </button>
      </div>

      <input
        v-else-if="q.type === 'identification'"
        v-model="response"
        :disabled="revealed"
        placeholder="Type your answer…"
        class="w-full rounded-xl border border-line bg-ink px-4 py-3 focus:border-white/50 focus:outline-none"
        @keydown.enter="onEnter"
      />

      <div v-else-if="q.type === 'enumeration'">
        <textarea
          v-model="response"
          :disabled="revealed"
          rows="4"
          placeholder="One per line, or separated by commas"
          class="w-full rounded-xl border border-line bg-ink px-4 py-3 focus:border-white/50 focus:outline-none"
          @keydown.enter="onEnter"
        />
        <p class="font-mono text-xs text-muted mt-1">{{ q.answer.length }} items · any order · Ctrl+Enter to submit</p>
      </div>
    </div>

    <div
      v-if="revealed && result"
      class="mt-6 rounded-xl border p-4"
      :class="result.correct ? 'border-green-500/40 bg-green-500/10' : 'border-red-500/40 bg-red-500/10'"
    >
      <p class="font-semibold" :class="result.correct ? 'text-green-300' : 'text-red-300'">
        {{ result.correct ? (result.overridden ? 'Marked correct' : 'Correct') : 'Not quite' }}
        <span v-if="q.type === 'enumeration' && !result.correct" class="font-mono text-xs">
          ({{ result.partial }}/{{ result.of }})
        </span>
      </p>
      <p v-if="!result.correct || q.type !== 'mcq'" class="text-sm mt-1">
        Answer: <span class="font-semibold">{{ formatAnswer(q) }}</span>
      </p>
      <p v-if="q.explanation" class="text-sm text-white/70 mt-2">{{ q.explanation }}</p>
      <button v-if="canOverride" type="button" class="mt-3 text-xs font-mono text-muted underline hover:text-white" @click="emit('override')">
        I was right — count it
      </button>
    </div>
  </div>
</template>
