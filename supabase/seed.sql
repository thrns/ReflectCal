-- Generated from research/scripts/generate-dataset.ts with seed 20261110.
insert into public.questions
  (question_id, source_dataset, source_version, category, subject, question, choices, correct_answer, split, validation_status)
values (
  'arith-v1-001', 'reflectcal-generated-arithmetic-probability', '1.0.0',
  'arithmetic', 'Arithmetic', 'What is 17 + 28?',
  '[{"label":"A","text":"45"},{"label":"B","text":"43"},{"label":"C","text":"52"},{"label":"D","text":"46"}]'::jsonb, 'A', 'playground', 'validated'
) on conflict (question_id) do nothing;

insert into public.questions
  (question_id, source_dataset, source_version, category, subject, question, choices, correct_answer, split, validation_status)
values (
  'arith-v1-002', 'reflectcal-generated-arithmetic-probability', '1.0.0',
  'arithmetic', 'Arithmetic', 'What is 84 − 39?',
  '[{"label":"A","text":"42"},{"label":"B","text":"45"},{"label":"C","text":"53"},{"label":"D","text":"47"}]'::jsonb, 'B', 'research', 'validated'
) on conflict (question_id) do nothing;

insert into public.questions
  (question_id, source_dataset, source_version, category, subject, question, choices, correct_answer, split, validation_status)
values (
  'arith-v1-003', 'reflectcal-generated-arithmetic-probability', '1.0.0',
  'arithmetic', 'Arithmetic', 'What is 12 × 7?',
  '[{"label":"A","text":"80"},{"label":"B","text":"87"},{"label":"C","text":"93"},{"label":"D","text":"84"}]'::jsonb, 'D', 'playground', 'validated'
) on conflict (question_id) do nothing;

insert into public.questions
  (question_id, source_dataset, source_version, category, subject, question, choices, correct_answer, split, validation_status)
values (
  'arith-v1-004', 'reflectcal-generated-arithmetic-probability', '1.0.0',
  'arithmetic', 'Arithmetic', 'What is 144 ÷ 12?',
  '[{"label":"A","text":"7"},{"label":"B","text":"22"},{"label":"C","text":"12"},{"label":"D","text":"16"}]'::jsonb, 'C', 'research', 'validated'
) on conflict (question_id) do nothing;

insert into public.questions
  (question_id, source_dataset, source_version, category, subject, question, choices, correct_answer, split, validation_status)
values (
  'arith-v1-005', 'reflectcal-generated-arithmetic-probability', '1.0.0',
  'arithmetic', 'Arithmetic', 'What is 26 + 37?',
  '[{"label":"A","text":"63"},{"label":"B","text":"74"},{"label":"C","text":"57"},{"label":"D","text":"68"}]'::jsonb, 'A', 'playground', 'validated'
) on conflict (question_id) do nothing;

insert into public.questions
  (question_id, source_dataset, source_version, category, subject, question, choices, correct_answer, split, validation_status)
values (
  'arith-v1-006', 'reflectcal-generated-arithmetic-probability', '1.0.0',
  'arithmetic', 'Arithmetic', 'What is 91 − 56?',
  '[{"label":"A","text":"47"},{"label":"B","text":"28"},{"label":"C","text":"35"},{"label":"D","text":"41"}]'::jsonb, 'C', 'research', 'validated'
) on conflict (question_id) do nothing;

insert into public.questions
  (question_id, source_dataset, source_version, category, subject, question, choices, correct_answer, split, validation_status)
values (
  'arith-v1-007', 'reflectcal-generated-arithmetic-probability', '1.0.0',
  'arithmetic', 'Arithmetic', 'What is 9 × 8?',
  '[{"label":"A","text":"72"},{"label":"B","text":"85"},{"label":"C","text":"79"},{"label":"D","text":"64"}]'::jsonb, 'A', 'playground', 'validated'
) on conflict (question_id) do nothing;

insert into public.questions
  (question_id, source_dataset, source_version, category, subject, question, choices, correct_answer, split, validation_status)
values (
  'arith-v1-008', 'reflectcal-generated-arithmetic-probability', '1.0.0',
  'arithmetic', 'Arithmetic', 'What is 132 ÷ 11?',
  '[{"label":"A","text":"3"},{"label":"B","text":"26"},{"label":"C","text":"20"},{"label":"D","text":"12"}]'::jsonb, 'D', 'research', 'validated'
) on conflict (question_id) do nothing;

insert into public.questions
  (question_id, source_dataset, source_version, category, subject, question, choices, correct_answer, split, validation_status)
