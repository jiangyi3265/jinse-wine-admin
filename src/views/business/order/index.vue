<template>
  <business-records ref="recordsRef" title="订单" resource="order" id-field="orderId" :fields="fields" :status-transitions="transitions">
    <template #detail="{ detail }">
      <template v-if="detail?.items?.length">
        <el-alert :title="fulfillmentMessage(detail)" :type="fulfillmentAlertType(detail)" :closable="false" class="fulfillment-alert" />
        <div v-if="detail.fulfillmentMode === 'delivery'" class="delivery-panel">
          <div class="delivery-panel-heading">
            <div><h3>物流履约</h3><p>填写发货信息后，买家可在小程序订单详情查看物流状态。</p></div>
            <el-button v-if="['paid', 'shipping', 'receiving'].includes(detail.status)" type="primary" plain icon="Van" v-hasPermi="['business:order:edit']" @click="openDelivery(detail)">{{ detail.delivery?.trackingNo ? '更新物流' : '填写发货信息' }}</el-button>
          </div>
          <el-descriptions v-if="detail.delivery" :column="2" border>
            <el-descriptions-item label="快递公司">{{ detail.delivery.company }}</el-descriptions-item>
            <el-descriptions-item label="物流单号">{{ detail.delivery.trackingNo }}</el-descriptions-item>
            <el-descriptions-item label="发货状态">{{ deliveryStatusLabel(detail.delivery.status) }}</el-descriptions-item>
            <el-descriptions-item label="发货时间">{{ detail.delivery.shippedAt || '—' }}</el-descriptions-item>
            <el-descriptions-item label="物流更新时间">{{ detail.delivery.lastSyncedAt || '尚未同步' }}</el-descriptions-item>
          </el-descriptions>
          <el-alert v-if="detail.delivery?.syncError" :title="detail.delivery.syncError" type="warning" :closable="false" />
          <el-alert v-else-if="detail.delivery && !detail.delivery.trackingAvailable" :title="detail.delivery.trackingEnabled ? '当前快递公司暂不支持自动查询' : '物流自动查询尚未开通'" type="info" :closable="false" />
          <el-timeline v-if="deliveryTraces(detail.delivery).length" class="delivery-timeline">
            <el-timeline-item v-for="(trace, index) in deliveryTraces(detail.delivery)" :key="index" :timestamp="trace.time">{{ trace.description }}</el-timeline-item>
          </el-timeline>
          <el-empty v-if="!detail.delivery" :image-size="42" description="尚未填写物流信息" />
        </div>
        <h3>商品明细</h3>
        <el-table :data="detail.items" border>
          <el-table-column prop="productName" label="商品" min-width="160" />
          <el-table-column prop="productSpec" label="规格" min-width="120" />
          <el-table-column label="单价" width="110"><template #default="scope">{{ money(scope.row.unitPriceCent) }}</template></el-table-column>
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column label="小计" width="110"><template #default="scope">{{ money(scope.row.totalCent) }}</template></el-table-column>
        </el-table>
        <el-descriptions v-if="detail.pickupRedemption" title="门店自提核销记录" :column="2" border class="pickup-record">
          <el-descriptions-item label="核销门店 ID">{{ detail.pickupRedemption.storeId }}</el-descriptions-item>
          <el-descriptions-item label="核销员 ID">{{ detail.pickupRedemption.verifierMemberId }}</el-descriptions-item>
          <el-descriptions-item label="核销时间">{{ detail.pickupRedemption.createTime }}</el-descriptions-item>
          <el-descriptions-item label="请求号">{{ detail.pickupRedemption.requestId }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </template>
  </business-records>
  <el-dialog v-model="deliveryOpen" title="填写发货信息" width="min(560px, 94vw)" append-to-body>
    <el-form ref="deliveryRef" :model="deliveryForm" :rules="deliveryRules" label-width="110px">
      <el-form-item label="快递公司" prop="company"><el-select v-model="deliveryForm.company" filterable allow-create default-first-option placeholder="请选择快递公司" @change="selectCompany"><el-option v-for="item in companies" :key="item.code" :label="item.name" :value="item.name" /></el-select></el-form-item>
      <el-form-item label="物流单号" prop="trackingNo"><el-input v-model.trim="deliveryForm.trackingNo" maxlength="128" placeholder="填写承运商返回的运单号" /></el-form-item>
    </el-form>
    <el-alert title="保存后订单会进入待收货，买家可在订单详情查看物流摘要。" type="info" :closable="false" />
    <template #footer><el-button @click="deliveryOpen = false">取消</el-button><el-button type="primary" :loading="deliverySaving" @click="saveDelivery">保存发货信息</el-button></template>
  </el-dialog>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import BusinessRecords from '../components/BusinessRecords.vue'
import { updateOrderDelivery, getDeliveryCompanies } from '@/api/business'

const statusOptions = [
  { label: '待支付', value: 'pending' },
  { label: '待发货', value: 'paid' },
  { label: '待收货（历史发货）', value: 'shipping' },
  { label: '待收货', value: 'receiving' },
  { label: '已完成', value: 'complete' },
  { label: '已取消', value: 'cancelled' },
  { label: '已退款', value: 'refunded' }
]

// 支付与退款须由后端支付流程控制，管理端只提供履约状态流转。
const transitions = {
  // 配送订单必须先填写物流，详情里的“填写发货信息”会自动推进到待收货。
  paid: [],
  shipping: [{ label: '待确认收货', value: 'receiving' }],
  receiving: [{ label: '完成', value: 'complete' }]
}

const fields = [
  { prop: 'orderId', label: '订单 ID' },
  { prop: 'orderNo', label: '订单号', search: true, table: true, width: 180 },
  { prop: 'memberId', label: '会员', lookup: 'member', search: true, table: true },
  { prop: 'fulfillmentMode', label: '履约方式', options: [{ label: '平台配送', value: 'delivery' }, { label: '门店自提', value: 'pickup' }], search: true, table: true },
  { prop: 'pickupStoreId', label: '自提门店', lookup: 'store' },
  { prop: 'addressSnapshot', label: '收货地址', type: 'address', span: 2 },
  { prop: 'subtotalCent', label: '商品金额', type: 'money' },
  { prop: 'discountCent', label: '优惠金额', type: 'money' },
  { prop: 'shippingCent', label: '运费', type: 'money' },
  { prop: 'totalCent', label: '实付金额', type: 'money', table: true },
  { prop: 'couponId', label: '优惠券', lookup: 'coupon' },
  { prop: 'status', label: '状态', options: statusOptions, search: true, table: true },
  { prop: 'paidAt', label: '支付时间' },
  { prop: 'cancelledAt', label: '取消时间' },
  { prop: 'createTime', label: '下单时间', table: true, width: 170 },
  { prop: 'updateTime', label: '更新时间' }
]

const deliveryOpen = ref(false)
const recordsRef = ref()
const deliverySaving = ref(false)
const deliveryTarget = ref(null)
const deliveryRef = ref()
const companies = ref([])
const deliveryForm = reactive({ company: '', companyCode: '', trackingNo: '', lastTrace: '' })
const deliveryRules = {
  company: [{ required: true, message: '请选择快递公司', trigger: ['blur', 'change'] }],
  trackingNo: [{ required: true, message: '请输入物流单号', trigger: 'blur' }],
}
function money(value) { return `¥${(Number(value || 0) / 100).toFixed(2)}` }
function deliveryStatusLabel(status) {
  return ({ pending: '待发货', shipped: '已发货，待揽收', awaiting_collect: '待揽收', collected: '已揽收',
    in_transit: '运输中', delivering: '运输中', out_for_delivery: '派送中', awaiting_pickup: '到达驿站待取件',
    delivered: '已送达，待确认收货', agent_signed: '已代签收，请核对取件', signed: '已签收，待确认收货', returning: '退回中', returned: '已退回',
    refused: '已拒收', exception: '物流异常', cancelled: '运单已取消' })[status] || '待更新'
}
function deliveryTraces(delivery) {
  try { const traces = typeof delivery?.lastTrace === 'string' ? JSON.parse(delivery.lastTrace) : delivery?.lastTrace; return Array.isArray(traces) ? traces : [] } catch { return [] }
}
function selectCompany(name) { deliveryForm.companyCode = companies.value.find(item => item.name === name)?.code || '' }
function fulfillmentMessage(detail) {
  if (detail.fulfillmentMode === 'pickup') {
    return ['cancelled', 'refunded'].includes(detail.status)
      ? '门店自提订单已结束，无需继续核销。'
      : '门店自提订单：请由指定门店核销员扫码完成交付和计佣。'
  }
  if (detail.status === 'cancelled') return '订单已取消，不需要发货。'
  if (detail.status === 'refunded') return '订单已退款，不需要继续履约。'
  if (detail.status === 'complete') return '订单已完成；物流与佣金记录仅供查询。'
  if (detail.status === 'pending') return '订单等待付款；支付完成后才可填写发货信息。'
  return '订单由平台配送：填写物流信息后，买家可确认收货并完成订单和佣金结算。'
}
function fulfillmentAlertType(detail) {
  if (['cancelled', 'refunded'].includes(detail.status)) return 'info'
  return detail.fulfillmentMode === 'pickup' ? 'warning' : 'info'
}
async function openDelivery(detail) {
  deliveryTarget.value = detail
  Object.assign(deliveryForm, {
    company: detail.delivery?.company || '',
    companyCode: detail.delivery?.companyCode || '',
    trackingNo: detail.delivery?.trackingNo || '',
    lastTrace: '',
  })
  deliveryOpen.value = true
  try { companies.value = (await getDeliveryCompanies()).data || [] }
  catch { ElMessage.warning('快递公司列表加载失败，可以手动填写公司名称') }
}
async function saveDelivery() {
  try { if (!await deliveryRef.value.validate()) return } catch { return }
  deliverySaving.value = true
  try {
    const response = await updateOrderDelivery(deliveryTarget.value.orderId, { ...deliveryForm })
    deliveryTarget.value.delivery = response.data
    deliveryTarget.value.status = response.data?.orderStatus || deliveryTarget.value.status
    deliveryOpen.value = false
    ElMessage.success('发货信息已保存，订单已进入待收货')
    await recordsRef.value?.reload()
  } catch (error) {
    ElMessage.error(error.message || '发货信息保存失败')
  } finally { deliverySaving.value = false }
}
</script>

<style scoped>
.delivery-panel { margin: 20px 0 18px; padding: 16px; border: 1px solid #e4e9e2; border-radius: 8px; background: #f8faf7; }
.delivery-panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.delivery-panel-heading h3 { margin: 0; color: #2f4138; font-size: 15px; }
.delivery-panel-heading p { margin: 5px 0 0; color: #7a8780; font-size: 12px; }
.delivery-timeline { margin: 18px 0 0; padding-left: 8px; }
@media (max-width: 600px) { .delivery-panel-heading { flex-direction: column; } }
</style>
