"""
FIORBE — construtor da escultura no Blender (rodar em background):

  blender --background --factory-startup --python blender/build_sculpture.py -- <modelo> <saida.glb> [saida.blend]

modelo: "teste" (prova de integração: um anel torcido) ou "fiorbe" (escultura).

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


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_spine(points):
    cu = bpy.data.curves.new("Espinha", "CURVE")
    cu.dimensions = "3D"
    cu.twist_mode = "Z_UP"
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(points) - 1)
    for bp, (x, y, z, w, t) in zip(sp.bezier_points, points):
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
    spine = make_spine(MODELS[model])
    mod = spine.modifiers.new("Lamina", "NODES")
    mod.node_group = make_nodes()

    me = evaluated_mesh(spine)
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
    arcs = control_arcs(spine.data.splines[0])
    pairs = {}
    for (ua, ub), c in groups.items():
        k = (nearest_point(arcs, ua), nearest_point(arcs, ub))
        pairs[k] = pairs.get(k, 0) + c
    print(f"FIORBE intersecoes={len(hits)} pontos={sorted(pairs.items())}")

    if glb:
        out = bpy.data.objects.new("Escultura", me)
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
        )
        bpy.data.objects.remove(out)
        print("FIORBE glb", glb)
    if blend:
        bpy.ops.wm.save_as_mainfile(filepath=blend)
        print("FIORBE blend", blend)


main()
