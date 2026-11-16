import type { ReactNode } from "react";

/**
 * Renderiza texto administrável com um formato mínimo e SEGURO (sem HTML):
 * "## Título", "- item de lista" e parágrafos. Todo conteúdo passa pelo
 * escape automático do React — não há como injetar scripts.
 */
export function PolicyText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`}>
          {list.map((li, i) => (
            <li key={i}>{li}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith("## ")) {
      flush();
      blocks.push(<h2 key={`h-${blocks.length}`}>{line.slice(3)}</h2>);
    } else if (line.startsWith("- ")) {
      list.push(line.slice(2));
    } else {
      flush();
      blocks.push(<p key={`p-${blocks.length}`}>{line}</p>);
    }
  }
  flush();
  return <div className="prose-policy">{blocks}</div>;
}

export function PageHero({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <header className="border-b border-slate-100 bg-gradient-to-b from-brand-50/60 to-white">
      <div className="container-page py-14">
        {eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p>}
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-slate-600">{description}</p>}
      </div>
    </header>
  );
}
