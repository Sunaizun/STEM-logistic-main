'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api, clearToken, getToken } from '@/lib/api';
import { useEffect, useState } from 'react';
import type { UserOut } from '@/types';

const allLinks: { href: string; label: string; roles?: string[] }[] = [
  { href: '/dashboard', label: 'Дашборд' },
  { href: '/projects', label: 'Проекты' },
  { href: '/search', label: 'Поиск' },
  { href: '/users', label: 'Пользователи', roles: ['ADMIN', 'MANAGER'] },
  { href: '/scan', label: 'Сканирование' },
];

const roleLabels: Record<string, string> = {
  ADMIN: 'Админ', MANAGER: 'Менеджер', WAREHOUSE: 'Складовщик', PN: 'ПН'
};

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<UserOut | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!getToken() && !path.startsWith('/login') && !path.startsWith('/box/')) {
      router.replace('/login');
      setReady(true);
      return;
    }
    if (getToken() && !path.startsWith('/login') && !path.startsWith('/box/')) {
      api.me().then(setUser).catch(() => {});
    }
    setReady(true);
  }, [path, router]);

  useEffect(() => { setMenuOpen(false); }, [path]);

  if (!ready) return null;
  if (path.startsWith('/login') || path.startsWith('/box/')) return <>{children}</>;

  const links = allLinks.filter(l => !l.roles || (user && l.roles.includes(user.role)));

  return (
    <div className="layout">
      <header className="topbar">
        <button className="burger" onClick={() => setMenuOpen(v => !v)} aria-label="Меню">
          <span /><span /><span />
        </button>
        <div className="brand">STEM WMS</div>
      </header>

      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand desktop-only">STEM WMS</div>
        <nav className="nav">
          {links.map(l => (
            <Link key={l.href} href={l.href} className={path === l.href ? 'active' : ''}>{l.label}</Link>
          ))}
        </nav>

        {user && (
          <Link
            href="/profile"
            className={path === '/profile' ? 'active' : ''}
            style={{ margin: '12px 24px', display: 'flex', flexDirection: 'column', gap: 2, textDecoration: 'none' }}
          >
            <span style={{ fontWeight: 600 }}>{user.name}</span>
            <span style={{ fontSize: 12, opacity: 0.7 }}>{roleLabels[user.role] || user.role}</span>
          </Link>
        )}

        <button className="btn ghost" style={{ margin: '8px 24px 20px' }} onClick={() => { clearToken(); router.push('/login'); }}>
          Выйти
        </button>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
