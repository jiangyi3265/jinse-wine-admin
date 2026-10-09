<template>
  <div class="app-container business-view business-crud">
    <header class="business-page-heading">
      <div>
        <p class="business-page-kicker">业务管理</p>
        <h1>{{ title }}</h1>
      </div>
      <span class="business-page-count" v-if="total">共 {{ total }} 条</span>
    </header>
    <el-form v-show="showSearch" :model="query" inline class="business-search business-search-panel" @submit.prevent="search">
      <el-form-item v-for="field in searchFields" :key="field.prop" :label="field.label">
        <region-select v-if="field.type === 'region'" v-model="query[field.prop]" partial style="width: 300px" />
        <business-lookup v-else-if="field.lookup" v-model="query[field.prop]" :owner="permissionResource || resource" :field="field.prop" style="width: 220px" />
        <el-select v-else-if="field.options" v-model="query[field.prop]" clearable :placeholder="`全部${field.label}`" style="width: 180px">
          <el-option v-for="option in field.options" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-input v-else v-model.trim="query[field.prop]" clearable :placeholder="`请输入${field.label}`" style="width: 200px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" native-type="submit">查询</el-button>
        <el-button icon="Refresh" @click="resetSearch">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row class="mb8 business-toolbar">
      <el-button type="primary" plain icon="Plus" :disabled="loading" v-hasPermi="[permission('add')]" @click="openCreate">新增{{ title }}</el-button>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="loadList" />
    </el-row>

    <el-alert v-if="loadError" class="business-load-error" type="error" show-icon :closable="false">
      <template #default><span>{{ loadError }}</span><el-button link type="primary" @click="loadList">重试</el-button></template>
    </el-alert>

    <el-table v-loading="loading" :data="rows" border stripe class="business-table" :row-key="idField">
      <el-table-column v-for="field in tableFields" :key="field.prop" :prop="field.prop" :label="field.label" :min-width="field.width || 115" show-overflow-tooltip>
        <template #default="scope">{{ displayValue(field, scope.row[field.prop]) }}</template>
      </el-table-column>
      <el-table-column label="操作" fixed="right" :width="$slots['row-actions'] ? 230 : 142" align="center">
        <template #default="scope">
          <slot name="row-actions" :row="scope.row" />
          <el-button link type="primary" icon="Edit" v-hasPermi="[permission('edit')]" @click="openEdit(scope.row)">修改</el-button>
          <el-button link type="danger" icon="Delete" v-hasPermi="[permission('remove')]" @click="removeRow(scope.row)">删除</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <div class="business-table-empty">
          <span class="business-empty-mark">—</span>
          <strong>暂无{{ title }}数据</strong>
          <small>{{ hasSearchValue ? '请调整筛选条件后重试' : `请先新增${title}` }}</small>
        </div>
      </template>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="loadList" />

    <el-dialog v-model="dialogOpen" :title="`${editing ? '修改' : '新增'}${title}`" width="min(820px, 94vw)" append-to-body destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" :validate-on-rule-change="false" label-width="125px" :disabled="saving">
        <el-row :gutter="16">
          <el-col v-for="field in visibleFormFields" :key="field.prop" :xs="24" :sm="['textarea', 'region'].includes(field.type) ? 24 : 12">
            <el-form-item :label="field.label" :prop="field.prop" :required="field.required && !field.autoCode">
              <el-input v-if="field.autoCode" :model-value="form[field.prop]" readonly placeholder="保存后由系统自动生成" />
              <template v-else-if="field.type === 'region'">
                <region-select v-model="form[field.prop]" :disabled="saving" />
                <small v-if="legacyRegion && !isCompleteRegion(form[field.prop])">原地区：{{ legacyRegion }}，请补全省市区。</small>
              </template>
              <business-image-upload v-else-if="field.type === 'image'" v-model="form[field.prop]" :disabled="saving" :active="dialogOpen" :context-key="formRevision" />
              <business-lookup v-else-if="field.lookup" v-model="form[field.prop]" :owner="permissionResource || resource" :field="field.prop" active-only :placeholder="field.placeholder || `请选择${field.label}`" :disabled="saving" @selected="option => { formLookupValidity[field.prop] = !!option && !option.invalid }" />
              <el-select v-else-if="field.options" v-model="form[field.prop]" clearable :placeholder="`请选择${field.label}`" style="width: 100%">
                <el-option v-for="option in optionsFor(field)" :key="option.value" :label="option.label" :value="option.value" />
              </el-select>
              <el-date-picker v-else-if="field.type === 'datetime'" v-model="form[field.prop]" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" :placeholder="`请选择${field.label}`" style="width: 100%" />
              <el-input-number v-else-if="field.type === 'number' || field.type === 'money'" v-model="form[field.prop]" :min="field.min ?? 0" :max="field.max ?? 999999999" :precision="field.type === 'money' ? 2 : (field.precision ?? 0)" :step="field.type === 'money' ? 1 : 1" controls-position="right" style="width: 100%" />
              <el-input v-else v-model.trim="form[field.prop]" :type="field.type === 'textarea' ? 'textarea' : 'text'" :rows="3" :maxlength="field.maxlength || 512" show-word-limit :placeholder="`请输入${field.label}`" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="saving" :disabled="pendingImageUploads > 0" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createBusiness, getBusiness, listBusiness, removeBusiness, updateBusiness } from '@/api/business'
