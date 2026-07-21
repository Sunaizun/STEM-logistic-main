'use client';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import type { UserOut } from '@/types';
import { useEffect, useState } from 'react';

const roleLabels: Record<string, string> = {
  ADMIN: 'Админ', MANAGER: 'Менеджер', WAREHOUSE: 'Складовщик', PN: 'ПН'
};

export default function ProfilePage() {
  const [user, setUser] = useState<UserOut | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileMessage, setProfileMessage] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.me().then(u => {
      setUser(u);
      setName(u.name);
      setEmail(u.email || '');
      setPhone(u.phone || '');
    }).catch(() => {});
  }, []);

  async function saveProfile() {
    setProfileError(''); setProfileMessage('');
    if (!name || (!email && !phone)) { setProfileError('Укажите имя и email или телефон'); return; }
    try {
      const updated = await api.updateProfile({ name, email: email || undefined, phone: phone || undefined });
      setUser(updated);
      setProfileMessage('Данные обновлены');
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'Ошибка обновления');
    }
  }

  async function submitPasswordChange() {
    setError(''); setMessage('');
    if (newPassword.length < 6) { setError('Новый пароль должен быть не короче 6 символов'); return; }
    try {
      await api.changePassword({ old_password: oldPassword, new_password: newPassword });
      setMessage('Пароль успешно изменён');
      setOldPassword(''); setNewPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка смены пароля');
    }
  }

  if (!user) return null;

  return (
    <Shell>
      <div className="top">
        <div><h1 className="h1">Профиль</h1></div>
      </div>

      <section className="card" style={{ marginBottom: 18 }}>
        <h2>Данные</h2>
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          <div className="field"><label>Роль</label><div>{roleLabels[user.role] || user.role}</div></div>
          <div className="field"><label>Склад</label><div>{user.warehouse === 'ASTANA' ? 'Астана' : user.warehouse === 'ALMATY' ? 'Алматы' : '—'}</div></div>
        </div>
      </section>

      <button className="btn ghost" onClick={() => setShowSettings(v => !v)}>
        ⚙ Настройки {showSettings ? '▲' : '▼'}
      </button>

      {showSettings && (
        <>
          <section className="card" style={{ marginTop: 12 }}>
            <h2>Мои данные</h2>
            {profileError && <div className="error" style={{ marginTop: 12 }}>{profileError}</div>}
            {profileMessage && <div className="success" style={{ marginTop: 12 }}>{profileMessage}</div>}
            <div className="grid grid-2" style={{ marginTop: 12 }}>
              <div className="field"><label>Имя</label><input className="input" value={name} onChange={e => setName(e.target.value)} /></div>
              <div className="field"><label>Email</label><input className="input" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div className="field"><label>Телефон</label><input className="input" value={phone} onChange={e => setPhone(e.target.value)} /></div>
            </div>
            <div className="actions" style={{ marginTop: 12 }}>
              <button className="btn black" onClick={saveProfile}>Сохранить</button>
            </div>
          </section>

          <section className="card" style={{ marginTop: 12 }}>
            <h2>Сменить пароль</h2>
            {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}
            {message && <div className="success" style={{ marginTop: 12 }}>{message}</div>}
            <div className="grid grid-2" style={{ marginTop: 12 }}>
              <div className="field"><label>Текущий пароль</label><input className="input" type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} /></div>
              <div className="field"><label>Новый пароль</label><input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
            </div>
            <div className="actions" style={{ marginTop: 12 }}>
              <button className="btn black" onClick={submitPasswordChange}>Сохранить</button>
            </div>
          </section>
        </>
      )}
    </Shell>
  );
}