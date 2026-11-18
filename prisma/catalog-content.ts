/**
 * Conteúdo comercial dos produtos de demonstração (nome, descrições e especificações).
 *
 * Fonte: dados técnicos informados pelo lojista em 17/11/2026, cruzados com o que as fotos
 * do fornecedor mostram (formato, cores, lentes e o código gravado na haste).
 *
 * Regras seguidas:
 * - Nada além do que foi informado ou é visível nas fotos (sem inventar números ou funções).
 * - Sem misturar gerações: modelos cuja identificação/geração não foi confirmada recebem
 *   apenas características gerais; os números ficam em `unconfirmedSpecs` (NÃO publicados)
 *   até a confirmação pelo código do modelo.
 * - Lentes descritas por cor e tipo conforme as fotos de cada variante.
 *
 * Convenções do campo `description` (renderizado como texto puro, sem HTML):
 *   "## Título"  → subtítulo da seção
 *   "- item"     → item de lista
 *   demais linhas → parágrafos
 */

export interface CatalogEntry {
  /** Nome exibido. Mantém o prefixo [DEMO] enquanto a loja estiver em demonstração. */
  name: string;
  /** Texto exibido como "Modelo ..." na página (não é identificador). */
  model?: string;
  shortDescription: string;
  description: string;
  specs: Array<{ label: string; value: string }>;
  seoTitle: string;
  seoDescription: string;
  /** Identificação ainda não confirmada pelo código do modelo (aparece em docs/PENDENCIAS.md). */
  pending?: string;
  /** Ponto que precisa de revisão do lojista, sem impedir a publicação do modelo confirmado. */
  review?: string;
  /** Especificações da identificação PROVÁVEL — só publicar depois de confirmar o modelo. */
  unconfirmedSpecs?: Array<{ label: string; value: string }>;
}

const DEMO_NOTE = " Demonstração: preço e estoque fictícios.";

const s = (label: string, value: string) => ({ label, value });

/** Características compartilhadas da linha Meta Glasses (informadas pelo lojista). */
const META_GLASSES_SPECS = [
  s("Câmera", "Integrada, para fotos e vídeos sem usar as mãos"),
  s("Vídeo", "Gravação em até 3K"),
  s("Assistente", "Meta AI por comando de voz"),
  s("Áudio", "Alto-falantes open-ear (sem tampar os ouvidos)"),
  s("Microfones", "Integrados"),
  s("Comunicação", "Chamadas e mensagens"),
  s("Tradução", "Conversas em mais de 20 idiomas"),
  s("Bateria", "Mais de 8 horas"),
  s("Estojo carregador", "Até 40 horas adicionais"),
  s("Lentes de grau", "Compatível"),
];

const META_GLASSES_FEATURES = `## Tecnologia da linha Meta Glasses
- Câmera integrada para fotos e vídeos em até 3K, sem tirar o celular do bolso.
- Meta AI por comando de voz: pergunte, peça ajuda e controle o óculos falando.
- Alto-falantes open-ear para músicas, podcasts e chamadas sem tampar os ouvidos.
- Tradução de conversas em mais de 20 idiomas.
- Mais de 8 horas de bateria e até 40 horas adicionais com o estojo carregador.
- Compatível com lentes de grau.`;

