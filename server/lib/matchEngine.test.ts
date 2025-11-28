#!/usr/bin/env ts-node
/**
 * Match Engine Implementation - Test Suite
 * 
 * Tests the complete match engine functionality end-to-end
 */

import { matchEngine, InvestorProfile, CompanyProfile, MatchScore } from '../server/lib/matchEngine';

// ============================================
// TEST CASES
// ============================================

/**
 * Test Case 1: Perfect Match
 */
function testPerfectMatch() {
  console.log('\n=== TEST 1: Perfect Match ===');
  
  const investor: InvestorProfile = {
    user_id: 'investor-1',
    firm: 'Acme VC',
    sectors: ['SaaS'],
    stages: ['Series A'],
    check_size_min: 1000000,
    check_size_max: 5000000,
    geographies: ['United States'],
  };

  const company: CompanyProfile = {
    user_id: 'company-1',
    sector: 'SaaS',
    stage: 'Series A',
    capital_sought: '$2M',
    hq_location: 'San Francisco, USA',
    preferred_investor_types: ['VC'],
  };

  const score = matchEngine.calculateMatch(investor, company);
  console.log('Result:', {
    overall: score.overall,
    factors: score.factors,
    confidence: score.confidence,
  });
  
  if (score.overall >= 95) {
    console.log('✓ PASS: Perfect match scored ≥95%');
  } else {
    console.log(`✗ FAIL: Expected ≥95%, got ${score.overall}%`);
  }
}

/**
 * Test Case 2: Partial Match
 */
function testPartialMatch() {
  console.log('\n=== TEST 2: Partial Match ===');
  
  const investor: InvestorProfile = {
    user_id: 'investor-2',
    firm: 'Health Ventures',
    sectors: ['Healthcare', 'Biotech'],
    stages: ['Seed', 'Series A'],
    check_size_min: 500000,
    check_size_max: 3000000,
    geographies: ['United States', 'Europe'],
  };

  const company: CompanyProfile = {
    user_id: 'company-2',
    sector: 'Medical Devices',
    stage: 'Series A',
    capital_sought: '$1.5M',
    hq_location: 'Berlin, Germany',
  };

  const score = matchEngine.calculateMatch(investor, company);
  console.log('Result:', {
    overall: score.overall,
    factors: score.factors,
    confidence: score.confidence,
  });
  
  if (score.overall >= 70 && score.overall < 100) {
    console.log(`✓ PASS: Partial match scored ${score.overall}%`);
  } else {
    console.log(`✗ FAIL: Expected 70-99%, got ${score.overall}%`);
  }
}

/**
 * Test Case 3: Poor Match
 */
function testPoorMatch() {
  console.log('\n=== TEST 3: Poor Match ===');
  
  const investor: InvestorProfile = {
    user_id: 'investor-3',
    firm: 'SaaS Specialists',
    sectors: ['SaaS'],
    stages: ['Series B', 'Series C'],
    check_size_min: 5000000,
    check_size_max: 50000000,
  };

  const company: CompanyProfile = {
    user_id: 'company-3',
    sector: 'Agriculture',
    stage: 'Seed',
    capital_sought: '$500k',
  };

  const score = matchEngine.calculateMatch(investor, company);
  console.log('Result:', {
    overall: score.overall,
    factors: score.factors,
    confidence: score.confidence,
  });
  
  if (score.overall < 50) {
    console.log(`✓ PASS: Poor match scored ${score.overall}%`);
  } else {
    console.log(`✗ FAIL: Expected <50%, got ${score.overall}%`);
  }
}

/**
 * Test Case 4: Caching
 */
