import 'dotenv/config';
import { Client } from 'pg';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('--- 1. Rôle de connexion ---');
  const { rows: roleRows } = await client.query(`
    SELECT current_user, usesuper AS is_superuser, rolbypassrls AS bypasses_rls
    FROM pg_user u JOIN pg_roles r ON r.rolname = u.usename
    WHERE usename = current_user;
  `);
  const role = roleRows[0];
  console.log(role);

  if (role.current_user !== 'app_runtime') {
    console.error(`\n❌ DATABASE_URL utilise le rôle "${role.current_user}", pas "app_runtime".`);
    console.error('   Corrige DATABASE_URL dans .env avant de continuer — le RLS ne protège rien tant que ce n\'est pas app_runtime.');
    process.exitCode = 1;
  } else if (role.is_superuser || role.bypasses_rls) {
    console.error('\n❌ app_runtime a un attribut is_superuser ou bypassrls actif — anormal, revoir V021 (CREATE ROLE).');
    process.exitCode = 1;
  } else {
    console.log('✅ Rôle correct : app_runtime, sans privilège de contournement.');
  }

  console.log('\n--- 2. RLS réellement appliqué (sans contexte tenant positionné) ---');
  const { rows: projectRows } = await client.query(`SELECT count(*) FROM projects;`);
  const count = Number(projectRows[0].count);
  if (count === 0) {
    console.log('✅ 0 ligne renvoyée sans contexte tenant — le RLS filtre bien par défaut.');
  } else {
    console.error(`\n❌ ${count} ligne(s) renvoyée(s) SANS contexte tenant positionné — le RLS ne filtre pas comme attendu.`);
    console.error('   Vérifie que FORCE ROW LEVEL SECURITY est bien actif sur "projects" (V021).');
    process.exitCode = 1;
  }

  await client.end();
}

main().catch((err) => {
  console.error('Erreur de connexion :', err);
  process.exit(1);
});
