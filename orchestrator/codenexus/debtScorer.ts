export interface DebtScore {
  score: number;
  breakdown: {
    complexity: number;
    security: number;
    coverage: number;
    standards: number;
  };
}

export class DebtScorer {
  compute(context: { 
    reviewIssues: any[]; 
    securityResult: any; 
    testResult: any;
  }): DebtScore {
    console.log('[DebtScorer] Computing technical debt score...');
    
    const complexityScore = Math.max(0, 100 - (context.reviewIssues.length * 5));
    const securityScore = context.securityResult.passed ? 100 : 50;
    const coverageScore = context.testResult.success ? 100 : 0;
    const standardsScore = 90; // Fixed baseline for now
    
    const overallScore = (complexityScore + securityScore + coverageScore + standardsScore) / 4;
    
    return {
      score: overallScore,
      breakdown: {
        complexity: complexityScore,
        security: securityScore,
        coverage: coverageScore,
        standards: standardsScore
      }
    };
  }
}
