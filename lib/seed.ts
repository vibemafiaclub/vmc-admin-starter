import Database from 'better-sqlite3'

export function seedDemoData(db: Database.Database): void {
  const count = (db.prepare('SELECT COUNT(*) as cnt FROM inquiries').get() as { cnt: number }).cnt
  if (count > 0) return

  db.transaction(() => {
    _seedInquiries(db)
    _seedProjects(db)
    _seedEvents(db)
    _seedEmails(db)
  })()
}

function _seedInquiries(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO inquiries
      (id, company, category, status, received_at, estimated_value, assignee,
       contact_name, contact_email, contact_phone, notes)
    VALUES
      (@id, @company, @category, @status, @received_at, @estimated_value, @assignee,
       @contact_name, @contact_email, @contact_phone, @notes)
  `)

  const rows = [
    { id: '001', company: '퓨처테크 주식회사', category: 'B2B교육', status: 'in_progress', received_at: '2026-04-15', estimated_value: 12000000, assignee: 'admin', contact_name: '김지훈', contact_email: 'jhkim@futuretech.co.kr', contact_phone: '010-1234-5678', notes: null },
    { id: '002', company: '그린컨설팅 그룹', category: 'AX컨설팅', status: 'received', received_at: '2026-05-02', estimated_value: 8000000, assignee: 'admin', contact_name: '박미래', contact_email: 'mirae@greenconsulting.kr', contact_phone: '010-9876-5432', notes: null },
    { id: '003', company: '미래에셋 교육원', category: '강연의뢰', status: 'completed', received_at: '2026-03-20', estimated_value: 3000000, assignee: 'admin', contact_name: '이서준', contact_email: 'sjlee@miraeasset-edu.com', contact_phone: '010-5555-1234', notes: null },
    { id: '004', company: '한국디지털혁신원', category: 'B2B교육', status: 'received', received_at: '2026-05-15', estimated_value: 20000000, assignee: 'admin', contact_name: '최민아', contact_email: 'minna@kdii.or.kr', contact_phone: '010-3333-7890', notes: null },
    { id: '005', company: '스타트업 코리아', category: '브랜디드콘텐츠협업', status: 'closed', received_at: '2026-02-10', estimated_value: 5000000, assignee: 'admin', contact_name: '정하늘', contact_email: 'haneul@startupkorea.com', contact_phone: '010-2222-4567', notes: null },
    { id: '006', company: '넥스트클래스', category: 'B2B교육', status: 'in_progress', received_at: '2026-06-01', estimated_value: 15000000, assignee: 'admin', contact_name: '강지수', contact_email: 'jisu@nextclass.io', contact_phone: '010-7777-3210', notes: null },
    { id: '007', company: '테크임팩트', category: 'AX컨설팅', status: 'received', received_at: '2026-06-10', estimated_value: 25000000, assignee: 'admin', contact_name: '윤태양', contact_email: 'taeyang@techimpact.co.kr', contact_phone: '010-1111-8888', notes: null },
    { id: '008', company: '소셜임팩트랩', category: '강연의뢰', status: 'received', received_at: '2026-06-20', estimated_value: 2000000, assignee: 'admin', contact_name: '송수빈', contact_email: 'subin@socialimpactlab.org', contact_phone: '010-4444-6789', notes: null },
    { id: '009', company: '에듀테크 파트너스', category: 'B2B교육', status: 'in_progress', received_at: '2026-06-25', estimated_value: 18000000, assignee: 'admin', contact_name: '한동훈', contact_email: 'dh.han@edutechpartners.kr', contact_phone: '010-6666-2345', notes: null },
    { id: '010', company: '디지털트랜스폼', category: 'AX컨설팅', status: 'received', received_at: '2026-06-28', estimated_value: 30000000, assignee: 'admin', contact_name: '오지민', contact_email: 'jimin.oh@digitaltransform.co.kr', contact_phone: '010-8888-9012', notes: null },
  ]
  for (const row of rows) insert.run(row)
}

function _seedProjects(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO projects (id, name, description, status, start_date, revenue)
    VALUES (@id, @name, @description, @status, @start_date, @revenue)
  `)

  const rows = [
    { id: 'futuretech-ai-workshop', name: '퓨처테크 AI 워크숍', description: '임직원 AI 활용 교육 2회 진행', status: 'active', start_date: '2026-07-01', revenue: 12000000 },
    { id: 'greenconsulting-ax', name: '그린컨설팅 AX 전략 수립', description: 'AI 전환 로드맵 컨설팅', status: 'active', start_date: '2026-06-01', revenue: 8000000 },
    { id: 'nextclass-curriculum', name: '넥스트클래스 커리큘럼 개발', description: '바이브코딩 입문 과정 설계', status: 'active', start_date: '2026-06-15', revenue: 15000000 },
    { id: 'miraeasset-lecture', name: '미래에셋 특강', description: 'AI 리터러시 임원 특강 1회', status: 'archived', start_date: '2026-04-10', revenue: 3000000 },
    { id: 'startupkorea-content', name: '스타트업코리아 콘텐츠', description: '유튜브 채널 협업 콘텐츠 제작', status: 'archived', start_date: '2026-03-01', revenue: 5000000 },
    { id: 'edutechpartners-b2b', name: '에듀테크 파트너스 B2B 교육', description: '사내 AI 실습 교육 프로그램', status: 'active', start_date: '2026-07-10', revenue: 18000000 },
  ]
  for (const row of rows) insert.run(row)
}

