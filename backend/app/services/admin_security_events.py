"""Minimal security-event audit: allowlisted event names, no credentials or request body."""
from __future__ import annotations
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session

EVENT_TYPES = frozenset({'admin_login_success', 'admin_login_failed', 'admin_logout',
                         'account_activated', 'account_deactivated'})

def append_security_event(db: Session, *, event_type: str, actor_username: str,
                          result: str, target_role: str | None = None,
                          target_username: str | None = None) -> None:
    """Insert in *caller transaction*. Caller must commit or rollback.

    No password, token, request payload, raw IP, or free-form reason is accepted.
    """
    if event_type not in EVENT_TYPES or result not in ('success', 'failure'):
        raise ValueError('Unsupported audit event')
    if not isinstance(actor_username, str) or not 1 <= len(actor_username) <= 80:
        raise ValueError('Invalid actor name')
    if target_role is not None and target_role not in ('student', 'lecturer', 'admin'):
        raise ValueError('Invalid target role')
    if target_username is not None and not 1 <= len(target_username) <= 80:
        raise ValueError('Invalid target name')
    db.execute(text("""
        INSERT INTO auth.demo_admin_security_events
          (event_type, actor_username, result, target_role, target_username)
        VALUES (:type, :actor, :result, :role, :target)
    """), {'type': event_type, 'actor': actor_username, 'result': result,
           'role': target_role, 'target': target_username})


def read_security_events(db: Session, *, limit: int = 50, before_id: int | None = None,
                         event_type: str | None = None) -> dict:
    """Stable keyset pagination; hard limit enforced by API and service."""
    if not 1 <= limit <= 100:
        raise ValueError('Invalid page size')
    if before_id is not None and before_id < 1:
        raise ValueError('Invalid event cursor')
    if event_type is not None and event_type not in EVENT_TYPES:
        raise ValueError('Unknown event type')
    filters = []
    params: dict[str, object] = {'limit': limit + 1}
    if before_id is not None:
        filters.append('event_id < :before_id')
        params['before_id'] = before_id
    if event_type is not None:
        filters.append('event_type = :event_type')
        params['event_type'] = event_type
    where = ('WHERE ' + ' AND '.join(filters)) if filters else ''
    rows = db.execute(text(f"""
        SELECT event_id, event_type, actor_username, result, target_role,
               target_username, occurred_at
        FROM auth.demo_admin_security_events {where}
        ORDER BY event_id DESC LIMIT :limit
    """), params).mappings().all()
    has_more = len(rows) > limit
    page = rows[:limit]
    return {'items': [{**dict(row), 'occurred_at': row['occurred_at'].isoformat()}
                      for row in page],
            'next_before_id': int(page[-1]['event_id']) if page and has_more else None,
            'has_more': has_more}
