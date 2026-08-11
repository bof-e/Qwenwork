import { useState } from 'react';
import { ScreenStateGate, EmptyState, ErrorState, Icon } from '../layout/AppLayout';
import { useStore } from '../../store/useStore';

type Level = 'impact' | 'outcome' | 'output' | 'activity' | 'input';

interface TreeNodeData {
  id: string;
  level: Level;
  name: string;
  value: string;
  collapsedByDefault?: boolean;
  children?: TreeNodeData[];
}

const LEVEL_LABEL: Record<Level, string> = {
  impact: 'Impact · Niv. 0',
  outcome: 'Outcome · Niv. 1',
  output: 'Output · Niv. 2',
  activity: 'Activity · Niv. 3',
  input: 'Input · Niv. 4',
};

/**
 * Données de démonstration — Programme Résilience Climatique Sahel.
 * Structure conforme au cadre logique (Specs Chapitre 4, table
 * logical_frameworks -> indicators, cascade BR-04).
 */
const TREE: TreeNodeData = {
  id: 'impact-1',
  level: 'impact',
  name: 'Réduire la vulnérabilité climatique des communautés du Sahel',
  value: 'Indice composite 0,71',
  children: [
    {
      id: 'outcome-1',
      level: 'outcome',
      name: 'Sécurité alimentaire renforcée',
      value: '82 % de la cible',
      children: [
        {
          id: 'output-1-1',
          level: 'output',
          name: 'Rendements agricoles améliorés',
          value: '+18 % vs saison N-1',
          children: [
            {
              id: 'activity-1-1-1',
              level: 'activity',
              name: 'Formation aux techniques agro-écologiques',
              value: '14 sessions',
              children: [
                { id: 'input-1-1-1-1', level: 'input', name: 'Kits de semences résilientes distribués', value: '320 kits' },
              ],
            },
            {
              id: 'activity-1-1-2',
              level: 'activity',
              name: "Distribution d'intrants résilients",
              value: '6 sites couverts',
              collapsedByDefault: true,
              children: [{ id: 'input-1-1-2-1', level: 'input', name: 'Budget intrants engagé', value: '412 000 $' }],
            },
          ],
        },
        {
          id: 'output-1-2',
          level: 'output',
          name: 'Diversification des revenus agricoles',
          value: '47 % de la cible',
          collapsedByDefault: true,
          children: [{ id: 'activity-1-2-1', level: 'activity', name: 'Appui aux coopératives maraîchères', value: '9 coopératives' }],
        },
      ],
    },
    {
      id: 'outcome-2',
      level: 'outcome',
      name: "Accès à l'eau potable amélioré",
      value: '61 % de la cible',
      collapsedByDefault: true,
      children: [
        {
          id: 'output-2-1',
          level: 'output',
          name: 'Points d\'eau réhabilités',
          value: '9 / 12 forages',
          children: [{ id: 'activity-2-1-1', level: 'activity', name: 'Forage et équipement de puits', value: '9 puits opérationnels' }],
        },
      ],
    },
    {
      id: 'outcome-3',
      level: 'outcome',
      name: 'Résilience agro-pastorale renforcée',
      value: '94 % de la cible',
      collapsedByDefault: true,
      children: [{ id: 'output-3-1', level: 'output', name: 'Cheptel vacciné et suivi', value: '11 400 têtes' }],
    },
  ],
};

function TreeNode({ node, selected, onSelect }: { node: TreeNodeData; selected: string | null; onSelect: (id: string) => void }) {
  const [collapsed, setCollapsed] = useState(!!node.collapsedByDefault);
  const hasChildren = !!node.children?.length;

  return (
    <div className={`tree-node${collapsed ? ' collapsed' : ''}`}>
      <div className={`tree-node__row${selected === node.id ? ' selected' : ''}`} onClick={() => onSelect(node.id)}>
        <span
          className="tree-toggle"
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed((c) => !c);
          }}
        >
          ▾
        </span>
        <span className={`tree-level-tag lvl-${node.level}`}>{LEVEL_LABEL[node.level]}</span>
        <span className="tree-node__name">{node.name}</span>
        <span className="tree-node__value">{node.value}</span>
      </div>
      {hasChildren && (
        <div className="tree-node__children">
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} selected={selected} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Cadre logique — Module M3 (Strategy & Workflow), Chapitre 4.
 * Cliquer un nœud affiche sa formule/historique et permet de déclencher
 * un recalcul en cascade (BR-04) — à brancher sur GET /indicators/{id}/history.
 */
export default function CadreLogiqueView() {
  const [selected, setSelected] = useState<string | null>(null);
  const { setScreenState, pushToast } = useStore();

  return (
    <ScreenStateGate
      loading={
        <div>
          <div className="skel skel-line" style={{ height: 28, width: 300, marginBottom: 22 }} />
          <div className="panel">
            <div className="skel-row">
              <div className="skel skel-avatar" />
              <div style={{ flex: 1 }}>
                <div className="skel skel-line w60" />
                <div className="skel skel-line w40" />
              </div>
            </div>
            <div className="skel-row" style={{ marginLeft: 30 }}>
              <div className="skel skel-avatar" />
              <div style={{ flex: 1 }}>
                <div className="skel skel-line w80" />
                <div className="skel skel-line w60" />
              </div>
            </div>
          </div>
        </div>
      }
      empty={
        <EmptyState
          d="M4 6h16M4 12h10M4 18h6"
          title="Commencez par structurer votre stratégie"
          text="Le cadre logique organise Intrants → Activités → Livrables → Effets → Impact. Laissez Nexus AI en proposer une ébauche à partir d'un appel d'offres, ou créez-le manuellement."
          cta={
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => pushToast('info', 'Import RAG', "Sélectionnez un appel d'offres ou un contrat-cadre à analyser.")}>
                <Icon d="M12 2 9.5 8.5 3 11l6.5 2.5L12 20l2.5-6.5L21 11l-6.5-2.5L12 2Z" />
                Générer une ébauche par IA
              </button>
              <button className="btn btn-ghost" onClick={() => pushToast('info', 'Nœud racine créé', 'Un Impact vide a été ajouté — définissez son intitulé.')}>
                Créer manuellement
              </button>
            </div>
          }
        />
      }
      error={
        <ErrorState
          title="Le moteur de calcul n'a pas pu être joint"
          text="Le service NestJS/TypeORM de calcul des indicateurs est temporairement indisponible. Vos données sources ne sont pas affectées."
          onRetry={() => setScreenState('success')}
        />
      }
    >
      <div className="page-head">
        <div>
          <span className="eyebrow">Cadre logique</span>
          <h1>Programme Résilience Climatique Sahel</h1>
          <p>
            Structure arborescente Impact → Outcome → Output → Activity → Input. Cliquez un nœud pour voir sa formule,
            son historique et déclencher un recalcul en cascade (BR-04).
          </p>
        </div>
        <div className="page-head__actions">
          <button className="btn btn-ghost" onClick={() => pushToast('info', 'Import RAG', "Sélectionnez un appel d'offres ou un contrat-cadre à analyser.")}>
            Importer via IA
          </button>
          <button
            className="btn btn-primary"
            onClick={() => pushToast('success', 'Nœud ajouté', 'Un nouvel Output a été ajouté sous « Sécurité alimentaire renforcée ».')}
          >
            + Ajouter un nœud
          </button>
        </div>
      </div>

      <div className="panel">
        <TreeNode node={TREE} selected={selected} onSelect={setSelected} />
      </div>
    </ScreenStateGate>
  );
}
