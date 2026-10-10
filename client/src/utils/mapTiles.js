/**
 * Fonds de carte. Les tuiles CARTO exigent désormais une clé API : on utilise
 * OpenStreetMap (plan) et OpenTopoMap (relief, courbes de niveau).
 */
export const MAP_TILES = {
  plan: {
    id: 'plan',
    label: 'Plan',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  topo: {
    id: 'topo',
    label: 'Relief',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM | &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
  },
};

export const MAP_PROVIDER_LABEL = 'OpenStreetMap / OpenTopoMap';
