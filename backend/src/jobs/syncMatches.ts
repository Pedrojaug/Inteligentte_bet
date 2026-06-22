import prisma from '../utils/prisma';
import { fetchWorldCupMatches } from '../services/football-api.service';
import { scoreMatchBets } from '../services/scoring.service';

/**
 * Sincroniza jogos da Copa do Mundo com a ESPN API
 */
export async function syncMatches(): Promise<void> {
  let matches: any[] = [];
  
  try {
    matches = await fetchWorldCupMatches();
    console.log(`[SYNC] Fetched ${matches.length} matches from ESPN API`);
  } catch (error) {
    console.error('[SYNC] Error fetching matches from API, falling back to mock matches:', error);
  }

  // Se a API retornar vazio ou falhar, caímos no fallback para semear jogos simulados e realistas da Copa 2026.
  if (!matches || matches.length === 0) {
    console.log('[SYNC] Seeding mock matches for World Cup 2026 (Free Plan API fallback)...');
    matches = getMockMatches();
  }

  try {
    // Só remove os jogos mock se a ESPN retornou jogos SCHEDULED no futuro.
    // Isso garante que sempre haverá jogos apostáveis mesmo quando o scoreboard
    // retorna apenas jogos de hoje (ao vivo/encerrados).
    const hasRealScheduledMatches = matches.some(
      (m) => m.status === 'SCHEDULED' && new Date(m.matchDate) > new Date()
    );

    if (hasRealScheduledMatches) {
      const mockIds = [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008];
      const mockMatchesInDb = await prisma.match.findMany({
        where: { apiFootballId: { in: mockIds } },
        select: { id: true },
      });

      if (mockMatchesInDb.length > 0) {
        const mockDbIds = mockMatchesInDb.map((m) => m.id);
        await prisma.bet.deleteMany({ where: { matchId: { in: mockDbIds } } });
        await prisma.match.deleteMany({ where: { id: { in: mockDbIds } } });
        console.log(`[SYNC] Replaced ${mockMatchesInDb.length} mock matches with real ESPN schedule.`);
      }
    } else {
      console.log('[SYNC] ESPN returned no future scheduled matches — keeping mock matches as fallback.');
    }

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
    console.error('[SYNC] Error saving matches to database:', error);
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

/**
 * Retorna uma lista de jogos simulados e realistas da Copa 2026 para fins de teste
 */
function getMockMatches() {
  const baseDate = new Date();
  
  return [
    {
      apiFootballId: 1001,
      homeTeam: 'Brasil',
      awayTeam: 'Croácia',
      homeFlag: 'https://flagcdn.com/w160/br.png',
      awayFlag: 'https://flagcdn.com/w160/hr.png',
      homeScore: null,
      awayScore: null,
      status: 'SCHEDULED',
      matchDate: new Date(baseDate.getTime() + 2 * 60 * 60 * 1000), // Em 2 horas
      group: 'A',
      round: 'Group Stage - Round 1',
      stage: 'GROUP',
      venue: 'MetLife Stadium',
      city: 'East Rutherford',
    },
    {
      apiFootballId: 1002,
      homeTeam: 'Argentina',
      awayTeam: 'França',
      homeFlag: 'https://flagcdn.com/w160/ar.png',
      awayFlag: 'https://flagcdn.com/w160/fr.png',
      homeScore: null,
      awayScore: null,
      status: 'SCHEDULED',
      matchDate: new Date(baseDate.getTime() + 4 * 60 * 60 * 1000), // Em 4 horas
      group: 'A',
      round: 'Group Stage - Round 1',
      stage: 'GROUP',
      venue: 'SoFi Stadium',
      city: 'Inglewood',
    },
    {
      apiFootballId: 1003,
      homeTeam: 'Espanha',
      awayTeam: 'Alemanha',
      homeFlag: 'https://flagcdn.com/w160/es.png',
      awayFlag: 'https://flagcdn.com/w160/de.png',
      homeScore: null,
      awayScore: null,
      status: 'SCHEDULED',
      matchDate: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000), // Amanhã
      group: 'B',
      round: 'Group Stage - Round 1',
      stage: 'GROUP',
      venue: 'Estádio Azteca',
      city: 'Cidade do México',
    },
    {
      apiFootballId: 1004,
      homeTeam: 'Portugal',
      awayTeam: 'Uruguai',
      homeFlag: 'https://flagcdn.com/w160/pt.png',
      awayFlag: 'https://flagcdn.com/w160/uy.png',
      homeScore: null,
      awayScore: null,
      status: 'SCHEDULED',
      matchDate: new Date(baseDate.getTime() + 28 * 60 * 60 * 1000), // Amanhã +4h
      group: 'B',
      round: 'Group Stage - Round 1',
      stage: 'GROUP',
      venue: 'BC Place',
      city: 'Vancouver',
    },
    {
      apiFootballId: 1005,
      homeTeam: 'Inglaterra',
      awayTeam: 'EUA',
      homeFlag: 'https://flagcdn.com/w160/gb-eng.png',
      awayFlag: 'https://flagcdn.com/w160/us.png',
      homeScore: null,
      awayScore: null,
      status: 'SCHEDULED',
      matchDate: new Date(baseDate.getTime() + 48 * 60 * 60 * 1000), // Em 2 dias
      group: 'C',
      round: 'Group Stage - Round 1',
      stage: 'GROUP',
      venue: 'Mercedes-Benz Stadium',
      city: 'Atlanta',
    },
    {
      apiFootballId: 1006,
      homeTeam: 'Holanda',
      awayTeam: 'Senegal',
      homeFlag: 'https://flagcdn.com/w160/nl.png',
      awayFlag: 'https://flagcdn.com/w160/sn.png',
      homeScore: null,
      awayScore: null,
      status: 'SCHEDULED',
      matchDate: new Date(baseDate.getTime() + 52 * 60 * 60 * 1000), // Em 2 dias +4h
      group: 'C',
      round: 'Group Stage - Round 1',
      stage: 'GROUP',
      venue: 'Hard Rock Stadium',
      city: 'Miami Gardens',
    },
    {
      apiFootballId: 1007,
      homeTeam: 'Bélgica',
      awayTeam: 'Japão',
      homeFlag: 'https://flagcdn.com/w160/be.png',
      awayFlag: 'https://flagcdn.com/w160/jp.png',
      homeScore: null,
      awayScore: null,
      status: 'SCHEDULED',
      matchDate: new Date(baseDate.getTime() + 72 * 60 * 60 * 1000), // Em 3 dias
      group: 'D',
      round: 'Group Stage - Round 1',
      stage: 'GROUP',
      venue: 'Gillette Stadium',
      city: 'Foxborough',
    },
    {
      apiFootballId: 1008,
      homeTeam: 'Itália',
      awayTeam: 'Nigéria',
      homeFlag: 'https://flagcdn.com/w160/it.png',
      awayFlag: 'https://flagcdn.com/w160/ng.png',
      homeScore: null,
      awayScore: null,
      status: 'SCHEDULED',
      matchDate: new Date(baseDate.getTime() + 76 * 60 * 60 * 1000), // Em 3 dias +4h
      group: 'D',
      round: 'Group Stage - Round 1',
      stage: 'GROUP',
      venue: 'NRG Stadium',
      city: 'Houston',
    }
  ];
}
