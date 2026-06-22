import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Check } from 'lucide-react';

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag?: string;
  awayFlag?: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  matchDate: string;
  round?: string;
  venue?: string;
  city?: string;
}

interface Bet {
  id: string;
  userId: string;
  homeScore: number;
  awayScore: number;
  points: number;
  scored: boolean;
  user: { id: string; name: string; avatarUrl?: string };
}

interface Pool {
  id: string;
  name: string;
  match: Match | null;
  myPaymentStatus?: string;
}

export default function PoolMatches() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [pool, setPool] = useState<Pool | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [myBet, setMyBet] = useState<Bet | null>(null);
  const [input, setInput] = useState({ home: '', away: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [poolRes, betsRes] = await Promise.all([
        api.get(`/api/pools/${id}`),
        api.get(`/api/bets/pool/${id}`),
      ]);
      const poolData: Pool = poolRes.data;
      setPool(poolData);

      const allBets: Bet[] = betsRes.data;
      setBets(allBets);

      const mine = allBets.find((b) => b.userId === user?.id) ?? null;
      setMyBet(mine);
      if (mine) setInput({ home: String(mine.homeScore), away: String(mine.awayScore) });
    } catch {
      // handled by loading state
    } finally {
      setLoading(false);
    }
  };

  const submitBet = async () => {
    if (input.home === '' || input.away === '') return;
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await api.post('/api/bets', {
        poolId: id,
        homeScore: parseInt(input.home),
        awayScore: parseInt(input.away),
      });
      setMessage({ type: 'success', text: 'Aposta salva!' });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erro ao salvar aposta' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!pool?.match) return (
    <div className="empty-state">
      <div className="empty-state-icon">⚽</div>
      <h3 className="empty-state-title">Jogo não configurado</h3>
      <p>Este bolão ainda não tem um jogo vinculado.</p>
    </div>
  );

  const match = pool.match;
  const canBet = match.status === 'SCHEDULED' && pool.myPaymentStatus === 'CONFIRMED';
  const matchStarted = match.status !== 'SCHEDULED';
  const isFinished = match.status === 'FINISHED';

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">⚽ {pool.name}</h1>
        <p className="page-subtitle">Faça seu palpite no placar do jogo</p>
      </div>

      {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {/* Jogo */}
      <div className={`match-card mb-lg ${matchStarted && !isFinished ? 'match-card-live' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
          <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
            {match.round} • {formatDate(match.matchDate)}
            {match.venue ? ` • ${match.venue}` : ''}
          </span>
          <span className={`badge badge-${match.status === 'LIVE' || match.status === 'HALFTIME' ? 'live' : match.status.toLowerCase()}`}>
            {match.status === 'LIVE' ? 'AO VIVO' : match.status === 'HALFTIME' ? 'INTERVALO' : match.status === 'FINISHED' ? 'ENCERRADO' : 'AGENDADO'}
          </span>
        </div>

        <div className="match-teams" style={{ fontSize: 'var(--font-xl)' }}>
          <div className="match-team">
            {match.homeFlag && <img src={match.homeFlag} alt={match.homeTeam} style={{ width: '56px', height: '56px' }} />}
            <span className="match-team-name">{match.homeTeam}</span>
          </div>

          {matchStarted ? (
            <div className="match-score" style={{ fontSize: 'var(--font-4xl)' }}>
              <span>{match.homeScore ?? 0}</span>
              <span className="match-score-divider">×</span>
              <span>{match.awayScore ?? 0}</span>
            </div>
          ) : (
            <span className="match-vs">VS</span>
          )}

          <div className="match-team">
            {match.awayFlag && <img src={match.awayFlag} alt={match.awayTeam} style={{ width: '56px', height: '56px' }} />}
            <span className="match-team-name">{match.awayTeam}</span>
          </div>
        </div>

        {/* Seção de aposta do usuário */}
        <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border-color)' }}>
          {canBet ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>Seu palpite:</span>
              <div className="bet-input-group">
                <input
                  type="number" className="bet-score-input" min="0" max="20"
                  value={input.home}
                  onChange={(e) => setInput((p) => ({ ...p, home: e.target.value }))}
                  placeholder="0"
                />
                <span className="bet-x">×</span>
                <input
                  type="number" className="bet-score-input" min="0" max="20"
                  value={input.away}
                  onChange={(e) => setInput((p) => ({ ...p, away: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={submitBet}
                disabled={saving || input.home === '' || input.away === ''}
              >
                <Check size={16} />
                {saving ? 'Salvando...' : myBet ? 'Atualizar' : 'Apostar'}
              </button>
            </div>
          ) : pool.myPaymentStatus !== 'CONFIRMED' ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>
              ⏳ Pagamento pendente — confirme o pagamento para apostar
            </p>
          ) : matchStarted && myBet ? (
            <div style={{ textAlign: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>Seu palpite: </span>
              <strong style={{ fontSize: 'var(--font-xl)' }}>{myBet.homeScore} × {myBet.awayScore}</strong>
              {myBet.scored && (
                <span className={`badge ms-sm ${myBet.points > 0 ? 'badge-confirmed' : 'badge-finished'}`} style={{ marginLeft: '8px' }}>
                  {myBet.points === 3 ? '🎯 Placar exato!' : myBet.points === 2 ? '✅ Saldo certo' : myBet.points === 1 ? '👍 Vencedor certo' : '❌ 0 pts'}
                </span>
              )}
            </div>
          ) : matchStarted ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>
              Você não apostou neste jogo
            </p>
          ) : null}
        </div>
      </div>

      {/* Palpites de todos os participantes */}
      <div className="card">
        <h2 className="card-title mb-md">
          {matchStarted ? '🏆 Palpites de todos' : `🔒 ${bets.length} palpite${bets.length !== 1 ? 's' : ''} registrado${bets.length !== 1 ? 's' : ''}`}
        </h2>

        {bets.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-xl) 0' }}>
            <p style={{ color: 'var(--text-muted)' }}>Nenhum palpite ainda. Seja o primeiro!</p>
          </div>
        ) : matchStarted ? (
          // Jogo iniciado: mostra todos os palpites com resultado
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {[...bets]
              .sort((a, b) => b.points - a.points)
              .map((bet, i) => (
                <div key={bet.id} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                  padding: 'var(--space-md)', borderRadius: 'var(--radius-md)',
                  background: bet.userId === user?.id ? 'rgba(0,200,83,0.08)' : 'var(--surface-2)',
                  border: bet.userId === user?.id ? '1px solid rgba(0,200,83,0.2)' : '1px solid var(--border-color)',
                }}>
                  <span style={{ fontWeight: 700, width: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                  </span>
                  {bet.user.avatarUrl ? (
                    <img src={bet.user.avatarUrl} alt={bet.user.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--font-sm)', color: '#fff' }}>
                      {bet.user.name[0].toUpperCase()}
                    </div>
                  )}
                  <span style={{ flex: 1, fontWeight: bet.userId === user?.id ? 700 : 400 }}>
                    {bet.user.name} {bet.userId === user?.id ? '(você)' : ''}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 'var(--font-lg)' }}>
                    {bet.homeScore} × {bet.awayScore}
                  </span>
                  {bet.scored && (
                    <span className={`badge ${bet.points === 3 ? 'badge-live' : bet.points > 0 ? 'badge-confirmed' : 'badge-finished'}`}>
                      {bet.points === 3 ? '🎯 Exato' : bet.points === 2 ? '+2' : bet.points === 1 ? '+1' : '0'}
                    </span>
                  )}
                </div>
              ))}
          </div>
        ) : (
          // Jogo não iniciado: mostra apenas contagem e palpite do usuário
          <div style={{ textAlign: 'center', padding: 'var(--space-lg) 0' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
              Os palpites dos outros participantes ficam ocultos até o jogo começar.
            </p>
            {myBet && (
              <div style={{ marginTop: 'var(--space-md)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>Seu palpite registrado: </span>
                <strong style={{ fontSize: 'var(--font-xl)' }}>{myBet.homeScore} × {myBet.awayScore}</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
