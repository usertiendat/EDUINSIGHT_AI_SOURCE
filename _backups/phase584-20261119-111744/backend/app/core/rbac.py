"""Phase 5.8.3: server-authoritative, deny-by-default permission registry.

Only *authenticated* administrators may hold the named management permissions.
Student identity and lecturer class ownership continue to be enforced by their
separate, scoped authentication dependencies; never assign these admin grants
merely because a request contains a role name or a client-supplied header.
"""
from __future__ import annotations

from collections.abc import Callable
from typing import Any
from fastapi import Depends, HTTPException, status
from app.services.demo_admin import current_admin

# Permissions describe capabilities, not URLs. Adding a new permission requires
# an explicit policy update, plus the API route's dependency and security test.
ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    "student": frozenset({"student:self:read", "student:self:password"}),
    "lecturer": frozenset({"lecturer:assigned_classes:read", "lecturer:self:password"}),
    "admin": frozenset({
        "admin:profile:read", "admin:session:revoke",
        "admin:analytics:read", "admin:students:read",
        "admin:accounts:read", "admin:accounts:status_write",
        "admin:account_audit:read",
    }),
}


def has_permission(role: str, permission: str) -> bool:
    """Unknown role/permission is denied, including blank values."""
    return permission in ROLE_PERMISSIONS.get(role, frozenset())


def require_admin_permission(permission: str) -> Callable[..., dict[str, Any]]:
    """FastAPI dependency. Identity comes from verified administrator session.

    The current_admin DB query checks token digest, expiry, revocation, active
    account and server-side role. This dependency does not trust client role.
    """
    if not permission.startswith("admin:") or not has_permission("admin", permission):
        raise ValueError("Unregistered administrator permission: " + permission)

    def authorize(admin: dict[str, Any] = Depends(current_admin)) -> dict[str, Any]:
        # current_admin binds to an authenticated *admin* row in PostgreSQL.
        # Do not read role from query, body or untrusted request headers.
        if not admin.get("admin_account_id"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Không được cấp quyền quản trị")
        return admin

    authorize.__name__ = "require_" + permission.replace(":", "_")
    return authorize
