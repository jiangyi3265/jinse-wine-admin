<template>
  <div class="platform-lookup">
    <el-select :model-value="value" @update:model-value="changed" :multiple="multiple" :multiple-limit="multiple ? 5 : 0" filterable clearable :loading="loading" :disabled="disabled || (kind === 'skus' && !productId)" :placeholder="placeholder" style="width:100%" @visible-change="visible">
      <el-option v-for="item in options" :key="item.value" :label="item.label" :value="item.value"><span>{{ item.label }}</span><small>{{ item.value }}</small></el-option>
      <template #footer><el-button link type="primary" :loading="loading" @click="load(false)">刷新平台列表</el-button><el-button v-if="hasMore" link type="primary" :loading="loading" @click="load(true)">加载更多</el-button></template>
    </el-select>
    <div v-if="error" class="platform-error">{{ error }} <el-button link type="primary" @click="load(false)">重试</el-button></div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import request from '@/utils/request'
const props = defineProps({ modelValue: [String, Number], kind: { type: String, required: true }, productId: [String, Number], multiple: Boolean, disabled: Boolean, placeholder: { type: String, default: '请选择对应名称' } })
const emit = defineEmits(['update:modelValue', 'change'])
const rows = ref([]), selected = ref([]), loading = ref(false), error = ref(''), hasMore = ref(false)
let cursor = '', sequence = 0, selectionSequence = 0
const value = computed(() => props.multiple ? String(props.modelValue || '').split(',').filter(Boolean) : String(props.modelValue || ''))
const options = computed(() => [...new Map([...selected.value, ...rows.value].map(item => [item.value, item])).values()])
const fetchOptions = params => request({ url: `/business/platform-options/${props.kind}`, params: { ...params, productId: props.productId || '' }, timeout: 60000 })
function changed(v) {
  const values = props.multiple ? (Array.isArray(v) ? v : []) : v
  const available = new Set(options.value.map(item => String(item.value)))
  const valid = props.multiple
    ? values.filter(value => available.has(String(value)))
    : (available.has(String(values)) ? values : '')
  const next = props.multiple ? valid.join(',') : valid || ''
  emit('update:modelValue', next)
  emit('change', next)
}
async function load(more) {
  if (loading.value) return
  const ticket = ++sequence; loading.value = true; error.value = ''
  try {
    const response = await fetchOptions({ cursor: more ? cursor : '' }), data = response.data || {}
    if (ticket !== sequence) return
    rows.value = more ? [...rows.value, ...(data.rows || [])] : data.rows || []
    cursor = data.nextCursor || ''; hasMore.value = Boolean(data.hasMore)
  } catch (e) { if (ticket === sequence) error.value = e.message || '平台列表读取失败，请检查授权配置' }
  finally { if (ticket === sequence) loading.value = false }
}
function visible(open) { if (open && !rows.value.length) load(false) }
watch(() => [props.kind, props.productId], () => { ++sequence; rows.value = []; cursor = ''; hasMore.value = false; loading.value = false })
watch(() => [props.kind, props.productId, props.modelValue], async () => {
  const ticket = ++selectionSequence
  const ids = String(props.modelValue || '')
  selected.value = ids.split(',').filter(Boolean).map(id => ({ value: id, label: '已保存的选项（名称加载中）' }))
  if (!ids || (props.kind === 'skus' && !props.productId)) return
  try {
    const response = await fetchOptions({ ids })
    if (ticket !== selectionSequence) return
    selected.value = response.data?.rows || []
    for (const id of ids.split(',')) if (!selected.value.some(item => item.value === id)) selected.value.push({ value: id, label: '已保存的选项（平台未返回名称）' })
  } catch (e) {
    if (ticket !== selectionSequence) return
    selected.value = ids.split(',').map(id => ({ value: id, label: '已保存的选项（平台名称暂不可用）' }))
    error.value = e.message || '平台名称读取失败，请检查授权配置'
  }
}, { immediate: true })
</script>

<style scoped>
.platform-lookup { width: 100%; min-width: 200px; }
small { float: right; margin-left: 12px; color: var(--el-text-color-placeholder); }
.platform-error { margin-top: 4px; color: var(--el-color-danger); font-size: 12px; line-height: 1.5; }
</style>
