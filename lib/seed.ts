import Database from 'better-sqlite3';
import type { PerspectiveResult, Recommendation, RiskLevel } from '@/types';
import { computeVerdict } from '@/lib/risk';

type DemoMerchant = {
  name: string;
  business_number: string;
  representative: string;
  category: string;
  address: string;
  submitted_docs: string;
};

type DemoCompleted = {
  merchant: DemoMerchant;
  perspectives: PerspectiveResult[];
  report: string;
  decision?: { final_decision: Recommendation; decision_memo: string; decided_at: string };
};

const DEFAULT_REVIEWER = '김도현';

const GUIDELINES: { key: string; title: string; content: string }[] = [
  {
    key: 'identity',
    title: '신원 확인',
    content: '사업자등록번호, 대표자명, 법인 설립 이력 등 신원 정보의 유효성과 일관성을 확인하라. 입력 정보와 제출 서류 간 불일치, 허위 정보, 명의 도용 의심 등 이상 징후가 있는지 판단하라.',
  },
  {
    key: 'industry',
    title: '업종 위험도',
    content: '해당 업종의 일반적인 위험도를 평가하라. 도박·성인·대부·가상자산·다단계 등 고위험 또는 금칙 업종 여부를 반드시 확인하고, 중간 위험 업종(중고거래 중개, 건강기능식품 등)은 분쟁·환불·과장광고 가능성을 함께 살펴라.',
  },
  {
    key: 'reputation',
    title: '평판 분석',
    content: '상호명과 사업자 정보를 기반으로 부정적 평판, 민원, 사기 이력, 소비자 분쟁 정황을 평가하라. 실시간 외부 조회가 아닌 학습된 지식 범위의 추정이며, 근거가 약하면 단정하지 말고 보수적으로 판단하라.',
  },
  {
    key: 'documents',
    title: '서류 검토',
    content: '제출 서류(사업자등록증·통장사본·대표자 신분 정보 등)가 입력된 가맹점 정보와 일치하는지 대조하라. 필수 서류 누락, 정보 불일치, 정산 구조의 불투명성이 있는지 확인하라.',
  },
  {
    key: 'judgment',
    title: '종합 판정',
    content: '네 관점의 분석을 종합해 worst-wins 규칙으로 등급과 권고를 산출하라. 최고 위험도가 high이면 거절, medium이면 추가정보필요, 모두 low일 때만 승인을 권고한다. 실패하거나 누락된 관점이 있으면 절대 승인하지 말고 최소 추가정보필요로 강등하라.',
  },
];

function p(
  key: PerspectiveResult['key'],
  title: string,
  findings: string,
  risk_level: RiskLevel,
): PerspectiveResult {
  return { key, title, findings, risk_level, status: 'completed' };
}

