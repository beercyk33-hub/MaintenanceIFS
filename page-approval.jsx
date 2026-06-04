// Approval workflow for repair requests.
// 4 roles approve in parallel (any order). Any rejection → request status = ถูกปฏิเสธ.
// All 4 approved → request status moves to รอรับงาน (ready to assign technician).
// Legacy data without an `approvals` object is treated as fully approved so old
// records don't suddenly block downstream pages.

// ---- Constants ----
const GOLDEN_RULES = [
  '1. ขอ Permit to Work ก่อนเริ่มงาน เมื่อจำเป็น',
  '2. ตัดแยกพลังงานก่อนทำงาน (Lockout / Tagout / Tryout)',
  '3. ตรวจ gas / บรรยากาศ ก่อนเข้าพื้นที่อับอากาศ',
  '4. ป้องกันการตกจากที่สูง (Body harness, ราวกั้น)',
  '5. ใส่อุปกรณ์ป้องกันส่วนบุคคล (PPE) ครบตามที่กำหนด',
  '6. ห้ามยืน / เดินใต้สิ่งของที่ถูกยกแขวน',
  '7. ตรวจสอบและแยกพลังงานไฟฟ้าก่อนแตะอุปกรณ์',
  '8. วางแผนการยก / ใช้รถยก โดยมีผู้ส่งสัญญาณ',
  '9. ห้ามทำงานภายใต้อิทธิพลของแอลกอฮอล์ / สารเสพติด',
  '10. รายงานเหตุการณ์ผิดปกติ / near-miss ทันที',
];

const APPROVAL_ROLES = [
  { key: 'deptManager', label: 'ผู้จัดการแผนก', short: 'ผจก.', accent: '#1d4eaf' },
  { key: 'qaRisk',      label: 'QA ประเมินความเสี่ยง', short: 'QA', accent: '#8b3aa7' },
  { key: 'safety',      label: 'Safety (10 Golden Rules)', short: 'Safety', accent: '#a04a00' },
  { key: 'coo',         label: 'COO อนุมัติให้ซ่อม', short: 'COO', accent: '#0a6e2c' },
];

const RISK_LEVELS = [
  { value: 'L', label: 'ต่ำ (Low)', bg: '#e6f4ea', fg: '#0a6e2c' },
  { value: 'M', label: 'ปานกลาง (Medium)', bg: '#fdebd5', fg: '#a04a00' },
  { value: 'H', label: 'สูง (High)', bg: '#fde2e7', fg: '#b3173f' },
];

// ---- Helpers ----
function emptyApprovals() {
  return {
    deptManager: { status: 'pending', name: '', date: '', note: '' },
    qaRisk:      { status: 'pending', name: '', date: '', note: '', riskLevel: '' },
    safety:      { status: 'pending', name: '', date: '', note: '', goldenRules: Array(10).fill(false) },
    coo:         { status: 'pending', name: '', date: '', note: '' },
  };
}

// Legacy records (no .approvals or .approvals.legacy) are implicitly fully approved.
function isLegacy(r) {
  return !r || !r.approvals || r.approvals.legacy === true;
}
function isFullyApproved(r) {
  if (isLegacy(r)) return true;
  return APPROVAL_ROLES.every(role => r.approvals[role.key]?.status === 'approved');
}
function isRejected(r) {
  if (isLegacy(r)) return false;
  return APPROVAL_ROLES.some(role => r.approvals[role.key]?.status === 'rejected');
}
function approvalProgress(r) {
  if (isLegacy(r)) return { approved: 4, total: 4, pending: 0, rejected: 0 };
  let approved = 0, rejected = 0, pending = 0;
  for (const role of APPROVAL_ROLES) {
    const s = r.approvals[role.key]?.status;
    if (s === 'approved') approved++;
    else if (s === 'rejected') rejected++;
    else pending++;
  }
  return { approved, total: 4, pending, rejected };
}

// ---- Visual: small badge dots showing each role's status ----
const ApprovalDots = ({ request }) => {
  const legacy = isLegacy(request);
  return (
    <div className="flex items-center gap-1" title={legacy ? 'ข้อมูลก่อนเปิดระบบอนุมัติ' : 'สถานะอนุมัติ'}>
      {APPROVAL_ROLES.map(role => {
        const s = legacy ? 'approved' : (request.approvals[role.key]?.status || 'pending');
        const colors = {
          approved: { bg: '#34e3a5', border: '#34e3a5' },
          rejected: { bg: '#ff5a7a', border: '#ff5a7a' },
          pending:  { bg: 'transparent', border: 'rgba(255,255,255,0.3)' },
        }[s];
        return (
          <span key={role.key}
                title={role.short + ': ' + ({approved:'อนุมัติ',rejected:'ปฏิเสธ',pending:'รอ'}[s])}
                style={{
                  display: 'inline-block', width: 10, height: 10, borderRadius: 999,
                  background: colors.bg, border: '1.5px solid ' + colors.border,
                }} />
        );
      })}
    </div>
  );
};

