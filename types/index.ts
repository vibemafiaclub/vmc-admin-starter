export type AnalysisStatus = 'pending' | 'running' | 'completed' | 'failed';
export type RiskLevel = 'low' | 'medium' | 'high';
export type Recommendation = 'approved' | 'rejected' | 'need_info';
export type PerspectiveKey = 'identity' | 'industry' | 'reputation' | 'documents';
export type PerspectiveStatus = 'completed' | 'failed';

export type Merchant = {
  id: number; name: string; business_number: string;
  representative: string | null; category: string;
  address: string | null; submitted_docs: string | null; created_at: string;
};

export type PerspectiveResult = {
  key: PerspectiveKey; title: string;
  findings: string; risk_level: RiskLevel; status: PerspectiveStatus;
};

export type Analysis = {
  id: number; merchant_id: number; status: AnalysisStatus;
  risk_grade: RiskLevel | null; recommendation: Recommendation | null;
  perspectives: string | null; report: string | null;
  final_decision: Recommendation | null; decision_memo: string | null;
  decided_by: string | null; decided_at: string | null; created_at: string;
};

export type AnalysisWithMerchant = Analysis & {
  merchant_name: string; merchant_category: string; business_number: string;
  representative: string | null; address: string | null; submitted_docs: string | null;
};

export type Guideline = { id: number; key: string; title: string; content: string; updated_at: string };

export type GuidelineUpdate = Pick<Guideline, 'title' | 'content'>;

export type MerchantListItem = Pick<Merchant, 'id' | 'name' | 'business_number' | 'category'>;

export type AnalysisListItem = Pick<
  Analysis,
  'id' | 'status' | 'risk_grade' | 'recommendation' | 'final_decision' | 'created_at' | 'merchant_id'
> & { merchant_name: string; merchant_category: string };

export type MerchantAnalysisHistoryItem = Pick<
  Analysis,
  'id' | 'status' | 'risk_grade' | 'recommendation' | 'final_decision' | 'created_at'
>;

export type MerchantWithHistory = Merchant & { analyses: MerchantAnalysisHistoryItem[] };

export type CreateAnalysisResponse = { analysisId: number };

export type PerspectiveStartEvent = Pick<PerspectiveResult, 'key' | 'title'>;

export type PerspectiveDoneEvent = Pick<PerspectiveResult, 'key' | 'title' | 'risk_level' | 'status'>;

export type AnalysisRunResult = {
  risk_grade: RiskLevel;
  recommendation: Recommendation;
  perspectives: PerspectiveResult[];
  report: string;
};

export type DecisionInput = { final_decision: Recommendation; decision_memo: string | null };

export type DecisionResult = Pick<Analysis, 'final_decision' | 'decision_memo' | 'decided_by' | 'decided_at'>;

export type DashboardData = {
  pending_decision: number;
  high_risk: number;
  throughput: { today: number; week: number };
  recommendation_dist: Record<Recommendation, number>;
  recent: AnalysisListItem[];
};
