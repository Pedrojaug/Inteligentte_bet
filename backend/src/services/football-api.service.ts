import axios from 'axios';

const ESPN_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const ESPN_SCHEDULE_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/schedule';

/**
 * Mapeia status da API ESPN para nosso enum MatchStatus
 */
function mapStatus(state: string, name: string, detail: string): string {
  const normalizedState = (state || '').toLowerCase();
  const normalizedName = (name || '').toUpperCase();
  const normalizedDetail = (detail || '').toUpperCase();

  if (normalizedState === 'post') {
    return 'FINISHED';
  }
  if (normalizedState === 'pre') {
    return 'SCHEDULED';
  }
  if (normalizedState === 'in') {
    if (normalizedName.includes('HALFTIME') || normalizedDetail === 'HT') {
      return 'HALFTIME';
    }
    if (normalizedName.includes('EXTRA') || normalizedDetail.includes('ET') || normalizedDetail.includes('AET')) {
      return 'EXTRA_TIME';
    }
    if (normalizedName.includes('PENALT') || normalizedDetail.includes('PEN')) {
      return 'PENALTIES';
    }
    return 'LIVE';
  }
  return 'SCHEDULED';
}

/**
 * Determina o estágio do jogo baseado no slug da temporada
 */
function mapStage(slug: string): string {
  switch (slug) {
    case 'group-stage':
      return 'GROUP';
    case 'round-of-32':
      return 'ROUND_OF_32';
    case 'round-of-16':
      return 'ROUND_OF_16';
    case 'quarterfinals':
      return 'QUARTER_FINAL';
    case 'semifinals':
      return 'SEMI_FINAL';
    case '3rd-place-match':
      return 'THIRD_PLACE';
    case 'final':
      return 'FINAL';
    default:
      return 'GROUP';
  }
}

/**
 * Obtém uma descrição amigável para a rodada
 */
function getFriendlyRound(slug: string): string {
  switch (slug) {
    case 'group-stage':
      return 'Fase de Grupos';
    case 'round-of-32':
      return '32 avos de Final';
    case 'round-of-16':
      return 'Oitavas de Final';
    case 'quarterfinals':
      return 'Quartas de Final';
    case 'semifinals':
      return 'Semifinal';
    case '3rd-place-match':
      return 'Disputa de 3º Lugar';
    case 'final':
      return 'Final';
    default:
      return 'Copa do Mundo';
  }
}

/**
 * Busca todos os jogos da Copa do Mundo 2026
 */
type MatchData = {
  apiFootballId: number;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  matchDate: Date;
  group: string | null;
  round: string;
  stage: string;
  venue: string;
  city: string;
};

function mapEvent(e: any): MatchData {
  const apiFootballId = parseInt(e.id, 10);
  const competition = e.competitions?.[0];
  const competitors = competition?.competitors || [];

  const home = competitors.find((c: any) => c.homeAway === 'home');
  const away = competitors.find((c: any) => c.homeAway === 'away');

  const isLiveOrFinished = e.status?.type?.state === 'in' || e.status?.type?.state === 'post';
  const homeScore = isLiveOrFinished && home?.score !== undefined ? parseInt(home.score, 10) : null;
  const awayScore = isLiveOrFinished && away?.score !== undefined ? parseInt(away.score, 10) : null;

  const slug = e.season?.type?.slug || competition?.type?.slug || 'group-stage';
  const statusDetail = e.status?.type?.detail || e.status?.type?.shortDetail || '';

  return {
    apiFootballId,
    homeTeam: home?.team?.name || home?.team?.displayName || 'TBD',
    awayTeam: away?.team?.name || away?.team?.displayName || 'TBD',
    homeFlag: home?.team?.logo || '',
    awayFlag: away?.team?.logo || '',
    homeScore,
    awayScore,
    status: mapStatus(e.status?.type?.state, e.status?.type?.name, statusDetail),
    matchDate: new Date(e.date),
    group: null,
    round: getFriendlyRound(slug),
    stage: mapStage(slug),
    venue: competition?.venue?.fullName || '',
    city: competition?.venue?.address?.city || '',
  };
}

export async function fetchWorldCupMatches(): Promise<MatchData[]> {
  // Fetch scoreboard (live/today) and full schedule in parallel
  const [scoreboardRes, scheduleRes] = await Promise.allSettled([
    axios.get(ESPN_SCOREBOARD_URL, { params: { limit: 100 } }),
    axios.get(ESPN_SCHEDULE_URL, { params: { dates: '20260611-20260719', limit: 200 } }),
  ]);

  const eventsMap = new Map<number, MatchData>();

  // Load schedule first (lower priority — may lack live scores)
  if (scheduleRes.status === 'fulfilled') {
    const events: any[] = scheduleRes.value.data.events || [];
    for (const e of events) {
      const mapped = mapEvent(e);
      if (mapped.apiFootballId) eventsMap.set(mapped.apiFootballId, mapped);
    }
    console.log(`[ESPN] Schedule: ${events.length} events`);
  } else {
    console.warn('[ESPN] Schedule fetch failed:', (scheduleRes as PromiseRejectedResult).reason?.message);
  }

  // Overwrite with scoreboard data (higher priority — has live scores)
  if (scoreboardRes.status === 'fulfilled') {
    const events: any[] = scoreboardRes.value.data.events || [];
    for (const e of events) {
      const mapped = mapEvent(e);
      if (mapped.apiFootballId) eventsMap.set(mapped.apiFootballId, mapped);
    }
    console.log(`[ESPN] Scoreboard: ${events.length} events`);
  } else {
    console.warn('[ESPN] Scoreboard fetch failed:', (scoreboardRes as PromiseRejectedResult).reason?.message);
  }

  if (eventsMap.size === 0) {
    throw new Error('ESPN API returned no events from either endpoint');
  }

  return Array.from(eventsMap.values());
}

/**
 * Busca jogos ao vivo (implementado para manter compatibilidade, embora não utilizado)
 */
export async function fetchLiveMatches(): Promise<any[]> {
  try {
    const response = await axios.get(ESPN_SCOREBOARD_URL);
    const events = response.data.events || [];
    // Filtra apenas os eventos que estão em andamento
    return events.filter((e: any) => e.status?.type?.state === 'in');
  } catch (error: any) {
    console.error('[ESPN-SOCCER-API] Error fetching live matches:', error.message);
    return [];
  }
}

/**
 * Verifica status e quota da API (Mockado sem limite para ESPN)
 */
export async function checkApiStatus(): Promise<{
  requests: { current: number; limit_day: number };
}> {
  return {
    requests: { current: 0, limit_day: 999999 },
  };
}
