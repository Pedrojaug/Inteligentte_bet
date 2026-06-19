import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { calculateCommission } from '../utils/helpers';
import { createCustomer, createPixPayment, getPixQrCode } from '../services/asaas.service';

const router = Router();

// ─── POST /api/payments/pool/:poolId ─ Gerar PIX para entrar no bolão ──
router.post('/pool/:poolId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pool = await prisma.pool.findUnique({ where: { id: req.params.poolId } });
    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado' });
      return;
    }

    // Verifica se é membro
    const membership = await prisma.poolMember.findUnique({
      where: { userId_poolId: { userId: req.userId!, poolId: pool.id } },
    });

    if (!membership) {
      res.status(400).json({ error: 'Você precisa entrar no bolão primeiro' });
      return;
    }

    if (membership.paymentStatus === 'CONFIRMED') {
      res.status(400).json({ error: 'Pagamento já confirmado' });
      return;
    }

    // Verifica se já existe pagamento pendente
    const existingPayment = await prisma.payment.findFirst({
      where: { userId: req.userId!, poolId: pool.id, status: 'PENDING' },
    });

    if (existingPayment) {
      // Retorna o pagamento existente
      res.json({
        payment: existingPayment,
        message: 'Pagamento pendente encontrado',
      });
      return;
    }

    // Busca ou cria customer na ASAAS
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    let asaasCustomerId = user.asaasCustomerId;
    if (!asaasCustomerId) {
      const customer = await createCustomer({
        name: user.name,
        email: user.email,
        cpfCnpj: user.cpf || undefined,
        phone: user.phone || undefined,
      });
      asaasCustomerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { asaasCustomerId },
      });
    }

    // Calcula comissão
    const { netAmount, houseAmount } = calculateCommission(pool.entryFee);

    // Gera cobrança PIX na ASAAS
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3); // 3 dias para pagar
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const asaasPayment = await createPixPayment({
      customerId: asaasCustomerId,
      amount: pool.entryFee,
      description: `Bolão: ${pool.name} - Entrada`,
      externalReference: `pool:${pool.id}|user:${user.id}`,
      dueDate: dueDateStr,
    });

    // Busca QR Code
    let pixQrCode = '';
    let pixCopyPaste = '';
    try {
      const qrData = await getPixQrCode(asaasPayment.id);
      pixQrCode = qrData.encodedImage;
      pixCopyPaste = qrData.payload;
    } catch (e) {
      console.warn('[PAYMENTS] Could not get QR code immediately, will be available later');
    }

    // Salva no banco
    const payment = await prisma.payment.create({
      data: {
        userId: req.userId!,
        poolId: pool.id,
        asaasPaymentId: asaasPayment.id,
        amount: pool.entryFee,
        netAmount,
        houseAmount,
        status: 'PENDING',
        billingType: 'PIX',
        pixQrCode,
        pixCopyPaste,
        invoiceUrl: asaasPayment.invoiceUrl,
        dueDate,
      },
    });

    res.status(201).json({
      payment,
      message: 'Cobrança PIX gerada com sucesso!',
    });
  } catch (error) {
    console.error('[PAYMENTS] Create error:', error);
    res.status(500).json({ error: 'Erro ao gerar pagamento' });
  }
});

// ─── GET /api/payments/pool/:poolId/status ──
router.get('/pool/:poolId/status', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payment = await prisma.payment.findFirst({
      where: { userId: req.userId!, poolId: req.params.poolId },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      res.json({ status: 'NO_PAYMENT', message: 'Nenhum pagamento encontrado' });
      return;
    }

    res.json(payment);
  } catch (error) {
    console.error('[PAYMENTS] Status error:', error);
    res.status(500).json({ error: 'Erro ao consultar status' });
  }
});

// ─── GET /api/payments/my ─ Meus pagamentos ──
router.get('/my', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(payments);
  } catch (error) {
    console.error('[PAYMENTS] My payments error:', error);
    res.status(500).json({ error: 'Erro ao buscar pagamentos' });
  }
});

// ─── POST /api/payments/webhook ─ Webhook ASAAS (público) ──
router.post('/webhook', async (req, res: Response): Promise<void> => {
  try {
    const { event, payment: asaasPayment } = req.body;

    console.log(`[WEBHOOK] Received event: ${event}`, asaasPayment?.id);

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const payment = await prisma.payment.findUnique({
        where: { asaasPaymentId: asaasPayment.id },
      });

      if (payment) {
        // Atualiza pagamento
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'CONFIRMED',
            paidAt: new Date(),
          },
        });

        // Confirma membro no bolão
        if (payment.poolId) {
          await prisma.poolMember.updateMany({
            where: { userId: payment.userId, poolId: payment.poolId },
            data: { paymentStatus: 'CONFIRMED' },
          });
        }

        console.log(`[WEBHOOK] Payment ${payment.id} confirmed for user ${payment.userId}`);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[WEBHOOK] Error:', error);
    res.status(200).json({ received: true }); // Always return 200 to ASAAS
  }
});

export default router;
