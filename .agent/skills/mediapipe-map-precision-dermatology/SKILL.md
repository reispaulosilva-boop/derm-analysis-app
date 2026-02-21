---
name: mediapipe-map-precision-dermatology
description: Integra a malha geométrica do Google MediaPipe Face Mesh com a metodologia de mapeamento facial E-BOOK MAP 1.0 (Galderma). Use para diagnósticos de precisão, planejamento de injetáveis e simulações estéticas avançadas. Ative esta skill sempre que precisar identificar, extrair índices ou processar deslocamento geométrico dos marcos 3D do rastreador, invocar lógica preditiva de reologia (FEM) ou aplicar protocolos de Reflation/simulação de HA.
---

# MediaPipe MAP Precision Dermatology Skill

Esta skill de nível profissional funde a visão computacional de alta performance do Google com a semântica clínica da metodologia MAP (My Aesthetic Plan). Ela permite que o agente atue como um consultor técnico-médico, traduzindo coordenadas 3D em decisões clínicas fundamentadas.

---

## 1. Princípios Fundamentais — Regras Imutáveis

### 1.1 Harmonização Individualizada (Anti-Golden-Ratio)

> **NUNCA** imponha a Proporção Áurea (Phi ≈ 1.618), cânones neoclássicos de "terços iguais" ou "quintos verticais" como padrões-alvo universais. Estudos com fotogrametria em painéis de especialistas comprovam que rostos considerados belos se desviam substancialmente dessas métricas rígidas. Algoritmos que forçam convergência geram aparências artificiais e "operadas".

- Priorize a **simetria bilateral relativa** do próprio paciente.
- Avalie o **equilíbrio entre elementos singulares** para fazê-lo "parecer o melhor possível para sua própria idade".
- O sistema deve ser **agnóstico racialmente**: categorias (Caucasiano, Negro, Asiático) são constructos sociológicos e não refletem heterogeneidade biológica real (espessura dérmica, projeção óssea, densidade SMAS).

### 1.2 Espaço 3D Métrico Obrigatório (Procrustes)

Todas as medições clínicas **devem** ser derivadas do Metric 3D Space via Análise de Procrustes do MediaPipe Face Geometry Module (unidade = centímetro):

1. Landmarks normalizados da tela → mapeados provisoriamente para 3D.
2. Procrustes alinha a nuvem de pontos ao **Canonical Face Model** (478 vértices em escala real).
3. Resultado: coordenadas X, Y, Z em **milímetros reais**, permitindo que "1 mL de HA" gere deslocamento proporcional clinicamente correspondente.

**Nunca** use coordenadas normalizadas `[0.0, 1.0]` para cálculos de volume, distância absoluta ou simulação de injeção. Use a **Distância Interocular (IOD)** como fator de normalização escalar invariante:

```
IOD = sqrt((x_E_R - x_E_L)² + (y_E_R - y_E_L)² + (z_E_R - z_E_L)²)
```

### 1.3 Protocolo de Reflation (não Inflation)

A face envelhece por **deflação sinérgica multicamadas** (reabsorção óssea + atrofia adiposa + perda de elasticidade). A abordagem correta é **Reflation** (restauração arquitetônica profunda), não Inflation (preenchimento expansivo superficial).

**Regra de seleção reológica para simulações:**

| Camada-alvo | Tipo de Gel | G' (Firmeza) | Plano de Injeção |
|---|---|---|---|
| Supraperiosteal (Camada V) | Alto G' (ex: NASHA) | Alto | Sob ligamentos, coxins profundos — pilares estruturais |
| Subcutâneo profundo (Camada IV) | Médio G' | Médio | Coxins de gordura profundos, base piriforme |
| Subcutâneo superficial (Camada II) | Baixo G' (ex: OBT) | Baixo | Refinamento de contornos, lábios, sulcos superficiais |

---

## 2. Estratificação Anatômica em 5 Camadas — Modelo para Simulação

O software deve respeitar a arquitetura em 5 camadas da face ao simular deformações:

| Camada | Composição | Implicação para Simulação |
|---|---|---|
| **I — Pele** | Epiderme + Derme (400 µm pálpebras → 2500 µm mento) | Tensão superficial ("efeito tenda"); formação de rítides perpendiculares à contração muscular |
| **II — Gordura Superficial** | Tecido areolar, coxins compartimentalizados | Alta complacência elástica; alvo para modelagem superficial; contém dWAT |
| **III — SMAS/Fáscia** | SMAS (terço médio), TPF (têmporas), Platisma (pescoço) | Rede de suspensão; alta resistência à tração; vetores de lifting |
| **IV — Gordura Profunda** | Espaço de deslizamento, coxins profundos | Suporte estrutural. Deflação → colapso; preencher com alto G' |
| **V — Periósteo** | Fáscia profunda + osso | Condição de contorno rígida (ancoragem basal para deformação) |

