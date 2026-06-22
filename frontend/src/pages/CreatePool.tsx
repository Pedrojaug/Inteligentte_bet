import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag?: string;
  awayFlag?: string;
  matchDate: string;
  round?: string;
  group?: string;
  status: string;
}

export default function CreatePool() {
  const navigate = useNavigate();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    entryFee: 50,
    maxParticipants: 100,
    isPublic: true,
    matchId: '',
    prizeFirst: 60,
    prizeSecond: 25,
    prizeThird: 15,
  });

  useEffect(() => {
    api.get('/api/matches?status=SCHEDULED').then((res) => {
      const sorted = [...res.data].sort(
        (a: Match, b: Match) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
      );
      setMatches(sorted);
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value =
      e.target.type === 'number' ? parseFloat(e.target.value) || 0 :
      e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked :
      e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.matchId) {
      setError('Selecione um jogo para o bolão');
      return;
    }

    if (form.prizeFirst + form.prizeSecond + form.prizeThird !== 100) {
      setError('As porcentagens de premiação devem somar 100%');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/pools', form);
      navigate(`/pool/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar bolão');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const commission = form.entryFee * 0.1;
  const netPerPerson = form.entryFee - commission;
  const selectedMatch = matches.find((m) => m.id === form.matchId);

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">⚽ Criar Novo Bolão</h1>
        <p className="page-subtitle">Escolha um jogo e configure as regras do seu bolão</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Seleção do jogo */}
        <div className="card mb-lg">
          <h2 className="card-title mb-md">🎯 Jogo do Bolão</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-md)' }}>
            Todos os participantes apostam no placar deste jogo
          </p>

          <div className="form-group">
            <label className="form-label" htmlFor="match-select">Selecione o Jogo *</label>
            <select
              id="match-select"
              name="matchId"
              className="form-input"
              value={form.matchId}
              onChange={handleChange}
              required
            >
              <option value="">-- Escolha um jogo agendado --</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.homeTeam} vs {m.awayTeam} — {formatDate(m.matchDate)} {m.round ? `(${m.round})` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedMatch && (
            <div className="match-card" style={{ marginTop: 'var(--space-md)' }}>
              <div className="match-teams">
                <div className="match-team">
                  {selectedMatch.homeFlag && <img src={selectedMatch.homeFlag} alt={selectedMatch.homeTeam} />}
                  <span className="match-team-name">{selectedMatch.homeTeam}</span>
                </div>
                <span className="match-vs">VS</span>
                <div className="match-team">
                  {selectedMatch.awayFlag && <img src={selectedMatch.awayFlag} alt={selectedMatch.awayTeam} />}
                  <span className="match-team-name">{selectedMatch.awayTeam}</span>
                </div>
              </div>
              <div style={{ textAlign: 'center', marginTop: 'var(--space-sm)', color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>
                {selectedMatch.round} • {formatDate(selectedMatch.matchDate)}
              </div>
            </div>
          )}
        </div>

        {/* Informações básicas */}
        <div className="card mb-lg">
          <h2 className="card-title mb-md">Informações Básicas</h2>

          <div className="form-group">
            <label className="form-label" htmlFor="pool-name">Nome do Bolão *</label>
            <input id="pool-name" name="name" type="text" className="form-input" placeholder="Ex: Bolão da Galera 2026" value={form.name} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="pool-desc">Descrição</label>
            <textarea id="pool-desc" name="description" className="form-input" placeholder="Descrição opcional..." value={form.description} onChange={handleChange} rows={2} style={{ resize: 'vertical' }} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="pool-fee">Valor de Entrada (R$) *</label>
              <input id="pool-fee" name="entryFee" type="number" className="form-input" min="1" step="0.01" value={form.entryFee} onChange={handleChange} required />
              <p className="form-helper">
                Comissão da casa: R$ {commission.toFixed(2)} (10%) — Líquido por pessoa: R$ {netPerPerson.toFixed(2)}
              </p>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="pool-max">Máx. Participantes</label>
              <input id="pool-max" name="maxParticipants" type="number" className="form-input" min="2" value={form.maxParticipants} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="pool-public">Visibilidade</label>
            <select id="pool-public" name="isPublic" className="form-input" value={form.isPublic ? 'true' : 'false'} onChange={(e) => setForm({ ...form, isPublic: e.target.value === 'true' })}>
              <option value="true">Público (qualquer um pode ver)</option>
              <option value="false">Privado (apenas por convite)</option>
            </select>
          </div>
        </div>

        {/* Premiação avançada */}
        <button type="button" className="btn btn-ghost w-full mb-lg" onClick={() => setShowAdvanced(!showAdvanced)}>
          {showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          Configurações de Premiação
        </button>

        {showAdvanced && (
          <div className="card mb-lg">
            <h2 className="card-title mb-md">🏆 Distribuição da Premiação</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-lg)' }}>
              Porcentagem do prêmio líquido (após 10% da casa). Deve somar 100%.
            </p>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">🥇 1º Lugar (%)</label>
                <input name="prizeFirst" type="number" className="form-input" min="0" max="100" value={form.prizeFirst} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">🥈 2º Lugar (%)</label>
                <input name="prizeSecond" type="number" className="form-input" min="0" max="100" value={form.prizeSecond} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">🥉 3º Lugar (%)</label>
                <input name="prizeThird" type="number" className="form-input" min="0" max="100" value={form.prizeThird} onChange={handleChange} />
              </div>
            </div>
            {form.prizeFirst + form.prizeSecond + form.prizeThird !== 100 && (
              <div className="alert alert-warning">
                Soma atual: {form.prizeFirst + form.prizeSecond + form.prizeThird}% — deve ser 100%
              </div>
            )}
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
          <Trophy size={20} />
          {loading ? 'Criando...' : 'Criar Bolão'}
        </button>
      </form>
    </div>
  );
}
