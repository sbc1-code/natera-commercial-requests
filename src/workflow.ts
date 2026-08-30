export type RequestFields = { title: string; audience: string; region: string; dueDate: string; owner: string }
export type ActionState = 'pending' | 'complete' | 'failed'
export type Event = { sequence: number; at: string; revision: number; kind: string; detail: string }
export type Action = { id: string; label: string; status: ActionState; attempts: number }
export type RequestState = {
  id: string; scenario: 'complete' | 'missing' | 'retry'; description: string; original: RequestFields;
  fields: RequestFields; revision: number; reviewedRevision: number | null; approvedRevision: number | null;
  actions: Action[]; events: Event[]; handoff: null | { id: string; owner: string; title: string; audience: string; region: string; dueDate: string; sources: string[] };
}
export const resources = [
  { title: 'Clinician resource library', url: 'https://www.natera.com/resource-library/?type=Clinician', note: 'Public resource discovery. A reviewer determines suitability.' },
  { title: 'Oncology overview', url: 'https://www.natera.com/oncology/', note: 'Official public information. No medical claims are generated here.' },
]
export const exampleProposal = {
  summary: 'Prepare a public-resource handoff for the field team, with an accountable owner and a clear due date.',
  rationale: 'This is a resource-coordination request. Keep clinical interpretation outside this workflow, resolve missing details first, and require a person to review the proposed handoff.',
  boundary: 'Create a local demo record only. Do not send messages, change a CRM, or make clinical recommendations.',
}
const newActions = (): Action[] => [
  { id: 'resources', label: 'Assemble public resource references', status: 'pending', attempts: 0 },
  { id: 'brief', label: 'Prepare the reviewed handoff', status: 'pending', attempts: 0 },
  { id: 'queue', label: 'Add to the local handoff queue', status: 'pending', attempts: 0 },
]
const demo = [
  { id: 'CR-104', scenario: 'complete' as const, description: 'A field representative needs a public-resource pack for an upcoming provider education session.', fields: { title: 'Provider education session', audience: 'Healthcare professionals', region: 'West', dueDate: '2026-09-17', owner: 'Jordan Lee · Field marketing' } },
  { id: 'CR-105', scenario: 'missing' as const, description: 'A follow-up resource request has an owner but no audience or due date. Resolve the missing details before approving it.', fields: { title: 'Follow-up resource request', audience: '', region: 'Central', dueDate: '', owner: 'Alex Morgan · Field marketing' } },
  { id: 'CR-106', scenario: 'retry' as const, description: 'An event-resource handoff is ready, but its first queue attempt will fail. Retry only that action, keeping completed work intact.', fields: { title: 'Regional event resource pack', audience: 'Healthcare professionals', region: 'East', dueDate: '2026-09-24', owner: 'Taylor Chen · Field marketing' } },
]
export function initialState(): RequestState[] {
  return demo.map(d => ({ ...structuredClone(d), original: structuredClone(d.fields), revision: 1, reviewedRevision: null, approvedRevision: null, actions: newActions(), events: [], handoff: null }))
}
export function missingFields(r: RequestState): string[] {
  const missing: string[] = []
  for (const [key, label] of [['title','Request title'], ['audience','Audience'], ['region','Region'], ['dueDate','Due date'], ['owner','Owner']] as const) {
    if (!r.fields[key].trim()) missing.push(label)
  }
  if (r.fields.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(r.fields.dueDate)) missing.push('Valid due date')
  return missing
}
export function status(r: RequestState): string {
  if (missingFields(r).length) return 'Needs information'
  if (r.actions.every(a => a.status === 'complete')) return 'Complete'
  if (r.actions.some(a => a.status === 'failed')) return 'Needs retry'
  if (r.approvedRevision === r.revision) return 'Approved'
  return 'Ready for review'
}
function event(r: RequestState, at: string, kind: string, detail: string) {
  r.events.push({ sequence: r.events.length + 1, at, revision: r.revision, kind, detail })
}
export function editRequest(input: RequestState, fields: RequestFields, at: string): RequestState {
  const r = structuredClone(input)
  if (JSON.stringify(r.fields) === JSON.stringify(fields)) return r
  const wasApproved = r.approvedRevision !== null
  r.fields = Object.fromEntries(Object.entries(fields).map(([k,v]) => [k,v.trim()])) as RequestFields
  r.revision += 1
  r.reviewedRevision = null; r.approvedRevision = null; r.actions = newActions(); r.handoff = null
  event(r, at, 'Request updated', 'Saved revision ' + r.revision + '. ' + (wasApproved ? 'Previous approval invalidated. ' : '') + 'Review and approval are required for the new revision.')
  return r
}
export function reviewRequest(input: RequestState, at: string): RequestState {
  const r = structuredClone(input)
  if (missingFields(r).length || r.reviewedRevision === r.revision) return r
  r.reviewedRevision = r.revision
  event(r, at, 'Proposal reviewed', 'The viewer reviewed the example proposal, public references, and local-only action boundary.')
  return r
}
export function approveRequest(input: RequestState, at: string): RequestState {
  const r = structuredClone(input)
  if (missingFields(r).length || r.reviewedRevision !== r.revision || r.approvedRevision === r.revision) return r
  r.approvedRevision = r.revision
  event(r, at, 'Human approval', 'Viewer approved revision ' + r.revision + ' for the three stated local demo actions. This is a simulation, not organizational approval.')
  return r
}
export function executeRequest(input: RequestState, at: string): RequestState {
  const r = structuredClone(input)
  if (missingFields(r).length || r.approvedRevision !== r.revision || r.actions.every(a => a.status === 'complete')) return r
  event(r, at, 'Run started', 'Executing unfinished actions only. No external systems are contacted.')
  for (const action of r.actions) {
    if (action.status === 'complete') continue
    action.attempts += 1
    if (action.id === 'queue' && r.scenario === 'retry' && action.attempts === 1) {
      action.status = 'failed'
      event(r, at, 'Simulated failure', 'The local queue adapter rejected its first attempt by design. The two completed actions are preserved; retry is safe.')
      break
    }
    action.status = 'complete'
    event(r, at, 'Action completed', action.label + ' (attempt ' + action.attempts + ').')
    if (action.id === 'queue') {
      r.handoff = { id: r.id + '-r' + r.revision, ...r.fields, sources: resources.map(s => s.url) }
    }
  }
  if (r.handoff) event(r, at, 'Handoff ready', 'Created one local handoff record: ' + r.handoff.id + '. Nothing was sent.')
  return r
}
export function handoffText(r: RequestState): string {
  if (!r.handoff || status(r) !== 'Complete') return ''
  return [
    '# Commercial request handoff',
    'Independent Natera application concept. Synthetic data. Controlled replay; no live AI or external integration.',
    '', 'Record: ' + r.handoff.id, 'Request: ' + r.handoff.title, 'Owner: ' + r.handoff.owner,
    'Audience: ' + r.handoff.audience, 'Region: ' + r.handoff.region, 'Due: ' + r.handoff.dueDate,
    '', '## Reviewed scope', exampleProposal.summary, exampleProposal.boundary,
    '', '## Public references', ...resources.map(s => '- ' + s.title + ': ' + s.url),
    '', '## Audit trail', ...r.events.map(e => e.sequence + '. ' + e.at + ' | r' + e.revision + ' | ' + e.kind + ' | ' + e.detail),
    '', 'These are local scenario events, not customer outcomes, production AI evaluations, or proof of company approval.',
  ].join('\n')
}
