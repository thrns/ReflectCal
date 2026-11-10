import type { Metadata } from "next";
import { ArrowRight, LockKeyhole, Scale, Waypoints } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Methodology" };

const sections = [
  {
    icon: Waypoints,
    number: "01",
    title: "Paired, two-stage protocol",
    body: "Stage A asks a configured Gemini model to answer one fixed multiple-choice item and report confidence. Stage B shows that same model the same question and options, plus its previous answer, confidence, and explanation. The model is asked to reconsider from scratch. It never sees the ground-truth answer in either prompt.",
  },
  {
    icon: Scale,
    number: "02",
    title: "What we score",
    body: "Each answer is compared with an independently computed answer key after both stages finish. The interface reports whether reflection corrected an error, introduced one, or left correctness unchanged, along with the confidence change. It computes the binary Brier score (confidence − correctness)² for each answer. No aggregate calibration chart is shown.",
  },
  {
    icon: LockKeyhole,
    number: "03",
    title: "What confidence means",
    body: "Confidence is a number the model is prompted to report from 0 to 1. It is an elicited self-report, not a verified probability, internal state, or guarantee of correctness. A single score is descriptive of that response only.",
  },
];

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-12 pt-12 sm:px-8 sm:pt-16">
      <div className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-field">Protocol notes · M0</p>
        <h1 className="mt-3 font-display text-4xl tracking-[-0.045em] sm:text-5xl">How the experiment works</h1>
        <p className="mt-4 text-base leading-7 text-copy">A transparent live demonstration of answer revision and reported confidence, with the ground truth held back until evaluation.</p>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return <Surface as="article" className="p-5 sm:p-6" key={section.number}>
            <div className="flex items-center justify-between"><span className="font-display text-sm text-muted">{section.number}</span><Icon aria-hidden="true" className="size-4 text-field" /></div>
            <h2 className="mt-7 text-lg font-semibold tracking-[-0.02em]">{section.title}</h2>
            <p className="mt-3 text-sm leading-6 text-copy">{section.body}</p>
          </Surface>;
        })}
      </div>

      <div className="mt-10 grid gap-7 lg:grid-cols-[0.8fr_1.2fr]">
        <Surface className="h-fit bg-paper-muted/50 p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-field">M0 protocol versions</p>
          <dl className="mt-5 space-y-4 text-sm">
            <div><dt className="text-xs text-muted">Experiment</dt><dd className="mt-1 font-mono text-[11px] text-ink">reflectcal-m0-paired-v1.0.0</dd></div>
            <div><dt className="text-xs text-muted">Direct prompt</dt><dd className="mt-1 font-mono text-[11px] text-ink">direct-answer-v1.0.0</dd></div>
            <div><dt className="text-xs text-muted">Reflection prompt</dt><dd className="mt-1 font-mono text-[11px] text-ink">self-reflection-v1.0.0</dd></div>
            <div><dt className="text-xs text-muted">Generation</dt><dd className="mt-1 text-copy">Temperature 0 · JSON structured output</dd></div>
          </dl>
        </Surface>

        <div className="space-y-7">
          <section><h2 className="font-display text-2xl tracking-[-0.03em]">Dataset provenance</h2><p className="mt-3 text-sm leading-7 text-copy">The included version 1.0.0 fixture set is generated locally from fixed arithmetic and elementary probability templates using seed <code className="rounded bg-paper-muted px-1.5 py-0.5 text-xs">20261110</code>. Arithmetic results and probability fractions are computed directly in code. Items are divided into disjoint research and playground splits. Only validated playground questions are returned by the public question API. A future MMLU-Pro adapter should preserve source IDs, source release, subject, answer options, split, and validation provenance; M0 does not download that dataset.</p></section>
          <section><h2 className="font-display text-2xl tracking-[-0.03em]">Reproducibility and limits</h2><p className="mt-3 text-sm leading-7 text-copy">The server records protocol and prompt versions, exact rendered prompt text, configured model ID, generation configuration, response metadata, timestamps, parsed output, correctness, and per-response Brier score. Temperature is set to zero where supported, but provider behavior, model updates, and backend nondeterminism can still change outputs. The model ID is configurable and is never silently replaced when unavailable.</p></section>
          <section><h2 className="font-display text-2xl tracking-[-0.03em]">Demonstration versus study</h2><p className="mt-3 text-sm leading-7 text-copy">A single question is not statistical evidence. This interface does not collect human choices, judgments, or personal information for a research study. It uses an ephemeral random visitor cookie only to enforce the daily usage limit; the server stores a one-way hash for quota accounting, not the raw cookie value or visitor IP. Controlled research would require a pre-registered protocol, sufficiently large and documented datasets, repeated sampling, uncertainty estimates, and appropriate human-participant review where applicable.</p></section>
          <Link href="/experiment" className="inline-block pt-1"><Button>Try the experiment <ArrowRight aria-hidden="true" className="size-4" /></Button></Link>
        </div>
      </div>
    </div>
  );
}
