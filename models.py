"""Data models for the meeting management service."""

from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import List, Optional


@dataclass
class ActionItem:
    description: str
    owner: str = ""
    deadline: str = ""
    priority: str = "medium"  # high / medium / low


@dataclass
class CollaborationScenario:
    title: str
    description: str
    benefits: List[str] = field(default_factory=list)
    next_steps: List[str] = field(default_factory=list)
    feasibility: str = "medium"  # high / medium / low


@dataclass
class MeetingAnalysis:
    meeting_id: str
    date: str
    company: str
    attendees: List[str]
    key_topics: List[str]
    summary: str
    action_items: List[ActionItem]
    collaboration_scenarios: List[CollaborationScenario]
    sentiment: str  # positive / neutral / negative
    follow_up_required: bool
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "MeetingAnalysis":
        data = dict(data)
        data["action_items"] = [ActionItem(**ai) for ai in data.get("action_items", [])]
        data["collaboration_scenarios"] = [
            CollaborationScenario(**cs) for cs in data.get("collaboration_scenarios", [])
        ]
        return cls(**data)
