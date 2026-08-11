import { useEffect, useState, type ReactNode } from 'react';
import { ScreenStateGate, EmptyState, ErrorState, Icon } from '../layout/AppLayout';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';

interface Connector {
  id: string;
  name: string;
  desc: ReactNode;
  iconPath: string;
  status: 'connected' | 'error' | 'off' | 'syncing';
  statusLabel: string;
  foot: string;
  footAction: string;
  footPrimary?: boolean;
}

const CONNECTORS: Connector[] = [
  {
    id: 'kobo',
    name: 'KoboToolbox',
    desc: 'Collecte terrain — jeton API, pièces jointes incluses',
    iconPath: 'M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5',
    status: 'connected',
    statusLabel: 'Connecté',
    foot: 'Sync. il y a 12 min',
    footAction: 'Gérer',
  },
  {
    id: 'sharepoint',
    name: 'SharePoint',
    desc: 'Surveillance de dossiers — rapports mensuels des filiales',
    iconPath: 'M3 9h18M8 4v5',
    status: 'connected',
    statusLabel: 'Connecté',
    foot: 'Sync. il y a 1 h',
    footAction: 'Gérer',
  },
  {
    id: 's3',
    name: 'AWS S3',
    desc: (
      <>
        Bucket <code className="inline">atlas-field-exports</code>
      </>
    ),
    iconPath: 'M4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7',
    status: 'error',
    statusLabel: 'Erreur de sync.',
    foot: 'Échec il y a 20 min',
    footAction: 'Diagnostiquer',
  },
  {
    id: 'stata',
    name: 'Fichiers Stata / SPSS',
    desc: 'Lecture .dta / .sav via microservice Python (pandas, pyreadstat)',
    iconPath: 'M4 4h16v16H4V4Zm4 4h8M8 12h8M8 16h5',
    status: 'off',
    statusLabel: 'Non configuré',
    foot: 'Jamais synchronisé',
    footAction: 'Configurer',
    footPrimary: true,
  },
  {
    id: 'gdrive',
    name: 'Google Drive',
    desc: 'Dossier partagé — équipe S&E',
    iconPath: 'M8 12h8M12 8v8',
    status: 'syncing',
    statusLabel: 'Synchronisation…',
    foot: '1 240 fichiers · 62 %',
    footAction: 'Détails',
  },
];

const STATUS_DOT: Record<string, string> = { connected: 'dot-teal', error: 'dot-signal', syncing: 'dot-teal', off: '' };
const STATUS_PILL: Record<string, string> = { connected: 'status-connected', error: 'status-error', syncing: 'status-syncing', off: 'status-off' };

const SYNC_LOG = [
  { source: 'KoboToolbox', file: 'collecte_site-nord_juin.json', rows: '212', mapping: 'Auto-appliqué', mappingCls: 'status-cleaned', result: 'Réussi', resultCls: 'status-approved' },
  { source: 'SharePoint', file: 'rapport_filiale_dakar.xlsx', rows: '58', mapping: 'Révision requise', mappingCls: 'status-pending', result: 'Réussi', resultCls: 'status-approved' },
  { source: 'AWS S3', file: 'export_terrain_0629.csv', rows: '—', mapping: '—', mappingCls: '', result: 'Échec — jeton expiré', resultCls: 'status-error' },
  { source: 'Stata (.dta)', file: 'enquete_menages_2026.dta', rows: '1 840', mapping: 'Auto-appliqué', mappingCls: 'status-cleaned', result: 'Réussi', resultCls: 'status-approved' },
];

/**
 * Hub de connecteurs — Module M2 (Ingestion), Chapitre 6.
 * Smart Mapping = appariement automatique des colonnes à chaque import.
 */
