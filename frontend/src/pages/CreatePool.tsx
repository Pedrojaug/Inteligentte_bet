import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Trophy, ChevronDown, ChevronUp, Search } from 'lucide-react';

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
  const [matchSearch, setMatchSearch] = useState('');
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

  const filteredMatches = useMemo(() => {
    const q = matchSearch.toLowerCase();
    if (!q) return matches;
    return matches.filter(
      (m) =>
        m.homeTeam.toLowerCase().includes(q) ||
        m.awayTeam.toLowerCase().includes(q) ||
        (m.round || '').toLowerCase().includes(q)
    );
  }, [matches, matchSearch]);

  // Agrupa por data (dia)
  const matchesByDate = useMemo(() => {
    const groups: Record<string, Match[]> = {};
    for (const m of filteredMatches) {
      const day = new Date(m.matchDate).toLocaleDateString('pt-BR', {
        weekday: 'long', day: '2-digit', month: '2-digit',
      });
      if (!groups[day]) groups[day] = [];
      groups[day].push(m);
    }
    return groups;
  }, [filteredMatches]);

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
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-lg)' }}>
            Todos os participantes apostam no placar deste jogo
          </p>

          {/* Busca */}
          <div style={{ position: 'relative', marginBottom: 'var(--space-lg)' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Buscar por seleção ou fase..."
              value={matchSearch}
              onChange={(e) => setMatchSearch(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>

          {/* Cards por data */}
          <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', paddingRight: '4px' }}>
            {Object.keys(matchesByDate).length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-lg)' }}>
                Nenhum jogo encontrado
              </p>
            )}
            {Object.entries(matchesByDate).map(([day, dayMatches]) => (
              <div key={day}>
                <p style={{ fontSize: 'var(--font-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
                  {day}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {dayMatches.map((m) => {
                    const selected = form.matchId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, matchId: m.id }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                          padding: 'var(--space-md)',
                          borderRadius: 'var(--radius-md)',
                          border: selected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                          background: selected ? 'rgba(0,200,83,0.08)' : 'var(--surface-2)',
                          cursor: 'pointer', textAlign: 'left', width: '100%',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {/* Bandeiras e times */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                            {m.homeFlag
                              ? <img src={m.homeFlag} alt={m.homeTeam} style={{ width: '28px', height: '20px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }} />
                              : <span style={{ fontSize: '20px' }}>🏳️</span>
                            }
                            <span style={{ fontWeight: 700, fontSize: 'var(--font-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.homeTeam}</span>
                          </div>
                          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)', flexShrink: 0 }}>vs</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                            {m.awayFlag
                              ? <img src={m.awayFlag} alt={m.awayTeam} style={{ width: '28px', height: '20px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }} />
                              : <span style={{ fontSize: '20px' }}>🏳️</span>
                            }
                            <span style={{ fontWeight: 700, fontSize: 'var(--font-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.awayTeam}</span>
                          </div>
                        </div>
                        {/* Horário */}
                        <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                          {new Date(m.matchDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {/* Selecionado */}
                        {selected && (
                          <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {!form.matchId && (
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--error)', marginTop: 'var(--space-sm)' }}>
              * Selecione um jogo para continuar
            </p>
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
