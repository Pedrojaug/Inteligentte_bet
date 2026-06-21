import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Key, Mail, ArrowLeft, UserCheck, AlertCircle, CheckCircle } from 'lucide-react';

export default function RecoverAccount() {
  const [tab, setTab] = useState<'email' | 'password'>('email');
  const [emailForm, setEmailForm] = useState({ cpf: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ email: '', cpf: '', newPassword: '', confirmPassword: '' });
  
  const [emailResult, setEmailResult] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailForm({ ...emailForm, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const handleRecoverEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setEmailResult('');
    setLoading(true);

    try {
      const res = await api.post('/api/auth/recover-email', {
        cpf: emailForm.cpf,
        phone: emailForm.phone,
      });
      setEmailResult(res.data.email);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Erro ao recuperar e-mail');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMsg('As senhas não coincidem');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setErrorMsg('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/api/auth/reset-password', {
        email: passwordForm.email,
        cpf: passwordForm.cpf,
        newPassword: passwordForm.newPassword,
      });
      setSuccessMsg(res.data.message || 'Senha redefinida com sucesso!');
      setPasswordForm({ email: '', cpf: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-in" style={{ maxWidth: '480px' }}>
        <div className="auth-logo">
          <img src="/logos/bolao-logo.png" alt="Bolão Inteligentte" />
        </div>
        <h1 className="auth-title">Recuperar Acesso</h1>
        <p className="auth-subtitle text-center mb-6">Recupere suas credenciais de login usando seus dados cadastrados</p>

        {/* Custom Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => { setTab('email'); setErrorMsg(''); setSuccessMsg(''); setEmailResult(''); }}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '6px',
              border: 'none',
              background: tab === 'email' ? 'var(--primary, #05c46b)' : 'transparent',
              color: tab === 'email' ? '#fff' : 'var(--text-muted, #8a8d93)',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Esqueci meu E-mail
          </button>
          <button
            type="button"
            onClick={() => { setTab('password'); setErrorMsg(''); setSuccessMsg(''); setEmailResult(''); }}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '6px',
              border: 'none',
              background: tab === 'password' ? 'var(--primary, #05c46b)' : 'transparent',
              color: tab === 'password' ? '#fff' : 'var(--text-muted, #8a8d93)',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Esqueci minha Senha
          </button>
        </div>

        {errorMsg && (
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {tab === 'email' ? (
          /* RECOVER EMAIL FORM */
          emailResult ? (
            <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(5, 196, 107, 0.1)', border: '1px solid rgba(5, 196, 107, 0.2)', borderRadius: '8px', marginBottom: '24px' }}>
              <Mail size={36} style={{ color: 'var(--primary, #05c46b)', marginBottom: '12px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '4px' }}>E-mail encontrado:</p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', letterSpacing: '0.5px' }}>{emailResult}</p>
              <button
                type="button"
                onClick={() => setEmailResult('')}
                className="btn btn-primary"
                style={{ marginTop: '16px', padding: '8px 16px', fontSize: '14px' }}
              >
                Buscar outro e-mail
              </button>
            </div>
          ) : (
            <form onSubmit={handleRecoverEmail}>
              <div className="form-group">
                <label className="form-label" htmlFor="recover-cpf">CPF do cadastro *</label>
                <input
                  id="recover-cpf"
                  name="cpf"
                  type="text"
                  className="form-input"
                  placeholder="000.000.000-00"
                  value={emailForm.cpf}
                  onChange={handleEmailChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="recover-phone">Telefone do cadastro *</label>
                <input
                  id="recover-phone"
                  name="phone"
                  type="tel"
                  className="form-input"
                  placeholder="(11) 99999-9999"
                  value={emailForm.phone}
                  onChange={handleEmailChange}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading} style={{ marginTop: '8px' }}>
                <UserCheck size={20} />
                {loading ? 'Buscando...' : 'Buscar E-mail'}
              </button>
            </form>
          )
        ) : (
          /* RESET PASSWORD FORM */
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label className="form-label" htmlFor="reset-email">E-mail *</label>
              <input
                id="reset-email"
                name="email"
                type="email"
                className="form-input"
                placeholder="seu@email.com"
                value={passwordForm.email}
                onChange={handlePasswordChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reset-cpf">CPF *</label>
              <input
                id="reset-cpf"
                name="cpf"
                type="text"
                className="form-input"
                placeholder="000.000.000-00"
                value={passwordForm.cpf}
                onChange={handlePasswordChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reset-password">Nova Senha *</label>
              <input
                id="reset-password"
                name="newPassword"
                type="password"
                className="form-input"
                placeholder="Mínimo 6 caracteres"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reset-confirm">Confirmar Nova Senha *</label>
              <input
                id="reset-confirm"
                name="confirmPassword"
                type="password"
                className="form-input"
                placeholder="Repita a nova senha"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading} style={{ marginTop: '8px' }}>
              <Key size={20} />
              {loading ? 'Redefinindo...' : 'Redefinir Senha'}
            </button>
          </form>
        )}

        <div className="auth-footer" style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
          <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px', transition: 'color 0.2s' }} className="hover-white">
            <ArrowLeft size={16} /> Voltar para o Login
          </Link>
        </div>
      </div>
    </div>
  );
}
