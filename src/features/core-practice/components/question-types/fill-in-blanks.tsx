"use client";

interface FillInBlanksProps {
  questionId: string;
  prompt: string;
  selectedAnswer?: string;
  onChange: (value: string) => void;
}

export function FillInBlanks({
  questionId,
  prompt,
  selectedAnswer = "",
  onChange,
}: FillInBlanksProps) {
  // Replace the literal ___ with an input field
  const parts = prompt.split("___");

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 leading-loose">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <input
                type="text"
                value={selectedAnswer}
                onChange={(e) => onChange(e.target.value)}
                className="mx-2 inline-block w-32 border-b-2 border-zinc-400 dark:border-zinc-600 bg-transparent px-2 text-center text-blue-600 dark:text-blue-400 focus:border-blue-600 dark:focus:border-blue-400 focus:outline-none font-semibold"
                placeholder="Nhập..."
                autoComplete="off"
                spellCheck="false"
              />
            )}
          </span>
        ))}
      </h4>
    </div>
  );
}
