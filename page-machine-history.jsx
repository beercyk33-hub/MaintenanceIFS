// ประวัติเครื่องจักร — page-machine-history.jsx
function PageMachineHistory({ db, setDb, nav }) {
  const focusId = localStorage.getItem('mifs.history.focus') || '';
  const [q, setQ] = React.useState(focusId);
  const [selected, setSelected] = React.useState(focusId || (db.machines[0]?.id || ''));

  React.useEffect(() => () => localStorage.removeItem('mifs.history.focus'), []);

  const list = React.useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return db.machines.slice(0, 200);
    return db.machines.filter(m =>
      (m.id || '').toLowerCase().includes(k) || (m.name || '').toLowerCase().includes(k));
  }, [db.machines, q]);

  const m = db.machines.find(x => x.id === selected);
  const repairs = db.repairRequests.filter(r => r.machineId === selected);
  const histories = db.repairHistory.filter(h => h.machineId === selected);
  const pms = db.pmPlans.filter(p => p.machineId === selected);
  const pmRecs = db.pmRecords.filter(p => p.machineId === selected);

  const totalCost = histories.reduce((s, h) => s + (parseFloat(h.cost) || 0), 0);
  const breakdownCount = repairs.length;

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,2.2fr)' }}>
      <Card padding={false}>
        <div className="p-4">
          <div className="h2 flex items-center gap-2 mb-3"><Icon name="machine" size={20} /> เครื่องจักร</div>
          <SearchInput value={q} onChange={setQ} placeholder="ค้นหารหัส/ชื่อ..." />
        </div>
        <div style={{ maxHeight: 560, overflow: 'auto', borderTop: '1px solid var(--line)' }}>
          {list.map(x => (
            <div key={x.id} onClick={() => setSelected(x.id)}
                 className={'cursor-pointer p-3 px-4 transition-colors'}
                 style={{
                   background: selected === x.id ? 'linear-gradient(90deg, rgba(56,224,255,0.16), transparent)' : 'transparent',
                   borderLeft: selected === x.id ? '3px solid #38e0ff' : '3px solid transparent',
                   borderBottom: '1px solid var(--line)',
                 }}>
              <div className="flex items-center gap-2">
                <AreaBadge area={x.area} />
                <div className="font-semibold">{x.id}</div>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--ink-dim)', marginTop: 2 }}>{x.name}</div>
            </div>
          ))}
          {list.length === 0 && <Empty icon="search" title="ไม่พบเครื่องจักร" />}
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        {m ? (
          <>
            <Card>
              <div className="flex items-start gap-4 flex-wrap">
                <div className="rounded-2xl flex items-center justify-center"
                     style={{ width: 60, height: 60, background: 'linear-gradient(135deg, rgba(56,224,255,0.25), rgba(108,140,255,0.25))', border: '1px solid rgba(56,224,255,0.35)' }}>
                  <Icon name="machine" size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <AreaBadge area={m.area} />
                    <div className="h1">{m.id}</div>
                    <StatusTag value={m.status || 'ใช้งานปกติ'} />
                  </div>
                  <div className="h2" style={{ color: 'var(--ink-dim)', fontWeight: 600 }}>{m.name}</div>
                </div>
              </div>
              <div className="grid gap-3 mt-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                <Field2 label="ยี่ห้อ/รุ่น" value={m.brand || '-'} />
                <Field2 label="Serial Number" value={m.serial || '-'} />
                <Field2 label="สถานที่ติดตั้ง" value={m.location || '-'} />
                <Field2 label="บริษัทผู้ขาย" value={m.vendor || '-'} />
                <Field2 label="วันที่ติดตั้ง" value={m.installDate ? fmtDate(m.installDate) : (m.year || '-')} />
                <Field2 label="สถานะ" value={m.status || 'ใช้งานปกติ'} />
              </div>
            </Card>

            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <KPI label="จำนวนครั้งที่แจ้งซ่อม" value={breakdownCount} icon="wrench" color="#ff5a7a" />
              <KPI label="ประวัติการซ่อม" value={histories.length} icon="history" color="#6c8cff" />
              <KPI label="รายการ PM" value={pms.length} icon="calendar" color="#34e3a5" />
              <KPI label="ค่าใช้จ่ายรวม"
                   value={totalCost.toLocaleString() + ' ฿'}
                   icon="money" color="#ffc04b" />
            </div>

            <Card title="ประวัติการแจ้งซ่อม" padding={false}>
              {repairs.length === 0 ? <div className="p-5"><Empty icon="wrench" title="ยังไม่มีงานแจ้งซ่อม" /></div> : (
                <div className="tbl-wrap" style={{ maxHeight: 340 }}>
                  <table className="tbl">
                    <thead><tr>
                      <th>ใบงาน</th><th>วันที่</th><th>อาการ</th><th>ความเร่งด่วน</th><th>สถานะ</th>
                    </tr></thead>
                    <tbody>
                      {repairs.map(r => (
                        <tr key={r.id}>
                          <td className="font-semibold num">{r.id}</td>
                          <td className="num">{fmtDate(r.date)}</td>
                          <td style={{ maxWidth: 320 }}>{r.symptom}</td>
                          <td><StatusTag value={r.urgency} colorMap={URGENCY_COLORS} /></td>
                          <td><StatusTag value={r.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card title="ประวัติการบำรุงรักษา (PM)" padding={false}>
              {pmRecs.length === 0 ? <div className="p-5"><Empty icon="calendar" title="ยังไม่มีบันทึก PM" /></div> : (
                <div className="tbl-wrap" style={{ maxHeight: 280 }}>
                  <table className="tbl">
                    <thead><tr>
                      <th>วันที่</th><th>รายการ</th><th>ความถี่</th><th>ผู้ดำเนินการ</th><th>หมายเหตุ</th>
                    </tr></thead>
                    <tbody>
                      {pmRecs.map(r => (
                        <tr key={r.id}>
                          <td className="num">{fmtDate(r.doneDate)}</td>
                          <td>{r.item}</td>
                          <td><span className="tag">{r.frequency}</span></td>
                          <td>{r.doneBy || '-'}</td>
                          <td style={{ color: 'var(--ink-dim)' }}>{r.note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        ) : (
          <Card><Empty icon="machine" title="เลือกเครื่องจักรเพื่อดูประวัติ" /></Card>
        )}
      </div>
    </div>
  );
}

function Field2({ label, value }) {
  return (
    <div className="glass-soft rounded-xl p-3">
      <div style={{ fontSize: '0.72rem', color: 'var(--ink-faint)', fontWeight: 600 }}>{label}</div>
      <div className="font-semibold" style={{ marginTop: 2, color: 'var(--ink)' }}>{value}</div>
    </div>
  );
}

window.PageMachineHistory = PageMachineHistory;
