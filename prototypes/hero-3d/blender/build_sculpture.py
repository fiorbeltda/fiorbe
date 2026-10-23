"""
FIORBE — construtor da escultura no Blender (rodar em background):

  blender --background --factory-startup --python blender/build_sculpture.py -- <modelo> <saida.glb> [saida.blend]

modelo: "teste" (prova de integração: um anel torcido), "fiorbe" (escultura V1, seção fixa)
ou "fiorbe2…" (V2: seção esculpida por anel — ver sculpt_blade).

Fluxo (editável depois no Blender):
  curva Bézier fechada "Espinha"  (pontos, handles automáticos, tilt = torção, raio = largura)
  └─ modificador Geometry Nodes "Lamina":
       Set Curve Normal (Z Up) → Resample Curve (passo fixo de comprimento)
       → Store "_arc" = Spline Parameter.Factor  (coordenada longitudinal 0..1, por comprimento de arco)
       → Curve to Mesh com perfil = retângulo fino com bordas arredondadas (Store "_v" = posição na largura −1..1)
       → Shade Smooth

Convenção de eixos: os dados são escritos no espaço do Three.js (x direita, y cima, z para o observador),
para que "Z Up" do Blender aponte para a câmera (face larga de frente; o tilt gira a partir daí).
Na exportação a malha é girada para o Y-up do glTF, e o arquivo sai exatamente no espaço local do Three.

Coordenadas dos pontos: pixels da referência 1672×941 (mesma conversão de monument.ts) + profundidade z.
"""
import sys
import math
import bpy
import bmesh
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

REF_FLOOR_PX = 660
REF_CENTER_X = 1145
PX = 0.00707
FLOOR = -1.5
HALF_WIDTH = 0.36     # meia-largura para raio 1
THICK = 0.03          # espessura para raio 1 (escala junto com a largura)
BASE_TILT = 0.45      # inclinação de base: faixas vistas de lado, não paredes de frente
STEP = 0.03           # passo dos anéis ao longo da fita (unidades)
STEP2 = 0.05          # V2: passo dos anéis
PROFILE2 = 45         # V2: amostras através da largura em cada face
PLEAT_DEPTH = 0.12    # V2 plissado: profundidade máxima das dobras / espaçamento entre elas
DEBUG_FRAME = False   # V2: relatório de suavidade do referencial
FRAME_SMOOTH = 6      # V2: meia-janela da suavização do referencial (anéis)
LAMELLAE = 6          # V2 lamelas: lâminas por seção
LAMELLA_SAMPLES = 5   # V2 lamelas: amostras através de cada lâmina, por face
FAN_ANGLE = 0.32      # V2 lamelas: giro das lâminas externas com o leque aberto (rad)


def to_local(x, y, z):
    return Vector(((x - REF_CENTER_X) * PX, FLOOR + (REF_FLOOR_PX - y) * PX, z))


# [x_ref, y_ref, z, largura relativa, torção (rad)]
TESTE = [
    [900, 400, 0.0, 1.0, 0.0], [1100, 250, 0.4, 1.2, 0.8], [1300, 400, 0.0, 1.0, 1.6], [1100, 550, -0.4, 0.8, 0.8],
]

# Escultura FIORBE — percurso único fechado desenhado sobre o mapa da referência.
# z decide quem passa na frente; torção 0 = face larga ao observador, ±π/2 = só a borda.
FIORBE = [
    # A — do pé central, laço baixo à esquerda (frente)
    [1050, 652, 0.55, 1.0, 0.0], [930, 614, 1.0, 1.25, -0.15], [790, 560, 1.0, 1.4, -0.25], [680, 482, 0.8, 1.35, -0.15],
    [648, 395, 0.45, 1.2, 0.15],
    # B — coroa externa (fundo), da esquerda ao alto e à direita
    [700, 290, 0.05, 1.3, 0.6], [820, 195, -0.25, 1.68, 0.0], [990, 122, -0.8, 1.86, -0.35], [1170, 98, -1.0, 1.92, -0.6],
    [1350, 112, -1.05, 1.86, -0.3], [1500, 168, -0.8, 1.74, 0.25], [1600, 258, -0.75, 1.56, 0.7],
    # C — borda direita até o pé direito
    [1652, 370, -0.6, 1.2, -0.75], [1626, 482, -0.35, 1.15, -0.55], [1552, 576, -0.05, 1.1, -0.3], [1462, 640, 0.3, 1.0, 0.0],
    # D — volta baixa para a esquerda, por trás do miolo
    [1330, 618, 0.1, 0.76, 0.4], [1180, 588, -0.3, 0.8, 0.75], [1020, 566, -0.55, 0.84, 0.95], [880, 566, -0.6, 0.84, 1.05],
    [770, 548, -0.45, 0.76, 1.2],
    # E — a grande varredura ascendente (frente, face larga)
    [795, 468, -0.3, 1.15, 0.2], [885, 448, 1.4, 1.61, 0.6], [1050, 428, 1.55, 1.955, 0.15], [1240, 405, 1.5, 2.012, -0.35],
    [1420, 378, 1.25, 1.84, -0.75], [1540, 330, 0.85, 1.495, -1.1],
    # F — redemoinho: enrola para cima e para dentro
    [1590, 262, 0.4, 1.15, -1.0], [1550, 198, 0.0, 1.1, -0.6], [1452, 182, -0.25, 1.15, 0.0], [1360, 222, -0.35, 1.2, 0.4],
    # H — arco interno da coroa (aninhado sob B), para a esquerda
    [1250, 205, -0.15, 1.418, 0.5], [1110, 178, 0.0, 1.522, 0.2], [960, 205, 0.1, 1.47, -0.3], [855, 285, 0.45, 1.312, -0.5],
    [800, 360, -0.45, 1.155, 0.1],
    # I — volta pelo meio, por trás da varredura, de novo para a direita
    [885, 405, -1.05, 0.92, 0.0], [1060, 345, -0.95, 1.04, 0.3], [1240, 318, -0.95, 1.08, 0.2], [1330, 350, -0.7, 0.96, 0.5],
    # G — saia central, desce ao pé (fecha em A)
    [1300, 430, -0.4, 1.4, 0.5], [1180, 520, -0.05, 1.55, 0.25], [1090, 615, 0.3, 1.35, 0.1],
]

