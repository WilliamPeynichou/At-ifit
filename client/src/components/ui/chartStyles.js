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

export const lightTooltipProps = {
  contentStyle: {
    backgroundColor: '#ffffff',
    border: '1px solid rgba(15,23,42,0.16)',
    borderRadius: 8,
    color: '#0f172a',
    boxShadow: '0 12px 28px rgba(15,23,42,0.14)',
  },
  labelStyle: { color: '#0f172a', fontWeight: 700 },
  itemStyle: { color: '#0f172a' },
  cursor: { stroke: 'rgba(15,23,42,0.22)', strokeWidth: 1 },
};

export const darkTooltipWithBorder = (borderColor) => ({
  ...darkTooltipProps,
  contentStyle: { ...darkTooltipProps.contentStyle, border: `1px solid ${borderColor}` },
});
