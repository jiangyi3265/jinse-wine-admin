<template>
  <div class="app-container report-page">
    <header class="report-heading">
      <div><h1>财务报表</h1><span>{{ current.label }}</span></div>
      <el-button v-hasPermi="['business:report:export']" type="primary" :icon="Download" :loading="state.downloading" :disabled="state.loading || !state.loaded || !!state.error" @click="download">导出查询结果</el-button>
    </header>

    <el-tabs :model-value="activeType" class="report-tabs" @update:model-value="selectType">
      <el-tab-pane v-for="report in reports" :key="report.key" :name="report.key" :label="report.label" />
    </el-tabs>

    <el-form :model="state.draft" label-position="top" class="report-filters" @submit.prevent="search">
      <el-form-item :label="current.dateLabel" class="date-filter">
        <el-date-picker v-model="state.draft.range" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" clearable :disabled="state.loading" />
      </el-form-item>
      <el-form-item v-if="current.key !== 'videoRefunds'" label="会员编号">
        <el-input v-model.trim="state.draft.memberNo" maxlength="32" clearable placeholder="请输入会员编号" />
      </el-form-item>
      <el-form-item v-if="current.key !== 'videoRefunds'" label="用户名">
        <el-input v-model.trim="state.draft.memberName" maxlength="128" clearable placeholder="请输入用户名" />
      </el-form-item>
      <el-form-item v-if="Object.keys(state.statusOptions).length" :label="current.key === 'lottery' ? '抽奖结果' : '状态'">
        <el-select v-model="state.draft.status" clearable placeholder="全部">
          <el-option v-for="(label, value) in state.statusOptions" :key="value" :label="label" :value="value" />
        </el-select>
      </el-form-item>
      <el-form-item label="关键词" class="keyword-filter">
        <el-input v-model.trim="state.draft.keyword" maxlength="128" clearable :placeholder="current.keyword" />
      </el-form-item>
      <el-form-item class="filter-actions">
        <el-button type="primary" :icon="Search" native-type="submit" :loading="state.loading">查询</el-button>
        <el-button :icon="Refresh" :disabled="state.loading" @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <div class="report-toolbar"><strong>{{ current.label }}</strong><span>共 {{ state.total }} 条</span><el-tooltip content="刷新" placement="top"><el-button :icon="Refresh" circle :loading="state.loading" aria-label="刷新" @click="load(activeType)" /></el-tooltip></div>
    <el-alert v-if="state.error" :title="state.error" type="error" show-icon :closable="false" class="report-error" />
    <el-table :key="activeType" v-loading="state.loading" :data="state.rows" border stripe class="business-table" :max-height="560" scrollbar-always-on>
      <el-table-column v-for="(column, index) in tableColumns" :key="column.key" :prop="column.key" :label="column.label" :min-width="columnWidth(column)" :fixed="!compact && index === 0 ? 'left' : false" :align="isNumber(column) ? 'right' : 'left'" show-overflow-tooltip />
      <el-table-column v-if="state.columns.length" label="操作" width="85" :fixed="compact ? false : 'right'" align="center"><template #default="scope"><el-button link type="primary" :icon="View" @click="showDetail(scope.row)">详情</el-button></template></el-table-column>
      <template #empty><el-empty :description="state.error ? '数据加载失败，请重新查询' : '暂无符合条件的记录'" :image-size="64" /></template>
    </el-table>
    <pagination v-show="state.total > 0" :total="state.total" v-model:page="state.pageNum" v-model:limit="state.pageSize" @pagination="load(activeType)" />

    <el-dialog v-model="detailOpen" :title="`${detailTitle}详情`" width="min(920px, 94vw)" append-to-body>
      <el-descriptions :column="compact ? 1 : 2" border class="report-details">
        <el-descriptions-item v-for="column in detailColumns" :key="column.key" :label="column.label">{{ detailRow[column.key] || '—' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer><el-button @click="detailOpen = false">关闭</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Download, Refresh, Search, View } from '@element-plus/icons-vue'
import { downloadReport, listReportRows } from '@/api/business/extension'
import { setupBusinessTableScroll } from '@/utils/businessTableScroll'

const reports = [
  { key: 'orders', label: '销售订单', dateLabel: '下单时间', keyword: '订单号 / 商品名称 / 规格 / 微信交易号' },
  { key: 'refunds', label: '商城退款流水', dateLabel: '申请时间', keyword: '订单号 / 退款单号 / 原因 / 付款凭证' },
  { key: 'returns', label: '退货入库流水', dateLabel: '收货时间', keyword: '订单号 / 退款单号 / 售后单号 / 商品 / 收货凭证' },
  { key: 'commissions', label: '佣金流水', dateLabel: '记录创建时间', keyword: '标题 / 订单ID' },
  { key: 'settlements', label: '佣金提现', dateLabel: '申请时间', keyword: '提现单号 / 付款凭证 / 失败原因' },
  { key: 'rankingRewards', label: '销冠奖励', dateLabel: '周期开始时间', keyword: '奖励周期 / 发放凭证' },
  { key: 'lottery', label: '抽奖记录', dateLabel: '抽奖时间', keyword: '记录号 / 活动ID / 中奖内容' },
  { key: 'redemptions', label: '门店核销', dateLabel: '核销时间', keyword: '订单号 / 奖品ID / 核销类型 / 核销员' },
  { key: 'videoRefunds', label: '微信小店退款对账', dateLabel: '台账更新时间', keyword: '微信订单号 / 微信售后单号' }
]
const route = useRoute(), router = useRouter()
const activeType = computed(() => reports.some(report => report.key === route.query.type) ? route.query.type : 'orders')
const current = computed(() => reports.find(report => report.key === activeType.value))
const emptyDraft = () => ({ range: [], memberNo: '', memberName: '', keyword: '', status: '' })
const states = reactive(Object.fromEntries(reports.map(report => [report.key, {
  draft: emptyDraft(), applied: {}, pageNum: 1, pageSize: 20, columns: [], rows: [], total: 0,
  statusOptions: {}, loaded: false, loading: false, downloading: false, error: '', requestId: 0
}])))
const state = computed(() => states[activeType.value])
const primaryColumns = {
  orders: ['order_no', 'member_no', 'member_name', 'product_name', 'product_spec', 'sale_quantity', 'product_amount_yuan', 'order_payable_yuan', 'shipping_yuan', 'status', 'create_time'],
  refunds: ['refund_no', 'order_no', 'member_no', 'member_name', 'amount_cent', 'status', 'channel_status', 'reason', 'create_time'],
  returns: ['order_no', 'aftersale_no', 'return_source', 'aftersale_type', 'member_no', 'member_name', 'product_name', 'received_quantity', 'restock_quantity', 'received_by', 'received_at'],
  commissions: ['promoter_no', 'promoter_name', 'title', 'amount_cent', 'original_amount_cent', 'refund_adjustment_cent', 'status', 'create_time'],
  settlements: ['settlement_id', 'promoter_no', 'promoter_name', 'amount_cent', 'status', 'payment_reference', 'paid_at', 'create_time'],
  rankingRewards: ['period_start', 'period_end', 'rank_no', 'member_no', 'member_name', 'points', 'subsidy_cent', 'status', 'issued_at'],
  lottery: ['member_no', 'member_name', 'result_type', 'result_value', 'create_time'],
  redemptions: ['business_ref', 'redemption_type', 'member_no', 'member_name', 'verifier_no', 'verifier_name', 'status', 'created_at'],
  videoRefunds: ['external_order_id', 'external_aftersale_id', 'amount_cent', 'external_status', 'ledger_status', 'confirmed_at', 'updated_at']
}
const tableColumns = computed(() => primaryColumns[activeType.value].map(key => state.value.columns.find(column => column.key === key)).filter(Boolean))
const compactQuery = window.matchMedia('(max-width: 600px)')
const compact = ref(compactQuery.matches)
const updateCompact = event => { compact.value = event.matches }
const detailOpen = ref(false), detailTitle = ref(''), detailColumns = ref([]), detailRow = ref({})
let tableScroll

function selectType(type) {
  if (type !== activeType.value) router.push({ path: route.path, query: { ...route.query, type } })
}
function isNumber(column) { return /金额|运费|应付|支付\(|退款\(|佣金\(|补贴|数量|积分|销售数量/.test(column.label) }
function columnWidth(column) {
  if (column.key.endsWith('_no') || column.key.endsWith('_id') || column.key.includes('reference')) return 225
  if (/时间|周期/.test(column.label)) return 170
  return isNumber(column) ? 140 : 150
}
async function load(type) {
  const target = states[type]
  const requestId = ++target.requestId
  target.loading = true
  target.error = ''
  try {
    const result = await listReportRows(type, { ...target.applied, pageNum: target.pageNum, pageSize: target.pageSize })
    if (requestId !== target.requestId) return
    target.columns = result.columns || []
    target.rows = result.rows || []
    target.total = Number(result.total || 0)
    target.statusOptions = result.statusOptions || {}
    target.loaded = true
    const lastPage = Math.max(1, Math.ceil(target.total / target.pageSize))
    if (target.pageNum > lastPage) { target.pageNum = lastPage; await load(type) }
  } catch (error) {
    if (requestId !== target.requestId) return
    target.rows = []; target.total = 0
    target.error = error.message || '报表加载失败，请重新查询'
  } finally { if (requestId === target.requestId) target.loading = false }
}
function search() {
  const target = state.value, draft = target.draft
  const [fromDate, toDate] = draft.range || []
  target.applied = { fromDate, toDate, memberNo: draft.memberNo, memberName: draft.memberName, keyword: draft.keyword, status: draft.status }
  target.pageNum = 1
  load(activeType.value)
}
function reset() { state.value.draft = emptyDraft(); search() }
async function download() {
  const type = activeType.value, target = states[type]
  if (target.downloading || target.loading || !target.loaded || target.error) return
  target.downloading = true
  try { await downloadReport(type, { ...target.applied }) }
  catch (error) { ElMessage.error(error.message || '导出失败') }
  finally { target.downloading = false }
}
function showDetail(row) {
  detailRow.value = row; detailColumns.value = state.value.columns; detailTitle.value = current.value.label
  detailOpen.value = true
}
watch(activeType, type => { detailOpen.value = false; if (!states[type].loaded) load(type) }, { immediate: true })
onMounted(() => {
  compactQuery.addEventListener('change', updateCompact)
  tableScroll = setupBusinessTableScroll('.report-page')
})
onBeforeUnmount(() => {
  compactQuery.removeEventListener('change', updateCompact)
  tableScroll?.dispose()
  Object.values(states).forEach(target => target.requestId++)
})
</script>

<style scoped>
.report-page { min-width: 0; }
.report-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 16px; }
.report-heading h1 { margin: 0 0 6px; font-size: 22px; font-weight: 650; }
.report-heading span { font-size: 13px; color: var(--el-text-color-secondary); }
.report-tabs :deep(.el-tabs__header) { margin-bottom: 18px; }
.report-tabs :deep(.el-tabs__item) { font-size: 13px; }
.report-filters { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0 16px; border-bottom: 1px solid var(--el-border-color-light); }
.report-filters :deep(.el-form-item) { min-width: 0; margin-bottom: 16px; }
.report-filters :deep(.el-form-item__label) { font-size: 12px; }
.report-filters :deep(.el-date-editor), .report-filters :deep(.el-select) { width: 100%; min-width: 0; }
.date-filter, .keyword-filter { grid-column: span 2; }
.filter-actions { align-self: end; }
.report-toolbar { display: flex; align-items: center; gap: 12px; padding: 16px 0 12px; }
.report-toolbar strong { font-size: 14px; font-weight: 600; }
.report-toolbar span { color: var(--el-text-color-secondary); font-size: 12px; }
.report-toolbar .el-button { margin-left: auto; }
.report-error { margin-bottom: 12px; }
.report-details :deep(.el-descriptions__content) { overflow-wrap: anywhere; }
.report-details :deep(.el-descriptions__label) { min-width: 110px; }
@media (max-width: 1100px) { .report-filters { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 600px) {
  .report-heading { align-items: flex-start; flex-wrap: wrap; }
  .report-heading h1 { font-size: 20px; }
  .report-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; }
  .filter-actions { grid-column: span 2; }
  .report-details :deep(.el-descriptions__table) { table-layout: fixed; }
  .report-details :deep(.el-descriptions__label) { width: 110px; }
}
</style>
