import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';

export default function CreatePool() {
  const navigate = useNavigate();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    entryFee: 50,
    maxParticipants: 100,
    isPublic: true,
    matchScope: 'ALL',
    exactScorePoints: 25,
    winnerGoalDiffPts: 18,
    winnerOnlyPoints: 10,
    drawNoExactPoints: 15,
    prizeFirst: 60,
    prizeSecond: 25,
    prizeThird: 15,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : 
                  e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked :
                  e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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

  const commission = form.entryFee * 0.1;
  const netPerPerson = form.entryFee - commission;

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">⚽ Criar Novo Bolão</h1>
        <p className="page-subtitle">Configure as regras e o valor do seu bolão</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card mb-lg">
          <h2 className="card-title mb-md">Informações Básicas</h2>

          <div className="form-group">
            <label className="form-label" htmlFor="pool-name">Nome do Bolão *</label>
            <input id="pool-name" name="name" type="text" className="form-input" placeholder="Ex: Bolão da Galera 2026" value={form.name} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="pool-desc">Descrição</label>
            <textarea id="pool-desc" name="description" className="form-input" placeholder="Descrição opcional do seu bolão..." value={form.description} onChange={handleChange} rows={2} style={{ resize: 'vertical' }} />
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

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="pool-scope">Escopo dos Jogos</label>
              <select id="pool-scope" name="matchScope" className="form-input" value={form.matchScope} onChange={handleChange}>
                <option value="ALL">Todos os jogos</option>
                <option value="GROUP_STAGE">Apenas fase de grupos</option>
                <option value="KNOCKOUT">Apenas mata-mata</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="pool-public">Visibilidade</label>
              <select id="pool-public" name="isPublic" className="form-input" value={form.isPublic ? 'true' : 'false'} onChange={(e) => setForm({ ...form, isPublic: e.target.value === 'true' })}>
                <option value="true">Público (qualquer um pode ver)</option>
                <option value="false">Privado (apenas por convite)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Advanced settings toggle */}
        <button type="button" className="btn btn-ghost w-full mb-lg" onClick={() => setShowAdvanced(!showAdvanced)}>
          {showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          Configurações Avançadas (Pontuação & Premiação)
        </button>

        {showAdvanced && (
          <>
            <div className="card mb-lg">
              <h2 className="card-title mb-md">🎯 Regras de Pontuação</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-lg)' }}>
                Defina quantos pontos cada tipo de acerto vale
              </p>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Placar Exato</label>
                  <input name="exactScorePoints" type="number" className="form-input" min="0" value={form.exactScorePoints} onChange={handleChange} />
                  <p className="form-helper">Ex: Brasil 2×1 e apostou 2×1</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Vencedor + Saldo de Gols</label>
                  <input name="winnerGoalDiffPts" type="number" className="form-input" min="0" value={form.winnerGoalDiffPts} onChange={handleChange} />
                  <p className="form-helper">Ex: Brasil 2×1 e apostou 3×2</p>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Acertou Empate</label>
                  <input name="drawNoExactPoints" type="number" className="form-input" min="0" value={form.drawNoExactPoints} onChange={handleChange} />
                  <p className="form-helper">Ex: 1×1 e apostou 0×0</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Só Acertou Vencedor</label>
                  <input name="winnerOnlyPoints" type="number" className="form-input" min="0" value={form.winnerOnlyPoints} onChange={handleChange} />
                  <p className="form-helper">Ex: Brasil 2×1 e apostou 1×0</p>
                </div>
              </div>
            </div>

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
          </>
        )}

        <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
          <Trophy size={20} />
          {loading ? 'Criando...' : 'Criar Bolão'}
        </button>
      </form>
    </div>
  );
}
