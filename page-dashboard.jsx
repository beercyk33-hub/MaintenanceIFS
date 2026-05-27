// Dashboard page
function PageDashboard({ db, setDb, nav }) {
  const machines = db.machines;
  const requests = db.repairRequests;
  const pmPlans = db.pmPlans;

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

  // Frequency by symptom category
  const symptomChart = React.useMemo(() => {
    const groups = {};
    for (const r of requests) {
      const key = (r.symptom || '').split(' ')[0].slice(0, 22) || 'อื่น ๆ';
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

  return (
    <div className="flex flex-col gap-4">
      {/* KPI row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <KPI label="เครื่องจักรทั้งหมด"   value={machines.length}    icon="machine"  color="#38e0ff" sub={Object.keys(machinesByArea).length + ' พื้นที่'} />
        <KPI label="งานแจ้งซ่อมทั้งหมด"   value={counts.total}       icon="wrench"   color="#6c8cff" />
        <KPI label="รอดำเนินการ"          value={counts.wait}        icon="bell"     color="#ffc04b" />
        <KPI label="กำลังซ่อม"            value={counts.doing}       icon="bolt"     color="#6cb8ff" />
        <KPI label="ซ่อมเสร็จแล้ว"        value={counts.done}        icon="check"    color="#34e3a5" />
        <KPI label="PM ถึงกำหนด"         value={pmDue}              icon="calendar" color="#ff9ec7" />
      </div>

      {/* Charts */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
        <Card title="สถานะงานซ่อม">
          <ChartBox type="doughnut" data={statusChart} height={260}
                    options={{
                      ...chartDefaults(),
                      scales: {},
                      cutout: '65%',
                      plugins: { ...chartDefaults().plugins,
                        legend: { position: 'right', labels: { color: '#dbe6ff', font: { family: 'Sarabun', size: 12 }, boxWidth: 12, boxHeight: 12 } } }
                    }} />
        </Card>
        <Card title="ประเภทปัญหาที่เกิดบ่อย">
          <ChartBox type="bar" data={symptomChart} height={260}
                    options={{
                      ...chartDefaults(),
                      indexAxis: 'y',
                      plugins: { ...chartDefaults().plugins, legend: { display: false } },
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
