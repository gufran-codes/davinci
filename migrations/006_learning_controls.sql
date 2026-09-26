CREATE TABLE IF NOT EXISTS learning_controls (
 child_id TEXT PRIMARY KEY REFERENCES children(id) ON DELETE CASCADE,
 policy TEXT NOT NULL DEFAULT 'after_attempts' CHECK(policy IN ('immediate','after_attempts','disabled')),
 minimum_attempts INTEGER NOT NULL DEFAULT 3 CHECK(minimum_attempts BETWEEN 1 AND 5)
);
CREATE TABLE IF NOT EXISTS student_boards (
 session_id TEXT PRIMARY KEY REFERENCES learning_sessions(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL DEFAULT 0,
 data TEXT NOT NULL
);
