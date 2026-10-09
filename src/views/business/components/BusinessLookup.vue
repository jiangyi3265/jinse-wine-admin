<template>
  <el-select :model-value="selectedValue" @update:model-value="changed" filterable remote clearable :remote-method="search" :loading="loading" :disabled="disabled" :placeholder="placeholder" style="width: 100%" @visible-change="opened">
    <el-option v-for="item in options" :key="String(item.value)" :value="item.value" :label="item.label" :disabled="activeOnly && item.status != null && String(item.status) !== '0'">
      <span>{{ item.label }}</span><small class="choice-id">{{ item.value }}</small>
    </el-option>
    <template #footer>
      <div class="lookup-footer">
        <span v-if="error" class="lookup-error">{{ error }}</span>
        <span v-else>共 {{ total }} 项，可输入名称搜索</span>
        <el-button v-if="error" link type="primary" @click="fetchPage(false)">重试</el-button>
        <el-button v-else-if="rows.length < total" link type="primary" :loading="loading" @click="fetchPage(true)">加载更多</el-button>
      </div>
    </template>
  </el-select>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { businessOptions } from '@/api/business'
const props = defineProps({ modelValue: [String, Number], owner: { type: String, required: true }, field: { type: String, required: true }, activeOnly: Boolean, disabled: Boolean, placeholder: { type: String, default: '请选择，可输入名称搜索' } })
const emit = defineEmits(['update:modelValue', 'change', 'selected'])
const rows = ref([]), selected = ref([]), total = ref(0), loading = ref(false), error = ref('')
let keyword = '', page = 1, sequence = 0, selectionSequence = 0
const options = computed(() => [...new Map([...selected.value, ...rows.value].map(item => [String(item.value), item])).values()])
const selectedValue = computed(() => options.value.find(item => String(item.value) === String(props.modelValue))?.value ?? props.modelValue)
function changed(value) {
  const option = options.value.find(item => String(item.value) === String(value))
  // 只把选项的真实主键回传给表单，避免输入框展示名称但校验仍拿到名称。
  const next = option ? option.value : (value === '' ? null : value)
  emit('selected', option && !option.invalid ? option : null)
  emit('update:modelValue', next)
  emit('change', next)
}
async function fetchPage(more = false) {
  if (more && loading.value) return
  const ticket = ++sequence, nextPage = more ? page + 1 : 1
  loading.value = true; error.value = ''
  try {
    const result = await businessOptions(props.owner, props.field, { keyword, pageNum: nextPage, pageSize: 30, activeOnly: props.activeOnly })
    if (ticket !== sequence) return
    rows.value = more ? [...rows.value, ...(result.rows || [])] : result.rows || []
    total.value = Number(result.total || 0); page = nextPage
  } catch (e) { if (ticket === sequence) error.value = '选项加载失败' }
  finally { if (ticket === sequence) loading.value = false }
}
function search(value) { keyword = value; fetchPage() }
function opened(visible) { if (visible) { keyword = ''; fetchPage() } }
watch(() => [props.owner, props.field, props.modelValue], async () => {
  const ticket = ++selectionSequence
  selected.value = []
  if (props.modelValue == null || props.modelValue === '') return
  try {
    const result = await businessOptions(props.owner, props.field, { ids: props.modelValue })
    if (ticket !== selectionSequence) return
    selected.value = result.rows?.length ? result.rows : [{ value: props.modelValue, label: '关联记录已删除或无权查看', status: '1', invalid: true }]
    emit('selected', result.rows?.length ? result.rows[0] : null)
  } catch { if (ticket === selectionSequence) { selected.value = [{ value: props.modelValue, label: '名称加载失败，请重试', invalid: true }]; error.value = '名称加载失败' } }
}, { immediate: true })
</script>

<style scoped>
.choice-id { float: right; margin-left: 16px; color: var(--el-text-color-placeholder); }
.lookup-footer { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 12px; color: var(--el-text-color-secondary); }
.lookup-error { color: var(--el-color-danger); }
</style>
