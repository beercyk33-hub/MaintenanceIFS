// บำรุงรักษาตามวาระ PM — page-pm.jsx
const PM_FREQ = { 'รายวัน': 1, 'รายสัปดาห์': 7, 'รายเดือน': 30, 'ราย 3 เดือน': 90, 'ราย 6 เดือน': 180, 'รายปี': 365 };

function computeStatus(p) {
  if (!p.nextDate) return 'ยังไม่ถึงกำหนด';
  const d = daysBetween(p.nextDate, today());
  if (d < 0) return 'เกินกำหนด';
  if (d <= 3) return 'ถึงกำหนด';
  return 'ยังไม่ถึงกำหนด';
}

function PagePM({ db, setDb, nav }) {
  const [q, setQ] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL');

  const enriched = React.useMemo(() => {
    return db.pmPlans.map(p => ({ ...p, status: p.status === 'ดำเนินการแล้ว' ? 'ดำเนินการแล้ว' : computeStatus(p) }));
  }, [db.pmPlans]);

  // Alert for overdue items, once per session
  React.useEffect(() => {
    if (sessionStorage.getItem('mifs.pm.alerted')) return;
    const over = enriched.filter(p => p.status === 'เกินกำหนด');
    if (over.length > 0) {
      sessionStorage.setItem('mifs.pm.alerted', '1');
      window.Swal.fire({
        icon: 'warning',
        title: 'พบ PM เกินกำหนด!',
        html: `มี <b>${over.length}</b> รายการที่เกินกำหนด<br/><small style="color:var(--ink-faint)">รายการแรก: ${over[0].machineId} - ${over[0].item}</small>`,
        confirmButtonText: 'รับทราบ',
      });
    }
  }, [enriched.length]);

  const filtered = React.useMemo(() => {
    let list = enriched;
    if (statusFilter !== 'ALL') list = list.filter(p => p.status === statusFilter);
    if (q.trim()) {
      const k = q.trim().toLowerCase();
      list = list.filter(p =>
        (p.machineId || '').toLowerCase().includes(k) ||
        (p.machineName || '').toLowerCase().includes(k) ||
        (p.item || '').toLowerCase().includes(k) ||
        (p.assignee || '').toLowerCase().includes(k));
    }
    // overdue first
    const order = { 'เกินกำหนด': 0, 'ถึงกำหนด': 1, 'ยังไม่ถึงกำหนด': 2, 'ดำเนินการแล้ว': 3 };
    return [...list].sort((a, b) => (order[a.status] - order[b.status]) || a.nextDate.localeCompare(b.nextDate));
  }, [enriched, q, statusFilter]);

  const editPM = async (existing) => {
    const machineOpts = db.machines.map(m => `<option value="${m.id}" ${existing?.machineId===m.id?'selected':''}>${m.id} - ${m.name}</option>`).join('');
    const techOpts = db.technicians.map(t => `<option value="${t.name}" ${existing?.assignee===t.name?'selected':''}>${t.name}</option>`).join('');
    const freqOpts = Object.keys(PM_FREQ).map(f => `<option value="${f}" ${existing?.frequency===f?'selected':''}>${f}</option>`).join('');
    const html = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;text-align:left">
        <div style="grid-column:1/-1"><label class="swl-l">รหัสเครื่องจักร *</label>
          <select id="pm-machine" class="swal2-select"><option value="">— เลือก —</option>${machineOpts}</select>
        </div>
        <div style="grid-column:1/-1"><label class="swl-l">รายการตรวจเช็ค *</label>
          <input id="pm-item" class="swal2-input" value="${(existing?.item ?? '').replace(/"/g,'&quot;')}"/></div>
        <div><label class="swl-l">ความถี่</label>
          <select id="pm-freq" class="swal2-select">${freqOpts}</select></div>
        <div><label class="swl-l">ผู้รับผิดชอบ</label>
          <select id="pm-assignee" class="swal2-select"><option value="">— เลือก —</option>${techOpts}</select></div>
        <div><label class="swl-l">PM ล่าสุด</label>
          <input id="pm-last" type="date" class="swal2-input" value="${existing?.lastDate ?? ''}"/></div>
        <div><label class="swl-l">PM ครั้งถัดไป</label>
          <input id="pm-next" type="date" class="swal2-input" value="${existing?.nextDate ?? ''}"/></div>
      </div>
      <style>
        .swl-l{display:block;font-size:.74rem;color:var(--ink-faint);margin:.2rem 0 .2rem .25rem;font-weight:600}
        .swal2-input,.swal2-select,.swal2-textarea{
          margin:.15rem 0!important;width:100%!important;max-width:100%!important;
          background: rgba(255,255,255,0.05)!important;
          border: 1px solid rgba(255,255,255,0.18)!important;
          border-radius: .75rem!important;
          color: var(--ink)!important;
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
          transition: all .18s ease;
        }
        .swal2-input:focus,.swal2-select:focus,.swal2-textarea:focus{
          background: rgba(255,255,255,0.10)!important;
          border-color: rgba(56,224,255,0.7)!important;
          box-shadow: 0 0 0 4px rgba(56,224,255,0.15), inset 0 1px 0 rgba(255,255,255,0.08)!important;
          outline: none!important;
        }
        /* dropdown panel (native) — dark translucent */
        .swal2-select option{
          background: rgba(10,22,60,0.95)!important;
          color: var(--ink)!important;
          padding: .4rem!important;
        }
      </style>`;
    const r = await window.Swal.fire({
      title: existing ? 'แก้ไขรายการ PM' : 'เพิ่มรายการ PM',
      html, width: 640,
      showCancelButton: true, confirmButtonText: existing ? 'บันทึก' : 'เพิ่ม', cancelButtonText: 'ยกเลิก',
      focusConfirm: false,
      preConfirm: () => {
        const machineId = document.getElementById('pm-machine').value;
        const item = document.getElementById('pm-item').value.trim();
        if (!machineId || !item) { window.Swal.showValidationMessage('เลือกเครื่องจักรและกรอกรายการตรวจเช็ค'); return false; }
        const machineName = db.machines.find(m => m.id === machineId)?.name || '';
        const frequency = document.getElementById('pm-freq').value;
        const lastDate = document.getElementById('pm-last').value;
        let nextDate = document.getElementById('pm-next').value;
        if (!nextDate && lastDate) {
          const d = new Date(lastDate); d.setDate(d.getDate() + PM_FREQ[frequency]);
          nextDate = d.toISOString().slice(0, 10);
        }
        return {
          machineId, machineName, item, frequency,
          lastDate, nextDate,
          assignee: document.getElementById('pm-assignee').value,
        };
      }
    });
    if (!r.isConfirmed) return;
    setDb(prev => {
      let pmPlans;
      if (existing) pmPlans = prev.pmPlans.map(p => p.id === existing.id ? { ...p, ...r.value } : p);
      else pmPlans = [...prev.pmPlans, { id: 'PM-' + Date.now().toString().slice(-6), status: 'รอตรวจสอบ', ...r.value }];
      return { ...prev, pmPlans };
    });
    toast('success', existing ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ PM เรียบร้อย');
  };

  const recordPM = async (p) => {
    const techOpts = db.technicians.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
    const r = await window.Swal.fire({
      title: 'บันทึกผลการทำ PM',
      html: `
        <div style="text-align:left">
          <div class="font-semibold" style="font-size:.95rem;margin-bottom:.5rem">${p.machineId} · ${p.item}</div>
          <label class="swl-l">วันที่ทำ PM</label>
          <input id="pm-done" type="date" class="swal2-input" value="${today()}"/>
          <label class="swl-l">ผู้ดำเนินการ</label>
          <select id="pm-by" class="swal2-select"><option value="">— เลือก —</option>${techOpts}</select>
          <label class="swl-l">ผลการตรวจ / หมายเหตุ</label>
          <textarea id="pm-note" class="swal2-textarea" placeholder="ผลที่พบ, สิ่งที่ดำเนินการ..."></textarea>
        </div>
        <style>.swl-l{display:block;font-size:.74rem;color:var(--ink-faint);margin:.5rem 0 .15rem .25rem;font-weight:600}
        .swal2-input,.swal2-select,.swal2-textarea{margin:.15rem 0!important;width:100%!important;max-width:100%!important;}</style>`,
      showCancelButton: true, confirmButtonText: 'บันทึก', cancelButtonText: 'ยกเลิก',
      focusConfirm: false,
      preConfirm: () => ({
        doneDate: document.getElementById('pm-done').value,
        doneBy: document.getElementById('pm-by').value,
        note: document.getElementById('pm-note').value.trim(),
      }),
    });
    if (!r.isConfirmed) return;
    const doneDate = r.value.doneDate;
    const nextD = new Date(doneDate); nextD.setDate(nextD.getDate() + (PM_FREQ[p.frequency] || 30));
    const nextDate = nextD.toISOString().slice(0, 10);
    const record = {
      id: 'PMR-' + Date.now().toString().slice(-6),
      pmId: p.id, machineId: p.machineId, machineName: p.machineName,
      item: p.item, frequency: p.frequency,
      doneDate, doneBy: r.value.doneBy, note: r.value.note,
    };
    setDb(prev => ({
      ...prev,
      pmRecords: [record, ...prev.pmRecords],
      pmPlans: prev.pmPlans.map(x => x.id === p.id ? { ...x, lastDate: doneDate, nextDate, status: 'ดำเนินการแล้ว' } : x),
    }));
    toast('success', 'บันทึกผล PM เรียบร้อย');
  };

  const remove = async (p) => {
    if (!await confirmDialog('ลบรายการ PM?', p.machineId + ' · ' + p.item, 'ลบ')) return;
    setDb(prev => ({ ...prev, pmPlans: prev.pmPlans.filter(x => x.id !== p.id) }));
    toast('success', 'ลบเรียบร้อย');
  };

  const sum = {
    overdue: enriched.filter(p => p.status === 'เกินกำหนด').length,
    due: enriched.filter(p => p.status === 'ถึงกำหนด').length,
    upcoming: enriched.filter(p => p.status === 'ยังไม่ถึงกำหนด').length,
    done: db.pmRecords.length,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <KPI label="เกินกำหนด"        value={sum.overdue}  icon="bell"     color="#ff5a7a" />
        <KPI label="ถึงกำหนด"          value={sum.due}      icon="calendar" color="#ffc04b" />
        <KPI label="ยังไม่ถึงกำหนด"    value={sum.upcoming} icon="check"    color="#34e3a5" />
        <KPI label="บันทึก PM แล้ว"   value={sum.done}     icon="history"  color="#6c8cff" />
      </div>

      <Card padding={false}>
        <div className="p-5 flex flex-wrap items-center gap-3">
          <div className="h1 flex items-center gap-2"><Icon name="calendar" size={22} /> บำรุงรักษาตามวาระ (PM)</div>
          <div className="flex-1" />
          <div style={{ minWidth: 220, flex: '1 1 200px', maxWidth: 320 }}>
            <SearchInput value={q} onChange={setQ} placeholder="ค้นหา..." />
          </div>
          <select className="select" style={{ maxWidth: 200 }}
                  value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">ทุกสถานะ</option>
            {['เกินกำหนด','ถึงกำหนด','ยังไม่ถึงกำหนด','ดำเนินการแล้ว'].map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => editPM(null)}><Icon name="plus" size={13} /> เพิ่ม PM</button>
        </div>
        <div className="tbl-wrap" style={{ maxHeight: 560 }}>
          <table className="tbl">
            <thead><tr>
              <th>รหัส</th>
              <th>เครื่องจักร</th>
              <th>รายการตรวจเช็ค</th>
              <th>ความถี่</th>
              <th>PM ล่าสุด</th>
              <th>PM ถัดไป</th>
              <th>ผู้รับผิดชอบ</th>
              <th>สถานะ</th>
              <th style={{ width: 150 }}></th>
            </tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td className="num">{p.id}</td>
                  <td>
                    <div className="font-semibold">{p.machineId}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--ink-faint)' }}>{p.machineName}</div>
                  </td>
                  <td>{p.item}</td>
                  <td><span className="tag">{p.frequency}</span></td>
                  <td className="num">{fmtDate(p.lastDate)}</td>
                  <td className="num">
                    {fmtDate(p.nextDate)}
                    {p.nextDate && p.status === 'เกินกำหนด' &&
                      <span style={{ color: '#ff5a7a', fontSize: '0.74rem', marginLeft: 6 }}>
                        ({Math.abs(daysBetween(p.nextDate, today()))} วัน)
                      </span>}
                  </td>
                  <td>{p.assignee || <span style={{ color: 'var(--ink-faint)' }}>—</span>}</td>
                  <td><StatusTag value={p.status} /></td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button className="btn btn-good btn-sm" title="บันทึกผล" onClick={() => recordPM(p)}>
                        <Icon name="check" size={13} />
                      </button>
                      <button className="btn btn-ghost btn-sm" title="แก้ไข" onClick={() => editPM(p)}>
                        <Icon name="edit" size={13} />
                      </button>
                      <button className="btn btn-ghost btn-sm" title="ลบ" onClick={() => remove(p)}>
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9}><Empty icon="calendar" title="ไม่พบรายการ PM" /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
window.PagePM = PagePM;
