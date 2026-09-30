PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS curriculum_subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  runtime_subject TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO curriculum_subjects(id,name,runtime_subject,created_at) VALUES
  ('math','Mathematics','Math',CURRENT_TIMESTAMP),
  ('ela','English Language Arts','English',CURRENT_TIMESTAMP),
  ('science','Science','Science',CURRENT_TIMESTAMP),
  ('social-studies','Social Studies','Social Studies',CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS curriculum_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  framework TEXT,
  source_url TEXT NOT NULL,
  source_version TEXT,
  source_year INTEGER,
  license_name TEXT,
  license_url TEXT,
  usage_rights TEXT NOT NULL CHECK(usage_rights IN ('public_domain','open_license','permission_granted','internal_original','reference_only')),
  attribution TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS curriculum_releases (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK(status IN ('draft','reviewed','approved','retired')),
  notes TEXT NOT NULL DEFAULT '',
  source_hash TEXT,
  created_at TEXT NOT NULL,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS curriculum_courses (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES curriculum_subjects(id),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  recommended_grade_min INTEGER NOT NULL CHECK(recommended_grade_min BETWEEN 1 AND 10),
  recommended_grade_max INTEGER NOT NULL CHECK(recommended_grade_max BETWEEN recommended_grade_min AND 10),
  description TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO curriculum_courses(id,subject_id,code,name,recommended_grade_min,recommended_grade_max,description,created_at,updated_at) VALUES
  ('algebra-1','math','ALG1','Algebra I',8,10,'Foundational secondary algebra course.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('geometry','math','GEO','Geometry',9,10,'Secondary geometry course.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('biology','science','BIO','Biology',9,10,'Secondary life science course.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('chemistry','science','CHEM','Chemistry',9,10,'Secondary physical science course.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('english-1','ela','ENG1','English I',9,9,'Grade 9 English Language Arts course.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('english-2','ela','ENG2','English II',10,10,'Grade 10 English Language Arts course.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('world-history','social-studies','WH','World History',9,10,'Secondary world history course.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('us-history','social-studies','USH','US History',9,10,'Secondary United States history course.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('civics','social-studies','CIV','Civics',9,10,'Secondary civics and government course.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS curriculum_domains (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES curriculum_subjects(id),
  course_id TEXT REFERENCES curriculum_courses(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS curriculum_domain_scope
  ON curriculum_domains(subject_id,IFNULL(course_id,''),code);

CREATE TABLE IF NOT EXISTS curriculum_topics (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES curriculum_domains(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sequence INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(domain_id,code)
);

ALTER TABLE concepts ADD COLUMN course_id TEXT REFERENCES curriculum_courses(id);
ALTER TABLE concepts ADD COLUMN domain_id TEXT REFERENCES curriculum_domains(id);
ALTER TABLE concepts ADD COLUMN topic_id TEXT REFERENCES curriculum_topics(id);
ALTER TABLE concepts ADD COLUMN recommended_grade_min INTEGER;
ALTER TABLE concepts ADD COLUMN recommended_grade_max INTEGER;
ALTER TABLE concepts ADD COLUMN curriculum_status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE concepts ADD COLUMN curriculum_version TEXT NOT NULL DEFAULT 'legacy-v1';
ALTER TABLE concepts ADD COLUMN source_id TEXT REFERENCES curriculum_sources(id);
ALTER TABLE concepts ADD COLUMN updated_at TEXT;

CREATE TABLE IF NOT EXISTS curriculum_learning_objectives (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','reviewed','approved')),
  source_id TEXT REFERENCES curriculum_sources(id),
  UNIQUE(skill_id,sequence)
);

CREATE TABLE IF NOT EXISTS curriculum_standards (
  id TEXT PRIMARY KEY,
  framework TEXT NOT NULL,
  standard_code TEXT,
  statement TEXT,
  source_id TEXT NOT NULL REFERENCES curriculum_sources(id),
  version TEXT,
  UNIQUE(framework,standard_code,source_id,version)
);

CREATE TABLE IF NOT EXISTS curriculum_standard_mappings (
  skill_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  standard_id TEXT REFERENCES curriculum_standards(id),
  framework TEXT NOT NULL,
  reference_label TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES curriculum_sources(id),
  alignment TEXT NOT NULL CHECK(alignment IN ('introduced','supporting','assessed','reference_only','pending_review')),
  notes TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(skill_id,framework,reference_label,source_id)
);

CREATE TABLE IF NOT EXISTS curriculum_skill_strategies (
  skill_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  strategy_id TEXT NOT NULL REFERENCES teaching_strategies(id),
  priority INTEGER NOT NULL DEFAULT 0,
  rationale TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(skill_id,strategy_id)
);

CREATE TABLE IF NOT EXISTS curriculum_assessment_requirements (
  skill_id TEXT PRIMARY KEY REFERENCES concepts(id) ON DELETE CASCADE,
  diagnostic_required INTEGER NOT NULL DEFAULT 1 CHECK(diagnostic_required IN (0,1)),
  practice_required INTEGER NOT NULL DEFAULT 1 CHECK(practice_required IN (0,1)),
  mastery_required INTEGER NOT NULL DEFAULT 1 CHECK(mastery_required IN (0,1)),
  mastery_threshold REAL NOT NULL DEFAULT 0.75 CHECK(mastery_threshold BETWEEN 0 AND 1),
  minimum_independent_attempts INTEGER NOT NULL DEFAULT 2 CHECK(minimum_independent_attempts BETWEEN 1 AND 20),
  transfer_required INTEGER NOT NULL DEFAULT 1 CHECK(transfer_required IN (0,1)),
  rubric TEXT NOT NULL DEFAULT '{}',
  metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS curriculum_import_runs (
  id TEXT PRIMARY KEY,
  release_id TEXT REFERENCES curriculum_releases(id),
  source_file TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('validating','validated','imported','failed')),
  record_counts TEXT NOT NULL DEFAULT '{}',
  errors TEXT NOT NULL DEFAULT '[]',
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS student_course_enrollments (
  child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES curriculum_courses(id),
  grade_at_enrollment INTEGER NOT NULL CHECK(grade_at_enrollment BETWEEN 1 AND 10),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','paused')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  PRIMARY KEY(child_id,course_id)
);

CREATE TABLE curriculum_content_new (
  skill_id TEXT PRIMARY KEY REFERENCES concepts(id),
  grade INTEGER NOT NULL CHECK(grade BETWEEN 1 AND 10),
  status TEXT NOT NULL CHECK(status IN ('draft','reviewed','approved')),
  version INTEGER NOT NULL DEFAULT 1,
  data TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TEXT,
  course_id TEXT REFERENCES curriculum_courses(id),
  source_id TEXT REFERENCES curriculum_sources(id),
  recommended_grade_min INTEGER CHECK(recommended_grade_min BETWEEN 1 AND 10),
  recommended_grade_max INTEGER CHECK(recommended_grade_max BETWEEN 1 AND 10)
);
INSERT INTO curriculum_content_new(skill_id,grade,status,version,data,reviewed_by,reviewed_at,recommended_grade_min,recommended_grade_max)
  SELECT skill_id,grade,status,version,data,reviewed_by,reviewed_at,grade,grade
  FROM curriculum_content;
DROP TABLE curriculum_content;
ALTER TABLE curriculum_content_new RENAME TO curriculum_content;
CREATE INDEX IF NOT EXISTS curriculum_grade ON curriculum_content(grade,status);
CREATE INDEX IF NOT EXISTS curriculum_course ON curriculum_content(course_id,status);

CREATE TABLE children_new (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  age INTEGER NOT NULL CHECK(age BETWEEN 6 AND 16),
  grade INTEGER NOT NULL CHECK(grade BETWEEN 1 AND 10),
  goal TEXT NOT NULL,
  subjects TEXT NOT NULL DEFAULT '["Math"]',
  diagnostic_complete INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
INSERT INTO children_new
  SELECT id,parent_id,nickname,age,grade,goal,subjects,diagnostic_complete,created_at
  FROM children;
DROP TABLE children;
ALTER TABLE children_new RENAME TO children;
CREATE INDEX IF NOT EXISTS children_parent ON children(parent_id);

PRAGMA foreign_keys=ON;