import { checkPermi } from '@/utils/permission'
import { setupBusinessTableScroll } from '@/utils/businessTableScroll'
import BusinessLookup from './BusinessLookup.vue'
import BusinessImageUpload from './BusinessImageUpload.vue'
import RegionSelect from './RegionSelect.vue'
import { resolveRegion, regionFields, isCompleteRegion } from '@/utils/regions'
import { pendingImageUploads } from '@/utils/businessMedia'
import { useBusinessRelations } from '@/utils/businessRelations'

let tableScroll

const props = defineProps({
  title: { type: String, required: true },
  resource: { type: String, required: true },
  permissionResource: { type: String, default: '' },
  idField: { type: String, required: true },
  fields: { type: Array, required: true }
})

const permission = action => `business:${props.permissionResource || props.resource}:${action}`
const canSeeField = field => !field.permission || checkPermi([field.permission])
const searchFields = computed(() => props.fields.filter(field => field.search && canSeeField(field)))
const tableFields = computed(() => props.fields.filter(field => field.table && canSeeField(field)))
const formFields = computed(() => props.fields.filter(field => field.form !== false && canSeeField(field)))
const isFieldVisible = field => !field.showWhen || form[field.showWhen.prop] === field.showWhen.value
const visibleFormFields = computed(() => formFields.value.filter(isFieldVisible))
const rules = computed(() => Object.fromEntries(visibleFormFields.value.filter(field => field.required && !field.autoCode).map(field => [field.prop, [field.type === 'region'
  ? { required: true, validator: (_rule, value, callback) => callback(isCompleteRegion(value) ? undefined : new Error(`请选择完整${field.label}`)), trigger: 'change' }
  : field.type === 'number' || field.type === 'money'
    ? { required: true, validator: (_rule, value, callback) => callback(value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? undefined : new Error(`请输入${field.label}`)), trigger: 'change' }
  : { required: true, whitespace: true, validator: (_rule, value, callback) => {
      const empty = value === null || value === undefined || String(value).trim() === ''
      const lookupOption = field.lookup && formLookupValidity[field.prop] === false
      callback(empty || lookupOption ? new Error(`${field.lookup || field.options || field.type === 'datetime' ? '请选择' : '请输入'}${field.label}`) : undefined)
    }, trigger: 'change' }]])))
const { loadRelations, relationLabel } = useBusinessRelations(() => props.permissionResource || props.resource, () => props.fields.filter(canSeeField))

const query = reactive({ pageNum: 1, pageSize: 10 })
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const showSearch = ref(true)
const dialogOpen = ref(false)
const editing = ref(false)
const form = reactive({})
const formRef = ref()
const formRevision = ref(0)
const legacyRegion = ref('')
const lookups = reactive({})
const formLookupValidity = reactive({})
const hasSearchValue = computed(() => searchFields.value.some(field => {
  const value = query[field.prop]
  return value !== undefined && value !== null && String(value).trim() !== ''
}))

function optionsFor(field) {
  return field.options || lookups[field.lookup] || []
}

function displayValue(field, value) {
  if (value === null || value === undefined || value === '') return field.emptyLabel || '—'
  if (field.type === 'money') return `¥${(Number(value) / 100).toFixed(2)}`
  if (field.lookup) return relationLabel(field, value)
  const option = optionsFor(field).find(item => item.value === value)
  return option ? option.label : value
}

