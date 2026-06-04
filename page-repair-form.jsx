// ใบแจ้งซ่อม / แจ้งดำเนินการ — printable form sheet matching the official paper form.
// Open from "ติดตามสถานะงานซ่อม" or anywhere a request id is known.
// Supports: photos at the top (before/condition), photos at the bottom (after-repair),
// and PDF download via html2canvas + jsPDF.

function RepairFormSheet({ request, history, onClose }) {
  const sheetRef = React.useRef(null);
  const [downloading, setDownloading] = React.useState(false);

  const r = request || {};
  const h = history || {};

  const reqPhotos  = r.photos || [];
  const closePhotos = h.photos || [];

  const fmtT = (s) => s || '';
  const fmtD = (s) => s ? new Date(s).toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';

  // PDF download: capture the sheet via html2canvas, fit into an A4 page, save.
  const downloadPdf = async () => {
    if (!sheetRef.current) return;
    if (!window.html2canvas || !window.jspdf) {
      window.Swal && window.Swal.fire({ icon: 'error', title: 'ไม่สามารถสร้าง PDF', text: 'ไลบรารีไม่พร้อมใช้งาน' });
      return;
    }
    setDownloading(true);
    try {
      const canvas = await window.html2canvas(sheetRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const imgW = pageW;
      const imgH = pageW * ratio;
      if (imgH <= pageH) {
        pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);
      } else {
        // multi-page: slice the canvas vertically
        let y = 0;
        const pageHpx = canvas.width * (pageH / pageW);
        while (y < canvas.height) {
          const slice = document.createElement('canvas');
          slice.width = canvas.width;
          slice.height = Math.min(pageHpx, canvas.height - y);
          const sctx = slice.getContext('2d');
          sctx.drawImage(canvas, 0, y, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
          const sData = slice.toDataURL('image/jpeg', 0.92);
          if (y > 0) pdf.addPage();
          pdf.addImage(sData, 'JPEG', 0, 0, imgW, (slice.height / canvas.width) * pageW);
          y += slice.height;
        }
      }
      const filename = 'ใบแจ้งซ่อม-' + (r.id || 'untitled') + '.pdf';
      pdf.save(filename);
    } catch (e) {
      window.Swal && window.Swal.fire({ icon: 'error', title: 'สร้าง PDF ไม่สำเร็จ', text: String(e && e.message || e) });
    } finally {
      setDownloading(false);
    }
  };

  // Helpers for the printed form
  const Check = ({ on, label }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 10 }}>
      <span style={{
        display: 'inline-block', width: 14, height: 14, border: '1.2px solid #333',
        background: on ? '#222' : '#fff', flexShrink: 0,
      }}>
        {on ? <span style={{ color: '#fff', display: 'block', textAlign: 'center', lineHeight: '12px', fontSize: 11 }}>✓</span> : null}
      </span>
      <span>{label}</span>
    </span>
  );

  const LabelLine = ({ label, value, width = 'auto', flex }) => (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, flex }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span style={{
        borderBottom: '1px dotted #888', minWidth: 60, padding: '0 4px',
        flex: width === 'auto' ? 1 : undefined, width: width !== 'auto' ? width : undefined,
      }}>{value || ''}</span>
    </span>
  );

  // Pre-compute booleans from existing data
  const urgent  = r.urgency === 'ฉุกเฉิน' || r.urgency === 'สูง';
  const closed  = r.status === 'ซ่อมเสร็จ';
  const repairDays = (h.startDate && h.endDate) ? (Math.round((new Date(h.endDate) - new Date(h.startDate)) / 86400000) + ' วัน') : '';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(2,4,15,0.92)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Sticky toolbar */}
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

      {/* Scrollable sheet area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', justifyContent: 'center' }}>
        <div ref={sheetRef} style={{
          width: '210mm', minHeight: '297mm', background: '#fff', color: '#111',
          padding: '12mm 10mm', fontFamily: 'Sarabun, Noto Sans Thai, sans-serif', fontSize: 12, lineHeight: 1.4,
          boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6)',
        }}>
          {/* === Title === */}
          <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 16, borderBottom: '1.5px solid #111', paddingBottom: 4, marginBottom: 0 }}>
            ใบแจ้งซ่อม / แจ้งดำเนินการ
          </div>

          {/* === Header section === */}
          <div style={{ border: '1.5px solid #111', borderTop: 'none', padding: '6px 8px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <LabelLine label="หน่วยงานแผนก :" value={r.area || ''} flex={2} />
              <LabelLine label="โดย :" value={r.reporter} flex={2} />
              <LabelLine label="หมายเลขใบแจ้งซ่อม" value={r.id} flex={1.4} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <LabelLine label="เครื่องจักร/อุปกรณ์ :" value={r.machineName} flex={3} />
              <LabelLine label="หมายเลข :" value={r.machineId} flex={1} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <LabelLine label="อาการเสีย :" value={r.symptom} flex={3} />
              <LabelLine label="หมายเลข :" value="" flex={1} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <LabelLine label="อาการ/ข้อ :" value={r.note || ''} flex={3} />
              <LabelLine label="วันที่ :" value={fmtD(r.date) + ' ' + fmtT(r.time)} flex={1} />
            </div>
            <div style={{ textAlign: 'center', fontSize: 11, marginTop: 4, fontWeight: 600 }}>
              (ผู้แจ้ง : แผนก/จริมเลขโทรศัพท์ภายใน)
            </div>
          </div>

          {/* === Impact + Cause section === */}
          <div style={{ border: '1.5px solid #111', borderTop: 'none', padding: '6px 8px' }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontWeight: 700, marginRight: 14 }}>ผลกระทบ</span>
              <Check label="Safety"      on={false} />
              <Check label="Quality"     on={false} />
              <Check label="Minor Stop"  on={false} />
              <Check label="Breakdown"   on={urgent} />
            </div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ display: 'inline-block', width: 70 }}>0</span>
              <Check label="อื่นๆ" on={false} />
              <span style={{ fontSize: 10, color: '#444' }}>
                ( 1. Minor flow  2. Lack of basic condition  3. Hard of reach  4. Sources of contaminate  5. Unnecessary item )
              </span>
            </div>
            <div style={{ marginTop: 6 }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>ค้นหาสาเหตุของการเสีย :</div>
              <div style={{ borderBottom: '1px dotted #888', height: 14 }}>{h.cause || ''}</div>
              <div style={{ borderBottom: '1px dotted #888', height: 14, marginTop: 6 }}></div>
              <div style={{ borderBottom: '1px dotted #888', height: 14, marginTop: 6 }}></div>
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <LabelLine label="เจ้าของพื้นที่ :" value="" width={180} />
              <LabelLine label="วันที่ :" value="" width={110} />
            </div>
          </div>

          {/* === Urgency / approval === */}
          <div style={{ border: '1.5px solid #111', borderTop: 'none', padding: '6px 8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr', gap: 4, alignItems: 'center' }}>
              <div style={{ fontWeight: 700 }}>ความเร่งด่วน</div>
              <div><Check label="เร่งด่วน" on={urgent} /><Check label="ไม่เร่งด่วน" on={!urgent} /></div>
              <LabelLine label="ผลแผนก :" value="" />
              <LabelLine label="วันที่ :" value="" />

              <div></div>
              <div><Check label="จำเป็น" on={false} /><Check label="ไม่จำเป็น" on={false} /></div>
              <LabelLine label="ผลแผนก/QA :" value="" />
              <LabelLine label="วันที่ :" value="" />

              <div></div>
              <div><Check label="จำเป็น" on={false} /><Check label="ไม่จำเป็น" on={false} /></div>
              <LabelLine label="Safety :" value="" />
              <LabelLine label="วันที่ :" value="" />

              <div></div>
              <div><Check label="อนุมัติซ่อม" on={closed} /><Check label="ไม่อนุมัติซ่อม" on={false} /></div>
              <LabelLine label="ผู้อนุมัติ :" value="" />
              <span style={{ fontSize: 10, color: '#444' }}>(ชื่อตัวบรรจง)</span>
            </div>
          </div>

          {/* === Repair details (location / type / LOTO) === */}
          <div style={{ border: '1.5px solid #111', borderTop: 'none', padding: '6px 8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 1fr 1fr', gap: 4, alignItems: 'center' }}>
              <div style={{ fontWeight: 700 }}>รายละเอียดในการซ่อม</div>
              <div><Check label="ในบริษัท" on={closed} /></div>
              <div><Check label="Work shop" on={false} /></div>
              <div><Check label="ส่วนภายนอก" on={false} /></div>

              <div></div>
              <div><Check label="บอ่อน Part" on={!!h.parts} /></div>
              <div><Check label="ปรับแต่ง" on={false} /></div>
              <div><Check label="Modify" on={false} /></div>

              <div style={{ fontWeight: 700 }}>LOCKOUT-TAGOUT</div>
              <div><Check label="จำเป็น" on={false} /></div>
              <div><Check label="ไม่จำเป็น" on={false} /></div>
              <div></div>
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <LabelLine label="อื่นๆ" value={h.detail || ''} flex={1} />
            </div>
          </div>

          {/* === BEFORE PHOTOS — แนบรูปอาการเสีย === */}
          {reqPhotos.length > 0 && (
            <div style={{ border: '1.5px solid #111', borderTop: 'none', padding: '6px 8px' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>ภาพอาการเสีย (ตอนแจ้งซ่อม) — {reqPhotos.length} ภาพ</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {reqPhotos.map(p => (
                  <div key={p.id} style={{ border: '1px solid #ccc', height: 100, overflow: 'hidden', background: '#fafafa' }}>
                    <img src={p.url || p.dataUrl} alt={p.name}
                         crossOrigin="anonymous"
                         style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === Repair items + cause + prevention === */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1.5px solid #111', borderTop: 'none' }}>
            <div style={{ padding: '6px 8px', borderRight: '1px solid #111' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>รายการที่ซ่อมแก้ไข</div>
              {[1,2,3,4,5].map(i => {
                const txt = i === 1 ? (h.solution || '') : '';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                    <span>{i}.</span>
                    <span style={{ flex: 1, borderBottom: '1px dotted #888', minHeight: 14 }}>{txt}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '6px 8px' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>ค้นหาสาเหตุปัญหา</div>
              {[1,2,3].map(i => {
                const txt = i === 1 ? (h.cause || '') : '';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                    <span>{i}.</span>
                    <span style={{ flex: 1, borderBottom: '1px dotted #888', minHeight: 14 }}>{txt}</span>
                  </div>
                );
              })}
              <div style={{ fontWeight: 700, margin: '8px 0 4px' }}>การป้องกันการเกิดซ้ำ</div>
              {[1,2,3].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span>{i}.</span>
                  <span style={{ flex: 1, borderBottom: '1px dotted #888', minHeight: 14 }}></span>
                </div>
              ))}
            </div>
          </div>

          {/* === Time === */}
          <div style={{ border: '1.5px solid #111', borderTop: 'none', padding: '6px 8px' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
              <LabelLine label="เวลาที่ซ่อม :" value={fmtD(h.startDate)} width={150} />
              <LabelLine label="เวลาซ่อมเสร็จ :" value={fmtD(h.endDate)} width={150} />
              <LabelLine label="ใช้งานทั้งสิ้น" value={repairDays} width={120} />
              <span>นาที / วัน</span>
            </div>
            <div style={{ fontSize: 10, color: '#444', marginTop: 6 }}>
              <b>หมายเหตุ :</b> เวลาซ่อม, ค้นหาปัญหา, การป้องกันการเกิดซ้ำจะลงทุนเฉพาะที่เป็นเครื่องจักร Critical เท่านั้น
            </div>
          </div>

          {/* === AFTER PHOTOS — แนบรูปหลังซ่อม === */}
          {closePhotos.length > 0 && (
            <div style={{ border: '1.5px solid #111', borderTop: 'none', padding: '6px 8px' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>ภาพหลังการซ่อม (ตอนปิดงาน) — {closePhotos.length} ภาพ</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {closePhotos.map(p => (
                  <div key={p.id} style={{ border: '1px solid #ccc', height: 100, overflow: 'hidden', background: '#fafafa' }}>
                    <img src={p.url || p.dataUrl} alt={p.name}
                         crossOrigin="anonymous"
                         style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === Inspection === */}
          <div style={{ border: '1.5px solid #111', borderTop: 'none', padding: '6px 8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: 4, alignItems: 'center' }}>
              <div style={{ fontWeight: 700 }}>การตรวจรับงาน<br/><span style={{ fontWeight: 400, fontSize: 10 }}>(ผู้แจ้ง)</span></div>
              <div><Check label="พื้นที่สะอาด" on={closed} /></div>
              <div><Check label="ไม่มีเครื่องมือคำกัน" on={closed} /></div>
              <div><Check label="เครื่องจักร/อุปกรณ์ใช้งานได้ปกติ" on={closed && h.afterStatus === 'ใช้งานได้'} /></div>
              <div></div>
              <div style={{ gridColumn: '2 / -1' }}>
                <LabelLine label="อื่นๆ" value={h.testResult || ''} flex={1} />
              </div>
            </div>
            <div style={{ fontWeight: 700, marginTop: 6 }}>ตรวจสอบโดย</div>
          </div>

          {/* === Signatures === */}
          <div style={{ border: '1.5px solid #111', borderTop: 'none', padding: '14px 8px 8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, textAlign: 'center', fontSize: 11 }}>
              {[
                { role: 'ผู้แจ้ง', name: r.reporter },
                { role: 'QA/Safety', name: '' },
                { role: 'หัวหน้าแผนก', name: '' },
                { role: 'ผจก./หลก./แผนกวิศวกรรม', name: h.technician || '' },
                { role: 'ผู้จัดการทั่วไป', name: '' },
              ].map((sig, i) => (
                <div key={i}>
                  <div style={{ borderBottom: '1px solid #111', height: 24, marginBottom: 2 }}>{sig.name}</div>
                  <div style={{ fontWeight: 700 }}>{sig.role}</div>
                  <div style={{ marginTop: 4 }}>วันที่ ......./......./.......</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.RepairFormSheet = RepairFormSheet;
