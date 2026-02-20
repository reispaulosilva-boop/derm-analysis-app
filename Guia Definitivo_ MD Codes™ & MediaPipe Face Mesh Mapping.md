# Guia Definitivo: MD Codes™ & MediaPipe Face Mesh Mapping

Este documento apresenta o mapeamento exaustivo de todos os **MD Codes™** listados na Tabela 3 do artigo fundamental de Maurício de Maio (PMC8012343), integrando-os aos 468 landmarks do **MediaPipe Face Mesh**.

## 1. Convenções de Dados e Segurança
*   **L/R:** Referem-se à esquerda/direita do paciente (visão clínica).
*   **🔴 Alert Areas:** Zonas de alto risco vascular (conforme MD Codes). Requerem extrema cautela e uso preferencial de cânulas.
*   **Active Number:** Volume mínimo recomendado (mL) por lado para resultados reprodutíveis.

---

## 2. Mapeamento Completo por Unidade Anatômica

### A. Foundation: Cheek (Ck)
| Code | Área de Injeção | Landmarks MediaPipe (L/R) | Profundidade | Técnica | Alerta | Vol (mL) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Ck1** | Arco Zigomático | 330, 347, 348 / 101, 118, 119 | Supraperiosteal | Bolus (Needle) | - | 0.3 (3x0.1) |
| **Ck1 TML** | Arco Zigomático (Top Model) | Polígono Ck1 | Sub-SMAS | Cannula | - | 0.5 |
| **Ck2** | Eminência Zigomática | 340, 345, 372 / 111, 116, 143 | Supraperiosteal | Bolus (Needle) | 🔴 A. Zigomaticofacial | 0.2 |
| **Ck3** | Malar Anteromedial | 330 / 101 | Supraperiosteal | Bolus (Needle) | 🔴 A. Infraorbital | 0.3 |
| **Ck4** | Malar Lat. Inf./Parótida | 352, 361 / 123, 132 | Subcutâneo | Fanning (Cannula) | ⚠️ G. Parótida | 0.5 |
| **Ck5** | Submalar / Bucal | 425 / 205 | Subcutâneo | Fanning (Cannula) | 🔴 N. Bucal / V. Facial | 0.5 |

### B. Contour: Upper Face - Temple (T) & Forehead (F)
| Code | Área de Injeção | Landmarks MediaPipe (L/R) | Profundidade | Técnica | Alerta | Vol (mL) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **T1** | Têmpora Anterior | 301, 298 / 71, 68 | Supraperiosteal | Bolus (Needle) | 🔴 A. Temporal Profunda | 0.5 |
| **T2** | Têmpora Posterior | 251, 284 / 21, 54 | Supraperiosteal | Bolus (Needle) | 🔴 A. Temporal Profunda | 0.5 |
| **F1** | Testa Medial | 337, 338 / 108, 109 | Supraperiosteal | Cannula | 🔴 A. Supraorbital | 0.5 |
| **F2** | Testa Lateral | 299, 297 / 69, 67 | Supraperiosteal | Cannula | 🔴 A. Temporal Superficial | 0.5 |
| **F3** | Testa Central | 9 (Mediano) | Supraperiosteal | Cannula | 🔴 A. Supratroclear | 0.5 |

### C. Contour: Lower Face - Chin (C) & Jowls (Jw)
| Code | Área de Injeção | Landmarks MediaPipe (L/R) | Profundidade | Técnica | Alerta | Vol (mL) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **C1** | Ângulo Labiomentoniano | 406, 418 / 176, 202 | Subcutâneo | Fanning (Cannula) | - | 0.5 |
| **C2** | Ápice do Mento | 152 (Mediano) | Subcutâneo/Supra. | Bolus | - | 0.3 |
| **C3** | Mento Anterior | 421, 428 / 201, 208 | Supraperiosteal | Bolus (Needle) | 🔴 A. Mental | 0.3 |
| **C4** | Pogônio (Soft Tissue) | 199 (Mediano) | Subcutâneo | Bolus (Needle) | - | 0.3 |
| **C5** | Mento Lateral Inferior | 430 / 210 | Supraperiosteal | Bolus (Needle) | - | 0.3 |
| **C6** | Mento Lateral | 365 / 136 | Subcutâneo | Cannula | - | 0.5 |
| **Jw1** | Ângulo da Mandíbula | 397, 435 / 169, 215 | Supraperiosteal | Bolus (Needle) | - | 0.5 |
| **Jw2** | Área Pré-auricular | 323, 401 / 93, 176 | Subcutâneo | Cannula | ⚠️ G. Parótida | 0.5 |
| **Jw3** | Corpo da Mandíbula | 364, 288 / 135, 58 | Subcutâneo | Cannula | 🔴 A. Facial | 1.0 |
| **Jw4** | Prejowl Inferior | 422 / 202 | Subcutâneo | Cannula | - | 0.5 |
| **Jw5** | Mento Anterior Inf. | 377 / 148 | Subcutâneo | Cannula | - | 0.5 |

