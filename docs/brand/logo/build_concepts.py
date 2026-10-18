"""Génère les concepts de logo Atifit (SVG noir, viewBox 256)."""
import math
import os
import re

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "concepts")
os.makedirs(D, exist_ok=True)
INK = "#131014"


def poly(pts):
    return "M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in pts) + " Z"


def rect(x, y, w, h):
    return poly([(x, y), (x + w, y), (x + w, y + h), (x, y + h)])


def paths_xml(paths, rule="evenodd"):
    """Une <path> par élément (évite les trous dus au sens de tracé). Préfixe 'EO:' = evenodd forcé."""
    out = []
    for p in paths:
        r = rule
        if p.startswith("EO:"):
            p, r = p[3:], "evenodd"
        out.append(f'<path fill="{INK}" fill-rule="{r}" d="{p}"/>')
    return "".join(out)


def svg(paths, w=256, h=256, rule="evenodd"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}">'
            f'{paths_xml(paths, rule)}</svg>\n')


def translate(d, dx, dy, sc=1.0):
    return re.sub(r"(-?\d+\.?\d*),(-?\d+\.?\d*)",
                  lambda m: f"{float(m.group(1))*sc+dx:.2f},{float(m.group(2))*sc+dy:.2f}", d)


# ---------- Wordmark ATIFIT : capitales condensées (esprit Bebas Neue), construites en polygones
H, S = 120, 24  # hauteur de capitale, graisse


def L_A(x0):
    """A en un seul contour : trapèze extérieur + contreforme + encoche basse (evenodd)."""
    W, a, leg = 2 * (5 + H * math.tan(math.radians(15))), 5, 22
    def ol(y): return x0 + W / 2 - a - (W / 2 - a) * y / H   # bord extérieur gauche
    def orr(y): return x0 + W / 2 + a + (W / 2 - a) * y / H  # bord extérieur droit
    outer = poly([(ol(0), 0), (orr(0), 0), (orr(H), H), (ol(H), H)])
    # sommet du contreforme : là où les bords intérieurs se croisent
    yc = H * (2 * leg - 2 * a) / (W - 2 * a)
    b0, b1 = H * 0.68, H * 0.68 + 17
    counter = poly([(x0 + W / 2, yc), (orr(b0) - leg, b0), (ol(b0) + leg, b0)])
    notch = poly([(ol(b1) + leg, b1), (orr(b1) - leg, b1), (orr(H) - leg, H), (ol(H) + leg, H)])
    return ["EO:" + " ".join([outer, counter, notch])], W


def L_T(x0):
    W = 60
    return [rect(x0, 0, W, S), rect(x0 + W / 2 - S / 2, 0, S, H)], W


def L_I(x0):
    return [rect(x0, 0, S, H)], S


def L_F(x0):
    W = 54
    return [rect(x0, 0, S, H), rect(x0, 0, W, S), rect(x0, H * 0.43, W * 0.8, S * 0.9)], W


def wordmark(sp=12):
    out, x = [], 0
    for f in (L_A, L_T, L_I, L_F, L_I, L_T):
        ps, w = f(x)
        out += ps
        x += w + sp
    return out, x - sp


WM, WMW = wordmark()


# ---------- A : Delta A — le contreforme de l'A porte un Δ (la variation, le progrès)
def a_letter(ax=128, top=28, base=228, hw=106, apex=16, legw=52):
    outer = [(ax - apex, top), (ax + apex, top), (ax + hw, base), (ax - hw, base)]
    slope = (hw - apex) / (base - top)          # dx par dy
    ib = hw - legw
    ny = base - ib / slope
    inner = [(ax, ny), (ax + ib, base), (ax - ib, base)]
    return outer, inner, slope, ny


def _pt(cx, cy, R, t):
    t = math.radians(t)
    return cx + R * math.cos(t), cy + R * math.sin(t)


def ring_arc(cx, cy, R, r, t0, t1, t1_inner=None):
    """Secteur d'anneau t0..t1 (degrés, sens écran) en arcs SVG natifs. t1_inner : coupe non radiale."""
    ti1 = t1 if t1_inner is None else t1_inner
    if abs(t1 - t0) >= 360:  # anneau complet : deux demi-cercles + trou
        def circ(rr, sweep):
            (x0, y0), (x1, y1) = _pt(cx, cy, rr, 0), _pt(cx, cy, rr, 180)
            return (f"M{x0:.2f},{y0:.2f} A{rr},{rr} 0 1 {sweep} {x1:.2f},{y1:.2f} "
                    f"A{rr},{rr} 0 1 {sweep} {x0:.2f},{y0:.2f} Z")
        return circ(R, 1) + " " + circ(r, 0)
    (a, b), (c, d) = _pt(cx, cy, R, t0), _pt(cx, cy, R, t1)
    (e, f), (g, h) = _pt(cx, cy, r, ti1), _pt(cx, cy, r, t0)
    lo = 1 if abs(t1 - t0) > 180 else 0
    li = 1 if abs(ti1 - t0) > 180 else 0
    return (f"M{a:.2f},{b:.2f} A{R},{R} 0 {lo} 1 {c:.2f},{d:.2f} L{e:.2f},{f:.2f} "
            f"A{r},{r} 0 {li} 0 {g:.2f},{h:.2f} Z")


