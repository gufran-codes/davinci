ALTER TABLE concepts ADD COLUMN subject TEXT NOT NULL DEFAULT 'Math';
ALTER TABLE teaching_strategy_evidence ADD COLUMN subject TEXT NOT NULL DEFAULT '';
CREATE TABLE teaching_strategy_evidence_new (
  child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  strategy_id TEXT NOT NULL REFERENCES teaching_strategies(id),
  subject TEXT NOT NULL DEFAULT '',
  domain TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(child_id,strategy_id,subject,domain)
);
INSERT INTO teaching_strategy_evidence_new
  SELECT child_id,strategy_id,subject,domain,data,updated_at
  FROM teaching_strategy_evidence;
DROP TABLE teaching_strategy_evidence;
ALTER TABLE teaching_strategy_evidence_new RENAME TO teaching_strategy_evidence;
UPDATE teaching_strategy_evidence SET subject='Math' WHERE subject='';
UPDATE concepts SET subject='Math' WHERE subject='';
