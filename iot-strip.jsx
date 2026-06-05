// Compact live IoT sensor strip — used on the Dashboard so users see current
// cold-room / freezer temperatures at a glance. Reads from window.useIoT().

(function () {
  function MiniTile({ sensor, latest, onClick }) {
    const v = latest?.value;
    const hasVal = Number.isFinite(v);
    const status = window.classifyIoTSensor(sensor, latest);
    const ring = { good: 'rgba(52,227,165,0.45)', warn: 'rgba(255,192,75,0.5)', bad: 'rgba(255,90,122,0.5)', muted: 'rgba(255,255,255,0.18)' }[status];
    const dot  = { good: 'dot-good', warn: 'dot-warn', bad: 'dot-bad', muted: '' }[status];
    return (
      <div className="glass rounded-3xl p-4 kpi"
           onClick={onClick}
           style={{ '--kpi-color': ring, cursor: onClick ? 'pointer' : 'default', minHeight: 110 }}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2">
            <span className={'dot ' + dot} />
            <div className="truncate" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{sensor.name}</div>
          </div>
        </div>
        <div className="mt-1 flex items-end gap-1">
          <div className="num" style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            {hasVal ? v.toFixed(1) : '—'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--ink-dim)', paddingBottom: 3 }}>{sensor.unit}</div>
        </div>
        <div className="mt-1" style={{ fontSize: '0.7rem', color: 'var(--ink-faint)' }}>
          {latest?.at ? 'อัปเดต ' + latest.at : (sensor.topic ? 'รอข้อมูล...' : 'ยังไม่กำหนด topic')}
        </div>
      </div>
    );
  }

  function IoTStrip({ onOpen }) {
    const { sensors, latest, status, error } = window.useIoT();
    if (!sensors || sensors.length === 0) return null;
    const statusTag = (() => {
      const map = {
        idle:       { cls: 'tag-muted', txt: 'รอ topic',         dot: '' },
        connecting: { cls: 'tag-warn',  txt: 'กำลังเชื่อมต่อ...', dot: 'dot-warn' },
        connected:  { cls: 'tag-good',  txt: 'ออนไลน์',          dot: 'dot-good' },
        error:      { cls: 'tag-bad',   txt: 'ขัดข้อง',           dot: 'dot-bad' },
      };
      return map[status] || map.idle;
    })();
    return (
      <div className="grid gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Icon name="bolt" size={18} />
            <div className="h2">เซ็นเซอร์เรียลไทม์</div>
            <span className={'tag ' + statusTag.cls}>
              {statusTag.dot && <span className={'dot ' + statusTag.dot} />}
              {statusTag.txt}
            </span>
          </div>
          {onOpen && (
            <button className="btn btn-ghost btn-sm" onClick={onOpen}>
              <Icon name="cog" size={14} /> ตั้งค่า
            </button>
          )}
        </div>
        {error && (
          <div className="glass-soft rounded-3xl p-3" style={{ fontSize: '0.8rem', color: 'var(--ink-dim)' }}>
            {error}
          </div>
        )}
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          {sensors.map(s => (
            <MiniTile key={s.id} sensor={s} latest={latest[s.id]} onClick={onOpen} />
          ))}
        </div>
      </div>
    );
  }

  window.IoTStrip = IoTStrip;
})();
