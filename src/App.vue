<script setup>
import { isConfigured } from '@/lib/supabase'
import { ui } from '@/lib/ui'
import SetupNotice from '@/components/SetupNotice.vue'
import { user, signOut } from '@/lib/auth'
import { editMode } from '@/lib/editMode'

const mock = import.meta.env.VITE_MOCK === '1'
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <div
      v-if="user"
      class="sticky top-0 z-40 border-b text-sm transition-colors"
      :class="editMode.on ? 'bg-accent text-ink border-accent' : 'bg-panel border-line'"
    >
      <div class="mx-auto max-w-6xl px-5 h-10 flex items-center gap-3">
        <label class="flex items-center gap-2 font-semibold cursor-pointer select-none">
          Edit mode
          <input v-model="editMode.on" type="checkbox" class="toggle" :class="editMode.on && 'toggle-dark'" />
          <span class="font-mono text-xs">{{ editMode.on ? 'ON' : 'OFF' }}</span>
        </label>
        <span v-if="!editMode.on" class="hidden sm:inline text-xs text-muted">You're seeing the site like a classmate.</span>
        <RouterLink to="/admin" class="ml-auto hover:underline" :class="editMode.on ? '' : 'text-muted hover:text-white'">Admin</RouterLink>
        <button class="hover:underline" :class="editMode.on ? '' : 'text-muted hover:text-white'" @click="signOut">Log out</button>
      </div>
    </div>
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
        <RouterLink v-if="!user" to="/admin" class="float-right hover:text-white">Log in</RouterLink>
      </div>
    </footer>
  </div>
</template>
