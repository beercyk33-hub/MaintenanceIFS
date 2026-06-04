// Authentication + role-based authorization helpers.
// Single source of truth for "who is logged in" plus the role → approval-step
// mapping used by the approval flow.

// Roles that exist in the system. The first 4 map 1-to-1 onto the approval steps.
const USER_ROLES = [
  { value: 'Admin',       label: 'Administrator',  approves: 'all' },
  { value: 'DeptManager', label: 'ผู้จัดการแผนก',  approves: 'deptManager' },
  { value: 'QA',          label: 'QA Officer',     approves: 'qaRisk' },
  { value: 'Safety',      label: 'Safety Officer', approves: 'safety' },
  { value: 'COO',         label: 'COO',            approves: 'coo' },
  { value: 'Maintenance', label: 'ช่างซ่อมบำรุง', approves: 'none' },
  { value: 'Reporter',    label: 'ผู้แจ้งซ่อม',     approves: 'none' },
];

const AUTH_KEY = 'mifs.currentUser';

function loadCurrentUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveCurrentUser(u) {
  if (u) localStorage.setItem(AUTH_KEY, JSON.stringify(u));
  else localStorage.removeItem(AUTH_KEY);
}

// Can a user role approve a given approval step key?
function canApproveStep(user, stepKey) {
  if (!user) return false;
  const role = USER_ROLES.find(r => r.value === user.role);
  if (!role) return false;
  return role.approves === 'all' || role.approves === stepKey;
}
function allowedSteps(user) {
  if (!user) return [];
  const role = USER_ROLES.find(r => r.value === user.role);
  if (!role) return [];
  if (role.approves === 'all') return ['deptManager', 'qaRisk', 'safety', 'coo'];
  if (role.approves === 'none') return [];
  return [role.approves];
}

// ---- Visual: current-user chip (header) ----
const UserChip = ({ user, onClick }) => (
  <button onClick={onClick} className="btn btn-sm btn-ghost"
          title={user ? 'คลิกเพื่อออกจากระบบ' : 'คลิกเพื่อเข้าสู่ระบบ'}>
    <Icon name="user" size={14} />
    {user ? (
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
        <span style={{ fontSize: '0.82rem' }}>{user.name}</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--ink-faint)', fontWeight: 500 }}>{user.role}</span>
      </span>
    ) : (
      <span>เข้าสู่ระบบ</span>
    )}
  </button>
);

// ---- Login dialog ----
const LoginDialog = ({ users, onClose, onLogin, message }) => {
  const [u, setU] = React.useState('');
  const [p, setP] = React.useState('');
  const [err, setErr] = React.useState('');

  const submit = (e) => {
    e && e.preventDefault();
    setErr('');
    const user = (users || []).find(x => x.username === u.trim() && x.password === p);
    if (!user) { setErr('Username หรือ Password ไม่ถูกต้อง'); return; }
    onLogin({ username: user.username, name: user.name, role: user.role, loggedInAt: new Date().toISOString() });
  };

  return (
    <Modal open={true} onClose={onClose} title="เข้าสู่ระบบ" size="sm"
           footer={
             <>
               <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
               <button className="btn btn-primary" onClick={submit}>
                 <Icon name="check" size={14} /> เข้าสู่ระบบ
               </button>
             </>
           }>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {message && (
          <div className="rounded-xl px-3 py-2" style={{
            background: 'rgba(108,140,255,0.12)', border: '1px solid rgba(108,140,255,0.35)',
            fontSize: '0.85rem',
          }}>{message}</div>
        )}
        <Field label="Username" required>
          <input className="input" value={u} onChange={e => setU(e.target.value)} autoFocus placeholder="ชื่อผู้ใช้" />
        </Field>
        <Field label="Password" required>
          <input className="input" type="password" value={p} onChange={e => setP(e.target.value)} placeholder="รหัสผ่าน" />
        </Field>
        {err && <div style={{ color: '#ff8aa1', fontSize: '0.85rem' }}>{err}</div>}
        <div className="glass-soft rounded-xl px-3 py-2" style={{ fontSize: '0.78rem', color: 'var(--ink-dim)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>ทดสอบ — บัญชีตัวอย่าง</div>
          <div>admin / manager / qa / safety / coo / maint · รหัส 1234</div>
        </div>
      </form>
    </Modal>
  );
};

Object.assign(window, {
  USER_ROLES, AUTH_KEY,
  loadCurrentUser, saveCurrentUser,
  canApproveStep, allowedSteps,
  UserChip, LoginDialog,
});