const COMPLETED: DemoCompleted[] = [
  {
    merchant: {
      name: '푸른들판 농산물마트',
      business_number: '215-87-43621',
      representative: '정현우',
      category: '일반 소매 (식품·농산물)',
      address: '경기도 수원시 팔달구 매산로 33',
      submitted_docs: '사업자등록증, 통장사본, 대표자 신분증 사본. 오프라인 식자재 소매 매장 운영, 월 매출 약 4,200만원.',
    },
    perspectives: [
      p('identity', '신원 확인', '사업자등록번호와 대표자명이 제출 서류와 일치하며, 2019년 개업 이후 동일 명의로 안정적으로 운영되고 있다. 신원 관련 이상 징후는 발견되지 않았다.', 'low'),
      p('industry', '업종 위험도', '식품·농산물 일반 소매업으로 금칙·고위험 업종에 해당하지 않는다. 결제 분쟁 가능성이 낮은 저위험 업종이다.', 'low'),
      p('reputation', '평판 분석', '상호 및 대표자 관련 부정적 민원이나 사기 이력 정황이 확인되지 않는다. 지역 소매 업체로 평판 위험은 낮다.', 'low'),
      p('documents', '서류 검토', '사업자등록증·통장사본·신분증 사본이 모두 제출되었고 입력 정보와 일치한다. 정산 계좌 명의도 사업자와 동일하다.', 'low'),
    ],
    report: '신원·업종·평판·서류 네 관점 모두 저위험으로 평가되었다. 식품 소매 업종 특성상 결제 위험이 낮고 제출 서류도 입력 정보와 완전히 일치한다. 승인을 권고한다.',
  },
  {
    merchant: {
      name: '코드런 온라인 아카데미',
      business_number: '120-86-77104',
      representative: '한수지',
      category: '온라인 교육 (IT 강의)',
      address: '서울특별시 강남구 테헤란로 152',
      submitted_docs: '사업자등록증, 통신판매업 신고증, 통장사본. 구독형 온라인 코딩 강의 플랫폼, 월 결제 건수 약 1,800건.',
    },
    perspectives: [
      p('identity', '신원 확인', '법인 사업자등록 정보와 대표자명이 제출 서류와 일치한다. 통신판매업 신고도 정상 등록되어 있어 신원 신뢰도가 높다.', 'low'),
      p('industry', '업종 위험도', '온라인 교육(콘텐츠 구독) 업종으로 고위험·금칙 업종이 아니다. 구독 해지·환불 관련 분쟁 가능성은 일반 수준으로 낮다.', 'low'),
      p('reputation', '평판 분석', '플랫폼 관련 중대한 소비자 분쟁이나 부정 이력 정황이 확인되지 않는다. 환불 정책이 명시되어 있어 평판 위험이 낮다.', 'low'),
      p('documents', '서류 검토', '사업자등록증·통신판매업 신고증·통장사본이 모두 제출되어 입력 정보와 일치한다. 누락 서류가 없다.', 'low'),
    ],
    report: '온라인 교육 콘텐츠 구독 모델로 네 관점 모두 저위험으로 평가되었다. 통신판매업 신고까지 완비되어 신원·서류 신뢰도가 높다. 승인을 권고한다.',
    decision: {
      final_decision: 'approved',
      decision_memo: 'AI 권고와 동일하게 승인 처리. 통신판매업 신고 및 환불 정책 확인 완료.',
      decided_at: '2026-06-28 14:30:00',
    },
  },
  {
    merchant: {
      name: '모아중고마켓',
      business_number: '514-81-92076',
      representative: '오세형',
      category: '중고거래 중개 플랫폼',
      address: '인천광역시 연수구 컨벤시아대로 165',
      submitted_docs: '사업자등록증, 통신판매중개업 신고증, 통장사본. 개인 간 중고물품 거래 중개 및 에스크로 정산 제공.',
    },
    perspectives: [
      p('identity', '신원 확인', '사업자 및 대표자 신원 정보가 제출 서류와 일치한다. 신원 자체의 이상 징후는 없다.', 'low'),
      p('industry', '업종 위험도', '개인 간 중고거래 중개 업종으로, 거래 분쟁·장물 유입·미배송 등 중간 수준의 결제 분쟁 위험이 내재한다. 금칙 업종은 아니나 모니터링이 필요하다.', 'medium'),
      p('reputation', '평판 분석', '플랫폼 관련 중대한 사기 이력은 확인되지 않으나, 중개 플랫폼 특성상 거래 분쟁 민원이 산발적으로 발생할 수 있다.', 'low'),
      p('documents', '서류 검토', '필수 서류는 제출되었으나 에스크로 정산 흐름과 판매자 정산 주기에 대한 보강 자료가 필요하다.', 'low'),
    ],
    report: '업종 위험도가 중간으로 평가되어 종합 등급은 중위험이다. 중고거래 중개 특성상 거래 분쟁 가능성이 있어 정산 구조에 대한 추가 자료 확인을 권고한다.',
  },
  {
    merchant: {
      name: '스피드캐시 대부중개',
      business_number: '312-88-65009',
      representative: '배준영',
      category: '대부·소액대출 중개',
      address: '부산광역시 부산진구 중앙대로 708',
      submitted_docs: '사업자등록증, 대부중개업 등록증, 통장사본. 온라인 소액 단기 대출 중개 및 광고 대행.',
    },
    perspectives: [
      p('identity', '신원 확인', '사업자 및 대표자 신원은 제출 서류와 일치하나, 대부중개업 등록 정보의 지속적 유효성에 대한 추가 확인이 필요하다.', 'low'),
      p('industry', '업종 위험도', '대부·소액대출 중개는 PG 정책상 고위험 금융 업종으로, 고금리 분쟁·불완전판매·민원 다발 가능성이 높다. 금칙성에 준하는 고위험 업종이다.', 'high'),
      p('reputation', '평판 분석', '유사 상호 및 대부 중개 업종 전반에서 소비자 민원과 부정적 정황이 빈번하게 보고되는 영역으로, 평판 위험이 중간 이상으로 평가된다.', 'medium'),
      p('documents', '서류 검토', '제출 서류는 형식적으로 구비되어 있으나, 광고 대행 수익 구조와 정산 흐름의 투명성에 대한 검증이 추가로 필요하다.', 'low'),
    ],
    report: '업종 위험도가 high로 평가되어 worst-wins 규칙에 따라 종합 등급은 고위험이다. 대부 중개는 PG 컴플라이언스 정책상 고위험 금융 업종으로 거절을 권고한다.',
  },
];

