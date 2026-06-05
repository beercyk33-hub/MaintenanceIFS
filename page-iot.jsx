// IoT Sensor Monitor — configuration page.
// Uses the shared window.IoTManager (iot-manager.js) so the MQTT connection is
// also available to the Dashboard strip.

(function () {
  // ----------------- Sensor card -----------------
  function SensorCard({ sensor, latest, onEdit, onRemove }) {
    const v = latest?.value;
    const hasVal = Number.isFinite(v);
    const status = window.classifyIoTSensor(sensor, latest);
    const ring = { good: 'rgba(52,227,165,0.45)', warn: 'rgba(255,192,75,0.5)', bad: 'rgba(255,90,122,0.5)', muted: 'rgba(255,255,255,0.18)' }[status];
    const dot  = { good: 'dot-good', warn: 'dot-warn', bad: 'dot-bad', muted: '' }[status];

    return (
      <div className="glass rounded-3xl p-5 kpi" style={{ '--kpi-color': ring, minHeight: 200 }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="h3" style={{ fontSize: '1.05rem' }}>{sensor.name}</div>
            <div className="mt-1 flex items-center gap-2" style={{ fontSize: '0.74rem', color: 'var(--ink-faint)' }}>
              <span className={'dot ' + dot} />
              <span>{latest?.at ? 'อัปเดต ' + latest.at : (sensor.topic ? 'รอข้อมูล...' : 'ยังไม่กำหนด topic')}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="btn btn-ghost btn-sm" onClick={() => onEdit(sensor)} title="แก้ไข"><Icon name="edit" size={13} /></button>
            <button className="btn btn-ghost btn-sm" onClick={() => onRemove(sensor)} title="ลบ"><Icon name="trash" size={13} /></button>
          </div>
        </div>
        <div className="mt-4 flex items-end gap-2">
          <div className="num" style={{ fontSize: '2.6rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}>
            {hasVal ? v.toFixed(1) : '—'}
          </div>
          <div style={{ fontSize: '1rem', color: 'var(--ink-dim)', paddingBottom: 6 }}>{sensor.unit}</div>
        </div>
        {(Number.isFinite(sensor.lo) || Number.isFinite(sensor.hi)) && (
          <div className="mt-3" style={{ fontSize: '0.74rem', color: 'var(--ink-faint)' }}>
            ช่วงปกติ: {Number.isFinite(sensor.lo) ? sensor.lo : '-∞'} ถึง {Number.isFinite(sensor.hi) ? sensor.hi : '∞'} {sensor.unit}
          </div>
        )}
        {sensor.topic && (
          <div className="mt-2" style={{ fontSize: '0.7rem', color: 'var(--ink-faint)', wordBreak: 'break-all' }}>
            <span style={{ opacity: 0.7 }}>field <b>{sensor.field}</b> @</span> {sensor.topic}
          </div>
        )}
      </div>
    );
  }

  // ----------------- Edit modal -----------------
  function EditSensorModal({ open, sensor, onClose, onSave }) {
    const [form, setForm] = React.useState(sensor || {});
    React.useEffect(() => { setForm(sensor || {}); }, [sensor]);
    if (!open) return null;
    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
    return (
      <Modal open={open} onClose={onClose} title={sensor?.id ? 'แก้ไข Sensor' : 'เพิ่ม Sensor'} size="md"
        footer={<>
          <button className="btn" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>บันทึก</button>
        </>}>
        <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>ชื่อจุดวัด</label>
            <input className="input" value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="เช่น ห้องเย็น A" />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>MQTT Topic</label>
            <input className="input" value={form.topic || ''} onChange={e => set('topic', e.target.value)} placeholder="PLC_CENTER/VIEW/.../PLC/0" />
          </div>
          <div className="field">
            <label>Field (เช่น "D5" สำหรับ JSON, หรือเลข index สำหรับ CSV)</label>
            <input className="input" value={form.field ?? ''} onChange={e => set('field', e.target.value)} placeholder="D5" />
          </div>
          <div className="field">
            <label>หาร (เช่น 10 ถ้าค่า raw คือ ×10)</label>
            <input className="input" type="number" value={form.divisor ?? 1} onChange={e => set('divisor', Number(e.target.value) || 1)} />
          </div>
          <div className="field">
            <label>หน่วย</label>
            <input className="input" value={form.unit || ''} onChange={e => set('unit', e.target.value)} placeholder="°C" />
          </div>
          <div className="field">
            <label>ช่วงปกติ ต่ำสุด</label>
            <input className="input" type="number" value={form.lo ?? ''} onChange={e => set('lo', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div className="field">
            <label>ช่วงปกติ สูงสุด</label>
            <input className="input" type="number" value={form.hi ?? ''} onChange={e => set('hi', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
        </div>
        <div className="mt-3" style={{ fontSize: '0.78rem', color: 'var(--ink-dim)' }}>
          <b>วิธีหา topic:</b> ที่หน้า dashboard thaiiiot → F12 Console → พิมพ์ <code>copy(document.body.outerHTML.match(/data-subscribemqtt="[^"]+"/g))</code> → paste มาเลือก topic ที่ต้องการ
        </div>
      </Modal>
    );
  }

  // ----------------- Main page -----------------
  function PageIoT() {
    const { sensors, latest, status, error } = window.useIoT();
    const [editing, setEditing] = React.useState(null);
    const BROKER = window.IoTManager.BROKER;

    const addSensor = () => {
      setEditing({ id: 'new_' + Date.now().toString(36), name: '', topic: '', field: '', divisor: 1, unit: '°C', lo: null, hi: null });
    };
    const editSensor = (s) => setEditing({ ...s });
    const removeSensor = async (s) => {
      const r = await window.Swal.fire({ icon: 'warning', title: 'ลบ ' + s.name + '?', showCancelButton: true, confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก' });
      if (!r.isConfirmed) return;
      window.IoTManager.setSensors(sensors.filter(x => x.id !== s.id));
    };
    const saveSensor = (form) => {
      if (!form.name) { window.Swal.fire({ icon: 'warning', title: 'กรอกชื่อด้วย' }); return; }
      const idx = sensors.findIndex(x => x.id === form.id);
      const next = idx >= 0 ? sensors.map((x, i) => i === idx ? form : x) : [...sensors, form];
      window.IoTManager.setSensors(next);
      setEditing(null);
    };

    const statusTag = (() => {
      const map = {
        idle:       { cls: 'tag-muted', txt: 'รอ topic',         dot: '' },
        connecting: { cls: 'tag-warn',  txt: 'กำลังเชื่อมต่อ...', dot: 'dot-warn' },
        connected:  { cls: 'tag-good',  txt: 'เชื่อมต่อแล้ว',     dot: 'dot-good' },
        error:      { cls: 'tag-bad',   txt: 'ขัดข้อง',           dot: 'dot-bad' },
      };
      return map[status] || map.idle;
    })();

    return (
      <div className="grid gap-4">
        <div className="glass rounded-3xl p-5 flex items-center justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <div className="h1">เซ็นเซอร์ IoT</div>
            <div className="mt-1" style={{ fontSize: '0.85rem', color: 'var(--ink-dim)' }}>
              เชื่อมต่อกับ thaiiiot.com ผ่าน MQTT — ดูค่าอุณหภูมิห้องเย็น/ตู้แช่แบบเรียลไทม์
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={'tag ' + statusTag.cls}>
              {statusTag.dot && <span className={'dot ' + statusTag.dot} />}
              {statusTag.txt}
            </span>
            <button className="btn btn-sm btn-primary" onClick={addSensor}>
              <Icon name="plus" size={14} /> เพิ่ม Sensor
            </button>
          </div>
        </div>

        {error && (
          <div className="glass rounded-3xl p-4" style={{ borderColor: 'rgba(255,90,122,0.4)' }}>
            <div className="flex items-start gap-3">
              <Icon name="bell" size={18} />
              <div style={{ fontSize: '0.88rem', color: 'var(--ink-dim)' }}>{error}</div>
            </div>
          </div>
        )}

        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {sensors.map(s => (
            <SensorCard key={s.id} sensor={s} latest={latest[s.id]} onEdit={editSensor} onRemove={removeSensor} />
          ))}
        </div>

        <div className="glass-soft rounded-3xl p-4" style={{ fontSize: '0.82rem', color: 'var(--ink-dim)' }}>
          <b>Broker:</b> ws://{BROKER.host}:{BROKER.port}{BROKER.path}<br />
          <b>หมายเหตุ:</b> Broker เป็น <code>ws://</code> (ไม่เข้ารหัส) — ใช้งานได้บน <code>http://localhost</code> และ http เท่านั้น สำหรับ deploy บน Netlify (https) ต้องตั้ง proxy ฝั่ง server เพิ่ม
        </div>

        <EditSensorModal open={!!editing} sensor={editing} onClose={() => setEditing(null)} onSave={saveSensor} />
      </div>
    );
  }

  window.PageIoT = PageIoT;
})();
