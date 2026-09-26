<template>
  <business-crud title="优惠券模板" resource="couponTemplate" id-field="couponTemplateId" :fields="fields" />
</template>

<script setup>
import BusinessCrud from '../components/BusinessCrud.vue'
import { couponTypeOptions, onOffOptions } from '../components/fields'

// 金额字段在表单显示元，在接口层统一传输整数分。
const fields = [
  { prop: 'templateCode', label: '模板编码', search: true, table: true, required: true, maxlength: 64 },
  { prop: 'templateName', label: '券名称', search: true, table: true, required: true, maxlength: 128, width: 160 },
  { prop: 'couponType', label: '类型', options: couponTypeOptions, table: true, search: true, required: true, default: 'fixed' },
  { prop: 'amountCent', label: '减免金额（元）', type: 'money', table: true, default: 0 },
  { prop: 'discountRate', label: '折扣百分比', type: 'number', min: 1, max: 100, default: 100 },
  { prop: 'minAmountCent', label: '最低消费（元）', type: 'money', default: 0 },
  { prop: 'minQuantity', label: '最低件数', type: 'number', min: 1, default: 1 },
  { prop: 'maxDiscountCent', label: '封顶优惠（元）', type: 'money', default: 0 },
  { prop: 'memberOnly', label: '仅限会员', options: [{ label: '否', value: 0 }, { label: '是', value: 1 }], default: 0 },
  { prop: 'pointsOnly', label: '仅积分兑换', options: [{ label: '否', value: 0 }, { label: '是', value: 1 }], default: 0 },
  { prop: 'channel', label: '发放渠道', maxlength: 64 },
  { prop: 'stock', label: '可领库存（-1不限）', type: 'number', min: -1, default: -1, table: true },
  { prop: 'claimLimit', label: '每人领取上限', type: 'number', min: 1, default: 1 },
  { prop: 'startTime', label: '开始时间', type: 'datetime' },
  { prop: 'endTime', label: '结束时间', type: 'datetime' },
  { prop: 'sortNum', label: '排序', type: 'number', default: 0 },
  { prop: 'status', label: '状态', options: onOffOptions, table: true, search: true, required: true, default: '0' },
  { prop: 'remark', label: '备注', type: 'textarea', maxlength: 500 }
]
</script>
