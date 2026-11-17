import { Check } from "lucide-react";

type Block = { type: "heading"; text: string } | { type: "list"; items: string[] } | { type: "paragraph"; text: string };

/**
 * Converte o texto da descrição em blocos simples:
 *   "## Título" → subtítulo · "- item" → lista · demais linhas → parágrafo.
 * Tudo é exibido como TEXTO (o React escapa o conteúdo): não existe HTML nem Markdown
 * completo aqui, então não há como injetar scripts ou links pela descrição.
 */
export function parseDescription(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("## ")) blocks.push({ type: "heading", text: line.slice(3).trim() });
    else if (line.startsWith("- ")) {
      const last = blocks[blocks.length - 1];
      if (last?.type === "list") last.items.push(line.slice(2).trim());
      else blocks.push({ type: "list", items: [line.slice(2).trim()] });
    } else blocks.push({ type: "paragraph", text: line });
  }
  return blocks;
}

export function RichDescription({ text }: { text: string }) {
  return (
    <div className="mt-4 space-y-4 leading-7 text-slate-700">
      {parseDescription(text).map((b, i) => {
        if (b.type === "heading")
          return (
            <h3 key={i} className="pt-4 text-lg font-semibold text-ink first:pt-0">
              {b.text}
            </h3>
          );
        if (b.type === "list")
          return (
            <ul key={i} className="space-y-2">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-2.5">
                  <Check className="mt-1.5 size-4 shrink-0 text-brand-600" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        return <p key={i}>{b.text}</p>;
      })}
    </div>
  );
}
