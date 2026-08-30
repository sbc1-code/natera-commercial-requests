import test from 'node:test'
import assert from 'node:assert/strict'
import { approveRequest, editRequest, executeRequest, handoffText, initialState, missingFields, reviewRequest, status } from './workflow.ts'
const at = '2026-08-30T22:00:00.000Z'
const next = '2026-08-30T22:01:00.000Z'

test('a request cannot execute without review and explicit approval', () => {
  const r = initialState()[0]
  assert.deepEqual(executeRequest(r, at), r)
  assert.deepEqual(approveRequest(r, at), r)
  const reviewed = reviewRequest(r, at)
  assert.deepEqual(executeRequest(reviewed, at), reviewed)
  const approved = approveRequest(reviewed, at)
  assert.equal(status(approved), 'Approved')
  const done = executeRequest(approved, next)
  assert.equal(status(done), 'Complete')
  assert.equal(done.handoff?.id, 'CR-104-r1')
  assert.equal(done.actions.filter(a => a.status === 'complete').length, 3)
})
test('missing information blocks review, approval, and execution', () => {
  const r = initialState()[1]
  assert.deepEqual(missingFields(r), ['Audience', 'Due date'])
  assert.deepEqual(reviewRequest(r, at), r)
  assert.deepEqual(approveRequest(r, at), r)
  assert.deepEqual(executeRequest(r, at), r)
  const fixed = editRequest(r, {...r.fields, audience:'Healthcare professionals', dueDate:'2026-09-18'}, at)
  assert.equal(missingFields(fixed).length, 0)
  assert.equal(status(executeRequest(approveRequest(reviewRequest(fixed, at), at), next)), 'Complete')
})
test('changing approved inputs invalidates approval and prior outputs', () => {
  const r = initialState()[0]
  const done = executeRequest(approveRequest(reviewRequest(r, at), at), at)
  const changed = editRequest(done, {...done.fields, region:'East'}, next)
  assert.equal(changed.revision, 2)
  assert.equal(changed.approvedRevision, null)
  assert.equal(changed.reviewedRevision, null)
  assert.equal(changed.handoff, null)
  assert.ok(changed.actions.every(a => a.status === 'pending'))
  assert.deepEqual(executeRequest(changed, next), changed)
  assert.match(changed.events.at(-1)!.detail, /approval invalidated/)
  const redone = executeRequest(approveRequest(reviewRequest(changed, next), next), next)
  assert.equal(redone.handoff?.id, 'CR-104-r2')
  assert.equal(redone.handoff?.region, 'East')
})
test('saving unchanged inputs does not invalidate a valid approval', () => {
  const r = initialState()[0]
  const approved = approveRequest(reviewRequest(r, at), at)
  assert.deepEqual(editRequest(approved, {...approved.fields}, next), approved)
})
test('a failed queue write is retried without repeating completed actions', () => {
  const r = initialState()[2]
  const first = executeRequest(approveRequest(reviewRequest(r, at), at), at)
  assert.equal(status(first), 'Needs retry')
  assert.equal(first.handoff, null)
  assert.deepEqual(first.actions.map(a => a.status), ['complete','complete','failed'])
  const retried = executeRequest(first, next)
  assert.equal(status(retried), 'Complete')
  assert.deepEqual(retried.actions.map(a => a.attempts), [1,1,2])
  assert.equal(retried.events.filter(e => e.kind === 'Handoff ready').length, 1)
  assert.equal(retried.events.filter(e => e.kind === 'Action completed').length, 3)
})
test('duplicate execution and approval are no-ops', () => {
  const r = initialState()[0]
  const approved = approveRequest(reviewRequest(r, at), at)
  assert.deepEqual(approveRequest(approved, next), approved)
  const done = executeRequest(approved, at)
  assert.deepEqual(executeRequest(done, next), done)
})
test('exports contain approved inputs, source links, and an ordered audit', () => {
  const r = initialState()[0]
  assert.equal(handoffText(r), '')
  const done = executeRequest(approveRequest(reviewRequest(r, at), at), next)
  const exported = handoffText(done)
  assert.match(exported, /CR-104-r1/)
  assert.match(exported, /Jordan Lee/)
  assert.match(exported, /no live AI or external integration/)
  assert.match(exported, /https:\/\/www.natera.com\/resource-library/)
  assert.deepEqual(done.events.map(e => e.sequence), [1,2,3,4,5,6,7])
  assert.equal(done.events[0].kind, 'Proposal reviewed')
  assert.equal(done.events[1].kind, 'Human approval')
  assert.equal(done.events[6].kind, 'Handoff ready')
})
test('reset recreates independent clean state and transitions do not mutate input', () => {
  const before = initialState()
  const snapshot = structuredClone(before)
  executeRequest(approveRequest(reviewRequest(before[0], at), at), next)
  assert.deepEqual(before, snapshot)
  const reset = initialState()
  assert.deepEqual(reset, snapshot)
  reset[0].fields.title = 'Changed'
  assert.equal(before[0].fields.title, 'Provider education session')
  assert.equal(reset[0].original.title, 'Provider education session')
})
test('whitespace-only required inputs cannot bypass validation', () => {
  const r = initialState()[0]
  const changed = editRequest(r, {...r.fields,owner:'   '}, at)
  assert.deepEqual(missingFields(changed), ['Owner'])
  assert.equal(status(changed), 'Needs information')
})
