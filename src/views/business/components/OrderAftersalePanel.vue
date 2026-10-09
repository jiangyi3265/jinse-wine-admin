<template>
  <section class="aftersale-section">
    <el-form :model="query" label-position="top" class="aftersale-filters" @submit.prevent="search">
      <el-form-item label="申请时间" class="date-filter"><el-date-picker v-model="query.range" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" clearable /></el-form-item>
      <el-form-item label="会员编号"><el-input v-model.trim="query.memberNo" maxlength="32" clearable placeholder="请输入会员编号" /></el-form-item>
      <el-form-item label="售后类型"><el-select v-model="query.type" clearable placeholder="全部"><el-option label="退货退款" value="return_refund" /><el-option label="换货" value="exchange" /></el-select></el-form-item>
      <el-form-item label="状态"><el-select v-model="query.status" clearable placeholder="全部"><el-option v-for="(name, value) in statuses" :key="value" :label="name" :value="value" /></el-select></el-form-item>
      <el-form-item label="关键词" class="keyword-filter"><el-input v-model.trim="query.keyword" maxlength="128" clearable placeholder="售后单号 / 订单号 / 商品 / 用户名" /></el-form-item>
      <el-form-item class="filter-actions"><el-button type="primary" :icon="Search" native-type="submit" :loading="loading">查询</el-button><el-button :icon="Refresh" :disabled="loading" @click="reset">重置</el-button></el-form-item>
    </el-form>
    <div class="aftersale-heading"><h3>退货换货 <span>共 {{ total }} 条</span></h3><el-tooltip content="刷新" placement="top"><el-button :icon="Refresh" circle :loading="loading" aria-label="刷新" @click="load" /></el-tooltip></div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" />
    <el-table v-loading="loading" :data="rows" border stripe :empty-text="error ? '数据加载失败，请重新查询' : '暂无符合条件的退换货申请'" class="business-table" :max-height="560" scrollbar-always-on>
      <el-table-column prop="aftersaleNo" label="售后单号" min-width="205" />
      <el-table-column prop="orderNo" label="订单号" min-width="185" />
      <el-table-column prop="memberNo" label="会员编号" min-width="225" />
      <el-table-column prop="memberName" label="用户名" min-width="125" show-overflow-tooltip />
      <el-table-column prop="productName" label="商品" min-width="160" show-overflow-tooltip />
      <el-table-column label="类型" width="100"><template #default="{ row }">{{ row.type === 'exchange' ? '换货' : '退货退款' }}</template></el-table-column>
      <el-table-column prop="quantity" label="数量" width="70" />
      <el-table-column label="退款金额" width="110"><template #default="{ row }">{{ row.type === 'exchange' ? '—' : `¥${money(row.amount)}` }}</template></el-table-column>
      <el-table-column label="状态" width="150"><template #default="{ row }"><el-tag effect="plain">{{ label(row.status) }}</el-tag></template></el-table-column>
      <el-table-column prop="createTime" label="申请时间" min-width="165" />
      <el-table-column label="操作" width="100" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="open(row.id)">查看 / 处理</el-button></template></el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="pageNum" v-model:limit="pageSize" @pagination="load" />
    <el-dialog v-model="visible" title="退换货处理" width="min(720px, 96vw)" append-to-body :close-on-click-modal="false" :close-on-press-escape="!busy" :show-close="!busy">
      <template v-if="detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="售后单号">{{ detail.aftersaleNo }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ label(detail.status) }}</el-descriptions-item>
          <el-descriptions-item label="会员编号">{{ detail.memberNo || '未登记' }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ detail.memberName || '未登记' }}</el-descriptions-item>
          <el-descriptions-item label="商品" :span="2">{{ detail.productName }} {{ detail.productSpec }} × {{ detail.quantity }}</el-descriptions-item>
          <el-descriptions-item label="申请原因" :span="2">{{ detail.reason }}</el-descriptions-item>
          <el-descriptions-item label="退款金额">{{ detail.type === 'exchange' ? '换货无需退款' : `¥${money(detail.amount)}` }}</el-descriptions-item>
          <el-descriptions-item label="审核说明">{{ detail.reviewNote || '—' }}</el-descriptions-item>
          <el-descriptions-item label="退货地址" :span="2">{{ detail.returnAddress || '待审核填写' }}</el-descriptions-item>
          <el-descriptions-item label="寄回物流" :span="2">{{ detail.returnCompany || '—' }} {{ detail.returnTrackingNo }}</el-descriptions-item>
          <el-descriptions-item label="换货物流" :span="2">{{ detail.replacementCompany || '—' }} {{ detail.replacementTrackingNo }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.receivedAt" label="收货凭证" :span="2">{{ detail.receiptReference || '历史记录未登记' }}</el-descriptions-item>
        </el-descriptions>
        <el-form v-if="detail.status === 'pending'" ref="reviewRef" :model="review" :rules="reviewRules" label-width="100px" class="aftersale-form" :disabled="busy">
          <el-form-item label="审核结果" prop="status"><el-radio-group v-model="review.status"><el-radio value="approved">同意</el-radio><el-radio value="rejected">驳回</el-radio></el-radio-group></el-form-item>
          <el-form-item label="处理说明" prop="note"><el-input v-model="review.note" type="textarea" maxlength="500" show-word-limit /></el-form-item>
          <el-form-item v-if="review.status === 'approved'" label="退货地址" prop="returnAddress"><el-input v-model="review.returnAddress" type="textarea" placeholder="收件人、联系电话、省市区及详细地址" maxlength="500" show-word-limit /></el-form-item>
          <el-form-item><el-button v-hasPermi="['business:refund:edit']" type="primary" :loading="busy" @click="submitReview">提交审核</el-button></el-form-item>
        </el-form>
        <el-form v-if="detail.status === 'returning'" ref="receiptRef" :model="receipt" :rules="receiptRules" label-width="130px" class="aftersale-form" :disabled="busy">
          <el-form-item label="退回总数量"><span>{{ detail.quantity }} 件</span></el-form-item>
          <el-form-item label="可售入库数量" prop="restockQuantity"><el-input-number v-model="receipt.restockQuantity" :min="0" :max="Number(detail.quantity)" :precision="0" /></el-form-item>
          <el-form-item label="收货凭证" prop="receiptReference"><el-input v-model.trim="receipt.receiptReference" maxlength="128" show-word-limit placeholder="请输入收货登记号或仓库凭证号" /></el-form-item>
          <el-form-item><el-button v-hasPermi="['business:refund:edit']" type="primary" :loading="busy" @click="inspect">确认已收齐退货</el-button></el-form-item>
        </el-form>
        <el-form v-if="detail.type === 'exchange' && ['received', 'exchange_shipping'].includes(detail.status)" ref="shippingRef" :model="shipping" :rules="shippingRules" label-width="100px" class="aftersale-form" :disabled="busy">
          <el-form-item label="快递公司" prop="company"><el-input v-model="shipping.company" maxlength="64" /></el-form-item>
          <el-form-item label="物流单号" prop="trackingNo"><el-input v-model="shipping.trackingNo" maxlength="128" /></el-form-item>
          <el-form-item><el-button v-hasPermi="['business:refund:edit']" type="primary" :loading="busy" @click="ship">{{ detail.status === 'received' ? '换货发货' : '更新换货物流' }}</el-button></el-form-item>
        </el-form>
        <div v-if="detail.status === 'refund_pending'" class="aftersale-form"><el-alert title="退货已收货，退款单已审核通过，待退款到账。" type="info" :closable="false" /><el-button type="primary" link @click="visible = false; emit('view-refunds')">查看商城退款</el-button></div>
        <el-timeline class="aftersale-events"><el-timeline-item v-for="(event, index) in detail.events" :key="index" :timestamp="event.createTime">{{ label(event.status) }} · {{ event.actor }} · {{ event.note }}</el-timeline-item></el-timeline>
      </template>
    </el-dialog>
  </section>
</template>
<script setup>
import { onMounted, onBeforeUnmount, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { listAftersales, getAftersale, actAftersale } from '@/api/business/aftersale'

const emit = defineEmits(['changed', 'view-refunds'])
const rows = ref([]), loading = ref(false), error = ref(''), visible = ref(false), detail = ref(null), busy = ref(false)
const reviewRef = ref(), shippingRef = ref(), receiptRef = ref()
const total = ref(0), pageNum = ref(1), pageSize = ref(20)
const emptyQuery = () => ({ range: [], memberNo: '', keyword: '', status: '', type: '' })
const query = reactive(emptyQuery())
let applied = {}, listVersion = 0, detailVersion = 0
const receipt = reactive({ restockQuantity: 0, receiptReference: '' })
const review = reactive({ status: 'approved', note: '', returnAddress: '' })
const shipping = reactive({ company: '', trackingNo: '' })
const required = message => [{ required: true, whitespace: true, message, trigger: 'blur' }]
const reviewRules = { status: required('请选择审核结果'), note: required('请填写处理说明'), returnAddress: required('请填写退货收件人、电话和完整地址') }
const shippingRules = { company: required('请填写快递公司'), trackingNo: required('请填写物流单号') }
const receiptRules = { restockQuantity: [{ required: true, message: '请填写可售入库数量', trigger: 'change' }], receiptReference: required('请填写退货收货凭证') }
const statuses = { pending: '待审核', approved: '待用户寄回', rejected: '已驳回', returning: '退货运输中', received: '退货已收到，待换货', refund_pending: '待退款到账', exchange_shipping: '换货已发出', completed: '已完成', cancelled: '已撤销' }
const label = status => statuses[status] || '状态待确认'
const money = value => (Number(value || 0) / 100).toFixed(2)
async function load() {
  const version = ++listVersion
  loading.value = true; error.value = ''; rows.value = []
  try {
    const result = await listAftersales({ ...applied, pageNum: pageNum.value, pageSize: pageSize.value })
    if (version !== listVersion) return
    rows.value = result?.rows || []; total.value = Number(result?.total || 0)
    const lastPage = Math.max(1, Math.ceil(total.value / pageSize.value))
    if (pageNum.value > lastPage) { pageNum.value = lastPage; await load() }
  }
  catch (e) { if (version === listVersion) { total.value = 0; error.value = e.message || '退换货列表加载失败' } }
  finally { if (version === listVersion) loading.value = false }
}
function search() {
  if (loading.value) return
  const [fromDate, toDate] = query.range || []
  applied = { memberNo: query.memberNo, keyword: query.keyword, status: query.status, type: query.type, fromDate, toDate }
  pageNum.value = 1; load()
}
function reset() { Object.assign(query, emptyQuery()); applied = {}; pageNum.value = 1; load() }
async function open(id) {
  if (busy.value) return
  const version = ++detailVersion
  visible.value = false; detail.value = null
  try {
    const result = await getAftersale(id)
    if (version !== detailVersion) return
    detail.value = result
    Object.assign(review, { status: 'approved', note: '', returnAddress: '' })
    Object.assign(shipping, { company: detail.value.replacementCompany || '', trackingNo: detail.value.replacementTrackingNo || '' })
    Object.assign(receipt, { restockQuantity: Number(detail.value.quantity), receiptReference: '' }); visible.value = true
  } catch (e) { if (version === detailVersion) ElMessage.error(e.message || '售后详情加载失败') }
}
async function act(action, data) {
  if (busy.value) return
  const version = detailVersion, id = detail.value.id
  busy.value = true
  try {
    const result = await actAftersale(id, action, data)
    if (version !== detailVersion) return
    detail.value = result
    ElMessage.success('处理成功'); await load(); emit('changed')
  } catch (e) { ElMessage.error(e.message || '售后处理失败') }
  finally { busy.value = false }
}
async function submitReview() {
  if (busy.value || !await reviewRef.value.validate().catch(() => false)) return
  await act('review', { ...review })
}
async function inspect() {
  if (busy.value || !await receiptRef.value.validate().catch(() => false)) return
  try { await ElMessageBox.confirm(`确认已收齐 ${detail.value.quantity} 件退货，其中 ${receipt.restockQuantity} 件可售入库？`, '退货收货确认', { type: 'warning' }) }
  catch { return }
  await act('inspect', { ...receipt })
}
async function ship() {
  if (busy.value || !await shippingRef.value.validate().catch(() => false)) return
  await act('replacement', { ...shipping })
}
onMounted(load)
onBeforeUnmount(() => { listVersion++; detailVersion++ })
</script>
<style scoped>
.aftersale-section { margin: 0 0 24px; }
.aftersale-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.aftersale-heading h3 { margin: 0; font-size: 16px; }
.aftersale-heading h3 span { margin-left: 12px; font-size: 12px; font-weight: 400; color: var(--el-text-color-secondary); }
.aftersale-filters { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0 16px; margin-bottom: 16px; border-bottom: 1px solid var(--el-border-color-light); }
.aftersale-filters :deep(.el-form-item) { min-width: 0; }
.aftersale-filters :deep(.el-date-editor), .aftersale-filters :deep(.el-select) { width: 100%; min-width: 0; }
.date-filter, .keyword-filter { grid-column: span 2; }
.filter-actions { align-self: end; }
.aftersale-form { margin-top: 20px; }
.aftersale-events { margin: 24px 0 0; padding-left: 8px; }
@media (max-width: 600px) { .aftersale-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; } .filter-actions { grid-column: span 2; } }
</style>
