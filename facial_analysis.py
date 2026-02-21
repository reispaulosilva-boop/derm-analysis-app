"""
Avaliação Estética Facial com MediaPipe Face Mesh
==================================================
Extrai métricas clínicas objetivas a partir de uma foto.

Instalação:
    pip install mediapipe opencv-python numpy matplotlib

Uso:
    python facial_analysis.py --image foto.jpg
"""

import argparse
import math
import json
import cv2
import numpy as np
import mediapipe as mp
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from dataclasses import dataclass, asdict
from typing import Optional

# ---------------------------------------------------------------------------
# Índices dos landmarks relevantes (MediaPipe 468-point model)
# ---------------------------------------------------------------------------

LM = {
    # Contorno facial
    "chin":           152,
    "forehead_top":   10,
    "jaw_left":       234,
    "jaw_right":      454,

    # Terços horizontais
    "glabela":        9,       # entre as sobrancelhas
    "nasal_base":     2,       # base do nariz (columela)

    # Olhos
    "eye_left_inner": 133,
    "eye_left_outer": 33,
    "eye_right_inner":362,
    "eye_right_outer":263,
    "eye_left_top":   159,
    "eye_left_bot":   145,
    "eye_right_top":  386,
    "eye_right_bot":  374,

    # Sobrancelhas
    "brow_left_peak": 66,
    "brow_right_peak":296,

    # Nariz
    "nasal_tip":      4,
    "ala_left":       129,
    "ala_right":      358,

    # Lábios
    "lip_top":        13,
    "lip_bot":        14,
    "lip_left":       61,
    "lip_right":      291,
    "cupid_left":     37,
    "cupid_right":    267,

    # Mento
    "mento":          175,

    # Malar
    "malar_left":     116,
    "malar_right":    345,
}


# ---------------------------------------------------------------------------
# Utilitários
# ---------------------------------------------------------------------------

def px(lm_result, idx: int, w: int, h: int) -> tuple[float, float]:
    """Retorna coordenadas em pixels de um landmark."""
    pt = lm_result.landmark[idx]
    return pt.x * w, pt.y * h


def dist(a: tuple, b: tuple) -> float:
    return math.hypot(b[0] - a[0], b[1] - a[1])


def angle_deg(a: tuple, vertex: tuple, b: tuple) -> float:
    """Ângulo em graus no vértice formado por a-vertex-b."""
    v1 = (a[0] - vertex[0], a[1] - vertex[1])
    v2 = (b[0] - vertex[0], b[1] - vertex[1])
    cos_a = (v1[0]*v2[0] + v1[1]*v2[1]) / (math.hypot(*v1) * math.hypot(*v2) + 1e-9)
    return math.degrees(math.acos(max(-1, min(1, cos_a))))


# ---------------------------------------------------------------------------
# Dataclass de resultados
# ---------------------------------------------------------------------------

@dataclass
class FacialMetrics:
    # Proporções gerais
    face_width_px: float
    face_height_px: float
    facial_index: float           # altura / largura (ideal ~ 1.3)

    # Terços verticais (em % da altura total)
    third_upper_pct: float        # hairline → glabela
    third_middle_pct: float       # glabela → nasal base
    third_lower_pct: float        # nasal base → mento

    # Quintos horizontais (largura de cada quinto em % da largura total)
    fifth_1_pct: float
    fifth_2_pct: float
    fifth_3_pct: float            # quinto central = distância intercantal
    fifth_4_pct: float
    fifth_5_pct: float

    # Olhos
    eye_left_width_px: float
    eye_right_width_px: float
    eye_symmetry_pct: float       # diferença relativa (0 = perfeito)
    interpupillary_dist_px: float

    # Sobrancelhas
    brow_left_height_px: float    # distância brow → eye corner
    brow_right_height_px: float
    brow_symmetry_pct: float

    # Nariz
    nasal_width_px: float
    nasal_height_px: float        # tip → base
    nasal_index: float            # largura / altura

    # Lábios
    lip_width_px: float
    lip_height_px: float          # abertura vertical
    lip_index: float              # largura / altura
    upper_lower_lip_ratio: float  # vermelhão superior / inferior

    # Mento
    chin_projection_pct: float    # altura do terço inf. que é queixo

    # Simetria global (assimetria média entre pares homólogos, em px)
    global_asymmetry_px: float


# ---------------------------------------------------------------------------
# Extração de métricas
# ---------------------------------------------------------------------------

