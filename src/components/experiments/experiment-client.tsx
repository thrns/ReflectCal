"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowDown, Check, CircleHelp, LoaderCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { PublicQuestion } from "@/lib/experiments/types";

type Category = "arithmetic" | "probability";
type Reply =
  | { status: "complete"; runId: string; direct: Answer; reflection: Answer; evaluation: Evaluation }
  | { status: "partial"; runId: string; direct: Answer; failure: { code: string; message: string } }
  | { status: "quota_rejected"; runId: string; message: string }
  | { status: "failed"; runId: string; failure: { code: string; message: string } };
type Answer = { answer: string; confidence: number; explanation: string };
type Evaluation = { correctAnswer: string; directCorrect: boolean; reflectionCorrect: boolean; transition: string; confidenceChange: number; directBrier: number; reflectionBrier: number };

const categories: Array<{ value: Category; label: string }> = [
  { value: "arithmetic", label: "Arithmetic" },
  { value: "probability", label: "Probability" },
];

function percentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function delta(value: number): string {
  const points = Math.round(value * 100);
  return `${points > 0 ? "+" : ""}${points} percentage points`;
}

function transitionCopy(transition: string): string {
  const copy: Record<string, string> = {
    corrected: "Reflection corrected an initial error.",
    introduced_error: "Reflection changed a correct answer to an incorrect one.",
    remained_correct: "The answer was correct before and after reflection.",
    remained_incorrect: "The answer remained incorrect after reflection.",
  };
  return copy[transition] ?? "The two answers were compared.";
}

function OptionList({ question }: { question: PublicQuestion }) {
  return (
    <ol className="mt-5 grid gap-2 sm:grid-cols-2" aria-label="Answer options">
      {question.choices.map((choice) => (
        <li key={choice.label} className="flex min-h-12 items-start gap-3 rounded-lg bg-paper px-3.5 py-3 text-sm leading-5 text-copy">
          <span className="grid size-6 shrink-0 place-items-center border border-rule bg-paper-card text-[11px] font-semibold text-ink">{choice.label}</span>
          <span className="pt-0.5">{choice.text}</span>
        </li>
      ))}
    </ol>
  );
}

function AnswerCard({ title, stage, answer, correct }: { title: string; stage: string; answer: Answer; correct?: boolean }) {
  return (
    <Surface as="article" className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{stage}</p><h3 className="mt-1 text-lg font-semibold tracking-[-0.02em]">{title}</h3></div>
        {correct !== undefined && <span className={`mt-1 inline-flex items-center gap-1.5 text-xs font-semibold ${correct ? "text-good" : "text-bad"}`}><span className={`size-1.5 rounded-full ${correct ? "bg-good" : "bg-bad"}`} />{correct ? "Correct" : "Incorrect"}</span>}
      </div>
      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-rule/70 pb-4">
        <p className="font-display text-3xl tracking-[-0.04em]">Answer {answer.answer}</p>
        <p className="tabular-nums text-sm font-semibold text-field">{percentage(answer.confidence)} confidence</p>
      </div>
      <p className="mt-4 text-sm leading-6 text-copy">{answer.explanation}</p>
      <p className="mt-4 text-[11px] leading-5 text-muted">Confidence is model-elicited self-report. It is not a verified probability.</p>
    </Surface>
  );
}

