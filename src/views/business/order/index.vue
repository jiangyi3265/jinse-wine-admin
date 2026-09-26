<template>
  <business-records title="订单" resource="order" id-field="orderId" :fields="fields" :status-transitions="transitions">
    <template #detail="{ detail }">
      <template v-if="detail?.items?.length">
        <h3>商品明细</h3>
        <el-table :data="detail.items" border>
          <el-table-column prop="productName" label="商品" min-width="160" />
          <el-table-column prop="productSpec" label="规格" min-width="120" />
          <el-table-column prop="unitPriceCent" label="单价（分）" width="110" />
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column prop="totalCent" label="小计（分）" width="110" />
        </el-table>
      </template>
    </template>
  </business-records>
</template>

<script setup>
import BusinessRecords from '../components/BusinessRecords.vue'

const statusOptions = [
  { label: '待支付', value: 'pending' },
  { label: '已支付', value: 'paid' },
  { label: '待收货', value: 'shipping' },
  { label: '收货中', value: 'receiving' },
  { label: '已完成', value: 'complete' },
  { label: '已取消', value: 'cancelled' },
  { label: '已退款', value: 'refunded' }
]

// 支付与退款须由后端支付流程控制，管理端只提供履约状态流转。
const transitions = {
  paid: [{ label: '发货', value: 'shipping' }],
  shipping: [{ label: '待确认收货', value: 'receiving' }],
  receiving: [{ label: '完成', value: 'complete' }]
}

const fields = [
  { prop: 'orderId', label: '订单 ID' },
  { prop: 'orderNo', label: '订单号', search: true, table: true, width: 180 },
  { prop: 'memberId', label: '会员 ID', search: true, table: true },
  { prop: 'addressSnapshot', label: '收货地址', span: 2 },
  { prop: 'subtotalCent', label: '商品金额', type: 'money' },
  { prop: 'discountCent', label: '优惠金额', type: 'money' },
  { prop: 'shippingCent', label: '运费', type: 'money' },
  { prop: 'totalCent', label: '实付金额', type: 'money', table: true },
  { prop: 'couponId', label: '优惠券 ID' },
  { prop: 'status', label: '状态', options: statusOptions, search: true, table: true },
  { prop: 'paidAt', label: '支付时间' },
  { prop: 'cancelledAt', label: '取消时间' },
  { prop: 'createTime', label: '下单时间', table: true, width: 170 },
  { prop: 'updateTime', label: '更新时间' }
]
</script>
