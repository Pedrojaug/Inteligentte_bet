import prisma from '../utils/prisma';

interface ScoreInput {
  betHomeScore: number;
  betAwayScore: number;
  matchHomeScore: number;
  matchAwayScore: number;
}

interface PoolRules {
  exactScorePoints: number;
  winnerGoalDiffPts: number;
  winnerOnlyPoints: number;
  drawNoExactPoints: number;
}

/**
 * Calcula a pontuação de uma aposta baseado nas regras do bolão
 */
export function calculatePoints(input: ScoreInput, rules: PoolRules): number {
  const { betHomeScore, betAwayScore, matchHomeScore, matchAwayScore } = input;

  // Placar exato
  if (betHomeScore === matchHomeScore && betAwayScore === matchAwayScore) {
    return rules.exactScorePoints;
  }

  const betDiff = betHomeScore - betAwayScore;
  const matchDiff = matchHomeScore - matchAwayScore;
  const betWinner = Math.sign(betDiff);
  const matchWinner = Math.sign(matchDiff);

  // Acertou empate (sem placar exato)
  if (betWinner === 0 && matchWinner === 0) {
    return rules.drawNoExactPoints;
  }

  // Acertou vencedor + saldo de gols
  if (betWinner === matchWinner && betDiff === matchDiff) {
    return rules.winnerGoalDiffPts;
  }

  // Acertou apenas o vencedor
  if (betWinner === matchWinner) {
    return rules.winnerOnlyPoints;
  }

  // Errou tudo
  return 0;
}

/**
 * Calcula as pontuações de todas as apostas de um jogo finalizado
 * para todos os bolões
 */
export async function scoreMatchBets(matchId: string): Promise<number> {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.status !== 'FINISHED' || match.homeScore === null || match.awayScore === null) {
    return 0;
  }

  // Busca todas as apostas não calculadas deste jogo
  const bets = await prisma.bet.findMany({
    where: { matchId, scored: false },
    include: { pool: true },
  });

  let scored = 0;

  for (const bet of bets) {
    const points = calculatePoints(
      {
        betHomeScore: bet.homeScore,
        betAwayScore: bet.awayScore,
        matchHomeScore: match.homeScore!,
        matchAwayScore: match.awayScore!,
      },
      {
        exactScorePoints: bet.pool.exactScorePoints,
        winnerGoalDiffPts: bet.pool.winnerGoalDiffPts,
        winnerOnlyPoints: bet.pool.winnerOnlyPoints,
        drawNoExactPoints: bet.pool.drawNoExactPoints,
      }
    );

    // Atualiza a aposta com a pontuação
    await prisma.bet.update({
      where: { id: bet.id },
      data: { points, scored: true },
    });

    // Atualiza totalPoints do membro no bolão
    await prisma.poolMember.updateMany({
      where: { userId: bet.userId, poolId: bet.poolId },
      data: { totalPoints: { increment: points } },
    });

    scored++;
  }

  return scored;
}
