-- Table rebuilds must not cascade: with foreign keys on, SQLite performs
-- an implicit cascading delete when the old table is dropped.
PRAGMA foreign_keys=OFF;
CREATE TABLE children_new (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  age INTEGER NOT NULL CHECK(age BETWEEN 6 AND 11),
  grade INTEGER NOT NULL CHECK(grade BETWEEN 1 AND 5),
  goal TEXT NOT NULL,
  subjects TEXT NOT NULL DEFAULT '["Math"]',
  diagnostic_complete INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
INSERT INTO children_new
  SELECT
    id,
    parent_id,
    nickname,
    MIN(11, MAX(6, age)),
    MIN(5, MAX(1, grade)),
    goal,
    '["Math"]',
    diagnostic_complete,
    created_at
  FROM children;
DROP TABLE children;
ALTER TABLE children_new RENAME TO children;
CREATE INDEX IF NOT EXISTS children_parent ON children(parent_id);
PRAGMA foreign_keys=ON;
