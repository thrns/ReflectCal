import Link from "next/link";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

const stages = [
  { number: "01", title: "Answer", detail: "A model answers a fixed question and reports its own confidence." },
  { number: "02", title: "Reflect", detail: "The same model reconsiders without seeing the answer key." },
  { number: "03", title: "Compare", detail: "Only then do we reveal correctness and the confidence change." },
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-16 lg:pb-28">
        <div>
          <p className="mb-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-field">
            <span className="inline-block size-1.5 rounded-full bg-field" /> A paired self-reflection experiment
          </p>
          <h1 className="max-w-[12ch] font-display text-[clamp(3rem,7vw,5.6rem)] leading-[0.98] tracking-[-0.055em] text-ink [text-wrap:balance]">
            Can AI recognize when it is wrong?
          </h1>
          <p className="mt-7 max-w-xl text-[17px] leading-8 text-copy [text-wrap:pretty]">
            ReflectCal asks a model to answer, reconsider, and report how sure it feels. Then we compare both answers with a known result.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/experiment">
              <Button>Try the live experiment <ArrowRight aria-hidden="true" className="size-4" /></Button>
            </Link>
            <Link href="/methodology" className="min-h-11 content-center px-2 text-sm font-medium text-copy underline decoration-rule underline-offset-4 transition-colors hover:text-ink hover:decoration-field focus-visible:outline-2 focus-visible:outline-field">
              Read the methodology
            </Link>
          </div>
          <p className="mt-6 max-w-lg text-xs leading-5 text-muted">One model, one question, two passes. A live result is a demonstration, not statistical evidence.</p>
        </div>

        <Surface className="relative overflow-hidden p-6 sm:p-8">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Experiment trace</p>
              <h2 className="mt-2 font-display text-2xl tracking-[-0.03em]">Two passes. One comparison.</h2>
            </div>
            <span className="border border-rule bg-paper px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">M0 protocol</span>
          </div>

          <div className="relative space-y-2 before:absolute before:bottom-7 before:left-[17px] before:top-7 before:w-px before:bg-rule">
            <div className="relative grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-xl bg-paper px-3 py-4">
              <span className="z-10 grid size-9 place-items-center rounded-full border border-field/30 bg-paper-card text-field"><span className="size-2 rounded-full bg-field" /></span>
              <div><p className="text-sm font-semibold">Direct answer</p><p className="mt-1 text-xs text-muted">Answer + self-reported confidence</p></div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Stage A</span>
            </div>
            <div className="relative grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-xl bg-paper px-3 py-4">
              <span className="z-10 grid size-9 place-items-center rounded-full border border-brass/30 bg-paper-card text-brass"><RotateCcw aria-hidden="true" className="size-4" /></span>
              <div><p className="text-sm font-semibold">Self-reflection</p><p className="mt-1 text-xs text-muted">Reconsider without the answer key</p></div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Stage B</span>
            </div>
            <div className="relative grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-xl border border-field/20 bg-field/[0.045] px-3 py-4">
              <span className="z-10 grid size-9 place-items-center rounded-full border border-field/30 bg-paper-card text-field"><Check aria-hidden="true" className="size-4" /></span>
              <div><p className="text-sm font-semibold">Evaluation</p><p className="mt-1 text-xs text-muted">Correctness + confidence change</p></div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-field">After both</span>
            </div>
          </div>
          <p className="mt-6 border-t border-rule/70 pt-4 text-xs leading-5 text-muted">The answer key stays outside both prompts. It appears in the interface only after both stages finish.</p>
        </Surface>
      </section>

      <section className="border-y border-rule/70 bg-paper-muted/45">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-field">The protocol</p><h2 className="mt-3 font-display text-3xl tracking-[-0.035em] sm:text-4xl">A small, inspectable trial</h2></div>
            <p className="max-w-md text-sm leading-6 text-copy">The interface makes one paired observation. It does not claim to measure model calibration from a single question.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {stages.map((stage, index) => (
              <div key={stage.number} className={`border-t-2 pt-4 ${index === 1 ? "border-brass" : "border-field/60"}`}>
                <p className="font-display text-sm text-muted">{stage.number}</p>
                <h3 className="mt-3 text-lg font-semibold tracking-[-0.02em]">{stage.title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-copy">{stage.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 sm:px-8 sm:py-20 md:flex-row md:items-center md:justify-between">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">Built for careful questions</p><p className="mt-3 max-w-2xl font-display text-2xl leading-snug tracking-[-0.025em] sm:text-3xl">Confidence is a report from the model, not a promise about its probability of being right.</p></div>
        <Link href="/experiment" className="shrink-0"><Button variant="secondary">Open the experiment <ArrowRight aria-hidden="true" className="size-4" /></Button></Link>
      </section>
    </>
  );
}
