# ENT-003: folhas comparativas a partir de captures/entrelace/evidencias (PIL).
# Uso: python scripts/entrelace-sheets.py [caminho da captura do canvas 3a (referência)]
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

D = Path(__file__).resolve().parent.parent / "captures" / "entrelace" / "evidencias"
BG = (14, 16, 22)
try:
    F = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 22)
    FS = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 17)
except OSError:
    F = FS = ImageFont.load_default()


def sheet(title, cells, cols, cell_w, out):
    """cells = [(rótulo, caminho)]; todas na mesma largura, alturas proporcionais."""
    ims = [(lab, Image.open(p).convert("RGB")) for lab, p in cells]
    ims = [(lab, im.resize((cell_w, round(im.height * cell_w / im.width)))) for lab, im in ims]
    rows = [ims[i : i + cols] for i in range(0, len(ims), cols)]
    pad, head, lab_h = 24, 64, 34
    H = head + sum(max(im.height for _, im in r) + lab_h + pad for r in rows) + pad
    W = pad + cols * (cell_w + pad)
    s = Image.new("RGB", (W, H), BG)
    g = ImageDraw.Draw(s)
    g.text((pad, 20), title, fill=(235, 240, 248), font=F)
    y = head
    for r in rows:
        x = pad
        for lab, im in r:
            g.text((x, y + 6), lab, fill=(160, 205, 235), font=FS)
            s.paste(im, (x, y + lab_h))
            x += cell_w + pad
        y += max(im.height for _, im in r) + lab_h + pad
    s.save(D / out)
    print(D / out)


sheet("ENT-003 · A (Hero atual, /) × B (Entrelace 003 · L3, /editorial/entrelace-v3) — build de produção, mesma fase da cena",
      [("A · 1440 × 900", D / "A-1440x900.png"), ("B · 1440 × 900", D / "B-1440x900.png"),
       ("A · 1920 × 1080", D / "A-1920x1080.png"), ("B · 1920 × 1080", D / "B-1920x1080.png")], 2, 900, "folha-A-desktop.png")
sheet("ENT-003 · A × B no celular (DPR 2) — composição própria do Entrelace",
      [("A · 390 × 844", D / "A-390x844.png"), ("B · 390 × 844", D / "B-390x844.png"),
       ("A · 360 × 640", D / "A-360x640.png"), ("B · 360 × 640", D / "B-360x640.png")], 4, 390, "folha-B-celular.png")
sheet("ENT-003 · poses reais da escultura e o recorte da headline em cada uma (motor real, sem simulação 2D)",
      [("P1 · repouso", D / "P1-repouso.png"), ("P2 · onda em outra fase", D / "P2-onda.png"), ("P3 · ambiente em outro instante", D / "P3-ambiente.png"),
       ("P4 · cursor à direita (mola, limite real)", D / "P4-cursor.png"), ("P5 · arraste em curso", D / "P5-arraste.png"), ("P6 · rolagem (saída)", D / "P6-rolagem.png")], 3, 620, "folha-C-poses.png")
sheet("ENT-003 · detalhes (DPR 2): headline entrelaçada e arquitetura L3",
      [("Headline: sólida onde está livre; contorno + halo + véu onde a peça passa; sombra da matéria", D / "B-detalhe-headline.png"),
       ("Arco L3: abertura em contraluz, cinco molduras deslocadas, painel lateral; reflexo no piso", D / "B-detalhe-L3.png")], 2, 820, "folha-D-detalhes.png")
if len(sys.argv) > 1:
    sheet("ENT-003 · REFERÊNCIA Claude Design (canvas 3a, simulação 2D do pôster) × implementação real (WebGL, produção)",
          [("Referência — Claude Design, Entrelace 003 · 3a (NÃO é captura do protótipo)", Path(sys.argv[1])),
           ("Implementação real — /editorial/entrelace-v3, 1440 × 900", D / "B-1440x900.png")], 2, 900, "folha-E-canvas-x-real.png")
