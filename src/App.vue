<script setup>
import { isConfigured } from '@/lib/supabase'
import { ui } from '@/lib/ui'
import SetupNotice from '@/components/SetupNotice.vue'

const mock = import.meta.env.VITE_MOCK === '1'
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header v-if="!ui.focus" class="border-b border-line">
      <div class="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between">
        <RouterLink to="/" class="flex items-center gap-2 font-display font-bold text-lg tracking-tight">
          <span class="grid place-items-center size-7 rounded-md bg-accent text-ink text-sm">N</span>
          nero<span class="text-accent">/</span>hub
        </RouterLink>
        <span class="font-mono text-xs text-muted">2nd Sem · SY 2026–2027</span>
      </div>
    </header>

    <main class="flex-1 mx-auto w-full max-w-6xl px-5 py-8">
      <SetupNotice v-if="!isConfigured && !mock" />
      <RouterView v-else />
    </main>

    <footer v-if="!ui.focus" class="border-t border-line">
      <div class="mx-auto max-w-6xl px-5 py-5 font-mono text-xs text-muted">
        nero-hub · progress is saved in this browser only
      </div>
    </footer>
  </div>
</template>
