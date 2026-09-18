-- 0005_add_rate_limits.sql
CREATE TABLE IF NOT EXISTS rate_limits (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    identifier TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    reset_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_action_identifier ON rate_limits(action, identifier);
