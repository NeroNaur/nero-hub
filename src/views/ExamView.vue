<script setup>
import { useRoute } from 'vue-router'
import ComingSoon from '@/components/ComingSoon.vue'
const route = useRoute()
</script>

<template>
  <RouterLink :to="{ name: 'subject', params: { subject: route.params.subject } }" class="font-mono text-xs text-muted hover:text-white">← Back</RouterLink>
  <h1 class="font-display text-3xl font-bold tracking-tight mt-4 mb-8">Mock Exam</h1>
  <ComingSoon title="Timed exam across all modules" note="Coming in Step 3." />
</template>
