'use client';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import type { UserOut, UserRole, WarehouseCode } from '@/types';
import { useEffect, useState } from 'react';

const roleLabels: Record<string, string> = {
  ADMIN: 'Админ', MANAGER: 'Менеджер', WAREHOUSE: 'Складовщик', PN: 'ПН'
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserOut[]>([]);
  const [currentUser, setCurrentUser] = useState<UserOut | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserOut | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'WAREHOUSE' as UserRole, warehouse: '' as WarehouseCode | '' });

  async function load() {
    try {
      const me = await api.me();
      setCurrentUser(me);
      setUsers(await api.users());
    } catch (e) { setError('Ошибка загрузки'); }
  }

  useEffect(() => { load(); }, []);

  async function createUser() {
    setError(''); setMessage('');
    if (!form.name || !form.email || !form.password) { setError('Заполните все поля'); return; }
    try {
      await api.createUser({ name: form.name, email: form.email, password: form.password, role: form.role, warehouse: form.warehouse || undefined });
      setMessage('Пользователь создан');
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'WAREHOUSE', warehouse: '' });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка'); }
  }

  async function deleteUser(userId: string) {
    if (!confirm('Удалить пользователя?')) return;
    try {
      await fetch(`http://localhost:8000/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('stem_wms_token')}` }
      });
      setMessage('Пользователь удалён');
      await load();
    } catch (e) { setError('Ошибка удаления'); }
  }

  function startEdit(user: UserOut) {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role, warehouse: user.warehouse || '' });
  }

  async function saveEdit() {
    if (!editingUser) return;
    setError(''); setMessage('');
    try {
      // Удаляем старого и создаём нового (простой способ обновления)
      await fetch(`http://localhost:8000/users/${editingUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('stem_wms_token')}` }
      });
      await api.createUser({ name: form.name, email: form.email, password: form.password || 'password123', role: form.role, warehouse: form.warehouse || undefined });
      setMessage('Пользователь обновлён');
      setEditingUser(null);
      setForm({ name: '', email: '', password: '', role: 'WAREHOUSE', warehouse: '' });
      await load();
    } catch (e) { setError('Ошибка обновления'); }
  }

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <Shell>
      <div className="top">
        <div><h1 className="h1">Пользователи</h1></div>
        {isAdmin && (
          <button className="btn black" onClick={() => { setShowForm(!showForm); setEditingUser(null); setForm({ name: '', email: '', password: '', role: 'WAREHOUSE', warehouse: '' }); }}>
            {showForm ? 'Отмена' : '+ Создать'}
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      {(showForm || editingUser) && isAdmin && (
        <section className="card" style={{ marginBottom: 18 }}>
          <h2>{editingUser ? 'Редактировать' : 'Новый пользователь'}</h2>
          <div className="grid grid-2">
            <div className="field"><label>Имя</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div className="field"><label>Email</label><input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} disabled={!!editingUser} /></div>
            <div className="field"><label>{editingUser ? 'Новый пароль' : 'Пароль'}</label><input className="input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder={editingUser ? 'Оставьте пустым' : ''} /></div>
            <div className="field"><label>Роль</label>
              <select className="select" value={form.role} onChange={e => setForm({...form, role: e.target.value as UserRole})}>
                {Object.entries(roleLabels).map(([r, l]) => <option key={r} value={r}>{l}</option>)}
              </select>
            </div>
            {form.role === 'WAREHOUSE' && (
              <div className="field"><label>Склад</label>
                <select className="select" value={form.warehouse} onChange={e => setForm({...form, warehouse: e.target.value as WarehouseCode})}>
                  <option value="">Выберите</option><option value="ASTANA">Астана</option><option value="ALMATY">Алматы</option>
                </select>
              </div>
            )}
          </div>
          <div className="actions" style={{ marginTop: 12 }}>
            <button className="btn black" onClick={editingUser ? saveEdit : createUser}>
              {editingUser ? 'Сохранить' : 'Создать'}
            </button>
            {editingUser && <button className="btn ghost" onClick={() => setEditingUser(null)}>Отмена</button>}
          </div>
        </section>
      )}

      <section className="card">
        <table className="table">
          <thead><tr><th>Имя</th><th>Email</th><th>Роль</th><th>Склад</th>{isAdmin && <th></th>}</tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className={isAdmin ? 'row-click' : ''} onClick={() => isAdmin && startEdit(u)} style={{ cursor: isAdmin ? 'pointer' : 'default' }}>
                <td>{u.name}</td>
                <td className="mono">{u.email}</td>
                <td><span className="badge gray">{roleLabels[u.role] || u.role}</span></td>
                <td>{u.warehouse === 'ASTANA' ? 'Астана' : u.warehouse === 'ALMATY' ? 'Алматы' : '—'}</td>
                {isAdmin && (
                  <td>
                    <button className="btn red" onClick={(e) => { e.stopPropagation(); deleteUser(u.id); }} style={{ fontSize: 12, padding: '4px 8px' }}>X</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Shell>
  );
}
