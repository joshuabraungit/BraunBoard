import type { Question } from "@/lib/questions";
import { questionsAsText } from "@/lib/questions";
import { CopyButton } from "./CopyButton";

export function QuestionsPanel({ questions, title, company }: { questions: Question[]; title: string; company: string }) {
  if (!questions.length) return null;
  return (
    <section className="mt-6 rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight">Questions to ask on the first call</h2>
        <CopyButton
          text={questionsAsText(title, company, questions)}
          label="Copy questions"
          className="rounded-md border border-line-strong px-2.5 py-1 text-xs font-semibold hover:border-ink"
        />
      </div>
      <p className="mt-1 text-sm text-ink-3">Built from what this posting leaves out. How they answer tells you as much as what they say.</p>
      <ol className="mt-4 space-y-3">
        {questions.map((q, i) => (
          <li key={q.text} className="flex gap-3">
            <span className="mt-0.5 w-5 shrink-0 text-right text-sm font-semibold text-ink-3">{i + 1}.</span>
            <div>
              <p className="text-[15px] font-medium leading-snug">{q.text}</p>
              <p className="mt-0.5 text-xs text-ink-3">{q.why}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
