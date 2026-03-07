#!/usr/bin/env python3
"""Meeting Manager — 외부 기업 미팅 관리 서비스

외부 기업과의 미팅을 기록·정리하고, 액션아이템과 협력 시나리오를 도출하며,
필요 시 제안서를 자동으로 작성합니다. Obsidian 볼트와 연동됩니다.

사용 예시:
  python main.py analyze transcript.txt --company "삼성전자"
  python main.py analyze transcript.txt --company "삼성전자" --obsidian ~/MyVault
  python main.py list
  python main.py list --company "삼성전자"
  python main.py proposal "삼성전자" --type partnership --output proposal.md
  python main.py export --vault ~/MyVault
"""

import argparse
import sys
from pathlib import Path

from analyzer import analyze_transcript, generate_proposal
from obsidian import export_company_overview, export_master_index, export_meeting_note
from storage import get_all_meetings, get_company_meetings, list_companies, save_meeting


# ── Sub-command handlers ─────────────────────────────────────────────────────


def cmd_analyze(args: argparse.Namespace) -> None:
    """Analyze a transcript file and save the result."""
    path = Path(args.transcript)
    if not path.exists():
        print(f"오류: 파일을 찾을 수 없습니다 — {path}", file=sys.stderr)
        sys.exit(1)

    transcript = path.read_text(encoding="utf-8")
    print(f"\n🔍 {args.company}와의 미팅 분석 중…")

    meeting = analyze_transcript(transcript, args.company)
    save_meeting(meeting)

    print(f"\n✅ 분석 완료")
    print(f"  날짜       : {meeting.date}")
    print(f"  참석자     : {', '.join(meeting.attendees)}")
    print(f"  주요 토픽  : {', '.join(meeting.key_topics)}")
    print(f"  액션아이템 : {len(meeting.action_items)}개")
    print(f"  협력 시나리오: {len(meeting.collaboration_scenarios)}개")
    print(f"  분위기     : {meeting.sentiment}")

    if args.obsidian:
        note = export_meeting_note(args.obsidian, meeting)
        print(f"\n📝 Obsidian 노트 생성: {note}")
        meetings = get_company_meetings(args.company)
        overview = export_company_overview(args.obsidian, args.company, meetings)
        print(f"📋 회사 개요 업데이트: {overview}")


def cmd_list(args: argparse.Namespace) -> None:
    """List meetings, optionally filtered to one company."""
    if args.company:
        meetings = get_company_meetings(args.company)
        if not meetings:
            print(f"{args.company}와의 미팅 기록이 없습니다.")
            return
        print(f"\n{args.company} 미팅 ({len(meetings)}회):")
        for m in sorted(meetings, key=lambda x: x.date, reverse=True):
            print(f"  [{m.date}] #{m.meeting_id} | {m.sentiment}")
            print(f"    {m.summary[:72]}…")
            print(f"    액션아이템 {len(m.action_items)}개 · 시나리오 {len(m.collaboration_scenarios)}개")
    else:
        companies = list_companies()
        if not companies:
            print("저장된 미팅이 없습니다.")
            return
        print(f"\n관리 중인 기업 ({len(companies)}개):")
        for company in companies:
            count = len(get_company_meetings(company))
            print(f"  {company} — {count}회 미팅")


def cmd_proposal(args: argparse.Namespace) -> None:
    """Generate a proposal document from meeting history."""
    meetings = get_company_meetings(args.company)
    if not meetings:
        print(f"오류: {args.company}와의 미팅 기록이 없습니다.", file=sys.stderr)
        sys.exit(1)

    print(f"\n📄 {args.company} 제안서 생성 ({args.type})")
    proposal = generate_proposal(args.company, meetings, args.type)

    if args.output:
        out = Path(args.output)
        out.write_text(proposal, encoding="utf-8")
        print(f"\n✅ 제안서 저장: {out}")

    if args.obsidian:
        from obsidian import _safe
        company_dir = Path(args.obsidian) / "Meetings" / _safe(args.company)
        company_dir.mkdir(parents=True, exist_ok=True)
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        proposal_path = company_dir / f"{today}_Proposal_{args.type}.md"
        header = (
            f"---\n"
            f"tags:\n  - proposal\n  - company/{_safe(args.company)}\n"
            f"type: {args.type}\ndate: {today}\n---\n\n"
        )
        proposal_path.write_text(header + proposal, encoding="utf-8")
        print(f"📝 Obsidian 제안서: {proposal_path}")


def cmd_export(args: argparse.Namespace) -> None:
    """Export all data to an Obsidian vault."""
    all_meetings = get_all_meetings()
    if not all_meetings:
        print("내보낼 미팅 데이터가 없습니다.")
        return

    vault = args.vault
    print(f"\n📦 Obsidian 볼트로 내보내기: {vault}")

    total = 0
    for company, meetings in all_meetings.items():
        for meeting in meetings:
            note = export_meeting_note(vault, meeting)
            print(f"  ✓ {note.name}")
            total += 1
        overview = export_company_overview(vault, company, meetings)
        print(f"  ✓ {company} 개요 → {overview.name}")

    index = export_master_index(vault, all_meetings)
    print(f"\n✅ 완료: {total}개 미팅, {len(all_meetings)}개 기업 → {index}")


# ── Argument parser ──────────────────────────────────────────────────────────


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="meeting-manager",
        description="외부 기업 미팅 관리 서비스 (Claude AI + Obsidian)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # analyze
    p_analyze = sub.add_parser("analyze", help="미팅 스크립트 분석 및 저장")
    p_analyze.add_argument("transcript", help="티로(tiro) 스크립트 파일 경로")
    p_analyze.add_argument("--company", "-c", required=True, help="기업명")
    p_analyze.add_argument("--obsidian", metavar="VAULT", help="Obsidian 볼트 경로")

    # list
    p_list = sub.add_parser("list", help="미팅 목록 조회")
    p_list.add_argument("--company", "-c", help="특정 기업만 조회")

    # proposal
    p_proposal = sub.add_parser("proposal", help="협력 제안서 자동 작성")
    p_proposal.add_argument("company", help="기업명")
    p_proposal.add_argument(
        "--type", "-t",
        default="partnership",
        choices=["partnership", "poc", "investment", "mou"],
        help="제안서 유형 (기본값: partnership)",
    )
    p_proposal.add_argument("--output", "-o", help="마크다운 파일로 저장할 경로")
    p_proposal.add_argument("--obsidian", metavar="VAULT", help="Obsidian 볼트 경로")

    # export
    p_export = sub.add_parser("export", help="Obsidian 볼트 전체 내보내기")
    p_export.add_argument("--vault", "-v", required=True, help="Obsidian 볼트 경로")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    handlers = {
        "analyze": cmd_analyze,
        "list": cmd_list,
        "proposal": cmd_proposal,
        "export": cmd_export,
    }
    handlers[args.command](args)


if __name__ == "__main__":
    main()
