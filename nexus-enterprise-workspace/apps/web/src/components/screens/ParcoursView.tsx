import { PERSONAS, ROLES, useStore, type PersonaKey } from '../../store/useStore';

const SECONDARY_JOURNEYS = [
  {
    eyebrow: 'Onboarding',
    title: "Création d'une organisation",
    text: 'Inscription → création de l\'organisation (Owner automatique) → invitation de l\'équipe → premier connecteur.',
  },
  {
    eyebrow: 'Nexus AI',
    title: 'Ébauche de cadre logique par IA',
    text: "Upload d'un appel d'offres → extraction RAG des objectifs et budgets → ébauche proposée → validation par le PO.",
  },
  {
    eyebrow: 'Portail décisionnel',
    title: 'Partage sécurisé vers un bailleur',
    text: 'Filtrer une vue → générer un lien en lecture seule avec expiration → transmission à un partenaire externe.',
  },
  {
    eyebrow: 'Administration',
    title: "Invitation & gestion des accès",
    text: "Invitation par e-mail avec rôle RBAC → jeton signé (72 h) → activation MFA au premier accès.",
  },
];

/**
 * Parcours guidés — rejoue les user journeys documentés au PRD §10.
 * Le sélecteur de personas ci-dessous est le point d'entrée de la
 * démonstration du RBAC (Specs §2.2.3) : chaque persona a un rôle et un
 * écran d'atterrissage différents (PRD §5).
 */
export default function ParcoursView() {
  const { pushToast, switchPersona } = useStore();

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">Parcours utilisateur</span>
          <h1>Rejouer les parcours clés du PRD</h1>
          <p>
            Chaque carte correspond à un parcours documenté (section 10 du PRD et référentiel de user stories). Le
            premier parcours peut être rejoué pas à pas, personas comprises.
          </p>
        </div>
      </div>

      <div className="panel" style={{ borderColor: 'var(--border-strong)', background: 'color-mix(in srgb, var(--teal) 6%, transparent)' }}>
        <div className="row-between">
          <div>
            <span className="pill status-flagged" style={{ marginBottom: 8 }}>
              Parcours principal — PRD §10
            </span>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.2rem', marginTop: 8 }}>
              De la boue au board
            </h3>
            <p className="muted" style={{ marginTop: 8, maxWidth: '60ch' }}>
              Collecte terrain hors-ligne → détection d'anomalie par l'IA → correction &amp; soumission par l'Analyste
              S&amp;E → validation managériale → mise à jour instantanée du tableau de bord et génération d'un rapport
              narratif. Traverse 4 personas et 5 écrans.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => pushToast('info', 'Démonstration guidée', 'Le parcours "De la boue au board" démarre — suivez les invites à l\'écran.')}
          >
            ▶ Lancer la démonstration guidée
          </button>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 18 }}>
        {SECONDARY_JOURNEYS.map((j) => (
          <div className="panel" key={j.title}>
            <span className="eyebrow">{j.eyebrow}</span>
            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.05rem', marginTop: 8 }}>{j.title}</h4>
            <p className="muted" style={{ marginTop: 8 }}>
              {j.text}
            </p>
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 14 }}
              onClick={() => pushToast('info', j.title, 'Rejeu du parcours en cours…')}
            >
              Revoir ce parcours
            </button>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel__head">
          <div>
            <h3>Personas d'entreprise</h3>
            <p>Cliquez une carte pour basculer de persona et voir le RBAC et le contenu s'adapter (PRD §5, Specs §2.2.3)</p>
          </div>
        </div>
        <div className="grid-2">
          {(Object.keys(PERSONAS) as PersonaKey[]).map((key) => {
            const p = PERSONAS[key];
            const r = ROLES[p.role];
            return (
              <div className="persona-card" key={key} onClick={() => switchPersona(key)}>
                <div className="avatar">{p.initials}</div>
                <div className="persona-card__meta">
                  <div className="persona-card__name">{p.name}</div>
                  <div className="persona-card__role">
                    {p.title} · {r.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
