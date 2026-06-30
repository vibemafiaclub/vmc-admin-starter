import type { Metadata } from 'next';
import { IBM_Plex_Sans_KR, JetBrains_Mono } from 'next/font/google';
import { NavLink } from '@/components/ui/NavLink';
import { LayoutDashboard, FilePlus, ClipboardList, Settings } from 'lucide-react';
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
  title: '가맹점 위험도 분석 시스템',
};

const navItems = [
  { href: '/', label: '대시보드', Icon: LayoutDashboard },
  { href: '/analyses/new', label: '신규 분석', Icon: FilePlus },
  { href: '/analyses', label: '분석 내역', Icon: ClipboardList },
  { href: '/guidelines', label: '세부 지침', Icon: Settings },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${sans.variable} ${mono.variable} font-sans antialiased`}>
        <aside className="fixed left-0 top-0 h-full w-52 bg-[#0a0a0a] flex flex-col">
          <div className="p-5 border-b border-white/10">
            <div className="text-white/40 text-xs font-mono tracking-widest uppercase mb-1">PG Compliance</div>
            <div className="text-white text-sm font-semibold">가맹점 위험도 분석</div>
          </div>
          <nav className="flex flex-col py-2 flex-1">
            {navItems.map(({ href, label, Icon }) => (
              <NavLink key={href} href={href}>
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="ml-52 min-h-screen bg-[#f5f5f5] p-8">{children}</main>
      </body>
    </html>
  );
}
