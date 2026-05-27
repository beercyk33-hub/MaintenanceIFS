// Google Apps Script connector
// SHEET_ID provided by user; calls go through Apps Script Web App URL.
(function () {
  const DEFAULT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxx1nMEpFZ65wcmdEhMGoplDEiw-QQ5hPoBapIC-CBxFtUDitkLS61t3P658wW_wramRw/exec';
  const DEFAULT_SHEET_ID = '1A5br7pAUksgVuoKWLB4TyKS3kRHZ8iZ8FrFGmy7FAcE';

  const Api = {
    endpoint: localStorage.getItem('mifs.endpoint') || DEFAULT_ENDPOINT,
    sheetId:  localStorage.getItem('mifs.sheetId')  || DEFAULT_SHEET_ID,

    setEndpoint(url) {
      this.endpoint = url;
      localStorage.setItem('mifs.endpoint', url);
    },
    setSheetId(id) {
      this.sheetId = id;
      localStorage.setItem('mifs.sheetId', id);
    },

    // Build a JSONP-style request URL with a callback name.
    // Apps Script doGet that returns ContentService.createTextOutput(JSON.stringify(...))
    // with .setMimeType(JSON) works via fetch *if* CORS is permitted (it is for /macros/s/.../exec).
    // We use fetch first; on failure (CORS or net) we fall back to JSONP <script> injection
    // which only works if the doGet has been adapted to support callback. As a final fallback
    // we return a deterministic error so the UI can show offline mode.
    async _get(params) {
      const qs = new URLSearchParams({ sheetId: this.sheetId, ...params }).toString();
      const url = this.endpoint + '?' + qs;
      try {
        const res = await fetch(url, { method: 'GET', redirect: 'follow' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const text = await res.text();
        try { return JSON.parse(text); }
        catch { return { ok: true, raw: text }; }
      } catch (e) {
        return { ok: false, error: String(e && e.message || e) };
      }
    },

    async _post(action, payload) {
      const url = this.endpoint;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // text/plain avoids preflight
          body: JSON.stringify({ sheetId: this.sheetId, action, payload }),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const text = await res.text();
        try { return JSON.parse(text); }
        catch { return { ok: true, raw: text }; }
      } catch (e) {
        return { ok: false, error: String(e && e.message || e) };
      }
    },

    ping() { return this._get({ action: 'ping' }); },
    init() { return this._get({ action: 'init' }); },
    list(sheet) { return this._get({ action: 'list', sheet }); },
    append(sheet, row) { return this._post('append', { sheet, row }); },
    update(sheet, key, keyField, row) { return this._post('update', { sheet, key, keyField, row }); },
    remove(sheet, key, keyField) { return this._post('remove', { sheet, key, keyField }); },
    bulkPut(sheet, rows) { return this._post('bulkPut', { sheet, rows }); },

    // Upload a single image (data URL). Returns { ok, url } from Apps Script.
    // The Apps Script writes the image to a Drive folder and returns a viewable URL.
    async uploadImage({ dataUrl, name, folder }) {
      return this._post('uploadImage', { dataUrl, name, folder });
    },

    // Convenience: upload an array of photo objects ({ id, name, dataUrl }), returns array with url filled in.
    // Failed uploads keep their dataUrl so the UI still works.
    async uploadPhotos(photos, folder) {
      if (!photos || !photos.length) return [];
      const out = [];
      for (const p of photos) {
        if (p.url) { out.push(p); continue; }
        if (!p.dataUrl) { out.push(p); continue; }
        const r = await this.uploadImage({ dataUrl: p.dataUrl, name: p.name || (p.id + '.jpg'), folder });
        if (r && r.ok && r.url) {
          out.push({ id: p.id, name: p.name, url: r.url });
        } else {
          // keep base64 fallback
          out.push(p);
        }
      }
      return out;
    },
  };

  window.Api = Api;
})();

// Local storage backed datastore. Acts as the source of truth in the browser.
// The cloud sync (Api.*) is a write-through layer; data stays usable offline.
(function () {
  const KEY = 'mifs.db.v1';

  function defaultDb() {
    const machines = (window.MACHINES_SEED || []).map(m => ({
      id: m.id,
      name: m.name,
      area: m.area,
      location: m.location || '',
      vendor: m.vendor || '',
      year: m.year || '',
      brand: '',
      serial: '',
      installDate: m.year ? (parseInt(m.year) > 2400 ? (parseInt(m.year) - 543) + '-01-01' : m.year + '-01-01') : '',
      status: 'ใช้งานปกติ',
      note: m.note || '',
    }));
    return {
      settings: {
        systemName: 'Maintenance IFS',
        company: 'บริษัท ไอเอฟเอส แมนูแฟคเจอริ่ง จำกัด',
        department: 'ฝ่ายซ่อมบำรุง',
        owner: 'Narongsak C.',
      },
      machines,
      repairRequests: seedRepairs(machines),
      repairHistory: [],
      pmPlans: seedPm(machines),
      pmRecords: [],
      users: [
        { username: 'admin', password: '1234', name: 'Administrator', role: 'Admin' },
        { username: 'maint', password: '1234', name: 'ช่างซ่อมบำรุง', role: 'Maintenance' },
      ],
      technicians: [
        { id: 't1', name: 'นายสมชาย ใจดี',     phone: '081-111-1111', skills: ['ไฟฟ้า', 'PLC'],           areas: ['PRP', 'PRC'] },
        { id: 't2', name: 'นายประยุทธ ช่างเก่ง', phone: '081-222-2222', skills: ['เครื่องกล', 'ระบบลม'],     areas: ['PRB', 'UHT'] },
        { id: 't3', name: 'นายวินัย รักงาน',    phone: '081-333-3333', skills: ['ระบบน้ำ', 'หม้อต้ม'],      areas: ['Eng', 'Env'] },
        { id: 't4', name: 'นายธนา สู้งาน',      phone: '081-444-4444', skills: ['อิเล็กทรอนิกส์', 'เซ็นเซอร์'], areas: ['QC', 'WH'] },
      ],
    };
  }

  function seedRepairs(machines) {
    if (!machines.length) return [];
    const pick = (i) => machines[i % machines.length];
    const today = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);
    const ago = (days) => { const d = new Date(today); d.setDate(d.getDate() - days); return fmt(d); };
    const symptoms = [
      'มอเตอร์ส่งเสียงดังผิดปกติ',
      'น้ำมันรั่วจากซีล',
      'สายพานหย่อน',
      'ไฟไม่เข้าตู้คอนโทรล',
      'อุณหภูมิขึ้นไม่ถึงค่าที่ตั้ง',
      'เซ็นเซอร์จับชิ้นงานไม่ทำงาน',
      'PLC แสดง Error E-12',
      'ปั๊มน้ำเปิดแล้วไม่หมุน',
    ];
    const urgencies = ['ต่ำ', 'ปานกลาง', 'สูง', 'ฉุกเฉิน'];
    const statuses = ['รอรับงาน', 'กำลังดำเนินการ', 'รออะไหล่', 'ซ่อมเสร็จ', 'ซ่อมเสร็จ'];
    const reporters = ['คุณสมศักดิ์', 'คุณวิภา', 'คุณธีรพงษ์', 'คุณกุลธิดา', 'คุณเอกชัย'];
    return Array.from({ length: 16 }, (_, i) => {
      const m = pick(i * 7 + 3);
      return {
        id: 'RR-' + String(1000 + i),
        date: ago(i * 2),
        time: ['08:30', '10:15', '13:45', '15:20'][i % 4],
        machineId: m.id,
        machineName: m.name,
        area: m.area,
        reporter: reporters[i % reporters.length],
        symptom: symptoms[i % symptoms.length],
        urgency: urgencies[i % urgencies.length],
        status: statuses[i % statuses.length],
        assignee: ['นายสมชาย ใจดี','นายประยุทธ ช่างเก่ง','นายวินัย รักงาน','นายธนา สู้งาน'][i % 4],
        note: '',
      };
    });
  }

  function seedPm(machines) {
    if (!machines.length) return [];
    const today = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);
    const shift = (d, days) => { const x = new Date(d); x.setDate(x.getDate() + days); return x; };
    const freqs = ['รายเดือน', 'ราย 3 เดือน', 'ราย 6 เดือน', 'รายปี', 'รายสัปดาห์'];
    const days  = { 'รายวัน': 1, 'รายสัปดาห์': 7, 'รายเดือน': 30, 'ราย 3 เดือน': 90, 'ราย 6 เดือน': 180, 'รายปี': 365 };
    const items = [
      'ตรวจเช็คน้ำมันหล่อลื่น',
      'ทำความสะอาดและตรวจสายพาน',
      'เช็คไส้กรอง',
      'ตรวจเซ็นเซอร์ + คาลิเบรต',
      'อัดจารบีตลับลูกปืน',
      'ทดสอบระบบเซฟตี้',
    ];
    return machines.slice(0, 40).map((m, i) => {
      const freq = freqs[i % freqs.length];
      const last = shift(today, -days[freq] + (i % 7));
      const next = shift(last, days[freq]);
      return {
        id: 'PM-' + String(2000 + i),
        machineId: m.id,
        machineName: m.name,
        item: items[i % items.length],
        frequency: freq,
        lastDate: fmt(last),
        nextDate: fmt(next),
        assignee: ['นายสมชาย ใจดี','นายประยุทธ ช่างเก่ง','นายวินัย รักงาน','นายธนา สู้งาน'][i % 4],
        status: 'รอตรวจสอบ',
      };
    });
  }

  const DB = {
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) {
          const d = defaultDb();
          localStorage.setItem(KEY, JSON.stringify(d));
          return d;
        }
        return JSON.parse(raw);
      } catch (e) {
        const d = defaultDb();
        localStorage.setItem(KEY, JSON.stringify(d));
        return d;
      }
    },
    save(db) { localStorage.setItem(KEY, JSON.stringify(db)); },
    reset() { localStorage.removeItem(KEY); return this.load(); },
  };

  window.DB = DB;
})();
