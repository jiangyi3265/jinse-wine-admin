<template>
  <business-records title="奖品权益" resource="reward" id-field="rewardId" :fields="fields" :status-transitions="transitions" />
</template>

<script setup>
import BusinessRecords from '../components/BusinessRecords.vue'

const typeOptions = [
  { label: '现金红包', value: 'cash' },
  { label: '积分', value: 'points' },
  { label: '优惠券', value: 'coupon' },
  { label: '实物礼品', value: 'goods' }
]
const statusOptions = [
  { label: '待处理', value: 'pending' },
  { label: '处理中', value: 'processing' },
  { label: '已领取', value: 'received' },
  { label: '已核销', value: 'redeemed' },
  { label: '发放失败', value: 'failed' },
  { label: '已关闭', value: 'closed' }
]

// 奖品状态由后端再次校验；已核销状态只能由核销流程产生。
const transitions = {
  pending: [{ label: '开始处理', value: 'processing' }, { label: '关闭', value: 'closed' }],
  processing: [{ label: '确认发放', value: 'received' }, { label: '标记失败', value: 'failed' }]
}

const fields = [
  { prop: 'rewardId', label: '奖品 ID' },
  { prop: 'memberId', label: '会员 ID', search: true, table: true },
  { prop: 'rewardType', label: '类型', options: typeOptions, search: true, table: true },
  { prop: 'rewardName', label: '奖品名称', table: true, width: 160 },
  { prop: 'amountCent', label: '现金金额', type: 'money' },
  { prop: 'points', label: '积分数' },
  { prop: 'exchangeCode', label: '核销码', table: true, width: 180 },
  { prop: 'status', label: '状态', options: statusOptions, search: true, table: true },
  { prop: 'expiresAt', label: '过期时间' },
  { prop: 'createTime', label: '创建时间', table: true, width: 170 },
  { prop: 'updateTime', label: '更新时间' }
]
</script>