**Ligamentos de retenção** (zigomático, orbicular, mandibular) = **pontos de inflexão biomecânica de vetor zero**. Na simulação, o deslocamento tecidual pela injeção sofre resistência máxima nesses pontos; o preenchedor tende a se acumular ou redirecionar.

---

## 3. Mapeamento de Zonas Clínicas — Tabela de Índices MediaPipe

### 3.1 Tabela 2: Coordenadas por Região de Interesse (Injetáveis)

| Região Clínica | Índices MediaPipe (Landmarks) | Aplicação em AR |
|---|---|---|
| **Borda Labial (Vermillion)** | Sup: 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291. Inf: 146, 91, 181, 84, 17, 314, 405, 321, 375, 291 | Proporção labial, eversão de volume, elevação de comissura |
| **Sulco Nasolabial** | Trajetória de 205, 50 → 61, 291 (paralelo à asa nasal); Base nasal: 129, 358 | Re-inflação profunda da base piriforme com gel alto G' |
| **Jawline / Mento** | FACE_OVAL inferior: 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234 + contralateral; Mandíbula completa: 150→152→379→454 | Reposição pré-jowl, bolus supraperiosteal no mento |
| **Zigomático / Malar** | 116, 117, 118, 119, 120, 121 (L) / 345, 346, 347, 348, 349, 350 (R); Proeminência: 207, 427 | Vetores negativos maxilares; elevação infraorbital (ex: 2mm) para tear trough |
| **Periorbital / Pés de Galinha** | FACEMESH_LEFT_EYE, FACEMESH_RIGHT_EYE + anéis do cantus lateral; 33, 133, 157–161 (L) / 263, 362, 384–388 (R) | Âncora clínica; distorção repouso→movimento indica superatividade muscular |
| **Comissuras Labiais / Marionete** | Canto ext. esq: 78; Dir: 308. Desdobramentos inferiores até o rebordo mentoniano | Linhas de marionete; avaliação do Depressor Anguli Oris |
| **Glabela / Fronte** | 10, 151, 9, 8, 168, 6 | Rugas dinâmicas, planejamento de toxina botulínica |
| **Temporal** | Vizinhança ao contorno superior lateral do FACE_OVAL | Atrofia temporal; plano subcutâneo ou supraperiosteal profundo |

### 3.2 Tabela MAP 1.0 — Correlação Galderma

| Zona MAP (Terço) | Região | Landmarks Críticos | Aplicação Clínica |
|---|---|---|---|
| **Superior** | Glabela / Fronte | 10, 151, 9, 8, 168, 6 | Toxina Botulínica — rugas dinâmicas |
| **Superior** | Periocular | 33, 133, 157–161 (L) / 263, 362, 384–388 (R) | Pés de galinha, rebordo orbital |
| **Médio** | Zigomático-Malar | 116–121 (L) / 345–350 (R) | Sustentação e lifting (Preenchedores/Bioestimuladores) |
| **Médio** | Sulco Nasogeniano | 205, 425, 123, 352 | Profundidade do sulco, perda de volume malar |
| **Inferior** | Lábios / Perioral | 0, 11, 12, 13, 14, 15, 16, 17, 37, 267 | Volume labial, contorno, código de barras |
| **Inferior** | Mento / Mandíbula | 152, 148, 176, 199, 200, 201 | Projeção mentoniana, linha mandibular |

---

## 4. Discórdia Dinâmica — Blendshapes (52 Canais)

O MediaPipe exporta **52 coeficientes de blendshape** (scores 0.0 → 1.0) que quantificam micro-movimentos faciais em tempo real.

### 4.1 Regra de Threshold Crítico

> **Se o valor escalar de qualquer blendshape > 0.65**, aplique **automaticamente** fatores restritivos associados a mapas hipotéticos de intervenção com toxina botulínica prévia no vetor de distorção **ANTES** de aplicar a renderização gaussiana ou deformação simulada.

### 4.2 Canais de Interesse Clínico

