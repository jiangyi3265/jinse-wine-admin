<template>
  <div class="app-container business-view business-records">
    <header class="business-page-heading">
      <div>
        <p class="business-page-kicker">业务管理</p>
        <h1>{{ title }}</h1>
      </div>
      <span class="business-page-count" v-if="total">共 {{ total }} 条</span>
    </header>
    <el-form v-show="showSearch" :model="query" inline class="business-search-panel" @submit.prevent="search">
      <el-form-item v-for="field in searchFields" :key="field.prop" :label="field.label">
        <business-lookup v-if="field.lookup" v-model="query[field.prop]" :owner="resource" :field="field.prop" style="width: 220px" />
        <el-select v-else-if="field.options" v-model="query[field.prop]" clearable :placeholder="`全部${field.label}`" style="width: 180px">
          <el-option v-for="option in field.options" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-input v-else v-model.trim="query[field.prop]" clearable :placeholder="`请输入${field.label}`" style="width: 200px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" native-type="submit" icon="Search">查询</el-button>
        <el-button icon="Refresh" @click="resetSearch">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row class="mb8 business-toolbar">
      <right-toolbar v-model:showSearch="showSearch" @queryTable="loadList" />
    </el-row>
    <el-alert v-if="loadError" class="business-load-error" type="error" show-icon :closable="false">
      <template #default><span>{{ loadError }}</span><el-button link type="primary" @click="loadList">重试</el-button></template>
    </el-alert>
    <el-table v-loading="loading" :data="rows" border stripe class="business-table" :row-key="idField">
      <el-table-column v-for="field in tableFields" :key="field.prop" :prop="field.prop" :label="field.label" :min-width="field.width || 120" show-overflow-tooltip>
        <template #default="scope">
          <el-image v-if="field.type === 'image' && scope.row[field.prop]" :src="mediaUrl(scope.row[field.prop])" :preview-src-list="[mediaUrl(scope.row[field.prop])]" preview-teleported fit="cover" class="record-avatar"><template #error><el-icon><User /></el-icon></template></el-image>
          <el-avatar v-else-if="field.type === 'image'" :size="40" :icon="User" />
          <span v-else>{{ displayValue(field, scope.row[field.prop]) }}</span>
        </template>
      </el-table-column>
      <el-table-column v-if="showDetail || statusTransitions || $slots.actions" label="操作" fixed="right" :width="actionWidth" align="center">
        <template #default="scope">
          <el-button v-if="showDetail" link type="primary" icon="View" v-hasPermi="[permission('query')]" @click="openDetail(scope.row)">详情</el-button>
          <el-button v-if="statusTransitions && availableTransitions(scope.row).length" link type="primary" icon="Edit" v-hasPermi="[permission('edit')]" @click="openStatus(scope.row)">处理</el-button>
          <slot name="actions" :row="scope.row" />
        </template>
      </el-table-column>
      <template #empty>
        <div class="business-table-empty">
          <span class="business-empty-mark">—</span>
          <strong>暂无{{ title }}记录</strong>
          <small>{{ hasSearchValue ? '请调整筛选条件后重试' : '当前还没有可展示的业务记录' }}</small>
        </div>
      </template>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="loadList" />

    <el-dialog v-model="detailOpen" :title="`${title}详情`" width="min(880px, 94vw)" append-to-body>
      <el-descriptions v-if="detail" :column="detailColumns" :label-width="detailColumns === 1 ? '100px' : undefined" border>
        <el-descriptions-item v-for="field in detailFields" :key="field.prop" :label="field.label" :span="field.span || 1">
          <el-image v-if="field.type === 'image' && detail[field.prop]" :src="mediaUrl(detail[field.prop])" :preview-src-list="[mediaUrl(detail[field.prop])]" preview-teleported fit="cover" class="record-avatar detail-avatar"><template #error><el-icon><User /></el-icon></template></el-image>
          <el-avatar v-else-if="field.type === 'image'" :size="64" :icon="User" />
          <span v-else>{{ displayValue(field, detail[field.prop]) }}</span>
        </el-descriptions-item>
      </el-descriptions>
      <slot name="detail" :detail="detail" />
    </el-dialog>

    <el-dialog v-model="statusOpen" :title="`处理${title}`" width="min(500px, 94vw)" append-to-body>
      <el-form ref="statusRef" :model="statusForm" label-width="110px" :disabled="saving">
        <el-form-item label="当前状态">{{ displayValue(statusField, activeRow?.status) }}</el-form-item>
        <el-form-item label="目标状态" prop="status" :rules="[{ required: true, message: '请选择目标状态', trigger: 'change' }]">
          <el-select v-model="statusForm.status" placeholder="请选择目标状态" style="width: 100%">
            <el-option v-for="option in availableTransitions(activeRow)" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="resource === 'member'" label="核销员所属门店">
          <business-lookup v-model="statusForm.staffStoreId" owner="member" field="staffStoreId" active-only :disabled="saving" placeholder="请选择已启用门店" />
          <span class="field-help">清空后取消核销员门店绑定；停用门店不能继续绑定。</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusOpen = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveStatus">确认处理</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { User } from '@element-plus/icons-vue'
