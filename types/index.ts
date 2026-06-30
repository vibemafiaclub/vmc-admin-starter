export type Merchant = {
  id: number;
  name: string;
  business_number: string;
  category: string;
  address: string | null;
  submitted_docs: string | null;
  created_at: string;
};

export type AnalysisStatus = 'pending' | 'running' | 'completed' | 'failed';
export type Verdict = 'approved' | 'rejected' | 'need_info';

export type Analysis = {
  id: number;
  merchant_id: number;
  status: AnalysisStatus;
  perspectives: string | null;
  verdict: Verdict | null;
  report: string | null;
  created_at: string;
};

export type AnalysisWithMerchant = Analysis & {
  merchant_name: string;
  merchant_category: string;
};

export type PerspectiveResult = {
  key: string;
  title: string;
  findings: string;
  risk_level: 'low' | 'medium' | 'high';
};

export type Guideline = {
  id: number;
  key: string;
  title: string;
  content: string;
  updated_at: string;
};
