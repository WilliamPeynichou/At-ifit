import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Users,
  Zap,
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const ROLES = ['user', 'admin', 'super_admin'];
const PAGE_SIZE = 20;

const SENSITIVE_KEY_PARTS = [
  'pass' + 'word',
  'hash',
  'tok' + 'en',
  'sec' + 'ret',
  'cookie',
  'session',
  'jwt',
  'api' + 'key',
  'api_key',
  'api-key',
];

const isSensitiveKey = (key = '') => {
  const normalized = String(key).toLowerCase().replace(/[\s_-]/g, '');
  return SENSITIVE_KEY_PARTS.some(part => normalized.includes(part.replace(/[\s_-]/g, '')));
};

const redactSensitive = (value) => {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, entry]) => {
      acc[key] = isSensitiveKey(key) ? '••••••••' : redactSensitive(entry);
      return acc;
    }, {});
  }
  return value;
};

const unwrapRows = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return payload.rows || payload.items || payload.users || payload.activities || payload.logs || payload.data || [];
};

const unwrapMeta = (payload, fallbackPage = 1) => ({
  page: Number(payload?.page || payload?.pagination?.page || fallbackPage),
  totalPages: Number(payload?.totalPages || payload?.pagination?.totalPages || 1),
  total: Number(payload?.total || payload?.pagination?.total || unwrapRows(payload).length || 0),
});

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('fr-FR');
};

const formatNumber = (value) => Number(value || 0).toLocaleString('fr-FR');

const safeText = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  return String(value);
};

function Card({ children, className = '' }) {
  return <div className={`glass-card p-5 ${className}`}>{children}</div>;
}

function Badge({ children, tone = 'neutral' }) {
  const styles = {
    neutral: ['rgba(15,23,42,0.06)', 'var(--text-secondary)'],
    good: ['rgba(22,163,74,0.10)', '#15803d'],
    warn: ['rgba(234,179,8,0.13)', '#a16207'],
    bad: ['rgba(220,38,38,0.10)', '#b91c1c'],
    info: ['var(--accent-blue-light)', 'var(--accent-blue)'],
  };
  const [background, color] = styles[tone] || styles.neutral;
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background, color }}>
      {children}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, tone = 'info' }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <p className="text-2xl font-black mt-2" style={{ color: 'var(--text-primary)' }}>{formatNumber(value)}</p>
        </div>
        <div className="rounded-xl p-2" style={{ background: tone === 'bad' ? 'rgba(220,38,38,0.10)' : 'var(--accent-blue-light)' }}>
          <Icon className="w-5 h-5" style={{ color: tone === 'bad' ? '#dc2626' : 'var(--accent-blue)' }} />
        </div>
      </div>
    </Card>
  );
}

function SectionTitle({ children, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{children}</h2>
      {subtitle && <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>
      <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Chargement…
    </div>
  );
}

function ErrorBlock({ message, onRetry }) {
  return (
    <div className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.18)', color: '#b91c1c' }}>
      <div className="flex items-start gap-2 text-sm"><AlertTriangle className="w-4 h-4 mt-0.5" />{message}</div>
      {onRetry && <button className="btn-ghost text-sm py-2 px-4" onClick={onRetry}>Réessayer</button>}
    </div>
  );
}

function Pagination({ meta, onPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
      <button className="btn-ghost py-2 px-3" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}><ChevronLeft className="w-4 h-4" /></button>
      <span>Page {meta.page} / {meta.totalPages}</span>
      <button className="btn-ghost py-2 px-3" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}><ChevronRight className="w-4 h-4" /></button>
    </div>
  );
}

