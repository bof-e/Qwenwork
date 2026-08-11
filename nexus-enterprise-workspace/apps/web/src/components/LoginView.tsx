import { useState } from 'react';
import { api, setToken } from '../lib/api';

/**
 * Pont réel vers le module IAM (M1) — l'app se lançait jusqu'ici directement
 * sur AppLayout avec une persona de démonstration. Ce login authentifie
 * vraiment contre POST /auth/login puis POST /auth/register si le compte
 * n'existe pas encore (boucle de bootstrap la plus simple pour un premier
 * compte de test).
 */
export default function LoginView({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const body =
        mode === 'login' ? { email, password } : { email, password, firstName, lastName };
      const data = await api<{ access_token: string }>(path, { method: 'POST', body: JSON.stringify(body) });
      setToken(data.access_token);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="panel" style={{ width: 380 }}>
        <span className="eyebrow">Nexus Enterprise Workspace</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '10px 0 20px' }}>
          {mode === 'login' ? 'Connexion' : 'Créer un compte'}
        </h1>

        <form onSubmit={submit} className="stack">
          {mode === 'register' && (
            <div className="field-row">
              <div className="field">
                <label>Prénom</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="field">
                <label>Nom</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === 'register' ? 8 : undefined} />
          </div>

          {error && (
            <div className="notice notice-error">
              <p>{error}</p>
            </div>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Patientez…' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
          </button>
        </form>

        <button
          className="btn-text"
          style={{ marginTop: 14, width: '100%', textAlign: 'center' }}
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
        </button>
      </div>
    </div>
  );
}
