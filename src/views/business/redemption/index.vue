<template>
  <business-records title="核销记录" resource="redemption" id-field="redemptionId" :fields="fields" :show-detail="false" />
</template>

<script setup>
import BusinessRecords from '../components/BusinessRecords.vue'

// 核销记录为审计信息，只读展示，不提供修改或删除操作。
const statusOptions = [
  { label: '已核销', value: 'confirmed' },
  { label: '处理中', value: 'processing' },
  { label: '已取消', value: 'cancelled' },
  { label: '已失败', value: 'failed' }
]
const fields = [
  { prop: 'redemptionId', label: '核销 ID', table: true },
  { prop: 'rewardId', label: '奖品', lookup: 'reward', search: true, table: true },
  { prop: 'memberId', label: '会员', lookup: 'member', search: true, table: true },
  { prop: 'storeId', label: '门店', lookup: 'store', search: true, table: true },
  { prop: 'verifierMemberId', label: '核销员', lookup: 'member', table: true },
  { prop: 'status', label: '状态', options: statusOptions, table: true },
  { prop: 'requestId', label: '请求编号', table: true, width: 160 },
  { prop: 'createTime', label: '核销时间', table: true, width: 170 }
]
</script>
