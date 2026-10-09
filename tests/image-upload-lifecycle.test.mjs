import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { computed, effectScope, reactive, ref, watch } from 'vue'
import { parse } from '@vue/compiler-sfc'

const source = readFileSync(new URL('../src/views/business/components/BusinessImageUpload.vue', import.meta.url), 'utf8')
const script = parse(source).descriptor.scriptSetup.content.replace(/^import .*$/gm, '')
// Run the real component's Element Plus hooks with Vue reactivity and delayed
// transport callbacks. No backend or MinIO request is made by these tests.
function setup(counter = ref(0)) {
  const props = reactive({ active: true, disabled: false, modelValue: '/original.png', contextKey: 1 })
  const events = [], messages = [], cleanup = []
  const scope = effectScope()
  const component = scope.run(() => new Function('computed', 'ref', 'watch', 'onBeforeUnmount', 'defineProps', 'defineEmits', 'ElMessage', 'getToken', 'mediaUrl', 'pendingImageUploads',
    script.replace('import.meta.env.VITE_APP_BASE_API', "'/test-api'") + '\nreturn { beforeUpload, uploaded, failed, uploader, uploading };'
  )(computed, ref, watch, fn => cleanup.push(fn), () => props, () => (...args) => events.push(args),
    { error: text => messages.push(text), success: text => messages.push(text) }, () => '', v => v, counter))
  let aborts = 0
  component.uploader.value = { abort: () => { aborts++ } }
  return { ...component, props, events, messages, counter, get aborts() { return aborts }, dispose() { cleanup.forEach(fn => fn()); scope.stop() } }
}
const file = uid => ({ uid, name: 'picture.png', type: 'image/png', size: 100 })
const success = { code: 200, url: '/uploaded.png' }

test('closing a form discards its delayed success and failure callbacks', () => {
  const h = setup(), first = file(1)
  assert.equal(h.beforeUpload(first), true)
  h.props.active = false
  assert.equal(h.counter.value, 0)
  assert.equal(h.aborts, 1)
  h.uploaded(success, first)
  h.failed(new Error('late'), first)
  assert.deepEqual(h.events, [])
  assert.deepEqual(h.messages, [])
  assert.equal(h.beforeUpload(file(2)), false)
  h.dispose()
})

test('a previous record cannot replace the new record image or release its upload lock', () => {
  const h = setup(), first = file(1), second = file(2)
  h.beforeUpload(first)
  h.props.contextKey = 2
  h.beforeUpload(second)
  h.uploaded(success, first)
  h.failed(new Error('old request'), first)
  assert.equal(h.counter.value, 1)
  assert.deepEqual(h.events, [])
  h.uploaded({ code: 200, url: '/second.png' }, second)
  assert.deepEqual(h.events, [['update:modelValue', '/second.png']])
  assert.equal(h.counter.value, 0)
  h.dispose()
})

test('aborting can call on-error synchronously without showing a false failure', () => {
  const h = setup(), first = file(1)
  h.beforeUpload(first)
  h.uploader.value = { abort: () => h.failed(new Error('aborted'), first) }
  h.props.active = false
  assert.deepEqual(h.messages, [])
  assert.equal(h.counter.value, 0)
  h.dispose()
})

test('unmount releases only its own global lock and ignores late completion', () => {
  const counter = ref(0), first = setup(counter), second = setup(counter)
  first.beforeUpload(file(1)); second.beforeUpload(file(2))
  first.dispose()
  first.uploaded(success, file(1))
  assert.equal(counter.value, 1)
  assert.deepEqual(first.events, [])
  second.uploaded(success, file(2))
  assert.equal(counter.value, 0)
  second.dispose()
  assert.equal(counter.value, 0)
})

test('failed upload preserves existing image and permits a successful retry', () => {
  const h = setup()
  h.beforeUpload(file(1)); h.failed(new Error('network'), file(1))
  assert.deepEqual(h.events, [])
  assert.equal(h.props.modelValue, '/original.png')
  assert.equal(h.counter.value, 0)
  assert.equal(h.beforeUpload(file(2)), true)
  h.uploaded(null, file(2))
  assert.deepEqual(h.events, [])
  assert.equal(h.counter.value, 0)
  h.beforeUpload(file(3)); h.uploaded(success, file(3))
  h.uploaded(success, file(3))
  assert.equal(h.events.length, 1)
  h.dispose()
})

test('invalid, disabled and simultaneous uploads never acquire extra locks', () => {
  const h = setup()
  h.props.disabled = true
  assert.equal(h.beforeUpload(file(1)), false)
  h.props.disabled = false
  assert.equal(h.beforeUpload({ ...file(1), size: 6 * 1024 * 1024 }), false)
  assert.equal(h.beforeUpload({ ...file(1), type: 'text/html' }), false)
  assert.equal(h.counter.value, 0)
  h.beforeUpload(file(1))
  assert.equal(h.beforeUpload(file(2)), false)
  assert.equal(h.counter.value, 1)
  h.dispose()
})