// 表单以元展示金额，提交前统一换算成数据库使用的整数分。
function toForm(data = {}) {
  formRevision.value++
  legacyRegion.value = [data.province, data.city, data.district].filter(Boolean).join(' / ')
  for (const field of formFields.value) {
    if (field.type === 'region') { form[field.prop] = resolveRegion(data); continue }
    const value = data[field.prop]
    if (field.lookup) formLookupValidity[field.prop] = value == null || value === '' ? undefined : true
    form[field.prop] = field.type === 'money' && value != null
      ? value / 100
      : field.json && value && typeof value === 'object'
        ? JSON.stringify(value, null, 2)
        : (value ?? field.default ?? null)
  }
  form[props.idField] = data[props.idField]
}

function toPayload() {
  const payload = { [props.idField]: form[props.idField] }
  for (const field of formFields.value) {
    if (field.autoCode) continue
    if (field.type === 'region') { Object.assign(payload, regionFields(form[field.prop])); continue }
    const value = isFieldVisible(field) ? (form[field.prop] ?? field.default ?? null) : null
    payload[field.prop] = field.type === 'money' && value != null ? Math.round(value * 100)
      : value == null && (field.type === 'image' || (!field.type && !field.lookup && !field.options) || field.type === 'textarea') ? '' : value
  }
  return payload
}

async function loadList() {
  loading.value = true
  loadError.value = ''
  try {
    const params = { ...query }
    for (const field of searchFields.value.filter(f => f.type === 'region')) {
      Object.assign(params, regionFields(params[field.prop]))
      delete params[field.prop]
    }
    const response = await listBusiness(props.resource, params)
    rows.value = response.rows || []
    total.value = Number(response.total || 0)
    await loadRelations(rows.value)
  } catch (error) {
    loadError.value = error?.message || '数据加载失败，请检查网络后重试'
  } finally {
    loading.value = false
  }
}

function search() {
  query.pageNum = 1
  loadList()
}

function resetSearch() {
  for (const field of searchFields.value) delete query[field.prop]
  search()
}

function openCreate() {
  editing.value = false
  for (const field of props.fields.filter(item => item.lookup)) delete formLookupValidity[field.prop]
  toForm()
  dialogOpen.value = true
}

async function openEdit(row) {
  try {
    const response = await getBusiness(props.resource, row[props.idField])
    editing.value = true
    toForm(response.data)
    dialogOpen.value = true
  } catch (error) {
    ElMessage.error(error?.message || '详情加载失败，请稍后重试')
  }
}

async function save() {
  if (pendingImageUploads.value) return ElMessage.warning('请等待图片上传完成')
  for (const field of formFields.value.filter(item => item.json)) {
    const value = String(form[field.prop] || '').trim()
    if (!value) continue
    try {
      JSON.parse(value)
    } catch {
      ElMessage.error(`${field.label}必须是合法 JSON`)
      return
    }
  }
  const valid = await formRef.value.validate((passed, errors) => {
    if (!passed) {
      const first = Object.keys(errors || {})[0]
      if (first) {
        ElMessage.warning(errors[first][0].message)
        formRef.value.scrollToField(first)
      }
    }
  })
  if (!valid) return
  saving.value = true
  try {
    const payload = toPayload()
    if (editing.value) await updateBusiness(props.resource, payload)
    else await createBusiness(props.resource, payload)
    ElMessage.success('保存成功')
    dialogOpen.value = false
    await loadList()
  } catch {
    // The shared request interceptor presents the server's specific error.
  } finally {
    saving.value = false
  }
}

async function removeRow(row) {
  try {
    await ElMessageBox.confirm(`确认删除${props.title}“${row[tableFields.value[0]?.prop] || row[props.idField]}”？`, '删除确认', { type: 'warning' })
  } catch {
    return
  }
  await removeBusiness(props.resource, row[props.idField])
  ElMessage.success('删除成功')
  if (rows.value.length === 1 && query.pageNum > 1) query.pageNum--
  await loadList()
}

onMounted(async () => {
  tableScroll = setupBusinessTableScroll('.business-crud')
  await loadList()
})
onBeforeUnmount(() => tableScroll?.dispose())
</script>

