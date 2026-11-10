# M0 paired self-reflection protocol

- **Protocol:** `reflectcal-m0-paired-v1.0.0`
- **Direct prompt:** `direct-answer-v1.0.0`
- **Reflection prompt:** `self-reflection-v1.0.0`

## Procedure

1. Select one validated question from the playground split.
2. Send the question and options to the configured Gemini model. Ask for an answer label, confidence from 0 to 1, and a short explanation.
3. Send the same question and options with the model's prior answer, confidence, and explanation. Ask the model to reconsider independently.
4. After both valid responses are persisted, compare both labels with the independently stored correct answer.

Neither prompt includes the correct answer. The reflection prompt receives the first response to create the paired condition. Temperature is set to zero. The provider and model can remain nondeterministic; the exact prompt, prompt version, model ID, generation settings, timestamps, parsed response, and response metadata are retained.

## Measures

- Correctness is a binary comparison of selected answer to the stored key.
- Confidence change is reflected confidence minus direct confidence.
- A correction occurs when the direct answer is wrong and reflection is correct. An introduced error is the reverse transition.
- Per-response binary Brier score is `(reported confidence - correct indicator)^2`.

These measures describe a response pair. A single question does not support statistical conclusions or calibration claims.

## Failure handling

The direct result is persisted if it succeeds. If the second stage fails or is denied by quota, the run is marked partial and the key stays hidden in the public response. Invalid or refused responses do not receive correctness scores. Request reservations happen before each provider attempt; a transient provider failure can be retried once.
