'use client';
import { api, publicLabelPdfUrl, getToken } from '@/lib/api';
import type { BoxOut, BoxEventOut, UserOut } from '@/types';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PublicBoxPage() {
  const { token } = useParams<{ token: string }>();
  const [box, setBox] = useState<BoxOut | null>(null);
  const [events, setEvents] = useState<BoxEventOut[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<UserOut | null>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    api.publicBox(token).then(setBox).catch(e => setError('Коробка не найдена'));
    // Проверяем залогинен ли пользователь
    const tok = getToken();
    if (tok) {
      api.me().then(u => setCurrentUser(u)).catch(() => {});
    }
  }, [token]);

  async function loadEvents() {
    if (!box) return;
    try {
      const ev = await api.boxEvents(box.box_code);
      setEvents(ev);
    } catch (e) {}
  }

  useEffect(() => { loadEvents(); }, [box]);

  async function acceptDelivery() {
    if (!box) return;
    setError(''); setMessage('');
    try {
      const res = await api.scanBox({
        box_code: box.box_code,
        event_type: 'DELIVERED',
        location: 'Объект',
        comment: comment || 'Принято через QR'
      });
      if (res.success) {
        setMessage('Товар принят!');
        setBox(await api.publicBox(token));
        await loadEvents();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  async function reportProblem() {
    if (!box) return;
    setError(''); setMessage('');
    try {
      const res = await api.scanBox({
        box_code: box.box_code,
        event_type: 'COMMENT',
        location: 'Объект',
        comment: comment || 'Проблема с товаром'
      });
      if (res.success) {
        setMessage('Комментарий добавлен');
        await loadEvents();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  const isPN = currentUser?.role === 'PN';
  const isLoggedIn = !!currentUser;

  if (error && !box) return (
    <div className="login-page">
      <div className="card" style={{ width: 400, textAlign: 'center' }}>
        <h2>Коробка не найдена</h2>
        <p className="help">{error}</p>
      </div>
    </div>
  );

  if (!box) return (
    <div className="login-page">
      <div className="card" style={{ width: 400, textAlign: 'center' }}>
        <p className="help">Загрузка...</p>
      </div>
    </div>
  );

  const eventLabels: Record<string, string> = {
    CREATED: 'Создана',
    WAREHOUSE_IN: 'Принята на склад',
    WAREHOUSE_OUT: 'Отгружена',
    DELIVERED: 'Доставлена',
    COMMENT: 'Комментарий',
  };

  return (
    <div className="login-page" style={{ background: '#f4f5f7', padding: 20 }}>
      <div className="card" style={{ maxWidth: 700, width: '100%' }}>
        <h1 className="h1">{box.box_code}</h1>
        <p className="help">{box.label_text}</p>

        <table className="table" style={{ marginTop: 18 }}>
          <tbody>
            <tr><td style={{ color: '#9ca0aa', width: 120 }}>Статус</td><td><span className={`badge ${box.status === 'DELIVERED' ? 'green' : ''}`}>{box.status}</span></td></tr>
            <tr><td style={{ color: '#9ca0aa' }}>Склад</td><td>{box.warehouse === 'ASTANA' ? 'Астана' : box.warehouse === 'ALMATY' ? 'Алматы' : '—'}</td></tr>
            <tr><td style={{ color: '#9ca0aa' }}>Содержимое</td><td style={{ whiteSpace: 'pre-wrap' }}>{box.contents_text || box.contents.map(c => c.name + ' — ' + c.quantity + ' ' + (c.unit || 'шт')).join('\n') || '—'}</td></tr>
          </tbody>
        </table>

        {/* Для ПН — кнопки приёмки */}
        {isPN && box.status !== 'DELIVERED' && (
          <div className="card" style={{ marginTop: 18, background: '#f8fafc' }}>
            <h3>Приёмка товара</h3>
            <div className="field">
              <label>Комментарий</label>
              <input className="input" value={comment} onChange={e => setComment(e.target.value)} placeholder="Всё принято, без замечаний" />
            </div>
            <div className="actions">
              <button className="btn green" onClick={acceptDelivery}>Принять</button>
              <button className="btn orange" onClick={reportProblem}>Проблема</button>
            </div>
          </div>
        )}

        {/* Для гостей — предложение войти */}
        {!isLoggedIn && (
          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <a 
              href="/login?role=pn"
              className="btn black"
              style={{ padding: '14px 32px', fontSize: 16, textDecoration: 'none', display: 'inline-flex' }}
            >
              Войти как ПН для приёмки
            </a>
          </div>
        )}

        {message && <div className="success" style={{ marginTop: 12 }}>{message}</div>}
        {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}

        {/* История */}
        {events.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <h3>История</h3>
            {events.map(event => (
              <div key={event.id} style={{
                background: event.event_type === 'DELIVERED' ? '#dcfce7' : event.event_type === 'COMMENT' ? '#fff0d7' : '#f1f5f9',
                borderRadius: 8, padding: '10px 14px', marginBottom: 6,
                borderLeft: '4px solid ' + (event.event_type === 'DELIVERED' ? '#16a34a' : event.event_type === 'COMMENT' ? '#f97316' : '#9ca0aa')
              }}>
                <b>{eventLabels[event.event_type] || event.event_type}</b>
                <span className="help" style={{ marginLeft: 12 }}>
                  {new Date(event.created_at).toLocaleString('ru-RU')}
                </span>
                {event.comment && <div className="help">{event.comment}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
