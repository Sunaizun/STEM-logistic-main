'use client';
import Shell from '@/components/Shell';
import { api, publicLabelPdfUrl, getToken } from '@/lib/api';
import type { ProjectDetailOut, BoxOut, BoxEventOut } from '@/types';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface QrItem {
  name: string;
  quantity: number;
  unit: string;
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
  CREATED: '#d9fff3', WAREHOUSE_IN: '#d9fff3', WAREHOUSE_OUT: '#fff0d7',
  DELIVERED: '#dcfce7', COMMENT: '#f1f5f9', UPDATED: '#f1f5f9',
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetailOut | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<QrItem[]>([{ name: '', quantity: 1, unit: 'шт' }]);
  const [labelNote, setLabelNote] = useState('');
  const [selectedBox, setSelectedBox] = useState<BoxOut | null>(null);
  const [events, setEvents] = useState<BoxEventOut[]>([]);
  const [userWarehouse, setUserWarehouse] = useState<string>('ASTANA');

  async function load() {
    try { setProject(await api.project(id)); } catch (e) { setError('Ошибка'); }
  }

  useEffect(() => {
    load();
    // Получаем склад пользователя
    api.me().then(user => {
      if (user.warehouse) setUserWarehouse(user.warehouse);
    }).catch(() => {});
  }, [id]);

  function addItem() { setItems([...items, { name: '', quantity: 1, unit: 'шт' }]); }
  function updateItem(index: number, field: keyof QrItem, value: string | number) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: field === 'quantity' ? Number(value) || 1 : value };
    setItems(newItems);
  }
  function removeItem(index: number) {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  }

  async function createQR() {
    if (!project) return;
    setError(''); setMessage('');
    const filledItems = items.filter(i => i.name.trim());
    if (filledItems.length === 0) { setError('Добавьте товар'); return; }
    const boxNumber = (project.boxes?.length || 0) + 1;
    try {
      const box = await api.createBox({
        project_id: project.id,
        label_text: labelNote || project.project_code,
        title: filledItems.length === 1 ? filledItems[0].name : 'Позиция ' + boxNumber,
        box_number: boxNumber,
        total_boxes: boxNumber,
        warehouse: userWarehouse,
        current_location: userWarehouse === 'ASTANA' ? 'Склад Астана' : 'Склад Алматы',
        contents_text: filledItems.map(i => i.name + ' - ' + i.quantity + ' ' + i.unit).join('\n'),
        comment: null,
        contents: filledItems.map(i => ({
          expected_item_id: null, name: i.name.trim(), quantity: i.quantity, unit: i.unit || 'шт'
        }))
      });
      setMessage('QR ' + box.box_code + ' создан');
      window.open(publicLabelPdfUrl(box.public_token), '_blank');
      setItems([{ name: '', quantity: 1, unit: 'шт' }]);
      setLabelNote('');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка'); }
  }

 async function showDetail(box: BoxOut) {
  setSelectedBox(box);
  try { const ev = await api.boxEvents(box.box_code); setEvents(ev); } catch (e) { setEvents([]); }
  // Скролл вниз к деталям
  setTimeout(() => {
    document.getElementById('box-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

  if (!project) return <Shell><div className="help">Загрузка...</div></Shell>;

  const whLabel = userWarehouse === 'ASTANA' ? 'Астана' : 'Алматы';

  return (
    <Shell>
      <div className="top">
        <div>
          <h1 className="h1">{project.project_code}</h1>
          <p className="help">Склад: {whLabel}</p>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <div className="grid grid-2">
        <section className="card">
          <h2>Товары из 1С</h2>
          {!project.expected_items || project.expected_items.length === 0 ? (
            <p className="help">Нет товаров. Загрузите Excel или добавьте вручную.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Товар</th><th>Кол-во</th></tr></thead>
              <tbody>{(project.expected_items || []).map((i: any) => (
                <tr key={i.id}><td>{i.name}</td><td>{i.quantity} {i.unit || 'шт'}</td></tr>
              ))}</tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h2>Создать QR — {whLabel}</h2>
          <p className="help" style={{ marginBottom: 16 }}>Один товар = один QR. Несколько товаров = позиция.</p>

          <div className="field">
            <label>Заметка для наклейки</label>
            <input className="input" value={labelNote} onChange={e => setLabelNote(e.target.value)} placeholder={project.project_code} />
          </div>

          {items.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 12, alignItems: 'end' }}>
              <div className="field">{i === 0 && <label>Наименование</label>}<input className="input" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="Противогаз" /></div>
              <div className="field">{i === 0 && <label>Кол-во</label>}<input className="input" type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} /></div>
              <div className="field">{i === 0 && <label>Ед.</label>}<input className="input" value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} placeholder="шт" /></div>
              <div style={{ paddingTop: i === 0 ? 22 : 0 }}>{items.length > 1 && <button className="btn ghost" onClick={() => removeItem(i)} style={{ padding: '8px 12px' }}>✕</button>}</div>
            </div>
          ))}

          <button className="btn ghost" onClick={addItem} style={{ marginBottom: 18 }}>+ Добавить товар</button>
          <button className="btn black" onClick={createQR} style={{ width: '100%' }}>Создать и напечатать QR</button>
        </section>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>QR-коды проекта ({project.boxes?.length || 0})</h2>
        {!project.boxes || project.boxes.length === 0 ? (
          <p className="help" style={{ padding: 32, textAlign: 'center' }}>Нет QR-кодов</p>
        ) : (
          <table className="table">
            <thead><tr><th>№</th><th>Код</th><th>Содержимое</th><th>Статус</th><th></th><th></th></tr></thead>
            <tbody>
              {project.boxes.map((b, idx) => (
                <tr key={b.id} className="row-click" onClick={() => showDetail(b)} style={{ cursor: 'pointer' }}>
                  <td>{idx + 1}/{project.boxes!.length}</td>
                  <td className="mono">{b.box_code}</td>
                  <td className="help" style={{ fontSize: 12 }}>{b.contents_text || b.contents.map(c => c.name + ' x' + c.quantity).join(', ')}</td>
                  <td>
  <span style={{
    display: 'inline-block', padding: '4px 10px', borderRadius: 999,
    background: b.status === 'DELIVERED' ? '#dcfce7' : b.status === 'SHIPPED' ? '#fff0d7' : b.status === 'IN_WAREHOUSE' ? '#d9fff3' : '#f1f5f9',
    color: b.status === 'DELIVERED' ? '#166534' : b.status === 'SHIPPED' ? '#c2410c' : b.status === 'IN_WAREHOUSE' ? '#065f46' : '#475569',
    fontWeight: 700, fontSize: 12
  }}>
    {b.status === 'CREATED' ? 'Создана' : b.status === 'IN_WAREHOUSE' ? 'На складе' : b.status === 'SHIPPED' ? 'Отгружена' : b.status === 'DELIVERED' ? 'Доставлена' : b.status}
  </span>
</td>
                  <td><a className="btn ghost" href={publicLabelPdfUrl(b.public_token)} target="_blank" onClick={e => e.stopPropagation()} style={{ fontSize: 12, padding: '4px 8px' }}>PDF</a></td>
                  <td><button className="btn red" onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm('Удалить ' + b.box_code + '?')) {
                      await api.deleteBox(b.box_code);
                      await load();
                    }
                    }} style={{ fontSize: 12, padding: '4px 8px' }}>X</button>
                    </td>
                    </tr>
                  ))}
                  </tbody>
          </table>
        )}
      </section>

      {selectedBox && (<div id="box-detail">
        <>
          <section className="card" style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><h2>{selectedBox.box_code}</h2><p className="help">{selectedBox.label_text}</p></div>
              <div className="actions">
                <a className="btn ghost" href={publicLabelPdfUrl(selectedBox.public_token)} target="_blank">PDF</a>
                <button className="btn ghost" onClick={() => setSelectedBox(null)}>← Назад</button>
              </div>
            </div>
            <table className="table" style={{ marginTop: 14 }}>
              <tbody>
                <tr><td style={{ color: '#9ca0aa', width: 120 }}>Статус</td><td><span className="badge green">{selectedBox.status}</span></td></tr>
                <tr><td style={{ color: '#9ca0aa' }}>Склад</td><td>{selectedBox.warehouse === 'ASTANA' ? 'Астана' : 'Алматы'}</td></tr>
                <tr><td style={{ color: '#9ca0aa' }}>Содержимое</td><td style={{ whiteSpace: 'pre-wrap' }}>{selectedBox.contents_text || selectedBox.contents.map(c => c.name + ' — ' + c.quantity + ' ' + (c.unit || 'шт')).join('\n')}</td></tr>
              </tbody>
            </table>
          </section>
          <section className="card" style={{ marginTop: 18 }}>
            <h2>История</h2>

            {events.map(event => (
              <div key={event.id} style={{ background: eventColors[event.event_type] || '#f8f9fb', borderRadius: 12, padding: '14px 16px', display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: 14, alignItems: 'center', borderLeft: '4px solid ' + (event.event_type === 'DELIVERED' ? '#16a34a' : event.event_type === 'WAREHOUSE_OUT' ? '#f97316' : '#00a97f'), marginBottom: 8 }}>
                <div><b>{eventLabels[event.event_type]}</b><div className="help" style={{ fontSize: 12 }}>{new Date(event.created_at).toLocaleString('ru-RU')}</div></div>
                <div>{event.location}{event.comment && <div className="help">{event.comment}</div>}</div>
                <div className="help" style={{ fontSize: 12 }}>{event.actor_name || '—'}</div>
              </div>
            ))}
          </section>
        </>
      </div>)}
    </Shell>
  );
}
