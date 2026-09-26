CREATE TABLE conversation_turns (
 id TEXT PRIMARY KEY,
 session_id TEXT NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
 child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
 request_id TEXT NOT NULL,
 student_transcript TEXT NOT NULL,
 intent TEXT NOT NULL,
 generated_tutor_text TEXT NOT NULL,
 spoken_tutor_text TEXT NOT NULL DEFAULT '',
 interrupted INTEGER NOT NULL DEFAULT 0,
 data TEXT NOT NULL,
 created_at TEXT NOT NULL,
 UNIQUE(session_id,request_id)
);
CREATE INDEX conversation_session ON conversation_turns(session_id,created_at);
CREATE TABLE curriculum_content (
 skill_id TEXT PRIMARY KEY REFERENCES concepts(id),
 grade INTEGER NOT NULL CHECK(grade BETWEEN 1 AND 5),
 status TEXT NOT NULL CHECK(status IN ('draft','reviewed','approved')),
 version INTEGER NOT NULL DEFAULT 1,
 data TEXT NOT NULL,
 reviewed_by TEXT,
 reviewed_at TEXT
);
CREATE INDEX curriculum_grade ON curriculum_content(grade,status);
