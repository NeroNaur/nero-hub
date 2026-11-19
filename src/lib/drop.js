// Drag-and-drop helper: const { over, on } = useDrop((file, allFiles) => ...)
// Template: <div v-on="on" :class="over && 'ring'">
import { ref } from 'vue'

const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files')

export function useDrop(onFile, { enabled = () => true } = {}) {
  const over = ref(false)
  let depth = 0 // dragenter/leave fire for every child element; count them
  const on = {
    dragenter(e) {
      if (!hasFiles(e) || !enabled()) return
      e.preventDefault()
      depth++
      over.value = true
    },
    dragover(e) {
      if (!hasFiles(e) || !enabled()) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    },
    dragleave() {
      depth = Math.max(0, depth - 1)
      if (!depth) over.value = false
    },
    drop(e) {
      if (!hasFiles(e) || !enabled()) return
      e.preventDefault()
      e.stopPropagation()
      depth = 0
      over.value = false
      const files = [...(e.dataTransfer.files || [])]
      if (files.length) onFile(files[0], files)
    },
  }
  return { over, on }
}

// Reads a dropped/chosen text file (e.g. .json) as a string.
export const readText = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = () => rej(r.error)
    r.readAsText(file)
  })

// Stops the browser from opening a file dropped outside a drop area (which would leave the page).
export function guardStrayDrops() {
  const stop = (e) => hasFiles(e) && e.preventDefault()
  window.addEventListener('dragover', stop)
  window.addEventListener('drop', stop)
}
