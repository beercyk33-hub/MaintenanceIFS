// แจ้งซ่อมเครื่องจักร — page-repair-request.jsx
function PageRepairRequest({ db, setDb, nav }) {
  const empty = () => ({
    id: 'RR-' + Date.now().toString().slice(-6),
    date: today(),
    time: nowTime(),
    machineId: '',
    machineName: '',
    area: 'PRP',
    reporter: '',
    symptom: '',
    urgency: 'ปานกลาง',
    status: 'รอรับงาน',
    assignee: '',
    note: '',
    photos: [],
  });

  const [form, setForm] = React.useState(empty);
  const [saving, setSaving] = React.useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-fill machine name + area when machine ID is picked
  React.useEffect(() => {
    if (!form.machineId) return;
    const m = db.machines.find(x => x.id === form.machineId);
    if (m && (form.machineName !== m.name || form.area !== m.area)) {
      setForm(f => ({ ...f, machineName: m.name, area: m.area }));
    }
  }, [form.machineId, db.machines]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.machineId || !form.symptom || !form.reporter) {
      toast('warning', 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }
    setSaving(true);
    // 1) Save locally first so the UI is never blocked
    let record = { ...form };
    setDb(prev => ({ ...prev, repairRequests: [record, ...prev.repairRequests] }));

    // 2) Try cloud upload (photos to Drive -> URLs, then append row)
    if (form.photos && form.photos.length > 0) {
      window.Swal.fire({
        title: 'กำลังอัปโหลดรูปภาพ...',
        html: `<div style="color:var(--ink-dim)">บันทึก ${form.photos.length} รูปไปยัง Google Drive</div>`,
        didOpen: () => window.Swal.showLoading(), allowOutsideClick: false,
      });
      try {
        const uploaded = await window.Api.uploadPhotos(form.photos, 'MaintenanceIFS/RepairRequests');
        record = { ...record, photos: uploaded };
        // patch local copy with returned URLs (drop base64 to save storage)
        setDb(prev => ({
          ...prev,
          repairRequests: prev.repairRequests.map(r => r.id === record.id ? record : r),
        }));
      } catch (err) { /* keep base64 fallback */ }
      window.Swal.close();
    }
    const photosForSheet = (record.photos || []).map(p => p.url).filter(Boolean).join(', ');
    window.Api.append('RepairRequests', { ...record, photos: photosForSheet }).catch(() => {});

    setSaving(false);
    await window.Swal.fire({
      icon: 'success', title: 'บันทึกการแจ้งซ่อมเรียบร้อย',
      html: 'หมายเลขใบงาน: <b>' + form.id + '</b>' +
            (form.photos?.length ? '<br/><small style="color:var(--ink-faint)">แนบรูป ' + form.photos.length + ' ภาพ</small>' : ''),
      timer: 2400, showConfirmButton: false,
    });
    setForm(empty());
  };

  const recent = React.useMemo(
    () => [...db.repairRequests].slice(0, 5),
    [db.repairRequests]
  );

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)' }}>
      <Card padding={false}>
        <div className="px-6 pt-6 pb-4 flex items-center gap-3 flex-wrap" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="rounded-2xl flex items-center justify-center"
               style={{ width: 44, height: 44, background: 'linear-gradient(135deg, rgba(255,90,122,0.25), rgba(255,154,75,0.25))', border:'1px solid rgba(255,90,122,0.4)', color:'#ffa1b3' }}>
            <Icon name="wrench" size={22} />
          </div>
          <div>
            <div className="h1">แจ้งซ่อมเครื่องจักร</div>
            <div style={{ fontSize: '0.86rem', color: 'var(--ink-dim)' }}>กรอกรายละเอียดงานซ่อมเพื่อบันทึกเข้าระบบ</div>
          </div>
          <div className="flex-1" />
          <div className="tag tag-info">เลขใบงาน: <span className="num font-bold ml-1">{form.id}</span></div>
        </div>

        <form onSubmit={submit} className="p-6 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <Field label="วันที่แจ้งซ่อม" required>
            <input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} required />
          </Field>
          <Field label="เวลา" required>
            <input type="time" className="input" value={form.time} onChange={e => set('time', e.target.value)} required />
          </Field>

          <Field label="รหัสเครื่องจักร" required>
            <input list="machine-options" className="input" value={form.machineId}
                   onChange={e => set('machineId', e.target.value)}
                   placeholder="พิมพ์/เลือกรหัสเครื่อง..." required />
            <datalist id="machine-options">
              {db.machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </datalist>
          </Field>
          <Field label="ชื่อเครื่องจักร">
            <input className="input" value={form.machineName} onChange={e => set('machineName', e.target.value)} />
          </Field>

          <Field label="ไลน์ผลิต/พื้นที่ติดตั้ง" required>
            <select className="select" value={form.area} onChange={e => set('area', e.target.value)}>
              {AREAS.map(a => <option key={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="ผู้แจ้งซ่อม" required>
            <input className="input" value={form.reporter} onChange={e => set('reporter', e.target.value)} placeholder="ชื่อ-สกุล" required />
          </Field>

          <div style={{ gridColumn: '1/-1' }}>
            <Field label="อาการเสีย" required>
              <textarea className="textarea" value={form.symptom} onChange={e => set('symptom', e.target.value)}
                        placeholder="อธิบายอาการ/สิ่งที่พบ..." required />
            </Field>
          </div>

          <Field label="ระดับความเร่งด่วน">
            <select className="select" value={form.urgency} onChange={e => set('urgency', e.target.value)}>
              {['ต่ำ','ปานกลาง','สูง','ฉุกเฉิน'].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="สถานะงาน">
            <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>
              {['รอรับงาน','กำลังดำเนินการ','รออะไหล่','ซ่อมเสร็จ','ยกเลิก'].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="ผู้รับผิดชอบงานซ่อม">
            <select className="select" value={form.assignee} onChange={e => set('assignee', e.target.value)}>
              <option value="">— ยังไม่ระบุ —</option>
              {db.technicians.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </Field>
          <div style={{ gridColumn: '1/-1' }}>
            <Field label="หมายเหตุ">
              <textarea className="textarea" value={form.note} onChange={e => set('note', e.target.value)} />
            </Field>
          </div>

          <div style={{ gridColumn: '1/-1' }}>
            <PhotoUploader value={form.photos} onChange={(p) => set('photos', p)}
                           label="แนบรูปภาพอาการเสีย" max={6} />
          </div>

          <div style={{ gridColumn: '1/-1' }} className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => setForm(empty())}>
              <Icon name="refresh" size={14} /> ล้างฟอร์ม
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Icon name={saving ? 'refresh' : 'check'} size={14} className={saving ? 'animate-spin' : ''} />
              {saving ? ' กำลังบันทึก...' : ' บันทึกข้อมูล'}
            </button>
          </div>
        </form>
      </Card>

      <div className="flex flex-col gap-4">
        <Card title="แจ้งล่าสุด"
              action={<button className="btn btn-sm btn-ghost" onClick={() => nav('repair-track')}>ทั้งหมด</button>}>
          {recent.length === 0 ? <Empty icon="wrench" title="ยังไม่มีงาน" /> : (
            <div className="flex flex-col gap-2">
              {recent.map(r => (
                <div key={r.id} className="glass-soft rounded-2xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold">{r.machineId}</div>
                    <StatusTag value={r.status} />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-dim)', marginTop: 4 }}>{r.symptom}</div>
                  <div className="flex items-center gap-2 mt-2" style={{ fontSize: '0.74rem', color: 'var(--ink-faint)' }}>
                    <AreaBadge area={r.area} />
                    <span>{fmtDate(r.date)} {r.time}</span>
                    {r.photos && r.photos.length > 0 && (
                      <span className="tag" style={{ padding: '0.1rem 0.4rem' }}>
                        <Icon name="file" size={11} /> {r.photos.length}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
window.PageRepairRequest = PageRepairRequest;
