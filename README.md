# UDBHAV

**AI-Powered Application Validation, Document Authentication and Regulatory Compliance Verification**

Smart India Hackathon 2026 · Problem ID **SIH26261** · Smart Automation · Software · Team **555_UDBHAV**

UDBHAV is a hackathon demo of a document review workflow. It presents mock extraction, simulated authenticity signals, a rule checklist and a review report. It does not perform OCR, use machine learning, query a registry or make real identity decisions.

## Screenshots

_Add screenshots of the intake workspace and completed review report here._

## Workflow

1. **Upload and extract:** Submit a PDF, PNG or JPG, or use the included sample. The demo returns six mock fields with confidence values and field-level flags.
2. **Authenticate:** Simulate cross-document consistency, QR/digital-signature verification, duplicate detection and document-integrity checks.
3. **Verify compliance:** Apply required-field, expiry-date, minimum-age and issue/expiry-order rules. Failures cite their evidence.

The final report shows a 0–100 risk score, individual outcomes, an audit timeline and whether human review is recommended. Try scenario buttons for expired, edited, duplicate and incomplete examples.

## Run locally

Requirements: Node.js 20+ and Python 3.10+.

Backend, in one terminal:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Frontend, in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL (usually `http://localhost:5173`). The API is available at `http://127.0.0.1:8000`; its interactive schema is at `/docs`.

## Technology

- Frontend: React and Vite, plain CSS
- Backend: Python and FastAPI
- Storage: process-local in-memory dictionary; reports are lost when the server restarts

## Security and limitations

This is a non-production prototype. Do not upload real personal documents. The backend reads only enough bytes to validate that a file is non-empty and under 10 MB; extraction results are simulated from the filename and no document content is persisted. Mock values are illustrative and must not be used to approve or reject an application.

For a production system, role-based access, encryption in transit and at rest, tamper-evident audit logs, and minimum data retention are **planned** requirements. They are not implemented in this demo.