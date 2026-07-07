'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken, getToken } from '@/lib/api';
import { useEffect, useState } from 'react';

const links = [
  ['/dashboard', 'Дашборд'],
  ['/projects', 'Проекты'],
  ['/search', 'Поиск'],
  ['/users', 'Пользователи'],
  ['/scan', 'Сканирование'],
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken() && !path.startsWith('/login') && !path.startsWith('/box/')) router.replace('/login');
    setReady(true);
  }, [path, router]);

  if (!ready) return null;
  if (path.startsWith('/login') || path.startsWith('/box/')) return <>{children}</>;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">STEM WMS</div>
        <nav className="nav">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className={path === href ? 'active' : ''}>{label}</Link>
          ))}
        </nav>
        <button className="btn ghost" style={{ margin: '20px 24px' }} onClick={() => { clearToken(); router.push('/login'); }}>
          Выйти
        </button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