function _seedEvents(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT INTO events (title, type, date, time, duration_minutes, location, inquiry_id, project_id)
    VALUES (@title, @type, @date, @time, @duration_minutes, @location, @inquiry_id, @project_id)
  `)

  const rows = [
    { title: '퓨처테크 AI 교육 1회', type: '교육', date: '2026-07-01', time: '14:00', duration_minutes: 180, location: '퓨처테크 회의실', inquiry_id: '001', project_id: 'futuretech-ai-workshop' },
    { title: '퓨처테크 AI 교육 2회', type: '교육', date: '2026-07-08', time: '14:00', duration_minutes: 180, location: '퓨처테크 회의실', inquiry_id: '001', project_id: 'futuretech-ai-workshop' },
    { title: '그린컨설팅 킥오프 미팅', type: '미팅', date: '2026-06-05', time: '10:00', duration_minutes: 60, location: '온라인', inquiry_id: '002', project_id: 'greenconsulting-ax' },
    { title: '그린컨설팅 중간 보고', type: '미팅', date: '2026-06-25', time: '15:00', duration_minutes: 90, location: '그린컨설팅 본사', inquiry_id: '002', project_id: 'greenconsulting-ax' },
    { title: '넥스트클래스 디스커버리 콜', type: '콜', date: '2026-06-03', time: '11:00', duration_minutes: 30, location: null, inquiry_id: '006', project_id: 'nextclass-curriculum' },
    { title: '테크임팩트 상담 미팅', type: '미팅', date: '2026-06-18', time: '14:00', duration_minutes: 60, location: '온라인', inquiry_id: '007', project_id: null },
    { title: '소셜임팩트랩 강연 상담', type: '콜', date: '2026-06-22', time: '16:00', duration_minutes: 30, location: null, inquiry_id: '008', project_id: null },
    { title: '에듀테크 파트너스 교육 1회', type: '교육', date: '2026-07-10', time: '10:00', duration_minutes: 180, location: '에듀테크 파트너스 본사', inquiry_id: '009', project_id: 'edutechpartners-b2b' },
    { title: '에듀테크 파트너스 교육 2회', type: '교육', date: '2026-07-17', time: '10:00', duration_minutes: 180, location: '에듀테크 파트너스 본사', inquiry_id: '009', project_id: 'edutechpartners-b2b' },
    { title: '디지털트랜스폼 제안 미팅', type: '미팅', date: '2026-07-03', time: '13:00', duration_minutes: 60, location: '온라인', inquiry_id: '010', project_id: null },
  ]
  for (const row of rows) insert.run(row)
}

function _seedEmails(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT INTO emails
      (direction, subject, sender_name, sender_email, recipient_email, body, received_at, is_replied, priority, inquiry_id, draft_status)
    VALUES
      (@direction, @subject, @sender_name, @sender_email, @recipient_email, @body, @received_at, @is_replied, @priority, @inquiry_id, @draft_status)
  `)

  const rows = [
    {
      direction: 'inbound',
      subject: '[퓨처테크] AI 교육 워크숍 일정 협의 요청',
      sender_name: '김지훈',
      sender_email: 'jhkim@futuretech.co.kr',
      recipient_email: 'admin@example.com',
      body: '안녕하세요.\n\n퓨처테크 인사팀 김지훈입니다.\n\n저희 임직원 대상 AI 활용 워크숍을 7월 중 진행하고자 합니다.\n\n주 1회 오후 2~5시(3시간), 2주 연속 시행을 검토 중입니다.\n\n가능하신 일정을 확인해 주시면 감사하겠습니다.\n\n감사합니다.',
      received_at: '2026-06-10T09:30:00',
      is_replied: 1,
      priority: 'high',
      inquiry_id: '001',
      draft_status: null,
    },
    {
      direction: 'inbound',
      subject: 'RE: [퓨처테크] 7/1, 7/8 일정 확정 요청드립니다',
      sender_name: '김지훈',
      sender_email: 'jhkim@futuretech.co.kr',
      recipient_email: 'admin@example.com',
      body: '안녕하세요.\n\n회신 감사드립니다.\n\n내부 검토 결과 7/1(수), 7/8(수) 14:00~17:00으로 진행하면 좋겠습니다.\n\n참가 인원은 약 30명 예정이며, 사전 설문 배포 후 결과를 취합해 전달드리겠습니다.\n\n계약 및 정산 방식도 안내해 주시면 감사합니다.',
      received_at: '2026-06-15T14:00:00',
      is_replied: 1,
      priority: 'high',
      inquiry_id: '001',
      draft_status: null,
    },
    {
      direction: 'inbound',
      subject: '[그린컨설팅] AX 전략 컨설팅 문의드립니다',
      sender_name: '박미래',
      sender_email: 'mirae@greenconsulting.kr',
      recipient_email: 'admin@example.com',
      body: '안녕하세요.\n\n그린컨설팅 그룹 박미래입니다.\n\n저희 조직의 AI 전환(AX) 전략 수립을 위한 전문가 컨설팅을 검토 중입니다.\n\n간단한 통화로 방향을 먼저 논의할 수 있을까요?\n\n가능하신 시간을 알려주시면 일정을 맞춰보겠습니다.\n\n감사합니다.',
      received_at: '2026-05-20T11:00:00',
      is_replied: 1,
      priority: 'normal',
      inquiry_id: '002',
      draft_status: null,
    },
    {
      direction: 'inbound',
      subject: '[테크임팩트] AX 컨설팅 제안서 및 단가 요청',
      sender_name: '윤태양',
      sender_email: 'taeyang@techimpact.co.kr',
      recipient_email: 'admin@example.com',
      body: '안녕하세요.\n\n테크임팩트 전략기획팀 윤태양입니다.\n\n현재 저희 회사가 AI 도입을 적극 검토 중이며, 외부 전문가 컨설팅이 필요한 상황입니다.\n\n제안서와 단가 정보를 먼저 공유해 주실 수 있을까요?\n\n일정도 조율할 수 있으면 좋겠습니다.\n\n감사합니다.',
      received_at: '2026-06-18T10:15:00',
      is_replied: 0,
      priority: 'high',
      inquiry_id: '007',
      draft_status: null,
    },
    {
      direction: 'inbound',
      subject: '[소셜임팩트랩] 강연 의뢰 문의',
      sender_name: '송수빈',
      sender_email: 'subin@socialimpactlab.org',
      recipient_email: 'admin@example.com',
      body: '안녕하세요.\n\n소셜임팩트랩 송수빈입니다.\n\n다음 달 저희 단체 내부 세미나에서 AI와 사회적 임팩트를 주제로 강연을 부탁드리고 싶습니다.\n\n50분 내외의 강연이며, 온라인으로 진행할 예정입니다.\n\n검토해 주시면 감사하겠습니다.',
      received_at: '2026-06-25T16:00:00',
      is_replied: 0,
      priority: 'normal',
      inquiry_id: '008',
      draft_status: null,
    },
  ]
  for (const row of rows) insert.run(row)
}
