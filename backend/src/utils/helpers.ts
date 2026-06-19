import crypto from 'crypto';

/**
 * Gera um código de convite único para o bolão
 * Formato: 6 caracteres alfanuméricos maiúsculos (ex: "BRL26K")
 */
export function generatePoolCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

/**
 * Calcula comissão da casa (10%) e valor líquido
 */
export function calculateCommission(amount: number): { netAmount: number; houseAmount: number } {
  const commissionRate = parseInt(process.env.HOUSE_COMMISSION || '10') / 100;
  const houseAmount = Math.round(amount * commissionRate * 100) / 100;
  const netAmount = Math.round((amount - houseAmount) * 100) / 100;
  return { netAmount, houseAmount };
}

/**
 * Formata valor em reais
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
