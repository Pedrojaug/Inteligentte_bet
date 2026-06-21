import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Users, Trophy, Copy, Check, Share2, ArrowRight, Zap } from 'lucide-react';

interface Pool {
  id: string;
  name: string;
  description?: string;
  code: string;
  entryFee: number;
  maxParticipants: number;
  status: string;
  isPublic: boolean;
  exactScorePoints: number;
  winnerGoalDiffPts: number;
  winnerOnlyPoints: number;
  drawNoExactPoints: number;
  prizeFirst: number;
  prizeSecond: number;
  prizeThird: number;
  creator: { id: string; name: string };
  members: Array<{
    id: string;
    userId: string;
    role: string;
    totalPoints: number;
    paymentStatus: string;
    user: { id: string; name: string; avatarUrl?: string };
  }>;
  _count: { members: number };
  isMember: boolean;
  myRole?: string;
  myPaymentStatus?: string;
  myPoints?: number;
}

export default function PoolView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'ranking' | 'members' | 'rules'>('ranking');
  const [prizes, setPrizes] = useState<any>(null);

  useEffect(() => {
    loadPool();
  }, [id]);

  const loadPool = async () => {
    try {
      const [poolRes, prizesRes] = await Promise.all([
        api.get(`/api/pools/${id}`),
        api.get(`/api/rankings/pool/${id}/prizes`).catch(() => null),
      ]);
      setPool(poolRes.data);
      if (prizesRes) setPrizes(prizesRes.data);
    } catch (err) {
      console.error('Error loading pool:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (pool) {
      navigator.clipboard.writeText(pool.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sharePool = () => {
    if (pool) {
      const url = `${window.location.origin}/join/${pool.code}`;
      if (navigator.share) {
        navigator.share({ title: pool.name, text: `Entre no meu bolão: ${pool.name}`, url });
      } else {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!pool) return <div className="empty-state"><h3 className="empty-state-title">Bolão não encontrado</h3></div>;

  const confirmedMembers = pool.members.filter(m => m.paymentStatus === 'CONFIRMED');
  const topMembers = [...confirmedMembers].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 10);

  return (
    <div>
      {/* Header */}
      <div className="card mb-lg" style={{ borderColor: 'rgba(0, 200, 83, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <div className="flex items-center gap-md mb-md">
              <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 800 }}>{pool.name}</h1>
              <span className={`badge badge-${pool.status.toLowerCase()}`}>
                {pool.status === 'OPEN' ? '🟢 Aberto' : pool.status === 'ACTIVE' ? '⚽ Ativo' : pool.status}
              </span>
            </div>
            {pool.description && <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>{pool.description}</p>}

            <div className="invite-code">
              <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>Código:</span>
              <span className="invite-code-text">{pool.code}</span>
              <button className="btn btn-sm btn-ghost" onClick={copyCode}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button className="btn btn-sm btn-blue" onClick={sharePool}>
                <Share2 size={16} />
                Compartilhar
              </button>
            </div>
          </div>

          <div className="flex gap-md">
            <Link to={`/pool/${pool.id}/matches`} className="btn btn-primary">
              <Trophy size={18} />
              Apostar
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4 mb-lg">
        <div className="stat-card">
          <div className="stat-card-icon green"><Users size={24} /></div>
          <div className="stat-card-value">{confirmedMembers.length}</div>
          <div className="stat-card-label">Participantes</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon blue"><Trophy size={24} /></div>
          <div className="stat-card-value">{formatCurrency(pool.entryFee)}</div>
          <div className="stat-card-label">Entrada</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon gold"><Zap size={24} /></div>
          <div className="stat-card-value">{prizes ? formatCurrency(prizes.prizePool) : '—'}</div>
          <div className="stat-card-label">Prêmio Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green"><ArrowRight size={24} /></div>
          <div className="stat-card-value">{pool.myPoints ?? 0}</div>
          <div className="stat-card-label">Meus Pontos</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'ranking' ? 'active' : ''}`} onClick={() => setActiveTab('ranking')}>
          🏆 Ranking
        </button>
        <button className={`tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
          👥 Membros ({pool._count.members})
        </button>
        <button className={`tab ${activeTab === 'rules' ? 'active' : ''}`} onClick={() => setActiveTab('rules')}>
          📋 Regras
        </button>
      </div>

      {/* Ranking Tab */}
      {activeTab === 'ranking' && (
        <div className="card">
          {topMembers.length === 0 ? (
            <div className="empty-state">
              <p>Nenhum ponto marcado ainda. Os pontos serão calculados após os jogos terminarem.</p>
            </div>
          ) : (
            <table className="ranking-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Jogador</th>
                  <th style={{ textAlign: 'right' }}>Pontos</th>
                </tr>
              </thead>
              <tbody>
                {topMembers.map((m, i) => (
                  <tr key={m.id} className={m.userId === user?.id ? 'current-user' : ''}>
                    <td>
                      <span className={`ranking-position ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </span>
                    </td>
                    <td>
                      <div className="ranking-user">
                        <div className="nav-avatar" style={{ width: 32, height: 32, fontSize: 'var(--font-xs)', overflow: 'hidden' }}>
                          {m.user.avatarUrl ? (
                            <img src={m.user.avatarUrl} alt={m.user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            m.user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        {m.user.name}
                        {m.userId === user?.id && <span style={{ fontSize: 'var(--font-xs)', color: 'var(--green-400)' }}>(você)</span>}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="ranking-points">{m.totalPoints}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {pool.members.map((m) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-sm) 0', borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex items-center gap-md">
                  <div className="nav-avatar" style={{ width: 36, height: 36, fontSize: 'var(--font-sm)', overflow: 'hidden' }}>
                    {m.user.avatarUrl ? (
                      <img src={m.user.avatarUrl} alt={m.user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      m.user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{m.user.name}</div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                      {m.role === 'CREATOR' ? '👑 Criador' : m.role === 'ADMIN' ? '⭐ Admin' : 'Membro'}
                    </div>
                  </div>
                </div>
                <span className={`badge badge-${m.paymentStatus.toLowerCase()}`}>
                  {m.paymentStatus === 'CONFIRMED' ? '✓ Pago' : '⏳ Pendente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="grid-2">
          <div className="card">
            <h3 className="card-title mb-md">🎯 Pontuação</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Placar exato</span><span className="font-bold text-green">{pool.exactScorePoints} pts</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Vencedor + saldo</span><span className="font-bold">{pool.winnerGoalDiffPts} pts</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Acertou empate</span><span className="font-bold">{pool.drawNoExactPoints} pts</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Só vencedor</span><span className="font-bold">{pool.winnerOnlyPoints} pts</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Errou</span><span className="font-bold" style={{ color: 'var(--error)' }}>0 pts</span></div>
            </div>
          </div>
          <div className="card">
            <h3 className="card-title mb-md">🏆 Premiação</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <div className="flex justify-between"><span>🥇 1º lugar</span><span className="font-bold text-gold">{pool.prizeFirst}%</span></div>
              <div className="flex justify-between"><span>🥈 2º lugar</span><span className="font-bold">{pool.prizeSecond}%</span></div>
              <div className="flex justify-between"><span>🥉 3º lugar</span><span className="font-bold">{pool.prizeThird}%</span></div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 'var(--space-sm) 0' }} />
              <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Comissão da casa</span><span style={{ color: 'var(--text-muted)' }}>10%</span></div>
              {prizes && (
                <>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 'var(--space-sm) 0' }} />
                  <div className="flex justify-between"><span>🥇 Valor 1º</span><span className="font-bold text-gold">{formatCurrency(prizes.prizes.first.amount)}</span></div>
                  <div className="flex justify-between"><span>🥈 Valor 2º</span><span className="font-bold">{formatCurrency(prizes.prizes.second.amount)}</span></div>
                  <div className="flex justify-between"><span>🥉 Valor 3º</span><span className="font-bold">{formatCurrency(prizes.prizes.third.amount)}</span></div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
