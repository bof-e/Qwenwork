import { create } from 'zustand';

/* ============================================================
   DONNÉES DE RÉFÉRENCE
   Portées telles quelles depuis NEW_Prototype_Interactif.html
   (validé produit) — Specs v2.2 §2.2.3 (RBAC), PRD §5 (Personas).
   ============================================================ */

export type RoleKey = 'owner' | 'executive' | 'manager' | 'analyst' | 'viewer';

export interface RoleDef {
  level: number;
  label: string;
  cls: string;
}

export const ROLES: Record<RoleKey, RoleDef> = {
  owner: { level: 4, label: 'Owner', cls: 'role-owner' },
  executive: { level: 3, label: 'Executive', cls: 'role-executive' },
  manager: { level: 2, label: 'Manager', cls: 'role-manager' },
  analyst: { level: 1, label: 'Analyst', cls: 'role-analyst' },
  viewer: { level: 0, label: 'Viewer', cls: 'role-viewer' },
};

export type PersonaKey = 'isabelle' | 'karim' | 'aisha' | 'jp';

export interface PersonaDef {
  name: string;
  first: string;
  role: RoleKey;
  title: string;
  initials: string;
  /** Écran d'atterrissage par défaut pour cette persona (PRD §5) */
  landing: ScreenId;
}

export const PERSONAS: Record<PersonaKey, PersonaDef> = {
  isabelle: { name: 'Isabelle Moreau', first: 'Isabelle', role: 'owner', title: 'DG Stratège', initials: 'IM', landing: 'dashboard' },
  karim: { name: 'Karim Benali', first: 'Karim', role: 'manager', title: 'PMO / Chef de Programme', initials: 'KB', landing: 'collaboratif' },
  aisha: { name: 'Dr. Aisha Diallo', first: 'Aisha', role: 'analyst', title: 'Experte S&E / Data', initials: 'AD', landing: 'nexus-ai' },
  jp: { name: 'Jean-Pierre Koffi', first: 'Jean-Pierre', role: 'viewer', title: "Chef d'Équipe Terrain", initials: 'JK', landing: 'collecte' },
};

export type ScreenId =
  | 'dashboard'
  | 'cadre-logique'
  | 'connecteurs'
  | 'collecte'
  | 'collaboratif'
  | 'nexus-ai'
  | 'rapports'
  | 'facturation'
  | 'parcours';

export interface NavItem {
  id: ScreenId;
  label: string;
  group: string;
  /** Niveau RBAC minimum requis (Specs §2.2.3) pour accéder à l'écran */
  min: number;
  count?: number;
}

/**
 * NOTE — Administration (screen-admin) volontairement absente : hors
 * périmètre de ce module React (non listé dans l'arborescence demandée).
 * L'accès y serait de toute façon Executive+ (§2.2.3), Owner-only pour les
 * actions de modification (correctif audit du 4 juillet 2026).
 */
export const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Tableau de bord', group: 'Pilotage', min: 0 },
  { id: 'cadre-logique', label: 'Cadre logique', group: 'Pilotage', min: 0 },
  { id: 'connecteurs', label: 'Connecteurs', group: 'Données', min: 1 },
  { id: 'collecte', label: 'Collecte terrain', group: 'Données', min: 0 },
  { id: 'collaboratif', label: 'Espace collaboratif', group: 'Collaboration', min: 0, count: 2 },
  { id: 'nexus-ai', label: 'Nexus AI', group: 'Collaboration', min: 1 },
  { id: 'rapports', label: 'Rapports & Export', group: 'Restitution', min: 2 },
  { id: 'facturation', label: 'Facturation', group: 'Système', min: 4 },
  { id: 'parcours', label: 'Parcours guidés', group: 'Système', min: 0 },
];

/** Chemins d'icônes SVG (viewBox 0 0 24 24) — repris du prototype */
export const ICONS: Record<ScreenId, string> = {
  dashboard: 'M3 13h6V3H3v10ZM15 21h6V9h-6v12ZM3 21h6v-4H3v4ZM15 7h6V3h-6v4Z',
  'cadre-logique': 'M4 6h6M4 12h10M4 18h14M4 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM4 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM4 18a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  connecteurs: 'M7.7 7.3 11 16M16.3 7.3 13 16M8.4 6h7.2',
  collecte: 'M10 18h4',
  collaboratif: 'M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.5 8.5 0 0 1-3.8-.9L3 20l1-4.5A8.4 8.4 0 1 1 21 11.5Z',
  'nexus-ai': 'M12 2 9.5 8.5 3 11l6.5 2.5L12 20l2.5-6.5L21 11l-6.5-2.5L12 2Z',
  rapports: 'M5 3h9l5 5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z',
  facturation: 'M2 10h20',
  parcours: 'M4 19V6a2 2 0 0 1 2-2h9l5 5v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z M9 12l2 2 4-4',
};

export type ScreenState = 'loading' | 'empty' | 'error' | 'success';
export type Theme = 'dark' | 'light';
export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message: string;
}

interface NexusStore {
  // ---- Session / persona ----
  personaKey: PersonaKey;
  role: RoleKey;
  theme: Theme;
  offline: boolean;

  // ---- Navigation ----
  screen: ScreenId;
  screenState: ScreenState;

  // ---- Toasts ----
  toasts: Toast[];

  // ---- UI éphémère ----
  personaSwitcherOpen: boolean;
  accessDeniedRole: string | null;

  // ---- Actions ----
  switchPersona: (key: PersonaKey) => void;
  goTo: (screenId: ScreenId) => void;
  setScreenState: (state: ScreenState) => void;
  toggleTheme: () => void;
  setOffline: (offline: boolean) => void;
  pushToast: (type: ToastType, title: string, message: string) => void;
  dismissToast: (id: number) => void;
  openPersonaSwitcher: () => void;
  closePersonaSwitcher: () => void;
  dismissAccessDenied: () => void;
  isLocked: (screenId: ScreenId) => boolean;
}

let toastSeq = 0;

export const useStore = create<NexusStore>((set, get) => ({
  personaKey: 'isabelle',
  role: PERSONAS.isabelle.role,
  theme: 'dark',
  offline: false,

  screen: 'dashboard',
  screenState: 'success',

  toasts: [],

  personaSwitcherOpen: false,
  accessDeniedRole: null,

  switchPersona: (key) => {
    const persona = PERSONAS[key];
    set({ personaKey: key, role: persona.role, personaSwitcherOpen: false });
    get().goTo(persona.landing);
    get().pushToast(
      'info',
      'Persona changée',
      `Vous consultez désormais en tant que ${persona.name} (${ROLES[persona.role].label}).`
    );
  },

  goTo: (screenId) => {
    if (get().isLocked(screenId)) {
      set({ accessDeniedRole: ROLES[get().role].label });
      return;
    }
    set({ screen: screenId, screenState: 'success' });
  },

  setScreenState: (state) => set({ screenState: state }),

  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

  setOffline: (offline) => set({ offline }),

  pushToast: (type, title, message) => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts, { id, type, title, message }] }));
    setTimeout(() => get().dismissToast(id), 4600);
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  openPersonaSwitcher: () => set({ personaSwitcherOpen: true }),
  closePersonaSwitcher: () => set({ personaSwitcherOpen: false }),
  dismissAccessDenied: () => set({ accessDeniedRole: null }),

  isLocked: (screenId) => {
    const navItem = NAV.find((n) => n.id === screenId);
    if (!navItem) return false;
    return navItem.min > ROLES[get().role].level;
  },
}));
