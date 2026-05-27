// Shared UI primitives + icons for Maintenance IFS
const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;

// ---------- Icon set (inline SVG) ----------
const Icon = ({ name, size = 18, className = '', stroke = 1.7 }) => {
  const paths = {
    dashboard: <><path d="M3 12L12 4l9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
    cog:       <><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    wrench:    <><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6a1.5 1.5 0 1 0 2.1 2.1l6-6a4 4 0 0 0 5.4-5.4l-2.5 2.5-2-2z"/></>,
    machine:   <><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M7 7V5h10v2"/><circle cx="9" cy="13" r="1.5"/><circle cx="15" cy="13" r="1.5"/></>,
    calendar:  <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 3v4M16 3v4"/></>,
    bell:      <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
    check:     <><path d="M4 12l5 5L20 6"/></>,
    chart:     <><path d="M3 21V3"/><path d="M3 21h18"/><path d="M7 17v-6"/><path d="M12 17V9"/><path d="M17 17v-4"/></>,
    plus:      <><path d="M12 5v14M5 12h14"/></>,
    edit:      <><path d="M14 4l6 6-10 10H4v-6L14 4z"/></>,
    trash:     <><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M5 6l1 14h12l1-14"/></>,
    search:    <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
    eye:       <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></>,
    download:  <><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/></>,
    upload:    <><path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M5 4h14"/></>,
    link:      <><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></>,
    refresh:   <><path d="M3 12a9 9 0 0 1 16-5"/><path d="M19 3v6h-6"/><path d="M21 12a9 9 0 0 1-16 5"/><path d="M5 21v-6h6"/></>,
    close:     <><path d="M6 6l12 12M18 6l-12 12"/></>,
    user:      <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></>,
    lock:      <><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
    menu:      <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    history:   <><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 8v5l3 2"/></>,
    file:      <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></>,
    bolt:      <><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></>,
    money:     <><circle cx="12" cy="12" r="9"/><path d="M9 8h4.5a2 2 0 0 1 0 4h-3a2 2 0 0 0 0 4H15"/><path d="M12 6v2M12 16v2"/></>,
    location:  <><path d="M12 22s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12z"/><circle cx="12" cy="10" r="2.5"/></>,
    shield:    <><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z"/></>,
    filter:    <><path d="M3 5h18l-7 9v6l-4-2v-4z"/></>,
    pdf:       <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><text x="7.5" y="17" fontSize="6" fill="currentColor" stroke="none" fontWeight="700">PDF</text></>,
    xls:       <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><text x="7.5" y="17" fontSize="6" fill="currentColor" stroke="none" fontWeight="700">XLS</text></>,
    spark:     <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
         className={className}>
      {paths[name] || paths.dashboard}
    </svg>
  );
};

