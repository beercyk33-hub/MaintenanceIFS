// ประวัติเครื่องจักร — page-machine-history.jsx
function PageMachineHistory({ db, setDb, nav }) {
  const [q, setQ] = React.useState('');
  const [selectedMachineId, setSelectedMachineId] = React.useState(null);

  const list = React.useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return db.machines.slice(0, 200);
    return db.machines.filter(m =>
      (m.id || '').toLowerCase().includes(k) || (m.name || '').toLowerCase().includes(k));
  }, [db.machines, q]);

  const selectedMachine = db.machines.find(x => x.id === selectedMachineId);

  if (selectedMachineId && selectedMachine) {
    return (
      <MachineHistoryDetail
        machine={selectedMachine}
        db={db}
        onBack={() => setSelectedMachineId(null)}
      />
    );
  }

  return (
    <Card padding={false}>
      <div className="p-4">
        <div className="h2 flex items-center gap-2 mb-3"><Icon name="machine" size={20} /> เครื่องจักร</div>
        <SearchInput value={q} onChange={setQ} placeholder="ค้นหารหัส/ชื่อ..." />
      </div>
      <div style={{ maxHeight: 600, overflow: 'auto', borderTop: '1px solid var(--line)' }}>
        {list.map(x => (
          <div key={x.id} onClick={() => setSelectedMachineId(x.id)}
               className={'cursor-pointer p-3 px-4 transition-colors hover:bg-white/[0.05]'}
               style={{
                 background: selectedMachineId === x.id ? 'linear-gradient(90deg, rgba(56,224,255,0.16), transparent)' : 'transparent',
                 borderLeft: selectedMachineId === x.id ? '3px solid #38e0ff' : '3px solid transparent',
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
  );
}

function MachineHistoryDetail({ machine, db, onBack }) {
  const [tab, setTab] = React.useState('info');

  const repairs = db.repairRequests.filter(r => r.machineId === machine.id);
  const histories = db.repairHistory.filter(h => h.machineId === machine.id);
  const pmRecs = db.pmRecords.filter(p => p.machineId === machine.id);
  const totalCost = histories.reduce((s, h) => s + (parseFloat(h.cost) || 0), 0);

  const tabs = [
    { key: 'info', label: 'เครื่องจักร', icon: 'machine' },
    { key: 'repairs', label: `ประวัติการซ่อม (${repairs.length})`, icon: 'wrench' },
    { key: 'pm', label: `ประวัติ PM (${pmRecs.length})`, icon: 'calendar' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #02040d 0%, #050a23 18%, #061640 38%, #053b75 65%, #0a73b8 100%)' }}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10" style={{ background: 'rgba(8, 16, 44, 0.95)', borderBottom: '1px solid var(--line)', backdropFilter: 'blur(10px)' }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack}
                  className="btn btn-ghost btn-sm flex items-center gap-1.5 flex-shrink-0"
                  title="กลับไปหน้าแรก">
            <Icon name="close" size={18} />
            <span>กลับ</span>
          </button>
          <div className="flex-1 min-w-0">
            <div className="h3 truncate">{machine.id}</div>
            <div className="text-xs" style={{ color: 'var(--ink-dim)', truncate: true }}>{machine.name}</div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-start gap-3 flex-wrap">
              <div className="rounded-2xl flex items-center justify-center flex-shrink-0"
                   style={{ width: 50, height: 50, background: 'linear-gradient(135deg, rgba(56,224,255,0.25), rgba(108,140,255,0.25))', border: '1px solid rgba(56,224,255,0.35)' }}>
                <Icon name="machine" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <AreaBadge area={machine.area} />
                  <StatusTag value={machine.status || 'ใช้งานปกติ'} />
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            <KPI label="แจ้งซ่อม" value={repairs.length} icon="wrench" color="#ff5a7a" />
            <KPI label="ประวัติซ่อม" value={histories.length} icon="history" color="#6c8cff" />
            <KPI label="PM" value={pmRecs.length} icon="calendar" color="#34e3a5" />
            <KPI label="ค่าใช้จ่าย" value={totalCost.toLocaleString() + ' ฿'} icon="money" color="#ffc04b" />
          </div>

          <Card>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4" style={{ borderBottom: '1px solid var(--line)', scrollBehavior: 'smooth' }}>
              {tabs.map(t => (
                <button key={t.key}
                        onClick={() => setTab(t.key)}
                        className="flex items-center gap-1 px-3 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
                        style={{
                          color: tab === t.key ? 'var(--accent)' : 'var(--ink-dim)',
                          borderBottom: tab === t.key ? '2px solid var(--accent)' : 'none',
                          marginBottom: -1,
                        }}>
                  <Icon name={t.icon} size={14} />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.key === 'info' ? 'รายละเอียด' : t.key === 'repairs' ? 'ซ่อม' : 'PM'}</span>
                </button>
              ))}
            </div>

            {tab === 'info' && (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                <DetailField label="ยี่ห้อ/รุ่น" value={machine.brand || '-'} />
                <DetailField label="Serial" value={machine.serial || '-'} />
                <DetailField label="ตำแหน่ง" value={machine.location || '-'} />
                <DetailField label="ผู้ขาย" value={machine.vendor || '-'} />
                <DetailField label="วันติดตั้ง" value={machine.installDate ? fmtDate(machine.installDate) : (machine.year || '-')} />
                <DetailField label="สถานะ" value={machine.status || 'ใช้งานปกติ'} />
              </div>
            )}

            {tab === 'repairs' && (
              repairs.length === 0 ? <Empty icon="wrench" title="ยังไม่มีงานแจ้งซ่อม" /> : (
                <div className="tbl-wrap" style={{ maxHeight: 'none' }}>
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
              )
            )}

            {tab === 'pm' && (
              pmRecs.length === 0 ? <Empty icon="calendar" title="ยังไม่มีบันทึก PM" /> : (
                <div className="tbl-wrap" style={{ maxHeight: 'none' }}>
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
              )
            )}
          </Card>

          <div style={{ height: 20 }} />
        </div>
      </div>
    </div>
  );
}

window.PageMachineHistory = PageMachineHistory;
