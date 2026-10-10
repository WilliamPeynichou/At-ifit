import React, { useRef, useState } from 'react';
import { AlertTriangle, FileUp, Upload } from 'lucide-react';
import { buildCourse, estimateCourseMinutes, parseGpx } from '../../utils/gpxCourse';
import { suggestClimbs, suggestStations } from './suggestions';

const MAX_POINTS = 6000;

export function GpxDropzone({ onLoaded, compact = false, sport = 'running' }) {
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadFile = async file => {
    if (!file) return;
    setError('');
    if (!/\.gpx$/i.test(file.name)) { setError('Format attendu : fichier .gpx'); return; }
    setBusy(true);
    try {
      const parsed = parseGpx(await file.text());
      const step = Math.max(1, Math.floor(parsed.points.length / MAX_POINTS));
      const points = parsed.points
        .filter((_, i) => i % step === 0 || i === parsed.points.length - 1)
        .map(p => ({ lat: +p.lat.toFixed(6), lon: +p.lon.toFixed(6), ele: p.ele === null ? null : +p.ele.toFixed(1) }));
      const gpx = { fileName: file.name, name: parsed.name, points, waypoints: parsed.waypoints };
      const course = buildCourse(points, { waypoints: parsed.waypoints });
      onLoaded?.({
        gpx,
        course,
        info: {
          name: parsed.name,
          distanceKm: Number(course.stats.distanceKm.toFixed(2)),
          elevationGainM: course.stats.gainM,
          estimatedMinutes: Math.round(estimateCourseMinutes(course, sport)),
        },
        suggested: {
          stations: suggestStations(course, sport),
          sections: suggestClimbs(course, sport),
        },
      });
    } catch (err) {
      setError(err.message || 'Impossible de lire ce GPX.');
    } finally {
      setBusy(false);
    }
  };

  const openPicker = () => fileRef.current?.click();

  const input = (
    <input
      ref={fileRef}
      type="file"
      accept=".gpx,application/gpx+xml"
      hidden
      onChange={e => { loadFile(e.target.files?.[0]); e.target.value = ''; }}
    />
  );

  if (compact) {
    return (
      <div className="inline-flex flex-col gap-1">
        <button type="button" className="btn-ghost inline-flex items-center gap-2" onClick={openPicker} disabled={busy}>
          <FileUp size={16} />{busy ? 'Lecture…' : 'Changer de GPX'}
        </button>
        {error && <p className="text-sm flex gap-2" style={{ color: '#d97757' }}><AlertTriangle size={18} />{error}</p>}
        {input}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={openPicker}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); loadFile(e.dataTransfer.files?.[0]); }}
        className="w-full rounded-2xl p-10 flex flex-col items-center justify-center gap-3 transition-all"
        style={{
          border: `2px dashed ${dragging ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
          background: dragging ? 'var(--accent-blue-light)' : 'var(--surface-subtle)',
        }}
        aria-label="Importer un fichier GPX"
        disabled={busy}
      >
        <span className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-blue)', color: '#fff' }}>
          <Upload size={24} />
        </span>
        <strong className="text-lg">{busy ? 'Lecture du tracé…' : 'Glisse ton fichier .gpx ici'}</strong>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>ou clique pour parcourir · Strava, Garmin, Komoot, site de l’organisateur</span>
      </button>
      {error && <p className="text-sm flex gap-2 mt-3" style={{ color: '#d97757' }}><AlertTriangle size={18} />{error}</p>}
      {input}
    </div>
  );
}
