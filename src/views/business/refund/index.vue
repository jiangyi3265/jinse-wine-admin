<template>
  <div class="app-container refund-page">
    <div class="refund-heading"><h2>退款售后</h2></div>
    <el-tabs v-model="active">
      <el-tab-pane label="商城退款" name="refunds">
        <div class="refund-toolbar"><el-button :icon="Refresh" :loading="refundLoading" @click="loadRefunds">刷新</el-button></div>
        <el-table v-loading="refundLoading" :data="refunds" border stripe empty-text="暂无退款申请" class="business-table">
          <el-table-column prop="refundNo" label="退款单号" min-width="180" />
          <el-table-column prop="orderNo" label="商城订单号" min-width="190"><template #default="scope">{{ scope.row.orderNo || `ID ${scope.row.orderId}` }}</template></el-table-column>
          <el-table-column label="订单状态" width="100"><template #default="scope">{{ orderStatusLabel(scope.row.orderStatus) }}</template></el-table-column>
          <el-table-column label="履约方式" width="100"><template #default="scope">{{ fulfillmentLabel(scope.row.fulfillmentMode) }}</template></el-table-column>
          <el-table-column prop="memberId" label="会员ID" width="90" />
          <el-table-column label="订单金额" width="120"><template #default="scope">¥{{ money(scope.row.orderTotalCent) }}</template></el-table-column>
          <el-table-column label="退款金额" width="120"><template #default="scope">¥{{ money(scope.row.amountCent) }}</template></el-table-column>
          <el-table-column prop="reason" label="原因" min-width="160" />
          <el-table-column label="业务状态" width="110"><template #default="scope"><el-tag :type="refundStatusType(scope.row.status)" effect="plain" size="small">{{ refundStatus(scope.row.status) }}</el-tag></template></el-table-column>
          <el-table-column prop="channelStatus" label="资金渠道状态" width="140"><template #default="scope"><el-tag :type="channelRefundStatusType(scope.row.channelStatus)" effect="plain" size="small">{{ channelRefundStatus(scope.row.channelStatus) }}</el-tag></template></el-table-column>
          <el-table-column prop="manualPaymentReference" label="线下付款凭证" min-width="170" show-overflow-tooltip><template #default="scope">{{ scope.row.manualPaymentReference || '—' }}</template></el-table-column>
          <el-table-column label="线下确认" min-width="190"><template #default="scope">{{ scope.row.manualVerifiedBy ? `${scope.row.manualVerifiedBy} · ${scope.row.manualPaidAt || ''}` : '—' }}</template></el-table-column>
          <el-table-column prop="createTime" label="申请时间" min-width="170" />
          <el-table-column label="操作" :width="compact ? 190 : 330" :fixed="compact ? false : 'right'">
            <template #default="scope">
              <el-button v-if="scope.row.status === 'pending'" link type="primary" v-hasPermi="['business:refund:edit']" @click="refundAction(scope.row, 'approved')">审核通过</el-button>
              <el-button v-if="scope.row.status === 'pending'" link type="danger" v-hasPermi="['business:refund:edit']" @click="refundAction(scope.row, 'rejected')">驳回</el-button>
              <template v-if="scope.row.status === 'approved'">
                <el-button v-if="!scope.row.channelStatus" link type="primary" v-hasPermi="['business:refund:edit']" @click="wechatRefundAction(scope.row)">发起微信退款</el-button>
                <el-button v-if="scope.row.channelStatus && !['SUCCESS','PENDING_AUTO'].includes(scope.row.channelStatus)" link type="primary" v-hasPermi="['business:refund:edit']" @click="syncWechatRefundAction(scope.row)">查询微信退款状态</el-button>
                <el-button v-if="!scope.row.channelStatus || scope.row.channelStatus === 'CLOSED'" link type="success" v-hasPermi="['business:refund:edit']" @click="refundAction(scope.row, 'refunded')">确认线下退款已到账</el-button>
              </template>
              <el-button v-if="scope.row.status === 'refunded'" link type="primary" @click="openReturnReceipt(scope.row)">退货收货</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination class="refund-pagination" background layout="total, prev, pager, next" :total="refundTotal" :page-size="refundPageSize" :current-page="refundPage" @current-change="changeRefundPage" />
      </el-tab-pane>
      <el-tab-pane label="退货换货" name="aftersales">
        <OrderAftersalePanel @changed="loadRefunds" @view-refunds="active = 'refunds'" />
      </el-tab-pane>
      <el-tab-pane label="支付补查" name="payments">
        <div class="subsection-head"><span>支付异常补查</span><el-button size="small" :loading="paymentReconciliationsLoading" @click="reloadPaymentReconciliations">刷新</el-button></div>
        <el-table v-loading="paymentReconciliationsLoading" :data="paymentReconciliations" class="business-table" border stripe empty-text="暂无异常支付补查记录">
          <el-table-column prop="orderNo" label="商城订单号" min-width="190" />
          <el-table-column prop="memberId" label="会员ID" width="100" />
          <el-table-column label="订单状态" width="110"><template #default="scope">{{ orderStatusLabel(scope.row.orderStatus) }}</template></el-table-column>
          <el-table-column label="微信状态" width="140"><template #default="scope"><el-tag :type="scope.row.tradeState === 'REVIEW' || scope.row.tradeState === 'REFUND' ? 'danger' : 'warning'" effect="plain" size="small">{{ paymentReconciliationLabel(scope.row.tradeState) }}</el-tag></template></el-table-column>
          <el-table-column prop="attemptCount" label="查询次数" width="100" />
          <el-table-column prop="lastQueryAt" label="最近查询" min-width="170" />
          <el-table-column prop="nextQueryAt" label="下次重试" min-width="170"><template #default="scope">{{ scope.row.nextQueryAt || '待人工处理' }}</template></el-table-column>
          <el-table-column prop="lastError" label="核对原因" min-width="230" show-overflow-tooltip />
          <el-table-column label="操作" width="110" :fixed="compact ? false : 'right'"><template #default="scope"><el-button link type="primary" v-hasPermi="['business:refund:edit']" :loading="paymentReconciling === scope.row.orderNo" @click="reconcilePaymentAction(scope.row)">重新查单</el-button></template></el-table-column>
        </el-table>
        <el-pagination class="payment-reconcile-pagination" small background layout="total, prev, pager, next" :total="paymentReconciliationTotal" :page-size="paymentReconciliationPageSize" :current-page="paymentReconciliationPage" @current-change="changePaymentReconciliationPage" />
      </el-tab-pane>
    </el-tabs>
    <el-dialog v-model="returnDialog" title="退货收货" width="min(760px, 96vw)" destroy-on-close>
      <div v-loading="returnLoading" class="return-receipt">
        <div v-if="returnContext" class="return-order"><strong>{{ returnContext.orderNo }}</strong><span>退款单 {{ returnContext.refundNo }}</span></div>
        <el-alert v-if="returnContext && !returnContext.eligible" title="此订单没有已确认发货或自提核销记录，不能登记退货入库。" type="warning" :closable="false" />
        <template v-if="returnContext?.eligible">
          <el-table :data="returnLines" border stripe size="small" empty-text="订单无商品" class="return-desktop-table">
            <el-table-column label="商品" min-width="170"><template #default="scope"><strong>{{ scope.row.productName }}</strong><small class="return-spec">{{ scope.row.productSpec || '默认规格' }}</small></template></el-table-column>
            <el-table-column label="已收 / 订单" width="110"><template #default="scope">{{ scope.row.receivedQuantity }} / {{ scope.row.quantity }}</template></el-table-column>
            <el-table-column label="本次实收" width="125"><template #default="scope"><el-input-number v-model="scope.row.receive" :min="0" :max="Math.max(0, scope.row.quantity - scope.row.receivedQuantity)" :controls="false" size="small" @change="limitReturnRestock(scope.row)" /></template></el-table-column>
            <el-table-column label="可售入库" width="125"><template #default="scope"><el-input-number v-model="scope.row.restock" :min="0" :max="scope.row.receive" :controls="false" size="small" /></template></el-table-column>
          </el-table>
          <div class="return-mobile-lines">
            <div v-for="line in returnLines" :key="line.orderItemId" class="return-mobile-line">
              <strong>{{ line.productName }}</strong><span class="return-spec">{{ line.productSpec || '默认规格' }} · 已收 {{ line.receivedQuantity }} / {{ line.quantity }}</span>
              <div class="return-mobile-inputs"><label>本次实收<el-input-number v-model="line.receive" :min="0" :max="Math.max(0, line.quantity - line.receivedQuantity)" :controls="false" size="small" @change="limitReturnRestock(line)" /></label><label>可售入库<el-input-number v-model="line.restock" :min="0" :max="line.receive" :controls="false" size="small" /></label></div>
            </div>
          </div>
          <el-form label-position="top" class="return-receipt-form"><el-form-item label="收货凭证" required><el-input v-model="returnReference" maxlength="128" show-word-limit placeholder="请输入快递单号、门店交接单号或收货凭证号" /></el-form-item></el-form>
          <p class="return-hint">仅将实际收到且可再次销售的商品计入库存；无法销售的退货填写实收数量，可售入库填 0。</p>
        </template>
        <div v-if="returnContext?.receipts?.length" class="return-history"><strong>收货记录</strong><el-table :data="returnContext.receipts" border size="small" class="return-desktop-table"><el-table-column prop="receivedAt" label="收货时间" min-width="155" /><el-table-column prop="productName" label="商品" min-width="130" /><el-table-column prop="quantity" label="实收" width="70" /><el-table-column prop="restockQuantity" label="入库" width="70" /><el-table-column prop="receiptReference" label="凭证" min-width="150" show-overflow-tooltip /><el-table-column prop="receivedBy" label="操作人" width="100" /></el-table><div class="return-mobile-history"><div v-for="receipt in returnContext.receipts" :key="receipt.receiptId" class="return-history-row"><div><strong>{{ receipt.productName }}</strong><span>{{ receipt.receivedAt }}</span></div><span>实收 {{ receipt.quantity }} · 入库 {{ receipt.restockQuantity }}</span><small>{{ receipt.receiptReference }} · {{ receipt.receivedBy }}</small></div></div></div>
      </div>
      <template #footer><el-button @click="returnDialog = false">关闭</el-button><el-button v-if="returnContext?.eligible" type="primary" :loading="returnSaving" v-hasPermi="['business:refund:edit']" @click="submitReturnReceipt">确认收货</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { listRefunds, getReturnReceipts, recordReturnReceipt, listPaymentReconciliations, reconcilePayment, updateRefundStatus, submitWechatRefund, syncWechatRefund } from '@/api/business/extension'
