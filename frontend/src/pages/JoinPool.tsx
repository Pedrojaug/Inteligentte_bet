import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Users, Trophy, ArrowRight, LogIn } from 'lucide-react';

interface Pool {
  id: string;
  name: string;
  description?: string;
  code: string;
  entryFee: number;
  maxParticipants: number;
  status: string;
  exactScorePoints: number;
  winnerGoalDiffPts: number;
  winnerOnlyPoints: number;
  drawNoExactPoints: number;
  prizeFirst: number;
  prizeSecond: number;
  prizeThird: number;
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
  const [paymentData, setPaymentData] = useState<any>(null);

  useEffect(() => {
    loadPool();
  }, [code]);

  const loadPool = async () => {
    try {
      const res = await api.get(`/api/pools/join/${code}`);
      setPool(res.data);
    } catch (err) {
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
      // Join the pool
      await api.post(`/api/pools/${pool!.id}/join`);
      
      // Generate payment
      const paymentRes = await api.post(`/api/payments/pool/${pool!.id}`);
      setPaymentData(paymentRes.data.payment);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erro ao entrar no bolão';
      if (errorMsg === 'Você já participa deste bolão') {
        navigate(`/pool/${pool!.id}`);
      } else {
        setError(errorMsg);
      }
    } finally {
      setJoining(false);
    }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

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

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: 'var(--space-2xl)' }}>
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

        {/* Rules summary */}
        <div className="card mb-lg" style={{ textAlign: 'left', background: 'var(--bg-input)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-md)' }}>📋 Regras de Pontuação</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', fontSize: 'var(--font-sm)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Placar exato:</span><span className="font-bold text-green">{pool.exactScorePoints} pts</span>
            <span style={{ color: 'var(--text-secondary)' }}>Vencedor + saldo:</span><span className="font-bold">{pool.winnerGoalDiffPts} pts</span>
            <span style={{ color: 'var(--text-secondary)' }}>Acertou empate:</span><span className="font-bold">{pool.drawNoExactPoints} pts</span>
            <span style={{ color: 'var(--text-secondary)' }}>Só vencedor:</span><span className="font-bold">{pool.winnerOnlyPoints} pts</span>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 'var(--space-md) 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', fontSize: 'var(--font-sm)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>🥇 1º lugar:</span><span className="font-bold text-gold">{pool.prizeFirst}%</span>
            <span style={{ color: 'var(--text-secondary)' }}>🥈 2º lugar:</span><span className="font-bold">{pool.prizeSecond}%</span>
            <span style={{ color: 'var(--text-secondary)' }}>🥉 3º lugar:</span><span className="font-bold">{pool.prizeThird}%</span>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {paymentData ? (
          <div className="card" style={{ background: 'var(--bg-input)' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-md)', color: 'var(--green-400)' }}>✅ Inscrição realizada!</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
              Realize o pagamento de {formatCurrency(pool.entryFee)} via PIX para confirmar sua participação.
            </p>
            {paymentData.pixQrCode && (
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <img 
                  src={`data:image/png;base64,${paymentData.pixQrCode}`} 
                  alt="QR Code PIX" 
                  style={{ width: '220px', height: '220px', margin: '0 auto', display: 'block', borderRadius: 'var(--radius-md)' }}
                />
              </div>
            )}
            {paymentData.pixCopyPaste && (
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>PIX Copia e Cola:</p>
                <div className="invite-code" style={{ wordBreak: 'break-all', fontSize: 'var(--font-xs)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{paymentData.pixCopyPaste}</span>
                </div>
              </div>
            )}
            {paymentData.invoiceUrl && (
              <a href={paymentData.invoiceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-blue btn-full mb-md">
                Abrir Fatura Completa
              </a>
            )}
            <Link to={`/pool/${pool.id}`} className="btn btn-primary btn-full">
              <ArrowRight size={18} />
              Ir para o Bolão
            </Link>
          </div>
        ) : (
          <button className="btn btn-primary btn-lg btn-full" onClick={handleJoin} disabled={joining || pool.status !== 'OPEN'}>
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
        )}
      </div>
    </div>
  );
}