MODELS = {"teste": TESTE, "fiorbe": FIORBE}

# --- V2: lâmina esculpida ---------------------------------------------------
# Mesma espinha (curva Bézier + tilt + raio); a seção deixa de ser um retângulo
# fixo e passa a ser esculpida por anel a partir de 3 parâmetros extras por ponto:
#   [x_ref, y_ref, z, largura, torção, plissado 0..1, lamelas, concavidade]
# plissado: profundidade das dobras longitudinais (0 = lâmina lisa; 1 = dobras com
#   ~35% do espaçamento entre lamelas — profundidade real, não textura);
# lamelas: número de dobras através da largura; variar ao longo do percurso faz as
#   linhas de vinco convergirem para uma das bordas (leque);
# concavidade: curvatura da seção inteira (concha), ± conforme o lado;
# abertura (9º valor, só no estilo lamelas): quanto o leque de lâminas se abre.
# Pontos sem os extras herdam (0, 6, 0, 0).
V2_DEFAULTS = (0.0, 6.0, 0.0, 0.0)

# Percurso V2 traçado sobre a referência (grade de 50 px): 12 passagens, faixas mais
# estreitas que a V1 (≈75–150 px contra ≈200), alternando face e borda.
FIORBE2 = [
    # A — pé central → laço externo esquerdo (frente), rolando
    [1060, 650, 0.5, 1.0, 0.3, 0.2, 6, 0.0], [940, 618, 0.95, 1.15, 0.0, 0.3, 6, 0.2], [800, 568, 1.0, 1.25, -0.3, 0.4, 7, 0.3],
    [695, 495, 0.8, 1.2, -0.5, 0.4, 7, 0.2], [652, 410, 0.45, 1.1, -0.2, 0.3, 6, 0.0],
    # B — arco superior esquerdo, abrindo de frente
    [690, 320, 0.1, 1.15, 0.6, 0.4, 6, 0.0], [790, 262, -0.1, 1.3, 0.2, 0.6, 7, -0.2], [900, 232, -0.2, 1.5, 0.0, 0.8, 8, -0.3, 0.0],
    # P — pétala da coroa: leque largo de frente no alto, gira até a borda ao descer
    [985, 150, -0.35, 1.85, 0.0, 1.0, 9, -0.35, 0.15], [1090, 108, -0.4, 2.0, -0.15, 1.0, 11, -0.35, 0.3], [1190, 135, -0.35, 1.75, -0.3, 0.9, 9, -0.25, 0.2],
    [1250, 215, -0.3, 1.3, -0.7, 0.6, 7, 0.0], [1258, 320, -0.2, 1.0, -1.2, 0.3, 6, 0.0], [1225, 410, -0.5, 0.9, -1.4, 0.1, 6, 0.0],
    # D — descida diagonal até o pé direito, voltando de frente e abrindo em leque
    [1270, 515, -0.3, 1.0, -0.9, 0.3, 6, 0.0], [1350, 605, 0.0, 1.2, -0.4, 0.6, 8, 0.2, 0.5], [1450, 648, 0.2, 1.3, 0.0, 0.8, 10, 0.3, 0.8],
    # R — aro externo direito, sobe quase de perfil (linha luminosa) e passa por trás da pétala
    [1565, 572, -0.1, 1.05, 0.3, 0.3, 6, 0.0], [1638, 468, -0.4, 0.95, 1.0, 0.1, 6, 0.0], [1652, 360, -0.6, 0.95, 1.35, 0.0, 6, 0.0],
    [1612, 262, -0.75, 1.0, 1.2, 0.2, 6, 0.0], [1530, 190, -0.85, 1.1, 0.8, 0.5, 7, -0.2, 0.65], [1400, 148, -1.15, 1.1, 0.4, 0.7, 8, -0.2, 0.2],
    [1278, 172, -0.9, 1.0, 0.6, 0.6, 8, 0.0],
    # H — volta fechada atrás da pétala e arco aninhado da coroa direita, mostrando o verso
    [1232, 188, -1.1, 0.7, 1.1, 0.2, 6, 0.0], [1300, 276, -1.3, 1.1, 0.0, 0.6, 8, 0.2], [1418, 262, -0.2, 1.2, -0.1, 0.8, 9, 0.2, 0.95],
    [1502, 298, -0.15, 1.15, 0.2, 0.7, 8, 0.0, 0.85], [1528, 352, 0.0, 1.05, 0.7, 0.5, 7, 0.0, 0.7],
    # S — redemoinho: enrola para dentro e para a frente, de borda a face
    [1495, 425, 0.4, 1.05, 1.2, 0.3, 7, 0.0, 0.55], [1410, 462, 0.8, 1.15, 0.6, 0.6, 8, 0.2],
    # F — faixa prateada central, à frente, para a esquerda
    [1290, 486, 1.0, 1.35, 0.1, 0.8, 10, 0.3], [1150, 504, 1.1, 1.3, -0.1, 0.8, 10, 0.3], [1020, 524, 0.2, 1.15, 0.0, 0.6, 8, 0.2],
    [905, 556, 0.1, 0.95, 0.4, 0.4, 7, 0.0],
    # L — curva interna esquerda: sobe por dentro do laço, de borda
    [835, 500, -0.15, 0.95, 0.8, 0.2, 6, 0.0, 0.2], [850, 420, -0.25, 1.1, 0.35, 0.5, 7, 0.2, 0.6], [915, 385, -0.3, 1.05, 0.2, 0.5, 7, 0.0, 0.4],
    # M — faixa escura média subindo para a direita, girando até a borda
    [1015, 372, 0.2, 1.1, 0.2, 0.6, 8, 0.0, 0.2], [1140, 370, 0.45, 1.1, -0.1, 0.5, 8, 0.0, 0.3], [1272, 392, 0.4, 1.0, -0.4, 0.4, 7, 0.0],
    [1388, 404, -0.1, 0.75, -1.5, 0.2, 6, 0.0],
    # V — volta por trás da faixa prateada e desce ao pé central
    [1455, 470, -0.6, 0.85, -1.3, 0.2, 6, 0.0], [1400, 548, -0.85, 0.9, -0.8, 0.2, 6, 0.0], [1270, 588, -0.5, 0.95, -0.5, 0.3, 6, 0.0], [1150, 618, -0.05, 1.0, -0.2, 0.3, 6, 0.0],
]

