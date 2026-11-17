<script setup>
import { computed } from 'vue'
import { TERMS, modulesInTerm, setsInTerm, quizzesInTerm } from '@/lib/api'
import { currentTerm, setTerm } from '@/lib/term'

const props = defineProps({ subject: Object, count: { type: String, default: 'modules' } }) // modules | sets | quizzes
const term = computed(() => currentTerm(props.subject))
const n = (t) =>
  (props.count === 'sets' ? setsInTerm : props.count === 'quizzes' ? quizzesInTerm : modulesInTerm)(props.subject, t).length
</script>

<template>
  <div class="inline-flex rounded-xl border border-line bg-panel p-1 mb-6">
    <button
      v-for="t in TERMS"
      :key="t.key"
      class="rounded-lg px-4 py-1.5 text-sm font-semibold transition"
      :class="term === t.key ? 'text-ink' : 'text-muted hover:text-white'"
      :style="term === t.key ? { background: subject.color } : {}"
      @click="setTerm(subject, t.key)"
    >
      {{ t.label }}
      <span class="ml-1 font-mono text-[11px] opacity-70">{{ n(t.key) }}</span>
    </button>
  </div>
</template>
