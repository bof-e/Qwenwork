import React, { useEffect, useMemo, type ReactNode } from 'react';
import { NAV, ICONS, PERSONAS, ROLES, useStore, type ScreenId, type ScreenState } from '../../store/useStore';
import { setToken } from '../../lib/api';

/* ============================================================
   Icône générique — chemin SVG passé en prop (24x24 viewBox)
   ============================================================ */
export function Icon({ d, className, style }: { d: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className} style={style}>
      <path d={d} />
    </svg>
  );
}

const SCREEN_TITLES: Record<ScreenId, string> = {
  dashboard: 'Tableau de bord',
  'cadre-logique': 'Cadre logique',
  connecteurs: 'Connecteurs',
  collecte: 'Collecte terrain',
  collaboratif: 'Espace collaboratif',
  'nexus-ai': 'Nexus AI',
  rapports: 'Rapports & Export',
  facturation: 'Facturation',
  parcours: 'Parcours guidés',
};

/* ============================================================
   SIDEBAR
   ============================================================ */
function Sidebar() {
  const { screen, role, personaKey, goTo, isLocked, openPersonaSwitcher } = useStore();
  const persona = PERSONAS[personaKey];

  const groups = useMemo(() => {
    const map: Record<string, typeof NAV> = {};
    const order: string[] = [];
    NAV.forEach((item) => {
      if (!map[item.group]) {
        map[item.group] = [];
        order.push(item.group);
      }
      map[item.group].push(item);
    });
    return order.map((g) => ({ group: g, items: map[g] }));
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth={1.4}>
          <path d="M12 2 9.5 8.5 3 11l6.5 2.5L12 20l2.5-6.5L21 11l-6.5-2.5L12 2Z" />
        </svg>
        <div className="sidebar__brand-text">
          <span className="sidebar__brand-name">Nexus</span>
          <span className="sidebar__brand-sub">Enterprise Workspace</span>
        </div>
      </div>

      <div className="org-switch">
        <div>
          <div className="org-switch__name">Résilience Climatique Sahel</div>
          <div className="org-switch__tier">Sovereign / Enterprise+</div>
        </div>
        <Icon d="m6 9 6 6 6-6" />
      </div>

      <nav className="sidebar__nav">
        {groups.map(({ group, items }) => (
          <React.Fragment key={group}>
            <div className="nav-group-label">{group}</div>
            {items.map((item) => {
              const locked = isLocked(item.id);
              const active = item.id === screen;
              return (
                <div
                  key={item.id}
                  className={`nav-item${active ? ' active' : ''}${locked ? ' locked' : ''}`}
                  onClick={() => goTo(item.id)}
                >
                  <Icon d={ICONS[item.id]} />
                  <span>{item.label}</span>
                  {locked ? (
                    <svg className="nav-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <rect x="4" y="10" width="16" height="10" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                  ) : item.count ? (
                    <span className="nav-count">{item.count}</span>
                  ) : null}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </nav>

      <div className="sidebar__footer" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="user-chip" style={{ flex: 1, minWidth: 0 }} onClick={openPersonaSwitcher}>
          <div className="avatar">{persona.initials}</div>
          <div className="user-chip__meta">
            <div className="user-chip__name">{persona.name}</div>
            <div className="user-chip__role">
              {persona.title} · {ROLES[role].label}
            </div>
          </div>
        </div>
        <button
          className="icon-btn"
          title="Se déconnecter"
          onClick={() => {
            setToken(null);
            window.location.reload();
          }}
        >
          <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </button>
      </div>
    </aside>
  );
}

/* ============================================================
   TOPBAR
   ============================================================ */
function Topbar() {
  const { screen, screenState, setScreenState, toggleTheme, theme } = useStore();
  const navItem = NAV.find((n) => n.id === screen);

  return (
    <header className="topbar">
      <div>
        <div className="topbar__crumb">Nexus Enterprise Workspace / {navItem?.group ?? ''}</div>
        <div className="topbar__title">{SCREEN_TITLES[screen]}</div>
      </div>
      <div className="topbar__right">
        <div className="sim-control">
          État
          <select value={screenState} onChange={(e) => setScreenState(e.target.value as ScreenState)}>
            <option value="loading">Chargement</option>
            <option value="empty">Vide</option>
            <option value="error">Erreur</option>
            <option value="success">Succès</option>
          </select>
        </div>
        <button className="icon-btn" onClick={toggleTheme} title="Changer de thème">
          <Icon d={theme === 'dark' ? 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4' : 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z'} />
        </button>
        <button className="icon-btn" title="Notifications">
          <Icon d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9ZM13.7 21a2 2 0 0 1-3.4 0" />
          <span className="ping" />
        </button>
      </div>
    </header>
  );
}

/* ============================================================
   OFFLINE BANNER
   ============================================================ */
function OfflineBanner() {
  const offline = useStore((s) => s.offline);
  if (!offline) return null;
  return (
    <div className="offline-banner">
      <Icon d="M3 3l18 18M8.5 8.5a11 11 0 0 1 14 1.4M2 9a15.5 15.5 0 0 1 4.2-3M12 19h.01" />
      Mode hors-ligne — les données seront synchronisées à la reconnexion (Chapitre 14.3)
    </div>
  );
}

/* ============================================================
   TOASTS
   ============================================================ */
const TOAST_ICON: Record<string, string> = {
  success: 'M3 8l3.5 3.5L13 4.5',
  error: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  info: 'M12 8v5M12 16h.01',
};

function ToastStack() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <Icon d={TOAST_ICON[t.type]} />
          <div>
            <b>{t.title}</b>
            <p>{t.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   MODALE — Changer de persona (démonstration RBAC, PRD §5)
   ============================================================ */
function PersonaSwitcherModal() {
  const { personaSwitcherOpen, personaKey, closePersonaSwitcher, switchPersona } = useStore();
  if (!personaSwitcherOpen) return null;
  return (
    <div className="modal-backdrop" onClick={closePersonaSwitcher}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <div>
            <h2>Changer de persona</h2>
            <p>Démonstration du RBAC — chaque rôle voit un espace de travail adapté.</p>
          </div>
          <button className="icon-btn" onClick={closePersonaSwitcher}>
            ✕
          </button>
        </div>
        <div className="stack">
          {(Object.keys(PERSONAS) as (keyof typeof PERSONAS)[]).map((key) => {
            const p = PERSONAS[key];
            const r = ROLES[p.role];
            return (
              <div
                key={key}
                className={`persona-card${key === personaKey ? ' selected' : ''}`}
                onClick={() => switchPersona(key)}
              >
                <div className="avatar">{p.initials}</div>
                <div className="persona-card__meta">
                  <div className="persona-card__name">{p.name}</div>
                  <div className="persona-card__role">{p.title}</div>
                </div>
                <span className={`pill ${r.cls}`} style={{ marginLeft: 'auto' }}>
                  {r.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   OVERLAY — Accès refusé (RBAC, Specs §2.2.3)
   ============================================================ */
function AccessDeniedOverlay() {
  const { accessDeniedRole, dismissAccessDenied } = useStore();
  if (!accessDeniedRole) return null;
  return (
    <div className="modal-backdrop" onClick={dismissAccessDenied}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 420, textAlign: 'center' }}>
        <Icon d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" className="error-state" style={{ width: 34, height: 34, margin: '0 auto 14px', stroke: 'var(--signal-bright)' }} />
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.1rem' }}>Accès non autorisé</h3>
        <p className="muted" style={{ marginTop: 8 }}>
          Votre rôle actuel (<b>{accessDeniedRole}</b>) ne permet pas d'accéder à cet écran. Changez de persona pour explorer un autre niveau RBAC.
        </p>
        <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={dismissAccessDenied}>
          Compris
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   SCREEN STATE GATE — bascule loading / empty / error / success
   pilotée par le sélecteur "État" de la topbar (simulateur de démo).
   Chaque écran fournit son propre contenu pour empty/error (copie
   contextualisée) et son contenu réel pour success.
   ============================================================ */
export function ScreenStateGate({
  loading,
  empty,
  error,
  children,
}: {
  loading?: ReactNode;
  empty?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  const screenState = useStore((s) => s.screenState);
  if (screenState === 'loading' && loading) return <>{loading}</>;
  if (screenState === 'empty' && empty) return <>{empty}</>;
  if (screenState === 'error' && error) return <>{error}</>;
  return <>{children}</>;
}

export function EmptyState({ d, title, text, cta }: { d: string; title: string; text: string; cta?: ReactNode }) {
  return (
    <div className="empty-state">
      <Icon d={d} />
      <h3>{title}</h3>
      <p>{text}</p>
      {cta}
    </div>
  );
}

export function ErrorState({ title, text, onRetry, retryLabel = 'Réessayer' }: { title: string; text: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div className="error-state">
      <Icon d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <h3>{title}</h3>
      <p>{text}</p>
      {onRetry && (
        <button className="btn btn-primary" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export function LoadingSkeleton({ variant = 'default' }: { variant?: 'default' | 'grid3' | 'grid12' }) {
  return (
    <div>
      <div className="skel skel-line" style={{ height: 28, width: 240, marginBottom: 22 }} />
      {variant === 'grid3' && (
        <div className="grid-3">
          <div className="skel" style={{ height: 220 }} />
          <div className="skel" style={{ height: 220 }} />
          <div className="skel" style={{ height: 220 }} />
        </div>
      )}
      {variant === 'grid12' && (
        <div className="grid-12">
          <div className="col-8">
            <div className="skel" style={{ height: 320 }} />
          </div>
          <div className="col-4">
            <div className="skel" style={{ height: 320 }} />
          </div>
        </div>
      )}
      {variant === 'default' && <div className="skel" style={{ height: 300 }} />}
    </div>
  );
}

/* ============================================================
   APP LAYOUT — composant exporté
   ============================================================ */
export default function AppLayout({ children }: { children: ReactNode }) {
  const theme = useStore((s) => s.theme);

  // CORRECTIF : data-theme doit être posé sur <html> pour que les sélecteurs
  // CSS html[data-theme='dark']/[data-theme='light'] (index.css) s'appliquent.
  // Un data-theme sur un div interne ne matche jamais ces sélecteurs : aucune
  // variable CSS ne se résout, d'où un rendu par défaut du navigateur (texte
  // noir sur fond blanc) — exactement le symptôme rapporté.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div>
      <div className="texture" />
      <div className="vignette" />
      <div className="app-shell">
        <Sidebar />
        <div className="content-area">
          <OfflineBanner />
          <Topbar />
          <div className="screen-scroll">{children}</div>
        </div>
      </div>
      <ToastStack />
      <PersonaSwitcherModal />
      <AccessDeniedOverlay />
    </div>
  );
}
