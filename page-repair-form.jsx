// ใบแจ้งซ่อม / แจ้งดำเนินการ — modern card-based sheet (replaces the paper-form layout).
// Pulls the same data as before (request + matched repairHistory) but presents it as a
// clean, brand-coloured report with section cards, status chips, and photo galleries.
// Still printable: html2canvas + jsPDF rasterise the whole sheet into an A4 PDF.

function RepairFormSheet({ request, history, onClose }) {
  const sheetRef = React.useRef(null);
  const [downloading, setDownloading] = React.useState(false);

  const r = request || {};
  const h = history || {};
  const closed = r.status === 'ซ่อมเสร็จ';

  const reqPhotos   = r.photos || [];
  const closePhotos = h.photos || [];

  const fmtD = (s) => s ? new Date(s).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
  const fmtDS = (s) => s ? new Date(s).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  const URGENCY = {
    'ฉุกเฉิน':  { bg: '#fde2e7', fg: '#b3173f', label: 'ฉุกเฉิน' },
    'สูง':      { bg: '#fdebd5', fg: '#a04a00', label: 'เร่งด่วน' },
    'ปานกลาง':  { bg: '#e2eefd', fg: '#1d4eaf', label: 'ปานกลาง' },
    'ต่ำ':      { bg: '#e6f4ea', fg: '#0a6e2c', label: 'ไม่เร่งด่วน' },
  };
  const STATUS = {
    'ซ่อมเสร็จ':       { bg: '#d6f1e0', fg: '#0a6e2c', label: 'ปิดงานเรียบร้อย' },
    'กำลังดำเนินการ':  { bg: '#dbeafe', fg: '#1d4eaf', label: 'กำลังซ่อม' },
    'รออะไหล่':        { bg: '#fde6c0', fg: '#a04a00', label: 'รออะไหล่' },
    'รอรับงาน':        { bg: '#f1f3f6', fg: '#3a3f48', label: 'รอรับงาน' },
    'ยกเลิก':          { bg: '#f1f3f6', fg: '#7b8390', label: 'ยกเลิก' },
  };
  const urgencyChip = URGENCY[r.urgency] || URGENCY['ปานกลาง'];
  const statusChip  = STATUS[r.status] || STATUS['รอรับงาน'];

  // Duration in days when both repair dates exist
  const repairDays = (h.startDate && h.endDate)
    ? (Math.round((new Date(h.endDate) - new Date(h.startDate)) / 86400000) + 1)
    : null;

  // PDF download — capture and fit to A4, multi-page if needed.
  const downloadPdf = async () => {
    if (!sheetRef.current) return;
    if (!window.html2canvas || !window.jspdf) {
      window.Swal && window.Swal.fire({ icon: 'error', title: 'ไม่สามารถสร้าง PDF', text: 'ไลบรารีไม่พร้อมใช้งาน' });
      return;
    }
    setDownloading(true);
    try {
      const canvas = await window.html2canvas(sheetRef.current, {
        scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const imgH = pageW * ratio;
      if (imgH <= pageH) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pageW, imgH);
      } else {
        // multi-page slicing
        const pageHpx = canvas.width * (pageH / pageW);
        let y = 0;
        while (y < canvas.height) {
          const slice = document.createElement('canvas');
          slice.width = canvas.width;
          slice.height = Math.min(pageHpx, canvas.height - y);
          const sctx = slice.getContext('2d');
          sctx.fillStyle = '#fff';
          sctx.fillRect(0, 0, slice.width, slice.height);
          sctx.drawImage(canvas, 0, y, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
          const sData = slice.toDataURL('image/jpeg', 0.92);
          if (y > 0) pdf.addPage();
          pdf.addImage(sData, 'JPEG', 0, 0, pageW, (slice.height / canvas.width) * pageW);
          y += slice.height;
        }
      }
      pdf.save('ใบแจ้งซ่อม-' + (r.id || 'untitled') + '.pdf');
    } catch (e) {
      window.Swal && window.Swal.fire({ icon: 'error', title: 'สร้าง PDF ไม่สำเร็จ', text: String(e && e.message || e) });
    } finally {
      setDownloading(false);
    }
  };

  // === Sub-components (light-themed for print) ===

  const Section = ({ title, accent = '#1d4eaf', icon, children, action }) => (
    <div style={{
      background: '#fff', border: '1px solid #e5e8ee', borderRadius: 10,
      padding: '12px 14px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {icon && (
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: accent + '18', color: accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700,
          }}>{icon}</div>
        )}
        <div style={{ fontWeight: 700, color: '#1a1f2b', fontSize: 12.5, letterSpacing: 0.2 }}>{title}</div>
        <div style={{ flex: 1, borderBottom: '1px dashed #e0e4eb', marginTop: 2 }}></div>
        {action}
      </div>
      {children}
    </div>
  );

  const Chip = ({ bg, fg, children, big }) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: big ? '4px 12px' : '2px 8px',
      borderRadius: 999, background: bg, color: fg,
      fontSize: big ? 11.5 : 10.5, fontWeight: 700, lineHeight: 1.4,
    }}>{children}</span>
  );

  const InfoCell = ({ label, value, mono }) => (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 9.5, color: '#7b8390', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: '#1a1f2b', fontWeight: 600, fontFamily: mono ? '"SF Mono", Menlo, Consolas, monospace' : 'inherit', wordBreak: 'break-word' }}>
        {value || <span style={{ color: '#b8bdc7', fontWeight: 400 }}>—</span>}
      </div>
    </div>
  );

  const PhotoGrid = ({ photos }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {photos.map(p => (
        <div key={p.id} style={{
          border: '1px solid #e0e4eb', borderRadius: 6, overflow: 'hidden',
          height: 120, background: '#fafafa', position: 'relative',
        }}>
          <img src={p.url || p.dataUrl} alt={p.name} crossOrigin="anonymous"
               style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ))}
    </div>
  );

  // Signatures — pulled from the approval workflow when available, otherwise blank.
  const ap = (r.approvals && !r.approvals.legacy) ? r.approvals : {};
  const sigOf = (key) => {
    const slot = ap[key];
    return slot && slot.status === 'approved' ? { name: slot.name, date: slot.date } : { name: '', date: '' };
  };
  const signatures = [
    { role: 'ผู้แจ้ง',           ...{ name: r.reporter, date: r.date } },
    { role: 'ผจก. แผนก',         ...sigOf('deptManager') },
    { role: 'QA (ความเสี่ยง)',   ...sigOf('qaRisk') },
    { role: 'Safety (Golden Rules)', ...sigOf('safety') },
    { role: 'COO อนุมัติ',       ...sigOf('coo') },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(2,4,15,0.92)', display: 'flex', flexDirection: 'column',
    }}>
      {/* Dark toolbar */}
      <div style={{
        background: 'rgba(8,16,44,0.95)', borderBottom: '1px solid var(--line)',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          <Icon name="close" size={16} /> ปิด
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#dbe6ff' }}>ใบแจ้งซ่อม / แจ้งดำเนินการ</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--ink-faint)' }}>{r.id} · {r.machineId}</div>
        </div>
        <button className="btn btn-primary btn-sm" disabled={downloading} onClick={downloadPdf}>
          <Icon name={downloading ? 'refresh' : 'download'} size={14} className={downloading ? 'animate-spin' : ''} />
          {downloading ? ' กำลังสร้าง PDF...' : ' ดาวน์โหลด PDF'}
        </button>
      </div>

      {/* Sheet area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', justifyContent: 'center' }}>
        <div ref={sheetRef} style={{
          width: '210mm', minHeight: '297mm',
          background: 'linear-gradient(180deg, #f7f9fc 0%, #ffffff 200px)',
          color: '#1a1f2b',
          padding: '14mm 12mm', fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif',
          fontSize: 12, lineHeight: 1.5,
          boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6)',
        }}>
          {/* === HEADER === */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'flex-start',
            padding: '14px 16px', borderRadius: 12,
            background: 'linear-gradient(135deg, #1d4eaf 0%, #2b6bd6 50%, #3b89ee 100%)',
            color: '#fff', marginBottom: 14,
            boxShadow: '0 10px 24px -12px rgba(29,78,175,0.4)',
          }}>
            <div>
              <div style={{ fontSize: 10.5, opacity: 0.85, fontWeight: 600, letterSpacing: 1 }}>
                MAINTENANCE IFS · REPAIR REQUEST
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>
                ใบแจ้งซ่อม / แจ้งดำเนินการ
              </div>
              <div style={{ fontSize: 11, opacity: 0.92, marginTop: 4 }}>
                บริษัท อินดัสเทรียล ฟู้ด ซัพพลาย จำกัด · ฝ่ายซ่อมบำรุง
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, opacity: 0.8, fontWeight: 600, letterSpacing: 0.6 }}>เลขใบงาน</div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: '"SF Mono", Menlo, Consolas, monospace', marginTop: 2 }}>{r.id}</div>
              <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
                <Chip bg="rgba(255,255,255,0.22)" fg="#fff" big>{urgencyChip.label}</Chip>
                <Chip bg="rgba(255,255,255,0.22)" fg="#fff" big>{statusChip.label}</Chip>
              </div>
            </div>
          </div>

          {/* === MACHINE + REPORTER === */}
          <Section title="ข้อมูลเครื่องจักรและผู้แจ้ง" accent="#1d4eaf" icon="i">
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 1fr', gap: 12 }}>
              <div style={{
                background: '#1d4eaf', color: '#fff', borderRadius: 10, padding: '14px 10px',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center',
              }}>
                <div style={{ fontSize: 9.5, opacity: 0.85, letterSpacing: 0.6, fontWeight: 600 }}>พื้นที่</div>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2, fontFamily: '"SF Mono", Menlo, Consolas, monospace' }}>{r.area || '—'}</div>
              </div>
              <InfoCell label="รหัสเครื่อง" value={r.machineId} mono />
              <InfoCell label="ชื่อเครื่อง" value={r.machineName} />
              <InfoCell label="ผู้แจ้งซ่อม" value={r.reporter} />
              <div></div>
              <InfoCell label="วันที่แจ้ง" value={fmtD(r.date) + (r.time ? ' · ' + r.time + ' น.' : '')} />
              <InfoCell label="ผู้รับผิดชอบงาน" value={r.assignee} />
              <InfoCell label="หมายเหตุ" value={r.note} />
            </div>
          </Section>

          {/* === SYMPTOM + IMPACT === */}
          <Section title="อาการเสีย / ผลกระทบ" accent="#b3173f" icon="!">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 12 }}>
              <div style={{
                background: '#fff8f8', border: '1px solid #f6dadf', borderRadius: 10,
                padding: '10px 12px', minHeight: 70,
              }}>
                <div style={{ fontSize: 9.5, color: '#b3173f', fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>อาการที่พบ</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1f2b', whiteSpace: 'pre-wrap' }}>
                  {r.symptom || <span style={{ color: '#b8bdc7' }}>(ไม่ระบุ)</span>}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9.5, color: '#7b8390', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>ระดับผลกระทบ</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <Chip bg={urgencyChip.bg} fg={urgencyChip.fg} big>● {urgencyChip.label}</Chip>
                  {r.urgency === 'ฉุกเฉิน' && <Chip bg="#fde2e7" fg="#b3173f">Breakdown</Chip>}
                  {(r.urgency === 'สูง' || r.urgency === 'ฉุกเฉิน') && <Chip bg="#fdebd5" fg="#a04a00">Safety risk</Chip>}
                  {r.urgency === 'ปานกลาง' && <Chip bg="#e2eefd" fg="#1d4eaf">Minor Stop</Chip>}
                  {r.urgency === 'ต่ำ' && <Chip bg="#e6f4ea" fg="#0a6e2c">Quality</Chip>}
                </div>
                <div style={{ fontSize: 10, color: '#7b8390', marginTop: 8, lineHeight: 1.4 }}>
                  1.Minor flow · 2.Lack of basic condition · 3.Hard of reach · 4.Sources of contaminate · 5.Unnecessary item
                </div>
              </div>
            </div>
          </Section>

          {/* === BEFORE PHOTOS === */}
          {reqPhotos.length > 0 && (
            <Section title={`ภาพอาการเสีย (ตอนแจ้งซ่อม) · ${reqPhotos.length} ภาพ`} accent="#b3173f" icon="📷">
              <PhotoGrid photos={reqPhotos} />
            </Section>
          )}

          {/* === REPAIR DETAILS === */}
          <Section
            title="รายละเอียดการซ่อม"
            accent="#0a6e2c"
            icon="✓"
            action={
              closed
                ? <Chip bg="#d6f1e0" fg="#0a6e2c">ปิดงานแล้ว</Chip>
                : <Chip bg="#fde6c0" fg="#a04a00">ยังไม่ปิดงาน</Chip>
            }
          >
            {closed && h.id ? (
              <>
                {/* Timeline */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
                  background: '#f7faf8', border: '1px solid #d5e9dc', borderRadius: 10,
                  padding: '10px 12px', marginBottom: 10,
                }}>
                  <InfoCell label="วันที่เริ่มซ่อม" value={fmtDS(h.startDate)} />
                  <InfoCell label="วันที่ซ่อมเสร็จ" value={fmtDS(h.endDate)} />
                  <InfoCell label="ระยะเวลา" value={repairDays != null ? repairDays + ' วัน' : '—'} />
                </div>

                {/* Cause / Solution / Test */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 9.5, color: '#7b8390', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>สาเหตุของปัญหา</div>
                    <div style={{ background: '#fafbfd', border: '1px solid #e5e8ee', borderRadius: 8, padding: '8px 10px', minHeight: 50, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                      {h.cause || <span style={{ color: '#b8bdc7' }}>—</span>}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9.5, color: '#0a6e2c', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>วิธีแก้ไข</div>
                    <div style={{ background: '#f7faf8', border: '1px solid #d5e9dc', borderRadius: 8, padding: '8px 10px', minHeight: 50, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                      {h.solution || <span style={{ color: '#b8bdc7' }}>—</span>}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9.5, color: '#7b8390', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>รายละเอียดเพิ่มเติม</div>
                    <div style={{ background: '#fafbfd', border: '1px solid #e5e8ee', borderRadius: 8, padding: '8px 10px', minHeight: 50, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                      {h.detail || <span style={{ color: '#b8bdc7' }}>—</span>}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9.5, color: '#7b8390', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>ผลการทดสอบ</div>
                    <div style={{ background: '#fafbfd', border: '1px solid #e5e8ee', borderRadius: 8, padding: '8px 10px', minHeight: 50, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                      {h.testResult || <span style={{ color: '#b8bdc7' }}>—</span>}
                    </div>
                  </div>
                </div>

                {/* Parts / Cost / Technician / Status */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12,
                  marginTop: 10, padding: '10px 12px', background: '#fafbfd',
                  border: '1px solid #e5e8ee', borderRadius: 10,
                }}>
                  <InfoCell label="อะไหล่ที่ใช้" value={h.parts} />
                  <InfoCell label="ค่าใช้จ่าย" value={h.cost ? Number(h.cost).toLocaleString() + ' บาท' : null} />
                  <InfoCell label="ผู้ดำเนินการ" value={h.technician} />
                  <InfoCell label="สถานะหลังซ่อม" value={h.afterStatus} />
                </div>
              </>
            ) : (
              <div style={{
                padding: '18px 14px', textAlign: 'center', color: '#7b8390',
                background: '#fafbfd', border: '1px dashed #d5dae3', borderRadius: 10,
              }}>
                <div style={{ fontSize: 12 }}>ยังไม่มีการบันทึกประวัติการซ่อมสำหรับใบงานนี้</div>
                <div style={{ fontSize: 10.5, marginTop: 4 }}>เมื่อปิดงานแล้ว ข้อมูลการซ่อมจะปรากฏที่นี่</div>
              </div>
            )}
          </Section>

          {/* === AFTER PHOTOS === */}
          {closePhotos.length > 0 && (
            <Section title={`ภาพหลังการซ่อม (ตอนปิดงาน) · ${closePhotos.length} ภาพ`} accent="#0a6e2c" icon="📷">
              <PhotoGrid photos={closePhotos} />
            </Section>
          )}

          {/* === INSPECTION === */}
          <Section title="การตรวจรับงาน" accent="#1d4eaf" icon="✓">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { label: 'พื้นที่สะอาด', ok: closed },
                { label: 'ไม่มีเครื่องมือค้าง', ok: closed },
                { label: 'เครื่องจักรใช้งานได้ปกติ', ok: closed && h.afterStatus === 'ใช้งานได้' },
              ].map((c, i) => (
                <div key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 999,
                  background: c.ok ? '#d6f1e0' : '#f1f3f6',
                  color: c.ok ? '#0a6e2c' : '#7b8390',
                  fontSize: 11.5, fontWeight: 600, border: '1px solid ' + (c.ok ? '#b6e2c5' : '#e0e4eb'),
                }}>
                  <span style={{
                    display: 'inline-flex', width: 16, height: 16, borderRadius: 4,
                    background: c.ok ? '#0a6e2c' : 'transparent',
                    border: c.ok ? 'none' : '1.4px solid #b8bdc7',
                    color: '#fff', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11,
                  }}>{c.ok ? '✓' : ''}</span>
                  {c.label}
                </div>
              ))}
            </div>
          </Section>

          {/* === SIGNATURES === */}
          <Section title="ผู้ตรวจสอบและอนุมัติ" accent="#3a3f48" icon="✎">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {signatures.map((s, i) => (
                <div key={i} style={{
                  border: '1px solid #e5e8ee', borderRadius: 8, padding: '10px 8px',
                  background: '#fff', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', textAlign: 'center', minHeight: 86,
                }}>
                  <div style={{
                    flex: 1, width: '100%', borderBottom: '1px solid #c5cad3',
                    fontSize: 11, color: '#1a1f2b', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 2,
                  }}>{s.name || ''}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: '#3a3f48', marginTop: 4 }}>{s.role}</div>
                  <div style={{ fontSize: 9.5, color: '#7b8390', marginTop: 2 }}>
                    {s.date ? fmtDS(s.date) : 'วันที่ ........./........./.........'}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* === FOOTER === */}
          <div style={{
            marginTop: 12, padding: '8px 12px',
            fontSize: 9.5, color: '#7b8390', textAlign: 'center',
            borderTop: '1px solid #e5e8ee',
          }}>
            สร้างโดยระบบ Maintenance IFS · {fmtDS(new Date().toISOString().slice(0,10))} ·
            หมายเหตุ: เวลาซ่อม, สาเหตุปัญหา และการป้องกันการเกิดซ้ำ ลงเฉพาะกรณีเครื่องจักร Critical
          </div>
        </div>
      </div>
    </div>
  );
}

window.RepairFormSheet = RepairFormSheet;
