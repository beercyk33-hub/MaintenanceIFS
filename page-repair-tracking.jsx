// ติดตามสถานะงานซ่อม — page-repair-tracking.jsx
// Two-level layout: a grid of status cards as the entry view; click one to drill
// into the list of requests with that status. All actions (approve, edit, close,
// detail, form-sheet) live on the drill-down page.

function PageRepairTracking({ db, setDb, nav, currentUser, requestLogin }) {
  const [selectedStatus, setSelectedStatus] = React.useState(null);
  const [q, setQ] = React.useState('');
  const [detail, setDetail] = React.useState(null);
  const [formSheet, setFormSheet] = React.useState(null);
  const [approving, setApproving] = React.useState(null);

  // Status definitions with colour theme + icon.
  const STATUSES = [
    { key: 'รออนุมัติ',       icon: 'bell',     accent: '#6c8cff', tint: 'rgba(108,140,255,0.14)', border: 'rgba(108,140,255,0.34)', desc: 'รออนุมัติจาก ผจก./QA/Safety/COO' },
    { key: 'ถูกปฏิเสธ',       icon: 'close',    accent: '#ff5a7a', tint: 'rgba(255,90,122,0.14)',  border: 'rgba(255,90,122,0.34)',  desc: 'ปฏิเสธจากผู้อนุมัติคนใดคนหนึ่ง' },
    { key: 'รอรับงาน',        icon: 'bell',     accent: '#ffc04b', tint: 'rgba(255,192,75,0.14)',  border: 'rgba(255,192,75,0.34)',  desc: 'อนุมัติครบ พร้อมให้ช่างรับงาน' },
    { key: 'กำลังดำเนินการ',  icon: 'bolt',     accent: '#6cb8ff', tint: 'rgba(108,184,255,0.14)', border: 'rgba(108,184,255,0.34)', desc: 'ช่างกำลังซ่อมอยู่' },
    { key: 'รออะไหล่',        icon: 'calendar', accent: '#ff9e4b', tint: 'rgba(255,158,75,0.14)',  border: 'rgba(255,158,75,0.34)',  desc: 'รออะไหล่/รอผู้รับจ้างภายนอก' },
    { key: 'ซ่อมเสร็จ',       icon: 'check',    accent: '#34e3a5', tint: 'rgba(52,227,165,0.14)',  border: 'rgba(52,227,165,0.34)',  desc: 'งานปิดสมบูรณ์ มีบันทึกการซ่อม' },
    { key: 'ยกเลิก',          icon: 'close',    accent: '#9ab0d6', tint: 'rgba(154,176,214,0.10)', border: 'rgba(154,176,214,0.30)', desc: 'ยกเลิกใบงาน ไม่ดำเนินการต่อ' },
  ];
  const STATUS_KEYS = STATUSES.map(s => s.key);

  // Counts per status (incl. legacy records with unknown status falling back to "รอรับงาน")
  const counts = React.useMemo(() => {
    const c = Object.fromEntries(STATUS_KEYS.map(s => [s, 0]));
    for (const r of db.repairRequests) {
      const k = STATUS_KEYS.includes(r.status) ? r.status : 'รอรับงาน';
      c[k]++;
    }
    return c;
  }, [db.repairRequests]);

  // === Approval submit handler (shared by detail/list views) ===
  const onApprovalSubmit = (roleKey, slot) => {
    if (!approving) return;
    const next = window.applyApproval(approving, roleKey, slot);
    setDb(prev => ({
      ...prev,
      repairRequests: prev.repairRequests.map(r => r.id === next.id ? next : r),
    }));
    window.Api && window.Api.update && window.Api.update('RepairRequests', next.id, 'id', {
      status: next.status,
      approvals: JSON.stringify(next.approvals),
    }).catch(() => {});
    toast('success', slot.status === 'approved' ? 'อนุมัติเรียบร้อย' : 'บันทึกการปฏิเสธแล้ว');
    setApproving(slot.status === 'rejected' || window.isFullyApproved(next) ? null : next);
  };

  const updateStatus = async (r) => {
    const newStatus = await window.Swal.fire({
      title: 'เปลี่ยนสถานะงาน',
      input: 'select',
      inputOptions: Object.fromEntries(STATUS_KEYS.map(s => [s, s])),
      inputValue: r.status,
      showCancelButton: true,
      confirmButtonText: 'อัปเดต', cancelButtonText: 'ยกเลิก',
    });
    if (!newStatus.isConfirmed) return;
    setDb(prev => ({
      ...prev,
      repairRequests: prev.repairRequests.map(x => x.id === r.id ? { ...x, status: newStatus.value } : x),
    }));
    window.Api && window.Api.update && window.Api.update('RepairRequests', r.id, 'id', { status: newStatus.value }).catch(()=>{});
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

  // === Drill-down view: list for one status ===
  if (selectedStatus) {
    const def = STATUSES.find(s => s.key === selectedStatus) || STATUSES[0];
    const list = (() => {
      let l = db.repairRequests.filter(r => (STATUS_KEYS.includes(r.status) ? r.status : 'รอรับงาน') === selectedStatus);
      if (q.trim()) {
        const k = q.trim().toLowerCase();
        l = l.filter(r =>
          (r.id || '').toLowerCase().includes(k) ||
          (r.machineId || '').toLowerCase().includes(k) ||
          (r.machineName || '').toLowerCase().includes(k) ||
          (r.reporter || '').toLowerCase().includes(k) ||
          (r.symptom || '').toLowerCase().includes(k));
      }
      return l.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    })();

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #02040d 0%, #050a23 18%, #061640 38%, #053b75 65%, #0a73b8 100%)' }}>
        {/* Sticky header */}
        <div className="sticky top-0 z-10" style={{ background: 'rgba(8, 16, 44, 0.95)', borderBottom: '1px solid var(--line)', backdropFilter: 'blur(10px)' }}>
          <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
            <button className="btn btn-ghost btn-sm flex items-center gap-1.5 flex-shrink-0"
                    onClick={() => { setSelectedStatus(null); setQ(''); }}
                    title="กลับไปเลือกสถานะ">
              <Icon name="close" size={18} /><span>กลับ</span>
            </button>
            <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
              <div className="rounded-xl flex items-center justify-center"
                   style={{ width: 36, height: 36, background: def.tint, border: '1px solid ' + def.border, color: def.accent }}>
                <Icon name={def.icon} size={18} />
              </div>
              <div className="min-w-0">
                <div className="h3 truncate">งานสถานะ "{def.key}"</div>
                <div className="text-xs" style={{ color: 'var(--ink-dim)' }}>{list.length} รายการ</div>
              </div>
            </div>
            <div style={{ minWidth: 200, flex: '1 1 200px', maxWidth: 320 }}>
              <SearchInput value={q} onChange={setQ} placeholder="ค้นหา..." />
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => nav('repair-new')}>
              <Icon name="plus" size={13} /> แจ้งใหม่
            </button>
          </div>
        </div>

        {/* Scrollable list */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
          <Card padding={false}>
            {list.length === 0 ? (
              <div className="p-5"><Empty icon="wrench" title="ไม่พบงานซ่อมในสถานะนี้" /></div>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr>
                    <th>เลขใบงาน</th>
                    <th>วันที่/เวลา</th>
                    <th>เครื่องจักร</th>
                    <th>ผู้แจ้ง</th>
                    <th>อาการ</th>
                    <th>ความเร่งด่วน</th>
                    <th>อนุมัติ</th>
                    <th>ผู้รับผิดชอบ</th>
                    <th style={{ width: 180 }}></th>
                  </tr></thead>
                  <tbody>
                    {list.map(r => (
                      <tr key={r.id}>
                        <td className="font-semibold num">{r.id}</td>
                        <td className="num" style={{ whiteSpace: 'nowrap' }}>
                          {fmtDate(r.date)} <span style={{ color: 'var(--ink-faint)' }}>{r.time}</span>
                        </td>
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
                        <td>{window.ApprovalDots ? <window.ApprovalDots request={r} /> : null}</td>
                        <td>{r.assignee || <span style={{ color: 'var(--ink-faint)' }}>—</span>}</td>
                        <td>
                          <div className="flex gap-1 justify-end">
                            <button className="btn btn-ghost btn-sm" title="รายละเอียด" onClick={() => setDetail(r)}>
                              <Icon name="eye" size={13} />
                            </button>
                            {!window.isFullyApproved(r) && !window.isRejected(r) && (
                              <button className="btn btn-sm"
                                      title={currentUser ? 'อนุมัติ' : 'เข้าสู่ระบบเพื่ออนุมัติ'}
                                      onClick={() => {
                                        if (!currentUser && requestLogin) requestLogin('กรุณาเข้าสู่ระบบเพื่ออนุมัติงาน');
                                        else setApproving(r);
                                      }}
                                      style={{ background: '#6c8cff', color: '#fff', border: 'none' }}>
                                <Icon name="check" size={13} />
                              </button>
                            )}
                            <button className="btn btn-ghost btn-sm" title="แก้ไขสถานะ" onClick={() => updateStatus(r)}>
                              <Icon name="edit" size={13} />
                            </button>
                            {r.status !== 'ซ่อมเสร็จ' && r.status !== 'ยกเลิก' && r.status !== 'ถูกปฏิเสธ' && window.isFullyApproved(r) && (
                              <button className="btn btn-good btn-sm" title="ปิดงาน" onClick={() => closeWork(r)}>
                                <Icon name="check" size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <div style={{ height: 20 }} />
        </div>

        {/* Modals + Sheets */}
        <Modal open={!!detail} onClose={() => setDetail(null)}
               title={'รายละเอียดงานซ่อม ' + (detail?.id || '')}
               footer={
                 <>
                   <button className="btn btn-ghost" onClick={() => setDetail(null)}>ปิด</button>
                   <button className="btn" onClick={() => { const d = detail; setDetail(null); setFormSheet(d); }}>
                     <Icon name="file" size={14} /> ใบแจ้งซ่อม (PDF)
                   </button>
                   <button className="btn btn-primary" onClick={() => { setDetail(null); nav('repair-rec'); localStorage.setItem('mifs.record.focus', detail?.id || ''); }}>
                     <Icon name="edit" size={14} /> บันทึกประวัติการซ่อม
                   </button>
                 </>
               }>
          {detail && <RepairDetail r={detail} db={db} />}
        </Modal>

        {formSheet && window.RepairFormSheet && (
          <window.RepairFormSheet
            request={formSheet}
            history={db.repairHistory.find(h => h.requestId === formSheet.id)}
            onClose={() => setFormSheet(null)}
          />
        )}

        {approving && window.ApprovalDialog && (
          <window.ApprovalDialog
            request={approving}
            currentUser={currentUser}
            onClose={() => setApproving(null)}
            onSubmit={onApprovalSubmit}
          />
        )}
      </div>
    );
  }

  // === Overview view: grid of status cards ===
  const total = db.repairRequests.length;
  return (
    <Card padding={false}>
      <div className="p-5 flex flex-wrap items-center gap-3" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="rounded-2xl flex items-center justify-center"
             style={{ width: 44, height: 44, background: 'linear-gradient(135deg, rgba(108,140,255,0.25), rgba(56,224,255,0.25))', border:'1px solid rgba(108,140,255,0.4)', color:'#8ad6ff' }}>
          <Icon name="bell" size={22} />
        </div>
        <div>
          <div className="h1">ติดตามสถานะงานซ่อม</div>
          <div style={{ fontSize: '0.86rem', color: 'var(--ink-dim)' }}>เลือกสถานะเพื่อดูรายการใบแจ้งซ่อม · ทั้งหมด {total} รายการ</div>
        </div>
        <div className="flex-1" />
        <button className="btn btn-primary btn-sm" onClick={() => nav('repair-new')}>
          <Icon name="plus" size={13} /> แจ้งใหม่
        </button>
      </div>

      <div className="p-5">
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {STATUSES.map(s => {
            const n = counts[s.key] || 0;
            const muted = n === 0;
            return (
              <div key={s.key}
                   onClick={() => { setSelectedStatus(s.key); setQ(''); }}
                   className="cursor-pointer rounded-2xl p-4 transition-all"
                   style={{
                     background: s.tint, border: '1px solid ' + s.border,
                     opacity: muted ? 0.55 : 1,
                     transform: 'translateY(0)',
                   }}
                   onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                   onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <div className="flex items-center justify-between gap-2">
                  <div className="rounded-xl flex items-center justify-center"
                       style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.08)', color: s.accent }}>
                    <Icon name={s.icon} size={18} />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: s.accent, lineHeight: 1 }}>{n}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.98rem', marginTop: 10 }}>{s.key}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--ink-dim)', marginTop: 4, lineHeight: 1.4 }}>{s.desc}</div>
                <div className="flex items-center gap-1 mt-3" style={{ fontSize: '0.74rem', color: s.accent, fontWeight: 600 }}>
                  ดูรายการ <Icon name="arrow-right" size={12} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick recent strip below */}
      <div className="p-5 pt-0">
        <div className="flex items-center justify-between mb-3">
          <div className="h3">ใบแจ้งซ่อมล่าสุด</div>
          <button className="btn btn-sm btn-ghost" onClick={() => setSelectedStatus(STATUS_KEYS[0])}>
            ดูทั้งหมด <Icon name="arrow-right" size={12} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {db.repairRequests.slice(0, 5).map(r => (
            <div key={r.id} className="glass-soft rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.05]"
                 onClick={() => setDetail(r)}>
              <div className="font-semibold num">{r.id}</div>
              <AreaBadge area={r.area} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{r.machineId} · {r.machineName}</div>
                <div className="truncate" style={{ fontSize: '0.78rem', color: 'var(--ink-faint)' }}>{r.symptom}</div>
              </div>
              <StatusTag value={r.status || 'รอรับงาน'} />
              {window.ApprovalDots && <window.ApprovalDots request={r} />}
            </div>
          ))}
          {db.repairRequests.length === 0 && <Empty icon="wrench" title="ยังไม่มีงานซ่อม" />}
        </div>
      </div>

      {/* Modals reused on the overview too (recent strip → detail) */}
      <Modal open={!!detail} onClose={() => setDetail(null)}
             title={'รายละเอียดงานซ่อม ' + (detail?.id || '')}
             footer={
               <>
                 <button className="btn btn-ghost" onClick={() => setDetail(null)}>ปิด</button>
                 <button className="btn" onClick={() => { const d = detail; setDetail(null); setFormSheet(d); }}>
                   <Icon name="file" size={14} /> ใบแจ้งซ่อม (PDF)
                 </button>
                 <button className="btn btn-primary" onClick={() => { setDetail(null); nav('repair-rec'); localStorage.setItem('mifs.record.focus', detail?.id || ''); }}>
                   <Icon name="edit" size={14} /> บันทึกประวัติการซ่อม
                 </button>
               </>
             }>
        {detail && <RepairDetail r={detail} db={db} />}
      </Modal>

      {formSheet && window.RepairFormSheet && (
        <window.RepairFormSheet
          request={formSheet}
          history={db.repairHistory.find(h => h.requestId === formSheet.id)}
          onClose={() => setFormSheet(null)}
        />
      )}

      {approving && window.ApprovalDialog && (
        <window.ApprovalDialog
          request={approving}
          onClose={() => setApproving(null)}
          onSubmit={onApprovalSubmit}
        />
      )}
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

      {window.ApprovalTimeline && (
        <div>
          <div style={{ fontSize: '0.74rem', color: 'var(--ink-faint)', fontWeight: 600, marginBottom: 6 }} className="flex items-center gap-1">
            <Icon name="check" size={13} /> สถานะการอนุมัติ
          </div>
          <window.ApprovalTimeline request={r} />
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
