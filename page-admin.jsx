// ส่วนแอดมิน — page-admin.jsx
function PageAdmin({ db, setDb, nav }) {
  const [tab, setTab] = React.useState('general');

  const tabs = [
    { key: 'general',     label: 'ข้อมูลทั่วไป',  icon: 'cog' },
    { key: 'machines',    label: 'เครื่องจักร',   icon: 'machine' },
    { key: 'technicians', label: 'ช่างซ่อมบำรุง', icon: 'user' },
    { key: 'pm',          label: 'รายการ PM',     icon: 'calendar' },
    { key: 'users',       label: 'ผู้ใช้งาน',     icon: 'shield' },
    { key: 'sync',        label: 'การเชื่อมต่อ', icon: 'link' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card padding={false}>
        <div className="px-6 pt-6 pb-4 flex items-center gap-3 flex-wrap" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="rounded-2xl flex items-center justify-center"
               style={{ width: 44, height: 44, background: 'linear-gradient(135deg, rgba(108,140,255,0.25), rgba(56,224,255,0.25))', border:'1px solid rgba(108,140,255,0.4)', color:'#a8d2ff' }}>
            <Icon name="shield" size={22} />
          </div>
          <div>
            <div className="h1">ส่วนผู้ดูแลระบบ</div>
            <div style={{ fontSize: '0.86rem', color: 'var(--ink-dim)' }}>เข้าใช้งานในฐานะ Admin · จัดการการตั้งค่าและข้อมูลหลัก</div>
          </div>
        </div>
        <div className="px-6 py-3 flex gap-2 flex-wrap" style={{ borderBottom: '1px solid var(--line)' }}>
          {tabs.map(t => (
            <button key={t.key}
                    className={'btn btn-sm ' + (tab === t.key ? 'btn-primary' : 'btn-ghost')}
                    onClick={() => setTab(t.key)}>
              <Icon name={t.icon} size={14} /> {t.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {tab === 'general'     && <AdminGeneral db={db} setDb={setDb} />}
          {tab === 'machines'    && <AdminMachines db={db} setDb={setDb} nav={nav} />}
          {tab === 'technicians' && <AdminTechnicians db={db} setDb={setDb} />}
          {tab === 'pm'          && <AdminPM db={db} setDb={setDb} />}
          {tab === 'users'       && <AdminUsers db={db} setDb={setDb} />}
          {tab === 'sync'        && <AdminSync />}
        </div>
      </Card>
    </div>
  );
}

function AdminGeneral({ db, setDb }) {
  const [form, setForm] = React.useState(db.settings);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const save = () => {
    setDb(prev => ({ ...prev, settings: form }));
    window.Api.bulkPut('Settings', [form]).catch(()=>{});
    toast('success', 'บันทึกการตั้งค่าเรียบร้อย');
  };
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
      <Field label="ชื่อระบบ"><input className="input" value={form.systemName} onChange={e => set('systemName', e.target.value)} /></Field>
      <Field label="ชื่อบริษัท/โรงงาน"><input className="input" value={form.company} onChange={e => set('company', e.target.value)} /></Field>
      <Field label="ชื่อแผนก"><input className="input" value={form.department} onChange={e => set('department', e.target.value)} /></Field>
      <Field label="ผู้รับผิดชอบระบบ"><input className="input" value={form.owner} onChange={e => set('owner', e.target.value)} /></Field>
      <div style={{ gridColumn: '1/-1' }} className="flex justify-end">
        <button className="btn btn-primary" onClick={save}><Icon name="check" size={14} /> บันทึกข้อมูล</button>
      </div>
    </div>
  );
}

function AdminMachines({ db, setDb, nav }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="h2">จัดการเครื่องจักร</div>
        <div className="tag tag-info">{db.machines.length} เครื่อง</div>
        <div className="flex-1" />
        <button className="btn btn-ghost" onClick={() => nav('machines')}><Icon name="machine" size={14} /> ไปหน้ารายการเครื่องจักร</button>
      </div>
      <div style={{ color: 'var(--ink-dim)', fontSize: '0.9rem', lineHeight: 1.7 }}>
        จัดการเครื่องจักรทั้งเพิ่ม / แก้ไข / ลบ และดูประวัติได้ในหน้า <b>รายการเครื่องจักร</b><br/>
        ข้อมูลปัจจุบันถูก seed จากไฟล์ <code>Machine Profile.xlsx</code> ที่แนบมา ({db.machines.length} รายการ) — ปลอดภัยที่จะแก้ไข ระบบจะเก็บการเปลี่ยนแปลงไว้
      </div>
      <div className="grid gap-2 mt-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
        {AREAS.filter(a => db.machines.some(m => m.area === a)).map(a => (
          <div key={a} className="glass-soft rounded-2xl p-3 flex items-center gap-3">
            <AreaBadge area={a} />
            <div>
              <div className="font-bold num text-lg">{db.machines.filter(m => m.area === a).length}</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--ink-faint)' }}>เครื่อง</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPM({ db, setDb }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="h2">จัดการรายการ PM</div>
        <div className="tag tag-info">{db.pmPlans.length} รายการ</div>
        <div className="flex-1" />
      </div>
      <div style={{ color: 'var(--ink-dim)', fontSize: '0.9rem' }}>
        สำหรับเพิ่ม / แก้ไข / ลบ และบันทึกผลการ PM ใช้งานในหน้า <b>บำรุงรักษา (PM)</b>
      </div>
      <div className="tbl-wrap mt-3" style={{ maxHeight: 380 }}>
        <table className="tbl">
          <thead><tr><th>รหัส PM</th><th>เครื่องจักร</th><th>รายการตรวจ</th><th>ความถี่</th><th>PM ถัดไป</th><th>ผู้รับผิดชอบ</th></tr></thead>
          <tbody>
            {db.pmPlans.map(p => (
              <tr key={p.id}>
                <td className="num">{p.id}</td>
                <td>
                  <div className="font-semibold">{p.machineId}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--ink-faint)' }}>{p.machineName}</div>
                </td>
                <td>{p.item}</td>
                <td><span className="tag">{p.frequency}</span></td>
                <td className="num">{fmtDate(p.nextDate)}</td>
                <td>{p.assignee || '-'}</td>
              </tr>
            ))}
            {db.pmPlans.length === 0 && <tr><td colSpan={6}><Empty icon="calendar" title="ยังไม่มีรายการ PM" /></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminUsers({ db, setDb }) {
  const ROLES = ['Admin', 'Maintenance', 'User', 'Viewer'];

  const add = async () => {
    const r = await window.Swal.fire({
      title: 'เพิ่มผู้ใช้',
      html:
        '<input id="u-username" class="swal2-input" placeholder="Username"/>' +
        '<input id="u-name" class="swal2-input" placeholder="ชื่อ-สกุล"/>' +
        '<input id="u-password" type="password" class="swal2-input" placeholder="Password"/>' +
        '<select id="u-role" class="swal2-select">' + ROLES.map(r => `<option>${r}</option>`).join('') + '</select>',
      showCancelButton: true, confirmButtonText: 'เพิ่ม', cancelButtonText: 'ยกเลิก',
      focusConfirm: false,
      preConfirm: () => {
        const u = document.getElementById('u-username').value.trim();
        const n = document.getElementById('u-name').value.trim();
        const p = document.getElementById('u-password').value;
        const role = document.getElementById('u-role').value;
        if (!u || !n || !p) { window.Swal.showValidationMessage('กรอกข้อมูลให้ครบ'); return false; }
        if (db.users.some(x => x.username === u)) { window.Swal.showValidationMessage('Username นี้มีอยู่แล้ว'); return false; }
        return { username: u, name: n, password: p, role };
      }
    });
    if (r.isConfirmed) {
      setDb(prev => ({ ...prev, users: [...prev.users, r.value] }));
      toast('success', 'เพิ่มผู้ใช้สำเร็จ');
    }
  };

  const edit = async (u) => {
    const r = await window.Swal.fire({
      title: 'แก้ไขผู้ใช้',
      html:
        '<input id="u-name" class="swal2-input" placeholder="ชื่อ-สกุล" value="' + (u.name||'').replace(/"/g,'&quot;') + '"/>' +
        '<input id="u-password" type="password" class="swal2-input" placeholder="Password ใหม่ (ว่างไว้หากไม่เปลี่ยน)"/>' +
        '<select id="u-role" class="swal2-select">' + ROLES.map(x => `<option ${u.role===x?'selected':''}>${x}</option>`).join('') + '</select>',
      showCancelButton: true, confirmButtonText: 'บันทึก', cancelButtonText: 'ยกเลิก',
      focusConfirm: false,
      preConfirm: () => ({
        name: document.getElementById('u-name').value.trim(),
        password: document.getElementById('u-password').value || u.password,
        role: document.getElementById('u-role').value,
      }),
    });
    if (r.isConfirmed) {
      setDb(prev => ({ ...prev, users: prev.users.map(x => x.username === u.username ? { ...x, ...r.value } : x) }));
      toast('success', 'แก้ไขสำเร็จ');
    }
  };

  const remove = async (u) => {
    if (u.username === 'admin') { toast('warning', 'ห้ามลบบัญชี admin'); return; }
    if (!await confirmDialog('ลบผู้ใช้?', u.username + ' - ' + u.name, 'ลบ')) return;
    setDb(prev => ({ ...prev, users: prev.users.filter(x => x.username !== u.username) }));
    toast('success', 'ลบสำเร็จ');
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="h2">จัดการผู้ใช้งาน</div>
        <div className="tag tag-info">{db.users.length} ผู้ใช้</div>
        <div className="flex-1" />
        <button className="btn btn-primary" onClick={add}><Icon name="plus" size={14} /> เพิ่มผู้ใช้</button>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Username</th><th>ชื่อ-สกุล</th><th>สิทธิ์</th><th style={{ width: 130 }}></th></tr></thead>
          <tbody>
            {db.users.map(u => (
              <tr key={u.username}>
                <td className="font-semibold">{u.username}</td>
                <td>{u.name}</td>
                <td><span className="tag tag-info">{u.role}</span></td>
                <td>
                  <div className="flex gap-1 justify-end">
                    <button className="btn btn-ghost btn-sm" onClick={() => edit(u)}><Icon name="edit" size={13} /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => remove(u)}><Icon name="trash" size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminTechnicians({ db, setDb }) {
  const COMMON_SKILLS = ['ไฟฟ้า', 'เครื่องกล', 'PLC', 'ระบบลม', 'ระบบน้ำ', 'หม้อต้ม', 'อิเล็กทรอนิกส์', 'เซ็นเซอร์', 'ช่างเชื่อม', 'ไฮดรอลิก', 'รีทอร์ท', 'ระบบทำความเย็น'];
  const [q, setQ] = React.useState('');
  const [areaFilter, setAreaFilter] = React.useState('ALL');

  // Normalize skills/areas to arrays (handles legacy data)
  const techs = db.technicians.map(t => ({
    ...t,
    skills: Array.isArray(t.skills) ? t.skills : (t.skills ? String(t.skills).split(',').map(s => s.trim()).filter(Boolean) : []),
    areas:  Array.isArray(t.areas)  ? t.areas  : (t.areas  ? String(t.areas ).split(',').map(s => s.trim()).filter(Boolean) : []),
  }));

  const filtered = React.useMemo(() => {
    let list = techs;
    if (areaFilter !== 'ALL') list = list.filter(t => t.areas.includes(areaFilter));
    if (q.trim()) {
      const k = q.trim().toLowerCase();
      list = list.filter(t =>
        (t.name || '').toLowerCase().includes(k) ||
        (t.phone || '').toLowerCase().includes(k) ||
        t.skills.some(s => s.toLowerCase().includes(k)) ||
        t.areas.some(a => a.toLowerCase().includes(k)));
    }
    return list;
  }, [techs, q, areaFilter]);

  const openEditor = async (existing) => {
    const skillsHtml = COMMON_SKILLS.map(s => {
      const checked = existing?.skills?.includes(s) ? 'checked' : '';
      return `<label class="chip"><input type="checkbox" value="${s}" ${checked}/><span>${s}</span></label>`;
    }).join('');
    const areasHtml = AREAS.map(a => {
      const checked = existing?.areas?.includes(a) ? 'checked' : '';
      return `<label class="chip"><input type="checkbox" value="${a}" ${checked}/><span>${a}</span></label>`;
    }).join('');
    const r = await window.Swal.fire({
      title: existing ? 'แก้ไขช่างซ่อมบำรุง' : 'เพิ่มช่างซ่อมบำรุง',
      width: 640,
      html: `
        <div style="text-align:left;display:grid;grid-template-columns:1fr 1fr;gap:.6rem">
          <div><label class="swl-l">ชื่อ-สกุล *</label>
            <input id="tx-name" class="swal2-input" value="${(existing?.name ?? '').replace(/"/g,'&quot;')}"/></div>
          <div><label class="swl-l">เบอร์โทร</label>
            <input id="tx-phone" class="swal2-input" value="${(existing?.phone ?? '').replace(/"/g,'&quot;')}"/></div>
          <div style="grid-column:1/-1">
            <label class="swl-l">ความถนัด <span style="color:var(--ink-faint);font-weight:500">(เลือกได้หลายอย่าง)</span></label>
            <div class="chips">${skillsHtml}</div>
            <input id="tx-skill-extra" class="swal2-input" placeholder="เพิ่มความถนัดอื่น (คั่นด้วยจุลภาค)"
                   value="${(existing?.skills || []).filter(s => !COMMON_SKILLS.includes(s)).join(', ').replace(/"/g,'&quot;')}"/>
          </div>
          <div style="grid-column:1/-1">
            <label class="swl-l">พื้นที่รับผิดชอบ</label>
            <div class="chips">${areasHtml}</div>
          </div>
        </div>
        <style>
          .swl-l{display:block;font-size:.74rem;color:var(--ink-faint);margin:.4rem 0 .25rem .15rem;font-weight:600}
          .swal2-input,.swal2-select,.swal2-textarea{margin:.1rem 0!important;width:100%!important;max-width:100%!important;}
          .chips{display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.4rem}
          .chip{display:inline-flex;align-items:center;gap:.35rem;cursor:pointer;
                padding:.32rem .65rem;border-radius:999px;
                background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.14);
                color:var(--ink-dim);font-size:.82rem;font-weight:500;transition:all .15s}
          .chip:hover{border-color:rgba(56,224,255,0.5);color:#fff}
          .chip input{accent-color:#38e0ff;cursor:pointer}
          .chip:has(input:checked){background:linear-gradient(135deg,rgba(56,224,255,0.25),rgba(108,140,255,0.25));
                                   border-color:rgba(56,224,255,0.55);color:#fff}
        </style>`,
      showCancelButton: true,
      confirmButtonText: existing ? 'บันทึก' : 'เพิ่ม',
      cancelButtonText: 'ยกเลิก',
      focusConfirm: false,
      preConfirm: () => {
        const name = document.getElementById('tx-name').value.trim();
        if (!name) { window.Swal.showValidationMessage('กรุณากรอกชื่อ'); return false; }
        const phone = document.getElementById('tx-phone').value.trim();
        const chips = document.querySelectorAll('.swal2-popup .chip input[type="checkbox"]');
        const selected = { skills: [], areas: [] };
        // first half are skills (COMMON_SKILLS.length), then areas
        chips.forEach((c, i) => {
          const isSkill = i < COMMON_SKILLS.length;
          if (c.checked) (isSkill ? selected.skills : selected.areas).push(c.value);
        });
        const extra = document.getElementById('tx-skill-extra').value.split(',').map(s => s.trim()).filter(Boolean);
        selected.skills = [...selected.skills, ...extra];
        return { name, phone, ...selected };
      },
    });
    if (!r.isConfirmed) return;
    setDb(prev => {
      let technicians;
      if (existing) technicians = prev.technicians.map(t => t.id === existing.id ? { ...t, ...r.value } : t);
      else technicians = [...prev.technicians, { id: 't' + Date.now(), ...r.value }];
      return { ...prev, technicians };
    });
    toast('success', existing ? 'แก้ไขช่างเรียบร้อย' : 'เพิ่มช่างเรียบร้อย');
  };

  const remove = async (t) => {
    if (!await confirmDialog('ลบช่างซ่อมบำรุง?', t.name, 'ลบ')) return;
    setDb(prev => ({ ...prev, technicians: prev.technicians.filter(x => x.id !== t.id) }));
    toast('success', 'ลบเรียบร้อย');
  };

  // workload: how many active requests assigned to each
  const workload = React.useMemo(() => {
    const w = {};
    for (const r of db.repairRequests) {
      if (r.status === 'ซ่อมเสร็จ' || r.status === 'ยกเลิก') continue;
      if (r.assignee) w[r.assignee] = (w[r.assignee] || 0) + 1;
    }
    return w;
  }, [db.repairRequests]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="h2">ช่างซ่อมบำรุง</div>
        <div className="tag tag-info">{techs.length} คน</div>
        <div className="flex-1" />
        <div style={{ minWidth: 200, flex: '1 1 180px', maxWidth: 300 }}>
          <SearchInput value={q} onChange={setQ} placeholder="ค้นหาชื่อ, ความถนัด, พื้นที่..." />
        </div>
        <select className="select" style={{ maxWidth: 180 }}
                value={areaFilter} onChange={e => setAreaFilter(e.target.value)}>
          <option value="ALL">ทุกพื้นที่</option>
          {AREAS.map(a => <option key={a}>{a}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => openEditor(null)}>
          <Icon name="plus" size={14} /> เพิ่มช่าง
        </button>
      </div>

      {filtered.length === 0 ? (
        <Empty icon="user" title="ไม่พบช่างซ่อมบำรุง" sub="กดปุ่ม 'เพิ่มช่าง' เพื่อเพิ่มข้อมูล" />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {filtered.map(t => {
            const load = workload[t.name] || 0;
            return (
              <div key={t.id} className="glass-soft rounded-2xl p-4 flex flex-col gap-3 transition-all"
                   style={{ borderColor: load > 0 ? 'rgba(56,224,255,0.35)' : '' }}>
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl flex items-center justify-center"
                       style={{
                         width: 48, height: 48, flex: 'none',
                         background: 'linear-gradient(135deg, rgba(108,140,255,0.3), rgba(56,224,255,0.3))',
                         border: '1px solid rgba(108,140,255,0.4)',
                         fontWeight: 800, fontSize: '1.1rem', color: '#fff',
                       }}>
                    {t.name.replace(/^(นาย|นาง|นางสาว|น\.ส\.|ดร\.)\s*/, '').charAt(0) || 'T'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate" style={{ fontSize: '1rem' }}>{t.name}</div>
                    <div className="flex items-center gap-1 mt-0.5" style={{ fontSize: '0.8rem', color: 'var(--ink-faint)' }}>
                      📞 {t.phone || '—'}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button className="btn btn-ghost btn-sm" title="แก้ไข" onClick={() => openEditor(t)}>
                      <Icon name="edit" size={13} />
                    </button>
                    <button className="btn btn-ghost btn-sm" title="ลบ" onClick={() => remove(t)}>
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--ink-faint)', fontWeight: 600, marginBottom: 4 }}>
                    ความถนัด
                  </div>
                  {t.skills.length === 0 ? <span style={{ color: 'var(--ink-faint)', fontSize: '0.82rem' }}>—</span> : (
                    <div className="flex flex-wrap gap-1">
                      {t.skills.map(s => (
                        <span key={s} className="tag" style={{
                          background: 'rgba(56,224,255,0.14)', borderColor: 'rgba(56,224,255,0.35)',
                          color: '#a8e8ff', padding: '0.18rem 0.55rem', fontSize: '0.72rem',
                        }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--ink-faint)', fontWeight: 600, marginBottom: 4 }}>
                    พื้นที่รับผิดชอบ
                  </div>
                  {t.areas.length === 0 ? <span style={{ color: 'var(--ink-faint)', fontSize: '0.82rem' }}>ทุกพื้นที่</span> : (
                    <div className="flex flex-wrap gap-1">
                      {t.areas.map(a => <AreaBadge key={a} area={a} />)}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 mt-auto"
                     style={{ borderTop: '1px solid var(--line)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--ink-faint)' }}>งานที่ค้างอยู่</span>
                  <span className={'tag tag-' + (load > 3 ? 'bad' : load > 0 ? 'warn' : 'good')}>
                    {load} งาน
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminSync() {
  const [endpoint, setEndpoint] = React.useState(window.Api.endpoint);
  const [sheetId, setSheetId] = React.useState(window.Api.sheetId);
  const [testing, setTesting] = React.useState(false);
  const [showScript, setShowScript] = React.useState(false);

  const save = () => {
    window.Api.setEndpoint(endpoint);
    window.Api.setSheetId(sheetId);
    toast('success', 'บันทึกการตั้งค่าการเชื่อมต่อแล้ว');
  };
  const test = async () => {
    setTesting(true);
    const r = await window.Api.ping();
    setTesting(false);
    if (r.ok) window.Swal.fire({ icon: 'success', title: 'เชื่อมต่อสำเร็จ', text: 'Google Sheet พร้อมใช้งาน' });
    else window.Swal.fire({ icon: 'warning', title: 'เชื่อมต่อไม่สำเร็จ', text: r.error || 'unknown error' });
  };

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
      <Field label="Apps Script Web App URL">
        <input className="input" value={endpoint} onChange={e => setEndpoint(e.target.value)} />
      </Field>
      <Field label="Google Sheet ID">
        <input className="input" value={sheetId} onChange={e => setSheetId(e.target.value)} />
      </Field>
      <div style={{ gridColumn: '1/-1' }} className="flex gap-2 flex-wrap">
        <button className="btn btn-primary" onClick={save}><Icon name="check" size={14} /> บันทึก</button>
        <button className="btn btn-good" onClick={test} disabled={testing}>
          {testing ? '...' : <><Icon name="link" size={14} /> ทดสอบเชื่อมต่อ</>}
        </button>
        <button className="btn btn-ghost" onClick={() => setShowScript(s => !s)}>
          <Icon name="file" size={14} /> {showScript ? 'ซ่อน' : 'แสดง'} Apps Script (Code.gs)
        </button>
      </div>
      <div style={{ gridColumn: '1/-1', fontSize: '0.88rem', color: 'var(--ink-dim)', lineHeight: 1.7 }} className="glass-soft rounded-2xl p-4">
        <b>คำแนะนำติดตั้ง Apps Script:</b>
        <ol style={{ paddingLeft: 20, marginTop: 6 }}>
          <li>ไปที่ Google Sheet → Extensions → Apps Script</li>
          <li>วางโค้ดด้านล่างนี้ (ปุ่ม "แสดง") แทนที่ทั้งหมด แล้ว Save</li>
          <li>คลิก Deploy → New deployment → Type: <b>Web app</b></li>
          <li>Execute as: <b>Me</b> / Who has access: <b>Anyone</b> → Deploy</li>
          <li>คัดลอก Web app URL มาวางในช่องด้านบน</li>
        </ol>
      </div>
      {showScript && (
        <pre style={{
          gridColumn: '1/-1',
          maxHeight: 360, overflow: 'auto',
          background: 'rgba(0,0,0,0.4)', border: '1px solid var(--line)',
          padding: 16, borderRadius: 16, fontSize: 12, fontFamily: 'ui-monospace, monospace',
          color: '#cfe5ff', whiteSpace: 'pre',
        }}>{APPS_SCRIPT_CODE}</pre>
      )}
    </div>
  );
}

const APPS_SCRIPT_CODE = `// Maintenance IFS — Google Apps Script backend
// Deploy as Web app: Execute as Me, Anyone access.
const SHEETS = ['Settings','Machines','RepairRequests','RepairHistory','PMPlan','PMRecords','Users','Summary'];
const ROOT_FOLDER = 'MaintenanceIFS';  // Drive folder for uploaded images

function doGet(e) {
  const p = e.parameter || {};
  const action = p.action || 'ping';
  try {
    ensureSheets(p.sheetId);
    if (action === 'ping') return out({ ok:true, ts: new Date().toISOString() });
    if (action === 'init') return out({ ok:true, data: readAll(p.sheetId) });
    if (action === 'list') return out({ ok:true, data: readSheet(p.sheetId, p.sheet) });
    return out({ ok:false, error:'unknown action' });
  } catch (err) {
    return out({ ok:false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    ensureSheets(body.sheetId);
    const a = body.action;
    if (a === 'append')      return out({ ok:true, data: appendRow(body.sheetId, body.payload.sheet, body.payload.row) });
    if (a === 'update')      return out({ ok:true, data: updateRow(body.sheetId, body.payload.sheet, body.payload.key, body.payload.keyField, body.payload.row) });
    if (a === 'remove')      return out({ ok:true, data: removeRow(body.sheetId, body.payload.sheet, body.payload.key, body.payload.keyField) });
    if (a === 'bulkPut')     return out({ ok:true, data: bulkPut(body.sheetId, body.payload.sheet, body.payload.rows) });
    if (a === 'uploadImage') return out(uploadImage(body.payload));
    return out({ ok:false, error:'unknown action' });
  } catch (err) {
    return out({ ok:false, error: String(err) });
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ss(id) { return SpreadsheetApp.openById(id); }

function ensureSheets(id) {
  const s = ss(id);
  SHEETS.forEach(name => { if (!s.getSheetByName(name)) s.insertSheet(name); });
}

function readSheet(id, name) {
  const sh = ss(id).getSheetByName(name);
  if (!sh) return [];
  const v = sh.getDataRange().getValues();
  if (v.length < 2) return [];
  const head = v[0];
  return v.slice(1).map(r => Object.fromEntries(head.map((h,i)=>[h, r[i]])));
}

function readAll(id) {
  const out = {};
  SHEETS.forEach(n => out[n] = readSheet(id, n));
  return out;
}

function appendRow(id, name, row) {
  const sh = ss(id).getSheetByName(name);
  const head = sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0];
  if (head.length === 0 || head[0] === '') {
    const keys = Object.keys(row);
    sh.getRange(1,1,1,keys.length).setValues([keys]);
    sh.appendRow(keys.map(k => row[k] ?? ''));
  } else {
    sh.appendRow(head.map(h => row[h] ?? ''));
  }
  return true;
}

function bulkPut(id, name, rows) {
  if (!rows || !rows.length) return true;
  const sh = ss(id).getSheetByName(name);
  sh.clear();
  const keys = Object.keys(rows[0]);
  sh.getRange(1,1,1,keys.length).setValues([keys]);
  sh.getRange(2,1,rows.length,keys.length).setValues(rows.map(r => keys.map(k => r[k] ?? '')));
  return true;
}

function updateRow(id, name, key, keyField, patch) {
  const sh = ss(id).getSheetByName(name);
  const v = sh.getDataRange().getValues();
  const head = v[0]; const col = head.indexOf(keyField);
  if (col < 0) throw 'unknown keyField';
  for (let i=1;i<v.length;i++) {
    if (String(v[i][col]) === String(key)) {
      Object.keys(patch).forEach(k => {
        const c = head.indexOf(k); if (c >= 0) sh.getRange(i+1, c+1).setValue(patch[k]);
      });
      return true;
    }
  }
  return false;
}

function removeRow(id, name, key, keyField) {
  const sh = ss(id).getSheetByName(name);
  const v = sh.getDataRange().getValues();
  const head = v[0]; const col = head.indexOf(keyField);
  for (let i=1;i<v.length;i++) {
    if (String(v[i][col]) === String(key)) { sh.deleteRow(i+1); return true; }
  }
  return false;
}

/* ---------- Image upload ---------- */
// Decodes a data: URL, writes to Drive folder, returns a public view URL.
function uploadImage(payload) {
  const dataUrl = payload.dataUrl || '';
  const name = payload.name || ('img-' + Date.now() + '.jpg');
  const subfolder = payload.folder || 'misc';
  const m = dataUrl.match(/^data:(image\\/[a-zA-Z+]+);base64,(.+)$/);
  if (!m) return { ok:false, error:'bad dataUrl' };
  const mime = m[1];
  const bytes = Utilities.base64Decode(m[2]);
  const blob = Utilities.newBlob(bytes, mime, name);
  const folder = ensureFolder(subfolder);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { ok:true, url: 'https://drive.google.com/uc?export=view&id=' + file.getId(), id: file.getId() };
}

// Ensures /MaintenanceIFS/<subfolder>/ exists; returns the leaf folder.
function ensureFolder(subPath) {
  const parts = (ROOT_FOLDER + '/' + (subPath || '')).split('/').filter(Boolean);
  let parent = DriveApp.getRootFolder();
  for (const name of parts) {
    const it = parent.getFoldersByName(name);
    parent = it.hasNext() ? it.next() : parent.createFolder(name);
  }
  return parent;
}
`;

window.PageAdmin = PageAdmin;
