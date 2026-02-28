-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     INTEGER PRIMARY KEY,
    applied_at  INTEGER NOT NULL
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,
    username     TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    pin_hash     TEXT,
    avatar       TEXT NOT NULL DEFAULT 'default',
    created_at   INTEGER NOT NULL,
    last_active  INTEGER,
    settings     TEXT NOT NULL DEFAULT '{}'
);

-- Learning sessions
CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module      TEXT NOT NULL,
    started_at  INTEGER NOT NULL,
    ended_at    INTEGER,
    duration_s  INTEGER
);

-- Exercise attempts
CREATE TABLE IF NOT EXISTS attempts (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id  TEXT NOT NULL,
    module       TEXT NOT NULL,
    language     TEXT,
    started_at   INTEGER NOT NULL,
    completed_at INTEGER,
    status       TEXT NOT NULL CHECK(status IN ('in_progress','passed','failed','skipped')),
    score        INTEGER,
    time_ms      INTEGER,
    memory_kb    INTEGER,
    code_input   TEXT,
    output       TEXT,
    error_msg    TEXT
);

-- Aggregate progress per user/module/category
CREATE TABLE IF NOT EXISTS progress (
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module       TEXT NOT NULL,
    category     TEXT NOT NULL,
    total        INTEGER NOT NULL DEFAULT 0,
    completed    INTEGER NOT NULL DEFAULT 0,
    passed       INTEGER NOT NULL DEFAULT 0,
    last_updated INTEGER NOT NULL,
    PRIMARY KEY (user_id, module, category)
);

-- Earned achievements
CREATE TABLE IF NOT EXISTS achievements (
    user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    earned_at      INTEGER NOT NULL,
    PRIMARY KEY (user_id, achievement_id)
);

-- Analytics event log (append-only)
CREATE TABLE IF NOT EXISTS events (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    event_type   TEXT NOT NULL,
    payload      TEXT,
    occurred_at  INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attempts_user    ON attempts(user_id, module, status);
CREATE INDEX IF NOT EXISTS idx_events_user      ON events(user_id, event_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_progress_user    ON progress(user_id, module);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id, started_at);
