import type { Metadata } from 'next';
import { IBM_Plex_Sans_KR, JetBrains_Mono } from 'next/font/google';
import { NavLink } from '@/components/ui/NavLink';
import {
  LayoutDashboard,
  Kanban,
  Calendar,
  Sparkles,
  Mail,
} from 'lucide-react';
import { MaskToggle } from '@/components/ui/MaskToggle';
import './globals.css';

const sans = IBM_Plex_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VMC Admin',
  description: 'VIBE MAFIA CLUB 비즈니스 어드민',
};

const navItems = [
  { href: '/', label: '대시보드', Icon: LayoutDashboard },
  { href: '/board', label: '협업 보드', Icon: Kanban },
  { href: '/calendar', label: '캘린더', Icon: Calendar },
  { href: '/generate', label: 'AI 문서 생성', Icon: Sparkles },
  { href: '/inbox', label: '수신 메일함', Icon: Mail },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${sans.variable} ${mono.variable} font-sans antialiased`}>
        <aside className="fixed left-0 top-0 h-full w-56 bg-[#1C2333] flex flex-col">
          <div className="p-4 border-b border-white/10">
            <div className="text-white text-sm font-semibold mb-3">VMC Admin</div>
            <MaskToggle />
          </div>
          <nav className="flex flex-col py-2">
            {navItems.map(({ href, label, Icon }) => (
              <NavLink key={href} href={href}>
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="ml-56 min-h-screen bg-gray-50 p-6">{children}</main>
      </body>
    </html>
  );
}
