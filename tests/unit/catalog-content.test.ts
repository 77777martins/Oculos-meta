import { describe, expect, it } from "vitest";
import { CATALOG_CONTENT } from "../../prisma/catalog-content";
import { specSchema } from "@/lib/validation/catalog";
import { parseDescription } from "@/components/store/rich-description";

const entries = Object.entries(CATALOG_CONTENT);
const published = (c: (typeof CATALOG_CONTENT)[string]) => [c.name, c.shortDescription, c.description, c.seoTitle, c.seoDescription, ...c.specs.map((x) => `${x.label}: ${x.value}`)].join("\n");

describe("conteúdo do catálogo", () => {
  it("cobre os 12 produtos", () => {
    expect(entries).toHaveLength(12);
  });

  it.each(entries)("%s cabe nos limites do banco e da validação do painel", (_, c) => {
    expect(c.name.length).toBeLessThanOrEqual(160);
    expect(c.shortDescription.length).toBeLessThanOrEqual(300);
    expect(c.description.length).toBeLessThanOrEqual(10_000);
    expect(c.seoTitle.length).toBeLessThanOrEqual(70);
    expect(c.seoDescription.length).toBeLessThanOrEqual(160);
    expect(c.specs.length).toBeLessThanOrEqual(40);
    for (const spec of c.specs) expect(specSchema.safeParse(spec).success).toBe(true);
  });

  it.each(entries)("%s mantém o aviso de demonstração", (_, c) => {
    expect(c.name.startsWith("[DEMO] ")).toBe(true);
    expect(c.shortDescription).toContain("Demonstração: preço e estoque fictícios.");
  });

  it("Audio Clubmaster não promete câmera, fotos ou vídeos", () => {
    const c = CATALOG_CONTENT["demo-ray-ban-meta-clubmaster"]!;
    expect(c.specs.find((x) => x.label === "Câmera")?.value).toMatch(/^Não possui/);
    const text = published(c).toLowerCase();
    for (const line of text.split("\n").filter((l) => /c[aâ]mera|foto|v[ií]deo|3k|12 mp/.test(l))) {
      expect(line).toMatch(/não possui|somente de áudio|sem câmera/);
    }
  });

  it("modelos sem identificação confirmada não publicam números de geração", () => {
    const pending = entries.filter(([, c]) => c.pending);
    expect(pending.map(([slug]) => slug).sort()).toEqual(
      ["demo-ray-ban-meta-skyler", "demo-ray-ban-meta-wayfarer"].sort(),
    );
    for (const [, c] of pending) expect(published(c)).not.toMatch(/\d+\s*(h|horas|GB|MP)\b|3K|Gen\s?\d/i);
  });

  it.each([
    ["demo-ray-ban-meta-retangular", "Ray-Ban Meta Blayzer Optics (Gen 2)", "RW7001", "Mais de 8 horas", "Até 48 horas adicionais"],
    ["demo-ray-ban-meta-gatinho", "Ray-Ban Meta Zena (Gen 3)", "RW4015", "Até 9 horas", "Até 50 horas adicionais"],
    ["demo-ray-ban-meta-piloto", "Ray-Ban Meta Aviator (Gen 3)", "RW4016", "Até 9 horas", "Até 50 horas adicionais"],
  ])("%s: modelo confirmado com nome, referência e especificações da sua geração", (slug, name, ref, battery, extra) => {
    const c = CATALOG_CONTENT[slug]!;
    const spec = (label: string) => c.specs.find((x) => x.label === label)?.value;
    expect(c.name).toBe(`[DEMO] ${name}`);
    expect(spec("Referência")).toBe(ref);
    expect(spec("Fotos")).toBe("3024 × 4032 pixels");
    expect(spec("Vídeo")).toBe("Até 3K Ultra HD a 30 fps");
    expect(spec("Conectividade")).toBe("Bluetooth 5.3 e Wi-Fi 6");
    expect(spec("Bateria")).toBe(battery);
    expect(spec("Estojo carregador")).toBe(extra);
    expect(c.pending).toBeUndefined();
    expect(c.unconfirmedSpecs).toBeUndefined();
  });

  it("nenhum produto se diz à prova d'água (só resistência informada pelo fabricante)", () => {
    for (const [, c] of entries) {
      for (const line of published(c).split("\n").filter((l) => /prova d.água/i.test(l))) expect(line).toMatch(/não é à prova d.água/i);
    }
    expect(CATALOG_CONTENT["demo-oakley-meta-hstn"]!.specs.find((x) => x.label === "Resistência")?.value).toContain("IPX4");
    expect(CATALOG_CONTENT["demo-oakley-meta-vanguard"]!.specs.find((x) => x.label === "Resistência")?.value).toContain("IP67");
  });
});

describe("descrição estruturada", () => {
  it("separa subtítulos, listas e parágrafos", () => {
    expect(parseDescription("Intro.\n\n## Diferenciais\n- Um\n- Dois\nFim.")).toEqual([
      { type: "paragraph", text: "Intro." },
      { type: "heading", text: "Diferenciais" },
      { type: "list", items: ["Um", "Dois"] },
      { type: "paragraph", text: "Fim." },
    ]);
  });
  it("mantém HTML como texto (não interpreta tags)", () => {
    expect(parseDescription("<script>alert(1)</script>")).toEqual([{ type: "paragraph", text: "<script>alert(1)</script>" }]);
  });
});
