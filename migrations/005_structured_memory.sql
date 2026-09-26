CREATE TABLE IF NOT EXISTS learner_strengths (
  child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES concepts(id),
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(child_id,skill_id)
);

CREATE TABLE IF NOT EXISTS recent_learning_memory (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES concepts(id),
  kind TEXT NOT NULL CHECK(kind IN ('assessment','misconception','remediation','strategy','summary')),
  summary TEXT NOT NULL,
  evidence TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS recent_learning_child
  ON recent_learning_memory(child_id,created_at DESC);
