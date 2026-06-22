import prisma from '../utils/prisma';

/**
 * Pontuação por proximidade (bolão de jogo único):
 *   3 = placar exato
 *   2 = acertou saldo de gols (diferença) e vencedor
 *   1 = acertou apenas o vencedor (ou empate sem placar exato)
 *   0 = errou tudo
 */
export function calculatePoints(
  betHome: number,
  betAway: number,
  matchHome: number,
  matchAway: number
): number {
  if (betHome === matchHome && betAway === matchAway) return 3;

  const betDiff = betHome - betAway;
  const matchDiff = matchHome - matchAway;
  const betWinner = Math.sign(betDiff);
  const matchWinner = Math.sign(matchDiff);

  if (betWinner === matchWinner && betDiff === matchDiff) return 2;
  if (betWinner === matchWinner) return 1;

  return 0;
}

/**
 * Calcula e persiste pontuações de todas as apostas de um jogo finalizado.
 * Chamado pelo cron após o jogo encerrar.
 */
export async function scoreMatchBets(matchId: string): Promise<number> {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.status !== 'FINISHED' || match.homeScore === null || match.awayScore === null) {
    return 0;
  }

  const bets = await prisma.bet.findMany({ where: { matchId, scored: false } });

  let scored = 0;
  for (const bet of bets) {
    const points = calculatePoints(bet.homeScore, bet.awayScore, match.homeScore!, match.awayScore!);

    await prisma.bet.update({
      where: { id: bet.id },
      data: { points, scored: true },
    });

    await prisma.poolMember.updateMany({
      where: { userId: bet.userId, poolId: bet.poolId },
      data: { totalPoints: { increment: points } },
    });

    scored++;
  }

  return scored;
}
