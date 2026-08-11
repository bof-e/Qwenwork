import { useState } from 'react';
import { ScreenStateGate, EmptyState, ErrorState } from '../layout/AppLayout';
import { useStore } from '../../store/useStore';

type ApprovalStatus = 'pending' | 'approved' | 'rejected';

const THREADS = [
  { title: '⚠ Taux vaccinal — Site Nord', author: 'Aisha Diallo', time: 'il y a 8 min', pill: 'status-flagged', label: 'Alerte' },
  { title: 'Lot #2290 — Site Est', author: 'Karim Benali', time: 'il y a 40 min', pill: 'status-pending', label: 'Approbation' },
  { title: 'Jalon Q2 — Rapport bailleurs', author: 'Isabelle Moreau', time: 'hier', pill: 'status-approved', label: 'Résolu' },
  { title: "Output 2.1 — Points d'eau", author: 'Jean-Pierre Koffi', time: 'il y a 2 j', pill: 'status-cleaned', label: 'Actif' },
];

/**
 * Espace collaboratif — Module M4 (Collaboration), Chapitre 5.
 * Le workflow d'approbation (BR-04 : recalcul en cascade après validation
 * managériale) est simulé ici via un état local — à brancher sur
 * PATCH /data-batches/{id}/approve (Manager+, Chapitre 3.4).
 */
export default function CollaboratifView() {
  const { setScreenState, pushToast } = useStore();
  const [approval, setApproval] = useState<ApprovalStatus>('pending');
  const [message, setMessage] = useState('');

  const approve = () => {
    setApproval('approved');
    pushToast('success', 'Lot approuvé', 'Le recalcul en cascade a été déclenché (BR-04).');
  };
  const reject = () => {
    setApproval('rejected');
    pushToast('info', 'Lot rejeté', "L'analyste a été notifié pour correction.");
  };
  const send = () => {
    if (!message.trim()) return;
    pushToast('success', 'Message envoyé', 'Votre commentaire a été ajouté au fil.');
    setMessage('');
  };

  return (
    <ScreenStateGate
      loading={
        <div>
          <div className="skel skel-line" style={{ height: 28, width: 260, marginBottom: 22 }} />
          <div className="grid-12">
            <div className="col-4">
              <div className="skel" style={{ height: 340 }} />
            </div>
            <div className="col-8">
              <div className="skel" style={{ height: 340 }} />
            </div>
          </div>
        </div>
      }
      empty={
        <EmptyState
          d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.5 8.5 0 0 1-3.8-.9L3 20l1-4.5A8.4 8.4 0 1 1 21 11.5Z"
          title="Les fils de discussion apparaîtront ici"
          text="Un fil est créé automatiquement dès qu'un indicateur, un projet ou un jalon fait l'objet d'un commentaire ou d'une alerte IA."
        />
      }
      error={
        <ErrorState
          title="Connexion au canal temps réel perdue"
          text="Le service WebSocket (Redis pub/sub) est en reconnexion. Les nouveaux messages seront affichés dès le rétablissement."
          onRetry={() => setScreenState('success')}
          retryLabel="Reconnecter"
        />
      }
    >
      <div className="page-head">
        <div>
          <span className="eyebrow">Espace collaboratif</span>
          <h1>Fils de discussion contextuels</h1>
          <p>Chaque indicateur, projet ou jalon a son propre canal. Un fil d'alerte est ouvert automatiquement par l'IA en cas de dérive.</p>
        </div>
        <div className="page-head__actions">
          <button className="btn btn-ghost" onClick={() => pushToast('info', 'Export lancé', "Le journal d'audit est en cours d'export en .csv.")}>
            Exporter l'audit trail (.csv)
          </button>
        </div>
      </div>

      <div className="grid-12">
        <div className="col-4">
          <div className="panel panel--tight stack">
            {THREADS.map((t, i) => (
              <div
                key={i}
                className="row-between panel--tight clickable"
                style={i === 0 ? { background: 'color-mix(in srgb, var(--brass) 10%, transparent)', borderRadius: 'var(--radius-sm)' } : undefined}
              >
                <div>
                  <b style={{ fontSize: '.85rem' }}>{t.title}</b>
                  <div className="muted">
                    {t.author} · {t.time}
                  </div>
                </div>
                <span className={`pill ${t.pill}`}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-8">
          <div className="panel">
            <div className="panel__head">
              <div>
                <h3>⚠ Taux de couverture vaccinale — Site Nord</h3>
                <p>Thread d'alerte ouvert automatiquement — indicateur sous seuil critique</p>
              </div>
              <span className="pill status-flagged">Écart de 20 %</span>
            </div>

            <div className="chat-thread">
              <div className="chat-msg chat-msg--ai">
                <div className="avatar avatar-sm">AI</div>
                <div>
                  <div className="chat-bubble">
                    Anomalie détectée sur « Taux de couverture vaccinale — Site Nord » : valeur 142 % hors plage (Z-score
                    4.8). @Aisha Diallo, une correction est proposée : plafonner à la dernière valeur validée (98 %).
                  </div>
                  <div className="chat-meta">Nexus AI · il y a 22 min</div>
                </div>
              </div>
              <div className="chat-msg">
                <div className="avatar avatar-sm">AD</div>
                <div>
                  <div className="chat-bubble">
                    Confirmé — erreur de saisie sur le terrain (virgule décimale). Je valide la correction proposée et
                    soumets le lot.
                  </div>
                  <div className="chat-meta">Aisha Diallo · il y a 15 min</div>
                </div>
              </div>
              <div className="chat-msg chat-msg--ai">
                <div className="avatar avatar-sm">AI</div>
                <div>
                  <div className="chat-bubble">
                    Lot #2291 mis à jour. Statut : <b>en attente d'approbation</b>. @Karim Benali, une validation
                    managériale est requise avant recalcul en cascade (BR-04).
                  </div>
                  <div className="chat-meta">Nexus AI · il y a 14 min</div>
                </div>
              </div>

              <div className="panel panel--tight" style={{ borderColor: 'var(--border-strong)' }}>
                <div className="row-between">
                  <div>
                    <b style={{ fontSize: '.86rem' }}>Demande d'approbation — Lot #2291</b>
                    <p className="muted" style={{ marginTop: 4 }}>
                      1 correction IA appliquée · Site Nord · soumis par Aisha Diallo
                    </p>
                  </div>
                  <span className={`pill ${approval === 'approved' ? 'status-approved' : approval === 'rejected' ? 'status-rejected' : 'status-pending'}`}>
                    {approval === 'approved' ? 'Approuvé' : approval === 'rejected' ? 'Rejeté' : 'En attente'}
                  </span>
                </div>
                <div className="divider" />
                <div className="row-between">
                  <span className="muted">Rôle requis : Manager ou supérieur</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={reject} disabled={approval !== 'pending'}>
                      Rejeter
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={approve} disabled={approval !== 'pending'}>
                      Approuver
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="chat-input-row">
              <input
                type="text"
                placeholder="Écrire un message dans ce fil…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
              />
              <button className="btn btn-primary" onClick={send}>
                Envoyer
              </button>
            </div>
          </div>
        </div>
      </div>
    </ScreenStateGate>
  );
}
