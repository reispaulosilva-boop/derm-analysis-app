# DermAnalysis — Brainstorm de Design

## Contexto
Ferramenta clínica pessoal para dermatologista. Uso principal: espelhamento do iPhone 15 Pro na Apple TV durante consultas. Duas funcionalidades centrais: (1) análise visual de pele com marcadores de manchas, eritema, rugas, etc. e (2) comparação antes/depois. Inspiração: Vectra 3D da Canfield Scientific.

---

<response>
## Ideia 1 — "Clinical Precision" (Estética Médica Instrumental)

<text>

**Design Movement**: Inspirado em interfaces de equipamentos médicos de alta precisão (Vectra, VISIA, Canfield). Estética de "instrumento científico digital" — limpa, precisa, com foco total na imagem.

**Core Principles**:
1. A imagem do paciente é o protagonista absoluto — tudo ao redor serve para apoiá-la
2. Controles contextuais que aparecem apenas quando necessários (progressive disclosure)
3. Tipografia monoespacada para dados numéricos, sans-serif humanista para labels
4. Fundo escuro (dark mode obrigatório) para maximizar contraste das fotos de pele

**Color Philosophy**: Fundo quase-preto (#0A0E14) com acentos em azul-ciano médico (#00B4D8) para controles ativos, e tons de cinza neutro para hierarquia. Vermelho (#FF4444) reservado exclusivamente para marcadores de eritema. Amarelo (#FFB800) para manchas. A paleta é funcional, não decorativa — cada cor tem significado clínico.

**Layout Paradigm**: Layout de "lightbox médico" — a imagem ocupa 80%+ da viewport. Controles em barra lateral colapsável à esquerda. Toolbar flutuante na parte inferior com botões de análise. No modo comparação, split-screen com slider central. Zero chrome desnecessário.

**Signature Elements**:
1. Crosshair/retícula sutil sobre a imagem (como em equipamentos de imagem médica)
2. Indicadores de zona com halo pulsante nos pontos de análise
3. Barra de ferramentas com ícones circulares estilo "instrumento de precisão"

**Interaction Philosophy**: Toque preciso — pinch-to-zoom suave, tap para marcar pontos, long-press para menu contextual. Gestos naturais do iOS. Haptic feedback visual (pulse animations) ao marcar áreas.

**Animation**: Transições de 200ms com easing cubic-bezier. Fade-in suave dos painéis. Zoom elástico nas imagens. Marcadores aparecem com scale-up + pulse. Nenhuma animação decorativa — tudo funcional.

**Typography System**: 
- Dados/métricas: JetBrains Mono (monoespacada, legibilidade em números)
- Labels/UI: DM Sans (geométrica, limpa, médica)
- Títulos: DM Sans Bold

</text>
<probability>0.08</probability>
</response>

---

<response>
## Ideia 2 — "Derma Canvas" (Estética Editorial Científica)

<text>

**Design Movement**: Inspirado em publicações científicas premium e interfaces de edição fotográfica profissional (Lightroom, Capture One). Elegância editorial com funcionalidade clínica.

**Core Principles**:
1. Hierarquia visual clara com tipografia editorial forte
2. Espaço generoso entre elementos — a interface "respira"
3. Cards e painéis com bordas sutis e sombras suaves (glassmorphism leve)
4. Modo claro com acentos escuros para uso em ambiente de consultório bem iluminado

**Color Philosophy**: Base em off-white quente (#F8F6F3) com texto em grafite profundo (#1A1A2E). Acentos em verde-azulado clínico (#2D8B7A) — cor associada a saúde e confiança. Tons terracota (#C4704B) para alertas e marcadores de inflamação. A paleta transmite "ciência com humanidade".

**Layout Paradigm**: Grid assimétrico inspirado em revistas médicas. Coluna principal larga para a imagem, coluna lateral estreita para controles e informações. Na comparação, layout de "spread" editorial com as duas imagens lado a lado como páginas de um atlas dermatológico.

**Signature Elements**:
1. Badges de avaliação com design de "selo científico" (círculo com score numérico)
2. Linhas de conexão elegantes entre marcadores e suas legendas
3. Transição de página estilo "virar folha" entre modos de análise

**Interaction Philosophy**: Fluida e gestual. Swipe para navegar entre fotos. Drag para posicionar marcadores. Slider elegante para comparação. Tudo otimizado para touch em tela grande (TV) e pequena (iPhone).

**Animation**: Spring animations com framer-motion. Cards entram com stagger. Marcadores "brotam" com spring physics. Transições entre views com morphing suave. Micro-interações em hover/tap.

**Typography System**:
- Títulos: Playfair Display (serifada, editorial, autoridade)
- Body/Labels: Source Sans 3 (legível, profissional)
- Dados: Tabular numbers de Source Sans 3

</text>
<probability>0.06</probability>
</response>

---

<response>
## Ideia 3 — "SkinScope" (Estética de Instrumento Digital Moderno)

<text>

**Design Movement**: Inspirado em interfaces de dispositivos médicos modernos (Apple Health, dispositivos Withings) e dashboards de análise. Minimalismo funcional com toques de sofisticação tecnológica.

**Core Principles**:
1. Mobile-first radical — projetado para o iPhone 15 Pro como dispositivo primário
2. Navegação por gestos e tabs, sem menus complexos
3. Feedback visual imediato em cada interação
4. Adaptação inteligente quando detecta tela grande (Apple TV via AirPlay)

**Color Philosophy**: Fundo escuro profundo (#0C1117) com gradiente sutil para (#141B24). Acentos em teal vibrante (#14B8A6) para ações primárias. Sistema de cores semânticas para análise: vermelho-coral para eritema, âmbar para manchas, lavanda para textura/rugas, verde-menta para áreas saudáveis. Cada cor de análise tem versão sólida (marcador) e translúcida (overlay/heatmap).

**Layout Paradigm**: Stack vertical no mobile com seções expansíveis. A imagem sempre ocupa a largura total. Toolbar fixa na parte inferior (thumb zone do iPhone). No modo TV/landscape, reorganiza para layout de cockpit com imagem central e painéis laterais. Bottom sheet para controles detalhados.

**Signature Elements**:
1. Overlay de "heatmap" translúcido sobre áreas de interesse (como termografia)
2. Gauge circular animado para scores de cada parâmetro (manchas, eritema, rugas)
3. Dot indicators pulsantes nos pontos de análise com tooltip ao toque

**Interaction Philosophy**: Nativa do iOS — bottom sheets, haptic-style animations, gestos de swipe. Pinch-to-zoom com inércia. Double-tap para zoom 1:1. Shake para reset de zoom. Tudo pensado para operação com uma mão durante a consulta.

**Animation**: Micro-animações com framer-motion. Gauges preenchem com animação de progresso. Overlays aparecem com fade + blur. Transições entre abas com slide horizontal. Loading states com skeleton screens. Tudo a 60fps.

**Typography System**:
- Títulos: Outfit (geométrica moderna, tech-forward)
- Body/Labels: Outfit Regular (consistência visual)
- Dados/Scores: Outfit Semibold com tabular-nums

</text>
<probability>0.07</probability>
</response>

---

## Decisão

**Abordagem escolhida: Ideia 3 — "SkinScope"**

Justificativa: É a abordagem mais alinhada com o caso de uso real — operação mobile-first no iPhone 15 Pro com espelhamento na Apple TV. O design de "instrumento digital moderno" equilibra profissionalismo clínico com usabilidade touch. O sistema de cores semânticas para análise (eritema, manchas, rugas) é o mais funcional das três opções. A adaptação inteligente para tela grande é um diferencial crítico para o workflow do Dr. Paulo.
