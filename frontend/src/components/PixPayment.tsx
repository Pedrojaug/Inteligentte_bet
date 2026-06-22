import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Copy, Check, RefreshCw } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  status: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
  invoiceUrl?: string;
}

interface Props {
  poolId: string;
  initialPayment?: Payment | null;
  onConfirmed: () => void;
}

export default function PixPayment({ poolId, initialPayment, onConfirmed }: Props) {
  const navigate = useNavigate();
  const [payment, setPayment] = useState<Payment | null>(initialPayment ?? null);
  const [loading, setLoading] = useState(!initialPayment);
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Gera ou busca o PIX ao montar
  useEffect(() => {
    if (!initialPayment) {
      generatePix();
    } else {
      startPolling();
    }
    return () => stopPolling();
  }, [poolId]);

  const generatePix = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/api/payments/pool/${poolId}`);
      setPayment(res.data.payment);
      startPolling();
    } catch (err: any) {
      console.error('Erro ao gerar PIX:', err);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/api/payments/pool/${poolId}/status`);
        if (res.data.status === 'CONFIRMED') {
          stopPolling();
          setConfirmed(true);
          setTimeout(onConfirmed, 2000); // mostra sucesso por 2s antes de redirecionar
        }
      } catch {
        // ignora erros de polling
      }
    }, 5000);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const copyCode = () => {
    if (payment?.pixCopyPaste) {
      navigator.clipboard.writeText(payment.pixCopyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (confirmed) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <div style={{ fontSize: '64px', marginBottom: 'var(--space-md)' }}>✅</div>
        <h3 style={{ fontWeight: 800, fontSize: 'var(--font-2xl)', color: 'var(--primary)', marginBottom: 'var(--space-sm)' }}>
          Pagamento Confirmado!
        </h3>
        <p style={{ color: 'var(--text-secondary)' }}>Você já pode fazer sua aposta.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <div className="spinner" style={{ margin: '0 auto var(--space-md)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Gerando PIX...</p>
      </div>
    );
  }

  if (!payment) return null;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-sm)' }}>
          Valor a pagar:
        </p>
        <p style={{ fontWeight: 800, fontSize: 'var(--font-3xl)', color: 'var(--primary)' }}>
          {formatCurrency(payment.amount)}
        </p>
      </div>

      {/* QR Code */}
      {payment.pixQrCode && (
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
          <img
            src={`data:image/png;base64,${payment.pixQrCode}`}
            alt="QR Code PIX"
            style={{
              width: '220px', height: '220px',
              margin: '0 auto', display: 'block',
              borderRadius: 'var(--radius-md)',
              border: '4px solid var(--primary)',
              padding: '8px',
              background: '#fff',
            }}
          />
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)', marginTop: 'var(--space-sm)' }}>
            Escaneie com o app do seu banco
          </p>
        </div>
      )}

      {/* Copia e Cola */}
      {payment.pixCopyPaste && (
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>
            Ou use o PIX Copia e Cola:
          </p>
          <div style={{
            display: 'flex', gap: 'var(--space-sm)', alignItems: 'center',
            background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
            padding: 'var(--space-sm) var(--space-md)', border: '1px solid var(--border-color)',
          }}>
            <span style={{
              flex: 1, fontSize: 'var(--font-xs)', fontFamily: 'monospace',
              color: 'var(--text-secondary)', wordBreak: 'break-all',
              overflow: 'hidden', maxHeight: '3em',
            }}>
              {payment.pixCopyPaste}
            </span>
            <button className="btn btn-primary btn-sm" onClick={copyCode} style={{ flexShrink: 0 }}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      )}

      {payment.invoiceUrl && (
        <a href={payment.invoiceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-full mb-md">
          Abrir fatura completa
        </a>
      )}

      {/* Status de aguardo */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)',
        padding: 'var(--space-md)', background: 'rgba(0,200,83,0.06)',
        borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,200,83,0.15)',
        color: 'var(--text-secondary)', fontSize: 'var(--font-sm)',
      }}>
        <RefreshCw size={14} style={{ animation: 'spin 2s linear infinite', flexShrink: 0 }} />
        Aguardando confirmação do pagamento...
      </div>

      <p style={{ textAlign: 'center', fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-md)' }}>
        A confirmação é automática em até alguns segundos após o pagamento.
      </p>
    </div>
  );
}
