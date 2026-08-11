import { useState } from 'react';
import { apiRequest } from '../lib/api';

interface PricingTier {
  id: string;
  name: string;
  tier: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'ngo-essential',
    name: 'NGO Essential',
    tier: 'NGO_Essential',
    price: 'Gratuit',
    period: 'pour toujours',
    description: 'Pour les petites ONG et projets pilotes',
    features: [
      'Jusqu\'à 5 utilisateurs',
      'Cadre logique basique',
      'Connecteurs KoboToolbox',
      '1 rapport IA / mois',
      'Support communautaire',
      'Stockage 10 Go',
    ],
    cta: 'Commencer gratuitement',
  },
  {
    id: 'enterprise-pro',
    name: 'Enterprise Professional',
    tier: 'Enterprise_Professional',
    price: '$49',
    period: 'par utilisateur / mois',
    description: 'Pour les organisations en croissance',
    features: [
      'Utilisateurs illimités',
      'Tous connecteurs disponibles',
      'Chat contextuel illimité',
      'Data cleaning IA illimité',
      'SSO SAML/OIDC',
      'Support prioritaire 24/7',
      'Stockage 500 Go',
      'API access complet',
    ],
    cta: 'Essai gratuit 14 jours',
    popular: true,
  },
  {
    id: 'sovereign',
    name: 'Sovereign',
    tier: 'Sovereign',
    price: 'Sur devis',
    period: '',
    description: 'Pour les déploiements critiques',
    features: [
      'Déploiement dédié / VPC',
      'SLA 99.9% garanti',
      'Connecteurs sur mesure',
      'Customer Success Manager dédié',
      'Formation personnalisée',
      'Audit de sécurité inclus',
      'Stockage illimité',
      'Support 24/7/365',
    ],
    cta: 'Contacter l\'équipe',
  },
];

