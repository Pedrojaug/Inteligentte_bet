import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '', cpf: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (form.password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        cpf: form.cpf || undefined,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-in">
        <div className="auth-logo">
          <img src="/logos/bolao-logo.png" alt="Bolão Inteligentte" />
        </div>
        <h1 className="auth-title">Criar Conta</h1>
        <p className="auth-subtitle">Junte-se ao bolão da Copa do Mundo 2026!</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Nome completo *</label>
            <input id="reg-name" name="name" type="text" className="form-input" placeholder="Seu nome" value={form.name} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email *</label>
            <input id="reg-email" name="email" type="email" className="form-input" placeholder="seu@email.com" value={form.email} onChange={handleChange} required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="reg-phone">Telefone</label>
              <input id="reg-phone" name="phone" type="tel" className="form-input" placeholder="(11) 99999-9999" value={form.phone} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-cpf">CPF</label>
              <input id="reg-cpf" name="cpf" type="text" className="form-input" placeholder="000.000.000-00" value={form.cpf} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Senha *</label>
            <div style={{ position: 'relative' }}>
              <input id="reg-password" name="password" type={showPassword ? 'text' : 'password'} className="form-input" placeholder="Mínimo 6 caracteres" value={form.password} onChange={handleChange} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">Confirmar senha *</label>
            <input id="reg-confirm" name="confirmPassword" type="password" className="form-input" placeholder="Repita a senha" value={form.confirmPassword} onChange={handleChange} required />
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
            <UserPlus size={20} />
            {loading ? 'Criando conta...' : 'Criar Conta'}
          </button>
        </form>

        <div className="auth-footer">
          Já tem conta? <Link to="/login">Fazer login</Link>
        </div>
      </div>
    </div>
  );
}
