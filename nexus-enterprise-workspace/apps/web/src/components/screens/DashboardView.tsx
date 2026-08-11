import { ScreenStateGate, EmptyState, ErrorState, LoadingSkeleton, Icon } from '../layout/AppLayout';
import { useStore } from '../../store/useStore';

/**
 * Tableau de bord — vue principale de l'organisation (Module M6, Chapitre 9).
 * KPI ciblés sur la persona Isabelle (DG) : Time-to-Insight < 2h (PRD §5.1).
 */
export default function DashboardView() {
  const { personaKey, setScreenState, goTo } = useStore();
  const first = { isabelle: 'Isabelle', karim: 'Karim', aisha: 'Aisha', jp: 'Jean-Pierre' }[personaKey];

  return (
    <ScreenStateGate
      loading={<LoadingSkeleton variant="grid12" />}
      empty={
        <EmptyState
          d="M9 3v18M3 9h18"
          title="Aucun projet actif"
          text="Créez votre premier projet à partir d'un cadre logique pour voir vos indicateurs apparaître ici."
          cta={
            <button className="btn btn-primary" onClick={() => goTo('cadre-logique')}>
              Créer un cadre logique
            </button>
          }
        />
      }
      error={
        <ErrorState
          title="Le service de calcul des indicateurs est indisponible"
          text="Les valeurs affichées datent du dernier rafraîchissement réussi (il y a 14 min). Nouvelle tentative automatique en cours."
          onRetry={() => setScreenState('success')}
        />
      }
    >
      <div className="page-head">
        <div>
          <span className="eyebrow">Vue d'ensemble</span>
          <h1>Bonjour {first}, voici l'état du programme</h1>
          <p>Programme Résilience Climatique Sahel · 4 projets actifs · dernière mise à jour il y a 3 min.</p>
        </div>
        <div className="page-head__actions">
          <button className="btn btn-ghost">
            <Icon d="M4 6h16M4 12h16M4 18h7" />
            Filtrer
          </button>
          <button className="btn btn-primary" onClick={() => goTo('nexus-ai')}>
            <Icon d="M12 2 9.5 8.5 3 11l6.5 2.5L12 20l2.5-6.5L21 11l-6.5-2.5L12 2Z" />
            Générer un rapport
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__label">Progression globale</div>
          <div className="kpi-card__value">82 %</div>
          <div className="kpi-card__delta delta-up">
            <Icon d="M12 19V5M5 12l7-7 7 7" style={{ width: 12, height: 12 }} />
            +6 pts vs T1
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__label">Indicateurs sous seuil</div>
          <div className="kpi-card__value">3</div>
          <div className="kpi-card__delta delta-down">
            <Icon d="M12 5v14M5 12l7 7 7-7" style={{ width: 12, height: 12 }} />
            +1 vs semaine dernière
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__label">Taux de complétude terrain</div>
          <div className="kpi-card__value">94 %</div>
          <div className="kpi-card__delta delta-up">
            <Icon d="M12 19V5M5 12l7-7 7 7" style={{ width: 12, height: 12 }} />
            +2 pts
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__label">Time-to-Insight</div>
          <div className="kpi-card__value">1h 42</div>
          <div className="kpi-card__delta delta-flat">Cible &lt; 2h — atteinte</div>
        </div>
      </div>

      <div className="grid-12" style={{ marginTop: 18 }}>
        <div className="col-8">
          <div className="panel">
            <div className="panel__head">
              <div>
                <h3>Progression par output</h3>
                <p>Cadre logique — Programme Résilience Climatique Sahel</p>
              </div>
            </div>
            <div className="bar-chart">
              <div className="bar-col">
                <div className="bar" style={{ height: '70%' }} />
                <div className="bar-label">Sécurité alim.</div>
              </div>
              <div className="bar-col">
                <div className="bar" style={{ height: '61%' }} />
                <div className="bar-label">Accès à l'eau</div>
              </div>
              <div className="bar-col">
                <div className="bar is-brass" style={{ height: '88%' }} />
                <div className="bar-label">Résilience agri.</div>
              </div>
              <div className="bar-col">
                <div className="bar" style={{ height: '54%' }} />
                <div className="bar-label">Gouvernance</div>
              </div>
              <div className="bar-col">
                <div className="bar is-brass" style={{ height: '76%' }} />
                <div className="bar-label">Formation</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-4">
          <div className="panel">
            <div className="panel__head">
              <div>
                <h3>Alertes actives</h3>
              </div>
            </div>
            <div className="stack">
              <div className="row-between panel--tight" style={{ background: 'color-mix(in srgb, var(--brass) 10%, transparent)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <b style={{ fontSize: '.85rem' }}>⚠ Taux vaccinal — Site Nord</b>
                  <div className="muted">Écart de 20 % sous cible</div>
                </div>
                <span className="pill status-flagged">Alerte</span>
              </div>
              <div className="row-between panel--tight">
                <div>
                  <b style={{ fontSize: '.85rem' }}>Lot #2290 — Site Est</b>
                  <div className="muted">En attente d'approbation</div>
                </div>
                <span className="pill status-pending">Approbation</span>
              </div>
              <div className="row-between panel--tight">
                <div>
                  <b style={{ fontSize: '.85rem' }}>Forages Site Sud</b>
                  <div className="muted">3 restants sur 12</div>
                </div>
                <span className="pill status-cleaned">En cours</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScreenStateGate>
  );
}
