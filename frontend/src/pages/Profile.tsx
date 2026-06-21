import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { User, Save, Camera, AlertCircle, CheckCircle } from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ 
    name: user?.name || '', 
    phone: user?.phone || '', 
    cpf: user?.cpf || '',
    avatarUrl: user?.avatarUrl || ''
  });
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // limit 2MB
        setMessage({ type: 'error', text: 'A imagem deve ter no máximo 2MB' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatarPreview(base64String);
        setForm(prev => ({ ...prev, avatarUrl: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

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

      <div className="card mb-lg" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 88, height: 88, marginBottom: 'var(--space-md)' }}>
          <div className="nav-avatar" style={{ width: 88, height: 88, fontSize: 'var(--font-3xl)', overflow: 'hidden', border: '3px solid rgba(0, 200, 83, 0.2)' }}>
            {avatarPreview ? (
              <img src={avatarPreview} alt={user?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user?.name?.charAt(0).toUpperCase()
            )}
          </div>
          <label 
            htmlFor="avatar-upload" 
            style={{ 
              position: 'absolute', bottom: 0, right: 0, 
              background: 'var(--primary, #00C853)', color: 'white', 
              padding: '6px', borderRadius: '50%', cursor: 'pointer', 
              boxShadow: 'var(--shadow-sm)', display: 'flex', 
              alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--bg-surface, #121E33)',
              transition: 'transform 0.2s ease'
            }}
            className="hover-scale"
          >
            <Camera size={14} />
            <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </label>
        </div>
        <h2 style={{ fontWeight: 700, fontSize: 'var(--font-xl)' }}>{user?.name}</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{user?.email}</p>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="card">
        <h3 className="card-title mb-md">
          <User size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Dados Pessoais
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nome completo</label>
            <input type="text" className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
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
