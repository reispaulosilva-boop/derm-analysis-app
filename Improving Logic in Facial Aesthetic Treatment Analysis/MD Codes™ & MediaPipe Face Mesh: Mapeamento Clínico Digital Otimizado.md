# MD Codes™ & MediaPipe Face Mesh: Mapeamento Clínico Digital Otimizado

Este documento revisa e melhora a lógica do mapeamento de pontos de referência faciais, integrando a precisão anatômica do sistema **MD Codes™** (PMC8012343) com as capacidades técnicas do **MediaPipe Face Landmarker** (468 Landmarks).

## 1. Estrutura Lógica e Convenção Técnica

O mapeamento digital foi otimizado para suportar a transição entre o diagnóstico visual por IA e a intervenção clínica real.

*   **Lateralidade:** Padronização em **L (Left)** e **R (Right)** do paciente (Vista Clínica Frontal).
*   **Hierarquia de Dados:** Cada ponto é definido por seu identificador MD Code, os landmarks MediaPipe correspondentes, a profundidade alvo e a técnica de entrega recomendada.
*   **Zonas de Alerta (Alert Areas):** Pontos críticos para segurança vascular são destacados em **VERMELHO** (conforme protocolo MD Codes).

## 2. Tabela de Mapeamento Estruturada (Unidades de Fundação e Contorno)

Abaixo, os principais códigos revisados com seus respectivos nós MediaPipe e especificações técnicas.

| MD Code | Unidade Anatômica | Landmarks MediaPipe (L/R) | Profundidade Alvo | Técnica | Alerta de Segurança |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ck1** | Arco Zigomático | 330, 347, 348 / 101, 118, 119 | Supraperiosteal | Bolus / Needle | - |
| **Ck2** | Eminência Zigomática | 340, 345, 372 / 111, 116, 143 | Supraperiosteal | Bolus / Needle | ⚠️ Artéria Zigomaticofacial |
| **Ck3** | Malar Anteromedial | 330 / 101 | Supraperiosteal | Bolus / Needle | 🔴 Artéria Infraorbital |
| **Ck4** | Malar Lat. Inf./Parótida | 352, 361 / 123, 132 | Subcutâneo | Fanning / Cannula | ⚠️ Glândula Parótida |
| **Ck5** | Submalar / Bucal | 425 / 205 | Subcutâneo | Fanning / Cannula | 🔴 Nervo Bucal / Veia Facial |
| **Jw1** | Ângulo Mandibular | 388, 397, 435 / 159, 169, 215 | Supraperiosteal | Bolus / Needle | - |
| **Jw2** | Área Pré-auricular | 323, 401, 447, 454 / 93, 176, 227, 234 | Subcutâneo | Fanning / Cannula | ⚠️ Glândula Parótida |
| **Jw3** | Corpo Mandibular | 364, 435, 288, 365 / 135, 215, 58, 136 | Subcutâneo | Linear / Cannula | 🔴 Artéria Facial |
| **NL1** | Sulco Nasolabial Sup. | 358 → 423 / 129 → 203 | Supraperiosteal | Bolus / Needle | 🔴 Artéria Facial (Fossa Canina) |
| **NL2** | Sulco Nasolabial Med. | 423 → 426 / 203 → 206 | Subcutâneo | Linear / Cannula | ⚠️ Artéria Facial |
| **NL3** | Sulco Nasolabial Inf. | 426 → 436 / 206 → 216 | Subcutâneo | Linear / Cannula | ⚠️ Artéria Facial |
| **C1** | Ângulo Labiomentoniano | 406, 418, 422, 430 / 176, 202, 210, 208 | Subcutâneo | Fanning / Cannula | - |
| **C2** | Ápice do Mento | 152 (Mediano) | Subcutâneo / Supraperiosteal | Bolus / Needle | - |
| **C3** | Mento Anterior | 421 → 428 / 201 → 208 | Supraperiosteal | Bolus / Needle | 🔴 Artéria Mental |
| **C4** | Pogônio (Projeção) | 199 (Mediano) | Subcutâneo | Bolus / Needle | - |

## 3. Melhorias Lógicas Implementadas

1.  **Mapeamento de Áreas vs. Pontos:** Distinção clara entre pontos de injeção direta (bolus) e áreas de preenchimento (fanning). Para áreas de fanning (ex: Ck4, Jw2), o MediaPipe define o polígono delimitador, enquanto para bolus (ex: Ck1, Ck3), define a coordenada exata do ponto.
2.  **Definição Matemática de C2 e C4:**
    *   **C2 (Ápice):** Fixado no landmark **152** (ponto mais inferior do mento).
    *   **C4 (Pogônio):** Fixado no landmark **199** (ponto mais anterior do mento na linha média).
3.  **Diferenciação E1 vs E2 (Sobrancelha):**
    *   **E1 (Cauda):** Landmark **276 (L) / 46 (R)**.
    *   **E2 (Centro):** Landmark **300 (L) / 70 (R)**.
    *   **E3 (Cabeça):** Landmark **282 (L) / 52 (R)**.
4.  **Integração de Segurança:** Inclusão de alertas vasculares baseados na proximidade de forames e trajetos arteriais conhecidos, permitindo que o sistema de IA do **Clube Pele Segura** emita avisos preventivos.

## 4. Conclusão Estratégica

A transposição da metodologia MD Codes™ para o MediaPipe não é apenas um exercício de mapeamento de coordenadas, mas a criação de uma **Linguagem Universal Digital** para a dermatologia estética. Este modelo revisado reduz a variabilidade técnica e aumenta a segurança do paciente, servindo como motor para a automação de planos de tratamento personalizados.
