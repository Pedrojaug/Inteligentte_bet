import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { PlusCircle, Users, Trophy, Search, Zap } from 'lucide-react';

interface Pool {
  id: string;
  name: string;
  description?: string;
  code: string;
  entryFee: number;
  status: string;
  isPublic: boolean;
  maxParticipants: number;
  creator: { id: string; name: string };
  _count: { members: number };
  myRole?: string;
  myPaymentStatus?: string;
  myPoints?: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [myPools, setMyPools] = useState<Pool[]>([]);
  const [publicPools, setPublicPools] = useState<Pool[]>([]);
  const [search, setSearch] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [activeTab, setActiveTab] = useState<'my' | 'explore'>('my');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [myRes, publicRes] = await Promise.all([
        api.get('/api/pools/my'),
        api.get('/api/pools'),
      ]);
      setMyPools(myRes.data);
      setPublicPools(publicRes.data);
    } catch (err) {
      console.error('Error loading pools:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPublic = publicPools.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h1 className="page-title">Olá, {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="page-subtitle">Gerencie seus bolões e acompanhe a Copa do Mundo 2026</p>
        </div>
        <div className="flex gap-md">
          <Link to="/create" className="btn btn-primary">
            <PlusCircle size={18} />
            Criar Bolão
          </Link>
          <Link to="/live" className="btn btn-secondary">
            <Zap size={18} />
            Ao Vivo
          </Link>
        </div>
      </div>

      {/* Join by code */}
      <div className="card mb-lg" style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Entrar com código:</span>
        <input
          type="text"
          className="form-input"
          placeholder="Ex: ABC123"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          style={{ maxWidth: '160px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}
        />
        <Link
          to={joinCode ? `/join/${joinCode}` : '#'}
          className="btn btn-blue btn-sm"
          onClick={(e) => { if (!joinCode) e.preventDefault(); }}
        >
          Entrar
        </Link>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'my' ? 'active' : ''}`} onClick={() => setActiveTab('my')}>
          <Trophy size={16} style={{ marginRight: 4 }} />
          Meus Bolões ({myPools.length})
        </button>
        <button className={`tab ${activeTab === 'explore' ? 'active' : ''}`} onClick={() => setActiveTab('explore')}>
          <Search size={16} style={{ marginRight: 4 }} />
          Explorar Bolões
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : activeTab === 'my' ? (
        myPools.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚽</div>
            <h3 className="empty-state-title">Nenhum bolão ainda</h3>
            <p>Crie seu primeiro bolão ou entre em um com um código de convite!</p>
            <Link to="/create" className="btn btn-primary mt-lg">
              <PlusCircle size={18} />
              Criar Meu Primeiro Bolão
            </Link>
          </div>
        ) : (
          <div className="grid-2">
            {myPools.map((pool) => (
              <Link to={`/pool/${pool.id}`} key={pool.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="pool-card">
                  <div className="pool-card-header">
                    <h3 className="pool-card-name">{pool.name}</h3>
                    <span className={`badge badge-${pool.status.toLowerCase()}`}>{pool.status === 'OPEN' ? 'Aberto' : pool.status === 'ACTIVE' ? 'Ativo' : pool.status}</span>
                  </div>
                  {pool.description && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-md)' }}>{pool.description}</p>
                  )}
                  <div className="pool-card-meta">
                    <div className="pool-card-stat">
                      <span className="pool-card-stat-label">Entrada</span>
                      <span className="pool-card-stat-value">{formatCurrency(pool.entryFee)}</span>
                    </div>
                    <div className="pool-card-stat">
                      <span className="pool-card-stat-label">Participantes</span>
                      <span className="pool-card-stat-value">{pool._count.members}/{pool.maxParticipants}</span>
                    </div>
                    {pool.myPoints !== undefined && (
                      <div className="pool-card-stat">
                        <span className="pool-card-stat-label">Meus Pontos</span>
                        <span className="pool-card-stat-value">{pool.myPoints} pts</span>
                      </div>
                    )}
                  </div>
                  <div className="pool-card-footer">
                    <div className="pool-card-creator">
                      <Users size={14} />
                      {pool.creator.name}
                    </div>
                    {pool.myPaymentStatus && (
                      <span className={`badge badge-${pool.myPaymentStatus.toLowerCase()}`}>
                        {pool.myPaymentStatus === 'CONFIRMED' ? '✓ Pago' : 'Pagamento pendente'}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : (
        <div>
          <div className="form-group">
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Buscar bolões públicos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>
          {filteredPublic.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h3 className="empty-state-title">Nenhum bolão encontrado</h3>
              <p>Tente uma busca diferente ou crie o seu próprio!</p>
            </div>
          ) : (
            <div className="grid-2">
              {filteredPublic.map((pool) => (
                <Link to={`/join/${pool.code}`} key={pool.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="pool-card">
                    <div className="pool-card-header">
                      <h3 className="pool-card-name">{pool.name}</h3>
                      <span className="badge badge-open">Aberto</span>
                    </div>
                    <div className="pool-card-meta">
                      <div className="pool-card-stat">
                        <span className="pool-card-stat-label">Entrada</span>
                        <span className="pool-card-stat-value">{formatCurrency(pool.entryFee)}</span>
                      </div>
                      <div className="pool-card-stat">
                        <span className="pool-card-stat-label">Vagas</span>
                        <span className="pool-card-stat-value">{pool._count.members}/{pool.maxParticipants}</span>
                      </div>
                    </div>
                    <div className="pool-card-footer">
                      <div className="pool-card-creator">
                        <Users size={14} /> {pool.creator.name}
                      </div>
                      <span className="btn btn-primary btn-sm">Participar</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
