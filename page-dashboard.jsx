// Dashboard page
function PageDashboard({ db, setDb, nav }) {
  const [detailView, setDetailView] = React.useState(null); // null | 'machines' | 'all-requests' | 'wait' | 'doing' | 'done' | 'pm-due'

  const machines = db?.machines || [];
  const requests = db?.repairRequests || [];
  const pmPlans = db?.pmPlans || [];

  const counts = React.useMemo(() => {
    const c = { total: requests.length, wait: 0, doing: 0, done: 0, parts: 0, cancel: 0 };
    for (const r of requests) {
      if (r.status === 'รอรับงาน') c.wait++;
      else if (r.status === 'กำลังดำเนินการ') c.doing++;
      else if (r.status === 'ซ่อมเสร็จ') c.done++;
      else if (r.status === 'รออะไหล่') c.parts++;
      else if (r.status === 'ยกเลิก') c.cancel++;
    }
    return c;
  }, [requests]);

  const pmDue = React.useMemo(() => {
    const t = today();
    return pmPlans.filter(p => p.nextDate && p.nextDate <= t).length;
  }, [pmPlans]);

  const statusChart = {
    labels: ['รอรับงาน', 'กำลังดำเนินการ', 'รออะไหล่', 'ซ่อมเสร็จ', 'ยกเลิก'],
    datasets: [{
      data: [counts.wait, counts.doing, counts.parts, counts.done, counts.cancel],
      backgroundColor: ['#ffc04b', '#6cb8ff', '#ff9b73', '#34e3a5', '#7a8aaa'],
      borderWidth: 0,
      hoverOffset: 8,
    }],
  };

  // Frequency by symptom category — collapse free-text symptoms into short
  // keyword buckets so the chart label fits on narrow (mobile) screens.
  const symptomChart = React.useMemo(() => {
    // Order matters: first matching keyword wins.
    const buckets = [
      { label: 'มอเตอร์',   keys: ['มอเตอร์', 'motor'] },
      { label: 'ปั๊ม',       keys: ['ปั๊ม', 'pump'] },
      { label: 'น้ำมัน/ซีล', keys: ['น้ำมัน', 'ซีล', 'รั่ว', 'oil', 'seal'] },
      { label: 'สายพาน',    keys: ['สายพาน', 'belt'] },
      { label: 'ไฟฟ้า',     keys: ['ไฟ', 'ตู้คอนโทรล', 'breaker', 'electric'] },
      { label: 'PLC',       keys: ['plc', 'error', 'อีรอร์'] },
      { label: 'เซ็นเซอร์',  keys: ['เซ็นเซอร์', 'sensor'] },
      { label: 'อุณหภูมิ',   keys: ['อุณหภูมิ', 'ร้อน', 'temp'] },
      { label: 'ลม/นิวเมติก', keys: ['ลม', 'นิวเมติก', 'air'] },
      { label: 'น้ำ/ท่อ',    keys: ['น้ำ', 'ท่อ', 'water'] },
    ];
    const classify = (sym) => {
      const s = (sym || '').toLowerCase();
      if (!s) return 'อื่น ๆ';
      for (const b of buckets) if (b.keys.some(k => s.includes(k.toLowerCase()))) return b.label;
      return 'อื่น ๆ';
    };
    const groups = {};
    for (const r of requests) {
      const key = classify(r.symptom);
      groups[key] = (groups[key] || 0) + 1;
    }
    const entries = Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return {
      labels: entries.map(e => e[0]),
      datasets: [{
        label: 'จำนวน',
        data: entries.map(e => e[1]),
        backgroundColor: 'rgba(56,224,255,0.55)',
        borderColor: '#38e0ff',
        borderWidth: 1.5,
        borderRadius: 8,
      }]
    };
  }, [requests]);

  const recent = React.useMemo(
    () => [...requests].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 6),
    [requests]
  );

  const machinesByArea = React.useMemo(() => {
    const m = {};
    for (const x of machines) m[x.area] = (m[x.area] || 0) + 1;
    return m;
  }, [machines]);

  if (detailView) {
    return <DashboardDetailList type={detailView} db={db} onBack={() => setDetailView(null)} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* KPI row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div onClick={() => setDetailView('machines')} style={{ cursor: 'pointer' }}>
          <KPI label="เครื่องจักรทั้งหมด"   value={machines.length}    icon="machine"  color="#38e0ff" sub={Object.keys(machinesByArea).length + ' พื้นที่'} />
        </div>
        <div onClick={() => setDetailView('all-requests')} style={{ cursor: 'pointer' }}>
          <KPI label="งานแจ้งซ่อมทั้งหมด"   value={counts.total}       icon="wrench"   color="#6c8cff" />
        </div>
        <div onClick={() => setDetailView('wait')} style={{ cursor: 'pointer' }}>
          <KPI label="รอดำเนินการ"          value={counts.wait}        icon="bell"     color="#ffc04b" />
        </div>
        <div onClick={() => setDetailView('doing')} style={{ cursor: 'pointer' }}>
          <KPI label="กำลังซ่อม"            value={counts.doing}       icon="bolt"     color="#6cb8ff" />
        </div>
        <div onClick={() => setDetailView('done')} style={{ cursor: 'pointer' }}>
          <KPI label="ซ่อมเสร็จแล้ว"        value={counts.done}        icon="check"    color="#34e3a5" />
        </div>
        <div onClick={() => setDetailView('pm-due')} style={{ cursor: 'pointer' }}>
          <KPI label="PM ถึงกำหนด"         value={pmDue}              icon="calendar" color="#ff9ec7" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
        <Card title="สถานะงานซ่อม">
          <ChartBox type="doughnut" data={statusChart} height={300}
                    options={{
                      ...chartDefaults(),
                      scales: {},
                      cutout: '65%',
                      layout: { padding: { top: 4, bottom: 4 } },
                      plugins: { ...chartDefaults().plugins,
                        legend: {
                          position: 'bottom',
                          labels: {
                            color: '#dbe6ff',
                            font: { family: 'Sarabun', size: 12 },
                            boxWidth: 12, boxHeight: 12,
                            padding: 12,
                          },
                        } }
                    }} />
        </Card>
        <Card title="ประเภทปัญหาที่เกิดบ่อย">
          <ChartBox type="bar" data={symptomChart} height={300}
                    options={{
                      ...chartDefaults(),
                      layout: { padding: { top: 4, right: 8 } },
                      plugins: { ...chartDefaults().plugins, legend: { display: false } },
                      scales: {
                        x: {
                          ticks: {
                            color: '#9ab0d6',
                            font: { family: 'Sarabun', size: 12 },
                            autoSkip: false,
                            maxRotation: 35,
                            minRotation: 35,
                          },
                          grid: { color: 'rgba(255,255,255,0.04)' },
                        },
                        y: {
                          beginAtZero: true,
                          ticks: {
                            color: '#9ab0d6',
                            font: { family: 'Sarabun', size: 11 },
                            stepSize: 1,
                            precision: 0,
                          },
                          grid: { color: 'rgba(255,255,255,0.06)' },
                        },
                      },
                    }} />
        </Card>
      </div>

      {/* Recent + Machines + Technicians */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)' }}>
        <Card title="รายการแจ้งซ่อมล่าสุด"
              action={<button className="btn btn-sm btn-ghost" onClick={() => nav('repair-track')}><Icon name="eye" size={14} /> ดูทั้งหมด</button>}
              padding={false}>
          {recent.length === 0 ? <div className="p-5"><Empty title="ยังไม่มีงานแจ้งซ่อม" /></div> : (
            <div className="tbl-wrap" style={{ maxHeight: 360 }}>
              <table className="tbl">
                <thead><tr>
                  <th>วันที่</th><th>เครื่องจักร</th><th>อาการ</th><th>ความเร่งด่วน</th><th>สถานะ</th>
                </tr></thead>
                <tbody>
                  {recent.map(r => (
                    <tr key={r.id} className="cursor-pointer" onClick={() => nav('repair-track')}>
                      <td className="num" style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.date)} {r.time}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <AreaBadge area={r.area} />
                          <div>
                            <div className="font-semibold">{r.machineId}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--ink-faint)' }}>{r.machineName}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ maxWidth: 260 }}>{r.symptom}</td>
                      <td><StatusTag value={r.urgency} colorMap={URGENCY_COLORS} /></td>
                      <td><StatusTag value={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card title="เครื่องจักรตามพื้นที่"
                action={<button className="btn btn-sm btn-ghost" onClick={() => nav('machines')}>ดูทั้งหมด</button>}>
            <div className="flex flex-col gap-2">
              {Object.entries(machinesByArea)
                .sort((a, b) => b[1] - a[1])
                .map(([area, n]) => {
                  const pct = Math.round((n / machines.length) * 100);
                  return (
                    <div key={area} className="flex items-center gap-3">
                      <AreaBadge area={area} />
                      <div className="flex-1">
                        <div className="flex justify-between items-baseline mb-1">
                          <span style={{ fontSize: '0.82rem', color: 'var(--ink-dim)' }}>{n} เครื่อง</span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--ink-faint)' }}>{pct}%</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div style={{ width: pct + '%', height: '100%', background: 'linear-gradient(90deg, #38e0ff, #6c8cff)' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>

          <TechnicianCard db={db} setDb={setDb} />
        </div>
      </div>
    </div>
  );
}

function DashboardDetailList({ type, db, onBack }) {
  const [selectedArea, setSelectedArea] = React.useState(null); // For 'all-requests' grouped by area
  let data = [];
  let title = '';
  let columns = [];

  if (type === 'machines') {
    data = db.machines || [];
    title = 'เครื่องจักรทั้งหมด';
    columns = [
      { label: 'รหัส', key: 'id' },
      { label: 'ชื่อ', key: 'name' },
      { label: 'พื้นที่', key: 'area' },
      { label: 'สถานะ', key: 'status' },
    ];
  } else if (type === 'all-requests') {
    if (selectedArea) {
      // Show requests for selected area
      data = db.repairRequests.filter(r => {
        const machine = db.machines.find(m => m.id === r.machineId);
        return machine && machine.area === selectedArea;
      });
      title = `งานแจ้งซ่อม - ${selectedArea}`;
    } else {
      // Show areas grouped by request count
      const areas = {};
      for (const r of db.repairRequests) {
        const machine = db.machines.find(m => m.id === r.machineId);
        if (machine) {
          areas[machine.area] = (areas[machine.area] || 0) + 1;
        }
      }
      data = Object.entries(areas).map(([area, count]) => ({ area, count, id: area }));
      title = 'งานแจ้งซ่อมทั้งหมด';
    }
    columns = selectedArea ? [
      { label: 'ใบงาน', key: 'id' },
      { label: 'เครื่องจักร', key: 'machineId' },
      { label: 'วันที่', key: 'date' },
      { label: 'อาการ', key: 'symptom' },
      { label: 'สถานะ', key: 'status' },
    ] : [];
  } else if (type === 'wait') {
    data = db.repairRequests.filter(r => r.status === 'รอรับงาน');
    title = 'งานแจ้งซ่อม - รอดำเนินการ';
    columns = [
      { label: 'ใบงาน', key: 'id' },
      { label: 'เครื่องจักร', key: 'machineId' },
      { label: 'วันที่', key: 'date' },
      { label: 'อาการ', key: 'symptom' },
    ];
  } else if (type === 'doing') {
    data = db.repairRequests.filter(r => r.status === 'กำลังดำเนินการ');
    title = 'งานแจ้งซ่อม - กำลังซ่อม';
    columns = [
      { label: 'ใบงาน', key: 'id' },
      { label: 'เครื่องจักร', key: 'machineId' },
      { label: 'วันที่', key: 'date' },
      { label: 'อาการ', key: 'symptom' },
    ];
  } else if (type === 'done') {
    data = db.repairRequests.filter(r => r.status === 'ซ่อมเสร็จ');
    title = 'งานแจ้งซ่อม - ซ่อมเสร็จแล้ว';
    columns = [
      { label: 'ใบงาน', key: 'id' },
      { label: 'เครื่องจักร', key: 'machineId' },
      { label: 'วันที่', key: 'date' },
      { label: 'อาการ', key: 'symptom' },
    ];
  } else if (type === 'pm-due') {
    const t = today();
    data = db.pmPlans.filter(p => p.nextDate && p.nextDate <= t);
    title = 'PM ถึงกำหนด';
    columns = [
      { label: 'เครื่องจักร', key: 'machineId' },
      { label: 'รายการ', key: 'item' },
      { label: 'ความถี่', key: 'frequency' },
      { label: 'ครั้งถัดไป', key: 'nextDate' },
    ];
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #02040d 0%, #050a23 18%, #061640 38%, #053b75 65%, #0a73b8 100%)' }}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10" style={{ background: 'rgba(8, 16, 44, 0.95)', borderBottom: '1px solid var(--line)', backdropFilter: 'blur(10px)' }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={selectedArea ? () => setSelectedArea(null) : onBack}
                  className="btn btn-ghost btn-sm flex items-center gap-1.5 flex-shrink-0"
                  title="กลับไป">
            <Icon name="close" size={18} />
            <span>กลับ</span>
          </button>
          <div className="flex-1 min-w-0">
            <div className="h3 truncate">{title}</div>
            <div className="text-xs" style={{ color: 'var(--ink-dim)' }}>{data.length} รายการ</div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', fontSize: '0.85rem', color: 'var(--ink-dim)' }}>
          พบ {data.length} รายการ
        </div>

        {/* Show areas grid for all-requests when no area selected */}
        {type === 'all-requests' && !selectedArea ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
            {data.map(item => (
              <div key={item.area} onClick={() => setSelectedArea(item.area)}
                   className="cursor-pointer p-4 rounded-xl transition-all hover:scale-105"
                   style={{ background: 'rgba(56,224,255,0.12)', border: '1px solid rgba(56,224,255,0.3)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--ink-dim)', marginBottom: '0.5rem' }}>พื้นที่</div>
                <div className="font-bold text-lg">{item.area}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--ink-dim)', marginTop: '0.5rem' }}>{item.count} งาน</div>
              </div>
            ))}
          </div>
        ) : (
          /* Show table for other types or when area is selected */
          <Card padding={false}>
            {data.length === 0 ? (
              <div className="p-5"><Empty icon="search" title="ไม่มีข้อมูล" /></div>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      {columns.map(col => (
                        <th key={col.key}>{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, idx) => (
                      <tr key={idx}>
                        {columns.map(col => (
                          <td key={col.key}>
                            {col.key === 'status' ? (
                              <StatusTag value={row[col.key]} />
                            ) : col.key === 'date' ? (
                              <span className="num">{fmtDate(row[col.key])}</span>
                            ) : col.key === 'nextDate' ? (
                              <span className="num">{fmtDate(row[col.key])}</span>
                            ) : (
                              row[col.key] || '-'
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

function TechnicianCard({ db, setDb }) {
  const list = db.technicians || [];

  const addOne = async () => {
    const r = await window.Swal.fire({
      title: 'เพิ่มช่างซ่อมบำรุง',
      html: '<input id="t-name" class="swal2-input" placeholder="ชื่อ-สกุล"/>' +
            '<input id="t-phone" class="swal2-input" placeholder="เบอร์โทร"/>',
      showCancelButton: true, confirmButtonText: 'เพิ่ม', cancelButtonText: 'ยกเลิก',
      focusConfirm: false,
      preConfirm: () => {
        const name = document.getElementById('t-name').value.trim();
        const phone = document.getElementById('t-phone').value.trim();
        if (!name) { window.Swal.showValidationMessage('กรุณากรอกชื่อ'); return false; }
        return { name, phone };
      }
    });
    if (r.isConfirmed) {
      setDb(prev => ({ ...prev, technicians: [...prev.technicians, { id: 't' + Date.now(), ...r.value }] }));
      toast('success', 'เพิ่มช่างสำเร็จ');
    }
  };

  const removeOne = async (id) => {
    if (!await confirmDialog('ลบช่างซ่อมบำรุง?', 'ข้อมูลจะถูกลบออกจากระบบ', 'ลบ')) return;
    setDb(prev => ({ ...prev, technicians: prev.technicians.filter(t => t.id !== id) }));
    toast('success', 'ลบเรียบร้อย');
  };

  return (
    <Card title="ช่างซ่อมบำรุง"
          action={<button className="btn btn-sm btn-primary" onClick={addOne}><Icon name="plus" size={13} /> เพิ่ม</button>}>
      {list.length === 0 ? <Empty icon="user" title="ยังไม่มีช่างซ่อมบำรุง" /> : (
        <div className="flex flex-col gap-2">
          {list.map(t => (
            <div key={t.id} className="glass-soft rounded-2xl px-3 py-2 flex items-center gap-3">
              <div className="rounded-xl flex items-center justify-center"
                   style={{ width: 36, height: 36, background: 'linear-gradient(135deg, rgba(108,140,255,0.25), rgba(56,224,255,0.25))' }}>
                <Icon name="user" size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{t.name}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--ink-faint)' }}>{t.phone || '-'}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => removeOne(t.id)} aria-label="ลบ">
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

window.PageDashboard = PageDashboard;