### D. Refinement: Periorbital & Perioral
| Code | Área de Injeção | Landmarks MediaPipe (L/R) | Profundidade | Técnica | Alerta | Vol (mL) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **E1** | Cauda da Sobrancelha | 276 / 46 | ROOF | Cannula | - | 0.2 |
| **E2** | Centro da Sobrancelha | 300 / 70 | ROOF | Cannula | 🔴 Forame Supraorbital | 0.2 |
| **E3** | Cabeça da Sobrancelha | 282 / 52 | ROOF | Cannula | 🔴 Forame Supratroclear | 0.1 |
| **O1** | Lateral Central Orbital | 383 / 105 | Supraperiosteal | Cannula | ⚠️ Pálpebra Inferior | 0.2 |
| **O2** | Lateral Inferior Orbital | 372 / 143 | Supraperiosteal | Cannula | ⚠️ Pálpebra Inferior | 0.2 |
| **O3** | Lateral Superior Orbital | 388 / 159 | Supraperiosteal | Cannula | ⚠️ Pálpebra Superior | 0.1 |
| **Tt1** | Infraorbital Central | 340 / 111 | Supraperiosteal | Cannula | 🔴 A. Infraorbital | 0.2 |
| **Tt2** | Infraorbital Lateral | 345 / 116 | Supraperiosteal | Cannula | - | 0.2 |
| **Tt3** | Infraorbital Medial | 372 / 143 | Supraperiosteal | Cannula | 🔴 A. Angular | 0.1 |
| **G1** | Glabela Lateral | 285 / 55 | Supraperiosteal | Cannula | 🔴 A. Supratroclear | 0.1 |
| **G2** | Glabela Central | 8 (Mediano) | Supraperiosteal | Cannula | 🔴 Neurovasc. Glabelar | 0.3 |
| **NL1** | Sulco Nasolabial Sup. | 423 / 203 | Supraperiosteal | Needle | 🔴 A. Facial (Fossa Canina) | 0.3 |
| **NL2** | Sulco Nasolabial Med. | 426 / 206 | Subcutâneo | Cannula | 🔴 A. Facial | 0.2 |
| **NL3** | Sulco Nasolabial Inf. | 436 / 216 | Subcutâneo | Cannula | 🔴 A. Facial | 0.2 |
| **M1** | Marionete Superior | 432 / 212 | Subdérmico | Needle | - | 0.2 |
| **M2** | Marionete Central | 421 / 201 | Subdérmico | Needle | - | 0.2 |
| **M3** | Marionete Inferior | 428 / 208 | Subdérmico | Needle | - | 0.1 |

### E. Lips (Lp) & Nose (N)
| Code | Área de Injeção | Landmarks MediaPipe (L/R) | Profundidade | Técnica | Alerta | Vol (mL) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Lp1** | Vermilion Body | 0, 13 / 17, 14 | Submucosa | Cannula | - | 0.2 |
| **Lp2** | Arco de Cupido | 37, 267 | Mucosa | Needle | - | 0.05 |
| **Lp3** | Borda Labial | 61, 291 | Mucosa | Needle | - | 0.15 |
| **Lp4** | Tubérculo Medial | 0 (Mediano) | Mucosa | Needle | 🔴 A. Labial Superior | 0.1 |
| **Lp5** | Tubérculos Laterais | 37, 267 | Mucosa | Needle | 🔴 A. Labial Inferior | 0.05 |
| **Lp6** | Comissura Oral | 61, 291 | Mucosa | Needle | - | 0.1 |
| **Lp7** | Coluna do Filtro | 37, 267 | Subdérmico | Needle | - | 0.05 |
| **N1** | Espinha Nasal Ant. | 164 (Mediano) | Supraperiosteal | Needle | - | 0.3 |
| **N2** | Columela | 1 (Mediano) | Cartilagem | Needle | - | 0.2 |
| **N3** | Ângulo Frontonasal | 168 (Mediano) | Supraperiosteal | Needle | - | 0.3 |
| **N4** | Dorso Ósseo | 197 (Mediano) | Supraperiosteal | Needle | - | 0.2 |
| **N5** | Dorso Cartilaginoso | 5 (Mediano) | Cartilagem | Needle | - | 0.2 |

---

## 3. Considerações Estratégicas para o Clube Pele Segura

1.  **Lógica de Equações:** O sistema de IA deve agrupar códigos em "Equações de Tratamento" (ex: Ck1+Ck2+Ck3 para suporte de terço médio) para sugerir planos holísticos em vez de preenchimentos isolados.
2.  **Detecção de Alerta em Tempo Real:** Ao mapear os landmarks 423 (NL1) ou 330 (Ck3), o motor de IA deve sinalizar a proximidade da Artéria Facial e Infraorbital, respectivamente.
3.  **Diferenciação por Gênero:** O código **C5** é destacado no artigo como fundamental para a masculinização do mento, devendo ser priorizado em algoritmos para pacientes masculinos.

**Versão:** 2.0 - Fevereiro 2026 | **Fonte:** PMC8012343 | **Tecnologia:** MediaPipe Face Mesh 468
