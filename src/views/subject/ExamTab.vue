<script setup>
import { inject, computed } from 'vue'
import { canEdit } from '@/lib/editMode'
import TermPicker from '@/components/TermPicker.vue'
import QuizList from '@/components/QuizList.vue'

const subject = inject('subject')
const s = computed(() => subject.value)
</script>

<template>
  <p v-if="s.needsQuizzes && canEdit" class="mb-6 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
    Mock exams need <code>supabase/005_quizzes.sql</code> and <code>007_quiz_kinds.sql</code> to be run in Supabase.
  </p>
  <TermPicker :subject="s" count="mock_exam" />
  <QuizList kind="mock_exam" empty-text="Mock exams for this term will show up here." />
</template>
