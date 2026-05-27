// ติดตามสถานะงานซ่อม — page-repair-tracking.jsx
function PageRepairTracking({ db, setDb, nav }) {
  const [q, setQ] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [detail, setDetail] = React.useState(null);

  const STATUSES = ['รอรับงาน','กำลังดำเนินการ','รออะไหล่','ซ่อมเสร็จ','ยกเลิก'];

  const filtered = React.useMemo(() => {
    let list = db.repairRequests;
    if (statusFilter !== 'ALL') list = list.filter(r => r.status === statusFilter);
    if (q.trim()) {
      const k = q.trim().toLowerCase();
      list = list.filter(r =>
        (r.id || '').toLowerCase().includes(k) ||
        (r.machineId || '').toLowerCase().includes(k) ||
        (r.machineName || '').toLowerCase().includes(k) ||
        (r.reporter || '').toLowerCase().includes(k) ||
        (r.status || '').toLowerCase().includes(k) ||
        (r.date || '').includes(k) ||
        (r.symptom || '').toLowerCase().includes(k)
      );
    }
    return [...list].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [db.repairRequests, q, statusFilter]);

  const updateStatus = async (r) => {
    const newStatus = await window.Swal.fire({
      title: 'เปลี่ยนสถานะงาน',
      input: 'select',
      inputOptions: Object.fromEntries(STATUSES.map(s => [s, s])),
      inputValue: r.status,
      showCancelButton: true,
      confirmButtonText: 'อัปเดต', cancelButtonText: 'ยกเลิก',
    });
    if (!newStatus.isConfirmed) return;
    setDb(prev => ({
      ...prev,
      repairRequests: prev.repairRequests.map(x => x.id === r.id ? { ...x, status: newStatus.value } : x),
    }));
    window.Api.update('RepairRequests', r.id, 'id', { status: newStatus.value }).catch(()=>{});
    toast('success', 'อัปเดตสถานะแล้ว');
  };

  const closeWork = async (r) => {
    if (!await confirmDialog('ปิดงานซ่อม?', r.id + ' ' + r.machineId + ' - จะถูกตั้งสถานะเป็น "ซ่อมเสร็จ"', 'ปิดงาน')) return;
    setDb(prev => ({
      ...prev,
      repairRequests: prev.repairRequests.map(x => x.id === r.id ? { ...x, status: 'ซ่อมเสร็จ' } : x),
    }));
    toast('success', 'ปิดงานเรียบร้อย');
  };

  return (
    <Card padding={false}>
      <div className="p-5 flex flex-wrap items-center gap-3">
        <div className="h1 flex items-center gap-2"><Icon name="bell" size={22} /> ติดตามสถานะงานซ่อม</div>
        <div className="tag tag-info">{filtered.length} รายการ</div>
        <div className="flex-1" />
        <div style={{ minWidth: 220, flex: '1 1 200px', maxWidth: 320 }}>
          <SearchInput value={q} onChange={setQ} placeholder="ค้นหารหัส, เครื่อง, ผู้แจ้ง, สถานะ..." />
        </div>
        <select className="select" style={{ maxWidth: 200 }}
                value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="ALL">ทุกสถานะ</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => nav('repair-new')}>
          <Icon name="plus" size={13} /> แจ้งใหม่
        </button>
      </div>

      <div className="tbl-wrap" style={{ maxHeight: 620 }}>
        <table className="tbl">
          <thead><tr>
            <th>เลขใบงาน</th>
            <th>วันที่/เวลา</th>
            <th>เครื่องจักร</th>
            <th>ผู้แจ้ง</th>
            <th>อาการ</th>
            <th>ความเร่งด่วน</th>
            <th>สถานะ</th>
            <th>ผู้รับผิดชอบ</th>
            <th style={{ width: 150 }}></th>
          </tr></thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td className="font-semibold num">{r.id}</td>
                <td className="num" style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.date)} <span style={{ color: 'var(--ink-faint)' }}>{r.time}</span></td>
                <td>
                  <div className="flex items-center gap-2">
                    <AreaBadge area={r.area} />
                    <div>
                      <div className="font-semibold flex items-center gap-1.5">
                        {r.machineId}
                        {r.photos && r.photos.length > 0 && (
                          <span title={r.photos.length + ' รูป'}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 2,
                                         color: '#8ad6ff', fontSize: '0.72rem', fontWeight: 600 }}>
                            <Icon name="file" size={11} />{r.photos.length}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--ink-faint)' }}>{r.machineName}</div>
                    </div>
                  </div>
                </td>
                <td>{r.reporter}</td>
                <td style={{ maxWidth: 240 }}>{r.symptom}</td>
                <td><StatusTag value={r.urgency} colorMap={URGENCY_COLORS} /></td>
                <td><StatusTag value={r.status} /></td>
                <td>{r.assignee || <span style={{ color: 'var(--ink-faint)' }}>—</span>}</td>
                <td>
                  <div className="flex gap-1 justify-end">
                    <button className="btn btn-ghost btn-sm" title="รายละเอียด" onClick={() => setDetail(r)}>
                      <Icon name="eye" size={13} />
                    </button>
                    <button className="btn btn-ghost btn-sm" title="แก้ไขสถานะ" onClick={() => updateStatus(r)}>
                      <Icon name="edit" size={13} />
                    </button>
                    {r.status !== 'ซ่อมเสร็จ' && r.status !== 'ยกเลิก' && (
                      <button className="btn btn-good btn-sm" title="ปิดงาน" onClick={() => closeWork(r)}>
                        <Icon name="check" size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9}><Empty icon="wrench" title="ไม่พบงานซ่อม" /></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)}
             title={'รายละเอียดงานซ่อม ' + (detail?.id || '')}
             footer={
               <>
                 <button className="btn btn-ghost" onClick={() => setDetail(null)}>ปิด</button>
                 <button className="btn btn-primary" onClick={() => { setDetail(null); nav('repair-rec'); localStorage.setItem('mifs.record.focus', detail?.id || ''); }}>
                   <Icon name="edit" size={14} /> บันทึกประวัติการซ่อม
                 </button>
               </>
             }>
        {detail && <RepairDetail r={detail} db={db} />}
      </Modal>
    </Card>
  );
}

