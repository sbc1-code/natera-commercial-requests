import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowDownToLine, ArrowRight, Check, CheckCheck, ChevronRight, CircleHelp, Clock3, FileCheck2, FileText, FlaskConical, Info, LayoutList, ListChecks, LockKeyhole, RotateCcw, ShieldCheck, Sparkles, TriangleAlert, X } from 'lucide-react'
import { approveRequest, editRequest, exampleProposal, executeRequest, handoffText, initialState, missingFields, resources, reviewRequest, status } from './workflow.ts'
import type { RequestFields, RequestState } from './workflow.ts'

function Badge({ label }: { label: string }) {
  const tone = label === 'Complete' ? 'green' : label === 'Approved' ? 'blue' : label.startsWith('Needs') ? 'amber' : 'neutral'
  return <span className={'badge ' + tone}><span />{label}</span>
}
function dateLabel(value: string) {
  return value ? new Date(value + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not provided'
}

export default function App() {
  const [requests, setRequests] = useState(initialState)
  const [selected, setSelected] = useState('CR-104')
  const [page, setPage] = useState<'requests' | 'about'>('requests')
  const [tab, setTab] = useState<'workflow' | 'activity'>('workflow')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<RequestFields>(requests[0].fields)
  const [acknowledged, setAcknowledged] = useState(false)
  const [notice, setNotice] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const r = requests.find(item => item.id === selected)!
  const missing = missingFields(r)
  const currentStatus = status(r)
  const approved = r.approvedRevision === r.revision
  const complete = currentStatus === 'Complete'
  const failed = currentStatus === 'Needs retry'
  const completedActions = r.actions.filter(a => a.status === 'complete').length
  const totals = {
    complete: requests.filter(item => status(item) === 'Complete').length,
    attention: requests.filter(item => status(item).startsWith('Needs')).length,
    actions: requests.reduce((sum, item) => sum + item.actions.filter(a => a.status === 'complete').length, 0),
  }
  function update(fn: (input: RequestState) => RequestState) {
    setRequests(items => items.map(item => item.id === selected ? fn(item) : item))
  }
  function choose(id: string) {
    setSelected(id); setEditing(false); setAcknowledged(false); setTab('workflow'); setNotice('')
  }
  function save(e: FormEvent) {
    e.preventDefault()
    const data = new FormData(e.currentTarget as HTMLFormElement)
    const fields = Object.fromEntries(['title', 'audience', 'region', 'dueDate', 'owner'].map(key => [key, String(data.get(key) ?? '')])) as RequestFields
    update(item => editRequest(item, fields, new Date().toISOString()))
    setEditing(false); setAcknowledged(false)
    setNotice('Request saved. Review and approval are required for any changed revision.')
  }
  function approve() {
    if (!acknowledged || missing.length) return
    const now = new Date().toISOString()
    update(item => approveRequest(reviewRequest(item, now), now))
    setNotice('Revision ' + r.revision + ' approved. You can now run the three local actions.')
  }
  function run() {
    const result = executeRequest(r, new Date().toISOString())
    update(() => result)
    setNotice(status(result) === 'Complete' ? 'Handoff ready. One local record created; nothing was sent.' : 'The queue action failed as designed. Completed actions are preserved. Retry the failed action.')
  }
  function download() {
    const text = handoffText(r)
    if (!text) return
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = r.id + '-handoff.txt'; a.click(); URL.revokeObjectURL(url)
    setNotice('Handoff and audit trail downloaded. This export contains synthetic scenario data only.')
  }
  function reset() {
    setRequests(initialState()); setSelected('CR-104'); setEditing(false); setAcknowledged(false); setTab('workflow'); setResetOpen(false); setPage('requests'); setNotice('Demo reset. All local requests and activity are back to their initial state.')
  }
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="wordmark">natera<span>®</span></div>
      <div className="concept-label">INDEPENDENT CONCEPT</div>
      <div className="sidebar-rule" />
      <div className="nav-caption">WORKSPACE</div>
      <nav aria-label="Main navigation">
        <button className={page === 'requests' ? 'nav-link active' : 'nav-link'} onClick={() => setPage('requests')} aria-current={page === 'requests' ? 'page' : undefined}><LayoutList size={18} />Commercial requests<span className="nav-count">3</span></button>
        <button className={page === 'about' ? 'nav-link active' : 'nav-link'} onClick={() => setPage('about')} aria-current={page === 'about' ? 'page' : undefined}><CircleHelp size={18} />About this proof</button>
      </nav>
      <div className="sidebar-note"><ShieldCheck size={23} /><strong>Designed for review.</strong><p>A person approves the scope before any local action runs.</p></div>
      <div className="sidebar-footer"><span className="avatar">SB</span><div><strong>Sebastian Becerra</strong><span>Application proof · Aug 2026</span></div></div>
    </aside>
    <main>
      <header className="topbar"><span>Commercial operations <ChevronRight size={14} /> <strong>{page === 'requests' ? 'Request workspace' : 'About this proof'}</strong></span><button className="text-button" onClick={() => setResetOpen(true)}><RotateCcw size={15} />Reset demo</button></header>
      <div className="main-content">
        <div className="page-heading"><div><div className="eyebrow">FROM REQUEST TO REVIEWED HANDOFF</div><h1>{page === 'requests' ? 'Commercial requests' : 'A small, inspectable workflow.'}</h1><p>{page === 'requests' ? 'Clear inputs. Human approval. A handoff you can trace.' : 'Built to show the decisions and controls behind useful automation.'}</p></div><span className="workspace-tag"><FlaskConical size={15} />Synthetic workspace</span></div>
        {page === 'about' ? <section className="about-grid">
          <article className="panel about-main"><div className="section-kicker">THE BUSINESS PROBLEM</div><h2>Good requests should not get lost between teams.</h2><p>This fictional commercial workflow turns an unstructured resource request into a scoped, owned handoff. The intended value is less coordination ambiguity and more dependable follow-through. No savings or business outcomes have been measured.</p><h3>What actually works</h3><p>Input validation, versioned approval, local action execution, retry handling, a duplicate-safe handoff record, audit events, and text export run in your browser.</p><h3>What is a replay</h3><p>The AI proposal is a pre-generated, AI-assisted example. It does not change through a live model call. The third scenario injects a failure on purpose. The action adapter writes to this page's in-memory demo queue, not Natera systems.</p><h3>What a production version would still need</h3><p>Authorized integrations, identity and access controls, durable storage, actual model evaluations, security and privacy review, monitoring, and validation with the people who do the work. This concept does not establish readiness for production or regulated data.</p><button className="primary" onClick={() => setPage('requests')}>Explore the workflow <ArrowRight size={16} /></button></article>
          <div className="about-side"><article className="panel"><div className="section-kicker">EVIDENCE BOUNDARY</div><h3>Independent. Synthetic. Local.</h3><p>Created by Sebastian Becerra with AI assistance for the Natera application. Not affiliated with, endorsed by, or integrated with Natera.</p><p>No patient records, medical advice, messages, credentials, model calls, analytics, or backend. Refreshing or resetting clears your changes.</p></article><article className="panel"><div className="section-kicker">PUBLIC CONTEXT</div><a className="source-link" href="https://job-boards.greenhouse.io/natera/jobs/6115022004" target="_blank" rel="noopener noreferrer">AI Solutions Engineer role <ArrowRight size={14} /></a><a className="source-link" href="https://www.natera.com/" target="_blank" rel="noopener noreferrer">Natera public website <ArrowRight size={14} /></a><p className="small">Workflow rules, people, requests, and results here are invented demonstration material, not Natera policies.</p></article></div>
        </section> : <>
          <section className="metrics" aria-label="Current demo counts">
            <div><span>Requests</span><strong>03</strong><small>Three fictional scenarios</small></div>
            <div><span>Need attention</span><strong>{String(totals.attention).padStart(2, '0')}</strong><small>Missing details or failed actions</small></div>
            <div><span>Completed handoffs</span><strong>{String(totals.complete).padStart(2, '0')}</strong><small>Records in this local demo</small></div>
            <div><span>Actions completed</span><strong>{String(totals.actions).padStart(2, '0')}<em>/ 09</em></strong><small>Current request revisions</small></div>
          </section>
          <div className="workbench">
            <section className="request-list" aria-label="Fictional requests"><div className="list-heading"><h2>Request queue</h2><span>3</span></div>{requests.map((item, i) => <button key={item.id} onClick={() => choose(item.id)} className={'request-card ' + (selected === item.id ? 'selected' : '')} aria-pressed={selected === item.id}><div className="request-id">{item.id}<span>0{i+1}</span></div><strong>{item.fields.title}</strong><span className="request-meta">{item.fields.region || 'Region needed'} · {item.fields.audience || 'Audience needed'}</span><Badge label={status(item)} /></button>)}<div className="try-note"><Sparkles size={16} /><p>Try all three: a clean handoff, missing information, and a safe retry.</p></div></section>
            <section className="detail-panel panel" aria-label="Selected request">
              <div className="detail-header"><div><div className="section-kicker">{r.id} <span>REVISION {r.revision}</span></div><h2>{r.fields.title}</h2></div><Badge label={currentStatus} /></div>
              <p className="request-description">{r.description}</p>
              <div className="stages" aria-label="Workflow stages">{['Request', 'Human review', 'Local execution', 'Handoff'].map((label, i) => <div key={label} className={(i === 0 || (i === 1 && approved) || (i === 2 && completedActions > 0) || (i === 3 && complete)) ? 'reached' : ''}><span>{(i === 0 && !missing.length) || (i === 1 && approved) || (i === 2 && complete) || (i === 3 && complete) ? <Check size={12} /> : i + 1}</span>{label}</div>)}</div>
              <div className="tabbar" role="tablist" aria-label="Request view"><button role="tab" aria-selected={tab === 'workflow'} onClick={() => setTab('workflow')} id="workflow-tab" aria-controls="workflow-panel">Workflow</button><button role="tab" aria-selected={tab === 'activity'} onClick={() => setTab('activity')} id="activity-tab" aria-controls="activity-panel">Activity <span>{r.events.length}</span></button></div>
              {tab === 'activity' ? <div className="activity-panel" role="tabpanel" id="activity-panel" aria-labelledby="activity-tab"><div className="subheading"><h3>Local audit trail</h3><span className="small">{r.events.length} events</span></div>{r.events.length ? <ol className="timeline">{r.events.map(e => <li key={e.sequence}><span className="event-marker">{e.sequence}</span><div><div className="event-heading"><strong>{e.kind}</strong><time dateTime={e.at}>{new Date(e.at).toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit',second:'2-digit'})} · r{e.revision}</time></div><p>{e.detail}</p></div></li>)}</ol> : <div className="empty-state"><Clock3 size={27} /><h3>No actions yet</h3><p>Review and approve the request to start a traceable local run.</p><button className="secondary" onClick={() => setTab('workflow')}>Return to workflow</button></div>}<p className="small">Events describe this browser session only. Resetting or refreshing clears the trail.</p></div> : <div role="tabpanel" id="workflow-panel" aria-labelledby="workflow-tab">
                <div className="input-summary"><div className="subheading"><h3><FileText size={16} />Request details</h3><button className="text-button" onClick={() => { setDraft({...r.fields}); setEditing(!editing); }}>{editing ? 'Close editor' : 'Edit request'}</button></div>
                  {editing ? <form onSubmit={save} className="edit-form"><label className="wide">Request title<input name="title" value={draft.title} maxLength={100} onChange={e => setDraft({...draft,title:e.target.value})} /></label><label>Audience<select name="audience" value={draft.audience} onChange={e => setDraft({...draft,audience:e.target.value})}><option value="">Select audience</option><option>Healthcare professionals</option><option>Field team</option></select></label><label>Region<select name="region" value={draft.region} onChange={e => setDraft({...draft,region:e.target.value})}><option value="">Select region</option><option>West</option><option>Central</option><option>East</option></select></label><label>Due date<input name="dueDate" type="date" value={draft.dueDate} onChange={e => setDraft({...draft,dueDate:e.target.value})} /></label><label>Owner<input name="owner" value={draft.owner} maxLength={100} onChange={e => setDraft({...draft,owner:e.target.value})} /></label><div className="form-footer"><p>Changes create a new revision and require fresh approval.</p><button className="primary small-button" type="submit">Save request</button></div></form> : <dl className="request-facts"><div><dt>Audience</dt><dd className={!r.fields.audience ? 'missing-text' : ''}>{r.fields.audience || 'Not provided'}</dd></div><div><dt>Due date</dt><dd className={!r.fields.dueDate ? 'missing-text' : ''}>{dateLabel(r.fields.dueDate)}</dd></div><div><dt>Owner</dt><dd>{r.fields.owner || 'Not provided'}</dd></div><div><dt>Region</dt><dd>{r.fields.region || 'Not provided'}</dd></div></dl>}
                </div>
                {!!missing.length && <div className="callout warning" role="status"><TriangleAlert size={18} /><div><strong>Resolve {missing.length} missing {missing.length === 1 ? 'detail' : 'details'} before approval</strong><p>{missing.join(' · ')}. Edit the request to continue.</p></div></div>}
                <div className="proposal"><div className="proposal-heading"><h3><Sparkles size={17} />Proposed handoff</h3><span className="replay-tag">CONTROLLED REPLAY</span></div><p>{exampleProposal.summary}</p><div className="proposal-scope"><span>REVIEWED SCOPE</span><p>{exampleProposal.rationale}</p></div><div className="resource-row">{resources.map(source => <a href={source.url} key={source.url} target="_blank" rel="noopener noreferrer"><FileText size={14} />{source.title}<ArrowRight size={13} /></a>)}</div><p className="replay-disclosure">Pre-generated AI-assisted example. No live model call. Your edits update the request and handoff fields, not this example proposal.</p></div>
                <section className="execution"><div className="subheading"><h3><ListChecks size={18} />Local action plan</h3><span className="small">{completedActions} of 3 complete</span></div><ol className="action-list">{r.actions.map((action, i) => <li key={action.id}><span className={'action-icon ' + action.status}>{action.status === 'complete' ? <Check size={14} /> : action.status === 'failed' ? <TriangleAlert size={14} /> : i + 1}</span><span>{action.label}</span><small>{action.status === 'complete' ? 'Complete' : action.status === 'failed' ? 'Retry needed' : 'Pending'}{action.attempts > 0 && ' · ' + action.attempts + (action.attempts === 1 ? ' attempt' : ' attempts')}</small></li>)}</ol></section>
                {failed && <div className="callout warning"><TriangleAlert size={18} /><div><strong>One action failed. Nothing was duplicated.</strong><p>The first queue attempt fails deliberately in this scenario. Retry executes only the unfinished action.</p></div></div>}
                {complete && <div className="handoff-result"><div className="success-icon"><CheckCheck size={24} /></div><div><h3>Handoff ready</h3><p><strong>{r.handoff?.id}</strong> · {r.fields.owner}</p><p>One record in the local demo queue. No message sent.</p></div><button className="secondary" onClick={download}><ArrowDownToLine size={16} />Export handoff</button></div>}
                <div className="approval-bar">{!approved ? <><label className="review-check"><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} disabled={!!missing.length || editing} /><span>I reviewed the request, public references, and local-only scope.</span></label><button className="primary" onClick={approve} disabled={!acknowledged || !!missing.length || editing}><ShieldCheck size={16} />Approve handoff</button></> : !complete ? <><p><ShieldCheck size={18} /><span>Revision {r.revision} approved.<small>Only the stated local actions can run.</small></span></p><button className="primary" onClick={run} disabled={editing}>{failed ? <RotateCcw size={16} /> : <ArrowRight size={16} />}{failed ? 'Retry failed action' : 'Run local workflow'}</button></> : <><p><FileCheck2 size={19} /><span>Execution complete.<small>Inspect the record and its audit trail.</small></span></p><button className="text-button" onClick={() => setTab('activity')}>View activity <ArrowRight size={15} /></button></>}</div>
              </div>}
            </section>
          </div>
        </>}
        <div className="status-notice" role="status" aria-live="polite">{notice}</div>
        <footer className="main-footer"><span><LockKeyhole size={13} />Browser-local · no data sent · refresh clears changes</span><button onClick={() => setPage('about')} className="text-button"><Info size={13} />Independent concept, not a Natera product</button></footer>
      </div>
    </main>
    {resetOpen && <div className="modal-backdrop"><div className="reset-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-title" onKeyDown={e => { if (e.key === 'Escape') setResetOpen(false); if (e.key === 'Tab') { const buttons = e.currentTarget.querySelectorAll('button'); if (e.shiftKey && e.target === buttons[0]) {e.preventDefault(); buttons[buttons.length-1].focus()} else if (!e.shiftKey && e.target === buttons[buttons.length-1]) {e.preventDefault();buttons[0].focus()} } }}><RotateCcw size={25} /><h2 id="reset-title">Reset the demo?</h2><p>This clears all edits, approvals, handoffs, and audit events in this browser session. Download any completed handoff first.</p><div><button className="secondary" autoFocus onClick={() => setResetOpen(false)}><X size={14} />Keep working</button><button className="primary" onClick={reset}>Reset all scenarios</button></div></div></div>}
  </div>
}
