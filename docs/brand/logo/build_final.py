"""Kit final du logo Atifit — direction A « Delta A ».

Génère dans final/ : symbole (couleur, sombre, petite taille), lockups horizontal et empilé,
wordmark seul, chacun en version claire et sombre. Relancer : python3 build_final.py
"""
import math
import os

from build_concepts import H, WM, WMW, a_letter, poly, translate

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "final")
os.makedirs(OUT, exist_ok=True)

INK = "#131014"      # noir Atifit (fond sombre de l'app)
BLUE = "#0055ff"     # bleu électrique, accent unique de l'app
PAPER = "#faf9f5"    # blanc cassé (fond clair de l'app)

THEMES = {
    "light": {"a": INK, "delta": BLUE, "word": INK},     # sur fond clair
    "dark": {"a": PAPER, "delta": BLUE, "word": PAPER},  # sur #131014
    "tile": {"a": "#ffffff", "delta": "#ffffff", "word": "#ffffff"},  # sur aplat bleu (tout blanc, comme les icônes)
}


def delta_a(gap=15, legw=52, apex=16, dbase=194):
    """Retourne (A évidé, Δ). Le Δ a les mêmes angles que les jambes, avec un jeu constant `gap`."""
    o, i, sl, ny = a_letter(apex=apex, legw=legw)
    dtop = ny + gap * math.hypot(1, sl)
    dhw = (dbase - dtop) * sl
    return poly(o) + " " + poly(i), poly([(128, dtop), (128 + dhw, dbase), (128 - dhw, dbase)])


# Boîte utile du symbole (en unités du canvas 256) : x 22..234, y 28..228
SYM_X0, SYM_Y0, SYM_W, SYM_H = 22, 28, 212, 200


def path(d, fill, rule="evenodd"):
    return f'<path fill="{fill}" fill-rule="{rule}" d="{d}"/>'


def symbol_paths(t, dx=0.0, dy=0.0, sc=1.0, small=False):
    a, d = delta_a(gap=24, legw=58, apex=18, dbase=200) if small else delta_a()
    return path(translate(a, dx, dy, sc), t["a"]) + path(translate(d, dx, dy, sc), t["delta"])


def word_paths(t, dx, dy, sc=1.0):
    out = []
    for p in WM:
        rule = "nonzero"
        if p.startswith("EO:"):
            p, rule = p[3:], "evenodd"
        out.append(path(translate(p, dx, dy, sc), t["word"], rule))
    return "".join(out)


def doc(w, h, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" role="img">'
            f'<title>{title}</title>{body}</svg>\n')


def build():
    files = {}
    for name, t in THEMES.items():
        # symbole seul (canvas carré 256, marges intégrées)
        files[f"atifit-symbol-{name}.svg"] = doc(256, 256, symbol_paths(t), "Atifit")
        files[f"atifit-symbol-small-{name}.svg"] = doc(256, 256, symbol_paths(t, small=True), "Atifit")

        # lockup horizontal : A haut de 200, capitales de 120 centrées verticalement ; espace = 0,45 × capitale
        m = 24
        gap = round(H * 0.45)
        wx = m + SYM_W + gap
        w = wx + WMW + m
        h = SYM_H + 2 * m
        body = symbol_paths(t, dx=m - SYM_X0, dy=m - SYM_Y0) + word_paths(t, wx, m + (SYM_H - H) / 2)
        files[f"atifit-horizontal-{name}.svg"] = doc(w, h, body, "Atifit")

        # lockup empilé : symbole centré au-dessus du wordmark ; espace = 0,4 × capitale
        sw = max(SYM_W, WMW)
        w = sw + 2 * m
        sgap = round(H * 0.4)
        h = SYM_H + sgap + H + 2 * m
        body = (symbol_paths(t, dx=m + (sw - SYM_W) / 2 - SYM_X0, dy=m - SYM_Y0)
                + word_paths(t, m + (sw - WMW) / 2, m + SYM_H + sgap))
        files[f"atifit-stacked-{name}.svg"] = doc(w, h, body, "Atifit")

        # wordmark seul
        files[f"atifit-wordmark-{name}.svg"] = doc(WMW + 2 * m, H + 2 * m, word_paths(t, m, m), "Atifit")

    for fn, s in files.items():
        open(os.path.join(OUT, fn), "w").write(s)
    # alias pratiques : la version claire est le master
    for kind in ("symbol", "symbol-small", "horizontal", "stacked", "wordmark"):
        src = os.path.join(OUT, f"atifit-{kind}-light.svg")
        open(os.path.join(OUT, f"atifit-{kind}.svg"), "w").write(open(src).read())
    return sorted(os.listdir(OUT))


if __name__ == "__main__":
    print("\n".join(build()))
