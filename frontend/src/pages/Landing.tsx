import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Users, Zap, Shield, ArrowRight } from 'lucide-react';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div>
      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <img src="/logos/bolao-logo.png" alt="Bolão Inteligentte" className="landing-logo" />
          <h1 className="landing-title">
            Seu <span className="green">Bolão</span> da Copa<br />
            do Mundo <span className="blue">2026</span>
          </h1>
          <p className="landing-subtitle">
            Crie seu próprio bolão, defina as regras, convide os amigos e acompanhe os placares ao vivo. 
            Tudo com pagamento seguro via PIX!
          </p>
          <div className="landing-ctas">
            {user ? (
              <>
                <Link to="/dashboard" className="btn btn-primary btn-lg">
                  <Trophy size={20} />
                  Meus Bolões
                </Link>
                <Link to="/create" className="btn btn-blue btn-lg">
                  <ArrowRight size={20} />
                  Criar Bolão
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">
                  Criar Minha Conta
                  <ArrowRight size={20} />
                </Link>
                <Link to="/login" className="btn btn-ghost btn-lg">
                  Já tenho conta
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-section">
        <h2 className="landing-section-title">Como Funciona</h2>
        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step-number stat-card-icon green">
              <Trophy size={28} />
            </div>
            <h3 className="landing-step-title">1. Crie seu Bolão</h3>
            <p className="landing-step-desc">
              Defina o nome, valor de entrada, regras de pontuação e premiação. 
              Você tem controle total!
            </p>
          </div>
          <div className="landing-step">
            <div className="landing-step-number stat-card-icon blue">
              <Users size={28} />
            </div>
            <h3 className="landing-step-title">2. Convide os Amigos</h3>
            <p className="landing-step-desc">
              Compartilhe o código ou link do bolão. Os amigos pagam via PIX e já podem apostar!
            </p>
          </div>
          <div className="landing-step">
            <div className="landing-step-number stat-card-icon gold">
              <Zap size={28} />
            </div>
            <h3 className="landing-step-title">3. Acompanhe ao Vivo</h3>
            <p className="landing-step-desc">
              Veja os placares em tempo real, acompanhe o ranking e torça pelos seus palpites!
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-section" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', margin: '0 auto', maxWidth: '1280px' }}>
        <h2 className="landing-section-title">Por que o Bolão Inteligentte?</h2>
        <div className="grid-2" style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div className="card">
            <div className="flex items-center gap-md mb-md">
              <Shield size={24} style={{ color: 'var(--green-400)' }} />
              <h3 style={{ fontWeight: 700 }}>Pagamento Seguro</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
              Integração com ASAAS para pagamento via PIX com confirmação automática.
            </p>
          </div>
          <div className="card">
            <div className="flex items-center gap-md mb-md">
              <Zap size={24} style={{ color: 'var(--blue-400)' }} />
              <h3 style={{ fontWeight: 700 }}>Placares ao Vivo</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
              Acompanhe os jogos em tempo real com atualização automática dos placares.
            </p>
          </div>
          <div className="card">
            <div className="flex items-center gap-md mb-md">
              <Trophy size={24} style={{ color: 'var(--gold-500)' }} />
              <h3 style={{ fontWeight: 700 }}>Regras Customizáveis</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
              Defina a pontuação para cada tipo de acerto e a distribuição dos prêmios.
            </p>
          </div>
          <div className="card">
            <div className="flex items-center gap-md mb-md">
              <Users size={24} style={{ color: 'var(--green-400)' }} />
              <h3 style={{ fontWeight: 700 }}>Convide por Link</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
              Compartilhe um código ou link único para seus amigos entrarem no bolão.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-section text-center">
        <h2 style={{ fontSize: 'var(--font-3xl)', fontWeight: 800, marginBottom: 'var(--space-lg)' }}>
          Pronto para começar?
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)', fontSize: 'var(--font-lg)' }}>
          A Copa do Mundo 2026 já começou! Crie seu bolão agora.
        </p>
        {!user && (
          <Link to="/register" className="btn btn-primary btn-lg">
            Criar Conta Grátis
            <ArrowRight size={20} />
          </Link>
        )}
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>⚡ Powered by <span>Inteligentte Lab</span></p>
      </footer>
    </div>
  );
}
