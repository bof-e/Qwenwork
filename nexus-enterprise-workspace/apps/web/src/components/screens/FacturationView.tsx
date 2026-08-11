import { ScreenStateGate, EmptyState, ErrorState } from '../layout/AppLayout';
import { useStore } from '../../store/useStore';

const USAGE = [
  { label: 'Sièges actifs', value: '18 / 25', pct: 72 },
  { label: 'Volume de données ingérées', value: '340 Go / 500 Go', pct: 68 },
  { label: "Crédits de génération IA", value: '812 / 1 000', pct: 81 },
];

const INVOICES = [
  { id: 'FAC-2026-06', period: 'Juin 2026', amount: '14 200 $' },
  { id: 'FAC-2026-05', period: 'Mai 2026', amount: '13 950 $' },
  { id: 'FAC-2026-04', period: 'Avril 2026', amount: '13 950 $' },
];

/**
 * Facturation — Module M7 (Platform), Chapitre 15.
 * Correspondance des paliers (correctif audit du 4 juillet 2026, Specs
 * §15.2.1) : nom commercial (UI) → subscription_tier technique (API/DB) :
 * Starter = NGO_Essential · Professional = Enterprise_Professional ·
 * Enterprise = Sovereign.
 */
export default function FacturationView() {
  const { setScreenState, pushToast } = useStore();

  return (
    <ScreenStateGate
      loading={
        <div>
          <div className="skel skel-line" style={{ height: 28, width: 240, marginBottom: 22 }} />
          <div className="grid-3">
            <div className="skel" style={{ height: 220 }} />
            <div className="skel" style={{ height: 220 }} />
            <div className="skel" style={{ height: 220 }} />
          </div>
        </div>
      }
      empty={
        <EmptyState
          d="M2 6h20v14H2V6Zm0 4h20"
          title="Choisissez un palier pour activer votre espace"
          text="Un accès d'évaluation limité est actif. Sélectionnez un palier pour débloquer l'ensemble des fonctionnalités."
        />
      }
      error={
        <ErrorState
          title="Le dernier prélèvement a échoué"
          text="Carte expirée. Mettez à jour votre moyen de paiement pour éviter une suspension du palier Sovereign."
          onRetry={() => setScreenState('success')}
          retryLabel="Mettre à jour le paiement"
        />
      }
    >
      <div className="page-head">
        <div>
          <span className="eyebrow">Facturation &amp; abonnement</span>
          <h1>Palier Sovereign / Enterprise+</h1>
          <p>Abonnement SaaS combinant un socle par siège et un volet à l'usage (volume de données, crédits IA).</p>
        </div>
      </div>

      <div className="grid-3">
        <div className="panel">
          <span className="eyebrow">NGO / Institution Essential</span>
          <div className="kpi-card__value" style={{ marginTop: 10 }}>
            Tarif préférentiel
          </div>
          <p className="muted" style={{ margin: '10px 0 16px' }}>
            Cadre logique, connecteurs de base, workflows d'approbation, 1 rapport IA/mois.
          </p>
          <button className="btn btn-ghost btn-block" disabled>
            Palier actuel : non
          </button>
        </div>
        <div className="panel">
          <span className="eyebrow">Enterprise Professional</span>
          <div className="kpi-card__value" style={{ marginTop: 10 }}>
            Par siège + volume
          </div>
          <p className="muted" style={{ margin: '10px 0 16px' }}>
            Tous connecteurs, chat contextuel, data cleaning IA illimité, SSO.
          </p>
          <button className="btn btn-ghost btn-block" onClick={() => pushToast('info', 'Rétrogradation', 'Cette action prendra effet à la prochaine échéance.')}>
            Rétrograder
          </button>
        </div>
        <div className="panel" style={{ borderColor: 'var(--border-strong)', background: 'color-mix(in srgb, var(--brass) 8%, transparent)' }}>
          <span className="eyebrow">Sovereign / Enterprise+</span>
          <div className="kpi-card__value" style={{ marginTop: 10 }}>
            Sur devis
          </div>
          <p className="muted" style={{ margin: '10px 0 16px' }}>
            Déploiement dédié / VPC, SLA renforcé, connecteurs sur mesure, CSM dédié.
          </p>
          <button className="btn btn-primary btn-block" disabled>
            Palier actuel
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel__head">
          <div>
            <h3>Usage du mois en cours</h3>
          </div>
        </div>
        <div className="stack">
          {USAGE.map((u) => (
            <div key={u.label}>
              <div className="row-between">
                <span className="muted">{u.label}</span>
                <span className="muted">{u.value}</span>
              </div>
              <div className="progress" style={{ marginTop: 6 }}>
                <div className="progress__fill" style={{ width: `${u.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel__head">
          <div>
            <h3>Historique des factures</h3>
          </div>
        </div>
        <table className="dtable">
          <thead>
            <tr>
              <th>Facture</th>
              <th>Période</th>
              <th>Montant</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {INVOICES.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.id}</td>
                <td>{inv.period}</td>
                <td>{inv.amount}</td>
                <td>
                  <span className="pill status-approved">Payée</span>
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm">PDF</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScreenStateGate>
  );
}
