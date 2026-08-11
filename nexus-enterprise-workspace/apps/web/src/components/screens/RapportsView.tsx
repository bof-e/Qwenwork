import { ScreenStateGate, EmptyState, ErrorState, Icon } from '../layout/AppLayout';
import { useStore } from '../../store/useStore';

const BARS = [
  { label: 'Jan', h: 40 },
  { label: 'Fév', h: 48 },
  { label: 'Mar', h: 55 },
  { label: 'Avr', h: 61 },
  { label: 'Mai', h: 70, brass: true },
  { label: 'Juin', h: 82, brass: true },
];

const REPORTS = [
  { name: 'Note de synthèse Q2 2026', scope: 'Programme entier', date: '02/07/2026', format: 'PDF' },
  { name: 'Rapport bailleur — Banque Mondiale', scope: 'Sécurité alimentaire', date: '18/06/2026', format: 'DOCX' },
  { name: 'Audit de conformité RSE', scope: 'Programme entier', date: '02/06/2026', format: 'PDF' },
];

const SHARED_LINKS = [
  { name: 'Comité PNUD', status: 'active', note: 'Expire le 30/07/2026 · lecture seule' },
  { name: 'Banque Mondiale — Task Team', status: 'active', note: 'Expire le 15/08/2026 · lecture seule' },
  { name: "Conseil d'administration Q1", status: 'expired', note: 'A expiré le 01/04/2026' },
];

/**
 * Rapports & Export — Module M6 (Decision Portal), Chapitre 11.
 * /dashboards/{id}/export = Viewer+ ; /reports/{id}/share = Manager+
 * (Specs §11.3 — correctif audit du 4 juillet 2026, ex-Architecture
 * indiquait à tort Executive+ pour les deux).
 */
export default function RapportsView() {
  const { setScreenState, goTo, pushToast } = useStore();

  return (
    <ScreenStateGate
      loading={
        <div>
          <div className="skel skel-line" style={{ height: 28, width: 260, marginBottom: 22 }} />
          <div className="grid-12">
            <div className="col-8">
              <div className="skel" style={{ height: 320 }} />
            </div>
            <div className="col-4">
              <div className="skel" style={{ height: 320 }} />
            </div>
          </div>
        </div>
      }
      empty={
        <EmptyState
          d="M8 8h8M8 12h8M8 16h5"
          title="Générez votre premier rapport"
          text="Utilisez Nexus AI pour compiler vos données en un rapport narratif prêt à partager avec vos bailleurs."
          cta={
            <button className="btn btn-primary" onClick={() => goTo('nexus-ai')}>
              Aller au générateur de rapports
            </button>
          }
        />
      }
      error={
        <ErrorState
          title="Le portail décisionnel est momentanément indisponible"
          text="Le service de restitution (dashboards, exploration de données) rencontre un incident. Vos rapports déjà générés restent accessibles en téléchargement direct."
          onRetry={() => setScreenState('success')}
        />
      }
    >
      <div className="page-head">
        <div>
          <span className="eyebrow">Portail Décisionnel</span>
          <h1>Rapports &amp; partage sécurisé</h1>
          <p>Explorez les données, filtrez par site ou période, et partagez des vues en lecture seule avec des bailleurs externes.</p>
        </div>
        <div className="page-head__actions">
          <button className="btn btn-primary" onClick={() => pushToast('info', 'Partager un lien', 'Configurez la portée et la durée de validité du lien.')}>
            <Icon d="M18 8a3 3 0 1 0-2.8-4M6 12a3 3 0 1 0 0 4M15.2 10.5l-6.4 3.6M8.8 9.9l6.4-3.6" />
            Partager un lien sécurisé
          </button>
        </div>
      </div>

      <div className="grid-12">
        <div className="col-8">
          <div className="panel">
            <div className="panel__head">
              <div>
                <h3>Exploration de données</h3>
                <p>Filtres actifs : Programme entier · Tous sites · 12 derniers mois</p>
              </div>
            </div>
            <div className="bar-chart">
              {BARS.map((b) => (
                <div className="bar-col" key={b.label}>
                  <div className={`bar${b.brass ? ' is-brass' : ''}`} style={{ height: `${b.h}%` }} />
                  <div className="bar-label">{b.label}</div>
                </div>
              ))}
            </div>
            <p className="muted" style={{ marginTop: 10 }}>
              Indice composite d'impact — progression cumulée sur 6 mois.
            </p>
          </div>

          <div className="panel" style={{ marginTop: 18 }}>
            <div className="panel__head">
              <div>
                <h3>Rapports générés</h3>
              </div>
            </div>
            <table className="dtable">
              <thead>
                <tr>
                  <th>Rapport</th>
                  <th>Portée</th>
                  <th>Généré le</th>
                  <th>Format</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {REPORTS.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td>{r.scope}</td>
                    <td>{r.date}</td>
                    <td>{r.format}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => pushToast('success', 'Téléchargement', 'Le fichier a été téléchargé.')}>
                        Télécharger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-4">
          <div className="panel">
            <div className="panel__head">
              <div>
                <h3>Liens partagés</h3>
                <p>Accès externes en lecture seule</p>
              </div>
            </div>
            <div className="stack">
              {SHARED_LINKS.map((l) => (
                <div
                  key={l.name}
                  className="panel--tight"
                  style={{
                    border: l.status === 'active' ? '1px solid var(--border)' : '1px dashed var(--border-strong)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div className="row-between">
                    <b style={{ fontSize: '.82rem' }}>{l.name}</b>
                    <span className={`pill ${l.status === 'active' ? 'status-connected' : 'status-off'}`}>
                      {l.status === 'active' ? 'Actif' : 'Expiré'}
                    </span>
                  </div>
                  <p className="muted" style={{ marginTop: 6 }}>
                    {l.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ScreenStateGate>
  );
}