export default function ConnecteursView() {
  const { setScreenState, pushToast } = useStore();
  const [koboAssets, setKoboAssets] = useState<Array<{ uid: string; name: string; deployment__submission_count?: number }> | null>(null);
  const [koboError, setKoboError] = useState<string | null>(null);

  useEffect(() => {
    api<{ results: typeof koboAssets }>('/kobo/assets')
      .then((data) => setKoboAssets(data.results ?? []))
      .catch((err) => {
        console.error('Erreur chargement Kobo assets:', err);
        setKoboError(err instanceof Error ? err.message : 'Erreur inconnue');
      });
  }, []);

  return (
    <ScreenStateGate
      loading={
        <div>
          <div className="skel skel-line" style={{ height: 28, width: 280, marginBottom: 22 }} />
          <div className="connector-grid">
            <div className="skel" style={{ height: 170 }} />
            <div className="skel" style={{ height: 170 }} />
            <div className="skel" style={{ height: 170 }} />
          </div>
        </div>
      }
      empty={
        <EmptyState
          d="M8 7.3 11 16M16 7.3 13 16M8.5 6h7"
          title="Branchez votre première source"
          text="KoboToolbox, SharePoint, Google Drive, AWS S3 ou fichiers Stata/SPSS — Nexus ingère et nettoie automatiquement vos données terrain."
          cta={
            <button className="btn btn-primary" onClick={() => pushToast('info', 'Ajouter un connecteur', 'Sélectionnez une source dans le catalogue.')}>
              + Ajouter un connecteur
            </button>
          }
        />
      }
      error={
        <ErrorState
          title="Impossible de charger l'état des connecteurs"
          text="La Hub de Connecteurs n'a pas pu récupérer les statuts de synchronisation. Vos pipelines continuent de fonctionner en arrière-plan."
          onRetry={() => setScreenState('success')}
        />
      }
    >
      <div className="page-head">
        <div>
          <span className="eyebrow">Connecteurs</span>
          <h1>Hub de connecteurs</h1>
          <p>Ingestion depuis des sources hétérogènes, avec appariement automatique des colonnes (Smart Mapping) à chaque nouvel import.</p>
        </div>
        <div className="page-head__actions">
          <button className="btn btn-primary" onClick={() => pushToast('info', 'Ajouter un connecteur', 'Sélectionnez une source dans le catalogue.')}>
            + Ajouter un connecteur
          </button>
        </div>
      </div>

      <div className="connector-grid">
        {CONNECTORS.map((c) => (
          <div className="connector-card" key={c.id}>
            <div className="connector-card__top">
              <div className="connector-card__icon">
                <Icon d={c.iconPath} />
              </div>
              <span className={`pill ${STATUS_PILL[c.status]}`}>
                {STATUS_DOT[c.status] && <span className={`dot ${STATUS_DOT[c.status]}`} />}
                {c.statusLabel}
              </span>
            </div>
            <div>
              <h4>{c.name}</h4>
              <p className="muted">{c.desc}</p>
            </div>
            <div className="connector-card__foot">
              <span className="muted">{c.foot}</span>
              <button
                className={`btn ${c.footPrimary ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                onClick={() => pushToast('info', c.name, `Ouverture du panneau de gestion — ${c.footAction.toLowerCase()}.`)}
              >
                {c.footAction}
              </button>
            </div>
          </div>
        ))}

        <div
          className="connector-card"
          style={{ alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', cursor: 'pointer' }}
          onClick={() => pushToast('info', 'Ajouter un connecteur', 'Sélectionnez une source dans le catalogue.')}
        >
          <Icon d="M12 5v14M5 12h14" style={{ width: 26, height: 26, stroke: 'var(--text-low)' }} />
          <p className="muted">Ajouter un connecteur</p>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <div className="panel__head">
          <div>
            <h3>Journal de synchronisation</h3>
            <p>Traçabilité totale — horodatage immuable de chaque ingestion</p>
          </div>
        </div>
        <table className="dtable">
          <thead>
            <tr>
              <th>Source</th>
              <th>Fichier / Lot</th>
              <th>Lignes</th>
              <th>Smart Mapping</th>
              <th>Résultat</th>
            </tr>
          </thead>
          <tbody>
            {SYNC_LOG.map((row, i) => (
              <tr key={i}>
                <td>{row.source}</td>
                <td>{row.file}</td>
                <td>{row.rows}</td>
                <td>{row.mapping !== '—' ? <span className={`pill ${row.mappingCls}`}>{row.mapping}</span> : '—'}</td>
                <td>
                  <span className={`pill ${row.resultCls}`}>{row.result}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <div className="panel__head">
          <div>
            <h3>Formulaires KoboToolbox (données réelles)</h3>
            <p>Résultat en direct de GET /kobo/assets</p>
          </div>
        </div>
        {koboError && (
          <div className="notice notice-error">
            <Icon d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            <div>
              <b>Impossible de charger les formulaires Kobo</b>
              <p>{koboError} — vérifiez KOBOTOOLBOX_API_KEY dans apps/backend-nestjs/.env.</p>
            </div>
          </div>
        )}
        {!koboError && koboAssets === null && <p className="muted">Chargement…</p>}
        {!koboError && koboAssets?.length === 0 && <p className="muted">Aucun formulaire trouvé pour ce compte Kobo.</p>}
        {!koboError && koboAssets && koboAssets.length > 0 && (
          <table className="dtable">
            <thead>
              <tr>
                <th>Formulaire</th>
                <th>Soumissions</th>
              </tr>
            </thead>
            <tbody>
              {koboAssets.map((asset) => (
                <tr key={asset.uid}>
                  <td>{asset.name}</td>
                  <td>{asset.deployment__submission_count ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ScreenStateGate>
  );
}