export const CATALOG_CONTENT: Record<string, CatalogEntry> = {
  // ───────────────────────── Ray-Ban Meta ─────────────────────────
  "demo-ray-ban-meta-retangular": {
    // Modelo confirmado pelo lojista em 17/11/2026 (catálogo oficial Ray-Ban): referência RW7001.
    name: "[DEMO] Ray-Ban Meta Blayzer Optics (Gen 2)",
    model: "Blayzer Optics (Gen 2) · RW7001",
    shortDescription: "Design retangular moderno em preto translúcido, desenvolvido especialmente para quem usa óculos de grau." + DEMO_NOTE,
    description: `O Ray-Ban Meta Blayzer Optics Gen 2 combina design retangular moderno com tecnologia inteligente. Desenvolvido especialmente para usuários de óculos de grau, possui armação preta translúcida, dobradiças com abertura ampliada, plaquetas nasais intercambiáveis e hastes ajustáveis.

## Diferenciais
- Pensado para óculos de grau: dobradiças com abertura ampliada, plaquetas nasais intercambiáveis e hastes ajustáveis.
- Câmera ultra-angular de 12 MP, com fotos de 3024 × 4032 pixels e vídeos em até 3K Ultra HD a 30 fps.
- Dois alto-falantes open-ear e sistema de 6 microfones para músicas, chamadas e comandos de voz.
- Meta AI integrada.
- Mais de 8 horas de bateria e até 48 horas adicionais com o estojo carregador.

## Armação e lentes
- Formato: retangular.
- Cor: preto translúcido.
- Lentes: transparentes (como nas fotos).
- Compatível com lentes de grau.`,
    specs: [
      s("Referência", "RW7001"),
      s("Formato da armação", "Retangular"),
      s("Cor", "Preto translúcido"),
      s("Lentes", "Transparentes"),
      s("Ajustes", "Dobradiças com abertura ampliada, plaquetas nasais intercambiáveis e hastes ajustáveis"),
      s("Câmera", "Ultra-angular de 12 MP"),
      s("Fotos", "3024 × 4032 pixels"),
      s("Vídeo", "Até 3K Ultra HD a 30 fps"),
      s("Áudio", "Dois alto-falantes open-ear"),
      s("Microfones", "Sistema de 6 microfones"),
      s("Assistente", "Meta AI"),
      s("Armazenamento", "32 GB"),
      s("Bateria", "Mais de 8 horas"),
      s("Estojo carregador", "Até 48 horas adicionais"),
      s("Conectividade", "Bluetooth 5.3 e Wi-Fi 6"),
      s("Lentes de grau", "Compatível"),
    ],
    seoTitle: "Ray-Ban Meta Blayzer Optics Gen 2 preto translúcido",
    seoDescription: "Ray-Ban Meta Blayzer Optics Gen 2 (RW7001): retangular para lentes de grau, câmera 12 MP, vídeo 3K, Meta AI e 8 h de bateria.",
  },

  "demo-ray-ban-meta-gatinho": {
    // Modelo confirmado pelo lojista em 17/11/2026 (catálogo oficial Ray-Ban): referência RW4015.
    name: "[DEMO] Ray-Ban Meta Zena (Gen 3)",
    model: "Zena (Gen 3) · RW4015",
    shortDescription: "Design cat-eye em preto brilhante, com linhas elegantes, câmera de 12 MP, áudio open-ear e Meta AI." + DEMO_NOTE,
    description: `O Ray-Ban Meta Zena Gen 3 apresenta design cat-eye, com armação preta brilhante e linhas elegantes. Combina estilo sofisticado com tecnologia inteligente, oferecendo captura de fotos e vídeos, áudio integrado e interação com a Meta AI.

## Diferenciais
- Formato cat-eye com linhas elegantes, em preto brilhante.
- Câmera ultra-angular de 12 MP, com fotos de 3024 × 4032 pixels e vídeos em até 3K Ultra HD a 30 fps.
- Dois alto-falantes open-ear e sistema de 6 microfones.
- Assistente Meta AI.
- Até 9 horas de bateria e até 50 horas adicionais com o estojo carregador.

## Armação e lentes
- Formato: cat-eye (gatinho).
- Cor: preto brilhante.
- Lentes Transitions, conforme a versão: claras em ambientes internos e mais escuras sob o sol.
- Compatível com lentes de grau.`,
    specs: [
      s("Referência", "RW4015"),
      s("Formato da armação", "Cat-eye (gatinho)"),
      s("Cor", "Preto brilhante"),
      s("Lentes", "Transitions, conforme a versão"),
      s("Câmera", "Ultra-angular de 12 MP"),
      s("Fotos", "3024 × 4032 pixels"),
      s("Vídeo", "Até 3K Ultra HD a 30 fps"),
      s("Áudio", "Dois alto-falantes open-ear"),
      s("Microfones", "Sistema de 6 microfones"),
      s("Assistente", "Meta AI"),
      s("Armazenamento", "32 GB"),
      s("Bateria", "Até 9 horas"),
      s("Estojo carregador", "Até 50 horas adicionais"),
      s("Conectividade", "Bluetooth 5.3 e Wi-Fi 6"),
      s("Lentes de grau", "Compatível"),
    ],
    seoTitle: "Ray-Ban Meta Zena Gen 3 preto brilhante",
    seoDescription: "Ray-Ban Meta Zena Gen 3 (RW4015): cat-eye preto brilhante, câmera 12 MP, vídeo 3K, Meta AI e até 9 h de bateria.",
    review: "As fotos frontal e traseira do Zena mostram lente verde, diferente da lente clara/Transitions das fotos laterais. Confirmar se é a mesma variante.",
  },

  "demo-ray-ban-meta-clubmaster": {
    // Código gravado na haste (lido nas fotos): "RAY-BAN META · AUDIO · CLUBMASTER · ESSILORLUXOTTICA".
    name: "[DEMO] Ray-Ban Meta Audio Clubmaster",
    shortDescription: "O clássico browline com áudio inteligente e Meta AI. Modelo somente de áudio: não possui câmera." + DEMO_NOTE,
    description: `O estilo retrô do Clubmaster, com a parte superior marcante em preto e o aro inferior dourado, agora com áudio inteligente. Ouça músicas e podcasts, atenda chamadas e converse com a Meta AI sem tirar o celular do bolso.

Importante: o Ray-Ban Meta Audio Clubmaster é um modelo somente de áudio. Ele não possui câmera e não tira fotos nem grava vídeos.

## Diferenciais
- Design clássico browline, com acabamento preto e dourado.
- Alto-falantes open-ear: você ouve o áudio sem tampar os ouvidos.
- Conjunto de 6 microfones para chamadas e comandos de voz.
- Tradução em tempo real com a Meta AI.
- Até 12 horas de bateria e até 48 horas adicionais com o estojo carregador.

## Armação e lentes
- Formato: browline (Clubmaster).
- Cor: preto e dourado.
- Lentes: as imagens do produto mostram versão com lente verde e versão com lente clara que escurece com a luz. Confirme a lente da unidade antes da compra.
- Compatível com lentes de grau.`,
    specs: [
      s("Formato da armação", "Browline (Clubmaster)"),
      s("Cor", "Preto e dourado"),
      s("Câmera", "Não possui (modelo somente de áudio)"),
      s("Assistente", "Meta AI integrada"),
      s("Áudio", "Alto-falantes open-ear"),
      s("Microfones", "Conjunto de 6"),
      s("Funções", "Músicas, podcasts, chamadas, envio e recebimento de mensagens"),
      s("Tradução", "Em tempo real"),
      s("Bateria", "Até 12 horas"),
      s("Estojo carregador", "Até 48 horas adicionais"),
      s("Conectividade", "Bluetooth 5.3"),
      s("Lentes de grau", "Compatível"),
    ],
    seoTitle: "Ray-Ban Meta Audio Clubmaster preto e dourado",
    seoDescription: "Ray-Ban Meta Audio Clubmaster: óculos com áudio open-ear, 6 microfones, Meta AI e até 12 h de bateria. Modelo sem câmera.",
  },

  "demo-ray-ban-meta-piloto": {
    // Modelo confirmado pelo lojista em 17/11/2026 (catálogo oficial Ray-Ban): referência RW4016,
    // variante Havana com lentes Transparentes/Marrom Transitions.
    name: "[DEMO] Ray-Ban Meta Aviator (Gen 3)",
    model: "Aviator (Gen 3) · RW4016",
    shortDescription: "O tradicional design aviador em acabamento Havana, com lentes Transitions que escurecem ao sol." + DEMO_NOTE,
    description: `O Ray-Ban Meta Aviator Gen 3 combina o tradicional design aviador com tecnologia inteligente. Possui armação injetada com acabamento Havana, formato piloto e lentes fotocromáticas que escurecem com a exposição à luz solar e clareiam em ambientes internos.

## Diferenciais
- Formato piloto clássico, com lentes amplas.
- Lentes Transitions: transparentes em ambientes internos e marrons sob o sol.
- Câmera ultra-angular de 12 MP, com fotos de 3024 × 4032 pixels e vídeos em até 3K Ultra HD a 30 fps.
- Dois alto-falantes open-ear e sistema de 6 microfones.
- Até 9 horas de bateria e até 50 horas adicionais com o estojo carregador.

## Armação e lentes
- Formato: piloto (aviador).
- Armação: injetada, acabamento Havana.
- Lentes da variante das fotos: Transparentes/Marrom Transitions.
- Compatível com lentes de grau.`,
    specs: [
      s("Referência", "RW4016"),
      s("Formato da armação", "Piloto (aviador)"),
      s("Armação", "Injetada, acabamento Havana"),
      s("Lentes", "Transparentes/Marrom Transitions (variante das fotos)"),
      s("Câmera", "Ultra-angular de 12 MP"),
      s("Fotos", "3024 × 4032 pixels"),
      s("Vídeo", "Até 3K Ultra HD a 30 fps"),
      s("Áudio", "Dois alto-falantes open-ear"),
      s("Microfones", "Sistema de 6 microfones"),
      s("Assistente", "Meta AI"),
      s("Armazenamento", "32 GB"),
      s("Bateria", "Até 9 horas"),
      s("Estojo carregador", "Até 50 horas adicionais"),
      s("Conectividade", "Bluetooth 5.3 e Wi-Fi 6"),
      s("Lentes de grau", "Compatível"),
    ],
    seoTitle: "Ray-Ban Meta Aviator Gen 3 Havana Transitions",
    seoDescription: "Ray-Ban Meta Aviator Gen 3 (RW4016) Havana com lentes Transitions marrom: câmera 12 MP, vídeo 3K, Meta AI e 9 h de bateria.",
  },

  "demo-ray-ban-meta-skyler": {
    name: "[DEMO] Ray-Ban Meta Skyler",
    shortDescription: "Armação cat-eye de linhas elegantes e formato diferenciado, com câmera, áudio open-ear e Meta AI." + DEMO_NOTE,
    description: `O Skyler traz linhas femininas e elegantes em formato cat-eye, para quem quer registrar momentos, ouvir música e falar com a Meta AI com um visual sofisticado.

## Diferenciais
- Formato cat-eye com linhas elegantes.
- Câmera integrada para fotos e vídeos do seu ponto de vista.
- Áudio open-ear para músicas, podcasts e chamadas.
- Controles por toque na haste e comandos de voz.

## Armação e lentes
- Formato: cat-eye.
- Cor: preto.
- Lentes: verdes polarizadas (identificadas pelo "P" gravado na lente nas fotos).
- Compatível com lentes de grau.

## Sobre a geração
A geração deste modelo ainda está sendo confirmada. Resolução de vídeo, bateria e armazenamento serão informados após a confirmação.`,
    specs: [
      s("Formato da armação", "Cat-eye"),
      s("Cor", "Preto"),
      s("Lentes", "Verdes polarizadas"),
      s("Câmera", "Integrada, para fotos e vídeos"),
      s("Áudio", "Open-ear"),
      s("Microfones", "Integrados"),
      s("Assistente", "Meta AI"),
      s("Funções", "Chamadas, músicas e podcasts"),
      s("Controles", "Toque e voz"),
      s("Aplicativo", "Compatível com o app Meta AI"),
      s("Lentes de grau", "Compatível"),
    ],
    seoTitle: "Ray-Ban Meta Skyler preto",
    seoDescription: "Óculos inteligente Ray-Ban Meta Skyler cat-eye preto, com lentes polarizadas, câmera, áudio open-ear e Meta AI.",
    pending: "Geração do Skyler (Gen 1 ou Gen 2) não confirmada: números de vídeo, bateria e armazenamento não publicados.",
  },

  "demo-ray-ban-meta-wayfarer": {
    name: "[DEMO] Ray-Ban Meta Wayfarer",
    shortDescription: "O ícone Wayfarer com câmera, áudio open-ear e Meta AI. Disponível em preto, azul brilhante e preto fosco." + DEMO_NOTE,
    description: `O formato mais reconhecido da Ray-Ban, com armação robusta e visual clássico, agora com tecnologia inteligente: registre o que você vê, ouça músicas e fale com a Meta AI sem pegar o celular.

## Diferenciais
- Formato Wayfarer icônico, quadrado/trapezoidal.
- Câmera integrada para fotos e vídeos do seu ponto de vista.
- Alto-falantes open-ear e microfones para chamadas e mensagens.
- Comandos de voz e controles por toque.

## Cores e lentes
- Preto: lente fotocromática, clara em ambientes internos e escura sob o sol.
- Azul brilhante: lente fotocromática, clara em ambientes internos e escura sob o sol.
- Preto fosco: lente polarizada (identificada pelo "P" gravado na lente).
- Opções de lentes solares e de grau.

## Sobre a geração
A geração deste modelo ainda está sendo confirmada. Resolução de vídeo, bateria e armazenamento serão informados após a confirmação.`,
    specs: [
      s("Formato da armação", "Wayfarer (quadrado/trapezoidal)"),
      s("Cores", "Preto, azul brilhante e preto fosco"),
      s("Lentes", "Fotocromáticas (preto e azul brilhante); polarizada (preto fosco)"),
      s("Câmera", "Integrada, para fotos e vídeos"),
      s("Assistente", "Meta AI"),
      s("Áudio", "Alto-falantes open-ear"),
      s("Microfones", "Integrados"),
      s("Funções", "Chamadas, mensagens, músicas e podcasts"),
      s("Controles", "Toque e voz"),
      s("Aplicativo", "Compatível com o app Meta AI"),
      s("Lentes de grau", "Opções solares e de grau"),
    ],
    seoTitle: "Ray-Ban Meta Wayfarer",
    seoDescription: "Ray-Ban Meta Wayfarer com câmera, áudio open-ear e Meta AI, em preto, azul brilhante e preto fosco polarizado.",
    pending: "Geração do Wayfarer não confirmada: números de vídeo, bateria e armazenamento não publicados.",
  },

  // ───────────────────────── Meta Glasses ─────────────────────────
  "demo-meta-capri": {
    name: "[DEMO] Meta Capri",
    shortDescription: "Formato cat-eye de linhas femininas: design sofisticado com tecnologia inteligente para o dia a dia." + DEMO_NOTE,
    description: `O Meta Capri combina design sofisticado com tecnologia inteligente, ideal para quem procura estilo, conectividade e praticidade no cotidiano.

## Diferenciais
- Formato cat-eye elegante, com linhas femininas.
- Duas versões: tartaruga com lentes transparentes, para o dia a dia, e cinza translúcido com lentes escuras, para o sol.
- Toda a tecnologia da linha Meta Glasses em uma armação delicada.

${META_GLASSES_FEATURES}

## Armação e lentes
- Formato: cat-eye.
- Tartaruga: lentes transparentes.
- Cinza translúcido: lentes escuras.`,
    specs: [s("Formato da armação", "Cat-eye"), s("Cores", "Tartaruga; cinza translúcido"), s("Lentes", "Transparentes (tartaruga); escuras (cinza translúcido)"), ...META_GLASSES_SPECS],
    seoTitle: "Meta Capri cat-eye",
    seoDescription: "Óculos inteligente Meta Capri cat-eye, tartaruga ou cinza translúcido, com câmera 3K, Meta AI, áudio open-ear e tradução.",
  },

  "demo-meta-fury": {
    name: "[DEMO] Meta Fury",
    shortDescription: "Armação robusta, com design arrojado e esportivo, e lentes em marrom degradê." + DEMO_NOTE,
    description: `Um modelo de personalidade forte, para quem procura um visual marcante aliado à captura de momentos, ao áudio inteligente e aos recursos de IA.

## Diferenciais
- Armação robusta e arrojada, de inspiração esportiva.
- Lentes em marrom degradê: mais escuras no topo e mais claras na base.
- Toda a tecnologia da linha Meta Glasses.

${META_GLASSES_FEATURES}

## Armação e lentes
- Formato: quadrado robusto.
- Cor: preto.
- Lentes: marrom degradê.`,
    specs: [s("Formato da armação", "Quadrado robusto"), s("Cor", "Preto"), s("Lentes", "Marrom degradê"), ...META_GLASSES_SPECS],
    seoTitle: "Meta Fury preto",
    seoDescription: "Óculos inteligente Meta Fury, armação preta robusta e lente marrom degradê, com câmera 3K, Meta AI e áudio open-ear.",
  },

  "demo-meta-starfire": {
    name: "[DEMO] Meta Starfire",
    shortDescription: "Formato oval fino, moderno e minimalista, com armação preta e lentes escuras." + DEMO_NOTE,
    description: `Perfil elegante e discreto: o Meta Starfire combina um visual contemporâneo com câmera inteligente, áudio integrado e recursos da Meta AI.

## Diferenciais
- Formato oval fino, moderno e minimalista.
- Armação preta com lentes escuras, para o sol.
- Toda a tecnologia da linha Meta Glasses em um perfil discreto.

${META_GLASSES_FEATURES}

## Armação e lentes
- Formato: oval fino.
- Cor: preto.
- Lentes: escuras.`,
    specs: [s("Formato da armação", "Oval fino"), s("Cor", "Preto"), s("Lentes", "Escuras"), ...META_GLASSES_SPECS],
    seoTitle: "Meta Starfire preto",
    seoDescription: "Óculos inteligente Meta Starfire oval fino preto, com lentes escuras, câmera 3K, Meta AI, áudio open-ear e tradução.",
  },

  "demo-meta-adventurer": {
    name: "[DEMO] Meta Adventurer",
    shortDescription: "Formato retangular clássico, versátil para o uso diário, com câmera, áudio e Meta AI." + DEMO_NOTE,
    description: `Um modelo versátil para o dia a dia, que combina design tradicional, tecnologia inteligente, captura de fotos e vídeos e interação por voz com a Meta AI.

## Diferenciais
- Formato retangular clássico, de linhas marcantes.
- Duas versões: preto com lentes escuras e cinza translúcido com lentes rosadas.
- Toda a tecnologia da linha Meta Glasses.

${META_GLASSES_FEATURES}

## Armação e lentes
- Formato: retangular.
- Preto: lentes escuras.
- Cinza translúcido: lentes em tom rosado.`,
    specs: [s("Formato da armação", "Retangular"), s("Cores", "Preto; cinza translúcido"), s("Lentes", "Escuras (preto); rosadas (cinza translúcido)"), ...META_GLASSES_SPECS],
    seoTitle: "Meta Adventurer retangular",
    seoDescription: "Óculos inteligente Meta Adventurer retangular, preto ou cinza translúcido, com câmera 3K, Meta AI e áudio open-ear.",
  },

  // ───────────────────────── Oakley Meta ─────────────────────────
  "demo-oakley-meta-vanguard": {
    name: "[DEMO] Oakley Meta Vanguard",
    shortDescription: "Óculos esportivo envolvente, com lente ampla tipo shield, câmera ultra-angular de 122° e resistência IP67." + DEMO_NOTE,
    description: `Feito para treinar: o Oakley Meta Vanguard tem formato envolvente, lente ampla tipo shield e estrutura desenvolvida para atividades físicas. Grave seus treinos em 3K, ouça música com o vento a favor e acompanhe seus dados integrados ao Garmin e ao Strava.

## Diferenciais
- Câmera ultra-angular de 12 MP com campo de visão de 122°, posicionada no centro da armação.
- Gravação em 3K Ultra HD, com captura automática, hyperlapse e câmera lenta.
- Estabilização de vídeo ajustável.
- Áudio open-ear otimizado para ambientes com vento e 5 microfones.
- Integração com Garmin e Strava.
- Resistência IP67 contra poeira e água.

## Armação e lentes
- Formato: envolvente, com lente única tipo shield.
- Cor: preto.
- Lente das fotos: dourada espelhada da linha Prizm.
- Lentes Prizm e Prizm Transitions, conforme a versão escolhida.`,
    specs: [
      s("Formato da armação", "Envolvente, lente tipo shield"),
      s("Cor", "Preto"),
      s("Lentes", "Prizm e Prizm Transitions, conforme a versão (foto: dourada espelhada)"),
      s("Câmera", "Ultra-angular de 12 MP"),
      s("Campo de visão", "122°"),
      s("Vídeo", "3K Ultra HD, hyperlapse e câmera lenta"),
      s("Recursos de câmera", "Captura automática e estabilização ajustável"),
      s("Áudio", "Open-ear, otimizado para vento"),
      s("Microfones", "5"),
      s("Assistente", "Meta AI"),
      s("Integrações", "Garmin e Strava"),
      s("Armazenamento", "32 GB"),
      s("Bateria", "Até 9 horas de uso"),
      s("Estojo carregador", "Até 36 horas adicionais"),
      s("Resistência", "IP67 (poeira e água)"),
    ],
    seoTitle: "Oakley Meta Vanguard",
    seoDescription: "Oakley Meta Vanguard: óculos esportivo com câmera de 122°, vídeo 3K, Garmin e Strava, 9 h de bateria e resistência IP67.",
  },

  "demo-oakley-meta-hstn": {
    name: "[DEMO] Oakley Meta HSTN",
    shortDescription: "Modelo esportivo de formato arredondado e armação robusta, com câmera 3K e resistência a respingos e suor (IPX4)." + DEMO_NOTE,
    description: `A identidade da Oakley em um formato arredondado e robusto, com câmera ultra-angular, áudio open-ear e Meta AI, para o esporte e para o dia a dia.

## Diferenciais
- Câmera ultra-angular de 12 MP com campo de visão de 100° e vídeos em 3K.
- Alto-falantes Bluetooth open-ear e conjunto de 5 microfones.
- Integração com Garmin e Strava.
- Até 8 horas de bateria e até 48 horas adicionais com o estojo carregador.
- Resistência IPX4 a respingos e suor (não é à prova d'água).

## Armação e lentes
- Formato: arredondado, armação robusta.
- Cor: preto fosco.
- Lente das fotos: clara que escurece em tom roxo com a luz.
- Opções de lentes Prizm, polarizadas, transparentes e Transitions, conforme a versão.
- Compatível com lentes de grau.`,
    specs: [
      s("Formato da armação", "Arredondado, robusto"),
      s("Cor", "Preto fosco"),
      s("Lentes", "Prizm, polarizadas, transparentes e Transitions, conforme a versão"),
      s("Câmera", "Ultra-angular de 12 MP"),
      s("Campo de visão", "100°"),
      s("Vídeo", "3K"),
      s("Áudio", "Alto-falantes Bluetooth open-ear"),
      s("Microfones", "Conjunto de 5"),
      s("Assistente", "Meta AI"),
      s("Funções", "Chamadas, músicas e podcasts"),
      s("Integrações", "Garmin e Strava"),
      s("Armazenamento", "32 GB"),
      s("Bateria", "Até 8 horas"),
      s("Estojo carregador", "Até 48 horas adicionais"),
      s("Resistência", "IPX4 (respingos e suor)"),
      s("Lentes de grau", "Compatível"),
    ],
    seoTitle: "Oakley Meta HSTN preto fosco",
    seoDescription: "Oakley Meta HSTN: câmera 12 MP de 100°, vídeo 3K, áudio open-ear, Garmin e Strava, 8 h de bateria e resistência IPX4.",
  },
};

