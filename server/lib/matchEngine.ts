/**
 * Match Engine - Industry-standard Tier A matching algorithm
 * 
 * Calculates compatibility percentages between investors and companies
 * using weighted multi-factor scoring with caching for performance.
 * 
 * Design Principles:
 * - Pluggable scoring factors (Sector, Stage, Ticket Size, Geography, etc.)
 * - Cached results with TTL for O(1) lookups
 * - Weighted scoring system (0-100%)
 * - Normalized input handling
 * - Type-safe implementation
 */

export interface InvestorProfile {
  user_id: string;
  firm?: string;
  sectors?: string[];
  stages?: string[];
  check_size_min?: number;
  check_size_max?: number;
  check_size_unit?: string;
  geographies?: string[];
  aum?: string;
}

export interface CompanyProfile {
  user_id: string;
  sector?: string;
  stage?: string;
  capital_sought?: string;
  hq_location?: string;
  preferred_investor_types?: string[];
}

export interface MatchScore {
  overall: number; // 0-100
  factors: {
    sector: number;
    stage: number;
    ticketSize: number;
    geography: number;
    investorType: number;
  };
  confidence: 'high' | 'medium' | 'low';
}

interface CachedMatch {
  score: MatchScore;
  timestamp: number;
}

/**
 * Scoring weights - adjustable for different use cases
 * Sum should equal 100 for normalized percentages
 */
