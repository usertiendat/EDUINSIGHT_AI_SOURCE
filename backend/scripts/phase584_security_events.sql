-- Additive, access-controlled demo security audit. Never store credentials, token hashes or request bodies.
CREATE TABLE IF NOT EXISTS auth.demo_admin_security_events (
    event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_type varchar(48) NOT NULL CHECK (event_type IN (
        'admin_login_success','admin_login_failed','admin_logout',
        'account_activated','account_deactivated')),
    actor_username varchar(80) NOT NULL,
    result varchar(10) NOT NULL CHECK (result IN ('success','failure')),
    target_role varchar(20) NULL CHECK (target_role IN ('student','lecturer','admin')),
    target_username varchar(80) NULL,
    occurred_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_demo_admin_security_events_id
    ON auth.demo_admin_security_events(event_id DESC);
CREATE INDEX IF NOT EXISTS idx_demo_admin_security_events_type_id
    ON auth.demo_admin_security_events(event_type, event_id DESC);