import { mediaUrl } from '@/utils/businessMedia'
import { getBusiness, listBusiness, updateBusinessStatus } from '@/api/business'
import { setupBusinessTableScroll } from '@/utils/businessTableScroll'
import BusinessLookup from './BusinessLookup.vue'
import { useBusinessRelations } from '@/utils/businessRelations'

let tableScroll

const props = defineProps({
  title: { type: String, required: true },
  resource: { type: String, required: true },
  idField: { type: String, required: true },
  fields: { type: Array, required: true },
  showDetail: { type: Boolean, default: true },
  statusTransitions: { type: Object, default: null },
  actionWidth: { type: Number, default: 160 }
})

const permission = action => `business:${props.resource}:${action}`
const { loadRelations, relationLabel } = useBusinessRelations(() => props.resource, () => props.fields)
const searchFields = computed(() => props.fields.filter(field => field.search))
const tableFields = computed(() => props.fields.filter(field => field.table))
const detailFields = computed(() => props.fields.filter(field => field.detail !== false))
const statusField = computed(() => props.fields.find(field => field.prop === 'status') || { label: '状态' })
const query = reactive({ pageNum: 1, pageSize: 10 })
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const showSearch = ref(true)
const detailOpen = ref(false)
const statusOpen = ref(false)
const detail = ref(null)
const activeRow = ref(null)
const statusRef = ref()
const statusForm = reactive({ status: null, staffStoreId: null })
const detailColumns = ref(typeof window !== 'undefined' && window.innerWidth <= 600 ? 1 : 2)
const hasSearchValue = computed(() => searchFields.value.some(field => {
  const value = query[field.prop]
  return value !== undefined && value !== null && String(value).trim() !== ''
}))

function updateDetailColumns() {
  detailColumns.value = window.innerWidth <= 600 ? 1 : 2
}