/** Texto que o seed antigo gravava: produtos ainda com ele recebem o conteúdo acima. */
export const DEMO_PLACEHOLDER_PREFIX = "Este é um produto de demonstração criado pelo seed";

/**
 * SHA-256 das descrições que versões anteriores DESTE arquivo já gravaram no banco.
 * Se a descrição atual do produto bate com uma delas, ninguém a editou no painel e ela
 * pode ser atualizada; se foi editada, o conteúdo do painel é preservado.
 */
export const PREVIOUS_SEEDED_DESCRIPTION_HASHES = new Set([
  "9040f71eb70f15d6128ea4ff3a43041c878f0a91b285875a71a36a3b154ccf29", // retangular v1
  "4ba6e0cb86aa4592afc06558f3b56cd47edf9e6dbf095001c9e97adc44cfb74b", // gatinho v1
  "bceb7f8913a2cb9bfe6ac1d47b29b53a16ecef1257905ff07472d0f0e509b8ff", // piloto v1
  "b3785390a9cf94bdb91b3fbc9c4c4f226c0f76d63ddbcce3a3170353e0b7d76d", // wayfarer v1 (cor "Preto brilhante" → "Preto")
]);

/** Nomes que o seed já usou: o nome só é trocado se ainda for um destes (nunca sobrescreve edição do painel). */
export const LEGACY_DEMO_NAMES: Record<string, string[]> = {
  "demo-ray-ban-meta-clubmaster": ["[DEMO] Ray-Ban Meta Clubmaster"],
  "demo-ray-ban-meta-retangular": ["[DEMO] Ray-Ban Meta Retangular"],
  "demo-ray-ban-meta-gatinho": ["[DEMO] Ray-Ban Meta Gatinho"],
  "demo-ray-ban-meta-piloto": ["[DEMO] Ray-Ban Meta Piloto"],
};

/** Valores do campo "modelo" que o seed já usou (mesma regra dos nomes). */
export const LEGACY_DEMO_MODELS: Record<string, string[]> = {
  "demo-ray-ban-meta-retangular": ["Retangular"],
  "demo-ray-ban-meta-gatinho": ["Gatinho"],
  "demo-ray-ban-meta-piloto": ["Piloto"],
};
