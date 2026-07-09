'use client';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import type { BoxEventType, BoxScanOut, UserOut } from '@/types';
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const allActions: {value: BoxEventType; label: string; roles: string[]}[] = [
  {value:'WAREHOUSE_IN', label:'Принять на склад', roles:['ADMIN','MANAGER','WAREHOUSE','PN']},
  {value:'WAREHOUSE_OUT', label:'Отгрузить', roles:['ADMIN','MANAGER','WAREHOUSE']},
  {value:'DELIVERED', label:'Доставлено клиенту', roles:['ADMIN','MANAGER','PN']},
];

const SCANNER_ELEMENT_ID = 'qr-reader';

export default function ScanPage() {
  const [eventType, setEventType] = useState<BoxEventType>('WAREHOUSE_IN');
  const [location, setLocation] = useState('');
  const [code, setCode] = useState('');
  const [last, setLast] = useState<BoxScanOut | null>(null);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<UserOut | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    api.me().then(user => {
      setCurrentUser(user);
      if (user.warehouse) {
        setLocation(user.warehouse === 'ASTANA' ? 'Склад Астана' : 'Склад Алматы');
      } else {
        setLocation('Склад Астана');
      }
    });
    inputRef.current?.focus();
  }, []);

  const isWarehouse = currentUser?.role === 'WAREHOUSE';
  const availableActions = allActions.filter(a => currentUser && a.roles.includes(currentUser.role));

  // Если текущее выбранное действие недоступно для роли — переключаемся на первое доступное
  useEffect(() => {
    if (availableActions.length && !availableActions.find(a => a.value === eventType)) {
      setEventType(availableActions[0].value);
    }
  }, [currentUser]);

  async function startCamera() {
    setError('');
    setCameraOpen(true);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
  formatsToSupport: [
    Html5QrcodeSupportedFormats.QR_CODE,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.EAN_13,
  ],
  verbose: false,
});
        scannerRef.current = scanner;
        await scanner.start(
          {facingMode: 'environment'},
          {
            fps: 10,
            qrbox: { width: 280, height: 280 },},
          (decodedText) => {
            setCode(decodedText);
            stopCamera();
          },
          () => {}
        );
      } catch (e) {
        setError('Не удалось открыть камеру. Проверьте разрешения браузера.');
        setCameraOpen(false);
      }
    }, 100);
  }

  async function stopCamera() {
    try {
      await scannerRef.current?.stop();
      scannerRef.current?.clear();
    } catch {}
    setCameraOpen(false);
  }

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
              {availableActions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
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

        {!cameraOpen ? (
          <div className="field">
            <button type="button" className="btn black" onClick={startCamera} style={{marginBottom: 12}}>
              📷 Сканировать камерой
            </button>
          </div>
        ) : (
          <div className="field" style={{marginBottom: 12}}>
            <div id={SCANNER_ELEMENT_ID} style={{ width: '100%', maxWidth: 400 }} />
            <button type="button" className="btn" onClick={stopCamera} style={{marginTop: 8}}>
              Отменить
            </button>
          </div>
        )}

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
