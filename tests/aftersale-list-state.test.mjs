import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { reactive, ref } from 'vue'
import { parse } from '@vue/compiler-sfc'

const source = readFileSync(new URL('../src/views/business/components/OrderAftersalePanel.vue', import.meta.url), 'utf8')
const script = parse(source).descriptor.scriptSetup.content.replace(/^import .*$/gm, '')
const tick = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
function setup(overrides = {}) {
  const calls = [], actions = [], messages = [], cleanup = []
  const list = overrides.list || (async () => ({ rows: [{ id: 1 }], total: 41 }))
  const detail = overrides.detail || (async id => ({ id, quantity: 2, status: 'returning' }))
  const act = overrides.act || (async (id, action, data) => ({ id, ...data, status: 'received' }))
  const component = new Function('reactive', 'ref', 'onMounted', 'onBeforeUnmount', 'defineEmits', 'ElMessage', 'ElMessageBox', 'listAftersales', 'getAftersale', 'actAftersale',
    script + '\nreturn { load, search, reset, open, act, inspect, query, pageNum, pageSize, rows, total, error, loading, detail, busy, receipt, receiptRef };'
  )(reactive, ref, () => {}, fn => cleanup.push(fn), () => () => {},
    { success: v => messages.push(v), error: v => messages.push(v) }, { confirm: async () => true },
    params => { calls.push({ ...params }); return list(params) }, detail,
    (id, action, data) => { actions.push({ id, action, data }); return act(id, action, data) })
  return { ...component, calls, actions, messages, dispose: () => cleanup.forEach(fn => fn()) }
}

test('aftersale paging retains submitted filters and reset returns to page one', async () => {
  const h = setup()
  h.query.keyword = '订单甲'; h.query.memberNo = 'HY111'; h.query.range = ['2026-10-01', '2026-10-09']
  h.search(); await tick()
  assert.equal(h.calls[0].keyword, '订单甲')
  assert.equal(h.calls[0].fromDate, '2026-10-01')
  h.query.keyword = '尚未查询'
  h.pageNum.value = 2; await h.load()
  assert.equal(h.calls[1].keyword, '订单甲')
  assert.equal(h.calls[1].pageNum, 2)
  h.reset(); await tick()
  assert.equal(h.pageNum.value, 1)
  assert.equal(h.calls[2].keyword, undefined)
  assert.equal(h.total.value, 41)
})

test('late list responses and failures cannot replace the newer query', async () => {
  const first = deferred(), second = deferred()
  let count = 0
  const h = setup({ list: () => ++count === 1 ? first.promise : second.promise })
  const old = h.load(), latest = h.load()
  second.resolve({ rows: [{ id: 2 }], total: 2 }); await latest
  first.reject(new Error('old failure')); await old
  assert.deepEqual(h.rows.value, [{ id: 2 }])
  assert.equal(h.error.value, '')
  assert.equal(h.loading.value, false)
})

test('failed list removes prior rows and presents the real error', async () => {
  let fail = false
  const h = setup({ list: async () => { if (fail) throw new Error('售后列表暂不可用'); return { rows: [{ id: 1 }], total: 1 } } })
  await h.load(); fail = true; await h.load()
  assert.deepEqual(h.rows.value, [])
  assert.equal(h.total.value, 0)
  assert.equal(h.error.value, '售后列表暂不可用')
})

test('old detail requests cannot restore another member record', async () => {
  const first = deferred(), second = deferred()
  const h = setup({ detail: id => id === 1 ? first.promise : second.promise })
  const old = h.open(1), latest = h.open(2)
  second.resolve({ id: 2, quantity: 3 }); await latest
  first.resolve({ id: 1, quantity: 1 }); await old
  assert.equal(h.detail.value.id, 2)
  assert.equal(h.receipt.restockQuantity, 3)
})

test('receipt validation includes its reference and processing locks the current record', async () => {
  const pending = deferred()
  const h = setup({ act: () => pending.promise })
  await h.open(1)
  h.receiptRef.value = { validate: async () => false }
  await h.inspect(); assert.equal(h.actions.length, 0)
  h.receiptRef.value = { validate: async () => true }
  h.receipt.receiptReference = 'RECEIPT-1'; h.receipt.restockQuantity = 1
  const inspection = h.inspect(); await tick()
  assert.equal(h.busy.value, true)
  await h.open(2); assert.equal(h.detail.value.id, 1)
  assert.deepEqual(h.actions[0], { id: 1, action: 'inspect', data: { restockQuantity: 1, receiptReference: 'RECEIPT-1' } })
  pending.resolve({ id: 1, status: 'refund_pending' }); await inspection
  assert.equal(h.detail.value.status, 'refund_pending')
})

test('unmount discards pending action and detail results', async () => {
  const pending = deferred()
  const h = setup({ act: () => pending.promise })
  await h.open(1)
  const processing = h.act('inspect', {})
  h.dispose(); pending.resolve({ id: 1, status: 'received' }); await processing
  assert.equal(h.detail.value.status, 'returning')
  assert.deepEqual(h.messages, [])
})
