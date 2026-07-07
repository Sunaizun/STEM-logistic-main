'use client';
import Shell from '@/components/Shell';
import { api, publicLabelPdfUrl } from '@/lib/api';
import type { BoxOut, BoxEventOut, ProjectOut, WarehouseCode } from '@/types';
import { useEffect, useState } from 'react';

const statusLabels: Record<string, string> = {
  CREATED: 'Создана', IN_WAREHOUSE: 'На складе', SHIPPED: 'Отгружена',
  DELIVERED: 'Доставлена', LOST: 'Потеряна', ARCHIVED: 'В архиве'
};

const statusColors: Record<string, string> = {
  CREATED: '#f1f5f9', IN_WAREHOUSE: '#d9fff3', SHIPPED: '#fff0d7',
  DELIVERED: '#dcfce7', LOST: '#ffe1e1', ARCHIVED: '#e5e7eb'
};

const eventLabels: Record<string, string> = {
  CREATED: 'Создана', WAREHOUSE_IN: 'Принята на склад', WAREHOUSE_OUT: 'Отгружена',
  DELIVERED: 'Доставлена', COMMENT: 'Комментарий', UPDATED: 'Обновлена',
};

export default function DashboardPage() {
  const [boxes, setBoxes] = useState<BoxOut[]>([]);
  const [filter, setFilter] = useState<WarehouseCode | 'ALL'>('ALL');
  const [selectedBox, setSelectedBox] = useState<BoxOut | null>(null);
  const [events, setEvents] = useState<BoxEventOut[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const token = localStorage.getItem('stem_wms_token');
      const res = await fetch(`http://localhost:8000/boxes/search/?q=`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setBoxes(await res.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function showDetail(box: BoxOut) {
    setSelectedBox(box);
    try { setEvents(await api.boxEvents(box.box_code)); } catch (e) { setEvents([]); }
  }

  const filtered = filter === 'ALL' ? boxes : boxes.filter(b => b.warehouse === filter);
  const astanaCount = boxes.filter(b => b.warehouse === 'ASTANA').length;
  const almatyCount = boxes.filter(b => b.warehouse === 'ALMATY').length;

  return (
    <Shell>
      <div className="top">
        <div><h1 className="h1">Дашборд</h1><p className="help">Обзор склада</p></div>
        <select className="select" value={filter} onChange={e => setFilter(e.target.value as WarehouseCode | 'ALL')}>
          <option value="ALL">Все склады ({boxes.length})</option>
          <option value="ASTANA">Астана ({astanaCount})</option>
          <option value="ALMATY">Алматы ({almatyCount})</option>
        </select>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 800 }}>{filtered.length}</div>
          <div className="help">Всего позиций</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 800 }}>{filtered.filter(b => b.status === 'IN_WAREHOUSE').length}</div>
          <div className="help">На складе</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 800 }}>{filtered.filter(b => b.status === 'SHIPPED' || b.status === 'DELIVERED').length}</div>
          <div className="help">Отгружено / Доставлено</div>
        </div>
      </div>

      <section className="card">
        <h2>{filter === 'ALL' ? 'Все позиции' : filter === 'ASTANA' ? 'Склад Астана' : 'Склад Алматы'}</h2>
        {filtered.length === 0 ? (
          <p className="help" style={{ padding: 32, textAlign: 'center' }}>Нет данных</p>
        ) : (
          <table className="table">
            <thead><tr><th>Код</th><th>Проект</th><th>Содержимое</th><th>Статус</th></tr></thead>
            <tbody>
              {filtered.map(box => (
                <tr key={box.id} className="row-click" onClick={() => showDetail(box)} style={{ cursor: 'pointer' }}>
                  <td className="mono">{box.box_code}</td>
                  <td>{box.label_text}</td>
                  <td className="help">{box.contents_text || box.contents.map(c => c.name + ' x' + c.quantity).join(', ') || '—'}</td>
                  <td>
                    <span style={{
                      display: 'inline-block', padding: '4px 10px', borderRadius: 999,
                      background: statusColors[box.status] || '#f1f5f9',
                      color: box.status === 'DELIVERED' ? '#166534' : box.status === 'SHIPPED' ? '#9a3412' : '#333',
                      fontWeight: 700, fontSize: 12
                    }}>
                      {statusLabels[box.status] || box.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {selectedBox && (
        <>
          <section className="card" style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><h2>{selectedBox.box_code}</h2><p className="help">{selectedBox.label_text}</p></div>
              <button className="btn ghost" onClick={() => setSelectedBox(null)}>← Назад</button>
            </div>
            <table className="table" style={{ marginTop: 14 }}>
              <tbody>
                <tr><td style={{ color: '#9ca0aa', width: 120 }}>Статус</td><td>{statusLabels[selectedBox.status]}</td></tr>
                <tr><td style={{ color: '#9ca0aa' }}>Склад</td><td>{selectedBox.warehouse === 'ASTANA' ? 'Астана' : selectedBox.warehouse === 'ALMATY' ? 'Алматы' : '—'}</td></tr>
                <tr><td style={{ color: '#9ca0aa' }}>Локация</td><td>{selectedBox.current_location || '—'}</td></tr>
                <tr><td style={{ color: '#9ca0aa' }}>Позиция</td><td>{selectedBox.box_number}/{selectedBox.total_boxes}</td></tr>
                <tr><td style={{ color: '#9ca0aa' }}>Содержимое</td><td style={{ whiteSpace: 'pre-wrap' }}>{selectedBox.contents_text || selectedBox.contents.map(c => c.name + ' — ' + c.quantity + ' ' + (c.unit || 'шт')).join('\n')}</td></tr>
              </tbody>
            </table>
          </section>
                    <section className="card" style={{ marginTop: 18 }}>
            <h2>История</h2>
            {events.length === 0 ? <p className="help">Нет событий</p> : (
              <div style={{ display: 'grid', gap: 8 }}>
                {events.map(event => (
                  <div key={event.id} style={{
                    background: event.event_type === 'DELIVERED' ? '#dcfce7' : event.event_type === 'WAREHOUSE_OUT' ? '#fff0d7' : event.event_type === 'WAREHOUSE_IN' ? '#d9fff3' : '#f1f5f9',
                    borderRadius: 8, padding: '10px 14px',
                    borderLeft: '4px solid ' + (event.event_type === 'DELIVERED' ? '#16a34a' : event.event_type === 'WAREHOUSE_OUT' ? '#f97316' : event.event_type === 'WAREHOUSE_IN' ? '#00a97f' : '#9ca0aa')
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b>{eventLabels[event.event_type] || event.event_type}</b>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{event.actor_name || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span className="help">{event.location || ''}</span>
                      <span className="help">{new Date(event.created_at).toLocaleString('ru-RU')}</span>
                    </div>
                    {event.comment && <div className="help" style={{ marginTop: 4 }}>{event.comment}</div>}
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