import { setupBusinessTableScroll } from '@/utils/businessTableScroll'
import OrderAftersalePanel from '../components/OrderAftersalePanel.vue'

const active = ref('refunds')
const compactQuery = window.matchMedia('(max-width: 600px)')
const compact = ref(compactQuery.matches)
const updateCompact = event => { compact.value = event.matches }
const refunds = ref([]), refundLoading = ref(false), refundTotal = ref(0), refundPage = ref(1)
const refundPageSize = 20
const returnDialog = ref(false), returnLoading = ref(false), returnSaving = ref(false), returnContext = ref(null), returnLines = ref([]), returnReference = ref('')
let returnRefundId = null, returnRequestId = ''
const paymentReconciliations = ref([]), paymentReconciliationsLoading = ref(false), paymentReconciling = ref('')
const paymentReconciliationPage = ref(1), paymentReconciliationPageSize = 20, paymentReconciliationTotal = ref(0)

async function loadRefunds() {
  refundLoading.value = true
  try {
    const result = await listRefunds({ pageNum: refundPage.value, pageSize: refundPageSize })
    refunds.value = result?.rows || []
    refundTotal.value = Number(result?.total || 0)
    const lastPage = Math.max(1, Math.ceil(refundTotal.value / refundPageSize))
    if (refundPage.value > lastPage) { refundPage.value = lastPage; await loadRefunds() }
  } catch (error) { ElMessage.error(error.message || '退款列表加载失败') }
  finally { refundLoading.value = false }
}
async function changeRefundPage(page) { refundPage.value = page; await loadRefunds() }
function money(value) { return (Number(value || 0) / 100).toFixed(2) }
function refundStatus(status) { return ({ pending: '待审核', approved: '待退款', rejected: '已驳回', refunded: '已完成' })[status] || status || '待处理' }
function orderStatusLabel(status) { return ({ pending: '待付款', paid: '待发货', shipping: '待收货', receiving: '待收货', complete: '已完成', cancelled: '已取消', refunded: '已退款' })[status] || '未知' }
function fulfillmentLabel(mode) { return ({ delivery: '配送', pickup: '门店自提' })[mode] || '未知' }
function refundStatusType(status) { return ({ refunded: 'success', rejected: 'danger', approved: 'warning' })[status] || 'info' }
function channelRefundStatus(status) { return ({ SUCCESS: '已退款', MANUAL_CONFIRMED: '线下已确认', PROCESSING: '处理中', CLOSED: '已关闭', ABNORMAL: '异常', REVIEW: '需人工核对', UNKNOWN: '待核对', SUBMITTING: '提交中', PENDING_AUTO: '自动退款排队中' })[status] || (status ? status : '未发起') }
function channelRefundStatusType(status) { return ({ SUCCESS: 'success', MANUAL_CONFIRMED: 'success', CLOSED: 'info', ABNORMAL: 'danger', REVIEW: 'danger', UNKNOWN: 'warning', PROCESSING: 'warning', SUBMITTING: 'primary', PENDING_AUTO: 'warning' })[status] || 'info' }
function paymentReconciliationLabel(state) {
  return ({ SUCCESS: '支付成功', NOTPAY: '未支付', CLOSED: '已关闭', USERPAYING: '支付中', PAYERROR: '支付失败', ERROR: '查询失败', REVIEW: '需人工核对', REFUND: '微信已退款' })[state] || state || '待查询'
}
async function loadPaymentReconciliations() {
  paymentReconciliationsLoading.value = true
  try {
    const result = await listPaymentReconciliations({ pageNum: paymentReconciliationPage.value, pageSize: paymentReconciliationPageSize })
    paymentReconciliations.value = result?.rows || []
    paymentReconciliationTotal.value = Number(result?.total || 0)
    const lastPage = Math.max(1, Math.ceil(paymentReconciliationTotal.value / paymentReconciliationPageSize))
    if (paymentReconciliationPage.value > lastPage) {
      paymentReconciliationPage.value = lastPage
      await loadPaymentReconciliations()
    }
  }
  finally { paymentReconciliationsLoading.value = false }
}
async function changePaymentReconciliationPage(page) {
  paymentReconciliationPage.value = page
  await reloadPaymentReconciliations()
}
async function reloadPaymentReconciliations() {
  try { await loadPaymentReconciliations() }
  catch (error) { ElMessage.error(error.message || '支付补查记录加载失败') }
}
async function reconcilePaymentAction(row) {
  if (paymentReconciling.value) return
  paymentReconciling.value = row.orderNo
  try {
    const result = await reconcilePayment(row.orderNo)
    await loadPaymentReconciliations()
    if (result.tradeState === 'SUCCESS') ElMessage.success('微信支付已确认，订单状态已更新')
    else ElMessage.warning(result.lastError || `微信交易状态：${paymentReconciliationLabel(result.tradeState)}`)
  } catch (error) { ElMessage.error(error.message || '微信支付查单失败') }
  finally { paymentReconciling.value = '' }
}
async function refundAction(row, status) {
  const label = status === 'approved' ? '审核通过' : status === 'rejected' ? '驳回申请' : '确认实际退款已完成'
  try {
    let paymentReference = ''
    if (status === 'refunded') {
      const result = await ElMessageBox.prompt(`请先完成 ¥${money(row.amountCent)} 线下退款，再填写银行流水号或财务凭证号。`, '确认线下退款', {
        type: 'warning',
        inputPlaceholder: '银行流水号或财务凭证号',
        inputValidator: value => value?.trim() && value.trim().length <= 128 ? true : '请填写不超过128字的实际付款凭证号',
      })
      paymentReference = result.value.trim()
    } else {
      await ElMessageBox.confirm(`确认${label}？`, '退款处理', { type: status === 'rejected' ? 'warning' : 'info' })
    }
    await updateRefundStatus(row.refundId, { status, paymentReference })
    await loadRefunds()
    ElMessage.success('退款状态已更新')
  } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '处理失败') }
}
function newReturnRequestId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
}
function setReturnContext(context) {
  returnContext.value = context
  returnLines.value = (context.items || []).map(item => ({ ...item, receive: 0, restock: 0 }))
}
async function openReturnReceipt(row) {
  returnRefundId = row.refundId
  returnRequestId = newReturnRequestId()
  returnReference.value = ''
  returnContext.value = null
  returnLines.value = []
  returnDialog.value = true
  returnLoading.value = true
  try {
    const context = await getReturnReceipts(row.refundId)
    if (returnRefundId === row.refundId && returnDialog.value) setReturnContext(context)
  } catch (error) { if (returnRefundId === row.refundId) { ElMessage.error(error.message || '收货信息加载失败'); returnDialog.value = false } }
  finally { returnLoading.value = false }
}
function limitReturnRestock(line) {
  if (Number(line.restock) > Number(line.receive)) line.restock = Number(line.receive) || 0
}
async function submitReturnReceipt() {
  if (returnSaving.value || !returnContext.value?.eligible) return
  const reference = returnReference.value.trim()
  if (!reference) return ElMessage.warning('请输入收货凭证')
  const items = returnLines.value.filter(line => Number(line.receive) > 0).map(line => ({
    orderItemId: line.orderItemId, quantity: Number(line.receive), restockQuantity: Number(line.restock)
  }))
  if (!items.length) return ElMessage.warning('请填写至少一件实际收到的商品')
  if (items.some(item => !Number.isInteger(item.quantity) || !Number.isInteger(item.restockQuantity) || item.restockQuantity < 0 || item.restockQuantity > item.quantity))
    return ElMessage.warning('请核对实收数量和可售入库数量')
  returnSaving.value = true
  try {
    const context = await recordReturnReceipt(returnRefundId, { requestId: returnRequestId, receiptReference: reference, items })
    returnRequestId = newReturnRequestId()
    returnReference.value = ''
    setReturnContext(context)
    ElMessage.success('收货记录已保存，库存已按可售数量更新')
  } catch (error) { ElMessage.error(error.message || '收货登记失败，请使用当前表单重试') }
  finally { returnSaving.value = false }
}
async function wechatRefundAction(row) { try { await ElMessageBox.confirm(`向微信发起 ¥${(Number(row.amountCent || 0) / 100).toFixed(2)} 退款？微信回调确认前不会标记完成。`, '发起微信退款', { type: 'warning' }); const result = await submitWechatRefund(row.refundId); await loadRefunds(); notifyWechatRefund(result, '已提交') } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '微信退款提交失败') } }
async function syncWechatRefundAction(row) { try { const result = await syncWechatRefund(row.refundId); await loadRefunds(); notifyWechatRefund(result, '已更新') } catch (error) { ElMessage.error(error.message || '微信退款状态查询失败') } }
function notifyWechatRefund(result, fallback) {
  const status = String(result?.data?.status || result?.status || '').toUpperCase()
  const label = status ? channelRefundStatus(status) : fallback
  const type = status === 'SUCCESS' ? 'success' : status === 'ABNORMAL' ? 'error' : 'warning'
  ElMessage[type](`微信退款状态：${label}`)
}

