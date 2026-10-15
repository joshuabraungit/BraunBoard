import type { Question } from "@/lib/questions";
import { OFFER_QUESTIONS, questionsAsText } from "@/lib/questions";
import { CopyButton } from "./CopyButton";

export function QuestionsPanel({ questions, title, company }: { questions: Question[]; title: string; company: string }) {
  if (!questions.length) return null;
  return (
    <section className="mt-6 rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight">Questions to ask on the first call</h2>
        <CopyButton
          text={questionsAsText(title, company, questions, OFFER_QUESTIONS)}
          label="Copy questions"
          className="rounded-md border border-line-strong px-2.5 py-1 text-xs font-semibold hover:border-ink"
        />
      </div>
      <p className="mt-1 text-sm text-ink-3">Built from what this posting leaves out. How they answer tells you as much as what they say.</p>
      <QuestionList questions={questions} />

      <div className="mt-5 border-t border-line pt-4">
        <h3 className="font-bold">When the offer comes</h3>
        <p className="mt-1 text-sm text-ink-3">Save these for later. They land better once they&apos;ve said yes to you.</p>
        <QuestionList questions={OFFER_QUESTIONS} />
      </div>
    </section>
  );
}

function QuestionList({ questions }: { questions: Question[] }) {
  return (
    <ol className="mt-4 space-y-3">
      {questions.map((q, i) => (
        <li key={q.text} className="flex gap-3">
          <span className="mt-0.5 w-5 shrink-0 text-right text-sm font-semibold text-ink-3">{i + 1}.</span>
          <div>
            <p className="text-[15px] font-medium leading-snug">{q.text}</p>
            <p className="mt-0.5 text-sm text-ink-2">{q.why}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
