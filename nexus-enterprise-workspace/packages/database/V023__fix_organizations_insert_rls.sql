-- ============================================================================
-- V023 — Correction RLS : création d'organisation bloquée par sa propre policy
-- ============================================================================
-- Découvert en implémentant POST /organizations (Module M1) : la policy
-- "membership_isolation" définie en V021 ne précise pas de clause FOR,
-- donc s'applique par défaut à TOUTES les commandes (SELECT/INSERT/UPDATE/
-- DELETE) avec la même expression utilisée à la fois comme USING et comme
-- WITH CHECK implicite.
--
-- Conséquence : à l'INSERT d'une nouvelle ligne dans "organizations", le
-- WITH CHECK exige que son id soit déjà présent dans organization_users —
-- impossible, puisque cette ligne de membership ne peut être créée qu'APRÈS
-- que l'organisation existe. Toute tentative de création échoue avec une
-- erreur de policy RLS, quel que soit le rôle applicatif.
--
-- C'est le même problème poule/œuf que celui déjà documenté en V021 pour la
-- lecture (GET /organizations avant sélection d'une organisation courante),
-- mais sur l'écriture, non couvert par le commentaire d'origine.
-- ============================================================================

DROP POLICY IF EXISTS membership_isolation ON organizations;

-- Lecture : uniquement les organisations dont l'utilisateur est membre.
CREATE POLICY select_own_organizations ON organizations FOR SELECT USING (
    id IN (SELECT organization_id FROM organization_users WHERE user_id = current_user_id())
);

-- Modification/suppression : même restriction que la lecture.
CREATE POLICY update_own_organizations ON organizations FOR UPDATE USING (
    id IN (SELECT organization_id FROM organization_users WHERE user_id = current_user_id())
);
CREATE POLICY delete_own_organizations ON organizations FOR DELETE USING (
    id IN (SELECT organization_id FROM organization_users WHERE user_id = current_user_id())
);

-- Création : ouverte à tout utilisateur authentifié (app_runtime). C'est le
-- service applicatif (OrganizationsService.create, même transaction) qui crée
-- immédiatement après la ligne organization_users faisant de l'appelant le
-- Owner — l'organisation reste invisible (SELECT) à quiconque d'autre tant
-- que cette ligne de membership n'existe pas, donc aucune fuite malgré
-- l'ouverture de l'INSERT.
CREATE POLICY insert_new_organization ON organizations FOR INSERT WITH CHECK (true);