<style scoped>
.business-view { min-height: calc(100vh - 84px); padding: 18px 20px 28px; background: var(--el-bg-color-page); }
.business-page-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin: 0 0 14px; padding: 2px 2px 4px; }
.business-page-kicker { margin: 0 0 4px; color: #a77b3c; font-size: 11px; font-weight: 700; letter-spacing: .14em; }
.business-page-heading h1 { margin: 0; color: var(--el-text-color-primary); font-size: 24px; font-weight: 650; line-height: 1.25; }
.business-page-count { flex: 0 0 auto; color: var(--el-text-color-secondary); font-size: 12px; }
.business-search-panel { margin-bottom: 14px; padding: 16px 18px 4px; border: 1px solid var(--el-border-color-light); border-radius: 8px; background: var(--el-bg-color-overlay); box-shadow: 0 5px 18px rgba(32, 53, 44, .035); }
.business-search :deep(.el-form-item) { margin-bottom: 12px; }
.business-search :deep(.el-form-item__label) { color: var(--el-text-color-regular); font-weight: 600; }
.business-toolbar { display: flex; align-items: center; min-height: 32px; margin-bottom: 12px; }
.business-toolbar :deep(.top-right-btn) { margin-left: auto; }
.business-toolbar :deep(.el-button--primary.is-plain) { color: #245a4a; border-color: #9bb9aa; background: #eef6f0; }
.business-toolbar :deep(.el-button--primary.is-plain:hover) { color: #fff; border-color: #245a4a; background: #245a4a; }
.business-load-error { margin: 0 0 12px; }
.business-load-error :deep(.el-alert__content) { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.business-table { overflow: hidden; border-radius: 8px; }
.business-table :deep(.el-table__header-wrapper th) { background: #f5f7f3 !important; color: #526057; font-weight: 650; }
.business-table :deep(.el-table__body tr:hover > td) { background: #f7faf6 !important; }
.business-table :deep(.el-table__empty-text) { color: var(--el-text-color-secondary); }
.business-table-empty { display: flex; min-height: 112px; flex-direction: column; align-items: center; justify-content: center; gap: 5px; color: var(--el-text-color-secondary); }
.business-empty-mark { color: #b48a4b; font-size: 24px; line-height: 1; }
.business-table-empty strong { color: var(--el-text-color-regular); font-size: 13px; font-weight: 600; }
.business-table-empty small { color: var(--el-text-color-placeholder); font-size: 12px; }
@media (max-width: 768px) {
  .business-view { padding: 12px; }
  .business-page-heading { align-items: flex-start; }
  .business-page-heading h1 { font-size: 20px; }
  .business-search-panel { padding: 14px 12px 2px; }
  .business-search :deep(.el-form-item) { width: 100%; margin-right: 0; }
  .business-search :deep(.el-input), .business-search :deep(.el-select) { width: 100% !important; }
  .business-toolbar { gap: 8px; flex-wrap: wrap; }
  .business-table { overflow-x: auto; }
  .business-table :deep(.el-table__body-wrapper), .business-table :deep(.el-table__header-wrapper) { min-width: max-content; }
  .business-table :deep(.el-table__inner-wrapper) { width: 100%; min-width: 0; overflow: visible; }
  .business-table :deep(.el-table__header-wrapper) { overflow-x: auto; scrollbar-width: none; }
  .business-table :deep(.el-table__header-wrapper::-webkit-scrollbar) { display: none; }
  .business-table :deep(.el-table__body-wrapper) { overflow: visible; }
  .business-table :deep(.el-table__body-wrapper .el-scrollbar),
  .business-table :deep(.el-table__body-wrapper .el-scrollbar__wrap) { width: 100%; }
  .business-table :deep(.el-table__body-wrapper .el-scrollbar__wrap) { overflow-x: auto !important; overflow-y: hidden; }
  .business-table :deep(.el-table__body-wrapper .el-scrollbar__view) { width: max-content; min-width: 100%; }
}
html.dark .business-page-heading h1 { color: #eef4ef; }
html.dark .business-page-kicker { color: #d5aa61; }
html.dark .business-search-panel {
  border-color: #39443e;
  background: #1b201e;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .14);
}
html.dark .business-table {
  border-color: #39443e;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .12);
}
html.dark .business-table :deep(.el-table__header-wrapper th) {
  background: #252d29 !important;
  color: #e7eee9;
}
html.dark .business-table :deep(.el-table__body tr:hover > td) { background: #26322c !important; }
html.dark .business-toolbar :deep(.el-button--primary.is-plain) { color: #e5f3e9; border-color: #6e9a80; background: #234737; }
html.dark .business-toolbar :deep(.el-button--primary.is-plain:hover) { color: #fff; border-color: #80b594; background: #2d664c; }
</style>
