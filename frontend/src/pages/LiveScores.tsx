import { useState, useEffect } from 'react';
import api from '../services/api';
import { Zap, RefreshCw } from 'lucide-react';

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

export default function LiveScores() {
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [todayMatches, setTodayMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadMatches();
    const interval = setInterval(loadMatches, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadMatches = async () => {
    try {
      const [liveRes, todayRes] = await Promise.all([
        api.get('/api/matches/live'),
        api.get('/api/matches/today'),
      ]);
      setLiveMatches(liveRes.data);
      setTodayMatches(todayRes.data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error loading live scores:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h1 className="page-title">
            <Zap size={32} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
            Placares ao Vivo
          </h1>
          <p className="page-subtitle">Copa do Mundo FIFA 2026 — Atualização automática a cada 30s</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
            Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={loadMatches}>
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Live matches */}
      {liveMatches.length > 0 && (
        <div className="mb-lg">
          <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <span className="badge badge-live">AO VIVO</span>
            {liveMatches.length} jogo{liveMatches.length > 1 ? 's' : ''} em andamento
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {liveMatches.map((match) => (
              <div key={match.id} className="match-card match-card-live" style={{ animation: 'pulse-live 3s ease-in-out infinite' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                  <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{match.round}</span>
                  <span className="badge badge-live">
                    {match.status === 'HALFTIME' ? 'INTERVALO' : match.status === 'EXTRA_TIME' ? 'PRORROGAÇÃO' : match.status === 'PENALTIES' ? 'PÊNALTIS' : 'AO VIVO'}
                  </span>
                </div>
                <div className="match-teams">
                  <div className="match-team">
                    {match.homeFlag && <img src={match.homeFlag} alt={match.homeTeam} style={{ width: '56px', height: '56px' }} />}
                    <span className="match-team-name" style={{ fontSize: 'var(--font-base)' }}>{match.homeTeam}</span>
                  </div>
                  <div className="match-score" style={{ fontSize: 'var(--font-4xl)' }}>
                    <span>{match.homeScore ?? 0}</span>
                    <span className="match-score-divider">×</span>
                    <span>{match.awayScore ?? 0}</span>
                  </div>
                  <div className="match-team">
                    {match.awayFlag && <img src={match.awayFlag} alt={match.awayTeam} style={{ width: '56px', height: '56px' }} />}
                    <span className="match-team-name" style={{ fontSize: 'var(--font-base)' }}>{match.awayTeam}</span>
                  </div>
                </div>
                {match.venue && (
                  <div className="match-info">
                    <span>📍 {match.venue}, {match.city}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's matches */}
      <div>
        <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>
          📅 Jogos de Hoje
        </h2>
        {todayMatches.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3 className="empty-state-title">Sem jogos hoje</h3>
            <p>Confira o calendário completo para ver os próximos jogos.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {todayMatches.map((match) => (
              <div key={match.id} className={`match-card ${match.status === 'LIVE' || match.status === 'HALFTIME' ? 'match-card-live' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                  <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{match.round} • {formatTime(match.matchDate)}</span>
                  <span className={`badge badge-${match.status === 'LIVE' || match.status === 'HALFTIME' ? 'live' : match.status.toLowerCase()}`}>
                    {match.status === 'LIVE' ? 'AO VIVO' : match.status === 'HALFTIME' ? 'INTERVALO' : match.status === 'FINISHED' ? 'ENCERRADO' : formatTime(match.matchDate)}
                  </span>
                </div>
                <div className="match-teams">
                  <div className="match-team">
                    {match.homeFlag && <img src={match.homeFlag} alt={match.homeTeam} />}
                    <span className="match-team-name">{match.homeTeam}</span>
                  </div>
                  {match.status === 'FINISHED' || match.status === 'LIVE' || match.status === 'HALFTIME' ? (
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
