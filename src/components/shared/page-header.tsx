import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold tracking-[-0.045em] text-pretty [overflow-wrap:anywhere] break-words text-[var(--foreground)] sm:text-4xl lg:text-[2.5rem] lg:leading-[1.08]">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-pretty [overflow-wrap:anywhere] break-words text-[var(--muted-foreground)] sm:text-base sm:leading-7">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
