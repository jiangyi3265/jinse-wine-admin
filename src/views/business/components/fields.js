// 管理端与数据库统一采用分、0/1 状态；页面只负责显示转换。
export const onOffOptions = [
  { label: '启用', value: '0' },
  { label: '停用', value: '1' }
]

export const productStatusOptions = [
  { label: '上架', value: '0' },
  { label: '下架', value: '1' }
]

export const couponTypeOptions = [
  { label: '满减券', value: 'fixed' },
  { label: '折扣券', value: 'percent' }
]

export const exchangeTypeOptions = [
  { label: '优惠券', value: 'coupon' },
  { label: '实物礼品', value: 'goods' }
]