function RepairDetail({ r, db }) {
  const history = db.repairHistory.filter(h => h.requestId === r.id);
  const machineHistory = db.repairRequests.filter(x => x.machineId === r.machineId && x.id !== r.id).slice(0, 5);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <DetailField label="เลขใบงาน" value={r.id} />
        <DetailField label="วันที่/เวลาแจ้ง" value={fmtDate(r.date) + ' ' + r.time} />
        <DetailField label="ผู้แจ้งซ่อม" value={r.reporter} />
        <DetailField label="พื้นที่" value={r.area} />
        <DetailField label="ความเร่งด่วน" value={<StatusTag value={r.urgency} colorMap={URGENCY_COLORS} />} />
        <DetailField label="สถานะ" value={<StatusTag value={r.status} />} />
      </div>
      <div className="glass-soft rounded-2xl p-4">
        <div style={{ fontSize: '0.74rem', color: 'var(--ink-faint)', fontWeight: 600 }}>เครื่องจักร</div>
        <div className="font-bold text-lg">{r.machineId}</div>
        <div style={{ color: 'var(--ink-dim)' }}>{r.machineName}</div>
      </div>
      <div>
        <div style={{ fontSize: '0.74rem', color: 'var(--ink-faint)', fontWeight: 600, marginBottom: 6 }}>อาการเสีย</div>
        <div className="glass-soft rounded-xl p-3" style={{ minHeight: 60 }}>{r.symptom}</div>
      </div>
      {r.note && (
        <div>
          <div style={{ fontSize: '0.74rem', color: 'var(--ink-faint)', fontWeight: 600, marginBottom: 6 }}>หมายเหตุ</div>
          <div className="glass-soft rounded-xl p-3">{r.note}</div>
        </div>
      )}

      {r.photos && r.photos.length > 0 && (
        <div>
          <div style={{ fontSize: '0.74rem', color: 'var(--ink-faint)', fontWeight: 600, marginBottom: 6 }} className="flex items-center gap-1">
            <Icon name="file" size={13} /> ภาพประกอบการแจ้งซ่อม ({r.photos.length})
          </div>
          <PhotoGallery photos={r.photos} thumb={88} />
        </div>
      )}

      {history.length > 0 && (
        <div>
          <div className="h3 mb-2 flex items-center gap-2"><Icon name="history" size={16} /> ประวัติการซ่อมของใบงานนี้</div>
          <div className="flex flex-col gap-2">
            {history.map(h => (
              <div key={h.id} className="glass-soft rounded-xl p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="font-semibold">{fmtDate(h.startDate)} – {fmtDate(h.endDate)}</div>
                  <StatusTag value={h.afterStatus} />
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--ink-dim)', marginTop: 4 }}>
                  <b>วิธีแก้:</b> {h.solution || '-'} · <b>อะไหล่:</b> {h.parts || '-'} · <b>ค่าใช้จ่าย:</b> {Number(h.cost || 0).toLocaleString()} บาท
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--ink-faint)', marginTop: 4 }}>โดย: {h.technician}</div>
                {h.photos && h.photos.length > 0 && (
                  <div className="mt-2"><PhotoGallery photos={h.photos} thumb={64} /></div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {machineHistory.length > 0 && (
        <div>
          <div className="h3 mb-2 flex items-center gap-2"><Icon name="machine" size={16} /> งานอื่นของเครื่อง {r.machineId}</div>
          <div className="flex flex-col gap-2">
            {machineHistory.map(h => (
              <div key={h.id} className="glass-soft rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-semibold">{h.id} – {h.symptom}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--ink-faint)' }}>{fmtDate(h.date)}</div>
                </div>
                <StatusTag value={h.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', color: 'var(--ink-faint)', fontWeight: 600 }}>{label}</div>
      <div className="font-semibold" style={{ marginTop: 2 }}>{value}</div>
    </div>
  );
}

window.PageRepairTracking = PageRepairTracking;
