# Análise MD Codes™ vs MediaPipe Face Mesh

## Estrutura MD Codes (Baseada no PMC8012343)
Os MD Codes são divididos em unidades anatômicas:
- **Ck (Cheek/Malar):** Ck1 (Arco zigomático), Ck2 (Eminência zigomática), Ck3 (Malar anteromedial), Ck4 (Malar lateral inferior/parótida), Ck5 (Submalar).
- **T (Temple/Têmpora):** T1 (Anterior), T2 (Posterior).
- **C (Chin/Mento):** C1 (Ângulo labiomentoniano), C2 (Ápice do mento), C3 (Mento anterior), C4 (Pogônio), C5 (Mento lateral inferior), C6 (Mento lateral).
- **Jw (Jawline/Mandíbula):** Jw1 (Ângulo da mandíbula), Jw2 (Área pré-auricular), Jw3 (Corpo da mandíbula), Jw4 (Prejowl inferior), Jw5 (Mento anterior inferior).
- **NL (Nasolabial):** NL1 (Superior), NL2 (Central), NL3 (Inferior).
- **M (Marionette):** M1 (Superior), M2 (Central), M3 (Inferior).
- **E (Eyebrow/Sobrancelha):** E1 (Cauda), E2 (Centro), E3 (Cabeça).
- **O (Orbital):** O1 (Lateral central), O2 (Lateral inferior), O3 (Lateral superior).
- **Tt (Tear Trough/Calha Lacrimal):** Tt1 (Infraorbital central), Tt2 (Infraorbital lateral), Tt3 (Infraorbital medial).
- **G (Glabella):** G1 (Lateral), G2 (Central).
- **Lp (Lips):** Diversos códigos para volume e contorno.

## Mapeamento MediaPipe (468 Landmarks)
- **Vantagem:** Precisão 3D, detecção em tempo real, consistência bilateral.
- **Limitação:** Não possui terminologia clínica nativa; requer mapeamento manual para pontos de injeção.

## Gaps Identificados no Documento Original (face_mesh_reference.docx)
1. **Nomenclatura inconsistente:** Alguns códigos no documento (ex: Ck1-Ck5) estão mapeados para triângulos ou centróides, mas o MD Codes original foca em pontos específicos de injeção (bolus ou fanning).
2. **Falta de Profundidade:** O documento original foca apenas em coordenadas superficiais (landmarks), enquanto o MD Codes especifica camadas (Supraperiosteal, Subcutaneous, Sub-SMAS).
3. **Pontos Pendentes:** C4 e C2 (linha do mento) precisam de definição matemática clara baseada nos landmarks 148, 152, 377.
4. **Alertas de Segurança:** O documento original não destaca as "Alert Areas" (códigos em vermelho no MD Codes) que são críticas para evitar complicações vasculares.
5. **Lateralidade:** O espelhamento bilateral está correto, mas a lógica de "ipsilateral/contralateral" pode ser simplificada para "Left/Right" clínico.

## Estratégia de Melhoria
- Alinhar os pontos MediaPipe com os vetores de injeção do MD Codes.
- Adicionar uma coluna de "Camada Anatômica" e "Alerta de Segurança".
- Refinar os polígonos MediaPipe para representar melhor as áreas de "Fanning".