export function ExperimentClient() {
  const [category, setCategory] = useState<Category>("arithmetic");
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [questionId, setQuestionId] = useState("");
  const [questionLoading, setQuestionLoading] = useState(true);
  const [questionError, setQuestionError] = useState("");
  const [running, setRunning] = useState(false);
  const [reply, setReply] = useState<Reply | null>(null);
  const [apiMessage, setApiMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadQuestions() {
      setQuestionLoading(true);
      setQuestionError("");
      setReply(null);
      setApiMessage("");
      try {
        const response = await fetch(`/api/questions?category=${category}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Questions could not be loaded. Refresh to try again.");
        const data = await response.json() as { questions: PublicQuestion[] };
        if (cancelled) return;
        setQuestions(data.questions);
        setQuestionId(data.questions[0]?.questionId ?? "");
      } catch (error) {
        if (!cancelled) setQuestionError(error instanceof Error ? error.message : "Questions could not be loaded.");
      } finally {
        if (!cancelled) setQuestionLoading(false);
      }
    }
    void loadQuestions();
    return () => { cancelled = true; };
  }, [category]);

  const selectedQuestion = useMemo(() => questions.find((question) => question.questionId === questionId), [questions, questionId]);

  async function startExperiment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedQuestion || running) return;
    setRunning(true);
    setReply(null);
    setApiMessage("");
    try {
      const response = await fetch("/api/experiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: selectedQuestion.questionId }),
      });
      const data = await response.json() as Reply | { status?: string; message?: string };
      if (response.status === 503 && data && "message" in data) {
        setApiMessage(data.message ?? "Live inference is unavailable.");
        return;
      }
      if (data && "status" in data && ["complete", "partial", "quota_rejected", "failed"].includes(data.status ?? "")) {
        setReply(data as Reply);
      } else {
        setApiMessage("The experiment could not be completed. No answer key was returned.");
      }
    } catch {
      setApiMessage("The experiment service could not be reached. No answer key was returned.");
    } finally {
      setRunning(false);
    }
  }

  const showDirect = reply?.status === "complete" || reply?.status === "partial";

  return (
    <div className="mx-auto max-w-6xl px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
      <div className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-field">Live demonstration · M0 protocol</p>
        <h1 className="mt-3 font-display text-4xl tracking-[-0.045em] sm:text-5xl">Run a two-pass experiment</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-copy">The model answers first, then reconsiders the same question. The answer key is withheld from both prompts and appears here only after both stages complete.</p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(290px,0.85fr)] lg:items-start">
        <Surface as="section" className="p-5 sm:p-7" aria-labelledby="question-heading">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Question set · Playground split</p><h2 id="question-heading" className="mt-2 font-display text-2xl tracking-[-0.03em]">Choose a question</h2></div>
            <span className="border border-rule bg-paper px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Answer key private</span>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-xs font-semibold text-copy" htmlFor="category-select">
              Category
              <select id="category-select" value={category} onChange={(event) => setCategory(event.target.value as Category)} disabled={running || questionLoading} className="min-h-11 w-full appearance-none rounded-lg border border-rule bg-paper px-3 text-sm font-medium text-ink outline-none transition-colors focus:border-field focus:ring-2 focus:ring-field/15 disabled:opacity-60">
                {categories.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-xs font-semibold text-copy" htmlFor="question-select">
              Question
              <select id="question-select" value={questionId} onChange={(event) => { setQuestionId(event.target.value); setReply(null); }} disabled={running || questionLoading || questions.length === 0} className="min-h-11 w-full rounded-lg border border-rule bg-paper px-3 text-sm font-medium text-ink outline-none transition-colors focus:border-field focus:ring-2 focus:ring-field/15 disabled:opacity-60">
                {questions.map((item, index) => <option value={item.questionId} key={item.questionId}>Question {String(index + 1).padStart(2, "0")}</option>)}
              </select>
            </label>
          </div>

          {questionLoading ? <div className="mt-8 flex items-center gap-3 text-sm text-muted" role="status"><LoaderCircle className="size-4 animate-spin" />Loading the playground questions…</div> : null}
          {questionError ? <div className="mt-6 rounded-lg border border-bad/20 bg-bad/[0.04] p-4 text-sm text-bad" role="alert">{questionError}</div> : null}
          {selectedQuestion ? <>
            <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted">{selectedQuestion.subject} · {selectedQuestion.sourceVersion}</p>
            <p className="mt-3 max-w-2xl text-lg font-medium leading-7 tracking-[-0.015em] text-ink">{selectedQuestion.question}</p>
            <OptionList question={selectedQuestion} />
            <form onSubmit={startExperiment} className="mt-7 flex flex-wrap items-center gap-4">
              <Button type="submit" disabled={running || questionLoading || !selectedQuestion}>
                {running ? <><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />Running the experiment</> : <>Start two-pass experiment <ArrowDown aria-hidden="true" className="size-4" /></>}
              </Button>
              <span className="text-xs text-muted">Up to two successful model generations.</span>
            </form>
          </> : null}
        </Surface>

        <div className="space-y-4">
          <Surface as="section" className="p-5 sm:p-6" aria-labelledby="trace-heading">
            <div className="flex items-center justify-between gap-3">
              <h2 id="trace-heading" className="text-sm font-semibold tracking-[-0.01em]">Run trace</h2>
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{running ? "In progress" : reply?.status === "complete" ? "Complete" : reply?.status === "partial" ? "Partial" : "Ready"}</span>
            </div>
            <ol className="mt-5 space-y-0">
              <li className="flex gap-3 pb-5">
                <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border ${showDirect ? "border-good/25 bg-good/[0.06] text-good" : running ? "border-field/30 bg-field/[0.06] text-field" : "border-rule bg-paper text-muted"}`}>
                  {showDirect ? <Check className="size-3.5" /> : running ? <LoaderCircle className="size-3.5 animate-spin" /> : <span className="size-1.5 rounded-full bg-current" />}
                </span>
                <div><p className="text-sm font-semibold">Direct answer</p><p className="mt-1 text-xs leading-5 text-muted">{showDirect ? "Answer and confidence received." : running ? "Gemini is answering without the key." : "The model answers without seeing the key."}</p></div>
              </li>
              <li className="flex gap-3 pb-5">
                <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border ${reply?.status === "complete" ? "border-good/25 bg-good/[0.06] text-good" : running && showDirect ? "border-brass/30 bg-brass/[0.06] text-brass" : "border-rule bg-paper text-muted"}`}>
                  {reply?.status === "complete" ? <Check className="size-3.5" /> : running && showDirect ? <LoaderCircle className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
                </span>
                <div><p className="text-sm font-semibold">Self-reflection</p><p className="mt-1 text-xs leading-5 text-muted">{reply?.status === "complete" ? "Revised answer and confidence received." : running && showDirect ? "The first answer is saved; reflection is running." : "The model reconsiders the same question."}</p></div>
              </li>
              <li className="flex gap-3">
                <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border ${reply?.status === "complete" ? "border-field/30 bg-field/[0.06] text-field" : "border-rule bg-paper text-muted"}`}><CircleHelp className="size-3.5" /></span>
                <div><p className="text-sm font-semibold">Evaluation</p><p className="mt-1 text-xs leading-5 text-muted">{reply?.status === "complete" ? "The answer key was revealed after both stages." : "Correctness is revealed only after both stages."}</p></div>
              </li>
            </ol>
          </Surface>

          <div className="flex gap-3 border border-field/15 bg-field/[0.035] p-4 text-xs leading-5 text-copy">
            <CircleHelp aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-field" />
            <p>This playground does not enroll research participants. It does not ask you to make a human judgment or store personal information for research.</p>
          </div>
        </div>
      </div>

      {apiMessage ? <div className="mt-6 flex items-start gap-3 border border-brass/25 bg-brass/[0.05] p-4 text-sm leading-6 text-copy" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0 text-brass" />{apiMessage}</div> : null}
      {reply?.status === "quota_rejected" ? <div className="mt-6 flex items-start gap-3 border border-brass/25 bg-brass/[0.05] p-4 text-sm leading-6 text-copy" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0 text-brass" /><div><p className="font-semibold text-ink">Quota exhausted</p><p className="mt-1">{reply.message}</p></div></div> : null}
      {reply?.status === "failed" ? <div className="mt-6 flex items-start gap-3 border border-bad/20 bg-bad/[0.04] p-4 text-sm leading-6 text-copy" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0 text-bad" /><div><p className="font-semibold text-ink">Experiment could not be completed</p><p className="mt-1">{reply.failure.message}</p></div></div> : null}

      {showDirect && reply ? <section className="mt-10" aria-labelledby="results-heading" aria-live="polite">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-field">Model responses</p><h2 id="results-heading" className="mt-2 font-display text-3xl tracking-[-0.035em]">The two passes</h2></div><p className="text-xs text-muted">Run {reply.runId.slice(0, 8)}</p></div>
        <div className="grid gap-4 md:grid-cols-2">
          <AnswerCard title="Initial answer" stage="Stage A · Direct" answer={reply.direct} correct={reply.status === "complete" ? reply.evaluation.directCorrect : undefined} />
          {reply.status === "complete" ? <AnswerCard title="Reconsidered answer" stage="Stage B · Reflection" answer={reply.reflection} correct={reply.evaluation.reflectionCorrect} /> : <Surface as="section" className="flex min-h-[230px] flex-col justify-center p-6" role="alert"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brass">Stage B unavailable</p><h3 className="mt-2 font-display text-2xl tracking-[-0.03em]">The run is partial</h3><p className="mt-3 text-sm leading-6 text-copy">{reply.failure.message}</p><p className="mt-4 text-xs text-muted">The answer key stays hidden because both stages did not complete.</p></Surface>}
        </div>
        {reply.status === "complete" ? <Surface as="section" className="mt-5 p-5 sm:p-7" aria-labelledby="evaluation-heading">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-field">Evaluation · Both stages complete</p><h2 id="evaluation-heading" className="mt-2 font-display text-2xl tracking-[-0.03em]">What changed?</h2></div><span className={`border px-3 py-1.5 text-xs font-semibold tabular-nums ${reply.evaluation.confidenceChange > 0 ? "border-brass/25 bg-brass/[0.05] text-brass" : "border-rule bg-paper text-copy"}`}>{delta(reply.evaluation.confidenceChange)}</span></div>
          <p className="mt-4 text-base font-medium text-ink">Correct answer: {reply.evaluation.correctAnswer}</p>
          <p className="mt-2 text-sm leading-6 text-copy">{transitionCopy(reply.evaluation.transition)}</p>
          <div className="mt-6 grid gap-3 border-t border-rule/70 pt-5 sm:grid-cols-2">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Direct · Brier score</p><p className="mt-1 tabular-nums text-xl font-semibold">{reply.evaluation.directBrier.toFixed(3)}</p></div>
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Reflection · Brier score</p><p className="mt-1 tabular-nums text-xl font-semibold">{reply.evaluation.reflectionBrier.toFixed(3)}</p></div>
          </div>
          <p className="mt-5 max-w-3xl text-xs leading-5 text-muted">This is one paired observation for this model and question. It cannot establish whether reflection generally improves accuracy or calibration. Brier scores here compare a self-reported confidence value with whether that specific answer was correct.</p>
        </Surface> : null}
      </section> : null}
    </div>
  );
}
