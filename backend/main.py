from datetime import date, datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from rules import RULES

app = FastAPI(title="UDBHAV Demo API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

reports = {}
TODAY = date(2026, 10, 28)


def make_fields(scenario):
    values = {
        "name": ("Ananya Sharma", 98),
        "id_number": ("4821 7350 1964", 96),
        "date_of_birth": ("14 Aug 1996", 99),
        "address": ("28 Lake View Road, Pune, Maharashtra", 93),
        "issue_date": ("12 May 2022", 97),
        "expiry_date": ("11 May 2032", 97),
    }
    if scenario == "expired":
        values["expiry_date"] = ("11 May 2024", 96)
    if scenario == "edited":
        values["id_number"] = ("4821 7350 1964", 71)
    if scenario == "incomplete":
        values["address"] = ("", 18)
        values["issue_date"] = ("", 0)

    fields = []
    for key, label in [
        ("name", "Full name"), ("id_number", "ID number"),
        ("date_of_birth", "Date of birth"), ("address", "Address"),
        ("issue_date", "Issue date"), ("expiry_date", "Expiry date"),
    ]:
        value, confidence = values[key]
        status = "fail" if not value else "review" if confidence < 80 else "pass"
        note = "Field could not be read reliably." if status == "review" else "Required evidence is missing." if status == "fail" else ""
        fields.append({"key": key, "label": label, "value": value, "confidence": confidence, "status": status, "note": note})
    return fields


def get_report(report_id):
    report = reports.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Review report not found")
    return report


@app.get("/health")
def health():
    return {"status": "ok", "mode": "simulated demo"}


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    filename = Path(file.filename or "application.pdf").name
    extension = Path(filename).suffix.lower()
    if extension not in {".pdf", ".png", ".jpg", ".jpeg"}:
        raise HTTPException(status_code=415, detail="Upload a PDF, PNG or JPG document")
    content = await file.read(10 * 1024 * 1024 + 1)
    if not content or len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File must be non-empty and no larger than 10 MB")

    lowered = filename.lower()
    scenario = next((name for name in ("expired", "edited", "duplicate", "incomplete") if name in lowered), "sample")
    report_id = uuid4().hex[:12].upper()
    fields = make_fields(scenario)
    reports[report_id] = {
        "report_id": report_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "scenario": scenario,
        "risk_score": 8,
        "needs_human_review": False,
        "summary": "All simulated checks are within expected parameters.",
        "extraction": {"filename": filename, "fields": fields},
        "authentication": {"checks": [], "flags": []},
        "checks": [],
        "audit_log": [{"event": "Document received", "detail": "File accepted for simulated review.", "time": "Just now"}],
    }
    return {"report_id": report_id, "extraction": reports[report_id]["extraction"]}


@app.post("/authenticate")
def authenticate(payload: dict):
    report = get_report(payload.get("report_id", ""))
    scenario = report["scenario"]
    outcomes = {
        "cross_document": ("pass", "Name and date of birth match the simulated application record."),
        "digital_signature": ("pass", "Issuer signature matches the sample verification profile."),
        "duplicate_record": ("pass", "No matching record in the simulated duplicate register."),
        "document_integrity": ("pass", "No alteration indicators in the sample document profile."),
    }
    flags = []
    if scenario == "duplicate":
        outcomes["duplicate_record"] = ("fail", "Matching identity number found in another active application.")
    if scenario == "edited":
        outcomes["digital_signature"] = ("review", "Signature could not be verified against the simulated issuer profile.")
        outcomes["document_integrity"] = ("fail", "A changed text region was detected near the ID number.")
        flags.append("suspicious_edit")
    if scenario == "incomplete":
        outcomes["cross_document"] = ("review", "Insufficient readable fields to compare application evidence.")
    checks = [{"key": key, "label": label, "status": outcomes[key][0], "detail": outcomes[key][1], "weight": 35 if key == "duplicate_record" else 32 if key == "document_integrity" else 10 if outcomes[key][0] == "review" else 0} for key, label in [
        ("cross_document", "Cross-document consistency"), ("digital_signature", "QR / digital signature"),
        ("duplicate_record", "Duplicate register"), ("document_integrity", "Document integrity"),
    ]]
    report["authentication"] = {"checks": checks, "flags": flags}
    report["audit_log"].append({"event": "Authentication simulated", "detail": "Consistency, issuer signal, duplicates and integrity reviewed.", "time": "Just now"})
    return {"report_id": report["report_id"], "authentication": report["authentication"]}


def parse_date(value):
    for pattern in ("%d %b %Y", "%d %B %Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, pattern).date()
        except ValueError:
            continue
    return None


@app.post("/verify")
def verify(payload: dict):
    report = get_report(payload.get("report_id", ""))
    fields = {field["key"]: field for field in report["extraction"]["fields"]}
    values = {key: item["value"] for key, item in fields.items()}
    dob = parse_date(values.get("date_of_birth", ""))
    expiry = parse_date(values.get("expiry_date", ""))
    issue = parse_date(values.get("issue_date", ""))
    outcomes = {}
    for rule in RULES:
        key = rule["key"]
        if key == "required_fields":
            missing = [fields[field]["label"] for field in rule["fields"] if not values.get(field)]
            status = "fail" if missing else "pass"
            evidence = ", ".join(missing) if missing else "All required fields extracted."
        elif key == "expiry_date":
            status = "review" if expiry is None else "fail" if expiry < TODAY else "pass"
            evidence = "Expiry date is missing or unreadable." if expiry is None else f"Expired {expiry.isoformat()}" if expiry < TODAY else f"Valid through {expiry.isoformat()}"
        elif key == "minimum_age":
            age = TODAY.year - dob.year - ((TODAY.month, TODAY.day) < (dob.month, dob.day)) if dob else None
            status = "review" if age is None else "fail" if age < 18 else "pass"
            evidence = "Date of birth is missing or unreadable." if age is None else f"Applicant age: {age} years"
        else:
            status = "review" if not issue or not expiry else "fail" if issue >= expiry else "pass"
            evidence = "Issue or expiry date is missing or unreadable." if not issue or not expiry else f"{issue.isoformat()} precedes {expiry.isoformat()}" if issue < expiry else "Issue date is not before expiry date."
        outcomes[key] = {"key": key, "label": rule["label"], "status": status, "detail": rule["description"], "evidence": evidence, "weight": rule["weight"]}

    checks = list(outcomes.values())
    checks.extend(check for check in report["authentication"]["checks"] if check["status"] != "pass")
    score = min(100, 8 + sum(item["weight"] for item in checks if item["status"] == "fail") + sum(10 for item in checks if item["status"] == "review"))
    needs_review = score >= 30 or any(item["status"] == "review" for item in checks)
    report["checks"] = checks
    report["risk_score"] = score
    report["needs_human_review"] = needs_review
    report["summary"] = "One or more checks failed or need clarification; review the cited evidence before making a decision." if needs_review else "All simulated checks are within expected parameters. No high-risk or uncertain signals were detected."
    report["audit_log"].append({"event": "Compliance rules applied", "detail": f"{len(checks)} outcomes recorded; risk score {score}/100.", "time": "Just now"})
    return {"report_id": report["report_id"], "risk_score": score, "needs_human_review": needs_review, "checks": checks}


@app.get("/report/{report_id}")
def read_report(report_id: str):
    report = get_report(report_id)
    if not report["checks"]:
        raise HTTPException(status_code=409, detail="Run authentication and verification first")
    return report