def concept_a():
    o, i, sl, ny = a_letter()
    gap = 15
    k = math.hypot(1, sl) / 1.0             # décalage perpendiculaire -> vertical
    dtop = ny + gap * k
    dbase = 228 - 34
    dhw = (dbase - dtop) * sl  # mêmes angles que les jambes
    delta = [(128, dtop), (128 + dhw, dbase), (128 - dhw, dbase)]
    return svg(["EO:" + " ".join([poly(o), poly(i), poly(delta)])])


# ---------- B : Départ décalé — deux couloirs de piste, départs décalés comme sur un 400 m
def stadium_ring(cx, cy, L, rc, t, gx0, gx1):
    """Couloir de piste (stade horizontal) ouvert sur la ligne droite basse entre x=gx0 et x=gx1."""
    R, r = rc + t / 2, rc - t / 2
    xl, xr = cx - L / 2, cx + L / 2
    return (f"M{gx0:.2f},{cy+R:.2f} L{xl:.2f},{cy+R:.2f} A{R},{R} 0 0 1 {xl:.2f},{cy-R:.2f} "
            f"L{xr:.2f},{cy-R:.2f} A{R},{R} 0 0 1 {xr:.2f},{cy+R:.2f} L{gx1:.2f},{cy+R:.2f} "
            f"L{gx1:.2f},{cy+r:.2f} L{xr:.2f},{cy+r:.2f} A{r},{r} 0 0 0 {xr:.2f},{cy-r:.2f} "
            f"L{xl:.2f},{cy-r:.2f} A{r},{r} 0 0 0 {xl:.2f},{cy+r:.2f} L{gx0:.2f},{cy+r:.2f} Z")


def concept_b():
    L, t = 84, 24
    outer = stadium_ring(128, 128, L, 68, t, 139, 154)   # départ décalé : couloir extérieur en avance
    inner = stadium_ring(128, 128, L, 32, t, 109, 124)
    return svg([outer, inner], rule="evenodd")


# ---------- C : Équilibre — la barre de l'A déborde également des deux côtés : kcal in = kcal out
def concept_c():
    # « @ifit » : le @ (At-ifit) dessiné comme un a enveloppé d'un tour de piste
    cx, cy = 128, 128
    # la queue rejoint l'anneau par une coupe horizontale à y = cy + 22
    R, r = 108, 85
    xo, xi = math.sqrt(R**2 - 22**2), math.sqrt(r**2 - 22**2)
    sw = xo - xi  # graisse commune fût / queue / anneau
    bowl = ring_arc(cx - 6, cy, 44, 21, 0, 360)
    stem = rect(cx + 16, cy - 44, sw, 66)
    tail_cx = (cx + 16 + cx + xo) / 2
    tail = ring_arc(tail_cx, cy + 22, cx + xo - tail_cx, cx + xo - tail_cx - sw, 0, 180)
    outer = ring_arc(cx, cy, R, r, -274, math.degrees(math.asin(22 / R)),
                     t1_inner=math.degrees(math.asin(22 / r)))
    return svg([bowl, stem, tail, outer], rule="evenodd")


def lockup(sym):
    inner = re.search(r'<svg[^>]*>(.*)</svg>', sym, re.S).group(1)
    dx, dy = 256 + 36, (256 - H) / 2
    w = [("EO:" + translate(p[3:], dx, dy)) if p.startswith("EO:") else translate(p, dx, dy) for p in WM]
    tot = dx + WMW + 8
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {tot:.0f} 256">'
            f'{inner}{paths_xml(w, "nonzero")}</svg>\n')


if __name__ == "__main__":
    for key, fn in (("a", concept_a), ("b", concept_b), ("c", concept_c)):
        s = fn()
        open(os.path.join(D, f"{key}-symbol.svg"), "w").write(s)
        open(os.path.join(D, f"{key}-lockup.svg"), "w").write(lockup(s))
    open(os.path.join(D, "wordmark.svg"), "w").write(svg(WM, WMW, H, rule="nonzero"))
    print("ok", sorted(os.listdir(D)))
