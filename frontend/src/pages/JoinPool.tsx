import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Users, Trophy, LogIn } from 'lucide-react';
import PixPayment from '../components/PixPayment';

interface Match {
  homeTeam: string;
  awayTeam: string;
  homeFlag?: string;
  awayFlag?: string;
  matchDate: string;
  round?: string;
}

interface Pool {
  id: string;
  name: string;
  description?: string;
  code: string;
  entryFee: number;
  maxParticipants: number;
  status: string;
  prizeFirst: number;
  prizeSecond: number;
  prizeThird: number;
  match: Match | null;
  creator: { id: string; name: string };
  _count: { members: number };
}

export default function JoinPool() {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [poolId, setPoolId] = useState<string | null>(null); // set after join → shows PixPayment

  useEffect(() => { loadPool(); }, [code]);

  const loadPool = async () => {
    try {
      const res = await api.get(`/api/pools/join/${code}`);
      setPool(res.data);
    } catch {
      setError('Bolão não encontrado');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      navigate(`/register?redirect=/join/${code}`);
      return;
    }

    setJoining(true);
    setError('');
    try {
      await api.post(`/api/pools/${pool!.id}/join`);
      setPoolId(pool!.id);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao entrar no bolão';
      if (msg === 'Você já participa deste bolão') {
        navigate(`/pool/${pool!.id}`);
      } else {
        setError(msg);
      }
    } finally {
      setJoining(false);
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  if (error && !pool) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❌</div>
        <h3 className="empty-state-title">{error}</h3>
        <p>Verifique se o código está correto e tente novamente.</p>
        <Link to="/dashboard" className="btn btn-primary mt-lg">Voltar ao Início</Link>
      </div>
    );
  }

  if (!pool) return null;

  // Após entrar, mostra tela de pagamento PIX
  if (poolId) {
    return (
      <div style={{ maxWidth: '520px', margin: '0 auto', paddingTop: 'var(--space-2xl)' }}>
        <div className="card animate-in">
          <h2 style={{ fontWeight: 800, fontSize: 'var(--font-2xl)', marginBottom: 'var(--space-sm)', textAlign: 'center' }}>
            🎉 Inscrição realizada!
          </h2>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
            Pague o PIX abaixo para confirmar sua participação e liberar sua aposta.
          </p>
          <PixPayment
            poolId={poolId}
            onConfirmed={() => navigate(`/pool/${poolId}/matches`)}
          />
          <div style={{ marginTop: 'var(--space-lg)', textAlign: 'center' }}>
            <Link to={`/pool/${poolId}`} style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>
              Pagar depois (acesse pelo bolão)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', paddingTop: 'var(--space-2xl)' }}>
      <div className="card card-highlight animate-in" style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 800, marginBottom: 'var(--space-sm)' }}>
            🏆 {pool.name}
          </h1>
          {pool.description && <p style={{ color: 'var(--text-secondary)' }}>{pool.description}</p>}
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)', marginTop: 'var(--space-sm)' }}>
            Criado por {pool.creator.name}
          </p>
        </div>

        {/* Jogo do bolão */}
        {pool.match && (
          <div className="match-card mb-lg" style={{ background: 'var(--bg-input)', textAlign: 'left' }}>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
              {pool.match.round} • {formatDate(pool.match.matchDate)}
            </p>
            <div className="match-teams">
              <div className="match-team">
                {pool.match.homeFlag && <img src={pool.match.homeFlag} alt={pool.match.homeTeam} />}
                <span className="match-team-name">{pool.match.homeTeam}</span>
              </div>
              <span className="match-vs">VS</span>
              <div className="match-team">
                {pool.match.awayFlag && <img src={pool.match.awayFlag} alt={pool.match.awayTeam} />}
                <span className="match-team-name">{pool.match.awayTeam}</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid-3 mb-lg">
          <div className="stat-card">
            <div className="stat-card-value" style={{ color: 'var(--green-400)' }}>{formatCurrency(pool.entryFee)}</div>
            <div className="stat-card-label">Entrada</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">{pool._count.members}</div>
            <div className="stat-card-label">Participantes</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">{pool.maxParticipants - pool._count.members}</div>
            <div className="stat-card-label">Vagas</div>
          </div>
        </div>

        <div className="card mb-lg" style={{ textAlign: 'left', background: 'var(--bg-input)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-md)' }}>🎯 Como funciona</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
            <span>Placar exato → <strong style={{ color: 'var(--primary)' }}>3 pontos</strong></span>
            <span>Saldo de gols e vencedor → <strong>2 pontos</strong></span>
            <span>Apenas vencedor → <strong>1 ponto</strong></span>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 'var(--space-md) 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)', fontSize: 'var(--font-sm)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>🥇 1º lugar</span>
            <span style={{ color: 'var(--text-secondary)' }}>🥈 2º lugar</span>
            <span style={{ color: 'var(--text-secondary)' }}>🥉 3º lugar</span>
            <strong style={{ color: 'var(--primary)' }}>{pool.prizeFirst}%</strong>
            <strong>{pool.prizeSecond}%</strong>
            <strong>{pool.prizeThird}%</strong>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <button
          className="btn btn-primary btn-lg btn-full"
          onClick={handleJoin}
          disabled={joining || pool.status !== 'OPEN'}
        >
          {!user ? (
            <><LogIn size={20} /> Criar Conta para Participar</>
          ) : joining ? (
            'Processando...'
          ) : pool.status !== 'OPEN' ? (
            'Bolão fechado para novos participantes'
          ) : (
            <><Trophy size={20} /> Participar — {formatCurrency(pool.entryFee)}</>
          )}
        </button>
      </div>
    </div>
  );
}
