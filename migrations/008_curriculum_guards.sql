ALTER TABLE misconceptions ADD COLUMN source_id TEXT REFERENCES curriculum_sources(id);
ALTER TABLE misconceptions ADD COLUMN curriculum_status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE misconceptions ADD COLUMN curriculum_version TEXT NOT NULL DEFAULT 'legacy-v1';
ALTER TABLE misconceptions ADD COLUMN updated_at TEXT;

CREATE TRIGGER IF NOT EXISTS concepts_curriculum_validate_insert
BEFORE INSERT ON concepts
WHEN NEW.curriculum_status NOT IN ('draft','reviewed','approved')
  OR (NEW.recommended_grade_min IS NOT NULL AND (NEW.recommended_grade_min < 1 OR NEW.recommended_grade_min > 10))
  OR (NEW.recommended_grade_max IS NOT NULL AND (NEW.recommended_grade_max < 1 OR NEW.recommended_grade_max > 10))
  OR (NEW.recommended_grade_min IS NOT NULL AND NEW.recommended_grade_max IS NOT NULL AND NEW.recommended_grade_min > NEW.recommended_grade_max)
BEGIN
  SELECT RAISE(ABORT,'Invalid curriculum skill metadata');
END;

CREATE TRIGGER IF NOT EXISTS concepts_curriculum_validate_update
BEFORE UPDATE OF curriculum_status,recommended_grade_min,recommended_grade_max ON concepts
WHEN NEW.curriculum_status NOT IN ('draft','reviewed','approved')
  OR (NEW.recommended_grade_min IS NOT NULL AND (NEW.recommended_grade_min < 1 OR NEW.recommended_grade_min > 10))
  OR (NEW.recommended_grade_max IS NOT NULL AND (NEW.recommended_grade_max < 1 OR NEW.recommended_grade_max > 10))
  OR (NEW.recommended_grade_min IS NOT NULL AND NEW.recommended_grade_max IS NOT NULL AND NEW.recommended_grade_min > NEW.recommended_grade_max)
BEGIN
  SELECT RAISE(ABORT,'Invalid curriculum skill metadata');
END;

CREATE TRIGGER IF NOT EXISTS curriculum_content_grade_range_insert
BEFORE INSERT ON curriculum_content
WHEN NEW.recommended_grade_min IS NOT NULL
  AND NEW.recommended_grade_max IS NOT NULL
  AND NEW.recommended_grade_min > NEW.recommended_grade_max
BEGIN
  SELECT RAISE(ABORT,'Invalid curriculum content grade range');
END;

CREATE TRIGGER IF NOT EXISTS curriculum_content_grade_range_update
BEFORE UPDATE OF recommended_grade_min,recommended_grade_max ON curriculum_content
WHEN NEW.recommended_grade_min IS NOT NULL
  AND NEW.recommended_grade_max IS NOT NULL
  AND NEW.recommended_grade_min > NEW.recommended_grade_max
BEGIN
  SELECT RAISE(ABORT,'Invalid curriculum content grade range');
END;
