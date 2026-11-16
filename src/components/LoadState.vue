<script setup>
defineProps({ loading: Boolean, error: [Object, String, null] })
</script>

<template>
  <div v-if="loading" class="font-mono text-sm text-muted animate-pulse">Loading…</div>
  <div v-else-if="error" class="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm">
    <p class="font-semibold text-red-300">Couldn't load data.</p>
    <p class="text-red-200/80 mt-1 font-mono text-xs">{{ error.message || error }}</p>
    <p class="text-muted mt-2 text-xs">If this says "failed to fetch", the free Supabase project may be paused — unpause it in the dashboard.</p>
  </div>
  <slot v-else />
</template>
