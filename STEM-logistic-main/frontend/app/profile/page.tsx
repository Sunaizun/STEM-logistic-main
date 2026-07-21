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

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileMessage, setProfileMessage] = useState('');

  const [showPasswordForm, setShowPasswordForm] = useState(false);
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
      setTimeout(() => setShowPasswordForm(false), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка смены пароля');
    }
  }

  if (!user) return null;
  const initial = user.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <Shell>
      <div className="top">
        <div><h1 className="h1">Профиль</h1></div>
      </div>

      <section className="card">
        <div className="profile-layout">
          <div className="profile-avatar-col">
            <div className="avatar-circle">{initial}</div>
            <div className="badge gray" style={{ marginTop: 12 }}>{roleLabels[user.role] || user.role}</div>
            {user.warehouse && (
              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>
                Склад: {user.warehouse === 'ASTANA' ? 'Астана' : 'Алматы'}
              </div>
            )}
          </div>

          <div className="profile-fields-col">
            {profileError && <div className="error">{profileError}</div>}
            {profileMessage && <div className="success">{profileMessage}</div>}

            <div className="profile-row">
              <label>Имя</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className="profile-row">
              <label>Email</label>
              <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="profile-row">
              <label>Телефон</label>
              <input className="input" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>

            <div className="profile-row">
              <label>Пароль</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input className="input" type="password" value="••••••••" disabled style={{ flex: 1 }} />
                <button className="btn ghost" onClick={() => setShowPasswordForm(v => !v)}>Изменить</button>
              </div>
            </div>

            {showPasswordForm && (
              <div className="password-inline">
                {error && <div className="error">{error}</div>}
                {message && <div className="success">{message}</div>}
                <div className="grid grid-2">
                  <div className="field"><label>Текущий пароль</label><input className="input" type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} /></div>
                  <div className="field"><label>Новый пароль</label><input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
                </div>
                <button className="btn black" onClick={submitPasswordChange}>Сохранить пароль</button>
              </div>
            )}

            <div className="actions" style={{ marginTop: 18 }}>
              <button className="btn black" onClick={saveProfile}>Сохранить изменения</button>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}