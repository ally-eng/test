"""Obsidian vault integration — generates markdown notes with frontmatter and wikilinks."""

from datetime import datetime
from pathlib import Path
from typing import List

from models import MeetingAnalysis

_PRIORITY_EMOJI = {"high": "🔴", "medium": "🟡", "low": "🟢"}
_FEASIBILITY_EMOJI = {"high": "✅", "medium": "🔄", "low": "⚠️"}
_SENTIMENT_LABEL = {"positive": "긍정적 😊", "neutral": "중립 😐", "negative": "부정적 😟"}


def _safe(name: str) -> str:
    """Sanitize name for use in file paths and wikilinks."""
    for ch in r'/\:*?"<>|':
        name = name.replace(ch, "_")
    return name


def export_meeting_note(vault_path: str, meeting: MeetingAnalysis) -> Path:
    """Create a single meeting note in the Obsidian vault."""
    company_dir = Path(vault_path) / "Meetings" / _safe(meeting.company)
    company_dir.mkdir(parents=True, exist_ok=True)

    filepath = company_dir / f"{meeting.date}_{meeting.meeting_id}.md"

    # ── Frontmatter ─────────────────────────────────────────────────────────
    frontmatter = (
        f"---\n"
        f"tags:\n"
        f"  - meeting\n"
        f"  - company/{_safe(meeting.company)}\n"
        f'company: "{meeting.company}"\n'
        f"date: {meeting.date}\n"
        f"meeting_id: {meeting.meeting_id}\n"
        f"sentiment: {meeting.sentiment}\n"
        f"follow_up: {str(meeting.follow_up_required).lower()}\n"
        f"---\n"
    )

    # ── Attendees & Topics ───────────────────────────────────────────────────
    attendees = "\n".join(f"- {a}" for a in meeting.attendees)
    topics = "\n".join(f"- {t}" for t in meeting.key_topics)

    # ── Action Items ─────────────────────────────────────────────────────────
    action_lines = []
    for ai in meeting.action_items:
        emoji = _PRIORITY_EMOJI.get(ai.priority, "⚪")
        owner = f" (@{ai.owner})" if ai.owner else ""
        deadline = f" — {ai.deadline}" if ai.deadline else ""
        action_lines.append(f"- [ ] {emoji} {ai.description}{owner}{deadline}")
    action_items_md = "\n".join(action_lines) if action_lines else "_없음_"

    # ── Collaboration Scenarios ──────────────────────────────────────────────
    scenario_blocks = []
    for s in meeting.collaboration_scenarios:
        emoji = _FEASIBILITY_EMOJI.get(s.feasibility, "❓")
        block = f"### {emoji} {s.title}\n\n{s.description}\n"
        if s.benefits:
            block += "\n**기대 효과:**\n" + "\n".join(f"- {b}" for b in s.benefits) + "\n"
        if s.next_steps:
            block += "\n**다음 단계:**\n" + "\n".join(f"1. {n}" for n in s.next_steps) + "\n"
        scenario_blocks.append(block)
    scenarios_md = "\n".join(scenario_blocks) if scenario_blocks else "_없음_"

    sentiment_label = _SENTIMENT_LABEL.get(meeting.sentiment, meeting.sentiment)
    follow_up_label = "필요 ⚡" if meeting.follow_up_required else "불필요"

    content = (
        f"{frontmatter}\n"
        f"# {meeting.company} 미팅 — {meeting.date}\n\n"
        f"> **분위기:** {sentiment_label} | **후속 조치:** {follow_up_label}\n\n"
        f"## 참석자\n{attendees}\n\n"
        f"## 주요 토픽\n{topics}\n\n"
        f"## 미팅 요약\n{meeting.summary}\n\n"
        f"## 액션아이템\n{action_items_md}\n\n"
        f"## 협력 시나리오\n{scenarios_md}\n\n"
        f"---\n"
        f"*[[{_safe(meeting.company)}/_Overview|{meeting.company} 개요]] "
        f"| 생성: {meeting.created_at[:10]}*\n"
    )

    filepath.write_text(content, encoding="utf-8")
    return filepath