# Estilos da seção (mesmo percurso; o 6º valor de cada ponto muda de papel):
#   plissado — dobras longitudinais contínuas; valor = profundidade das dobras.
#   lamelas  — a fita se divide em lâminas reais, encostadas onde o valor é 0 (leem
#              como uma faixa com vincos finos) e abertas em leque onde cresce: vãos,
#              rotação própria e escalonamento em profundidade (folhas aninhadas).
# V2.1 — lâminas (mesmo percurso e mesmos leques; muda só a seção transversal):
#   satin    (A): face ampla e plana, espessura mínima, borda quase imperceptível;
#   sculpted (B): lâmina fina com leve curvatura transversal (reflexos mais ricos).
MODELS2 = {
    "fiorbe2": (FIORBE2, "lamelas"),
    "fiorbe2-plissado": (FIORBE2, "plissado"),
    "fiorbe2-a": (FIORBE2, "satin"),
    "fiorbe2-b": (FIORBE2, "sculpted"),
}

# Perfil das lâminas V2.1. p: expoente da superelipse da espessura (maior = face mais
# plana e borda mais curta); t_open/t_closed: meia-espessura (× THICK·h/HALF_WIDTH) da
# lâmina solta e da superfície fechada; cup: fração da concavidade da faixa; bow:
# curvatura transversal própria de cada lâmina aberta (fração da meia-largura).
BLADE_STYLES = {
    "satin": {"p": 10.0, "t_open": 0.15, "t_closed": 0.26, "cup": 0.35, "bow": 0.0},
    "sculpted": {"p": 6.0, "t_open": 0.19, "t_closed": 0.3, "cup": 1.0, "bow": 0.07},
}
# Amostras através de cada lâmina (por face): concentradas nas bordas — a curvatura da
# borda fica confinada nela e a face continua plana na luz.
BLADE_XS = [-1.0, -0.965, -0.85, -0.35, 0.35, 0.85, 0.965, 1.0]
STEP_BLADE = 0.055


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def periodic_spline(values, ts, period, samples):
    """Spline cúbica periódica interpolante (C2) — valores por ponto de controle nos
    parâmetros ts (laço de período `period`), avaliada em `samples`."""
    import numpy as np
    n = len(values)
    y = np.asarray(values, dtype=float)
    hseg = np.array([(ts[(i + 1) % n] + (period if i == n - 1 else 0)) - ts[i] for i in range(n)])
    A = np.zeros((n, n))
    rhs = np.zeros(y.shape)
    for i in range(n):
        hp, hn = hseg[i - 1], hseg[i]
        A[i, (i - 1) % n] += hp
        A[i, i] += 2 * (hp + hn)
        A[i, (i + 1) % n] += hn
        rhs[i] = 6 * ((y[(i + 1) % n] - y[i]) / hn - (y[i] - y[i - 1]) / hp)
    M = np.linalg.solve(A, rhs)
    out = []
    for t in samples:
        t = t % period
        i = max(k for k in range(n) if ts[k] <= t)
        hn = hseg[i]
        a = (t - ts[i]) / hn
        b = 1 - a
        j = (i + 1) % n
        out.append(b * y[i] + a * y[j] + ((b ** 3 - b) * M[i] + (a ** 3 - a) * M[j]) * hn * hn / 6)
    return out


def make_spine_c2(points):
    """V2: espinha com curvatura contínua. A Bézier com alças automáticas só é C1 —
    a curvatura salta nos pontos de controle e o referencial muda de ritmo ali
    (quinas nas bordas e nos reflexos). Aqui posição, raio e torção seguem uma
    spline cúbica periódica (C2) por comprimento de corda, amostrada densa numa
    curva poligonal editável."""
    co = [to_local(x, y, z) for x, y, z, *_ in points]
    n = len(co)
    ts = [0.0]
    for i in range(1, n):
        ts.append(ts[-1] + (co[i] - co[i - 1]).length)
    period = ts[-1] + (co[0] - co[-1]).length
    N = int(period / (STEP2 * 0.5))
    samples = [period * k / N for k in range(N)]
    xyz = periodic_spline([tuple(c) for c in co], ts, period, samples)
    rad = periodic_spline([p[3] for p in points], ts, period, samples)
    tilt = periodic_spline([p[4] + BASE_TILT for p in points], ts, period, samples)
    cu = bpy.data.curves.new("Espinha", "CURVE")
    cu.dimensions = "3D"
    cu.twist_mode = "Z_UP"
    sp = cu.splines.new("POLY")
    sp.points.add(N - 1)
    for p_, q, r_, t_ in zip(sp.points, xyz, rad, tilt):
        p_.co = (q[0], q[1], q[2], 1.0)
        p_.radius = r_
        p_.tilt = t_
    sp.use_cyclic_u = True
    ob = bpy.data.objects.new("Espinha", cu)
    bpy.context.scene.collection.objects.link(ob)
    # Frações de arco dos pontos de controle (para os parâmetros da seção).
    dense = [Vector(q) for q in xyz]
    seg = [(dense[(k + 1) % N] - dense[k]).length for k in range(N)]
    total = sum(seg)
    cum = [0.0]
    for sl in seg[:-1]:
        cum.append(cum[-1] + sl)
    ctrl = [cum[min(N - 1, int(round(t / period * N)))] / total for t in ts]
    return ob, ctrl


