import type { PerspectiveResult, Recommendation, RiskLevel } from '@/types';

export function computeVerdict(
  perspectives: PerspectiveResult[],
): { risk_grade: RiskLevel; recommendation: Recommendation } {
  const levels = perspectives
    .filter((p) => p.status === 'completed')
    .map((p) => p.risk_level);

  let risk_grade: RiskLevel;
  let recommendation: Recommendation;
  if (levels.includes('high')) {
    risk_grade = 'high';
    recommendation = 'rejected';
  } else if (levels.includes('medium')) {
    risk_grade = 'medium';
    recommendation = 'need_info';
  } else {
    risk_grade = 'low';
    recommendation = 'approved';
  }

  const incomplete =
    perspectives.length < 4 || perspectives.some((p) => p.status !== 'completed');
  if (incomplete) {
    if (recommendation === 'approved') recommendation = 'need_info';
    if (risk_grade === 'low') risk_grade = 'medium';
  }

  return { risk_grade, recommendation };
}
