<script setup>
defineProps({ what: { type: String, default: 'content' } })
</script>

<template>
  <div class="rounded-xl border border-dashed border-line p-10 text-center">
    <p class="font-display text-lg font-bold">No {{ what }} yet</p>
    <p class="text-muted text-sm mt-2">Once notes are fed in for this subject, they'll show up here.</p>
  </div>
</template>
