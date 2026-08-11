# Nexus Enterprise Workspace

SaaS multi-tenant de pilotage stratégique (M&E) pour ONG, entreprises et cabinets de conseil.

```
apps/
  backend-nestjs/   API NestJS — 7 modules (M1-M7), port 3000
  web/              Frontend React/Vite, port 5173
packages/
  database/         Migrations SQL (V001-V024), source de vérité du schéma
docs/
  NEW_Prototype_Interactif.html   Prototype HTML de référence (validé produit)
instructions/       Journal détaillé de chaque passe de développement
```

## Démarrage — développement local

1. **Base de données** :
   ```bash
   docker compose up -d          # Postgres/TimescaleDB + Redis
   ```
   Rejouer `packages/database/V001` à `V024` dans l'ordre, créer le rôle `app_runtime`
   (cf. `V021__row_level_security.sql`).

2. **Backend** :
   ```bash
   cd apps/backend-nestjs
   cp .env.example .env   # remplir DATABASE_URL (rôle app_runtime), clés JWT, GEMINI/ANTHROPIC
   npm install
   npm run prisma:generate
   npm run verify:db       # doit afficher 2 ✅ avant d'aller plus loin
   npm run start:dev
   ```
   - API : http://localhost:3000
   - Documentation interactive (Swagger, hors production) : http://localhost:3000/docs
   - Vérification de santé : http://localhost:3000/health

3. **Frontend** :
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```
   http://localhost:5173 — le proxy Vite route les appels API vers le backend.

## Déploiement conteneurisé (production/staging)

```bash
cp .env.production.example .env.production   # à créer : DATABASE_URL non nécessaire
                                              # (généré depuis APP_RUNTIME_PASSWORD),
                                              # JWT_PRIVATE_KEY, JWT_PUBLIC_KEY, etc.
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Assemble Postgres, Redis, le backend (Dockerfile multi-étapes, healthcheck sur `/health`) et le
frontend (build Vite servi par nginx, qui proxifie les appels API vers le backend). **Les
migrations ne sont pas exécutées automatiquement** au premier démarrage — à rejouer une fois
manuellement contre ce nouveau volume Postgres avant que le backend ne soit fonctionnel.

## Sécurité & fiabilité déjà en place

- Variables d'environnement validées au démarrage (échec immédiat et explicite si
  `DATABASE_URL`/`JWT_*` manquent, plutôt qu'une erreur confuse à la première requête)
- En-têtes de sécurité HTTP (Helmet), limitation de débit globale (10 req/s/IP) en plus du
  verrou anti-bruteforce dédié sur `/auth/login`
- Filtre d'exception global : format d'erreur cohérent sur toute l'API, jamais de fuite de
  stack trace en production
- Arrêt propre (SIGTERM/SIGINT) : ferme les connexions Postgres/Redis avant de quitter
- RLS PostgreSQL sur 32+ tables, RBAC à 5 niveaux, anonymisation SHA-256 avant tout appel LLM
  externe, fallback automatique Gemini ↔ Claude

## Ordre d'implémentation du backend

M1 (IAM ✅) → M7 (Platform ✅) → M2 (Ingestion ✅) → M3 (Strategy ✅) → M5 (Nexus AI ✅) →
M4 (Collaboration ✅) / M6 (Decision Portal ✅) — les 7 modules sont posés. Détail complet de
chaque passe, décisions prises et gaps volontairement laissés ouverts (SSO, rendu PPTX/PNG) :
voir `instructions/`.
