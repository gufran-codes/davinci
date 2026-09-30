-- Future Supabase/Postgres projection of migrations/007_curriculum_architecture.sql.
-- Apply only after the existing users/children/concepts/teaching_strategies
-- tables have been ported. The running MVP continues to use SQLite.

CREATE TABLE IF NOT EXISTS curriculum_subjects (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  runtime_subject text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO curriculum_subjects(id,name,runtime_subject) VALUES
  ('math','Mathematics','Math'),
  ('ela','English Language Arts','English'),
  ('science','Science','Science'),
  ('social-studies','Social Studies','Social Studies')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS curriculum_sources (
  id text PRIMARY KEY,
  name text NOT NULL,
  framework text,
  source_url text NOT NULL,
  source_version text,
  source_year integer,
  license_name text,
  license_url text,
  usage_rights text NOT NULL CHECK (usage_rights IN ('public_domain','open_license','permission_granted','internal_original','reference_only')),
  attribution text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS curriculum_releases (
  id text PRIMARY KEY,
  version text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('draft','reviewed','approved','retired')),
  notes text NOT NULL DEFAULT '',
  source_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE TABLE IF NOT EXISTS curriculum_courses (
  id text PRIMARY KEY,
  subject_id text NOT NULL REFERENCES curriculum_subjects(id),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  recommended_grade_min integer NOT NULL CHECK (recommended_grade_min BETWEEN 1 AND 10),
  recommended_grade_max integer NOT NULL CHECK (recommended_grade_max BETWEEN recommended_grade_min AND 10),
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS curriculum_domains (
  id text PRIMARY KEY,
  subject_id text NOT NULL REFERENCES curriculum_subjects(id),
  course_id text REFERENCES curriculum_courses(id),
  code text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS curriculum_domain_scope
  ON curriculum_domains(subject_id,COALESCE(course_id,''),code);

CREATE TABLE IF NOT EXISTS curriculum_topics (
  id text PRIMARY KEY,
  domain_id text NOT NULL REFERENCES curriculum_domains(id),
  code text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  sequence integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(domain_id,code)
);

ALTER TABLE concepts ADD COLUMN IF NOT EXISTS course_id text REFERENCES curriculum_courses(id);
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS domain_id text REFERENCES curriculum_domains(id);
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS topic_id text REFERENCES curriculum_topics(id);
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS recommended_grade_min integer CHECK (recommended_grade_min BETWEEN 1 AND 10);
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS recommended_grade_max integer CHECK (recommended_grade_max BETWEEN 1 AND 10);
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS curriculum_status text NOT NULL DEFAULT 'draft' CHECK (curriculum_status IN ('draft','reviewed','approved'));
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS curriculum_version text NOT NULL DEFAULT 'legacy-v1';
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS source_id text REFERENCES curriculum_sources(id);
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS updated_at timestamptz;

ALTER TABLE misconceptions ADD COLUMN IF NOT EXISTS source_id text REFERENCES curriculum_sources(id);
ALTER TABLE misconceptions ADD COLUMN IF NOT EXISTS curriculum_status text NOT NULL DEFAULT 'draft' CHECK (curriculum_status IN ('draft','reviewed','approved'));
ALTER TABLE misconceptions ADD COLUMN IF NOT EXISTS curriculum_version text NOT NULL DEFAULT 'legacy-v1';
ALTER TABLE misconceptions ADD COLUMN IF NOT EXISTS updated_at timestamptz;

CREATE TABLE IF NOT EXISTS curriculum_learning_objectives (
  id text PRIMARY KEY,
  skill_id text NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  objective text NOT NULL,
  sequence integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','approved')),
  source_id text REFERENCES curriculum_sources(id),
  UNIQUE(skill_id,sequence)
);

CREATE TABLE IF NOT EXISTS curriculum_standards (
  id text PRIMARY KEY,
  framework text NOT NULL,
  standard_code text,
  statement text,
  source_id text NOT NULL REFERENCES curriculum_sources(id),
  version text,
  UNIQUE(framework,standard_code,source_id,version)
);

CREATE TABLE IF NOT EXISTS curriculum_standard_mappings (
  skill_id text NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  standard_id text REFERENCES curriculum_standards(id),
  framework text NOT NULL,
  reference_label text NOT NULL,
  source_id text NOT NULL REFERENCES curriculum_sources(id),
  alignment text NOT NULL CHECK (alignment IN ('introduced','supporting','assessed','reference_only','pending_review')),
  notes text NOT NULL DEFAULT '',
  PRIMARY KEY(skill_id,framework,reference_label,source_id)
);

CREATE TABLE IF NOT EXISTS curriculum_skill_strategies (
  skill_id text NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  strategy_id text NOT NULL REFERENCES teaching_strategies(id),
  priority integer NOT NULL DEFAULT 0,
  rationale text NOT NULL DEFAULT '',
  PRIMARY KEY(skill_id,strategy_id)
);

CREATE TABLE IF NOT EXISTS curriculum_assessment_requirements (
  skill_id text PRIMARY KEY REFERENCES concepts(id) ON DELETE CASCADE,
  diagnostic_required boolean NOT NULL DEFAULT true,
  practice_required boolean NOT NULL DEFAULT true,
  mastery_required boolean NOT NULL DEFAULT true,
  mastery_threshold numeric NOT NULL DEFAULT 0.75 CHECK (mastery_threshold BETWEEN 0 AND 1),
  minimum_independent_attempts integer NOT NULL DEFAULT 2 CHECK (minimum_independent_attempts BETWEEN 1 AND 20),
  transfer_required boolean NOT NULL DEFAULT true,
  rubric jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS curriculum_import_runs (
  id uuid PRIMARY KEY,
  release_id text REFERENCES curriculum_releases(id),
  source_file text NOT NULL,
  source_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('validating','validated','imported','failed')),
  record_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS student_course_enrollments (
  child_id text NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES curriculum_courses(id),
  grade_at_enrollment integer NOT NULL CHECK (grade_at_enrollment BETWEEN 1 AND 10),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','paused')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY(child_id,course_id)
);

-- RLS policies belong with the future Supabase auth adapter. Enabling RLS
-- before that adapter exists would make server access fail unpredictably.