export default function LandingView() {
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    organizationName: '',
    industry: 'NGO',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOpenSignup = (tier: string) => {
    setSelectedTier(tier);
    setShowSignupModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Étape 1 : Créer le compte utilisateur
      const authResponse = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      });

      const { access_token, refresh_token } = authResponse;

      // Stocker les tokens
      localStorage.setItem('nexus_token', access_token);
      localStorage.setItem('nexus_refresh_token', refresh_token);

      // Étape 2 : Créer l'organisation
      await apiRequest('/organizations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          name: formData.organizationName,
          industry: formData.industry,
          tier: selectedTier || 'NGO_Essential',
        }),
      });

      // Redirection vers l'app
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <header className="landing-hero">
        <div className="landing-container">
          <div className="landing-hero-content">
            <h1 className="landing-hero-title">
              Nexus Enterprise Workspace
            </h1>
            <p className="landing-hero-subtitle">
              Plateforme SaaS de pilotage stratégique (M&E) pour ONG, entreprises et cabinets de conseil
            </p>
            <div className="landing-hero-cta">
              <button 
                className="btn btn-primary btn-lg"
                onClick={() => handleOpenSignup('Enterprise_Professional')}
              >
                Commencer l'essai gratuit
              </button>
              <button className="btn btn-ghost btn-lg">
                Voir la démo
              </button>
            </div>
            <p className="landing-hero-note">
              ✓ 14 jours d'essai gratuit · ✓ Pas de carte requise · ✓ Annulable anytime
            </p>
          </div>
          <div className="landing-hero-image">
            <div className="landing-dashboard-preview">
              <div className="skel" style={{ height: '100%', borderRadius: '8px' }} />
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="landing-section">
        <div className="landing-container">
          <h2 className="landing-section-title">Tout ce dont vous avez besoin pour piloter vos projets</h2>
          <div className="landing-features-grid">
            <div className="landing-feature-card">
              <div className="landing-feature-icon">📊</div>
              <h3>Cadre Logique</h3>
              <p>Définissez vos objectifs, indicateurs et cibles en quelques clics</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">🔗</div>
              <h3>Connecteurs</h3>
              <p>Intégrez KoboToolbox, ODK, Excel et plus encore</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">🤖</div>
              <h3>Nexus AI</h3>
              <p>Génération automatique de rapports et nettoyage de données</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">💬</div>
              <h3>Collaboration</h3>
              <p>Chat en temps réel, threads et alertes intelligentes</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">📈</div>
              <h3>Dashboards</h3>
              <p>Visualisations puissantes et exports PDF/Excel</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">🔒</div>
              <h3>Sécurité</h3>
              <p>RBAC, MFA, SSO et conformité RGPD</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="landing-section landing-pricing">
        <div className="landing-container">
          <h2 className="landing-section-title">Des tarifs adaptés à chaque organisation</h2>
          <p className="landing-section-subtitle">
            Choisissez le palier qui correspond à vos besoins
          </p>
          <div className="pricing-grid">
            {PRICING_TIERS.map((tier) => (
              <div 
                key={tier.id} 
                className={`pricing-card ${tier.popular ? 'popular' : ''}`}
              >
                {tier.popular && (
                  <div className="pricing-badge">Plus populaire</div>
                )}
                <h3 className="pricing-name">{tier.name}</h3>
                <div className="pricing-price">
                  <span className="pricing-amount">{tier.price}</span>
                  {tier.period && <span className="pricing-period">{tier.period}</span>}
                </div>
                <p className="pricing-description">{tier.description}</p>
                <ul className="pricing-features">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="pricing-feature-item">
                      <span className="check-icon">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button 
                  className={`btn ${tier.popular ? 'btn-primary' : 'btn-outline'} btn-block`}
                  onClick={() => handleOpenSignup(tier.tier)}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="landing-section landing-trust">
        <div className="landing-container">
          <h2 className="landing-section-title">Ils nous font confiance</h2>
          <div className="trust-logos">
            <div className="trust-logo">ONG Internationale</div>
            <div className="trust-logo">Gouvernement</div>
            <div className="trust-logo">Cabinet de Conseil</div>
            <div className="trust-logo">Entreprise Sociale</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-grid">
            <div>
              <h4>Nexus Enterprise Workspace</h4>
              <p>Plateforme de pilotage stratégique pour organisations impactantes</p>
            </div>
            <div>
              <h4>Produit</h4>
              <ul>
                <li><a href="#features">Fonctionnalités</a></li>
                <li><a href="#pricing">Tarifs</a></li>
                <li><a href="#security">Sécurité</a></li>
              </ul>
            </div>
            <div>
              <h4>Ressources</h4>
              <ul>
                <li><a href="#docs">Documentation</a></li>
                <li><a href="#api">API</a></li>
                <li><a href="#support">Support</a></li>
              </ul>
            </div>
            <div>
              <h4>Légal</h4>
              <ul>
                <li><a href="#privacy">Confidentialité</a></li>
                <li><a href="#terms">Conditions</a></li>
                <li><a href="#rgpd">RGPD</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 Nexus Enterprise Workspace. Tous droits réservés.</p>
          </div>
        </div>
      </footer>

      {/* Signup Modal */}
      {showSignupModal && (
        <div className="modal-overlay" onClick={() => setShowSignupModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close"
              onClick={() => setShowSignupModal(false)}
            >
              ×
            </button>
            <h2>Créer votre compte</h2>
            <p className="modal-subtitle">
              Rejoignez {selectedTier === 'NGO_Essential' ? 'le palier NGO Essential' : selectedTier === 'Sovereign' ? 'le palier Sovereign' : "l'essai gratuit Enterprise Professional"}
            </p>
            
            <form onSubmit={handleSubmit} className="signup-form">
              <div className="form-group">
                <label>Email professionnel</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="vous@organisation.org"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Prénom</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Jean"
                  />
                </div>
                <div className="form-group">
                  <label>Nom</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Dupont"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Mot de passe</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div className="form-group">
                <label>Nom de l'organisation</label>
                <input
                  type="text"
                  required
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  placeholder="Ma Super ONG"
                />
              </div>

              <div className="form-group">
                <label>Type d'organisation</label>
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                >
                  <option value="NGO">ONG / Association</option>
                  <option value="Government">Gouvernement / Institution publique</option>
                  <option value="Consulting">Cabinet de conseil</option>
                  <option value="Enterprise">Entreprise</option>
                  <option value="Other">Autre</option>
                </select>
              </div>

              {error && (
                <div className="form-error">{error}</div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary btn-block"
                disabled={loading}
              >
                {loading ? 'Création en cours...' : 'Créer mon compte'}
              </button>

              <p className="form-terms">
                En créant un compte, vous acceptez nos{' '}
                <a href="#terms">Conditions d'utilisation</a> et notre{' '}
                <a href="#privacy">Politique de confidentialité</a>.
              </p>
            </form>
          </div>
        </div>
      )}

      <style>{`
        /* Landing Page Styles */
        .landing-page {
          min-height: 100vh;
          background: var(--bg-subtle);
        }

        .landing-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* Hero */
        .landing-hero {
          padding: 80px 0;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: white;
        }

        .landing-hero-content {
          max-width: 600px;
        }

        .landing-hero-title {
          font-size: 48px;
          font-weight: 700;
          margin-bottom: 16px;
          line-height: 1.1;
        }

        .landing-hero-subtitle {
          font-size: 20px;
          opacity: 0.9;
          margin-bottom: 32px;
          line-height: 1.5;
        }

        .landing-hero-cta {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }

        .landing-hero-note {
          font-size: 14px;
          opacity: 0.8;
        }

        .landing-hero-image {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 50%;
          max-width: 600px;
        }

        .landing-dashboard-preview {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
          backdrop-filter: blur(10px);
          aspect-ratio: 16/10;
        }

        /* Sections */
        .landing-section {
          padding: 80px 0;
        }

        .landing-section-title {
          text-align: center;
          font-size: 36px;
          font-weight: 700;
          margin-bottom: 16px;
        }

        .landing-section-subtitle {
          text-align: center;
          font-size: 18px;
          color: var(--text-muted);
          margin-bottom: 48px;
        }

        /* Features */
        .landing-features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 32px;
        }

        .landing-feature-card {
          background: var(--bg-card);
          padding: 32px;
          border-radius: 12px;
          border: 1px solid var(--border);
          transition: transform 0.2s;
        }

        .landing-feature-card:hover {
          transform: translateY(-4px);
        }

        .landing-feature-icon {
          font-size: 40px;
          margin-bottom: 16px;
        }

        .landing-feature-card h3 {
          font-size: 20px;
          margin-bottom: 8px;
        }

        .landing-feature-card p {
          color: var(--text-muted);
          line-height: 1.5;
        }

        /* Pricing */
        .landing-pricing {
          background: var(--bg-subtle);
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 32px;
          align-items: start;
        }

        .pricing-card {
          background: var(--bg-card);
          padding: 40px 32px;
          border-radius: 12px;
          border: 2px solid var(--border);
          position: relative;
          transition: all 0.2s;
        }

        .pricing-card.popular {
          border-color: var(--primary);
          box-shadow: 0 8px 32px rgba(var(--primary-rgb), 0.2);
          transform: scale(1.05);
        }

        .pricing-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--primary);
          color: white;
          padding: 4px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .pricing-name {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .pricing-price {
          margin-bottom: 16px;
        }

        .pricing-amount {
          font-size: 48px;
          font-weight: 700;
          color: var(--primary);
        }

        .pricing-period {
          color: var(--text-muted);
          font-size: 14px;
        }

        .pricing-description {
          color: var(--text-muted);
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .pricing-features {
          list-style: none;
          padding: 0;
          margin: 0 0 32px 0;
        }

        .pricing-feature-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
          font-size: 14px;
          line-height: 1.4;
        }

        .check-icon {
          color: var(--success);
          font-weight: 700;
          flex-shrink: 0;
        }

        /* Trust */
        .landing-trust {
          background: var(--bg-subtle);
        }

        .trust-logos {
          display: flex;
          justify-content: center;
          gap: 48px;
          flex-wrap: wrap;
          margin-top: 40px;
        }

        .trust-logo {
          padding: 24px 48px;
          background: var(--bg-card);
          border-radius: 8px;
          font-weight: 600;
          color: var(--text-muted);
        }

        /* Footer */
        .landing-footer {
          background: var(--bg-dark);
          color: var(--text-muted);
          padding: 60px 0 32px;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 48px;
          margin-bottom: 48px;
        }

        .footer-grid h4 {
          color: white;
          margin-bottom: 16px;
        }

        .footer-grid ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .footer-grid li {
          margin-bottom: 12px;
        }

        .footer-grid a {
          color: var(--text-muted);
          text-decoration: none;
          transition: color 0.2s;
        }

        .footer-grid a:hover {
          color: white;
        }

        .footer-bottom {
          text-align: center;
          padding-top: 32px;
          border-top: 1px solid var(--border);
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 24px;
        }

        .modal-content {
          background: var(--bg-card);
          padding: 40px;
          border-radius: 12px;
          max-width: 480px;
          width: 100%;
          position: relative;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          font-size: 32px;
          cursor: pointer;
          color: var(--text-muted);
          line-height: 1;
        }

        .modal-subtitle {
          color: var(--text-muted);
          margin-bottom: 24px;
        }

        .signup-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-weight: 500;
          font-size: 14px;
        }

        .form-group input,
        .form-group select {
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 14px;
          background: var(--bg-input);
          color: var(--text);
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--primary);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-error {
          color: var(--error);
          font-size: 14px;
          padding: 12px;
          background: rgba(var(--error-rgb), 0.1);
          border-radius: 8px;
        }

        .form-terms {
          font-size: 12px;
          color: var(--text-muted);
          text-align: center;
          margin-top: 8px;
        }

        .form-terms a {
          color: var(--primary);
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .landing-hero {
            padding: 48px 0;
          }

          .landing-hero-title {
            font-size: 32px;
          }

          .landing-hero-content {
            text-align: center;
          }

          .landing-hero-cta {
            justify-content: center;
            flex-direction: column;
          }

          .landing-hero-image {
            display: none;
          }

          .footer-grid {
            grid-template-columns: 1fr;
            gap: 32px;
          }

          .pricing-card.popular {
            transform: none;
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
