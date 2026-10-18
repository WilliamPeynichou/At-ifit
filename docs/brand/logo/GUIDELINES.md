# Atifit — Guide d'usage du logo

> Kit généré avec le skill [logo-design](https://github.com/kaankiziltug/logo-design-skill).
> Sources régénérables : `build_concepts.py` (géométrie) puis `build_final.py` (kit).

## 1. Le logo
- **Idée** : l'A d'Atifit porte un **Δ**, le symbole de la variation : chaque séance fait bouger la courbe.
- **Construction** : jambes à 75°, sommet plat ; le Δ reprend exactement les angles des jambes, avec un jeu constant.
  Le wordmark ATIFIT est construit en formes vectorielles, dans l'esprit de Bebas Neue (aucune police requise).
- **Versions** (`final/`) :

| Fichier | Usage |
|---|---|
| `atifit-horizontal.svg` | **Version principale** (header, documents) |
| `atifit-stacked.svg` | Formats carrés ou hauts (splash, affiche) |
| `atifit-symbol.svg` | Symbole seul (avatar, petite place) |
| `atifit-symbol-small.svg` | Symbole **sous 32 px** : jeu élargi, Δ plus petit et plus net |
| `atifit-wordmark.svg` | Nom seul, quand le symbole est déjà présent à côté |
| `*-dark.svg` | Sur fond sombre `#131014` |
| `*-tile.svg` | Tout blanc, sur aplat bleu `#0055ff` |
| `variants/` | Horizontal noir, blanc et bleu + PNG 1200 px |
| `web/` | favicon.ico/.svg, PNG 16–512, apple-touch-icon, maskable, `site.webmanifest`, `head-snippet.html` |

## 2. Zone de protection
Garder autour du logo un espace libre égal à **la largeur d'une jambe de l'A** (≈ ¼ de la hauteur du symbole).
Cette zone suit la taille du logo ; ne pas utiliser de distance fixe.

## 3. Tailles minimales
| Version | Écran | Impression |
|---|---|---|
| Horizontal | 96 px de large | 25 mm |
| Symbole | 16 px (`atifit-symbol-small` / `favicon`) | 6 mm |

## 4. Couleurs
| Nom | HEX | RGB | CMYK (approx.) | Rôle |
|---|---|---|---|---|
| Bleu Atifit | `#0055ff` | 0 85 255 | 100 67 0 0 | Le Δ, aplats de marque |
| Encre | `#131014` | 19 16 20 | 0 20 0 92 | L'A, le wordmark |
| Papier | `#faf9f5` | 250 249 245 | 0 0 2 2 | Fonds clairs, logo sur sombre |

Contrastes : bleu sur blanc 5,6:1 · bleu sur encre 3,4:1 (suffisant pour un élément graphique, pas pour du texte) ·
blanc sur bleu 5,6:1.

**Associations validées** : couleur sur blanc / papier · version `dark` sur `#131014` · tout blanc sur `#0055ff` ·
noir sur blanc (impression une couleur). Sur une photo : version blanche ou noire sur une zone calme.

## 5. Typographie
Titres : Bebas Neue · Texte : Outfit 400/500/600 · Données : Geist Mono (déjà auto-hébergées dans le client,
licence SIL OFL).

## 6. À ne pas faire
Étirer ou écraser · recolorer hors palette (le Δ reste bleu ou de la couleur unique du logo) · faire pivoter ·
ajouter ombre, contour, dégradé ou effet · déplacer ou redimensionner séparément le symbole et le nom ·
poser sur un fond chargé sans aplat · retaper « ATIFIT » au clavier au lieu d'utiliser le fichier.

## 7. Points ouverts
- Recherche d'antériorité de marque (INPI / EUIPO, recherche d'image inversée) non effectuée : à faire avant dépôt.
- Masters PDF/EPS pour l'impression non générés (pas d'Illustrator/Inkscape ici) : exporter depuis les SVG.
- Intégration dans le client (`client/index.html` utilise encore `/vite.svg`) : à faire.