function Overview({ data, loading, error, onRetry }) {
  if (loading) return <Card><LoadingBlock /></Card>;
  if (error) return <ErrorBlock message={error} onRetry={onRetry} />;

  const stats = data?.stats || data || {};
  const recentErrors = data?.recentErrors || data?.errors || [];
  const recentUsers = data?.recentUsers || data?.lastConnectedUsers || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Utilisateurs" value={stats.totalUsers} icon={Users} />
        <StatCard label="Strava connectés" value={stats.stravaConnectedUsers} icon={Zap} />
        <StatCard label="Actifs récents" value={stats.recentActiveUsers} icon={CheckCircle2} />
        <StatCard label="Activités" value={stats.totalActivities} icon={Database} />
        <StatCard label="Appels Strava récents" value={stats.recentStravaCalls} icon={Zap} />
        <StatCard label="Appels IA récents" value={stats.recentAiCalls} icon={Bot} />
        <StatCard label="Erreurs récentes" value={stats.recentErrors} icon={AlertTriangle} tone="bad" />
        <StatCard label="Actions auditées" value={stats.recentAuditEvents} icon={Shield} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <SectionTitle subtitle="Dernières connexions connues">Derniers utilisateurs connectés</SectionTitle>
          <div className="space-y-3">
            {recentUsers.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucun utilisateur récent.</p>}
            {recentUsers.slice(0, 8).map((user) => (
              <div key={user.id || user.email} className="flex items-center justify-between gap-3 text-sm border-b last:border-b-0 pb-2 last:pb-0" style={{ borderColor: 'var(--glass-border)' }}>
                <div>
                  <p className="font-semibold">{safeText(user.pseudo || user.email)}</p>
                  <p style={{ color: 'var(--text-muted)' }}>{safeText(user.email)}</p>
                </div>
                <span style={{ color: 'var(--text-muted)' }}>{formatDate(user.lastLoginAt || user.last_login_at)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle subtitle="Aucune donnée secrète affichée">Erreurs récentes</SectionTitle>
          <div className="space-y-3">
            {recentErrors.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucune erreur récente.</p>}
            {recentErrors.slice(0, 8).map((event) => (
              <div key={event.id || `${event.createdAt}-${event.message}`} className="text-sm border-b last:border-b-0 pb-2 last:pb-0" style={{ borderColor: 'var(--glass-border)' }}>
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="bad">{safeText(event.type || event.eventType || event.category || 'erreur')}</Badge>
                  <span style={{ color: 'var(--text-muted)' }}>{formatDate(event.createdAt || event.date)}</span>
                </div>
                <p className="mt-2">{safeText(event.message || event.statusMessage)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function UsersTable({ users, selectedId, onSelect, onRoleChange }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[1050px]">
        <thead>
          <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)' }}>
            <th className="text-left py-3 pr-3">ID</th>
            <th className="text-left py-3 pr-3">Pseudo / email</th>
            <th className="text-left py-3 pr-3">Rôle</th>
            <th className="text-left py-3 pr-3">Pays / âge</th>
            <th className="text-left py-3 pr-3">Strava</th>
            <th className="text-left py-3 pr-3">Activités</th>
            <th className="text-left py-3 pr-3">Appels IA / Strava</th>
            <th className="text-left py-3 pr-3">Dernière connexion</th>
            <th className="text-right py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const active = String(selectedId) === String(user.id);
            const stravaConnected = Boolean(user.stravaConnected ?? user.strava_connected ?? user.stravaAthleteId ?? user.strava_athlete_id);
            return (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--glass-border)', background: active ? 'rgba(0,85,255,0.05)' : 'transparent' }}>
                <td className="py-3 pr-3 font-mono">{safeText(user.id)}</td>
                <td className="py-3 pr-3">
                  <p className="font-semibold">{safeText(user.pseudo)}</p>
                  <p style={{ color: 'var(--text-muted)' }}>{safeText(user.email)}</p>
                </td>
                <td className="py-3 pr-3">
                  <select className="input-clean py-2 px-3 text-xs" value={user.role || 'user'} onChange={(e) => onRoleChange(user.id, e.target.value)}>
                    {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                </td>
                <td className="py-3 pr-3">{safeText(user.country)} · {safeText(user.age)}</td>
                <td className="py-3 pr-3">
                  <Badge tone={stravaConnected ? 'good' : 'neutral'}>{stravaConnected ? 'Connecté' : 'Non connecté'}</Badge>
                  <p className="font-mono mt-1" style={{ color: 'var(--text-muted)' }}>{safeText(user.stravaAthleteId || user.strava_athlete_id)}</p>
                </td>
                <td className="py-3 pr-3">{formatNumber(user.activitiesCount || user.activities_count)}</td>
                <td className="py-3 pr-3">{formatNumber(user.aiCallsCount || user.ai_calls_count)} / {formatNumber(user.stravaCallsCount || user.strava_calls_count)}</td>
                <td className="py-3 pr-3">{formatDate(user.lastLoginAt || user.last_login_at)}</td>
                <td className="py-3 text-right">
                  <button className="btn-ghost py-2 px-3 inline-flex items-center gap-2" onClick={() => onSelect(user)}><Eye className="w-4 h-4" />Voir</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {users.length === 0 && <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>Aucun utilisateur trouvé.</p>}
    </div>
  );
}

function UserDetail({ userId }) {
  const [detail, setDetail] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activityMeta, setActivityMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDetail = async (page = 1) => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const [detailRes, activitiesRes] = await Promise.all([
        api.get(`/super-admin/users/${userId}`),
        api.get(`/super-admin/users/${userId}/activities`, { params: { page, limit: 10 } }),
      ]);
      setDetail(redactSensitive(detailRes.data?.user || detailRes.data));
      setActivities(unwrapRows(activitiesRes.data).map(redactSensitive));
      setActivityMeta(unwrapMeta(activitiesRes.data, page));
    } catch (err) {
      setError(err.response?.status === 403 ? 'Accès refusé par le serveur.' : 'Impossible de charger la fiche utilisateur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDetail(1); }, [userId]);

  if (!userId) return <Card><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sélectionnez un utilisateur pour afficher sa fiche détaillée.</p></Card>;
  if (loading) return <Card><LoadingBlock /></Card>;
  if (error) return <ErrorBlock message={error} onRetry={() => loadDetail(activityMeta.page)} />;
  if (!detail) return null;

  const profile = detail.profile || detail;
  const summary = detail.summary || detail.usage || {};
  const recentAudit = detail.auditLogs || detail.recentAuditLogs || [];
  const recentStrava = detail.stravaLogs || detail.recentStravaLogs || [];
  const recentAi = detail.aiLogs || detail.recentAiLogs || [];

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <SectionTitle subtitle={`ID interne ${safeText(profile.id)}`}>{safeText(profile.pseudo || profile.email)}</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <Info label="Email" value={profile.email} />
              <Info label="Rôle" value={profile.role} />
              <Info label="Pays" value={profile.country} />
              <Info label="Âge" value={profile.age} />
              <Info label="Créé" value={formatDate(profile.createdAt || profile.created_at)} />
              <Info label="Mis à jour" value={formatDate(profile.updatedAt || profile.updated_at)} />
              <Info label="Dernière synchro" value={formatDate(profile.lastSyncAt || profile.last_sync_at)} />
              <Info label="Dernière connexion" value={formatDate(profile.lastLoginAt || profile.last_login_at)} />
            </div>
          </div>
          <Badge tone={(profile.role === 'super_admin') ? 'info' : 'neutral'}>{safeText(profile.role || 'user')}</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card><SectionTitle>Synthèse d’usage</SectionTitle><JsonPreview value={summary} /></Card>
        <Card><SectionTitle>Derniers appels Strava</SectionTitle><LogList rows={recentStrava.slice(0, 5)} /></Card>
        <Card><SectionTitle>Derniers appels IA</SectionTitle><LogList rows={recentAi.slice(0, 5)} /></Card>
      </div>

      <Card>
        <SectionTitle subtitle="Activités paginées, chargées à la demande">Activités utilisateur</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[850px]">
            <thead><tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)' }}><th className="text-left py-3">Nom</th><th className="text-left py-3">Sport</th><th className="text-left py-3">Date</th><th className="text-left py-3">Distance</th><th className="text-left py-3">Durée</th><th className="text-left py-3">Enrichie</th><th className="text-left py-3">ID Strava</th></tr></thead>
            <tbody>{activities.map(activity => <tr key={activity.id || activity.stravaActivityId} style={{ borderBottom: '1px solid var(--glass-border)' }}><td className="py-3 pr-3">{safeText(activity.name)}</td><td className="py-3 pr-3">{safeText(activity.sportType || activity.type)}</td><td className="py-3 pr-3">{formatDate(activity.startDate || activity.start_date)}</td><td className="py-3 pr-3">{formatNumber(activity.distance)} m</td><td className="py-3 pr-3">{safeText(activity.duration || activity.movingTime || activity.moving_time)}</td><td className="py-3 pr-3"><Badge tone={activity.enriched ? 'good' : 'neutral'}>{activity.enriched ? 'Oui' : 'Non'}</Badge></td><td className="py-3 pr-3 font-mono">{safeText(activity.stravaActivityId || activity.strava_activity_id)}</td></tr>)}</tbody>
          </table>
          {activities.length === 0 && <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>Aucune activité.</p>}
        </div>
        <Pagination meta={activityMeta} onPage={loadDetail} />
      </Card>

      <Card><SectionTitle>Audit récent</SectionTitle><LogList rows={recentAudit.slice(0, 10)} /></Card>
    </div>
  );
}

function Info({ label, value }) {
  return <div className="rounded-lg p-3" style={{ background: 'rgba(0,85,255,0.05)', border: '1px solid rgba(0,85,255,0.10)' }}><p className="text-xs uppercase font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p><p className="font-semibold mt-1 break-words">{safeText(value)}</p></div>;
}

function JsonPreview({ value }) {
  const redacted = redactSensitive(value || {});
  return <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-72 rounded-xl p-3" style={{ background: 'rgba(15,23,42,0.05)', color: 'var(--text-secondary)' }}>{JSON.stringify(redacted, null, 2)}</pre>;
}

function LogList({ rows }) {
  if (!rows || rows.length === 0) return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucune donnée.</p>;
  return <div className="space-y-3">{rows.map((row) => <div key={row.id || `${row.type}-${row.createdAt}-${row.message}`} className="text-sm border-b last:border-b-0 pb-2 last:pb-0" style={{ borderColor: 'var(--glass-border)' }}><div className="flex items-center justify-between gap-2"><Badge tone={row.success === false || row.status === 'error' ? 'bad' : 'neutral'}>{safeText(row.type || row.eventType || row.callType || row.status)}</Badge><span style={{ color: 'var(--text-muted)' }}>{formatDate(row.createdAt || row.date)}</span></div><p className="mt-1">{safeText(row.message || row.endpoint || row.action)}</p></div>)}</div>;
}

function LogsSection({ title, endpoint, filters }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(endpoint, { params: { page, limit: PAGE_SIZE, ...filters } });
      setRows(unwrapRows(res.data).map(redactSensitive));
      setMeta(unwrapMeta(res.data, page));
    } catch (err) {
      setError(err.response?.status === 403 ? 'Accès refusé par le serveur.' : `Impossible de charger ${title.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, [endpoint, JSON.stringify(filters)]);

  return (
    <Card>
      <SectionTitle subtitle={`${formatNumber(meta.total)} entrée(s)`}>{title}</SectionTitle>
      {loading ? <LoadingBlock /> : error ? <ErrorBlock message={error} onRetry={() => load(meta.page)} /> : <><LogList rows={rows} /><Pagination meta={meta} onPage={load} /></>}
    </Card>
  );
}

export default function SuperAdmin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState('');
  const [users, setUsers] = useState([]);
  const [userMeta, setUserMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState('7d');

  const filters = useMemo(() => ({
    ...(query ? { q: query } : {}),
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    ...(period ? { period } : {}),
  }), [query, role, status, period]);

  const loadOverview = async () => {
    setOverviewLoading(true);
    setOverviewError('');
    try {
      const res = await api.get('/super-admin/overview', { params: { period } });
      setOverview(redactSensitive(res.data));
    } catch (err) {
      setOverviewError(err.response?.status === 403 ? 'Accès super admin refusé par le serveur.' : 'Impossible de charger la vue d’ensemble.');
    } finally {
      setOverviewLoading(false);
    }
  };

  const loadUsers = async (page = 1) => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const res = await api.get('/super-admin/users', { params: { page, limit: PAGE_SIZE, ...filters } });
      setUsers(unwrapRows(res.data).map(redactSensitive));
      setUserMeta(unwrapMeta(res.data, page));
    } catch (err) {
      setUsersError(err.response?.status === 403 ? 'Accès super admin refusé par le serveur.' : 'Impossible de charger la liste utilisateurs.');
    } finally {
      setUsersLoading(false);
    }
  };

  const changeRole = async (userId, nextRole) => {
    const previous = users.find(u => String(u.id) === String(userId))?.role || 'user';
    setUsers(current => current.map(u => String(u.id) === String(userId) ? { ...u, role: nextRole } : u));
    try {
      await api.patch(`/super-admin/users/${userId}/role`, { role: nextRole });
      if (selectedUser && String(selectedUser.id) === String(userId)) setSelectedUser({ ...selectedUser, role: nextRole });
    } catch (err) {
      setUsers(current => current.map(u => String(u.id) === String(userId) ? { ...u, role: previous } : u));
      alert(err.response?.data?.message || 'Changement de rôle refusé.');
    }
  };

  useEffect(() => { loadOverview(); }, [period]);
  useEffect(() => { loadUsers(1); }, [filters]);

  const tabs = [
    ['overview', 'Vue d’ensemble'],
    ['users', 'Utilisateurs'],
    ['detail', 'Détail utilisateur'],
    ['strava', 'Consommation Strava'],
    ['ai', 'Consommation IA'],
    ['audit', 'Audit'],
    ['errors', 'Erreurs'],
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>
            <ShieldAlert className="w-4 h-4" /> Super admin
          </div>
          <h1 className="text-4xl sm:text-5xl font-black">Supervision plateforme</h1>
          <p className="text-sm mt-2 max-w-3xl" style={{ color: 'var(--text-muted)' }}>
            Vue complète utilisateurs, activités, audit, appels Strava et IA. Les champs confidentiels sont masqués côté interface et doivent être exclus côté serveur.
          </p>
        </div>
        <div className="text-sm rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
          Connecté : <strong>{safeText(user?.pseudo || user?.email)}</strong>
        </div>
      </div>

      <Card className="!p-3">
        <div className="flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map(([key, label]) => <button key={key} className="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap" style={{ background: tab === key ? 'var(--accent-blue-light)' : 'transparent', color: tab === key ? 'var(--accent-blue)' : 'var(--text-secondary)' }} onClick={() => setTab(key)}>{label}</button>)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 min-w-0 xl:min-w-[620px]">
            <div className="relative sm:col-span-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} /><input className="input-clean w-full pl-9 py-2" placeholder="Email, pseudo, ID utilisateur, Strava…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
            <select className="input-clean py-2 px-3" value={role} onChange={(e) => setRole(e.target.value)}><option value="">Tous rôles</option>{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select>
            <select className="input-clean py-2 px-3" value={period} onChange={(e) => setPeriod(e.target.value)}><option value="24h">24h</option><option value="7d">7 jours</option><option value="30d">30 jours</option><option value="90d">90 jours</option></select>
          </div>
        </div>
      </Card>

      {tab === 'overview' && <Overview data={overview} loading={overviewLoading} error={overviewError} onRetry={loadOverview} />}

      {tab === 'users' && (
        <Card>
          <SectionTitle subtitle={`${formatNumber(userMeta.total)} utilisateur(s), liste paginée et filtrable`}>Utilisateurs</SectionTitle>
          <div className="mb-4 flex flex-wrap gap-2">
            <select className="input-clean py-2 px-3" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tous statuts Strava</option><option value="connected">Strava connecté</option><option value="disconnected">Strava non connecté</option></select>
            <button className="btn-ghost py-2 px-4" onClick={() => loadUsers(userMeta.page)}><RefreshCw className="w-4 h-4 inline mr-2" />Actualiser</button>
          </div>
          {usersLoading ? <LoadingBlock /> : usersError ? <ErrorBlock message={usersError} onRetry={() => loadUsers(userMeta.page)} /> : <><UsersTable users={users} selectedId={selectedUser?.id} onSelect={(u) => { setSelectedUser(u); setTab('detail'); }} onRoleChange={changeRole} /><Pagination meta={userMeta} onPage={loadUsers} /></>}
        </Card>
      )}

      {tab === 'detail' && <UserDetail userId={selectedUser?.id} />}
      {tab === 'strava' && <LogsSection title="Consommation Strava" endpoint="/super-admin/strava-logs" filters={filters} />}
      {tab === 'ai' && <LogsSection title="Consommation IA" endpoint="/super-admin/ai-logs" filters={filters} />}
      {tab === 'audit' && <LogsSection title="Audit" endpoint="/super-admin/audit-logs" filters={filters} />}
      {tab === 'errors' && <LogsSection title="Erreurs" endpoint="/super-admin/audit-logs" filters={{ ...filters, status: 'error' }} />}
    </div>
  );
}
