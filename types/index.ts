export type InquiryStatus = 'received' | 'in_progress' | 'completed' | 'closed';
export type ProjectStatus = 'active' | 'archived';
export type EventType = '교육' | '미팅' | '콜' | '기타';
export type DocumentType = '이메일' | '제안서' | 'PRD' | '슬라이드';
export type MaskType = 'company' | 'name' | 'email' | 'phone' | 'location';
export type BadgeColor = 'gray' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'teal' | 'pink' | 'slate' | 'indigo';

export interface Inquiry {
  id: string;
  company: string;
  category: string;
  status: InquiryStatus;
  received_at: string | null;
  estimated_value: number;
  assignee: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  revenue: number;
}

export interface CalendarEvent {
  id: number;
  title: string;
  type: EventType;
  date: string;
  time: string | null;
  duration_minutes: number;
  location: string | null;
  inquiry_id: string | null;
  project_id: string | null;
}

export interface Document {
  id: number;
  title: string;
  type: DocumentType;
  content: string | null;
  created_at: string;
  inquiry_id: string | null;
}

export interface Settings {
  masking_enabled: boolean;
}

export interface DashboardStats {
  active_inquiries: number;
  pipeline_total: number;
  active_projects: number;
  upcoming_events: number;
}

export type EmailDirection = 'inbound' | 'outbound';
export type EmailPriority = 'high' | 'normal' | 'low';
export type DraftStatus = 'approved' | 'rejected' | null;

export interface Email {
  id: number;
  direction: EmailDirection;
  subject: string;
  sender_name: string | null;
  sender_email: string | null;
  recipient_email: string | null;
  body: string | null;
  received_at: string;
  is_replied: number;
  priority: EmailPriority;
  inquiry_id: string | null;
  draft_status: DraftStatus;
}

export interface EmailChat {
  id: number;
  email_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  is_draft: number;
}
