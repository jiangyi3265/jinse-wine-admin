import { reactive } from 'vue'
import { businessOptions } from '@/api/business'

export function useBusinessRelations(owner, fields) {
  const labels = reactive({})
  async function loadRelations(records) {
    await Promise.all(fields().filter(field => field.lookup).map(async field => {
      const ids = [...new Set(records.map(row => row?.[field.prop]).filter(value => value != null && value !== ''))]
      if (!ids.length) return
      try {
        const result = await businessOptions(owner(), field.prop, { ids: ids.join(','), pageSize: 200 })
        labels[field.prop] = { ...labels[field.prop], ...Object.fromEntries((result.rows || []).map(item => [String(item.value), item.label])) }
      } catch { /* Keep the underlying reference intact when a name cannot be resolved. */ }
    }))
  }
  function relationLabel(field, value) {
    return labels[field.prop]?.[String(value)] || '关联记录已删除、不可见或加载失败'
  }
  return { loadRelations, relationLabel }
}
