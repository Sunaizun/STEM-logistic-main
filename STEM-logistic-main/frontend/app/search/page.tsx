'use client';
import Shell from '@/components/Shell';
import { api, publicLabelPdfUrl } from '@/lib/api';
import type { BoxOut, BoxEventOut } from '@/types';
import { useState } from 'react';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BoxOut[]>([]);
  const [selected, setSelected] = useState<BoxOut | null>(null);
  const [events, setEvents] = useState<BoxEventOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setSelected(null);
    try {
      const token = localStorage.getItem('stem_wms_token');
      const res = await fetch(`http://localhost:8000/boxes/search/?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Ошибка');
      setResults(await res.json());
    } catch (e) {
      setError('Ошибка поиска');
    } finally {
      setLoading(false);
    }
  }

  async function showDetail(box: BoxOut) {
    setSelected(box);
    try {
      const ev = await api.boxEvents(box.box_code);
      setEvents(ev);
    } catch (e) {
      setEvents([]);
    }
  }

  const eventLabels: Record<string, string> = {
    CREATED: 'Создана',
    WAREHOUSE_IN: 'Принята на склад',
    WAREHOUSE_OUT: 'Отгружена',
    DELIVERED: 'Доставлена',
    COMMENT: 'Комментарий',
    UPDATED: 'Обновлена',
  };

  const eventColors: Record<string, string> = {
    CREATED: '#d9fff3',
    WAREHOUSE_IN: '#d9fff3',
    WAREHOUSE_OUT: '#fff0d7',
    DELIVERED: '#dcfce7',
    COMMENT: '#f1f5f9',
    UPDATED: '#f1f5f9',
  };

  return (
    <Shell>
      <div className="top">
        <div><h1 className="h1">Поиск</h1><p className="help">По коду коробки или проекту</p></div>
      </div>

      <section className="card">
        <div className="field">
          <input className="input mono" value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="BX-000123 или 78/09/Абай..." />
        </div>
        <div className="actions">
          <button className="btn black" onClick={search} disabled={loading}>Найти</button>
          {results.length > 0 && <button className="btn ghost" onClick={() => { setResults([]); setSelected(null); }}>Очистить</button>}
        </div>
      </section>

      {error && <div className="error">{error}</div>}

      {results.length > 0 && !selected && (
        <section className="card" style={{ marginTop: 18 }}>
          <h2>Найдено: {results.length} коробок</h2>
          <table className="table">
            <thead><tr><th>Код</th><th>Проект</th><th>Содержимое</th><th>Статус</th><th>QR</th></tr></thead>
            <tbody>
              {results.map(box => (
                <tr key={box.id} className="row-click" onClick={() => showDetail(box)} style={{ cursor: 'pointer' }}>
                  <td className="mono">{box.box_code}</td>
                  <td>{box.label_text}</td>
                  <td className="help">{box.contents_text || box.contents.map(c => c.name + ' x' + c.quantity).join(', ') || '—'}</td>
                  <td><span className={`badge ${box.status === 'DELIVERED' ? 'green' : box.status === 'SHIPPED' ? 'orange' : ''}`}>{box.status}</span></td>
                  <td><a className="btn ghost" href={publicLabelPdfUrl(box.public_token)} target="_blank" onClick={e => e.stopPropagation()} style={{ fontSize: 12, padding: '4px 8px' }}>PDF</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {selected && (
        <>
          <section className="card" style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>{selected.box_code}</h2>
                <p className="help">{selected.label_text}</p>
              </div>
              <div className="actions">
                <a className="btn ghost" href={publicLabelPdfUrl(selected.public_token)} target="_blank">PDF</a>
                <button className="btn ghost" onClick={() => setSelected(null)}>← Назад</button>
              </div>
            </div>
            <table className="table" style={{ marginTop: 14 }}>
              <tbody>
                <tr><td style={{ color: '#9ca0aa', width: 120 }}>Статус</td><td><span className="badge green">{selected.status}</span></td></tr>
                <tr><td style={{ color: '#9ca0aa' }}>Склад</td><td>{selected.warehouse || '—'}</td></tr>
                <tr><td style={{ color: '#9ca0aa' }}>Локация</td><td>{selected.current_location || '—'}</td></tr>
                <tr><td style={{ color: '#9ca0aa' }}>Коробка</td><td>{selected.box_number}/{selected.total_boxes}</td></tr>
                <tr><td style={{ color: '#9ca0aa' }}>Содержимое</td><td>{selected.contents_text || selected.contents.map(c => c.name + ' — ' + c.quantity + ' ' + (c.unit || 'шт')).join('\n')}</td></tr>
                {selected.comment && <tr><td style={{ color: '#9ca0aa' }}>Комментарий</td><td>{selected.comment}</td></tr>}
              </tbody>
            </table>
          </section>

          <section className="card" style={{ marginTop: 18 }}>
            <h2>История передвижений</h2>
            {events.length === 0 ? (
              <p className="help">Нет событий</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {events.map(event => (
                  <div key={event.id} style={{
                    background: eventColors[event.event_type] || '#f8f9fb',
                    borderRadius: 12,
                    padding: '14px 16px',
                    display: 'grid',
                    gridTemplateColumns: '160px 1fr auto',
                    gap: 14,
                    alignItems: 'center',
                    borderLeft: '4px solid ' + (event.event_type === 'DELIVERED' ? '#16a34a' : event.event_type === 'WAREHOUSE_OUT' ? '#f97316' : event.event_type === 'WAREHOUSE_IN' ? '#00a97f' : '#9ca0aa')
                  }}>
                    <div>
                      <b>{eventLabels[event.event_type] || event.event_type}</b>
                      <div className="help" style={{ fontSize: 12 }}>
                        {new Date(event.created_at).toLocaleString('ru-RU')}
                      </div>
                    </div>
                    <div>
                      {event.location && <span>{event.location}</span>}
                      {event.comment && <div className="help" style={{ marginTop: 4 }}>{event.comment}</div>}
                    </div>
                      <div style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>
                      {event.actor_name || '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </Shell>
  );
}
