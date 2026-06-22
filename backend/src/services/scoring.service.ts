import prisma from '../utils/prisma';

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
 * Calcula e persiste pontuações para um jogo finalizado.
 * Regra: todos os usuários com o mesmo placar exato dividem o prêmio (3 pts).
 * Se ninguém acertou o exato, todos com 2 pts dividem, e assim por diante.
 * Múltiplos usuários podem apostar no mesmo placar — sem restrição.
 */
export async function scoreMatchBets(matchId: string): Promise<number> {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.status !== 'FINISHED' || match.homeScore === null || match.awayScore === null) {
    return 0;
  }

  const bets = await prisma.bet.findMany({ where: { matchId, scored: false } });
  if (bets.length === 0) return 0;

  // Calcula pontos de cada aposta
  const scoredBets = bets.map((bet) => ({
    ...bet,
    points: calculatePoints(bet.homeScore, bet.awayScore, match.homeScore!, match.awayScore!),
  }));

  // Persiste pontos e atualiza totalPoints de cada membro
  let scored = 0;
  for (const bet of scoredBets) {
    await prisma.bet.update({
      where: { id: bet.id },
      data: { points: bet.points, scored: true },
    });

    await prisma.poolMember.updateMany({
      where: { userId: bet.userId, poolId: bet.poolId },
      data: { totalPoints: { increment: bet.points } },
    });

    scored++;
  }

  // Log de vencedores para auditoria
  const winners = scoredBets.filter((b) => b.points === 3);
  if (winners.length > 0) {
    console.log(
      `[SCORING] Match ${matchId} — ${winners.length} winner(s) with exact score ` +
      `${match.homeScore}-${match.awayScore}. Prize splits equally among them.`
    );
  } else {
    const best = Math.max(...scoredBets.map((b) => b.points));
    const runners = scoredBets.filter((b) => b.points === best);
    console.log(
      `[SCORING] Match ${matchId} — no exact score. Best group (${best} pts): ${runners.length} user(s).`
    );
  }

  return scored;
}
