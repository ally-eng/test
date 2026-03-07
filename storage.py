"""JSON file-based persistence layer, one file per company."""

import json
from pathlib import Path
from typing import List

from models import MeetingAnalysis

DATA_DIR = Path.home() / ".meeting-manager"


def _company_file(company: str) -> Path:
    safe = company.replace("/", "_").replace("\\", "_").replace(":", "-")
    return DATA_DIR / f"{safe}.json"


def _load(company: str) -> List[dict]:
    path = _company_file(company)
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _save(company: str, meetings: List[dict]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(_company_file(company), "w", encoding="utf-8") as f:
        json.dump(meetings, f, ensure_ascii=False, indent=2)


def save_meeting(meeting: MeetingAnalysis) -> None:
    meetings = _load(meeting.company)
    # Replace if same meeting_id already exists (idempotent re-save)
    meetings = [m for m in meetings if m.get("meeting_id") != meeting.meeting_id]
    meetings.append(meeting.to_dict())
    _save(meeting.company, meetings)
    print(f"✓ 저장 완료: {meeting.company} [{meeting.date}] #{meeting.meeting_id}")


def get_company_meetings(company: str) -> List[MeetingAnalysis]:
    return [MeetingAnalysis.from_dict(d) for d in _load(company)]


def list_companies() -> List[str]:
    if not DATA_DIR.exists():
        return []
    return sorted(p.stem for p in DATA_DIR.glob("*.json"))


def get_all_meetings() -> dict[str, List[MeetingAnalysis]]:
    return {company: get_company_meetings(company) for company in list_companies()}
