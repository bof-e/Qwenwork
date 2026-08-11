import { useState } from 'react';
import { ScreenStateGate, EmptyState, ErrorState, Icon } from '../layout/AppLayout';
import { useStore } from '../../store/useStore';

/**
 * Collecte terrain — PWA offline-first (Chapitre 14). Authentifiée en
 * Viewer + scope JWT `field_sync` (Specs §2.2.4, correctif audit du
 * 4 juillet 2026) plutôt qu'un rôle RBAC dédié.
 */
export default function CollecteView() {
  const { setScreenState, pushToast } = useStore();
  const [vaccin, setVaccin] = useState('142');
  const [menages, setMenages] = useState('86');

  const vaccinOutOfRange = Number(vaccin) > 100 || Number(vaccin) < 0;

  return (
    <ScreenStateGate
      loading={
        <div>
          <div className="skel skel-line" style={{ height: 28, width: 260, marginBottom: 22 }} />
          <div className="phone-frame">
            <div className="phone-notch" />
            <div className="phone-screen">
              <div className="skel skel-line w60" />
              <div className="skel skel-line w80" />
              <div className="skel" style={{ height: 44, margin: '14px 0' }} />
              <div className="skel" style={{ height: 44, margin: '14px 0' }} />
            </div>
          </div>
        </div>
      }
      empty={
        <EmptyState
          d="M10 18h4"
          title="Vous n'avez pas encore de formulaire de collecte"
          text="Votre chef d'équipe n'a pas encore assigné de formulaire à votre profil terrain. Contactez votre PMO ou vérifiez la synchronisation."
          cta={
            <button className="btn btn-primary" onClick={() => setScreenState('success')}>
              Rafraîchir
            </button>
          }
        />
      }
      error={
        <ErrorState
          title="3 enregistrements n'ont pas pu être synchronisés"
          text="Vos données sont conservées localement (IndexedDB). Elles seront renvoyées automatiquement dès le retour du réseau — aucune perte de données."
          onRetry={() => setScreenState('success')}
          retryLabel="Relancer la synchronisation"
        />
      }
    >
      <div className="page-head">
        <div>
          <span className="eyebrow">Collecte terrain</span>
          <h1>Saisie — Site Nord</h1>
          <p>Formulaire « Suivi mensuel — sécurité alimentaire ». Fonctionne sans connexion ; la synchronisation reprend automatiquement au retour du réseau.</p>
        </div>
      </div>

      <div className="grid-12">
        <div className="col-6">
          <div className="phone-frame">
            <div className="phone-notch" />
            <div className="phone-screen">
              <div className="phone-statusbar">
                <span>09:41</span>
                <span>● Hors-ligne</span>
              </div>
              <span className="eyebrow" style={{ marginBottom: 10 }}>
                Formulaire Kobo
              </span>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.1rem', margin: '8px 0 16px' }}>
                Suivi mensuel — Site Nord
              </h3>
              <div className="stack">
                <div className="field">
                  <label>Taux de couverture vaccinale (%)</label>
                  <input type="number" value={vaccin} onChange={(e) => setVaccin(e.target.value)} />
                </div>
                <div className="field">
                  <label>Ménages enquêtés</label>
                  <input type="number" value={menages} onChange={(e) => setMenages(e.target.value)} />
                </div>
                <div className="field">
                  <label>Observations</label>
                  <textarea defaultValue="RAS sur la distribution des kits. Puits n°4 toujours en réparation." />
                </div>
              </div>
              {vaccinOutOfRange && (
                <div className="notice notice-warning" style={{ marginTop: 14 }}>
                  <Icon d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                  <div>
                    <b>Alerte IA proactive</b>
                    <p>La valeur « {vaccin} % » dépasse la plage attendue (0–100 %). Vérifiez la saisie avant l'envoi.</p>
                  </div>
                </div>
              )}
              <button
                className="btn btn-primary btn-block"
                style={{ marginTop: 16 }}
                onClick={() => pushToast('success', 'Ajouté à la file', "Le lot sera envoyé dès le retour du réseau (queue IndexedDB).")}
              >
                Envoyer (file d'attente)
              </button>
            </div>
          </div>
        </div>

        <div className="col-6">
          <div className="panel">
            <div className="panel__head">
              <div>
                <h3>File de synchronisation locale</h3>
                <p>IndexedDB · résolution de conflits journalisée</p>
              </div>
            </div>
            <div className="stack">
              <div className="row-between panel--tight" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <b style={{ fontSize: '.84rem' }}>Lot #2287 — Site Sud</b>
                  <div className="muted">Envoyé et intégré</div>
                </div>
                <span className="pill status-approved">Synchronisé</span>
              </div>
              <div className="row-between panel--tight" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <b style={{ fontSize: '.84rem' }}>Lot #2290 — Site Est</b>
                  <div className="muted">En attente d'approbation — Karim Benali</div>
                </div>
                <span className="pill status-pending">En attente</span>
              </div>
              <div className="row-between panel--tight" style={{ border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <b style={{ fontSize: '.84rem' }}>3 enregistrements</b>
                  <div className="muted">En file, en attente de réseau</div>
                </div>
                <span className="pill status-off">En file</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScreenStateGate>
  );
}