values (
  'prob-v1-001', 'reflectcal-generated-arithmetic-probability', '1.0.0',
  'probability', 'Probability', 'A fair six-sided die is rolled once. What is the probability of rolling an even number?',
  '[{"label":"A","text":"60%"},{"label":"B","text":"35%"},{"label":"C","text":"75%"},{"label":"D","text":"50%"}]'::jsonb, 'D', 'playground', 'validated'
) on conflict (question_id) do nothing;

insert into public.questions
  (question_id, source_dataset, source_version, category, subject, question, choices, correct_answer, split, validation_status)
values (
  'prob-v1-002', 'reflectcal-generated-arithmetic-probability', '1.0.0',
  'probability', 'Probability', 'A fair coin is tossed twice. What is the probability of getting two heads?',
  '[{"label":"A","text":"10%"},{"label":"B","text":"50%"},{"label":"C","text":"25%"},{"label":"D","text":"35%"}]'::jsonb, 'C', 'research', 'validated'
) on conflict (question_id) do nothing;

insert into public.questions
  (question_id, source_dataset, source_version, category, subject, question, choices, correct_answer, split, validation_status)
values (
  'prob-v1-003', 'reflectcal-generated-arithmetic-probability', '1.0.0',
  'probability', 'Probability', 'One card is drawn from a standard 52-card deck. What is the probability it is an ace?',
  '[{"label":"A","text":"8%"},{"label":"B","text":"18%"},{"label":"C","text":"33%"},{"label":"D","text":"0%"}]'::jsonb, 'A', 'playground', 'validated'
) on conflict (question_id) do nothing;

insert into public.questions
  (question_id, source_dataset, source_version, category, subject, question, choices, correct_answer, split, validation_status)
values (
  'prob-v1-004', 'reflectcal-generated-arithmetic-probability', '1.0.0',
  'probability', 'Probability', 'A fair six-sided die is rolled once. What is the probability of rolling a number greater than 4?',
  '[{"label":"A","text":"33%"},{"label":"B","text":"43%"},{"label":"C","text":"58%"},{"label":"D","text":"18%"}]'::jsonb, 'A', 'research', 'validated'
) on conflict (question_id) do nothing;

insert into public.questions
  (question_id, source_dataset, source_version, category, subject, question, choices, correct_answer, split, validation_status)
values (
  'prob-v1-005', 'reflectcal-generated-arithmetic-probability', '1.0.0',
  'probability', 'Probability', 'A fair coin is tossed once. What is the probability of getting tails?',
  '[{"label":"A","text":"75%"},{"label":"B","text":"35%"},{"label":"C","text":"50%"},{"label":"D","text":"60%"}]'::jsonb, 'C', 'playground', 'validated'
) on conflict (question_id) do nothing;

insert into public.questions
  (question_id, source_dataset, source_version, category, subject, question, choices, correct_answer, split, validation_status)
values (
  'prob-v1-006', 'reflectcal-generated-arithmetic-probability', '1.0.0',
  'probability', 'Probability', 'A bag contains 3 red and 2 blue balls. One ball is selected at random. What is the probability it is blue?',
  '[{"label":"A","text":"65%"},{"label":"B","text":"25%"},{"label":"C","text":"40%"},{"label":"D","text":"50%"}]'::jsonb, 'C', 'research', 'validated'
) on conflict (question_id) do nothing;

insert into public.questions
  (question_id, source_dataset, source_version, category, subject, question, choices, correct_answer, split, validation_status)
values (
  'prob-v1-007', 'reflectcal-generated-arithmetic-probability', '1.0.0',
  'probability', 'Probability', 'A fair six-sided die is rolled once. What is the probability of rolling a 1 or a 2?',
  '[{"label":"A","text":"58%"},{"label":"B","text":"43%"},{"label":"C","text":"33%"},{"label":"D","text":"18%"}]'::jsonb, 'C', 'playground', 'validated'
) on conflict (question_id) do nothing;

insert into public.questions
  (question_id, source_dataset, source_version, category, subject, question, choices, correct_answer, split, validation_status)
values (
  'prob-v1-008', 'reflectcal-generated-arithmetic-probability', '1.0.0',
  'probability', 'Probability', 'A fair coin is tossed three times. What is the probability of getting exactly three heads?',
  '[{"label":"A","text":"13%"},{"label":"B","text":"23%"},{"label":"C","text":"38%"},{"label":"D","text":"0%"}]'::jsonb, 'A', 'research', 'validated'
) on conflict (question_id) do nothing;
