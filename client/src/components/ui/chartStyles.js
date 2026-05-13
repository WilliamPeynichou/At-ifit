// Style partagé pour les Tooltips Recharts utilisés dans les modales sur fond sombre.
// - Le fond + bordure restent sombres.
// - Le `labelStyle` (la ligne X, souvent la date) est en blanc pour rester lisible.
// - On NE FORCE PAS `itemStyle.color` : Recharts utilise alors la couleur de chaque série
//   (stroke d'une Line, fill d'un Bar, etc.), ce qui respecte le code couleur du graphique.
// - `contentStyle.color` reste blanc comme fallback (texte par défaut quand une série n'a
//   pas de couleur explicite).

export const darkTooltipProps = {
  contentStyle: {
    backgroundColor: 'rgba(19,16,20,0.97)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    color: '#ffffff',
  },
  labelStyle: { color: '#ffffff', fontWeight: 600 },
  cursor: { stroke: 'rgba(255,255,255,0.18)', strokeWidth: 1 },
};

// Variante quand on veut surcharger la couleur de bordure (accent par graphe).
export const darkTooltipWithBorder = (borderColor) => ({
  ...darkTooltipProps,
  contentStyle: { ...darkTooltipProps.contentStyle, border: `1px solid ${borderColor}` },
});
