import axios from 'axios';

const footballApi = axios.create({
  baseURL: process.env.FOOTBALL_API_URL || 'https://v3.football.api-sports.io',
  headers: {
    'x-apisports-key': process.env.FOOTBALL_API_KEY || '',
  },
});

// FIFA World Cup 2026 identifiers
const WORLD_CUP_LEAGUE_ID = 1;
const WORLD_CUP_SEASON = 2026;

interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string;
      long: string;
    };
    venue: {
      name: string;
      city: string;
    };
  };
  league: {
    round: string;
  };
  teams: {
    home: { name: string; logo: string };
    away: { name: string; logo: string };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

/**
 * Mapeia status da API para nosso enum MatchStatus
 */
function mapStatus(apiStatus: string): string {
  const statusMap: Record<string, string> = {
    'TBD': 'SCHEDULED',
    'NS': 'SCHEDULED',
    'PST': 'POSTPONED',
    'CANC': 'CANCELLED',
    '1H': 'LIVE',
    '2H': 'LIVE',
    'HT': 'HALFTIME',
    'ET': 'EXTRA_TIME',
    'P': 'PENALTIES',
    'BT': 'EXTRA_TIME',
    'FT': 'FINISHED',
    'AET': 'FINISHED',
    'PEN': 'FINISHED',
    'SUSP': 'POSTPONED',
    'INT': 'LIVE',
    'AWD': 'FINISHED',
    'WO': 'FINISHED',
    'LIVE': 'LIVE',
  };
  return statusMap[apiStatus] || 'SCHEDULED';
}

/**
 * Determina o estágio do jogo baseado no "round"
 */
function mapStage(round: string): string {
  const r = round.toLowerCase();
  if (r.includes('group')) return 'GROUP';
  if (r.includes('32')) return 'ROUND_OF_32';
  if (r.includes('16')) return 'ROUND_OF_16';
  if (r.includes('quarter')) return 'QUARTER_FINAL';
  if (r.includes('semi')) return 'SEMI_FINAL';
  if (r.includes('3rd') || r.includes('third')) return 'THIRD_PLACE';
  if (r.includes('final')) return 'FINAL';
  return 'GROUP';
}

/**
 * Busca todos os jogos da Copa do Mundo 2026
 */
export async function fetchWorldCupMatches(): Promise<Array<{
  apiFootballId: number;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  matchDate: Date;
  group: string;
  round: string;
  stage: string;
  venue: string;
  city: string;
}>> {
  try {
    const response = await footballApi.get('/fixtures', {
      params: {
        league: WORLD_CUP_LEAGUE_ID,
        season: WORLD_CUP_SEASON,
      },
    });

    const fixtures: ApiFixture[] = response.data.response;

    return fixtures.map((f) => ({
      apiFootballId: f.fixture.id,
      homeTeam: f.teams.home.name,
      awayTeam: f.teams.away.name,
      homeFlag: f.teams.home.logo,
      awayFlag: f.teams.away.logo,
      homeScore: f.goals.home,
      awayScore: f.goals.away,
      status: mapStatus(f.fixture.status.short),
      matchDate: new Date(f.fixture.date),
      group: f.league.round.includes('Group') ? f.league.round.split(' - ')[0].replace('Group ', '') : '',
      round: f.league.round,
      stage: mapStage(f.league.round),
      venue: f.fixture.venue?.name || '',
      city: f.fixture.venue?.city || '',
    }));
  } catch (error: any) {
    console.error('[FOOTBALL-API] Error fetching matches:', error.response?.data || error.message);
    throw new Error('Erro ao buscar jogos da Copa do Mundo');
  }
}

/**
 * Busca jogos ao vivo
 */
export async function fetchLiveMatches(): Promise<ApiFixture[]> {
  try {
    const response = await footballApi.get('/fixtures', {
      params: { live: 'all' },
    });

    // Filtra apenas jogos da Copa do Mundo
    const fixtures: ApiFixture[] = response.data.response;
    return fixtures.filter((f: any) => f.league?.id === WORLD_CUP_LEAGUE_ID);
  } catch (error: any) {
    console.error('[FOOTBALL-API] Error fetching live matches:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Verifica status e quota da API
 */
export async function checkApiStatus(): Promise<{
  requests: { current: number; limit_day: number };
}> {
  try {
    const response = await footballApi.get('/status');
    return {
      requests: response.data.response.requests,
    };
  } catch (error: any) {
    console.error('[FOOTBALL-API] Error checking status:', error.response?.data || error.message);
    throw new Error('Erro ao verificar status da API');
  }
}