// ---- Visual: full timeline (used in detail + form sheet) ----
const ApprovalTimeline = ({ request, light = false }) => {
  if (isLegacy(request)) {
    return (
      <div style={{
        padding: '8px 12px', borderRadius: 8,
        background: light ? '#f1f3f6' : 'rgba(255,255,255,0.04)',
        color: light ? '#7b8390' : 'var(--ink-dim)', fontSize: 12.5,
      }}>
        ข้อมูลก่อนเปิดระบบอนุมัติ — ถือว่าผ่านการอนุมัติแล้ว
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
      {APPROVAL_ROLES.map(role => {
        const slot = request.approvals[role.key] || {};
        const s = slot.status || 'pending';
        const chipBg = light
          ? ({ approved: '#d6f1e0', rejected: '#fde2e7', pending: '#f1f3f6' }[s])
          : ({ approved: 'rgba(52,227,165,0.15)', rejected: 'rgba(255,90,122,0.18)', pending: 'rgba(255,255,255,0.05)' }[s]);
        const chipFg = light
          ? ({ approved: '#0a6e2c', rejected: '#b3173f', pending: '#7b8390' }[s])
          : ({ approved: '#8af2c8', rejected: '#ffa1b3', pending: 'var(--ink-dim)' }[s]);
        return (
          <div key={role.key} style={{
            padding: '8px 10px', borderRadius: 8,
            background: light ? '#fff' : 'rgba(255,255,255,0.04)',
            border: '1px solid ' + (light ? '#e5e8ee' : 'rgba(255,255,255,0.1)'),
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: role.accent, letterSpacing: 0.4 }}>{role.short}</div>
              <span style={{
                padding: '1px 8px', borderRadius: 999, background: chipBg, color: chipFg,
                fontSize: 9.5, fontWeight: 700,
              }}>{ {approved:'อนุมัติ', rejected:'ปฏิเสธ', pending:'รออนุมัติ'}[s] }</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: light ? '#1a1f2b' : 'var(--ink)' }}>
              {slot.name || '—'}
            </div>
            <div style={{ fontSize: 10.5, color: light ? '#7b8390' : 'var(--ink-faint)', marginTop: 2 }}>
              {slot.date ? fmtDate(slot.date) : ''}
              {role.key === 'qaRisk' && slot.riskLevel && <span style={{ marginLeft: 6 }}> · Risk: {slot.riskLevel}</span>}
            </div>
            {slot.note && (
              <div style={{ fontSize: 10.5, color: light ? '#3a3f48' : 'var(--ink-dim)', marginTop: 4, fontStyle: 'italic' }}>
                "{slot.note}"
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ---- Dialog: approve / reject a single role ----
const ApprovalDialog = ({ request, onClose, onSubmit }) => {
  const [roleKey, setRoleKey] = React.useState(APPROVAL_ROLES.find(r =>
    (request.approvals?.[r.key]?.status || 'pending') === 'pending')?.key || APPROVAL_ROLES[0].key);

  const existing = (request.approvals && request.approvals[roleKey]) || {};
  const [form, setForm] = React.useState(() => ({
    name: existing.name || '',
    date: existing.date || today(),
    note: existing.note || '',
    riskLevel: existing.riskLevel || 'L',
    goldenRules: Array.isArray(existing.goldenRules) && existing.goldenRules.length === 10
      ? [...existing.goldenRules]
      : Array(10).fill(false),
  }));

  // Re-sync form when role changes
  React.useEffect(() => {
    const e = (request.approvals && request.approvals[roleKey]) || {};
    setForm({
      name: e.name || '',
      date: e.date || today(),
      note: e.note || '',
      riskLevel: e.riskLevel || 'L',
      goldenRules: Array.isArray(e.goldenRules) && e.goldenRules.length === 10 ? [...e.goldenRules] : Array(10).fill(false),
    });
  }, [roleKey, request.id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = (decision) => {
    if (!form.name.trim()) {
      toast('warning', 'กรุณาระบุชื่อผู้อนุมัติ');
      return;
    }
    const slot = {
      status: decision, name: form.name.trim(), date: form.date, note: form.note.trim(),
    };
    if (roleKey === 'qaRisk') slot.riskLevel = form.riskLevel;
    if (roleKey === 'safety') slot.goldenRules = [...form.goldenRules];
    onSubmit(roleKey, slot);
  };

  const role = APPROVAL_ROLES.find(r => r.key === roleKey);

  return (
    <Modal open={true} onClose={onClose}
           title={'อนุมัติงานซ่อม · ' + (request.id || '')}
           footer={
             <>
               <button className="btn btn-ghost" onClick={onClose}>ปิด</button>
               <button className="btn btn-danger" onClick={() => submit('rejected')}>
                 <Icon name="close" size={14} /> ปฏิเสธ
               </button>
               <button className="btn btn-good" onClick={() => submit('approved')}>
                 <Icon name="check" size={14} /> อนุมัติ
               </button>
             </>
           }>
      <div className="flex flex-col gap-4">
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--ink-faint)', fontWeight: 600, marginBottom: 6 }}>เลือกบทบาทที่อนุมัติ</div>
          <div className="flex gap-2 flex-wrap">
            {APPROVAL_ROLES.map(r => {
              const s = request.approvals?.[r.key]?.status || 'pending';
              const active = r.key === roleKey;
              return (
                <button key={r.key} type="button"
                        onClick={() => setRoleKey(r.key)}
                        className="btn btn-sm"
                        style={active ? { background: r.accent, color: '#fff', border: 'none' } : {}}>
                  {r.short}
                  {s === 'approved' && <span style={{ marginLeft: 4 }}>✓</span>}
                  {s === 'rejected' && <span style={{ marginLeft: 4 }}>✕</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <Field label={'ชื่อ ' + role.label} required>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="ชื่อ-สกุล" />
          </Field>
          <Field label="วันที่อนุมัติ">
            <input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} />
          </Field>
        </div>

        {roleKey === 'qaRisk' && (
          <Field label="ระดับความเสี่ยง">
            <div className="flex gap-2">
              {RISK_LEVELS.map(r => (
                <button key={r.value} type="button"
                        onClick={() => set('riskLevel', r.value)}
                        className="btn btn-sm"
                        style={form.riskLevel === r.value ? { background: r.fg, color: '#fff', border: 'none' } : {}}>
                  {r.label}
                </button>
              ))}
            </div>
          </Field>
        )}

        {roleKey === 'safety' && (
          <Field label="ตรวจสอบ 10 Golden Rules">
            <div className="glass-soft rounded-xl p-3 flex flex-col gap-2" style={{ maxHeight: 240, overflowY: 'auto' }}>
              {GOLDEN_RULES.map((rule, i) => (
                <label key={i} className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.goldenRules[i]}
                         onChange={e => set('goldenRules', form.goldenRules.map((v, j) => j === i ? e.target.checked : v))}
                         style={{ marginTop: 3, accentColor: '#34e3a5' }} />
                  <span style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>{rule}</span>
                </label>
              ))}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--ink-faint)', marginTop: 4 }}>
              ทำเครื่องหมายข้อที่เกี่ยวข้อง/ผ่านการตรวจสอบ
            </div>
          </Field>
        )}

        <Field label="หมายเหตุ (ไม่บังคับ)">
          <textarea className="textarea" value={form.note} onChange={e => set('note', e.target.value)}
                    placeholder="เงื่อนไข / ข้อสังเกต / เหตุผลที่ปฏิเสธ..." style={{ minHeight: 60 }} />
        </Field>
      </div>
    </Modal>
  );
};

// Apply an approval decision and compute the new request.status
// (called from page-repair-tracking.jsx).
function applyApproval(request, roleKey, slot) {
  const next = { ...request };
  next.approvals = {
    ...emptyApprovals(),
    ...(request.approvals && !request.approvals.legacy ? request.approvals : {}),
    [roleKey]: slot,
  };
  if (slot.status === 'rejected') {
    next.status = 'ถูกปฏิเสธ';
  } else if (isFullyApproved(next)) {
    // Only auto-advance if the request was still waiting for approvals
    if (request.status === 'รออนุมัติ' || request.status === 'ถูกปฏิเสธ') {
      next.status = 'รอรับงาน';
    }
  } else {
    if (request.status === 'ถูกปฏิเสธ' || !request.status) next.status = 'รออนุมัติ';
  }
  return next;
}

// Export to window globals
Object.assign(window, {
  GOLDEN_RULES, APPROVAL_ROLES, RISK_LEVELS,
  emptyApprovals, isLegacy, isFullyApproved, isRejected, approvalProgress,
  ApprovalDots, ApprovalTimeline, ApprovalDialog, applyApproval,
});
