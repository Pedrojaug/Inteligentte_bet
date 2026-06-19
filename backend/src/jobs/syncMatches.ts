import prisma from '../utils/prisma';
import { fetchWorldCupMatches } from '../services/football-api.service';
import { scoreMatchBets } from '../services/scoring.service';

/**
 * Sincroniza jogos da Copa do Mundo com a API-Football
 */
export async function syncMatches(): Promise<void> {
  try {
    const matches = await fetchWorldCupMatches();
    console.log(`[SYNC] Fetched ${matches.length} matches from API-Football`);

    for (const match of matches) {
      await prisma.match.upsert({
        where: { apiFootballId: match.apiFootballId },
        update: {
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          status: match.status as any,
          matchDate: match.matchDate,
          venue: match.venue,
          city: match.city,
        },
        create: {
          apiFootballId: match.apiFootballId,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          homeFlag: match.homeFlag,
          awayFlag: match.awayFlag,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          status: match.status as any,
          matchDate: match.matchDate,
          group: match.group,
          round: match.round,
          stage: match.stage as any,
          venue: match.venue,
          city: match.city,
        },
      });
    }

    console.log(`[SYNC] Successfully synced ${matches.length} matches`);
  } catch (error) {
    console.error('[SYNC] Error syncing matches:', error);
  }
}

/**
 * Calcula pontuações para jogos recém-finalizados
 */
export async function calculateFinishedMatchScores(): Promise<void> {
  try {
    // Busca jogos finalizados que possuem apostas não calculadas
    const finishedMatches = await prisma.match.findMany({
      where: {
        status: 'FINISHED',
        bets: {
          some: { scored: false },
        },
      },
    });

    for (const match of finishedMatches) {
      const scored = await scoreMatchBets(match.id);
      if (scored > 0) {
        console.log(`[SCORING] Scored ${scored} bets for match ${match.homeTeam} vs ${match.awayTeam}`);
      }
    }
  } catch (error) {
    console.error('[SCORING] Error calculating scores:', error);
  }
}
