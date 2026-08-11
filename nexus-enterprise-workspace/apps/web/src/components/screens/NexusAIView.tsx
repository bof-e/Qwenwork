import { useState } from 'react';
import { ScreenStateGate, EmptyState, ErrorState, Icon } from '../layout/AppLayout';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';

type Tab = 'cleaning' | 'reports' | 'rag';
type ReportPhase = 'idle' | 'generating' | 'ready';

/**
 * Nexus AI — Module M5, Chapitre 7. Anonymisation SHA-256 systématique
 * avant tout appel fournisseur externe (Gemini/Claude), fallback
 * automatique entre fournisseurs en cas d'indisponibilité (§7.2.3,
 * correctif audit du 4 juillet 2026).
 */
export default function NexusAIView() {
  const { setScreenState, pushToast, goTo } = useStore();
  const [tab, setTab] = useState<Tab>('cleaning');
  const [reportPhase, setReportPhase] = useState<ReportPhase>('idle');
  const [progress, setProgress] = useState(8);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [audience, setAudience] = useState('Comité de direction (interne)');

  /**
   * Appel réel à POST /data-batches/:id/clean (reconstruit d'après le
   * travail de Devin — les ids "batch-123"/"batch-456" ci-dessous sont des
   * exemples de démonstration codés en dur, à remplacer par de vrais IDs de
   * lots une fois le module Ingestion alimenté en données réelles).
   */
  const handleCleanAnomaly = async (batchId: string) => {
    try {
      await api(`/data-batches/${batchId}/clean`, { method: 'POST' });
      pushToast('success', 'Correction acceptée', 'Le lot est soumis pour approbation managériale.');
    } catch (err) {
      pushToast('error', 'Échec du nettoyage', err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const generateReport = async () => {
    if (!selectedProjectId) {
      pushToast('error', 'ID de projet requis', 'Renseignez un ID de projet avant de générer le rapport.');
      return;
    }

    setReportPhase('generating');
    setProgress(8);
    const steps = [30, 58, 82] as const;
    let i = 0;
    const tickInterval = setInterval(() => {
      if (i < steps.length) {
        setProgress(steps[i]);
        i++;
      }
    }, 500);

    try {
      const periodEnd = new Date();
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - 90); // fenêtre par défaut de 90 jours, aucun sélecteur de dates dans l'UI actuelle

      await api('/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          project_id: selectedProjectId,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          audience,
        }),
      });

      clearInterval(tickInterval);
      setProgress(100);
      setReportPhase('ready');
    } catch (err) {
      clearInterval(tickInterval);
      setReportPhase('idle');
      pushToast('error', 'Échec de la génération', err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  return (
    <ScreenStateGate
      loading={
        <div>
          <div className="skel skel-line" style={{ height: 28, width: 220, marginBottom: 22 }} />
          <div className="skel" style={{ height: 300 }} />
        </div>
      }
      empty={
        <EmptyState
          d="M12 2 9.5 8.5 3 11l6.5 2.5L12 20l2.5-6.5L21 11l-6.5-2.5L12 2Z"
          title="Aucune anomalie ni rapport en attente"
          text="Nexus AI surveille vos flux d'ingestion en continu. Dès qu'une valeur aberrante est détectée, elle apparaît ici pour révision."
        />
      }
      error={
        <ErrorState
          title="Fournisseur LLM indisponible"
          text="Échec de l'appel vers Gemini 1.5 Pro. Bascule automatique (fallback) vers Claude 3.5 Sonnet en cours, conformément au registre de risques."
          onRetry={() => setScreenState('success')}
        />
      }
    >
      <div className="page-head">
        <div>
          <span className="eyebrow">Module d'Intelligence Artificielle d'Entreprise</span>
          <h1>Nexus AI</h1>
          <p>Anonymisation systématique (SHA-256) de toute donnée transmise à un fournisseur externe. Aucune donnée métier n'est utilisée pour l'entraînement.</p>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab${tab === 'cleaning' ? ' active' : ''}`} onClick={() => setTab('cleaning')}>
          Nettoyage de données
        </div>
        <div className={`tab${tab === 'reports' ? ' active' : ''}`} onClick={() => setTab('reports')}>
          Générateur de rapports
        </div>
        <div className={`tab${tab === 'rag' ? ' active' : ''}`} onClick={() => setTab('rag')}>
          Ingestion RAG
        </div>
      </div>

      {tab === 'cleaning' && (
        <div className="panel">
          <div className="panel__head">
            <div>
              <h3>File d'anomalies détectées</h3>
              <p>Détection par Z-score / IQR sur les flux entrants</p>
            </div>
          </div>
          <table className="dtable">
            <thead>
              <tr>
                <th>Indicateur</th>
                <th>Site</th>
                <th>Valeur brute</th>
                <th>Correction proposée</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Taux de couverture vaccinale</td>
                <td>Site Nord</td>
                <td style={{ color: 'var(--signal-bright)' }}>142 %</td>
                <td>
                  98 % <span className="muted">(dernière valeur validée)</span>
                </td>
                <td>
                  <span className="pill status-approved">Approuvé — Karim</span>
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm btn-disabled">Traité</button>
                </td>
              </tr>
              <tr>
                <td>Ménages enquêtés</td>
                <td>Site Est</td>
                <td style={{ color: 'var(--signal-bright)' }}>-4</td>
                <td>
                  40 <span className="muted">(médiane locale)</span>
                </td>
                <td>
                  <span className="pill status-flagged">À examiner</span>
                </td>
                <td>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleCleanAnomaly('batch-123')}
                  >
                    Accepter
                  </button>
                </td>
              </tr>
              <tr>
                <td>Budget intrants engagé</td>
                <td>Site Sud</td>
                <td style={{ color: 'var(--signal-bright)' }}>8 412 000 $</td>
                <td>
                  412 000 $ <span className="muted">(erreur de saisie ×20)</span>
                </td>
                <td>
                  <span className="pill status-flagged">À examiner</span>
                </td>
                <td>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleCleanAnomaly('batch-456')}
                  >
                    Accepter
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <p className="muted" style={{ marginTop: 14 }}>
            Taux d'automatisation du pipeline de nettoyage : <b style={{ color: 'var(--text-hi)' }}>91,4 %</b> — cible
            persona Aisha Diallo : &gt; 90 %.
          </p>
        </div>
      )}

      {tab === 'reports' && (
        <div className="panel">
          <div className="panel__head">
            <div>
              <h3>Générateur de rapports institutionnels</h3>
              <p>Structure narrative automatique, export aux couleurs de l'organisation</p>
            </div>
          </div>

          {reportPhase === 'idle' && (
            <div>
              <div className="field" style={{ marginBottom: 14 }}>
                <label>ID du projet</label>
                <input
                  type="text"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  placeholder="Entrez l'ID du projet (ex: project-123)"
                />
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>Portée</label>
                  <select>
                    <option>Programme entier — Résilience Climatique Sahel</option>
                    <option>Outcome — Sécurité alimentaire renforcée</option>
                    <option>Site — Nord uniquement</option>
                  </select>
                </div>
                <div className="field">
                  <label>Public destinataire</label>
                  <select value={audience} onChange={(e) => setAudience(e.target.value)}>
                    <option value="Comité de direction (interne)">Comité de direction (interne)</option>
                    <option value="Bailleur — Banque Mondiale">Bailleur — Banque Mondiale</option>
                    <option value="Conseil d'administration">Conseil d'administration</option>
                  </select>
                </div>
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <label>Format d'export</label>
                <select>
                  <option>PDF — mise en page bailleur</option>
                  <option>DOCX — éditable</option>
                </select>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={generateReport}>
                <Icon d="M12 2 9.5 8.5 3 11l6.5 2.5L12 20l2.5-6.5L21 11l-6.5-2.5L12 2Z" />
                Générer le rapport
              </button>
            </div>
          )}

          {reportPhase === 'generating' && (
            <div>
              <p className="muted" style={{ marginBottom: 10 }}>
                {progress < 100 ? 'Extraction des données du cadre logique…' : 'Finalisation…'}
              </p>
              <div className="progress">
                <div className="progress__fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {reportPhase === 'ready' && (
            <div>
              <div className="notice notice-success" style={{ marginBottom: 16 }}>
                <Icon d="M3 8l3.5 3.5L13 4.5" />
                <div>
                  <b>Rapport généré en 28 secondes</b>
                  <p>« Note de synthèse — Programme Résilience Climatique Sahel — Q2 2026 », 12 pages.</p>
                </div>
              </div>
              <div className="panel panel--tight" style={{ background: 'var(--bg-elev-2)' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', marginBottom: 8 }}>Synthèse exécutive</p>
                <p className="muted" style={{ lineHeight: 1.7 }}>
                  Le programme affiche une progression de 82 % vers ses cibles de sécurité alimentaire, portée par une
                  hausse des rendements agricoles de 18 % sur la saison. L'accès à l'eau potable reste le point
                  d'attention principal (61 % de la cible), avec 3 forages restant à réhabiliter sur les 12 prévus…
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button className="btn btn-primary" onClick={() => pushToast('success', 'Export DOCX', "Le rapport a été exporté au format DOCX aux couleurs de l'organisation.")}>
                  Exporter en DOCX
                </button>
                <button className="btn btn-ghost" onClick={() => pushToast('success', 'Export PDF', 'Le rapport a été exporté au format PDF.')}>
                  Exporter en PDF
                </button>
                <button className="btn btn-ghost" onClick={() => goTo('rapports')}>
                  Voir dans le Portail Décisionnel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'rag' && (
        <div className="panel">
          <div className="panel__head">
            <div>
              <h3>Ingestion documentaire (RAG)</h3>
              <p>Extraction des objectifs, budgets et proposition d'une ébauche de cadre logique</p>
            </div>
          </div>
          <div className="empty-state" style={{ borderStyle: 'solid', padding: '44px 20px' }}>
            <Icon d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            <h3>Glissez un appel d'offres ou un contrat-cadre</h3>
            <p>Formats acceptés : PDF, DOCX. Nexus AI en extrait les objectifs et budgets pour proposer une ébauche de cadre logique.</p>
            <button className="btn btn-primary" onClick={() => pushToast('info', 'Import RAG', 'Sélectionnez un fichier à analyser.')}>
              Choisir un fichier
            </button>
          </div>
        </div>
      )}
    </ScreenStateGate>
  );
}
