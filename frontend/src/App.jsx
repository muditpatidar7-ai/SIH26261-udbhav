import { useRef, useState } from 'react'
import './App.css'

const API = 'http://127.0.0.1:8000'
const steps = ['Upload & extract', 'Authenticate', 'Verify compliance']

function Status({ status, children }) {
  return <span className={`status status-${status}`}>{children}</span>
}

function App() {
  const fileInput = useRef(null)
  const [file, setFile] = useState(null)
  const [report, setReport] = useState(null)
  const [view, setView] = useState('workspace')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [activeStep, setActiveStep] = useState(-1)

  async function readResponse(response) {
    if (!response.ok) throw new Error('The review service returned an error. Check that the backend is running.')
    return response.json()
  }

  async function reviewFile(selectedFile) {
    setFile(selectedFile)
    setError('')
    setBusy(true)
    setReport(null)
    setView('workspace')
    setActiveStep(-1)
    try {
      const uploadData = new FormData()
      uploadData.append('file', selectedFile)
      const extraction = await fetch(`${API}/upload`, { method: 'POST', body: uploadData }).then(readResponse)
      setActiveStep(0)
      const authentication = await fetch(`${API}/authenticate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: extraction.report_id }),
      }).then(readResponse)
      setActiveStep(1)
      const verification = await fetch(`${API}/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: authentication.report_id }),
      }).then(readResponse)
      setActiveStep(2)
      const finalReport = await fetch(`${API}/report/${verification.report_id}`).then(readResponse)
      setReport(finalReport)
    } catch (requestError) {
      setError(requestError.message || 'The review service could not be reached. Start the FastAPI server and try again.')
    } finally {
      setBusy(false)
    }
  }

  function useSample(scenario = 'sample') {
    const names = {
      sample: 'sample-identity.pdf', expired: 'expired-permit.pdf',
      edited: 'edited-identity.pdf', duplicate: 'duplicate-record.pdf', incomplete: 'incomplete-form.pdf',
    }
    reviewFile(new File([`UDBHAV simulated ${scenario} document`], names[scenario], { type: 'application/pdf' }))
  }

  function handleDrop(event) {
    event.preventDefault()
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) reviewFile(dropped)
  }

  const extraction = report?.extraction
  const authentication = report?.authentication
  const checks = report?.checks || []
  const flaggedFields = extraction?.fields?.filter((field) => field.status !== 'pass').length || 0

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#workspace" onClick={() => setView('workspace')} aria-label="UDBHAV workspace">
          <span className="brand-mark">U</span>
          <span><strong>UDBHAV</strong><small>DOCUMENT REVIEW</small></span>
        </a>
        <div className="side-label">WORKSPACE</div>
        <button className={`side-link ${view === 'workspace' ? 'selected' : ''}`} onClick={() => setView('workspace')}>
          <span className="side-glyph">▤</span> Application review
        </button>
        <div className="side-label recent-label">RECENT REVIEWS</div>
        {report ? <button className="recent-item" onClick={() => setView('report')}><i />{file?.name || 'Document review'}<small>Just now</small></button> : <p className="empty-recent">No recent reviews</p>}
        <div className="sidebar-bottom">
          <div className="privacy-mark">LOCAL DEMO ENVIRONMENT</div>
          <p>Simulated results only.<br />No documents are retained.</p>
        </div>
      </aside>

      <main className="main-area" id="workspace">
        <header className="topbar">
          <div className="breadcrumb">Applications <span>/</span> <b>{view === 'report' ? 'Review report' : 'New review'}</b></div>
          <div className="top-meta"><span className="environment"><i /> DEMO ENVIRONMENT</span><span className="avatar">555</span></div>
        </header>

        <div className="content-wrap">
          <div className="page-heading">
            <div>
              <p className="eyebrow">APPLICATION VALIDATION <span>·</span> SIH26261</p>
              <h1>{view === 'report' ? 'Review report' : 'Document review'}</h1>
              <p className="heading-sub">{view === 'report' ? 'Evidence, authentication signals and rule outcomes for this application.' : 'Extract application details, authenticate evidence and check regulatory requirements.'}</p>
            </div>
            {report && <button className="quiet-button" onClick={() => { setView('workspace'); setFile(null); setReport(null); setActiveStep(-1) }}>＋ <span>New review</span></button>}
          </div>

          <nav className="stepper" aria-label="Review steps">
            {steps.map((step, index) => <div className={`step ${activeStep >= index ? 'step-done' : ''} ${busy && activeStep + 1 === index ? 'step-current' : ''}`} key={step}>
              <span className="step-number">{activeStep > index ? '✓' : `0${index + 1}`}</span><span>{step}</span>
            </div>)}
          </nav>

          {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}

          {view === 'workspace' && !report && <section className="intake-grid">
            <div className="intake-main">
              <div className="section-title"><div><span className="section-index">01</span><h2>Upload application evidence</h2></div><span className="file-spec">PDF, PNG or JPG <b>·</b> up to 10 MB</span></div>
              <div className={`dropzone ${file ? 'has-file' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
                <input ref={fileInput} type="file" accept=".pdf,.png,.jpg,.jpeg,image/*,application/pdf" onChange={(event) => event.target.files?.[0] && reviewFile(event.target.files[0])} />
                <div className="upload-symbol">↑</div>
                <strong>{file ? file.name : 'Drop a document to begin'}</strong>
                <span>{file ? 'Selected for review' : 'or browse files from this device'}</span>
                <button className="outline-button" onClick={() => fileInput.current?.click()} disabled={busy}>{file ? 'Choose another file' : 'Browse documents'}</button>
              </div>
              <div className="sample-strip"><span className="sample-icon">i</span><span><b>Need a starting point?</b><small>Run a simulated identity document through the full workflow.</small></span><button onClick={() => useSample('sample')} disabled={busy}>Try sample document <span>→</span></button></div>
              <div className="scenario-links"><span>OTHER SCENARIOS</span><button onClick={() => useSample('expired')} disabled={busy}>Expired</button><button onClick={() => useSample('edited')} disabled={busy}>Edited</button><button onClick={() => useSample('duplicate')} disabled={busy}>Duplicate</button><button onClick={() => useSample('incomplete')} disabled={busy}>Incomplete</button></div>
            </div>
            <aside className="intake-aside">
              <div className="aside-heading"><span>REVIEW SEQUENCE</span><span className="sequence-mark">3 checks</span></div>
              {steps.map((step, index) => <div className="sequence-row" key={step}><span className="sequence-number">0{index + 1}</span><div><b>{step}</b><small>{['Key fields and confidence indicators', 'Cross-document and authenticity signals', 'Required fields, dates and age limits'][index]}</small></div></div>)}
              <div className="aside-note"><span className="note-line" />Results are simulated for demonstration. No OCR, identity provider or external registry is queried.</div>
            </aside>
          </section>}

          {busy && <section className="processing-panel" aria-live="polite"><div className="processing-mark">{activeStep < 0 ? '01' : `0${Math.min(activeStep + 2, 3)}`}</div><div><p className="eyebrow">REVIEW IN PROGRESS</p><h2>{steps[Math.min(activeStep + 1, 2)]}</h2><p>Applying simulated checks to {file?.name}…</p></div><div className="processing-track"><i /></div></section>}

          {report && <section className="report-view">
            <div className="report-toolbar"><div><span className="document-kind">APPLICATION FILE</span><strong>{report.extraction.filename}</strong></div><div className="report-id">REF <code>{report.report_id}</code></div></div>
            <div className="report-summary"><RiskGauge score={report.risk_score} /><div className="summary-copy"><p className="eyebrow">OVERALL ASSESSMENT</p><h2>{report.needs_human_review ? 'Human review recommended' : 'No material issues found'}</h2><p>{report.summary}</p><div className="summary-tags"><Status status={report.needs_human_review ? 'review' : 'pass'}>{report.needs_human_review ? 'Needs human review' : 'Automated checks passed'}</Status><span>{report.checks.filter((check) => check.status === 'pass').length} of {report.checks.length} checks passed</span></div></div></div>
            <div className="report-columns">
              <div className="report-primary">
                <div className="panel-heading"><div><span className="section-index">02</span><h2>Extracted fields</h2></div><span className="count-label">{flaggedFields ? `${flaggedFields} field${flaggedFields === 1 ? '' : 's'} need review` : 'All fields readable'}</span></div>
                <div className="document-and-fields">
                  <div className={`document-preview ${authentication?.flags?.includes('suspicious_edit') ? 'preview-edited' : ''}`}>
                    <div className="preview-head"><span>GOVERNMENT OF INDIA</span><span className="preview-seal">INDIA</span></div><div className="preview-title">IDENTITY CERTIFICATE</div><div className="preview-rule" />
                    <div className="preview-person"><span className="photo-placeholder">PHOTO</span><div><b>{fieldValue(extraction, 'name')}</b><small>IDENTITY HOLDER</small></div></div>
                    <div className="preview-data">{['id_number', 'date_of_birth', 'address'].map((key) => <div className={authentication?.flags?.includes('suspicious_edit') && key === 'id_number' ? 'highlight-region' : ''} key={key}><small>{fieldLabel(key)}</small><b>{fieldValue(extraction, key)}</b></div>)}</div>
                    <div className="preview-footer"><span>ISSUED {fieldValue(extraction, 'issue_date')}</span><span>VALID THROUGH {fieldValue(extraction, 'expiry_date')}</span></div>
                    {authentication?.flags?.includes('suspicious_edit') && <span className="edit-annotation">REGION FLAGGED</span>}
                  </div>
                  <div className="field-list">{extraction.fields.map((field) => <div className="field-row" key={field.key}><div className="field-label"><span>{field.label}</span><Status status={field.status}>{field.status === 'pass' ? 'Extracted' : field.status === 'fail' ? 'Missing' : 'Review'}</Status></div><strong className="field-value">{field.value || 'Not detected'}</strong><div className="confidence"><span>Confidence</span><div className="confidence-track"><i className={`confidence-${field.status}`} style={{ width: `${field.confidence}%` }} /></div><code>{field.confidence}%</code></div>{field.note && <small className="field-note">{field.note}</small>}</div>)}</div>
                </div>
                <div className="panel-heading auth-heading"><div><span className="section-index">03</span><h2>Authentication signals</h2></div><span className="count-label">{authentication.checks.length} signals</span></div>
                <div className="signal-table">{authentication.checks.map((check) => <div className="signal-row" key={check.key}><span className={`signal-dot signal-${check.status}`} /><div><b>{check.label}</b><small>{check.detail}</small></div><Status status={check.status}>{check.status === 'pass' ? 'Passed' : check.status === 'fail' ? 'Failed' : 'Review'}</Status></div>)}</div>
              </div>
              <aside className="report-secondary">
                <div className="compliance-panel"><div className="panel-heading compact"><div><span className="section-index">04</span><h2>Compliance rules</h2></div></div><div className="check-list">{checks.map((check) => <div className="check-item" key={check.key}><span className={`check-symbol check-${check.status}`}>{check.status === 'pass' ? '✓' : check.status === 'fail' ? '!' : '?'}</span><div><b>{check.label}</b><small>{check.detail}</small>{check.evidence && <span className="evidence">Evidence: {check.evidence}</span>}</div></div>)}</div></div>
                <div className="audit-panel"><div className="panel-heading compact"><h2>Review activity</h2><span className="live-dot" /></div><div className="audit-list">{report.audit_log.map((entry, index) => <div className="audit-entry" key={entry.event}><span className="audit-node">{index + 1}</span><div><b>{entry.event}</b><small>{entry.detail}</small><time>{entry.time}</time></div></div>)}</div></div>
                <div className="human-note"><span>!</span><p><b>{report.needs_human_review ? 'Manual decision required' : 'Automated review complete'}</b><small>{report.needs_human_review ? 'Do not rely on this simulated result as a final determination.' : 'No high-risk or uncertain signals were detected.'}</small></p></div>
              </aside>
            </div>
            {view !== 'report' && <button className="report-link" onClick={() => setView('report')}>Open full review report <span>→</span></button>}
          </section>}

          <footer className="footer"><span>UDBHAV, Smart India Hackathon 2026</span><span>Team 555_UDBHAV <b>·</b> Software <b>·</b> Smart Automation</span></footer>
        </div>
      </main>
    </div>
  )
}

function fieldValue(extraction, key) {
  return extraction?.fields?.find((field) => field.key === key)?.value || '—'
}

function fieldLabel(key) {
  return ({ id_number: 'IDENTIFICATION NUMBER', date_of_birth: 'DATE OF BIRTH', address: 'RESIDENTIAL ADDRESS' })[key]
}

function RiskGauge({ score }) {
  return <div className={`risk-gauge ${score >= 60 ? 'risk-high' : score >= 30 ? 'risk-mid' : ''}`}><div className="gauge-ring"><span>{score}<small>/100</small></span></div><span className="gauge-label">RISK SCORE</span><Status status={score >= 60 ? 'fail' : score >= 30 ? 'review' : 'pass'}>{score >= 60 ? 'High' : score >= 30 ? 'Elevated' : 'Low'}</Status></div>
}

export default App
