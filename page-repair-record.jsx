// บันทึกการซ่อม — page-repair-record.jsx
function PageRepairRecord({ db, setDb, nav }) {
  const focusId = localStorage.getItem('mifs.record.focus') || '';
  const empty = () => ({
    id: 'RH-' + Date.now().toString().slice(-6),
    requestId: focusId,
    startDate: today(),
    endDate: today(),
    detail: '',
    cause: '',
    solution: '',
    parts: '',
    cost: '',
    technician: '',
    testResult: '',
    afterStatus: 'ใช้งานได้',
    photos: [],
  });
  const [form, setForm] = React.useState(empty);
  const [saving, setSaving] = React.useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  React.useEffect(() => () => localStorage.removeItem('mifs.record.focus'), []);

  const openRequests = db.repairRequests.filter(r => r.status !== 'ซ่อมเสร็จ' && r.status !== 'ยกเลิก');
  const selected = db.repairRequests.find(r => r.id === form.requestId);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.requestId || !form.solution || !form.technician) {
      toast('warning', 'กรุณาเลือกใบงาน, กรอกวิธีแก้ไข และผู้ดำเนินการ');
      return;
    }
    setSaving(true);
    let record = { ...form, machineId: selected?.machineId || '', machineName: selected?.machineName || '' };

    // Save locally first
    setDb(prev => {
      const repairHistory = [record, ...prev.repairHistory];
      const repairRequests = prev.repairRequests.map(r =>
        r.id === form.requestId ? { ...r, status: 'ซ่อมเสร็จ' } : r);
      return { ...prev, repairHistory, repairRequests };
    });

    // Upload photos to Drive (if any)
    if (form.photos && form.photos.length > 0) {
      window.Swal.fire({
        title: 'กำลังอัปโหลดรูปภาพ...',
        html: `<div style="color:var(--ink-dim)">บันทึก ${form.photos.length} รูปไปยัง Google Drive</div>`,
        didOpen: () => window.Swal.showLoading(), allowOutsideClick: false,
      });
      try {
        const uploaded = await window.Api.uploadPhotos(form.photos, 'MaintenanceIFS/RepairHistory');
        record = { ...record, photos: uploaded };
        setDb(prev => ({
          ...prev,
          repairHistory: prev.repairHistory.map(h => h.id === record.id ? record : h),
        }));
      } catch (err) { /* keep base64 */ }
      window.Swal.close();
    }
    const photosForSheet = (record.photos || []).map(p => p.url).filter(Boolean).join(', ');
    window.Api.append('RepairHistory', { ...record, photos: photosForSheet }).catch(() => {});

    setSaving(false);
    await window.Swal.fire({
      icon: 'success', title: 'บันทึกประวัติการซ่อมเรียบร้อย',
      html: (form.photos?.length ? '<small style="color:var(--ink-faint)">แนบรูป ' + form.photos.length + ' ภาพ</small>' : ''),
      timer: 2200, showConfirmButton: false,
    });
    setForm({ ...empty(), id: 'RH-' + Date.now().toString().slice(-6), requestId: '' });
  };

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)' }}>
      <Card padding={false}>
        <div className="px-6 pt-6 pb-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="rounded-2xl flex items-center justify-center"
               style={{ width: 44, height: 44, background: 'linear-gradient(135deg, rgba(52,227,165,0.25), rgba(56,224,255,0.25))', border:'1px solid rgba(52,227,165,0.4)', color:'#8af2c8' }}>
            <Icon name="edit" size={22} />
          </div>
          <div>
            <div className="h1">บันทึกการซ่อม</div>
            <div style={{ fontSize: '0.86rem', color: 'var(--ink-dim)' }}>บันทึกรายละเอียดหลังดำเนินการซ่อมเสร็จ</div>
          </div>
        </div>
        <form onSubmit={submit} className="p-6 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div style={{ gridColumn: '1/-1' }}>
            <Field label="เลือกใบงานแจ้งซ่อม" required>
              <select className="select" value={form.requestId} onChange={e => set('requestId', e.target.value)} required>
                <option value="">— เลือกใบงาน —</option>
                {[...openRequests, ...(focusId && !openRequests.some(r => r.id === focusId) ? db.repairRequests.filter(r => r.id === focusId) : [])]
                  .map(r => (
                    <option key={r.id} value={r.id}>{r.id} · {r.machineId} - {r.machineName} ({r.status})</option>
                  ))}
              </select>
            </Field>
          </div>

          {selected && (
            <div style={{ gridColumn: '1/-1' }} className="glass-soft rounded-2xl p-3 flex items-center gap-3 flex-wrap">
              <AreaBadge area={selected.area} />
              <div className="font-bold">{selected.machineId}</div>
              <div style={{ color: 'var(--ink-dim)' }}>{selected.machineName}</div>
              <div className="flex-1" />
              <span style={{ fontSize: '0.84rem', color: 'var(--ink-dim)' }}>อาการ: {selected.symptom}</span>
            </div>
          )}

          <Field label="วันที่เริ่มซ่อม" required>
            <input type="date" className="input" value={form.startDate} onChange={e => set('startDate', e.target.value)} required />
          </Field>
          <Field label="วันที่ซ่อมเสร็จ" required>
            <input type="date" className="input" value={form.endDate} onChange={e => set('endDate', e.target.value)} required />
          </Field>

          <div style={{ gridColumn: '1/-1' }}>
            <Field label="รายละเอียดการซ่อม">
              <textarea className="textarea" value={form.detail} onChange={e => set('detail', e.target.value)} />
            </Field>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <Field label="สาเหตุของปัญหา">
              <textarea className="textarea" value={form.cause} onChange={e => set('cause', e.target.value)} />
            </Field>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <Field label="วิธีแก้ไข" required>
              <textarea className="textarea" value={form.solution} onChange={e => set('solution', e.target.value)} required />
            </Field>
          </div>

          <Field label="อะไหล่ที่ใช้">
            <input className="input" value={form.parts} onChange={e => set('parts', e.target.value)} placeholder="เช่น Bearing 6204 x 2" />
          </Field>
          <Field label="ค่าใช้จ่าย (บาท)">
            <input type="number" min="0" className="input num" value={form.cost} onChange={e => set('cost', e.target.value)} />
          </Field>

          <Field label="ผู้ดำเนินการซ่อม" required>
            <select className="select" value={form.technician} onChange={e => set('technician', e.target.value)} required>
              <option value="">— เลือกช่าง —</option>
              {db.technicians.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="สถานะหลังซ่อม">
            <select className="select" value={form.afterStatus} onChange={e => set('afterStatus', e.target.value)}>
              {['ใช้งานได้','ต้องติดตาม','ต้องหยุดเครื่อง'].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>

          <div style={{ gridColumn: '1/-1' }}>
            <Field label="ผลการทดสอบหลังซ่อม">
              <textarea className="textarea" value={form.testResult} onChange={e => set('testResult', e.target.value)}
                        placeholder="ผลการทดสอบ, ค่าที่วัดได้, สิ่งที่ต้องเฝ้าระวัง..." />
            </Field>
          </div>

          <div style={{ gridColumn: '1/-1' }}>
            <PhotoUploader value={form.photos} onChange={(p) => set('photos', p)}
                           label="แนบรูปหลังการซ่อม (Before / After)" max={8} />
          </div>

          <div style={{ gridColumn: '1/-1' }} className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => setForm(empty())}>
              <Icon name="refresh" size={14} /> ล้าง
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Icon name={saving ? 'refresh' : 'check'} size={14} className={saving ? 'animate-spin' : ''} />
              {saving ? ' กำลังบันทึก...' : ' บันทึกประวัติการซ่อม'}
            </button>
          </div>
        </form>
      </Card>

      <Card title="ประวัติล่าสุด" action={<button className="btn btn-sm btn-ghost" onClick={() => nav('history')}>ดูทั้งหมด</button>}>
        {db.repairHistory.length === 0 ? <Empty icon="history" title="ยังไม่มีประวัติการซ่อม" sub="บันทึกใบแรกได้ที่ฟอร์มทางซ้าย" /> : (
          <div className="flex flex-col gap-2">
            {db.repairHistory.slice(0, 8).map(h => (
              <div key={h.id} className="glass-soft rounded-2xl p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-semibold">{h.machineId}</div>
                  <StatusTag value={h.afterStatus} />
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--ink-dim)', marginTop: 4 }}>{h.solution || h.detail}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--ink-faint)', marginTop: 4 }}>
                  {fmtDate(h.endDate)} · {h.technician}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
window.PageRepairRecord = PageRepairRecord;
