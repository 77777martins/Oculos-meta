/** Links de navegação compartilhados pelo cabeçalho, menu lateral e rodapé. */
export type NavLink = [href: string, label: string];

export const HELP_LINKS: NavLink[] = [
  ["/faq", "Perguntas frequentes"],
  ["/conta/pedidos", "Rastrear pedido"],
  ["/trocas-e-devolucoes", "Trocas e devoluções"],
  ["/contato", "Fale conosco"],
];

/** Atalhos da barra secundária do cabeçalho (além das coleções). */
export const QUICK_LINKS: NavLink[] = [
  ["/produtos?ordem=novidades", "Novidades"],
  ["/produtos?ordem=menor-preco", "Menores preços"],
  ["/conta/pedidos", "Rastrear pedido"],
  ["/contato", "Atendimento"],
];

export function shopByLinks(base: string): NavLink[] {
  return [
    [`${base}?ordem=novidades`, "Novidades"],
    [`${base}?ordem=relevancia`, "Destaques"],
    [`${base}?ordem=menor-preco`, "Menor preço"],
    [base, "Ver tudo"],
  ];
}