| Blendshape | Músculo Correlato | Indicação Clínica > 0.65 |
|---|---|---|
| `browInnerUp` | Frontalis (feixe medial) | Rugas glabelares horizontais; candidato a Botox |
| `browOuterUpLeft/Right` | Frontalis (feixe lateral) | Rugas frontais laterais |
| `eyeSquintLeft/Right` | Orbicularis Oculi | Pés de galinha; dose periorbital |
| `mouthSmileLeft/Right` | Zigomático Maior | Avalia recrutamento excessivo no sulco nasolabial |
| `jawOpen` | Pterigóideo/Masseter | Referência de abertura para calibração |
| `mouthPucker` | Orbicularis Oris | Código de barras perioral |
| `mouthFrownLeft/Right` | Depressor Anguli Oris | Linhas de marionete; comissura caída |

### 4.3 Protocolo de Avaliação Dinâmica

1. Capturar landmarks em **repouso** (baseline).
2. Solicitar contração máxima padronizada (levantar sobrancelhas, apertar olhos, sorrir).
3. Calcular `Δ = blendshape_score_contração - blendshape_score_repouso`.
4. Se `Δ > 0.65` → zona hiperativa → prioridade de tratamento com neurotoxina **antes** de volumização.
5. Calcular vetores de deslocamento dos landmarks entre repouso e contração para sugerir dosagens proporcionais.

---

## 5. Galderma FAS™ — Scoring de 5 Domínios

O app deve quantificar desvios através dos 5 domínios da Facial Assessment Scale:

| Domínio | Parâmetros Computacionais | Fonte de Dados |
|---|---|---|
| **Qualidade da Pele** | Textura, porosidade, pigmentação, fotodano | Análise de textura da imagem (separado do Face Mesh) |
| **Formato do Rosto** | Geometria facial (Oval, Coração, Redondo, Angular) | `evaluateFaceShape()` em `faceGeometry.ts` |
| **Proporções** | Terços horizontais, quintos verticais, índice facial | `extractFacialMetrics()` em `morphometrics.ts` |
| **Simetria** | Desvio bilateral IOD-normalizado | `calculateDistanceSymmetry()` em `morphometrics.ts` |
| **Expressão** | Rítides dinâmicas, recrutamento muscular | Blendshapes 52 canais (threshold > 0.65) |

### Modificadores de Elasticidade por Idade

A complacência mecânica da pele **varia drasticamente** com idade/fotodano:

- **Facial Fat Fitness**: Tecido adiposo "saudável" (hiperplásico) → alta complacência; "não saudável" (hipertrófico/senescente) → fibrose, baixa rigidez.
- Algoritmos preditivos devem incorporar **modificadores de elasticidade** baseados em:
  - Idade presumida do paciente
  - Grau de fotodano visualmente detectado (análise de textura)
  - Ajuste na resposta à tensão simulada pela injeção

---

## 6. Mapa de Risco Neurovascular — Zonas de Perigo

O overlay de AR deve cruzar pontos de injeção propostos com mapas probabilísticos vasculares. Emitir **alertas visuais em vermelho** se o plano de injeção intersectar:

| Zona de Perigo | Estrutura | Landmarks Adjacentes | Risco |
|---|---|---|---|
| **Sulco Nasolabial Profundo** | Artéria angular (continuação da A. facial) | 205, 425, 123, 352 | Injeção retrógrada → isquemia/necrose/cegueira |
| **Fossa Temporal** | A. temporal superficial (ramos frontal/parietal) | Contorno superior lateral FACE_OVAL | Dissecção vascular |
| **Forame Infraorbitário** | N. infraorbitário (NC V₂) | 123, 352 | Bloqueio neural inadvertido |
| **Forame Supraorbital** | N. supraorbital (NC V₁) | Adjacente a 10, 151 | Anestesia frontal |
| **Forame Mentoniano** | N. mentoniano (NC V₃) | Próximo a 199, 200 | Parestesia labial inferior |
| **Comissura Oral** | A. labiais sup/inf (submucosas) | 78, 308, 61, 291 | Injeção intra-arterial labial |

---

## 7. Fenótipos de Envelhecimento — Scoring Computacional

O sistema deve categorizar o padrão de envelhecimento em 3 fenótipos:

| Fenótipo | Mecanismo | Detecção Algorítmica |
|---|---|---|
| **Sinker** | Perda maciça de volume (atrofia adiposa + óssea) | Redução volumétrica nos tetraedros das regiões malar e temporal vs. baseline |
| **Sagger** | Ptose e flacidez (relaxamento ligamentar) | Aumento do deslocamento Y (descendente) dos landmarks malares; distorção no FACE_OVAL inferior |
| **Wrinkler** | Fotodano + rítides profundas | Análise de textura (fora do escopo da geometria) + blendshapes de alta ativação |

