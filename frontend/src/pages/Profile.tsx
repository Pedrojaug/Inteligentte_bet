import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { User, Save } from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', cpf: user?.cpf || '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await api.put('/api/auth/profile', form);
      updateUser(res.data);
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erro ao atualizar perfil' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Meu Perfil</h1>
        <p className="page-subtitle">Gerencie suas informações pessoais</p>
      </div>

      <div className="card mb-lg" style={{ textAlign: 'center' }}>
        <div className="nav-avatar" style={{ width: 80, height: 80, fontSize: 'var(--font-3xl)', margin: '0 auto var(--space-lg)' }}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <h2 style={{ fontWeight: 700, fontSize: 'var(--font-xl)' }}>{user?.name}</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{user?.email}</p>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      <div className="card">
        <h3 className="card-title mb-md">
          <User size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Dados Pessoais
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nome completo</label>
            <input type="text" className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={user?.email || ''} disabled style={{ opacity: 0.5 }} />
            <p className="form-helper">O email não pode ser alterado</p>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input type="tel" className="form-input" placeholder="(11) 99999-9999" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">CPF</label>
              <input type="text" className="form-input" placeholder="000.000.000-00" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={saving}>
            <Save size={18} />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </div>
    </div>
  );
}
