// รายงาน & สถิติ — page-reports.jsx
function PageReports({ db, setDb, nav }) {
  const [from, setFrom] = React.useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 6); return d.toISOString().slice(0, 10); });
  const [to, setTo] = React.useState(today());

  // Combine repair requests with their history (for cost)
  const rows = React.useMemo(() => {
    const histByReq = {};
    for (const h of db.repairHistory) {
      if (h.requestId) histByReq[h.requestId] = h;
    }
    return db.repairRequests
      .filter(r => (!from || r.date >= from) && (!to || r.date <= to))
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(r => ({
        ...r,
        cost: histByReq[r.id]?.cost || 0,
      }));
  }, [db.repairRequests, db.repairHistory, from, to]);

  // Charts
  const monthlyChart = React.useMemo(() => {
    const groups = {};
    for (const r of rows) {
      const k = (r.date || '').slice(0, 7) || 'unknown';
      groups[k] = (groups[k] || 0) + 1;
    }
    const labels = Object.keys(groups).sort();
    return {
      labels,
      datasets: [{
        label: 'งานซ่อม',
        data: labels.map(k => groups[k]),
        backgroundColor: 'rgba(56,224,255,0.6)',
        borderColor: '#38e0ff',
        borderWidth: 2,
        tension: 0.35,
        fill: true,
      }]
    };
  }, [rows]);

  const statusChart = React.useMemo(() => {
    const g = {};
    for (const r of rows) g[r.status] = (g[r.status] || 0) + 1;
    return {
      labels: Object.keys(g),
      datasets: [{
        data: Object.values(g),
        backgroundColor: ['#ffc04b','#6cb8ff','#ff9b73','#34e3a5','#7a8aaa'],
        borderWidth: 0,
      }]
    };
  }, [rows]);

  const breakdownChart = React.useMemo(() => {
    const g = {};
    for (const r of rows) g[r.machineId] = (g[r.machineId] || 0) + 1;
    const top = Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return {
      labels: top.map(e => e[0]),
      datasets: [{
        label: 'จำนวนครั้ง',
        data: top.map(e => e[1]),
        backgroundColor: 'rgba(255,90,122,0.55)',
        borderColor: '#ff5a7a',
        borderRadius: 8,
      }]
    };
  }, [rows]);

  const costChart = React.useMemo(() => {
    const groups = {};
    for (const r of rows) {
      const k = (r.date || '').slice(0, 7);
      groups[k] = (groups[k] || 0) + (parseFloat(r.cost) || 0);
    }
    const labels = Object.keys(groups).sort();
    return {
      labels,
      datasets: [{
        label: 'ค่าใช้จ่าย (บาท)',
        data: labels.map(k => groups[k]),
        backgroundColor: 'rgba(255,192,75,0.55)',
        borderColor: '#ffc04b',
        borderRadius: 8,
      }]
    };
  }, [rows]);

  const pmChart = React.useMemo(() => {
    const today_ = today();
    let onTime = 0, late = 0;
    for (const r of db.pmRecords) {
      const plan = db.pmPlans.find(p => p.id === r.pmId);
      if (!plan) { onTime++; continue; }
      if (r.doneDate && plan.nextDate && r.doneDate <= plan.nextDate) onTime++;
      else late++;
    }
    // Plus pending overdue
    const overduePending = db.pmPlans.filter(p => p.nextDate && p.nextDate < today_).length;
    return {
      labels: ['ตรงกำหนด','เกินกำหนด (รอ)','ทำสายเกินกำหนด'],
      datasets: [{
        data: [onTime, overduePending, late],
        backgroundColor: ['#34e3a5','#ff5a7a','#ffc04b'],
        borderWidth: 0,
      }]
    };
  }, [db.pmRecords, db.pmPlans]);

  // ----- exports -----
  const exportCSV = () => {
    const hdr = ['วันที่','รหัสเครื่อง','ชื่อเครื่อง','พื้นที่','อาการ','สถานะ','ความเร่งด่วน','ผู้รับผิดชอบ','ค่าใช้จ่าย'];
    const lines = [hdr];
    for (const r of rows) {
      lines.push([r.date, r.machineId, r.machineName, r.area, r.symptom, r.status, r.urgency, r.assignee, r.cost]);
    }
    const csv = '\ufeff' + lines.map(row => row.map(c => {
      const v = String(c ?? '');
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    }).join(',')).join('\n');
    downloadBlob(csv, 'maintenance-report.csv', 'text/csv;charset=utf-8');
    toast('success', 'ดาวน์โหลด CSV สำเร็จ');
  };

  const exportXLSX = () => {
    if (!window.XLSX) { toast('error', 'XLSX library ไม่พร้อม'); return; }
    const ws = window.XLSX.utils.json_to_sheet(rows.map(r => ({
      'วันที่': r.date,
      'รหัสเครื่อง': r.machineId,
      'ชื่อเครื่อง': r.machineName,
      'พื้นที่': r.area,
      'อาการ': r.symptom,
      'สถานะ': r.status,
      'ความเร่งด่วน': r.urgency,
      'ผู้รับผิดชอบ': r.assignee,
      'ค่าใช้จ่าย': r.cost,
    })));
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Repair Report');
    // Add Summary sheet
    const summary = buildSummarySheet(db);
    const wsSum = window.XLSX.utils.aoa_to_sheet(summary);
    window.XLSX.utils.book_append_sheet(wb, wsSum, 'Summary');
    window.XLSX.writeFile(wb, 'maintenance-report.xlsx');
    toast('success', 'ดาวน์โหลด Excel สำเร็จ');
  };

  const exportPDF = () => {
    if (!window.jspdf) { toast('error', 'jsPDF ไม่พร้อม'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    // Title
    doc.setFontSize(16);
    doc.text('Maintenance IFS — Repair Report', 40, 40);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Period: ${from} to ${to}  |  Total records: ${rows.length}`, 40, 58);
    doc.setTextColor(0);
    doc.autoTable({
      startY: 80,
      head: [['Date','Machine ID','Machine','Area','Symptom','Status','Urgency','Assignee','Cost']],
      body: rows.map(r => [r.date, r.machineId, (r.machineName||'').slice(0,40), r.area, (r.symptom||'').slice(0,50), r.status, r.urgency, r.assignee||'-', r.cost||0]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [56, 224, 255], textColor: 20, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      margin: { left: 40, right: 40 },
    });
    doc.save('maintenance-report.pdf');
    toast('success', 'ดาวน์โหลด PDF สำเร็จ');
  };

  return (
    <div className="flex flex-col gap-4">
      <Card padding={false}>
        <div className="p-5 flex flex-wrap items-center gap-3">
          <div className="h1 flex items-center gap-2"><Icon name="chart" size={22} /> รายงานและสถิติ</div>
          <div className="flex-1" />
          <Field label="จากวันที่"><input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} /></Field>
          <Field label="ถึงวันที่"><input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} /></Field>
          <button className="btn btn-ghost" onClick={exportCSV}><Icon name="download" size={14} /> CSV</button>
          <button className="btn btn-good" onClick={exportXLSX}><Icon name="xls" size={14} /> Excel</button>
          <button className="btn btn-danger" onClick={exportPDF}><Icon name="pdf" size={14} /> PDF</button>
        </div>
      </Card>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
        <Card title="จำนวนงานซ่อมรายเดือน">
          <ChartBox type="line" data={monthlyChart} height={240} options={chartDefaults()} />
        </Card>
        <Card title="สถานะงานซ่อม">
          <ChartBox type="doughnut" data={statusChart} height={240}
                    options={{ ...chartDefaults(), scales: {}, cutout: '60%',
                      plugins: { ...chartDefaults().plugins,
                        legend: { position: 'right', labels: { color: '#dbe6ff', font: { family: 'Sarabun', size: 11 }, boxWidth: 12 } } } }} />
        </Card>
        <Card title="เครื่องจักรที่เสียบ่อย">
          <ChartBox type="bar" data={breakdownChart} height={240}
                    options={{ ...chartDefaults(), plugins: { ...chartDefaults().plugins, legend: { display: false } } }} />
        </Card>
        <Card title="ค่าใช้จ่ายซ่อมบำรุง">
          <ChartBox type="bar" data={costChart} height={240}
                    options={{ ...chartDefaults(), plugins: { ...chartDefaults().plugins, legend: { display: false } } }} />
        </Card>
        <Card title="PM ตรงกำหนด vs เกินกำหนด">
          <ChartBox type="pie" data={pmChart} height={240}
                    options={{ ...chartDefaults(), scales: {},
                      plugins: { ...chartDefaults().plugins,
                        legend: { position: 'right', labels: { color: '#dbe6ff', font: { family: 'Sarabun', size: 11 }, boxWidth: 12 } } } }} />
        </Card>
      </div>

      <Card title={'ข้อมูลรายงาน (' + rows.length + ' รายการ)'} padding={false}>
        <div className="tbl-wrap" style={{ maxHeight: 480 }}>
          <table className="tbl">
            <thead><tr>
              <th>วันที่</th><th>รหัส</th><th>เครื่องจักร</th><th>อาการ</th><th>สถานะ</th><th>ผู้รับผิดชอบ</th><th style={{ textAlign:'right' }}>ค่าใช้จ่าย</th>
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="num">{fmtDate(r.date)}</td>
                  <td className="font-semibold">{r.machineId}</td>
                  <td>{r.machineName}</td>
                  <td style={{ maxWidth: 280 }}>{r.symptom}</td>
                  <td><StatusTag value={r.status} /></td>
                  <td>{r.assignee || '-'}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{Number(r.cost||0).toLocaleString()}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7}><Empty icon="chart" title="ไม่มีข้อมูลในช่วงเวลานี้" /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function buildSummarySheet(db) {
  // Per-machine summary: id, name, area, breakdowns, pm count, cost, fail count
  const header = ['รหัสเครื่อง','ชื่อเครื่อง','พื้นที่','แจ้งซ่อม (ครั้ง)','PM (ครั้ง)','ค่าใช้จ่ายรวม (บาท)','จำนวนครั้งที่เสีย'];
  const rows = [header];
  const costBy = {};
  for (const h of db.repairHistory) {
    costBy[h.machineId] = (costBy[h.machineId] || 0) + (parseFloat(h.cost) || 0);
  }
  const reqBy = {};
  for (const r of db.repairRequests) reqBy[r.machineId] = (reqBy[r.machineId] || 0) + 1;
  const pmBy = {};
  for (const r of db.pmRecords) pmBy[r.machineId] = (pmBy[r.machineId] || 0) + 1;
  const failBy = {};
  for (const r of db.repairRequests) {
    if (r.status !== 'ยกเลิก') failBy[r.machineId] = (failBy[r.machineId] || 0) + 1;
  }
  for (const m of db.machines) {
    rows.push([m.id, m.name, m.area, reqBy[m.id]||0, pmBy[m.id]||0, costBy[m.id]||0, failBy[m.id]||0]);
  }
  return rows;
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
}

window.PageReports = PageReports;