### Espessura Dérmica por Região (Referência para Simulação)

| Região | Espessura Média (µm) |
|---|---|
| Lábio Superior | 1433 |
| Bochecha Inferior | 1291 |
| Sulco Nasolabial | 1250 |
| Temporal | 1246 |
| Mento | 1166 |
| Malar / Zigomática | 1040 |
| Linhas de Marionete | 989 |

---

## 8. Restrições de Implementação

### 8.1 Performance & Threading

- **NUNCA** realize cálculos reológicos ou FEM nas threads bloqueantes da UI.
- Invoque scripts secundários compilados **assincronamente** (Web Workers / WASM) para modelos FEM surrogate de rede neural.
- Target de latência: **30–60 Hz** na câmera AR.

### 8.2 Privacidade (LGPD/HIPAA)

- Processar **todos** os dados do MediaPipe **client-side** (TensorFlow.js / MediaPipe Solutions for Web).
- Salvar apenas vetores de deslocamento e metadados anatômicos no backend.
- **Nunca** persistir imagens brutas do paciente no servidor.

### 8.3 Limitações do Eixo Z

- O eixo Z do MediaPipe monocular RGB é **estimado estatisticamente**, não mensurado diretamente.
- Para medições sub-milimétricas rigorosas, aplicar **filtros de suavização temporal** e considerar a ponderação reduzida do Z em cálculos de volume.
- Rotações axiais severas (pitch/yaw > 30°) degradam a precisão: alertar o profissional para reposicionar o paciente.

### 8.4 Visualização

- Utilizar `canvas` para desenhar a malha facial.
- Destacar em **cores diferenciadas** as zonas de risco anatômico.
- Sobreposição de pontos de aplicação do MAP 1.0 aos landmarks exatos do MediaPipe.

---

## 9. Procedimento de Análise de Precisão (Protocolo 4 Etapas)

### Etapa A: Calibração de Profundidade (Z-Axis)
- Converter para Metric 3D Space via Procrustes.
- Utilizar profundidade Z para estimar perda de volume em compartimentos profundos e superficiais.
- Normalizar pela IOD.

### Etapa B: Análise de Dinâmica Facial
- Comparar landmarks repouso vs. contração máxima.
- Calcular vetores de deslocamento nos 52 blendshapes.
- **Threshold > 0.65** → zona hiperativa → protocolo de neurotoxina prioritário.

### Etapa C: Mapeamento de Pontos de Injeção
- Sobrepor pontos MAP 1.0 aos landmarks MediaPipe em AR.
- Cruzar com mapa de risco neurovascular.
- Emitir alertas visuais se a injeção virtual intersectar zonas de perigo.

### Etapa D: Simulação de Resultados (Reflation)
- Projetar deslocamento dos landmarks após reposição volumétrica virtual.
- Respeitar a estratificação em 5 camadas e as restrições ligamentares.
- Diferenciar entre géis de alto G' (supraperiosteal) e baixo G' (subcutâneo).
- Se zona periorbital/perioral com blendshape > 0.65: **aplicar fator de toxina botulínica virtual** antes da simulação de HA.

---

## 10. Exemplo de Prompts de Ativação

### Análise Completa
```
Utilize a skill mediapipe-map-precision-dermatology para realizar análise completa da face do paciente. Execute as 4 etapas do protocolo (calibração Z, dinâmica facial, mapeamento de injeção, simulação de Reflation), identifique o fenótipo predominante (Sinker/Sagger/Wrinkler), pontue os 5 domínios FAS e gere a sobreposição de risco neurovascular.
```

### Discórdia Dinâmica
```
Utilize a skill mediapipe-map-precision-dermatology para analisar um vídeo de contração da fronte. Identifique os vetores de força muscular baseados nos landmarks 10 a 168, calcule os blendshapes com threshold > 0.65, e sugira o plano de aplicação de toxina botulínica seguindo o protocolo do Terço Superior do MAP 1.0.
```

### Simulação de Injeção Malar
```
Utilize a skill mediapipe-map-precision-dermatology para simular 1.0 mL de HA alto G' supraperiosteal no coxim malar medial profundo (landmarks 116-121 / 345-350). Aplique a regra de Reflation, respeite os ligamentos de retenção zigomáticos como vetores zero, e renderize a deformação com fatores de elasticidade ajustados para paciente de 55 anos com fotodano moderado.
```