function testCaching() {
  console.log('\n=== TEST 4: Caching ===');
  
  const investor: InvestorProfile = {
    user_id: 'investor-4',
    firm: 'Test VC',
    sectors: ['Tech'],
    stages: ['Series A'],
    check_size_min: 1000000,
    check_size_max: 5000000,
  };

  const company: CompanyProfile = {
    user_id: 'company-4',
    sector: 'Tech',
    stage: 'Series A',
    capital_sought: '$2M',
  };

  // Clear cache first
  matchEngine.clearCache();
  let stats = matchEngine.getCacheStats();
  console.log('Initial cache size:', stats.size);

  // First calculation
  const start1 = Date.now();
  const score1 = matchEngine.calculateMatch(investor, company);
  const time1 = Date.now() - start1;

  // Second calculation (should be from cache)
  const start2 = Date.now();
  const score2 = matchEngine.calculateMatch(investor, company);
  const time2 = Date.now() - start2;

  stats = matchEngine.getCacheStats();
  console.log('Cache stats:', {
    size: stats.size,
    firstCalcTime: time1 + 'ms',
    cachedCalcTime: time2 + 'ms',
  });

  if (score1.overall === score2.overall && stats.size === 1) {
    console.log('✓ PASS: Caching works correctly');
  } else {
    console.log('✗ FAIL: Caching issue detected');
  }
}

/**
 * Test Case 5: Batch Processing
 */
function testBatchProcessing() {
  console.log('\n=== TEST 5: Batch Processing ===');
  
  const investor: InvestorProfile = {
    user_id: 'investor-5',
    firm: 'Batch Test VC',
    sectors: ['SaaS', 'Healthcare'],
    stages: ['Series A', 'Series B'],
    check_size_min: 1000000,
    check_size_max: 10000000,
  };

  const companies: CompanyProfile[] = [
    {
      user_id: 'company-5a',
      sector: 'SaaS',
      stage: 'Series A',
      capital_sought: '$3M',
    },
    {
      user_id: 'company-5b',
      sector: 'Healthcare',
      stage: 'Series B',
      capital_sought: '$5M',
    },
    {
      user_id: 'company-5c',
      sector: 'Retail',
      stage: 'Seed',
      capital_sought: '$500k',
    },
  ];

  matchEngine.clearCache();
  const start = Date.now();
  const results = matchEngine.batchCalculateMatches(investor, companies);
  const time = Date.now() - start;

  console.log('Batch processing results:', {
    count: results.length,
    time: time + 'ms',
    scores: results.map(r => r.matchScore?.overall),
    sorted: results[0].matchScore!.overall >= results[1].matchScore!.overall,
  });

  if (results.length === 3 && results[0].matchScore!.overall >= results[2].matchScore!.overall) {
    console.log('✓ PASS: Batch processing works correctly');
  } else {
    console.log('✗ FAIL: Batch processing issue detected');
  }
}

/**
 * Test Case 6: Missing Data Handling
 */
function testMissingDataHandling() {
  console.log('\n=== TEST 6: Missing Data Handling ===');
  
  const investor: InvestorProfile = {
    user_id: 'investor-6',
    // Minimal data
    firm: 'Minimal VC',
  };

  const company: CompanyProfile = {
    user_id: 'company-6',
    // Minimal data
    sector: 'Tech',
  };

  const score = matchEngine.calculateMatch(investor, company);
  console.log('Result with minimal data:', {
    overall: score.overall,
    confidence: score.confidence,
  });

  if (score.overall >= 0 && score.overall <= 100 && score.confidence === 'low') {
    console.log('✓ PASS: Handles missing data gracefully');
  } else {
    console.log('✗ FAIL: Missing data handling issue');
  }
}

// ============================================
// RUN ALL TESTS
// ============================================

function runAllTests() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Match Engine Test Suite                  ║');
  console.log('╚════════════════════════════════════════════╝');

  try {
    testPerfectMatch();
    testPartialMatch();
    testPoorMatch();
    testCaching();
    testBatchProcessing();
    testMissingDataHandling();

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   All tests completed!                     ║');
    console.log('╚════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n✗ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this is executed directly
if (require.main === module) {
  runAllTests();
}

export { runAllTests };
