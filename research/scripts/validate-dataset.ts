import { readFile } from "node:fs/promises";
import { validateDataset } from "../../src/lib/experiments/types";

const contents = await readFile("research/datasets/fixtures.v1.json", "utf8");
const parsed = JSON.parse(contents) as { questions: unknown[] };
const errors = validateDataset(parsed.questions as never[]);
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${parsed.questions.length} fixture questions.`);
}
