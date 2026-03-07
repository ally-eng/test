"""JSON file-based persistence layer, one file per company.

Data directory priority (highest to lowest):
  1. Explicit path passed via set_data_dir() (set by --data-dir CLI flag)
  2. MEETING_MANAGER_DATA_DIR environment variable
  3. ~/.meeting-manager  (default, local-only)

Point all team members at the same shared folder (Dropbox / OneDrive / etc.)
to collaborate without any additional infrastructure.
"""

import json
import os
from pathlib import Path
from typing import List

from models import MeetingAnalysis

_DEFAULT_DATA_DIR = Path.home() / ".meeting-manager"
_data_dir: Path | None = None  # overridden by set_data_dir()


def get_data_dir() -> Path:
    if _data_dir is not None:
        return _data_dir
    env = os.environ.get("MEETING_MANAGER_DATA_DIR")
    return Path(env) if env else _DEFAULT_DATA_DIR


def set_data_dir(path: str) -> None:
    """Override the data directory (called once from main() when --data-dir is given)."""
    global _data_dir
    _data_dir = Path(path)


def _company_file(company: str) -> Path:
    safe = company.replace("/", "_").replace("\\", "_").replace(":", "-")
    return get_data_dir() / f"{safe}.json"


def _load(company: str) -> List[dict]:
    path = _company_file(company)
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _save(company: str, meetings: List[dict]) -> None:
    get_data_dir().mkdir(parents=True, exist_ok=True)
    with open(_company_file(company), "w", encoding="utf-8") as f:
        json.dump(meetings, f, ensure_ascii=False, indent=2)


def save_meeting(meeting: MeetingAnalysis) -> None:
    meetings = _load(meeting.company)
    # Replace if same meeting_id already exists (idempotent re-save)
    meetings = [m for m in meetings if m.get("meeting_id") != meeting.meeting_id]
    meetings.append(meeting.to_dict())
    _save(meeting.company, meetings)
    print(f"✓ 저장 완료: {meeting.company} [{meeting.date}] #{meeting.meeting_id}")
    print(f"  경로: {_company_file(meeting.company)}")


def get_company_meetings(company: str) -> List[MeetingAnalysis]:
    return [MeetingAnalysis.from_dict(d) for d in _load(company)]


def list_companies() -> List[str]:
    d = get_data_dir()
    if not d.exists():
        return []
    return sorted(p.stem for p in d.glob("*.json"))


def get_all_meetings() -> dict[str, List[MeetingAnalysis]]:
    return {company: get_company_meetings(company) for company in list_companies()}