def export_company_overview(
    vault_path: str, company: str, meetings: List[MeetingAnalysis]
) -> Path:
    """Create or overwrite the company _Overview.md page."""
    company_dir = Path(vault_path) / "Meetings" / _safe(company)
    company_dir.mkdir(parents=True, exist_ok=True)
    filepath = company_dir / "_Overview.md"

    sorted_meetings = sorted(meetings, key=lambda m: m.date, reverse=True)

    # Aggregate unique scenarios and open action items
    all_action_items: list[tuple[str, object]] = []
    seen_scenarios: dict[str, object] = {}
    for m in sorted_meetings:
        for ai in m.action_items:
            all_action_items.append((m.date, ai))
        for s in m.collaboration_scenarios:
            seen_scenarios.setdefault(s.title, s)

    meeting_list = "\n".join(
        f"- [[{m.date}_{m.meeting_id}|{m.date}]] — {m.summary[:70]}…"
        for m in sorted_meetings
    )

    priority_order = {"high": 0, "medium": 1, "low": 2}
    sorted_actions = sorted(all_action_items, key=lambda x: priority_order.get(x[1].priority, 1))
    action_lines = []
    for date, ai in sorted_actions:
        emoji = _PRIORITY_EMOJI.get(ai.priority, "⚪")
        action_lines.append(f"- [ ] {emoji} [{date}] {ai.description}")
    action_items_md = "\n".join(action_lines) if action_lines else "_없음_"

    scenario_lines = [
        f"- **{title}** (실현가능성: {s.feasibility})"
        for title, s in seen_scenarios.items()
    ]
    scenarios_md = "\n".join(scenario_lines) if scenario_lines else "_없음_"

    content = (
        f"---\n"
        f"tags:\n"
        f"  - company\n"
        f"  - overview\n"
        f'company: "{company}"\n'
        f"last_updated: {datetime.now().strftime('%Y-%m-%d')}\n"
        f"total_meetings: {len(meetings)}\n"
        f"---\n\n"
        f"# {company} — 기업 개요\n\n"
        f"## 미팅 이력 ({len(meetings)}회)\n{meeting_list}\n\n"
        f"## 오픈 액션아이템\n{action_items_md}\n\n"
        f"## 협력 시나리오\n{scenarios_md}\n\n"
        f"---\n"
        f"*마지막 업데이트: {datetime.now().strftime('%Y-%m-%d %H:%M')}*\n"
    )

    filepath.write_text(content, encoding="utf-8")
    return filepath


def export_master_index(vault_path: str, all_meetings: dict[str, List[MeetingAnalysis]]) -> Path:
    """Create or overwrite the master _Index.md listing all companies."""
    meetings_dir = Path(vault_path) / "Meetings"
    meetings_dir.mkdir(parents=True, exist_ok=True)
    filepath = meetings_dir / "_Index.md"

    lines = []
    for company, meetings in sorted(all_meetings.items()):
        last = max(meetings, key=lambda m: m.date).date if meetings else "—"
        lines.append(
            f"- [[{_safe(company)}/_Overview|{company}]] "
            f"— {len(meetings)}회, 최근: {last}"
        )

    content = (
        f"---\n"
        f"tags:\n"
        f"  - index\n"
        f"  - meetings\n"
        f"last_updated: {datetime.now().strftime('%Y-%m-%d')}\n"
        f"---\n\n"
        f"# 기업 미팅 인덱스\n\n"
        f"## 기업 목록 ({len(all_meetings)}개)\n"
        + "\n".join(lines)
        + f"\n\n---\n"
        f"*마지막 업데이트: {datetime.now().strftime('%Y-%m-%d %H:%M')}*\n"
    )

    filepath.write_text(content, encoding="utf-8")
    return filepath
