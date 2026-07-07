'use client';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import type { ProjectOut, UserOut } from '@/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/api';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectOut[]>([]);
  const [currentUser, setCurrentUser] = useState<UserOut | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ project_code: '', name: '', school_name: '' });

  useEffect(() => {
    api.projects().then(setProjects).catch(e => setError(e.message));
    api.me().then(setCurrentUser).catch(() => {});
  }, []);

  async function createProject() {
    if (!form.project_code.trim()) { setError('Введите код проекта'); return; }
    setError('');
    try {
      await api.createProject(form);
      setShowForm(false);
      setForm({ project_code: '', name: '', school_name: '' });
      setProjects(await api.projects());
      setMessage('Проект создан');
    } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка'); }
  }

  async function deleteProject(id: string, code: string) {
    if (!confirm('Удалить проект ' + code + ' и все его QR-коды?')) return;
    try {
      const token = localStorage.getItem('stem_wms_token');
      await fetch(`${API_URL}/projects/by-id/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Проект удалён');
      setProjects(await api.projects());
    } catch (e) { setError('Ошибка удаления'); }
  }

  const canDelete = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  return (
    <Shell>
      <div className="top">
        <div><h1 className="h1">Проекты</h1><p className="help">Управление проектами</p></div>
        <button className="btn black" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Отмена' : '+ Создать проект'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      {showForm && (
        <section className="card" style={{ marginBottom: 18 }}>
          <h2>Новый проект</h2>
          <div className="grid grid-2">
            <div className="field"><label>Код проекта *</label><input className="input mono" value={form.project_code} onChange={e => setForm({...form, project_code: e.target.value})} placeholder="78/09/Абай/БР/Г" /></div>
            <div className="field"><label>Название</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="STEM Academia" /></div>
            <div className="field"><label>Школа</label><input className="input" value={form.school_name} onChange={e => setForm({...form, school_name: e.target.value})} placeholder="Школа им. Абая" /></div>
          </div>
          <div className="actions" style={{ marginTop: 12 }}><button className="btn black" onClick={createProject}>Создать проект</button></div>
        </section>
      )}

      <section className="card">
        <table className="table">
          <thead><tr><th>Код</th><th>Название</th><th>Школа</th><th>Статус</th>{canDelete && <th></th>}</tr></thead>
          <tbody>
            {projects.length === 0 ? (
              <tr><td colSpan={canDelete ? 5 : 4} className="help" style={{textAlign:'center',padding:32}}>Нет проектов</td></tr>
            ) : projects.map(p => (
              <tr key={p.id}>
                <td className="mono"><Link href={`/projects/${p.id}`}>{p.project_code}</Link></td>
                <td>{p.name || '—'}</td>
                <td>{p.school_name || '—'}</td>
                <td><span className="badge green">{p.status}</span></td>
                {canDelete && (
                  <td>
                    <button className="btn red" onClick={() => deleteProject(p.id, p.project_code)} style={{ fontSize: 12, padding: '4px 8px' }}>X</button>
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
