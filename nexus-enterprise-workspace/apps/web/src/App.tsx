import { useState } from 'react';
import AppLayout from './components/layout/AppLayout';
import LoginView from './components/LoginView';
import { useStore } from './store/useStore';
import { getToken } from './lib/api';

import DashboardView from './components/screens/DashboardView';
import CadreLogiqueView from './components/screens/CadreLogiqueView';
import CollecteView from './components/screens/CollecteView';
import CollaboratifView from './components/screens/CollaboratifView';
import ConnecteursView from './components/screens/ConnecteursView';
import NexusAIView from './components/screens/NexusAIView';
import RapportsView from './components/screens/RapportsView';
import FacturationView from './components/screens/FacturationView';
import ParcoursView from './components/screens/ParcoursView';

/**
 * Composant racine.
 *
 * Gate d'authentification réelle (M1) : sans token, LoginView s'affiche.
 * Une fois connecté, le reste de l'app garde son comportement de
 * démonstration (sélecteur de persona pour explorer le RBAC) — le rôle réel
 * du JWT n'est pas encore synchronisé avec le store de démo (TODO ci-dessous).
 * Le module Administration reste hors périmètre.
 */
export default function App() {
  const screen = useStore((s) => s.screen);
  const [authed, setAuthed] = useState(!!getToken());

  if (!authed) {
    return <LoginView onSuccess={() => setAuthed(true)} />;
  }

  const screens = {
    dashboard: <DashboardView />,
    'cadre-logique': <CadreLogiqueView />,
    collecte: <CollecteView />,
    collaboratif: <CollaboratifView />,
    connecteurs: <ConnecteursView />,
    'nexus-ai': <NexusAIView />,
    rapports: <RapportsView />,
    facturation: <FacturationView />,
    parcours: <ParcoursView />,
  } as const;

  return <AppLayout>{screens[screen]}</AppLayout>;
}

// TODO : dériver le rôle RBAC réel du JWT (payload.role) et le pousser dans
// useStore au lieu du sélecteur de persona, une fois le multi-org réellement
// exposé côté frontend (aujourd'hui la démo RBAC reste indépendante du
// compte réellement connecté).