// ---------- Modal ----------
const Modal = ({ open, onClose, title, children, footer, size = 'lg' }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  const maxW = { sm: 420, md: 560, lg: 760, xl: 980 }[size] || 760;
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="glass modal-body" style={{ maxWidth: maxW }}>
        <div className="flex items-start justify-between mb-5">
          <div className="h2">{title}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="ปิด">
            <Icon name="close" size={16} />
          </button>
        </div>
        <div>{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

// ---------- Field ----------
const Field = ({ label, children, required, hint, className = '' }) => (
  <div className={'field ' + className}>
    <label>{label}{required && <span style={{color:'#ff5a7a'}}> *</span>}</label>
    {children}
    {hint && <div style={{fontSize:'0.72rem',color:'var(--ink-faint)'}}>{hint}</div>}
  </div>
);

// ---------- Status helpers ----------
const STATUS_COLORS = {
  'รอรับงาน': 'warn',
  'กำลังดำเนินการ': 'info',
  'รออะไหล่': 'warn',
  'ซ่อมเสร็จ': 'good',
  'ยกเลิก': 'muted',
  'ใช้งานปกติ': 'good',
  'ใช้งานได้': 'good',
  'ต้องติดตาม': 'warn',
  'ต้องหยุดเครื่อง': 'bad',
  'ยังไม่ถึงกำหนด': 'muted',
  'ถึงกำหนด': 'warn',
  'เกินกำหนด': 'bad',
  'ดำเนินการแล้ว': 'good',
  'รอตรวจสอบ': 'muted',
};
const URGENCY_COLORS = {
  'ต่ำ': 'muted', 'ปานกลาง': 'info', 'สูง': 'warn', 'ฉุกเฉิน': 'bad',
};

const StatusTag = ({ value, colorMap = STATUS_COLORS }) => {
  const c = colorMap[value] || 'muted';
  return <span className={'tag tag-' + c}>{value}</span>;
};

// ---------- KPI Card ----------
const KPI = ({ label, value, icon, color = '#38e0ff', sub, trend }) => (
  <div className="glass kpi rounded-3xl p-5 fade-in" style={{ '--kpi-color': color + '55' }}>
    <div className="flex items-start justify-between gap-3 relative" style={{ zIndex: 1 }}>
      <div>
        <div style={{fontSize:'0.78rem',color:'var(--ink-dim)',fontWeight:600,letterSpacing:'.02em'}}>{label}</div>
        <div className="num" style={{fontSize:'2rem',fontWeight:800,marginTop:4,lineHeight:1.1}}>{value}</div>
        {sub && <div style={{fontSize:'0.76rem',color:'var(--ink-faint)',marginTop:4}}>{sub}</div>}
      </div>
      <div className="rounded-2xl flex items-center justify-center"
           style={{
             width: 44, height: 44,
             background: `linear-gradient(135deg, ${color}33, ${color}11)`,
             border: `1px solid ${color}44`,
             color,
           }}>
        <Icon name={icon} size={22} />
      </div>
    </div>
    {trend != null && (
      <div className="mt-3 flex items-center gap-1.5" style={{fontSize:'0.75rem'}}>
        <span style={{color: trend >= 0 ? '#34e3a5' : '#ff5a7a'}}>{trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%</span>
        <span style={{color:'var(--ink-faint)'}}>vs สัปดาห์ก่อน</span>
      </div>
    )}
  </div>
);

// ---------- Card ----------
const Card = ({ title, action, children, className = '', padding = true }) => (
  <div className={'glass rounded-3xl ' + (padding ? 'p-5 ' : '') + className}>
    {(title || action) && (
      <div className={'flex items-center justify-between gap-3 ' + (padding ? 'mb-4' : 'px-5 pt-5 pb-3')}>
        <div className="h2">{title}</div>
        {action}
      </div>
    )}
    <div className={padding ? '' : 'px-5 pb-5'}>{children}</div>
  </div>
);

// ---------- Chart helpers ----------
const useChart = (ref, config, deps) => {
  useEffect(() => {
    if (!ref.current || !window.Chart) return;
    const c = new window.Chart(ref.current, config);
    return () => c.destroy();
  }, deps);
};

const ChartBox = ({ type, data, options, height = 240 }) => {
  const ref = useRef(null);
  useChart(ref, { type, data, options }, [JSON.stringify(data), JSON.stringify(options), type]);
  return <div style={{ height }}><canvas ref={ref} /></div>;
};

const chartDefaults = () => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#dbe6ff', font: { family: 'Sarabun', size: 12, weight: '600' } } },
    tooltip: {
      backgroundColor: 'rgba(8,16,44,0.95)',
      titleColor: '#fff', bodyColor: '#dbe6ff',
      borderColor: 'rgba(255,255,255,0.18)', borderWidth: 1,
      titleFont: { family: 'Sarabun', weight: '700' },
      bodyFont: { family: 'Sarabun' },
      padding: 12,
      cornerRadius: 12,
    }
  },
  scales: {
    x: { ticks: { color: '#9ab0d6', font: { family: 'Sarabun', size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
    y: { ticks: { color: '#9ab0d6', font: { family: 'Sarabun', size: 11 } }, grid: { color: 'rgba(255,255,255,0.06)' } },
  }
});

// ---------- Area badge ----------
const AreaBadge = ({ area }) => {
  const colors = {
    PRP: '#38e0ff', PRC: '#6c8cff', PRB: '#a78bff', UHT: '#ff9ec7',
    WH: '#ffb24a', Eng: '#34e3a5', Env: '#7dd87d', Saf: '#ff5a7a',
    QA: '#ffc04b', QC: '#ffd86b', RD: '#ff9ec7', HR: '#c2a8ff', Office: '#9ab0d6',
  };
  const c = colors[area] || '#9ab0d6';
  return (
    <span className="tag" style={{
      background: c + '22', borderColor: c + '55', color: c, fontWeight: 700,
    }}>{area}</span>
  );
};

// ---------- Toast wrapper around SweetAlert2 ----------
const toast = (icon, title) => {
  if (!window.Swal) return;
  window.Swal.fire({
    toast: true, position: 'top-end', icon, title,
    showConfirmButton: false, timer: 2400, timerProgressBar: true,
    background: 'rgba(8,16,44,0.95)', color: '#f1f6ff',
  });
};

const confirmDialog = async (title, text, confirmText = 'ยืนยัน') => {
  const r = await window.Swal.fire({
    title, text, icon: 'warning', showCancelButton: true,
    confirmButtonText: confirmText, cancelButtonText: 'ยกเลิก',
  });
  return r.isConfirmed;
};

// ---------- Search input ----------
const SearchInput = ({ value, onChange, placeholder = 'ค้นหา...' }) => (
  <div style={{ position: 'relative', width: '100%' }}>
    <span style={{ position: 'absolute', left: 14, top: 12, color: 'var(--ink-faint)' }}>
      <Icon name="search" size={16} />
    </span>
    <input className="input" style={{ paddingLeft: 38 }}
      value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

// ---------- Empty state ----------
const Empty = ({ icon = 'machine', title = 'ไม่มีข้อมูล', sub }) => (
  <div className="flex flex-col items-center justify-center text-center py-10" style={{ color: 'var(--ink-faint)' }}>
    <div className="rounded-2xl flex items-center justify-center mb-3"
         style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)' }}>
      <Icon name={icon} size={28} />
    </div>
    <div className="h3" style={{ color: 'var(--ink-dim)' }}>{title}</div>
    {sub && <div style={{ fontSize: '0.85rem', marginTop: 4 }}>{sub}</div>}
  </div>
);

// ---------- Today helpers ----------
const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};
const fmtDate = (s) => s ? new Date(s).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
const daysBetween = (a, b) => Math.round((new Date(a) - new Date(b)) / 86400000);

const AREAS = ['PRP','PRC','PRB','UHT','WH','Eng','Env','Saf','QA','QC','RD','HR','Office'];

// ---------- Image utilities ----------
// Resize an image File to a max dimension, returning a JPEG data URL (~80% quality)
const fileToResizedDataUrl = (file, maxDim = 1280, quality = 0.82) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > maxDim || h > maxDim) {
        if (w >= h) { h = Math.round(h * maxDim / w); w = maxDim; }
        else        { w = Math.round(w * maxDim / h); h = maxDim; }
      }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = reader.result;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

// ---------- PhotoUploader ----------
// value: array of objects { id, name, dataUrl, url? }   onChange(next)
const PhotoUploader = ({ value = [], onChange, max = 6, label = 'แนบรูปภาพ', hint }) => {
  const inputRef = React.useRef(null);
  const [busy, setBusy] = React.useState(false);
  const [preview, setPreview] = React.useState(null);

  const onPick = async (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    setBusy(true);
    try {
      const room = Math.max(0, max - value.length);
      const take = files.slice(0, room);
      if (files.length > room) toast('warning', `แนบได้สูงสุด ${max} รูป`);
      const added = [];
      for (const f of take) {
        if (!f.type.startsWith('image/')) continue;
        const dataUrl = await fileToResizedDataUrl(f);
        added.push({
          id: 'img-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
          name: f.name, size: dataUrl.length, dataUrl,
        });
      }
      onChange([...value, ...added]);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = (id) => onChange(value.filter(p => p.id !== id));

  return (
    <div className="field">
      <label className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--ink-faint)', fontWeight: 500 }}>{value.length}/{max}</span>
      </label>

      <div className="glass-soft rounded-2xl p-3">
        <div className="flex flex-wrap gap-2">
          {value.map(p => (
            <div key={p.id} className="relative group rounded-xl overflow-hidden"
                 style={{ width: 96, height: 96, border: '1px solid var(--line-strong)' }}>
              <img src={p.url || p.dataUrl} alt={p.name}
                   style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
                   onClick={() => setPreview(p)} />
              <button type="button"
                      onClick={() => remove(p.id)}
                      className="absolute top-1 right-1 rounded-full"
                      style={{
                        width: 22, height: 22, background: 'rgba(0,0,0,0.7)',
                        color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', backdropFilter: 'blur(6px)',
                      }} aria-label="ลบรูป">
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}

          {value.length < max && (
            <button type="button" disabled={busy}
                    onClick={() => inputRef.current?.click()}
                    className="rounded-xl flex flex-col items-center justify-center transition-all"
                    style={{
                      width: 96, height: 96,
                      background: 'rgba(56,224,255,0.06)',
                      border: '1.5px dashed rgba(56,224,255,0.45)',
                      color: '#8ad6ff',
                      cursor: busy ? 'wait' : 'pointer',
                      gap: 4, fontSize: '0.72rem', fontWeight: 600,
                    }}>
              <Icon name={busy ? 'refresh' : 'upload'} size={20} className={busy ? 'animate-spin' : ''} />
              {busy ? 'กำลังประมวลผล' : 'เลือกรูป'}
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" multiple
               style={{ display: 'none' }} onChange={onPick} />
        {hint && <div style={{ fontSize: '0.72rem', color: 'var(--ink-faint)', marginTop: 8 }}>{hint}</div>}
      </div>

      {preview && (
        <div className="modal-backdrop" onClick={() => setPreview(null)}
             style={{ zIndex: 200 }}>
          <div style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }}>
            <img src={preview.url || preview.dataUrl} alt={preview.name}
                 style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }} />
            <button onClick={() => setPreview(null)}
                    className="btn btn-ghost btn-sm absolute"
                    style={{ top: 12, right: 12, background: 'rgba(0,0,0,0.6)' }}>
              <Icon name="close" size={14} /> ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- PhotoGallery (read-only) ----------
const PhotoGallery = ({ photos = [], thumb = 80 }) => {
  const [preview, setPreview] = React.useState(null);
  if (!photos.length) return null;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {photos.map(p => (
          <div key={p.id || p.url || p.dataUrl} className="rounded-xl overflow-hidden"
               style={{ width: thumb, height: thumb, border: '1px solid var(--line-strong)', cursor: 'zoom-in' }}
               onClick={() => setPreview(p)}>
            <img src={p.url || p.dataUrl} alt={p.name || 'attachment'}
                 style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ))}
      </div>
      {preview && (
        <div className="modal-backdrop" onClick={() => setPreview(null)} style={{ zIndex: 200 }}>
          <div style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }}>
            <img src={preview.url || preview.dataUrl} alt={preview.name || ''}
                 style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }} />
            <button onClick={() => setPreview(null)}
                    className="btn btn-ghost btn-sm absolute"
                    style={{ top: 12, right: 12, background: 'rgba(0,0,0,0.6)' }}>
              <Icon name="close" size={14} /> ปิด
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// Export to globals
Object.assign(window, {
  Icon, Modal, Field, StatusTag, KPI, Card, ChartBox, chartDefaults, AreaBadge,
  toast, confirmDialog, SearchInput, Empty,
  today, nowTime, fmtDate, daysBetween,
  STATUS_COLORS, URGENCY_COLORS, AREAS,
  PhotoUploader, PhotoGallery, fileToResizedDataUrl,
});