const PENDING: DemoMerchant[] = [
  {
    name: '골든럭 게임랜드',
    business_number: '127-86-31845',
    representative: '신동하',
    category: '온라인 게임 아이템 환전 (도박성 의심)',
    address: '서울특별시 마포구 양화로 45',
    submitted_docs: '사업자등록증, 통장사본. 온라인 게임 아이템 거래 및 환전 서비스, 베팅성 미니게임 포함 의심.',
  },
  {
    name: '헬시라이프 건강식품',
    business_number: '610-82-40338',
    representative: '문가영',
    category: '건강기능식품 판매',
    address: '대전광역시 유성구 대학로 99',
    submitted_docs: '사업자등록증, 건강기능식품 판매업 신고증, 통장사본. 온라인 건강기능식품 쇼핑몰, 정기구독 상품 포함.',
  },
];

export function seedDemoData(db: Database.Database): void {
  const count = (db.prepare('SELECT COUNT(*) as cnt FROM merchants').get() as { cnt: number }).cnt;
  if (count > 0) return;

  const insertMerchant = db.prepare(`
    INSERT INTO merchants (name, business_number, representative, category, address, submitted_docs)
    VALUES (@name, @business_number, @representative, @category, @address, @submitted_docs)
  `);
  const insertCompleted = db.prepare(`
    INSERT INTO analyses
      (merchant_id, status, risk_grade, recommendation, perspectives, report, final_decision, decision_memo, decided_by, decided_at)
    VALUES
      (@merchant_id, 'completed', @risk_grade, @recommendation, @perspectives, @report, @final_decision, @decision_memo, @decided_by, @decided_at)
  `);
  const insertPending = db.prepare(`
    INSERT INTO analyses (merchant_id, status) VALUES (@merchant_id, 'pending')
  `);
  const insertGuideline = db.prepare(`
    INSERT INTO guidelines (key, title, content) VALUES (@key, @title, @content)
  `);
  const insertSetting = db.prepare(`
    INSERT INTO settings (key, value) VALUES (@key, @value)
  `);

  db.transaction(() => {
    for (const c of COMPLETED) {
      const { lastInsertRowid } = insertMerchant.run(c.merchant);
      const { risk_grade, recommendation } = computeVerdict(c.perspectives);
      insertCompleted.run({
        merchant_id: lastInsertRowid as number,
        risk_grade,
        recommendation,
        perspectives: JSON.stringify(c.perspectives),
        report: c.report,
        final_decision: c.decision?.final_decision ?? null,
        decision_memo: c.decision?.decision_memo ?? null,
        decided_by: c.decision ? DEFAULT_REVIEWER : null,
        decided_at: c.decision?.decided_at ?? null,
      });
    }

    for (const m of PENDING) {
      const { lastInsertRowid } = insertMerchant.run(m);
      insertPending.run({ merchant_id: lastInsertRowid as number });
    }

    for (const g of GUIDELINES) insertGuideline.run(g);

    insertSetting.run({ key: 'reviewer_name', value: DEFAULT_REVIEWER });
  })();
}