def extract_metrics(lm_result, w: int, h: int) -> FacialMetrics:
    g = lambda key: px(lm_result, LM[key], w, h)

    # Pontos principais
    forehead  = g("forehead_top")
    glabela   = g("glabela")
    nas_base  = g("nasal_base")
    chin      = g("chin")
    jaw_l     = g("jaw_left")
    jaw_r     = g("jaw_right")

    face_w = dist(jaw_l, jaw_r)
    face_h = dist(forehead, chin)

    # --- Terços ---
    t_upper  = dist(forehead, glabela)
    t_middle = dist(glabela, nas_base)
    t_lower  = dist(nas_base, chin)
    total_t  = t_upper + t_middle + t_lower

    # --- Quintos ---
    el_out = g("eye_left_outer")
    el_in  = g("eye_left_inner")
    er_in  = g("eye_right_inner")
    er_out = g("eye_right_outer")

    f1 = el_out[0] - jaw_l[0]
    f2 = dist(el_out, el_in)
    f3 = dist(el_in, er_in)   # quinto central
    f4 = dist(er_in, er_out)
    f5 = jaw_r[0] - er_out[0]
    total_f = f1 + f2 + f3 + f4 + f5

    # --- Olhos ---
    eye_l_w = dist(g("eye_left_outer"),  g("eye_left_inner"))
    eye_r_w = dist(g("eye_right_outer"), g("eye_right_inner"))
    eye_sym = abs(eye_l_w - eye_r_w) / max(eye_l_w, eye_r_w) * 100

    pupil_l = ((el_out[0]+el_in[0])/2, (g("eye_left_top")[1]+g("eye_left_bot")[1])/2)
    pupil_r = ((er_out[0]+er_in[0])/2, (g("eye_right_top")[1]+g("eye_right_bot")[1])/2)
    ipd = dist(pupil_l, pupil_r)

    # --- Sobrancelhas ---
    brow_l_h = dist(g("brow_left_peak"),  g("eye_left_outer"))
    brow_r_h = dist(g("brow_right_peak"), g("eye_right_outer"))
    brow_sym = abs(brow_l_h - brow_r_h) / max(brow_l_h, brow_r_h) * 100

    # --- Nariz ---
    nas_w = dist(g("ala_left"), g("ala_right"))
    nas_h = dist(g("nasal_tip"), g("nasal_base"))
    nas_idx = nas_w / (nas_h + 1e-9)

    # --- Lábios ---
    lip_w = dist(g("lip_left"), g("lip_right"))
    lip_h = dist(g("lip_top"), g("lip_bot"))
    lip_idx = lip_w / (lip_h + 1e-9)

    # Proporção superior/inferior do lábio
    lip_mid_y = (g("lip_top")[1] + g("lip_bot")[1]) / 2
    upper_h = abs(g("cupid_left")[1] - g("lip_top")[1])
    lower_h = abs(g("lip_bot")[1] - lip_mid_y)
    ul_ratio = upper_h / (lower_h + 1e-9)

    # --- Mento ---
    chin_h = dist(nas_base, chin)
    chin_proj = dist(g("mento"), chin) / (chin_h + 1e-9) * 100

    # --- Assimetria global ---
    pairs = [
        (g("eye_left_outer"),  g("eye_right_outer")),
        (g("ala_left"),        g("ala_right")),
        (g("malar_left"),      g("malar_right")),
        (g("lip_left"),        g("lip_right")),
        (g("brow_left_peak"),  g("brow_right_peak")),
    ]
    # Espelha o lado direito e calcula desvio vertical
    asym_vals = [abs(l[1] - r[1]) for l, r in pairs]
    global_asym = float(np.mean(asym_vals))

    return FacialMetrics(
        face_width_px=round(face_w, 1),
        face_height_px=round(face_h, 1),
        facial_index=round(face_h / (face_w + 1e-9), 3),

        third_upper_pct=round(t_upper / total_t * 100, 1),
        third_middle_pct=round(t_middle / total_t * 100, 1),
        third_lower_pct=round(t_lower / total_t * 100, 1),

        fifth_1_pct=round(f1 / total_f * 100, 1),
        fifth_2_pct=round(f2 / total_f * 100, 1),
        fifth_3_pct=round(f3 / total_f * 100, 1),
        fifth_4_pct=round(f4 / total_f * 100, 1),
        fifth_5_pct=round(f5 / total_f * 100, 1),

        eye_left_width_px=round(eye_l_w, 1),
        eye_right_width_px=round(eye_r_w, 1),
        eye_symmetry_pct=round(eye_sym, 1),
        interpupillary_dist_px=round(ipd, 1),

        brow_left_height_px=round(brow_l_h, 1),
        brow_right_height_px=round(brow_r_h, 1),
        brow_symmetry_pct=round(brow_sym, 1),

        nasal_width_px=round(nas_w, 1),
        nasal_height_px=round(nas_h, 1),
        nasal_index=round(nas_idx, 3),

        lip_width_px=round(lip_w, 1),
        lip_height_px=round(lip_h, 1),
        lip_index=round(lip_idx, 3),
        upper_lower_lip_ratio=round(ul_ratio, 3),

        chin_projection_pct=round(chin_proj, 1),

        global_asymmetry_px=round(global_asym, 1),
    )


