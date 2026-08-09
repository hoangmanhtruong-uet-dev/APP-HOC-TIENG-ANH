import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Lightbulb,
  Network,
  UsersRound,
  X,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { LessonMarkdown } from "@/components/learning/lesson-markdown";
import {
  getGrammarCatalog,
  getGrammarTopic,
} from "@/server/learning/foundations";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getGrammarTopic(slug);
  return topic ? { title: topic.title } : {};
}

export default async function GrammarDetailPage({ params }: PageProps) {
  const { slug } = await params;
  if (slug === "[slug]") {
    const topics = await getGrammarCatalog();
    if (topics[0]) redirect(`/learn/grammar/${topics[0].slug}`);
  }
  const topic = await getGrammarTopic(slug);
  if (!topic) notFound();

  return (
    <article className="mx-auto min-h-[100dvh] max-w-3xl bg-[#fbf9ff] pb-28 lg:min-h-0 lg:rounded-3xl lg:border lg:border-[#e4deef]">
      <header className="flex min-h-16 items-center gap-2 border-b border-[#e7e1ee] bg-white px-3 lg:rounded-t-3xl">
        <Link
          href="/learn/grammar"
          aria-label="Back to grammar"
          className="grid size-11 place-items-center rounded-full text-[#3825b3]"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="min-w-0 flex-1 text-xl leading-6 font-bold text-[#2f1abb]">
          {topic.title}
        </h1>
        <span className="rounded-full bg-[#5135d5] px-2.5 py-1 text-[10px] font-bold text-white">
          {topic.difficulty || "A1"}
          <br />
          Beginner
        </span>
      </header>

      <div className="space-y-5 px-4 py-5 sm:px-6">
        <div>
          <p className="flex items-center gap-1.5 text-xs text-[#756e80]">
            <Clock3 size={13} /> 12 min estimated
          </p>
          <h2 className="mt-2 text-2xl font-bold">{topic.title}</h2>
          <p className="mt-1 text-sm leading-6 text-[#70697b]">
            Learn to use this grammar point in everyday English.
          </p>
          <div className="mt-4 inline-block rounded-xl border border-[#e3ddee] bg-white p-3">
            <p className="text-xs font-semibold">
              Progress <span className="text-[#5034d3]">2 / 5 sections</span>
            </p>
            <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-[#e9e4ef]">
              <div className="h-full w-2/5 rounded-full bg-[#7652e8]" />
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-[#e3ddee] bg-white p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Lightbulb size={20} className="text-[#4f32d0]" /> When do we use
            it?
          </h2>
          <div className="mt-4 text-sm leading-7 text-[#4f4959]">
            <LessonMarkdown>{topic.explanationMarkdown}</LessonMarkdown>
          </div>
        </section>

        <section className="rounded-2xl bg-gradient-to-br from-[#4b30d1] to-[#6650db] p-4 text-white">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Network size={19} /> Structure
          </h2>
          <div className="mt-4 space-y-2 text-xs">
            <div className="rounded-lg bg-white/12 p-3">
              <p className="font-bold text-white/70">AFFIRMATIVE (+)</p>
              <p className="mt-1">Subject + verb(s)</p>
            </div>
            <div className="rounded-lg bg-white/12 p-3">
              <p className="font-bold text-white/70">NEGATIVE (-)</p>
              <p className="mt-1">Subject + don&apos;t/doesn&apos;t + verb</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e3ddee] bg-white p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <UsersRound size={19} /> Examples in Context
          </h2>
          <ul className="mt-3 divide-y divide-[#ece7f1]">
            {topic.examples.map((example) => (
              <li key={example.correct} className="flex gap-2 py-3 text-sm">
                <span className="mt-1 h-5 w-0.5 shrink-0 bg-[#5838db]" />
                <div>
                  <p>{example.correct}</p>
                  <p className="mt-1 text-xs text-[#756e80]">{example.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-[#efd88c] bg-[#fff4c9] p-4">
          <h2 className="text-lg font-bold text-[#a75a00]">
            ⚠ Common Mistakes
          </h2>
          <ul className="mt-3 space-y-2">
            {topic.commonMistakes.map((mistake) => (
              <li
                key={mistake.wrong}
                className="rounded-lg bg-white/70 p-3 text-xs"
              >
                <p className="flex items-center gap-1 text-[#ba342b]">
                  <X size={13} />
                  {mistake.wrong}
                </p>
                <p className="mt-1 flex items-center gap-1 font-semibold text-[#087a4c]">
                  <CheckCircle2 size={13} />
                  {mistake.correction}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {topic.exerciseSlug ? (
          <Link
            href={`/practice/${topic.exerciseSlug}`}
            className="flex min-h-12 items-center justify-center rounded-full bg-[#4c31d4] px-5 font-bold text-white shadow-lg shadow-[#4c31d4]/20"
          >
            Start Practice →
          </Link>
        ) : null}
      </div>
    </article>
  );
}