let tableScroll
onMounted(() => {
  compactQuery.addEventListener('change', updateCompact)
  tableScroll = setupBusinessTableScroll('.refund-page')
  loadRefunds()
  reloadPaymentReconciliations()
})
onBeforeUnmount(() => { compactQuery.removeEventListener('change', updateCompact); tableScroll?.dispose() })
</script>

<style scoped>
.refund-page { min-width: 0; }
.refund-heading h2 { margin: 0 0 16px; font-size: 20px; }
.refund-toolbar { display: flex; justify-content: flex-end; margin-bottom: 12px; }
.refund-pagination, .payment-reconcile-pagination { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
.subsection-head { display: flex; justify-content: space-between; align-items: center; margin: 12px 0; font-size: 15px; font-weight: 600; }
.return-receipt { min-height: 120px; max-height: calc(100vh - 190px); overflow-y: auto; }
.return-order { display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; margin-bottom: 14px; }
.return-order strong { font-size: 15px; }
.return-order span, .return-hint, .return-spec { color: var(--el-text-color-secondary); font-size: 12px; }
.return-spec { display: block; margin-top: 3px; }
.return-receipt :deep(.el-input-number) { width: 100%; }
.return-receipt-form { margin-top: 18px; }
.return-receipt-form :deep(.el-form-item) { max-width: 520px; margin-bottom: 8px; }
.return-hint { margin: 0; line-height: 1.5; }
.return-history { margin-top: 22px; }
.return-history > strong { font-size: 13px; }
.return-mobile-lines, .return-mobile-history { display: none; }
@media (max-width: 600px) {
  .return-desktop-table { display: none; }
  .return-mobile-lines, .return-mobile-history { display: block; }
  .return-mobile-line, .return-history-row { padding: 12px 0; border-bottom: 1px solid var(--el-border-color-lighter); }
  .return-mobile-line > strong, .return-history-row strong { display: block; overflow-wrap: anywhere; font-size: 13px; }
  .return-mobile-line .return-spec { margin-top: 4px; }
  .return-mobile-inputs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
  .return-mobile-inputs label { display: grid; min-width: 0; gap: 6px; color: var(--el-text-color-secondary); font-size: 12px; }
  .return-history-row { display: grid; gap: 5px; color: var(--el-text-color-regular); font-size: 12px; }
  .return-history-row > div { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; flex-wrap: wrap; }
  .return-history-row > div span, .return-history-row small { color: var(--el-text-color-secondary); overflow-wrap: anywhere; }
}
@media (max-width: 340px) { .return-mobile-inputs { grid-template-columns: 1fr; } }
</style>
