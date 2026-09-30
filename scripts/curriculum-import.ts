import { readFileSync } from "node:fs";
import path from "node:path";
import {
  importCurriculumPackage,
  validateCurriculumPackage,
} from "../src/server/curriculum-import";
import { concepts } from "../src/lib/curriculum";

const [file, mode = "--dry-run"] = process.argv.slice(2);
if (!file)
  throw new Error(
    "Usage: npm run curriculum:import -- PATH [--dry-run|--apply]",
  );
const filename = path.resolve(file);
const input: unknown = JSON.parse(readFileSync(filename, "utf8"));
if (mode === "--apply") {
  const result = importCurriculumPackage(
    input,
    path.relative(process.cwd(), filename),
  );
  console.log(JSON.stringify(result, null, 2));
} else if (mode === "--dry-run") {
  const known = new Map(concepts.map((skill) => [skill.id, skill.subject]));
  const result = validateCurriculumPackage(input, known);
  if (result.errors.length) throw new Error(result.errors.join("\n"));
  console.log(
    JSON.stringify(
      {
        valid: true,
        release: result.package.release,
        counts: {
          sources: result.package.sources.length,
          courses: result.package.courses.length,
          skills: result.package.skills.length,
        },
        warnings: result.warnings,
      },
      null,
      2,
    ),
  );
} else throw new Error("Mode must be --dry-run or --apply");
