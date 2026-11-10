import { generateFixtureDataset, FIXTURE_SEED } from "../../src/lib/experiments/dataset/generator";
import { writeFile } from "node:fs/promises";

const questions = generateFixtureDataset();
await writeFile("research/datasets/fixtures.v1.json", `${JSON.stringify({ seed: FIXTURE_SEED, questions }, null, 2)}\n`);

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

const inserts = questions.map((question) => `insert into public.questions
  (question_id, source_dataset, source_version, category, subject, question, choices, correct_answer, split, validation_status)
values (
  ${sqlString(question.questionId)}, ${sqlString(question.sourceDataset)}, ${sqlString(question.sourceVersion)},
  ${sqlString(question.category)}, ${sqlString(question.subject)}, ${sqlString(question.question)},
  ${sqlString(JSON.stringify(question.choices))}::jsonb, ${sqlString(question.correctAnswer)}, ${sqlString(question.split)}, ${sqlString(question.validationStatus)}
) on conflict (question_id) do nothing;`).join("\n\n");

await writeFile("supabase/seed.sql", `-- Generated from research/scripts/generate-dataset.ts with seed ${FIXTURE_SEED}.\n${inserts}\n`);
console.log(`Generated ${questions.length} validated questions (seed ${FIXTURE_SEED}).`);
