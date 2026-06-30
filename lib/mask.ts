import type { MaskType } from '@/types';

// 가상 회사명 목록 (A-Z 26개, ID 해시로 일관성 유지)
const FAKE_COMPANY_NAMES = [
  '블루스카이 솔루션즈',
  '넥스트웨이브 테크',
  '그린라이트 파트너스',
  '퓨처비전 컨설팅',
  '알파테크 코리아',
  '스마트넥스트 주식회사',
  '테크브릿지 인터내셔널',
  '이노베이션허브',
  '글로벌파트너스 그룹',
  '씨앤씨 어드바이저리',
  '프라임솔루션 주식회사',
  '코어테크 코리아',
  '비전파트너스 그룹',
  '넥스젠 코리아',
  '오메가 솔루션즈',
  '테라솔루션 주식회사',
  '픽셀브릿지',
  '클라우드웨이 테크',
  '디지털파트너스',
  '스마트파워 코리아',
  '피크테크 솔루션',
  '인피니티 솔루션즈',
  '드림웨이브 컨설팅',
  '엑스트라 파트너스',
  '와이즈테크 코리아',
  '제트 이노베이션',
];

export function maskValue(value: string | null, type: MaskType, enabled: boolean): string | null {
  if (!enabled || value === null) {
    return value;
  }

  switch (type) {
    case 'company':
      return maskCompany('?', value, enabled);
    case 'name':
      return '담당자';
    case 'email':
      return '***@***.***';
    case 'phone':
      return '010-****-****';
    case 'location':
      return value;
    default:
      return value;
  }
}

export function maskCompany(id: string, company: string, enabled: boolean): string {
  if (!enabled) {
    return company;
  }
  let sum = 0;
  for (let i = 0; i < id.length; i++) {
    sum += id.charCodeAt(i);
  }
  const index = sum % FAKE_COMPANY_NAMES.length;
  return FAKE_COMPANY_NAMES[index];
}
