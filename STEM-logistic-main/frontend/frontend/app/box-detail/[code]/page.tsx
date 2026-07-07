'use client';
import Shell from '@/components/Shell';
import { api, publicLabelPdfUrl } from '@/lib/api';
import type { BoxOut, BoxEventOut } from '@/types';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function BoxDetailPage() {
  const { code } = useParams<{ code: string }>();
  const [box, setBox] = useState<BoxOut | null>(null);
  const [events, setEvents] = useState<BoxEventOut[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      const b = await api.box(code);
      setBox(b);
      const ev = await api.boxEvents(code);
      setEvents(ev);
    } catch (e) {
      setError('Коробка не найдена');
    }
  }

  useEffect(() => { load(); }, [code]);

  if (error) return <Shell><div className="error">{error}</div></Shell>;
  if (!box) return <Shell><p className="help">Загрузка...</p></Shell>;

  const eventLabels: Record<string, string> = {
    CREATED: 'Создана',
    WAREHOUSE_IN: 'Принята на склад',
    WAREHOUSE_OUT: 'Отгружена',
    DELIVERED: 'Доставлена',
    INVENTORY_FOUND: 'Найдена при ревизии',
    COMMENT: 'Комментарий',
    UPDATED: 'Обновлена',
  };

  return (
    <Shell>
      <div className="top">
        <div>
          <h1 className="h1">{box.box_code}</h1>
          <p className="help">{box.label_text}</p>
        </div>
        <a className="btn black" href={publicLabelPdfUrl(box.public_token)} target="_blank">
          Печать QR
        </a>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        <section className="card">
          <h2>Информация</h2>
          <table className="table">
            <tbody>
              <tr><td style={{ color: '#9ca0aa', width: 140 }}>Код</td><td className="mono">{box.box_code}</td></tr>
              <tr><td style={{ color: '#9ca0aa' }}>Надпись</td><td>{box.label_text}</td></tr>
              <tr><td style={{ color: '#9ca0aa' }}>Статус</td><td><span className="badge green">{box.status}</span></td></tr>
              <tr><td style={{ color: '#9ca0aa' }}>Склад</td><td>{box.warehouse || '—'}</td></tr>
              <tr><td style={{ color: '#9ca0aa' }}>Локация</td><td>{box.current_location || '—'}</td></tr>
              <tr><td style={{ color: '#9ca0aa' }}>Коробка</td><td>{box.box_number}/{box.total_boxes}</td></tr>
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2>Содержимое</h2>
          {box.contents.length > 0 ? (
            <table className="table">
              <thead><tr><th>Товар</th><th>Кол-во</th><th>Ед.</th></tr></thead>
              <tbody>
                {box.contents.map(c => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.quantity}</td>
                    <td>{c.unit || 'шт'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="help">{box.contents_text || 'Не указано'}</p>
          )}
          {box.comment && (
            <div style={{ marginTop: 14 }}>
              <b>Комментарий:</b> {box.comment}
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <h2>История передвижений</h2>
        {events.length === 0 ? (
          <p className="help">Нет событий</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {events.map(event => (
              <div key={event.id} style={{
                display: 'grid', gridTemplateColumns: '180px 1fr auto',
                gap: 16, alignItems: 'center', padding: '14px 16px',
                background: '#f8f9fb', borderRadius: 12
              }}>
                <div>
                  <b>{eventLabels[event.event_type] || event.event_type}</b>
                  <div className="help">{new Date(event.created_at).toLocaleString('ru-RU')}</div>
                </div>
                <div>
                  <span className="help">{event.location || '—'}</span>
                  {event.comment && <div style={{ marginTop: 4 }}>{event.comment}</div>}
                </div>
                <div className="help" style={{ textAlign: 'right' }}>
                  {event.actor_id ? `ID: ${event.actor_id.slice(0, 8)}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}
