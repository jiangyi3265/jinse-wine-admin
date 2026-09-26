<template>
  <business-records title="会员" resource="member" id-field="memberId" :fields="fields" :status-transitions="transitions" />
</template>

<script setup>
import BusinessRecords from '../components/BusinessRecords.vue'
import { onOffOptions } from '../components/fields'

const transitions = {
  '0': [{ label: '停用', value: '1' }],
  '1': [{ label: '启用', value: '0' }]
}

const fields = [
  { prop: 'memberId', label: '会员 ID', search: true, table: true },
  { prop: 'nickname', label: '昵称', search: true, table: true, width: 150 },
  { prop: 'wechatOpenid', label: '微信 OpenID' },
  { prop: 'unionId', label: '微信 UnionID' },
  { prop: 'avatar', label: '头像地址' },
  { prop: 'phone', label: '手机号', search: true, table: true },
  { prop: 'vipLevel', label: '会员等级', table: true },
  { prop: 'staffStoreId', label: '核销员门店 ID' },
  { prop: 'status', label: '状态', options: onOffOptions, search: true, table: true },
  { prop: 'createTime', label: '注册时间', table: true, width: 170 },
  { prop: 'updateTime', label: '更新时间' }
]
</script>
