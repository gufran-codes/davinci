CREATE TABLE IF NOT EXISTS study_schedule (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK(subject IN ('Math','English','Science','Social Studies')),
  starts_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK(duration_minutes IN (10,15,20,30)),
  status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','cancelled')),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS study_schedule_child ON study_schedule(child_id,starts_at);
CREATE UNIQUE INDEX IF NOT EXISTS study_schedule_slot ON study_schedule(child_id,starts_at) WHERE status='planned';