function displayValue(field, value) {
  if (value === null || value === undefined || value === '') return field.emptyLabel || '—'
  if (field.type === 'money') return `¥${(Number(value) / 100).toFixed(2)}`
  if (field.lookup) return relationLabel(field, value)
  if (field.type === 'address') {
    let address = value
    if (typeof address === 'string') {
      try { address = JSON.parse(address) } catch { return address }
    }
    if (typeof address !== 'object' || !address) return String(address)
    const region = [address.province, address.city, address.district].filter(Boolean).join(' ')
    const detail = address.detail || address.address || ''
    const receiver = [address.receiver_name || address.receiverName, address.receiver_phone || address.receiverPhone].filter(Boolean).join(' ')
    return [region, detail, receiver].filter(Boolean).join(' / ') || '—'
  }
  const option = (field.options || []).find(item => String(item.value) === String(value))
  if (option) return option.label
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

function availableTransitions(row) {
  if (!row || !props.statusTransitions) return []
  if (props.resource === 'order' && row.fulfillmentMode === 'pickup') return []
  if (props.resource === 'reward' && row.rewardType === 'cash') {
    return row.status === 'pending' ? [{ label: '关闭', value: 'closed' }] : []
  }
  if (props.resource === 'reward' && row.rewardType !== 'goods') return []
  if (props.resource === 'reward' && row.rewardType === 'goods' && row.status === 'processing'
      && row.expiresAt && Date.parse(String(row.expiresAt).replace(' ', 'T')) <= Date.now()) return []
  const transitions = props.statusTransitions[row.status] || []
  if (props.resource === 'member') {
    return [{ label: row.status === '0' ? '保持启用' : '保持停用', value: row.status }, ...transitions]
  }
  return transitions
}

async function loadList() {
  loading.value = true
  loadError.value = ''
  try {
    const response = await listBusiness(props.resource, query)
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

async function openDetail(row) {
  try {
    const response = await getBusiness(props.resource, row[props.idField])
    detail.value = response.data
    await loadRelations([detail.value])
    detailOpen.value = true
  } catch (error) {
    ElMessage.error(error?.message || '详情加载失败，请稍后重试')
  }
}

function openStatus(row) {
  activeRow.value = row
  statusForm.status = props.resource === 'member' ? row.status : null
  statusForm.staffStoreId = row.staffStoreId ?? null
  statusOpen.value = true
}

async function saveStatus() {
  if (!await statusRef.value.validate()) return
  saving.value = true
  try {
    const data = { status: statusForm.status }
    if (props.resource === 'member') data.staffStoreId = statusForm.staffStoreId
    await updateBusinessStatus(props.resource, activeRow.value[props.idField], data)
    ElMessage.success('处理成功')
    statusOpen.value = false
    await loadList()
  } finally {
    saving.value = false
  }
}

defineExpose({ reload: loadList })

onMounted(() => {
  tableScroll = setupBusinessTableScroll('.business-records')
  loadList()
  window.addEventListener('resize', updateDetailColumns)
})
onUnmounted(() => { window.removeEventListener('resize', updateDetailColumns); tableScroll?.dispose() })
</script>

<style scoped>
.record-avatar { display: inline-flex; width: 40px; height: 40px; vertical-align: middle; border-radius: 4px; }
.detail-avatar { width: 64px; height: 64px; }
.record-avatar :deep(.el-image__error) { width: 100%; height: 100%; background: var(--el-fill-color-light); }
.business-view { min-height: calc(100vh - 84px); padding: 18px 20px 28px; background: var(--el-bg-color-page); }
.business-page-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin: 0 0 14px; padding: 2px 2px 4px; }
.business-page-kicker { margin: 0 0 4px; color: #a77b3c; font-size: 11px; font-weight: 700; letter-spacing: .14em; }
.business-page-heading h1 { margin: 0; color: var(--el-text-color-primary); font-size: 24px; font-weight: 650; line-height: 1.25; }
.business-page-count { flex: 0 0 auto; color: var(--el-text-color-secondary); font-size: 12px; }
.business-search-panel { margin-bottom: 14px; padding: 16px 18px 4px; border: 1px solid var(--el-border-color-light); border-radius: 8px; background: var(--el-bg-color-overlay); box-shadow: 0 5px 18px rgba(32, 53, 44, .035); }
.business-search-panel :deep(.el-form-item) { margin-bottom: 12px; }
.business-search-panel :deep(.el-form-item__label) { color: var(--el-text-color-regular); font-weight: 600; }
.business-toolbar { display: flex; align-items: center; min-height: 32px; margin-bottom: 12px; }
.business-toolbar :deep(.top-right-btn) { margin-left: auto; }
.business-toolbar :deep(.el-button--primary.is-plain) { color: #245a4a; border-color: #9bb9aa; background: #eef6f0; }
.business-toolbar :deep(.el-button--primary.is-plain:hover) { color: #fff; border-color: #245a4a; background: #245a4a; }
.business-load-error { margin: 0 0 12px; }
.business-load-error :deep(.el-alert__content) { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.business-table { overflow: hidden; border-radius: 8px; }
.business-table :deep(.el-table__header-wrapper th) { background: #f5f7f3 !important; color: #526057; font-weight: 650; }
.business-table :deep(.el-table__body tr:hover > td) { background: #f7faf6 !important; }
.business-table-empty { display: flex; min-height: 112px; flex-direction: column; align-items: center; justify-content: center; gap: 5px; color: var(--el-text-color-secondary); }
.business-empty-mark { color: #b48a4b; font-size: 24px; line-height: 1; }
.business-table-empty strong { color: var(--el-text-color-regular); font-size: 13px; font-weight: 600; }
.business-table-empty small { color: var(--el-text-color-placeholder); font-size: 12px; }
.field-help { display: block; margin-top: 5px; color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.4; }
@media (max-width: 768px) {
  .business-view { padding: 12px; }
  .business-page-heading { align-items: flex-start; }
  .business-page-heading h1 { font-size: 20px; }
  .business-search-panel { padding: 14px 12px 2px; }
  .business-search-panel :deep(.el-form-item) { width: 100%; margin-right: 0; }
  .business-search-panel :deep(.el-input), .business-search-panel :deep(.el-select) { width: 100% !important; }
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
