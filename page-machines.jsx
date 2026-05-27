// Machines page (รายการเครื่องจักร, จัดกลุ่มตามพื้นที่)
function PageMachines({ db, setDb, nav }) {
  const [tab, setTab] = React.useState('ALL');
  const [q, setQ] = React.useState('');

  const tabs = React.useMemo(() => {
    const set = new Set(db.machines.map(m => m.area));
    return ['ALL', ...AREAS.filter(a => set.has(a)), ...[...set].filter(a => !AREAS.includes(a))];
  }, [db.machines]);

  const filtered = React.useMemo(() => {
    let list = db.machines;
    if (tab !== 'ALL') list = list.filter(m => m.area === tab);
    if (q.trim()) {
      const k = q.trim().toLowerCase();
      list = list.filter(m =>
        (m.id || '').toLowerCase().includes(k) ||
        (m.name || '').toLowerCase().includes(k) ||
        (m.location || '').toLowerCase().includes(k) ||
        (m.vendor || '').toLowerCase().includes(k));
    }
    return list;
  }, [db.machines, tab, q]);

  const addMachine = () => editMachine(null);
  const editMachine = async (existing) => {
    const html = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;text-align:left">
        <div><label class="swl-l">รหัสเครื่องจักร *</label><input id="m-id" class="swal2-input" value="${existing?.id ?? ''}" ${existing?'disabled':''}/></div>
        <div><label class="swl-l">ชื่อเครื่องจักร *</label><input id="m-name" class="swal2-input" value="${(existing?.name ?? '').replace(/"/g,'&quot;')}"/></div>
        <div><label class="swl-l">พื้นที่ติดตั้ง *</label>
          <select id="m-area" class="swal2-select">${AREAS.map(a => `<option value="${a}" ${existing?.area===a?'selected':''}>${a}</option>`).join('')}</select>
        </div>
        <div><label class="swl-l">สถานที่</label><input id="m-loc" class="swal2-input" value="${(existing?.location ?? '').replace(/"/g,'&quot;')}"/></div>
        <div><label class="swl-l">ยี่ห้อ/รุ่น</label><input id="m-brand" class="swal2-input" value="${(existing?.brand ?? '').replace(/"/g,'&quot;')}"/></div>
        <div><label class="swl-l">Serial Number</label><input id="m-serial" class="swal2-input" value="${(existing?.serial ?? '').replace(/"/g,'&quot;')}"/></div>
        <div><label class="swl-l">บริษัทผู้ขาย</label><input id="m-vendor" class="swal2-input" value="${(existing?.vendor ?? '').replace(/"/g,'&quot;')}"/></div>
        <div><label class="swl-l">วันที่ติดตั้ง</label><input id="m-install" type="date" class="swal2-input" value="${existing?.installDate ?? ''}"/></div>
        <div><label class="swl-l">สถานะ</label>
          <select id="m-status" class="swal2-select">
            ${['ใช้งานปกติ','ต้องติดตาม','ต้องหยุดเครื่อง','ปลดระวาง'].map(s => `<option ${existing?.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div style="grid-column:1/-1"><label class="swl-l">หมายเหตุ</label><textarea id="m-note" class="swal2-textarea" style="min-height:60px">${(existing?.note ?? '')}</textarea></div>
      </div>
      <style>.swl-l{display:block;font-size:.74rem;color:var(--ink-faint);margin:.2rem 0 .2rem .25rem;font-weight:600}
      .swal2-input,.swal2-select,.swal2-textarea{margin:.15rem 0!important;width:100%!important;max-width:100%!important;}</style>`;
    const r = await window.Swal.fire({
      title: existing ? 'แก้ไขเครื่องจักร' : 'เพิ่มเครื่องจักรใหม่',
      html, width: 700,
      showCancelButton: true,
      confirmButtonText: existing ? 'บันทึก' : 'เพิ่ม',
      cancelButtonText: 'ยกเลิก',
      focusConfirm: false,
      preConfirm: () => {
        const id = document.getElementById('m-id').value.trim();
        const name = document.getElementById('m-name').value.trim();
        if (!id || !name) { window.Swal.showValidationMessage('กรุณากรอกรหัสและชื่อเครื่องจักร'); return false; }
        if (!existing && db.machines.some(m => m.id === id)) {
          window.Swal.showValidationMessage('รหัสนี้มีอยู่แล้ว');
          return false;
        }
        return {
          id, name,
          area: document.getElementById('m-area').value,
          location: document.getElementById('m-loc').value.trim(),
          brand: document.getElementById('m-brand').value.trim(),
          serial: document.getElementById('m-serial').value.trim(),
          vendor: document.getElementById('m-vendor').value.trim(),
          installDate: document.getElementById('m-install').value,
          status: document.getElementById('m-status').value,
          note: document.getElementById('m-note').value.trim(),
        };
      }
    });
    if (!r.isConfirmed) return;
    setDb(prev => {
      let machines;
      if (existing) machines = prev.machines.map(m => m.id === existing.id ? { ...m, ...r.value } : m);
      else machines = [...prev.machines, { ...r.value, year: '' }];
      return { ...prev, machines };
    });
    toast('success', existing ? 'แก้ไขข้อมูลเรียบร้อย' : 'เพิ่มเครื่องจักรเรียบร้อย');
  };

  const removeMachine = async (m) => {
    if (!await confirmDialog('ลบเครื่องจักร?', m.id + ' - ' + m.name, 'ลบ')) return;
    setDb(prev => ({ ...prev, machines: prev.machines.filter(x => x.id !== m.id) }));
    toast('success', 'ลบเรียบร้อย');
  };

  return (
    <div className="flex flex-col gap-4">
      <Card padding={false}>
        <div className="p-5 flex flex-wrap items-center gap-3">
          <div className="h1 flex items-center gap-2"><Icon name="machine" size={22} /> รายการเครื่องจักร</div>
          <div className="tag tag-info">{db.machines.length} เครื่อง</div>
          <div className="flex-1" />
          <div style={{ minWidth: 260, flex: '1 1 220px', maxWidth: 360 }}>
            <SearchInput value={q} onChange={setQ} placeholder="ค้นหารหัส, ชื่อ, สถานที่..." />
          </div>
          <button className="btn btn-primary" onClick={addMachine}><Icon name="plus" size={14} /> เพิ่มเครื่องจักร</button>
        </div>

        <div className="px-5 pb-3 flex gap-2 flex-wrap" style={{ borderBottom: '1px solid var(--line)' }}>
          {tabs.map(t => {
            const n = t === 'ALL' ? db.machines.length : db.machines.filter(m => m.area === t).length;
            const active = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)}
                      className={'btn btn-sm ' + (active ? 'btn-primary' : 'btn-ghost')}
                      style={{ paddingTop: '0.4rem', paddingBottom: '0.4rem' }}>
                {t === 'ALL' ? 'ทั้งหมด' : t} <span style={{ opacity: 0.7 }}>· {n}</span>
              </button>
            );
          })}
        </div>

        <div className="tbl-wrap" style={{ maxHeight: 560 }}>
          <table className="tbl">
            <thead><tr>
              <th style={{ width: 50 }}>#</th>
              <th>รหัส</th>
              <th>ชื่อเครื่องจักร</th>
              <th>สถานที่ใช้งาน</th>
              <th>พื้นที่</th>
              <th>บริษัทผู้ขาย</th>
              <th style={{ width: 90 }}>ปี</th>
              <th style={{ width: 130 }}>สถานะ</th>
              <th style={{ width: 110 }}></th>
            </tr></thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.id}>
                  <td className="num" style={{ color: 'var(--ink-faint)' }}>{i + 1}</td>
                  <td className="font-semibold">{m.id}</td>
                  <td>{m.name}</td>
                  <td style={{ color: 'var(--ink-dim)' }}>{m.location || '-'}</td>
                  <td><AreaBadge area={m.area} /></td>
                  <td style={{ color: 'var(--ink-dim)' }}>{m.vendor || '-'}</td>
                  <td className="num">{m.year || '-'}</td>
                  <td><StatusTag value={m.status || 'ใช้งานปกติ'} /></td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button className="btn btn-ghost btn-sm" title="ดูประวัติ" onClick={() => { nav('history'); localStorage.setItem('mifs.history.focus', m.id); }}>
                        <Icon name="eye" size={13} />
                      </button>
                      <button className="btn btn-ghost btn-sm" title="แก้ไข" onClick={() => editMachine(m)}>
                        <Icon name="edit" size={13} />
                      </button>
                      <button className="btn btn-ghost btn-sm" title="ลบ" onClick={() => removeMachine(m)}>
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9}><Empty title="ไม่พบเครื่องจักร" sub="ลองเปลี่ยนตัวกรองหรือคำค้นหา" /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
window.PageMachines = PageMachines;