# ---------------------------------------------------------------------------
# Visualização anotada
# ---------------------------------------------------------------------------

def draw_annotations(image: np.ndarray, lm_result, w: int, h: int) -> np.ndarray:
    img = image.copy()
    g = lambda key: tuple(map(int, px(lm_result, LM[key], w, h)))

    color_line  = (0, 220, 180)
    color_point = (255, 80, 80)
    color_text  = (255, 255, 255)
    font = cv2.FONT_HERSHEY_SIMPLEX

    def pt(key): return g(key)
    def line(k1, k2, c=color_line, t=1):
        cv2.line(img, pt(k1), pt(k2), c, t, cv2.LINE_AA)
    def circle(k, r=4):
        cv2.circle(img, pt(k), r, color_point, -1, cv2.LINE_AA)
    def label(text, pos, scale=0.35):
        cv2.putText(img, text, pos, font, scale, (0,0,0), 3, cv2.LINE_AA)
        cv2.putText(img, text, pos, font, scale, color_text, 1, cv2.LINE_AA)

    # Linhas dos terços
    line("forehead_top", "jaw_left",  (180,180,180))
    line("glabela",      "jaw_left",  (180,180,180))
    line("nasal_base",   "jaw_left",  (180,180,180))
    for key in ["forehead_top","glabela","nasal_base","chin"]:
        circle(key)

    # Marcadores de unidades
    for key in LM:
        cv2.circle(img, g(key), 2, (0,200,255), -1, cv2.LINE_AA)

    # Labels
    label("Terco Sup", (pt("glabela")[0]+5, (pt("forehead_top")[1]+pt("glabela")[1])//2))
    label("Terco Med", (pt("glabela")[0]+5, (pt("glabela")[1]+pt("nasal_base")[1])//2))
    label("Terco Inf", (pt("nasal_base")[0]+5, (pt("nasal_base")[1]+pt("chin")[1])//2))

    # Largura do rosto
    line("jaw_left","jaw_right", (255,200,0), 2)

    return img


# ---------------------------------------------------------------------------
# Relatório textual
# ---------------------------------------------------------------------------

IDEAL = {
    "facial_index":         (1.3,  0.1,  "Índice facial (h/w) — ideal ~1.3 (oval)"),
    "third_upper_pct":      (33.3, 3.0,  "Terço superior (%) — ideal ~33%"),
    "third_middle_pct":     (33.3, 3.0,  "Terço médio (%) — ideal ~33%"),
    "third_lower_pct":      (33.3, 3.0,  "Terço inferior (%) — ideal ~33%"),
    "fifth_3_pct":          (20.0, 2.0,  "Quinto central (%) — ideal ~20%"),
    "eye_symmetry_pct":     (0.0,  5.0,  "Assimetria dos olhos (%) — ideal < 5%"),
    "brow_symmetry_pct":    (0.0,  5.0,  "Assimetria das sobrancelhas (%) — ideal < 5%"),
    "nasal_index":          (0.67, 0.1,  "Índice nasal (w/h) — ideal ~0.67"),
    "upper_lower_lip_ratio":(0.5,  0.1,  "Razão lábio sup/inf — ideal ~0.5 (inf maior)"),
    "global_asymmetry_px":  (0.0,  None, "Assimetria global (px) — menor = melhor"),
}


def print_report(m: FacialMetrics):
    print("\n" + "="*60)
    print("  RELATÓRIO DE AVALIAÇÃO ESTÉTICA FACIAL")
    print("="*60)

    d = asdict(m)
    for key, (ideal, tol, desc) in IDEAL.items():
        val = d[key]
        if tol is not None:
            diff = abs(val - ideal)
            status = "✓" if diff <= tol else "⚠"
        else:
            status = "ℹ"
        print(f"  {status}  {desc}")
        print(f"       Medido: {val:.2f}   |   Ideal: {ideal:.2f}")
        print()

    print("-"*60)
    print("  DADOS BRUTOS")
    print("-"*60)
    for k, v in d.items():
        print(f"  {k:35s}: {v}")
    print("="*60 + "\n")


# ---------------------------------------------------------------------------
# Pipeline principal
# ---------------------------------------------------------------------------

def analyze(image_path: str, save_annotated: Optional[str] = None):
    mp_face = mp.solutions.face_mesh

    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(f"Imagem não encontrada: {image_path}")

    h, w = image.shape[:2]
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    with mp_face.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
    ) as face_mesh:
        results = face_mesh.process(rgb)

    if not results.multi_face_landmarks:
        print("⚠ Nenhum rosto detectado na imagem.")
        return

    lm = results.multi_face_landmarks[0]
    metrics = extract_metrics(lm, w, h)
    print_report(metrics)

    # Salvar JSON
    json_path = image_path.rsplit(".", 1)[0] + "_metrics.json"
    with open(json_path, "w") as f:
        json.dump(asdict(metrics), f, indent=2, ensure_ascii=False)
    print(f"  Métricas salvas em: {json_path}")

    # Imagem anotada
    annotated = draw_annotations(image, lm, w, h)
    out_path = save_annotated or image_path.rsplit(".", 1)[0] + "_annotated.jpg"
    cv2.imwrite(out_path, annotated)
    print(f"  Imagem anotada salva em: {out_path}")

    # Plot comparativo dos terços
    fig, axes = plt.subplots(1, 2, figsize=(10, 4))
    fig.patch.set_facecolor("#1a1a2e")

    ax = axes[0]
    ax.set_facecolor("#16213e")
    thirds = [metrics.third_upper_pct, metrics.third_middle_pct, metrics.third_lower_pct]
    colors = ["#e94560", "#0f3460", "#533483"]
    bars = ax.bar(["Superior", "Médio", "Inferior"], thirds, color=colors, edgecolor="white", linewidth=0.5)
    ax.axhline(33.3, color="white", linestyle="--", linewidth=1, alpha=0.7, label="Ideal (33%)")
    ax.set_title("Terços Faciais", color="white", fontsize=12)
    ax.set_ylabel("% da altura facial", color="white")
    ax.tick_params(colors="white")
    ax.legend(facecolor="#1a1a2e", labelcolor="white")
    for bar, val in zip(bars, thirds):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
                f"{val:.1f}%", ha="center", color="white", fontsize=9)

    ax2 = axes[1]
    ax2.set_facecolor("#16213e")
    fifths = [metrics.fifth_1_pct, metrics.fifth_2_pct, metrics.fifth_3_pct,
              metrics.fifth_4_pct, metrics.fifth_5_pct]
    labels_f = ["Ext\nEsq", "Olho\nEsq", "Central", "Olho\nDir", "Ext\nDir"]
    bars2 = ax2.bar(labels_f, fifths, color=["#e94560","#0f3460","#533483","#0f3460","#e94560"],
                    edgecolor="white", linewidth=0.5)
    ax2.axhline(20, color="white", linestyle="--", linewidth=1, alpha=0.7, label="Ideal (20%)")
    ax2.set_title("Quintos Faciais", color="white", fontsize=12)
    ax2.set_ylabel("% da largura facial", color="white")
    ax2.tick_params(colors="white")
    ax2.legend(facecolor="#1a1a2e", labelcolor="white")
    for bar, val in zip(bars2, fifths):
        ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.3,
                f"{val:.1f}%", ha="center", color="white", fontsize=8)

    plt.tight_layout()
    chart_path = image_path.rsplit(".", 1)[0] + "_chart.png"
    plt.savefig(chart_path, facecolor="#1a1a2e", dpi=150)
    plt.close()
    print(f"  Gráfico salvo em: {chart_path}\n")

    return metrics


# ---------------------------------------------------------------------------
# Execução
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Avaliação Estética Facial — MediaPipe Face Mesh")
    parser.add_argument("--image", required=True, help="Caminho para a foto (.jpg / .png)")
    parser.add_argument("--output", default=None, help="Caminho da imagem anotada de saída")
    args = parser.parse_args()
    analyze(args.image, args.output)
