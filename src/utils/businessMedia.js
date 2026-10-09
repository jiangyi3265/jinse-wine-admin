import { ref } from 'vue'

// Shared across forms so a save cannot race an unfinished image upload.
export const pendingImageUploads = ref(0)
export function mediaUrl(value) {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return `${import.meta.env.VITE_APP_BASE_API || ''}${value.startsWith('/') ? '' : '/'}${value}`
}
