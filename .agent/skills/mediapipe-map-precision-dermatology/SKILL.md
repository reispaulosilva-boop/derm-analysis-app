---
name: mediapipe-map-precision-dermatology
description: Integra a malha geométrica do Google MediaPipe Face Mesh com a metodologia de mapeamento facial E-BOOK MAP 1.0 (Galderma). Use para diagnósticos de precisão, planejamento de injetáveis e simulações estéticas avançadas.
---

# MediaPipe MAP Precision Dermatology Skill

Esta skill de nível profissional funde a visão computacional de alta performance do Google com a semântica clínica da metodologia MAP (My Aesthetic Plan). Ela permite que o agente atue como um consultor técnico-médico, traduzindo coordenadas 3D em decisões clínicas fundamentadas.

## 1. Matriz de Correlação: MediaPipe vs. Metodologia MAP

Abaixo, a tabela de mapeamento entre os Landmarks (IDs) do MediaPipe e as zonas de tratamento clínico do E-BOOK MAP 1.0.

| Zona MAP (Terço) | Região Anatômica | Landmarks MediaPipe (IDs Críticos) | Aplicação Clínica |
| :--- | :--- | :--- | :--- |
| **Superior** | Glabela / Fronte | 10, 151, 9, 8, 168, 6 | Monitoramento de rugas dinâmicas (Toxina Botulínica). |
| **Superior** | Periocular | 33, 133, 157, 158, 159, 160, 161 (L) / 263, 362, 384, 385, 386, 387, 388 (R) | Análise de "pés de galinha" e abertura do rebordo orbital. |
| **Médio** | Zigomático-Malar | 116, 117, 118, 119, 120, 121 (L) / 345, 346, 347, 348, 349, 350 (R) | Pontos de sustentação e lifting (Preenchedores/Bioestimuladores). |
| **Médio** | Sulco Nasogeniano | 205, 425, 123, 352 | Profundidade do sulco e perda de volume do compartimento de gordura malar. |
| **Inferior** | Lábios / Perioral | 0, 11, 12, 13, 14, 15, 16, 17, 37, 267 | Volume labial, contorno e rugas periorais ("código de barras"). |
| **Inferior** | Mento / Mandíbula | 152, 148, 176, 199, 200, 201 | Projeção mentoniana e definição da linha mandibular. |

## 2. Procedimento de Análise de Precisão

Ao ser ativada, o agente deve seguir o protocolo de auditoria em 4 etapas:

### Etapa A: Calibração de Profundidade (Z-Axis)
- Utilizar a profundidade relativa dos pontos (eixo Z do MediaPipe) para estimar a perda de volume em compartimentos de gordura superficiais e profundos, conforme descrito no Capítulo 3 do MAP 1.0.

### Etapa B: Análise de Dinâmica Facial
- Comparar os landmarks em estado de repouso vs. contração máxima.
- **Cálculo de Vetores:** Medir o deslocamento dos pontos na glabela e periocular para sugerir dosagens de toxina botulínica baseadas na força muscular detectada.

### Etapa C: Mapeamento de Pontos de Injeção
- Sobrepor os pontos de aplicação sugeridos no MAP 1.0 (ex: Pontos de sustentação malar) aos landmarks exatos do MediaPipe para guiar o desenvolvedor na criação de overlays de Realidade Aumentada (AR).

### Etapa D: Simulação de Resultados (Previsibilidade)
- Projetar o deslocamento dos landmarks após a "reposição de volume" virtual, simulando o efeito de lifting descrito na metodologia Galderma.

## 3. Diretrizes de Desenvolvimento (MVP)

- **Privacidade:** Processar todos os dados do MediaPipe no lado do cliente (Client-side) usando TensorFlow.js ou MediaPipe Solutions for Web.
- **Visualização:** Utilizar `canvas` para desenhar a malha facial, destacando em cores diferentes as zonas de risco anatômico (ex: Forame Infraorbitário - próximo aos pontos 123/352).
- **Persistência:** Salvar apenas os vetores de deslocamento e metadados anatômicos no Supabase, nunca a imagem bruta do paciente, para conformidade com LGPD/HIPAA.

## 4. Exemplo de Prompt de Ativação

"Utilize a skill `mediapipe-map-precision-dermatology` para analisar um vídeo de contração da fronte. Identifique os vetores de força muscular baseados nos landmarks 10 a 168 e sugira o plano de aplicação de toxina botulínica seguindo o protocolo do Terço Superior do MAP 1.0."
