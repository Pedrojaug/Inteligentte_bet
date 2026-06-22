import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { Check, X } from 'lucide-react';

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
  group?: string;
  round?: string;
  stage: string;
  venue?: string;
}

interface Bet {
  id: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  points: number;
  scored: boolean;
}

export default function PoolMatches() {
  const { id } = useParams<{ id: string }>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [myBets, setMyBets] = useState<Record<string, Bet>>({});
  const [loading, setLoading] = useState(true);
  const [betInputs, setBetInputs] = useState<Record<string, { home: string; away: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filterStage, setFilterStage] = useState('ALL');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [matchesRes, betsRes] = await Promise.all([
        api.get('/api/matches'),
        api.get(`/api/bets/pool/${id}`),
      ]);
      setMatches(matchesRes.data);
      
      const betsMap: Record<string, Bet> = {};
      betsRes.data.forEach((bet: Bet & { match: Match }) => {
        betsMap[bet.matchId] = bet;
      });
      setMyBets(betsMap);

      // Pre-fill bet inputs with existing bets
      const inputs: Record<string, { home: string; away: string }> = {};
      Object.entries(betsMap).forEach(([matchId, bet]) => {
        inputs[matchId] = { home: String(bet.homeScore), away: String(bet.awayScore) };
      });
      setBetInputs(inputs);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBetChange = (matchId: string, team: 'home' | 'away', value: string) => {
    setBetInputs((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [team]: value },
    }));
  };

  const submitBet = async (matchId: string) => {
    const input = betInputs[matchId];
    if (!input || input.home === '' || input.away === '') return;

    setSaving(matchId);
    setMessage({ type: '', text: '' });

    try {
      await api.post('/api/bets', {
        poolId: id,
        matchId,
        homeScore: parseInt(input.home),
        awayScore: parseInt(input.away),
      });
      setMessage({ type: 'success', text: 'Aposta salva!' });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erro ao salvar aposta' });
    } finally {
      setSaving(null);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const LIVE_STATUSES = ['LIVE', 'HALFTIME', 'EXTRA_TIME', 'PENALTIES'];

  function matchPriority(m: Match): number {
    if (m.status === 'SCHEDULED') return 0;
    if (LIVE_STATUSES.includes(m.status)) return 1;
    return 2; // FINISHED, CANCELLED, etc.
  }

  const filteredMatches = matches
    .filter((m) => {
      if (filterStage === 'ALL') return true;
      return m.stage === filterStage;
    })
    .sort((a, b) => {
      const pa = matchPriority(a);
      const pb = matchPriority(b);
      if (pa !== pb) return pa - pb;
      // Within SCHEDULED: closest to now first
      // Within LIVE: earliest start first
      // Within FINISHED: most recent first
      const dir = a.status === 'FINISHED' ? -1 : 1;
      return dir * (new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
    });

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">⚽ Jogos & Apostas</h1>
        <p className="page-subtitle">Selecione o placar para cada jogo</p>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      {/* Filters */}
      <div className="tabs">
        {['ALL', 'GROUP', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL'].map((stage) => (
          <button key={stage} className={`tab ${filterStage === stage ? 'active' : ''}`} onClick={() => setFilterStage(stage)}>
            {stage === 'ALL' ? 'Todos' : stage === 'GROUP' ? 'Grupos' : stage === 'ROUND_OF_32' ? '32 avos' : stage === 'ROUND_OF_16' ? 'Oitavas' : stage === 'QUARTER_FINAL' ? 'Quartas' : stage === 'SEMI_FINAL' ? 'Semifinal' : 'Final'}
          </button>
        ))}
      </div>

      {filteredMatches.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚽</div>
          <h3 className="empty-state-title">Nenhum jogo encontrado</h3>
          <p>Os jogos serão carregados automaticamente quando sincronizados.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {filteredMatches.map((match) => {
            const bet = myBets[match.id];
            const input = betInputs[match.id] || { home: '', away: '' };
            const canBet = match.status === 'SCHEDULED';
            const isFinished = match.status === 'FINISHED';

            return (
              <div key={match.id} className={`match-card ${match.status === 'LIVE' || match.status === 'HALFTIME' ? 'match-card-live' : ''}`}>
                {/* Match info bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                  <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                    {match.round || match.group} • {formatDate(match.matchDate)}
                  </span>
                  <span className={`badge badge-${match.status === 'LIVE' || match.status === 'HALFTIME' ? 'live' : match.status.toLowerCase()}`}>
                    {match.status === 'LIVE' ? 'AO VIVO' : match.status === 'HALFTIME' ? 'INTERVALO' : match.status === 'FINISHED' ? 'ENCERRADO' : match.status === 'SCHEDULED' ? 'AGENDADO' : match.status}
                  </span>
                </div>

                {/* Teams & Score */}
                <div className="match-teams">
                  <div className="match-team">
                    {match.homeFlag && <img src={match.homeFlag} alt={match.homeTeam} />}
                    <span className="match-team-name">{match.homeTeam}</span>
                  </div>

                  {isFinished || match.status === 'LIVE' || match.status === 'HALFTIME' ? (
                    <div className="match-score">
                      <span>{match.homeScore}</span>
                      <span className="match-score-divider">×</span>
                      <span>{match.awayScore}</span>
                    </div>
                  ) : (
                    <span className="match-vs">VS</span>
                  )}

                  <div className="match-team">
                    {match.awayFlag && <img src={match.awayFlag} alt={match.awayTeam} />}
                    <span className="match-team-name">{match.awayTeam}</span>
                  </div>
                </div>

                {/* Bet section */}
                <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-color)' }}>
                  {canBet ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>Seu palpite:</span>
                      <div className="bet-input-group">
                        <input
                          type="number"
                          className="bet-score-input"
                          min="0"
                          max="20"
                          value={input.home}
                          onChange={(e) => handleBetChange(match.id, 'home', e.target.value)}
                          placeholder="0"
                        />
                        <span className="bet-x">×</span>
                        <input
                          type="number"
                          className="bet-score-input"
                          min="0"
                          max="20"
                          value={input.away}
                          onChange={(e) => handleBetChange(match.id, 'away', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => submitBet(match.id)}
                        disabled={saving === match.id || input.home === '' || input.away === ''}
                      >
                        <Check size={16} />
                        {saving === match.id ? 'Salvando...' : bet ? 'Atualizar' : 'Apostar'}
                      </button>
                    </div>
                  ) : bet ? (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-md)' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>Seu palpite:</span>
                        <span style={{ fontWeight: 800, fontSize: 'var(--font-xl)' }}>{bet.homeScore} × {bet.awayScore}</span>
                        {bet.scored && (
                          <span className={`badge ${bet.points > 0 ? 'badge-confirmed' : 'badge-finished'}`}>
                            {bet.points > 0 ? `+${bet.points} pts` : '0 pts'}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>
                      {isFinished ? 'Você não apostou neste jogo' : 'Jogo em andamento — apostas encerradas'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
