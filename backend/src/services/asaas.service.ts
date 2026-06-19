import axios from 'axios';

const asaasApi = axios.create({
  baseURL: process.env.ASAAS_API_URL || 'https://api-sandbox.asaas.com/v3',
  headers: {
    'Content-Type': 'application/json',
    'access_token': process.env.ASAAS_API_KEY || '',
  },
});

/**
 * Cria um cliente na ASAAS
 */
export async function createCustomer(data: {
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
}): Promise<{ id: string }> {
  try {
    const response = await asaasApi.post('/customers', {
      name: data.name,
      email: data.email,
      cpfCnpj: data.cpfCnpj?.replace(/\D/g, ''),
      phone: data.phone?.replace(/\D/g, ''),
    });
    return { id: response.data.id };
  } catch (error: any) {
    console.error('[ASAAS] Error creating customer:', error.response?.data || error.message);
    throw new Error('Erro ao criar cliente no ASAAS');
  }
}

/**
 * Cria cobrança PIX na ASAAS
 */
export async function createPixPayment(data: {
  customerId: string;
  amount: number;
  description: string;
  externalReference?: string;
  dueDate: string; // YYYY-MM-DD
}): Promise<{
  id: string;
  invoiceUrl: string;
  status: string;
}> {
  try {
    const response = await asaasApi.post('/payments', {
      customer: data.customerId,
      billingType: 'PIX',
      value: data.amount,
      dueDate: data.dueDate,
      description: data.description,
      externalReference: data.externalReference,
    });
    return {
      id: response.data.id,
      invoiceUrl: response.data.invoiceUrl,
      status: response.data.status,
    };
  } catch (error: any) {
    console.error('[ASAAS] Error creating PIX payment:', error.response?.data || error.message);
    throw new Error('Erro ao criar cobrança PIX');
  }
}

/**
 * Obtém QR Code PIX de uma cobrança
 */
export async function getPixQrCode(paymentId: string): Promise<{
  encodedImage: string;
  payload: string;
  expirationDate: string;
}> {
  try {
    const response = await asaasApi.get(`/payments/${paymentId}/pixQrCode`);
    return {
      encodedImage: response.data.encodedImage,
      payload: response.data.payload,
      expirationDate: response.data.expirationDate,
    };
  } catch (error: any) {
    console.error('[ASAAS] Error getting PIX QR Code:', error.response?.data || error.message);
    throw new Error('Erro ao obter QR Code PIX');
  }
}

/**
 * Consulta status de um pagamento
 */
export async function getPaymentStatus(paymentId: string): Promise<{
  status: string;
  value: number;
  paymentDate: string | null;
}> {
  try {
    const response = await asaasApi.get(`/payments/${paymentId}`);
    return {
      status: response.data.status,
      value: response.data.value,
      paymentDate: response.data.paymentDate,
    };
  } catch (error: any) {
    console.error('[ASAAS] Error getting payment status:', error.response?.data || error.message);
    throw new Error('Erro ao consultar status do pagamento');
  }
}
