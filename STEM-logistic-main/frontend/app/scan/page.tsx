'use client';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import type { BoxEventType, BoxScanOut, UserOut } from '@/types';
import { useEffect, useRef, useState } from 'react';

const actions: {value: BoxEventType; label: string}[] = [
  {value:'WAREHOUSE_IN', label:'Принять на склад'},
  {value:'WAREHOUSE_OUT', label:'Отгрузить'},
];

export default function ScanPage() {
  const [eventType, setEventType] = useState<BoxEventType>('WAREHOUSE_IN');
  const [location, setLocation] = useState('');
  const [code, setCode] = useState('');
  const [last, setLast] = useState<BoxScanOut | null>(null);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<UserOut | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.me().then(user => {
      setCurrentUser(user);
      // Автоматом ставим локацию по складу
      if (user.warehouse) {
        setLocation(user.warehouse === 'ASTANA' ? 'Склад Астана' : 'Склад Алматы');
      } else {
        setLocation('Склад Астана');
      }
    });
    inputRef.current?.focus();
  }, []);

  const isWarehouse = currentUser?.role === 'WAREHOUSE';

  async function submit() {
    if (!code.trim()) return;
    setError('');
    try {
      const res = await api.scanBox({ box_code: code.trim(), event_type: eventType, location });
      setLast(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
      setLast(null);
    }
    setCode('');
    inputRef.current?.focus();
  }

  return (
    <Shell>
      <div className="top">
        <div><h1 className="h1">Сканирование</h1><p className="help">Сканируйте штрихкод коробки</p></div>
      </div>
      {error && <div className="error">{error}</div>}
      <section className="card">
        <div className="grid grid-2">
          <div className="field">
            <label>Действие</label>
            <select className="select" value={eventType} onChange={e => setEventType(e.target.value as BoxEventType)}>
              {actions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Локация {isWarehouse && '(автоматически)'}</label>
            <input
              className="input"
              value={location}
              onChange={e => setLocation(e.target.value)}
              disabled={isWarehouse}
              style={isWarehouse ? { background: '#f1f5f9', color: '#64748b' } : {}}
            />
          </div>
        </div>
        <div className="field">
          <label>Штрихкод</label>
          <input
            ref={inputRef}
            className="input scan-input mono"
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="BX-000123"
          />
        </div>
        <div className="actions">
          <button className="btn black" onClick={submit}>Сканировать</button>
        </div>
      </section>
      {last && (
        <section className="card" style={{marginTop:18}}>
          <h2>{last.success ? 'Успешно' : 'Ошибка'}</h2>
          <p>{last.message}</p>
        </section>
      )}
    </Shell>
  );
}