const SCORING_WEIGHTS = {
  sector: 0.30,    // 30% - most important
  stage: 0.25,     // 25%
  ticketSize: 0.25, // 25%
  geography: 0.15,  // 15%
  investorType: 0.05, // 5% - least important
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Simple in-memory cache for match scores
 * In production, use Redis for distributed caching
 */
class MatchCache {
  private cache = new Map<string, CachedMatch>();

  getCacheKey(investorId: string, companyId: string): string {
    return `${investorId}:${companyId}`;
  }

  get(investorId: string, companyId: string): MatchScore | null {
    const key = this.getCacheKey(investorId, companyId);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if cache has expired
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }

    return cached.score;
  }

  set(investorId: string, companyId: string, score: MatchScore): void {
    const key = this.getCacheKey(investorId, companyId);
    this.cache.set(key, { score, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Sector Matching - Exact or close match
 */
function scoreSector(
  investorSectors: string[] | undefined,
  companySector: string | undefined
): number {
  if (!investorSectors || !companySector) return 50; // neutral score

  const normalizedInvestorSectors = investorSectors.map(s => s.toLowerCase().trim());
  const normalizedCompanySector = companySector.toLowerCase().trim();

  // Exact match
  if (normalizedInvestorSectors.includes(normalizedCompanySector)) {
    return 100;
  }

  // Partial match (e.g., "Solar" matches "Solar Energy")
  if (normalizedInvestorSectors.some(s => normalizedCompanySector.includes(s) || s.includes(normalizedCompanySector))) {
    return 75;
  }

  // No match
  return 20;
}

/**
 * Stage Matching - Investor typically invests in multiple stages
 */
function scoreStage(
  investorStages: string[] | undefined,
  companyStage: string | undefined
): number {
  if (!investorStages || !companyStage) return 60; // neutral score

  const normalizedInvestorStages = investorStages.map(s => s.toLowerCase().trim());
  const normalizedCompanyStage = companyStage.toLowerCase().trim();

  // Exact match
  if (normalizedInvestorStages.includes(normalizedCompanyStage)) {
    return 100;
  }

  // Stage progression logic: Seed < Series A < Series B < Growth
  const stageOrder = ['seed', 'series a', 'series b', 'growth', 'late stage'];
  const companyStageIndex = stageOrder.findIndex(s => normalizedCompanyStage.includes(s));
  
  if (companyStageIndex === -1) return 50;

  // Check if investor covers the company stage or nearby stages
  for (const investorStage of normalizedInvestorStages) {
    const investorStageIndex = stageOrder.findIndex(s => investorStage.includes(s));
    if (investorStageIndex === -1) continue;

    // Same or adjacent stage = high score
    if (Math.abs(investorStageIndex - companyStageIndex) <= 1) {
      return 90;
    }
    // Within 2 stages = medium score
    if (Math.abs(investorStageIndex - companyStageIndex) <= 2) {
      return 60;
    }
  }

  return 30;
}

/**
 * Ticket Size Matching - Check if company's ask fits investor's range
 */
function scoreTicketSize(
  investor: InvestorProfile,
  capitalSought: string | undefined
): number {
  if (!capitalSought) return 60; // neutral if unknown

  // Parse capital sought (e.g., "$5M" -> 5,000,000)
  const companyAsk = parseCapitalAmount(capitalSought);
  if (companyAsk === null) return 50;

  // Parse investor check size range
  const investorMin = investor.check_size_min ?? 0;
  const investorMax = investor.check_size_max ?? Infinity;

  // Perfect fit in range
  if (companyAsk >= investorMin && companyAsk <= investorMax) {
    return 100;
  }

  // Outside range - calculate how far off
  if (companyAsk < investorMin) {
    const ratio = companyAsk / investorMin;
    return Math.max(30, 100 * ratio); // At least 30%
  } else {
    const ratio = investorMax / companyAsk;
    return Math.max(30, 100 * ratio); // At least 30%
  }
}

/**
 * Geography Matching
 */
function scoreGeography(
  investorGeographies: string[] | undefined,
  companyLocation: string | undefined
): number {
  if (!investorGeographies || !companyLocation) return 70; // neutral score

  const normalizedInvestorGeographies = investorGeographies.map(g => g.toLowerCase().trim());
  const normalizedCompanyLocation = companyLocation.toLowerCase().trim();

  // Exact or contains match
  if (normalizedInvestorGeographies.some(g => 
    normalizedCompanyLocation.includes(g) || g.includes(normalizedCompanyLocation)
  )) {
    return 100;
  }

  // Different region = medium score (assume they can invest)
  return 50;
}

/**
 * Investor Type Matching - Does company prefer this investor type?
 */
function scoreInvestorType(
  preferredTypes: string[] | undefined,
  investorFirm: string | undefined
): number {
  if (!preferredTypes || !investorFirm) return 70; // neutral score

  const normalizedPreferredTypes = preferredTypes.map(t => t.toLowerCase().trim());
  const normalizedFirm = investorFirm.toLowerCase().trim();

  // Check for keywords like "VC", "PE", "Angel", "Strategic"
  if (normalizedPreferredTypes.some(t => normalizedFirm.includes(t) || t.includes(normalizedFirm))) {
    return 100;
  }

  // Not explicitly mentioned
  return 60;
}

/**
 * Parse capital amount from strings like "$5M", "5 million", "500k"
 */
function parseCapitalAmount(amount: string): number | null {
  if (!amount) return null;

  const normalized = amount.toLowerCase().replace(/\s+/g, '');
  
  // Match patterns like 5m, 5M, 5 million, 500k, etc.
  const match = normalized.match(/^[\$]?(\d+(?:\.\d+)?)\s*([mk]|million|thousand)?/);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = match[2]?.toLowerCase() || '';

  if (unit === 'm' || unit === 'million') return value * 1_000_000;
  if (unit === 'k' || unit === 'thousand') return value * 1_000;
  return value;
}

/**
 * Determine confidence level based on data completeness
 */
function assessConfidence(investor: InvestorProfile, company: CompanyProfile): 'high' | 'medium' | 'low' {
  let dataPoints = 0;
  const maxDataPoints = 7;

  if (investor.sectors?.length) dataPoints++;
  if (investor.stages?.length) dataPoints++;
  if (investor.check_size_min && investor.check_size_max) dataPoints++;
  if (investor.geographies?.length) dataPoints++;
  if (company.sector) dataPoints++;
  if (company.stage) dataPoints++;
  if (company.capital_sought) dataPoints++;

  const completeness = dataPoints / maxDataPoints;
  if (completeness >= 0.75) return 'high';
  if (completeness >= 0.5) return 'medium';
  return 'low';
}

/**
 * Main Match Engine - Calculate compatibility score
 */
class MatchEngine {
  private cache = new MatchCache();

  /**
   * Calculate match score between investor and company
   */
  calculateMatch(investor: InvestorProfile, company: CompanyProfile): MatchScore {
    // Check cache first
    const cached = this.cache.get(investor.user_id, company.user_id);
    if (cached) return cached;

    // Calculate individual factor scores
    const sectorScore = scoreSector(investor.sectors, company.sector);
    const stageScore = scoreStage(investor.stages, company.stage);
    const ticketSizeScore = scoreTicketSize(investor, company.capital_sought);
    const geographyScore = scoreGeography(investor.geographies, company.hq_location);
    const investorTypeScore = scoreInvestorType(company.preferred_investor_types, investor.firm);

    // Calculate weighted overall score
    const overallScore = Math.round(
      sectorScore * SCORING_WEIGHTS.sector +
      stageScore * SCORING_WEIGHTS.stage +
      ticketSizeScore * SCORING_WEIGHTS.ticketSize +
      geographyScore * SCORING_WEIGHTS.geography +
      investorTypeScore * SCORING_WEIGHTS.investorType
    );

    const score: MatchScore = {
      overall: Math.min(100, Math.max(0, overallScore)),
      factors: {
        sector: Math.round(sectorScore),
        stage: Math.round(stageScore),
        ticketSize: Math.round(ticketSizeScore),
        geography: Math.round(geographyScore),
        investorType: Math.round(investorTypeScore),
      },
      confidence: assessConfidence(investor, company),
    };

    // Cache result
    this.cache.set(investor.user_id, company.user_id, score);

    return score;
  }

  /**
   * Batch calculate matches for multiple companies against one investor
   * Useful for search results and recommendations
   */
  batchCalculateMatches(
    investor: InvestorProfile,
    companies: CompanyProfile[]
  ): Array<CompanyProfile & { matchScore: MatchScore }> {
    return companies.map(company => ({
      ...company,
      matchScore: this.calculateMatch(investor, company),
    }));
  }

  /**
   * Clear cache - useful for testing or on-demand refresh
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats for monitoring
   */
  getCacheStats(): { size: number; ttlMs: number } {
    return {
      size: this.cache.size(),
      ttlMs: CACHE_TTL_MS,
    };
  }
}

// Export singleton instance
export const matchEngine = new MatchEngine();

export default matchEngine;