def make_spine(points, smooth=False):
    cu = bpy.data.curves.new("Espinha", "CURVE")
    cu.dimensions = "3D"
    cu.twist_mode = "Z_UP"
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(points) - 1)
    if smooth:
        # V2: torção e largura interpoladas por spline (sem quinas nos pontos de controle).
        sp.tilt_interpolation = "BSPLINE"
        sp.radius_interpolation = "BSPLINE"
    for bp, (x, y, z, w, t, *_) in zip(sp.bezier_points, points):
        bp.co = to_local(x, y, z)
        bp.handle_left_type = bp.handle_right_type = "AUTO"
        bp.radius = w
        bp.tilt = t + BASE_TILT
    sp.use_cyclic_u = True
    sp.resolution_u = 24
    ob = bpy.data.objects.new("Espinha", cu)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def set_menu(node, name, value):
    node.inputs[name].default_value = value


def make_nodes():
    ng = bpy.data.node_groups.new("Lamina", "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    N, L = ng.nodes, ng.links
    gin = N.new("NodeGroupInput")
    gout = N.new("NodeGroupOutput")

    normal = N.new("GeometryNodeSetCurveNormal")
    set_menu(normal, "Mode", "Z Up")
    resample = N.new("GeometryNodeResampleCurve")
    set_menu(resample, "Mode", "Length")
    resample.inputs["Length"].default_value = STEP
    param = N.new("GeometryNodeSplineParameter")
    store_arc = N.new("GeometryNodeStoreNamedAttribute")
    store_arc.data_type = "FLOAT"
    store_arc.domain = "POINT"
    store_arc.inputs["Name"].default_value = "_arc"

    # Perfil: retângulo fino (largura no eixo X do perfil) com cantos arredondados.
    quad = N.new("GeometryNodeCurvePrimitiveQuadrilateral")
    quad.inputs["Width"].default_value = 2 * HALF_WIDTH
    quad.inputs["Height"].default_value = THICK
    fillet = N.new("GeometryNodeFilletCurve")
    set_menu(fillet, "Mode", "Poly")
    fillet.inputs["Radius"].default_value = THICK * 0.49
    fillet.inputs["Count"].default_value = 2
    prof_res = N.new("GeometryNodeResampleCurve")
    set_menu(prof_res, "Mode", "Count")
    prof_res.inputs["Count"].default_value = 28
    pos = N.new("GeometryNodeInputPosition")
    sep = N.new("ShaderNodeSeparateXYZ")
    div = N.new("ShaderNodeMath")
    div.operation = "DIVIDE"
    div.inputs[1].default_value = HALF_WIDTH
    store_v = N.new("GeometryNodeStoreNamedAttribute")
    store_v.data_type = "FLOAT"
    store_v.domain = "POINT"
    store_v.inputs["Name"].default_value = "_v"

    radius = N.new("GeometryNodeInputRadius")
    c2m = N.new("GeometryNodeCurveToMesh")
    smooth = N.new("GeometryNodeSetShadeSmooth")

    L.new(gin.outputs[0], normal.inputs["Curve"])
    L.new(normal.outputs[0], resample.inputs["Curve"])
    L.new(resample.outputs[0], store_arc.inputs["Geometry"])
    L.new(param.outputs["Factor"], store_arc.inputs["Value"])
    L.new(quad.outputs[0], fillet.inputs["Curve"])
    L.new(fillet.outputs[0], prof_res.inputs["Curve"])
    L.new(prof_res.outputs[0], store_v.inputs["Geometry"])
    L.new(pos.outputs[0], sep.inputs[0])
    L.new(sep.outputs["X"], div.inputs[0])
    L.new(div.outputs[0], store_v.inputs["Value"])
    L.new(store_arc.outputs[0], c2m.inputs["Curve"])
    L.new(store_v.outputs[0], c2m.inputs["Profile Curve"])
    L.new(radius.outputs[0], c2m.inputs["Scale"])
    L.new(c2m.outputs[0], smooth.inputs["Mesh"])
    L.new(smooth.outputs[0], gout.inputs[0])
    return ng


def make_frame_nodes(step=None):
    """V2: só o referencial da fita — uma linha de borda a borda varrida pela curva
    (2 vértices por anel: v = −1 e +1), com _arc e _v. A seção é esculpida depois."""
    step = step or STEP2
    ng = bpy.data.node_groups.new("Referencial", "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    N, L = ng.nodes, ng.links
    gin = N.new("NodeGroupInput")
    gout = N.new("NodeGroupOutput")
    normal = N.new("GeometryNodeSetCurveNormal")
    set_menu(normal, "Mode", "Z Up")
    resample = N.new("GeometryNodeResampleCurve")
    set_menu(resample, "Mode", "Length")
    resample.inputs["Length"].default_value = step
    param = N.new("GeometryNodeSplineParameter")
    store_arc = N.new("GeometryNodeStoreNamedAttribute")
    store_arc.data_type = "FLOAT"
    store_arc.domain = "POINT"
    store_arc.inputs["Name"].default_value = "_arc"
    line = N.new("GeometryNodeCurvePrimitiveLine")
    line.inputs["Start"].default_value = (-HALF_WIDTH, 0, 0)
    line.inputs["End"].default_value = (HALF_WIDTH, 0, 0)
    pos = N.new("GeometryNodeInputPosition")
    sep = N.new("ShaderNodeSeparateXYZ")
    div = N.new("ShaderNodeMath")
    div.operation = "DIVIDE"
    div.inputs[1].default_value = HALF_WIDTH
    store_v = N.new("GeometryNodeStoreNamedAttribute")
    store_v.data_type = "FLOAT"
    store_v.domain = "POINT"
    store_v.inputs["Name"].default_value = "_v"
    radius = N.new("GeometryNodeInputRadius")
    c2m = N.new("GeometryNodeCurveToMesh")
    L.new(gin.outputs[0], normal.inputs["Curve"])
    L.new(normal.outputs[0], resample.inputs["Curve"])
    L.new(resample.outputs[0], store_arc.inputs["Geometry"])
    L.new(param.outputs["Factor"], store_arc.inputs["Value"])
    L.new(line.outputs[0], store_v.inputs["Geometry"])
    L.new(pos.outputs[0], sep.inputs[0])
    L.new(sep.outputs["X"], div.inputs[0])
    L.new(div.outputs[0], store_v.inputs["Value"])
    L.new(store_arc.outputs[0], c2m.inputs["Curve"])
    L.new(store_v.outputs[0], c2m.inputs["Profile Curve"])
    L.new(radius.outputs[0], c2m.inputs["Scale"])
    L.new(c2m.outputs[0], gout.inputs[0])
    return ng


def periodic_catmull(arcs, values, u):
    """Valor no arco u (0..1) interpolando os pontos de controle (laço fechado)."""
    n = len(arcs)
    i = max(k for k in range(n) if arcs[k] <= u) if u >= arcs[0] else n - 1
    a0 = arcs[i]
    a1 = arcs[(i + 1) % n] + (1.0 if i == n - 1 else 0.0)
    uu = u + (1.0 if u < a0 else 0.0)
    f = (uu - a0) / max(a1 - a0, 1e-9)
    p0, p1, p2, p3 = (values[(i + d) % n] for d in (-1, 0, 1, 2))
    f2, f3 = f * f, f * f * f
    return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f2 + (-p0 + 3 * p1 - 3 * p2 + p3) * f3)


def sculpt_blade(frame, arcs, points, style="plissado"):
    """Lâmina esculpida anel a anel sobre o referencial (centro, largura, normal).

    Seção (por anel): face de cima v = −1..1, tampa arredondada, face de baixo
    v = 1..−1, tampa. Superfície média = dobras longitudinais (plissado) +
    concavidade; espessura afina para as bordas. As duas faces seguem a mesma
    superfície média: a espessura se preserva e as dobras são volume real."""
    arc_a = frame.attributes["_arc"].data
    v_a = frame.attributes["_v"].data
    rings = {}
    for vert in frame.vertices:
        r = rings.setdefault(arc_a[vert.index].value, [None, None])
        r[0 if v_a[vert.index].value < 0 else 1] = vert.co.copy()
    keys = sorted(rings)
    R = len(keys)
    centers = [(rings[a][0] + rings[a][1]) * 0.5 for a in keys]
    # Referencial suavizado (janela gaussiana em anéis, laço fechado): direção da
    # largura e meia-largura sem as quinas que a interpolação deixa nos pontos de
    # controle — nas bordas, a meia-largura do centro, elas viravam ondulações.
    raw_w = [(rings[a][1] - rings[a][0]) for a in keys]
    gk = [math.exp(-(d / (FRAME_SMOOTH / 2)) ** 2) for d in range(-FRAME_SMOOTH, FRAME_SMOOTH + 1)]
    widths, halves = [], []
    for r in range(R):
        acc = Vector((0, 0, 0))
        hh = 0.0
        for d, g in zip(range(-FRAME_SMOOTH, FRAME_SMOOTH + 1), gk):
            q = raw_w[(r + d) % R]
            acc += q.normalized() * g
            hh += q.length * 0.5 * g
        widths.append(acc.normalized())
        halves.append(hh / sum(gk))
    extras = [list(p[5:]) + list(V2_DEFAULTS[len(p) - 5:]) for p in points]
    # Curvatura no plano da faixa: uma lâmina afastada da espinha além do raio de
    # curvatura dobra sobre si (quina). O afastamento lateral fica limitado a 80% do
    # raio local — como mínimo suave (mínimo numa janela + gaussiana), para não
    # estrangular a faixa anel a anel.
    lats_raw = []
    for r in range(R):
        c0, cp, cn = centers[r], centers[(r - 3) % R], centers[(r + 3) % R]
        tt = (cn - cp).normalized()
        ww = widths[r] - tt * widths[r].dot(tt)
        ds = (cn - cp).length / 6
        kw = (cn - 2 * c0 + cp).dot(ww.normalized()) / max(9 * ds * ds, 1e-9)
        O_ = min(1.0, max(0.0, periodic_catmull(arcs, [e[3] for e in extras], keys[r]))) if style == "lamelas" else 0.0
        lats_raw.append(min(1.0, 0.8 / max(1e-6, abs(kw) * halves[r] * (1 + 0.45 * O_))))
    W = 10
    lmin = [min(lats_raw[(r + d) % R] for d in range(-W, W + 1)) for r in range(R)]
    gw = [math.exp(-(d / (W / 2)) ** 2) for d in range(-W, W + 1)]
    lats = [sum(lmin[(r + d) % R] * g for d, g in zip(range(-W, W + 1), gw)) / sum(gw) for r in range(R)]
    pleat_v = [e[0] for e in extras]
    lam_v = [e[1] for e in extras]
    cup_v = [e[2] for e in extras]
    open_v = [e[3] for e in extras]
    M = PROFILE2
    if DEBUG_FRAME:
        hs = [(rings[a][1] - rings[a][0]).length * 0.5 for a in keys]
        bad = []
        for r in range(R):
            d2c = (centers[r - 1] - 2 * centers[r] + centers[(r + 1) % R]).length
            d2h = abs(hs[r - 1] - 2 * hs[r] + hs[(r + 1) % R])
            bad.append((d2h, d2c, r))
        for d2h, d2c, r in sorted(bad, reverse=True)[:8]:
            c = centers[r]
            print(f"FIORBE d2h={d2h:.4f} d2c={d2c:.4f} h={hs[r]:.3f} u={keys[r]:.3f} ref=({c.x / PX + REF_CENTER_X:.0f},{REF_FLOOR_PX - (c.y - FLOOR) / PX:.0f})")
    vs = [-1 + 2 * j / (M - 1) for j in range(M)]
    vb = [-1 + 2 * j / (LAMELLA_SAMPLES - 1) for j in range(LAMELLA_SAMPLES)]
    verts, vattr, aattr, normals, custom_n = [], [], [], [], []
    for r, a in enumerate(keys):
        c = centers[r]
        w = widths[r].copy()
        h = halves[r]
        t = (centers[(r + 1) % R] - centers[(r - 1) % R]).normalized()
        n = t.cross(w).normalized()
        w = n.cross(t).normalized()
        normals.append(n)
        if r and DEBUG_FRAME:
            dw = math.degrees(w.angle(prev_w, 0.0))
            if dw > 4:
                print(f"FIORBE giro {dw:.1f}° u={a:.3f} ref=({c.x / PX + REF_CENTER_X:.0f},{REF_FLOOR_PX - (c.y - FLOOR) / PX:.0f}) z={c.z:.2f}")
        prev_w = w.copy()
        P = max(0.0, periodic_catmull(arcs, pleat_v, a))
        k = max(2.0, periodic_catmull(arcs, lam_v, a))
        cup = periodic_catmull(arcs, cup_v, a)
        T = THICK * h / HALF_WIDTH

        def cupped(v):
            return cup * h * 0.22 * (v * v - 1 / 3)

        def half_t(v):
            return 0.5 * T * (0.3 + 0.7 * max(0.0, 1 - v ** 8) ** 0.5)

        if style == "lamelas":
            k = min(k, LAMELLAE)  # a seção fechada tem LAMELLAE×amostras: mais dobras serrilhariam
        depth = P * (2 * h / k) * PLEAT_DEPTH

        def mid(v):
            # Dobras com envelope nulo nas bordas: o número de lamelas varia ao longo
            # do percurso e, sem isso, a fase na borda oscilava (borda ondulada).
            return -depth * math.cos(math.pi * k * v * 0.5) * (1 - v ** 4) + cupped(v)

        if style in BLADE_STYLES:
            # V2.1: lâminas de face plana. Fechadas (abertura 0) formam UMA superfície
            # ampla (mesma espessura e mesma superfície média nas juntas, normais
            # contínuas); abrindo, separam-se com vãos, giro e escalonamento. A
            # abertura passa por smoothstep: vãos quase fechados não ficam como
            # frestas escuras e as lâminas não se cruzam ao girar.
            st = BLADE_STYLES[style]
            O = min(1.0, max(0.0, periodic_catmull(arcs, open_v, a)))
            Os = O * O * (3 - 2 * O)
            lat = lats[r]
            nB = LAMELLAE
            T0 = THICK * h / HALF_WIDTH

            def env(x, pe):
                return max(0.0, 1 - abs(x) ** pe) ** (1 / pe)

            for i in range(nB):
                e = (2 * i - (nB - 1)) / (nB - 1)
                vc0 = -1 + (2 * i + 1) / nB
                vc = vc0 * (1 + 0.45 * Os)
                hb = h / nB * (1 - 0.18 * Os)
                ang = e * Os * FAN_ANGLE
                ca, sa = math.cos(ang), math.sin(ang)
                base = c + w * (vc * h) + n * (e * e * Os * 0.12 * h - Os * 0.06 * h)
                nb = n * ca - w * sa  # normal própria da lâmina girada

                def pos(x, side):
                    vg = vc0 + x / nB
                    th = (1 - Os) * st["t_closed"] * T0 * env(vg, st["p"]) + Os * st["t_open"] * T0 * env(x, st["p"])
                    surf = st["cup"] * cupped(vg if Os < 1e-6 else vc + x * hb / h)
                    surf += Os * st["bow"] * hb * (x * x - 1 / 3)
                    lx = x * hb
                    ly = side * th + surf
                    return c + (base - c) * lat + w * ((lx * ca - ly * sa) * lat) + n * (lx * sa + ly * ca)

                ring = [(x, 1) for x in BLADE_XS] + [(x, -1) for x in reversed(BLADE_XS)]
                for x, side in ring:
                    q = pos(x, side)
                    # Normal analítica do perfil: derivada da própria seção (não da malha).
                    dx = 0.012
                    x0, x1 = max(-1.0, x - dx), min(1.0, x + dx)
                    d = pos(x1, side) - pos(x0, side)
                    nn = t.cross(d).normalized()
                    if nn.dot(nb * side) < 0:
                        nn = -nn
                    # Na ponta (x = ±1) a normal gira para fora pela borda — só na lâmina solta.
                    # Encostada na vizinha (fechada), a junta fica quase invisível: um vinco
                    # leve, não uma linha escura (era o giro inteiro que desenhava frestas).
                    if abs(x) > 0.999:
                        out = (w * ca + n * sa) * (1 if x > 0 else -1)
                        nn = (nn + out * (0.1 + 1.3 * Os)).normalized()
                    verts.append(q)
                    custom_n.append(nn)
                    vattr.append(max(-1.0, min(1.0, vc + x * hb / h)))
                    aattr.append(a)
            continue

        if style == "lamelas":
            # Híbrido: fechada (abertura 0) a seção é a mesma lâmina plissada contínua —
            # as lâminas se encostam sem degrau (mesma superfície média e espessura nas
            # juntas; as tampas internas ficam escondidas). Abrindo, cada lâmina se
            # separa: vãos, giro em leque, escalonamento e bordas próprias afinando.
            O = min(1.0, max(0.0, periodic_catmull(arcs, open_v, a)))
            lat = lats[r]
            nB = LAMELLAE
            for i in range(nB):
                e = (2 * i - (nB - 1)) / (nB - 1)
                vc0 = -1 + (2 * i + 1) / nB
                vc = vc0 * (1 + 0.45 * O)
                hb = h / nB * (1 - 0.18 * O)
                ang = e * O * FAN_ANGLE
                ca, sa = math.cos(ang), math.sin(ang)
                base = c + w * (vc * h) + n * (e * e * O * 0.12 * h - O * 0.06 * h)
                ring = [(x, 1) for x in vb] + [(1.0, 0)] + [(x, -1) for x in reversed(vb)] + [(-1.0, 0)]
                for x, side in ring:
                    vg = vc0 + x / nB  # posição na faixa fechada
                    th = (1 - O) * half_t(vg) + O * 0.55 * half_t(x)
                    capx = 0.0 if side else 0.5 * 0.3 * T / max(hb, 1e-6) * (1 if x > 0 else -1)
                    lx = (x + capx) * hb
                    ly = side * th + mid(vg) * (1 - O) + cupped(vc + x * hb / h) * O
                    verts.append(c + (base - c) * lat + w * ((lx * ca - ly * sa) * lat) + n * (lx * sa + ly * ca))
                    vattr.append(max(-1.0, min(1.0, vc + x * hb / h)))
                    aattr.append(a)
            continue

        ring = [(v, mid(v) + half_t(v)) for v in vs]
        ring.append((1 + 0.5 * 0.35 * T / max(h, 1e-6), mid(1)))
        ring += [(v, mid(v) - half_t(v)) for v in reversed(vs)]
        ring.append((-1 - 0.5 * 0.35 * T / max(h, 1e-6), mid(-1)))
        for v, off in ring:
            verts.append(c + w * (v * h) + n * off)
            vattr.append(max(-1.0, min(1.0, v)))
            aattr.append(a)
    if style in BLADE_STYLES:
        loops = [(i * 2 * len(BLADE_XS), 2 * len(BLADE_XS)) for i in range(LAMELLAE)]
    elif style == "lamelas":
        Mb = len(vb)
        loops = [(i * (2 * Mb + 2), 2 * Mb + 2) for i in range(LAMELLAE)]
    else:
        loops = [(0, 2 * M + 2)]
    S = sum(sz for _, sz in loops)
    faces = []
    for r in range(R):
        r2 = (r + 1) % R
        for off, sz in loops:
            for j in range(sz):
                j2 = (j + 1) % sz
                faces.append((r * S + off + j, r * S + off + j2, r2 * S + off + j2, r2 * S + off + j))
    if DEBUG_FRAME:
        # Suavidade das bordas externas da seção (primeiro e último vértice de face de cima).
        S0 = len(verts) // R
        Sb = S0 // LAMELLAE
        for col in [i * Sb for i in range(LAMELLAE)] + [i * Sb + LAMELLA_SAMPLES - 1 for i in range(LAMELLAE)]:
            chain = [verts[r * S0 + col] for r in range(R)]
            worst = sorted(((chain[r - 1] - 2 * chain[r] + chain[(r + 1) % R]).length, r) for r in range(R) if 0.15 < keys[r] < 0.25)[-1:]
            for d2, r in worst:
                c = chain[r]
                print(f"FIORBE borda col={col} d2={d2:.4f} u={keys[r]:.3f} ref=({c.x / PX + REF_CENTER_X:.0f},{REF_FLOOR_PX - (c.y - FLOOR) / PX:.0f}) P={periodic_catmull(arcs, open_v, keys[r]):.2f}")
    if DEBUG_FRAME:
        S0 = len(verts) // R
        cam = Vector((0, 0, 10))
        for idx, q in enumerate(verts):
            # Projeção aproximada na câmera (perspectiva a z=10) → px da referência.
            k_ = 10 / (10 - q.z)
            x_ = q.x * k_ / PX + REF_CENTER_X
            y_ = REF_FLOOR_PX - ((q.y - FLOOR) * k_) / PX
            r_, j_ = divmod(idx, S0)
            if False:
                print(f"FIORBE cadeia u={keys[r_]:.3f} x={x_:.0f} y={y_:.1f} z={q.z:.3f} h={halves[r_]:.3f} P={periodic_catmull(arcs, open_v, keys[r_]):.3f}")
            if False:
                r_, j_ = divmod(idx, S0)
                print(f"FIORBE ponto u={keys[r_]:.3f} col={j_} blade={j_ // (S0 // LAMELLAE)} y={y_:.0f} z={q.z:.2f}")
    me = bpy.data.meshes.new("Lamina2")
    me.from_pydata([tuple(p) for p in verts], [], faces)
    me.update()
    # Faces para fora: a face de cima (j no meio) deve apontar para +n.
    probe = me.polygons[(R // 3) * S + loops[0][1] // 4]
    if probe.normal.dot(normals[R // 3]) < 0:
        me.flip_normals()
    me.shade_smooth()
    if custom_n:
        # Normais do perfil (V2.1): a transição face/borda é controlada pela seção, sem arestas vivas.
        me.normals_split_custom_set_from_vertices([tuple(v) for v in custom_n])
    at = me.attributes.new("_arc", "FLOAT", "POINT")
    at.data.foreach_set("value", aattr)
    av = me.attributes.new("_v", "FLOAT", "POINT")
    av.data.foreach_set("value", vattr)
    me.update()
    return me


def evaluated_mesh(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev, preserve_all_data_layers=True, depsgraph=dg)
    return me


def floor_clamp(me):
    # Nada abaixo do chão (os pés apoiam); y é "cima" neste espaço.
    for v in me.vertices:
        if v.co.y < FLOOR + 0.002:
            v.co.y = FLOOR + 0.002


def control_arcs(spline):
    """Fração de arco de cada ponto de controle (amostrando os segmentos Bézier)."""
    from mathutils.geometry import interpolate_bezier
    pts = spline.bezier_points
    n = len(pts)
    seg = []
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]
        q = interpolate_bezier(a.co, a.handle_right, b.handle_left, b.co, 32)
        seg.append(sum((q[k + 1] - q[k]).length for k in range(len(q) - 1)))
    total = sum(seg)
    acc, out = 0.0, []
    for s_ in seg:
        out.append(acc / total)
        acc += s_
    return out


def nearest_point(arcs, u):
    best = min(range(len(arcs)), key=lambda i: min(abs(arcs[i] - u), 1 - abs(arcs[i] - u)))
    return best


def check_intersections(me, length):
    arc = me.attributes["_arc"].data
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    tree = BVHTree.FromBMesh(bm)
    pairs = tree.overlap(tree)
    def circ_mean(vals):
        # Média circular: a face da emenda liga u≈1 a u=0 (média simples daria 0,5).
        sx = sum(math.cos(2 * math.pi * v) for v in vals)
        sy = sum(math.sin(2 * math.pi * v) for v in vals)
        return (math.atan2(sy, sx) / (2 * math.pi)) % 1.0
    face_arc = [circ_mean([arc[v.index].value for v in f.verts]) for f in bm.faces]
    real = []
    for a, b in pairs:
        d = abs(face_arc[a] - face_arc[b])
        d = min(d, 1 - d) * length
        if d > 0.9:
            real.append((a, b, face_arc[a], face_arc[b]))
            if len(real) <= 4:
                c = bm.faces[a].calc_center_median()
                print(f"FIORBE hit u={face_arc[a]:.3f}/{face_arc[b]:.3f} ref=({c.x / PX + REF_CENTER_X:.0f},{REF_FLOOR_PX - (c.y - FLOOR) / PX:.0f}) z={c.z:.2f}")
    bm.free()
    return real


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    model = argv[0] if argv else "teste"
    glb = argv[1] if len(argv) > 1 else None
    blend = argv[2] if len(argv) > 2 else None
    clear_scene()
    v2 = model in MODELS2
    points, style = MODELS2[model] if v2 else (MODELS[model], None)
    if v2:
        spine, ctrl_arcs = make_spine_c2(points)
    else:
        spine = make_spine(points)
    mod = spine.modifiers.new("Lamina", "NODES")
    mod.node_group = (make_frame_nodes(STEP_BLADE if style in BLADE_STYLES else None)) if v2 else make_nodes()

    me = evaluated_mesh(spine)
    if v2:
        frame = me
        me = sculpt_blade(frame, ctrl_arcs, points, style)
        bpy.data.meshes.remove(frame)
    floor_clamp(me)
    length = spine.data.splines[0].calc_length()
    print(f"FIORBE modelo={model} vertices={len(me.vertices)} triangulos~={sum(len(p.vertices) - 2 for p in me.polygons)} comprimento={length:.2f}")
    xs = [v.co.x for v in me.vertices]
    ys = [v.co.y for v in me.vertices]
    zs = [v.co.z for v in me.vertices]
    print(f"FIORBE limites x[{min(xs):.2f},{max(xs):.2f}] y[{min(ys):.2f},{max(ys):.2f}] z[{min(zs):.2f},{max(zs):.2f}]")
    hits = check_intersections(me, length)
    groups = {}
    for _, _, ua, ub in hits:
        key = (round(min(ua, ub), 2), round(max(ua, ub), 2))
        groups[key] = groups.get(key, 0) + 1
    arcs = ctrl_arcs if v2 else control_arcs(spine.data.splines[0])
    pairs = {}
    for (ua, ub), c in groups.items():
        k = (nearest_point(arcs, ua), nearest_point(arcs, ub))
        pairs[k] = pairs.get(k, 0) + c
    print(f"FIORBE intersecoes={len(hits)} pontos={sorted(pairs.items())}")

    if glb:
        out = bpy.data.objects.new("Escultura", me)
        if v2:
            # O Three lê isto (extras do glTF) para não inverter as faces, que já saem para fora.
            out["fiorbe_outward"] = 1
        bpy.context.scene.collection.objects.link(out)
        # Espaço do Three (y cima, z observador) → Blender Z-up; o exportador devolve ao Y-up.
        me.transform(Matrix.Rotation(math.radians(90), 4, "X"))
        me.update()
        bpy.ops.object.select_all(action="DESELECT")
        out.select_set(True)
        bpy.context.view_layer.objects.active = out
        bpy.ops.export_scene.gltf(
            filepath=glb,
            export_format="GLB",
            use_selection=True,
            export_attributes=True,
            export_normals=True,
            export_texcoords=False,
            export_materials="NONE",
            export_apply=False,
            export_yup=True,
            export_extras=True,
        )
        if not v2:
            bpy.data.objects.remove(out)
        print("FIORBE glb", glb)
    if blend:
        bpy.ops.wm.save_as_mainfile(filepath=blend)
        print("FIORBE blend", blend)


main()
