// Shared IoT MQTT manager — one connection, many subscribers.
// Pages call window.useIoT() to read live sensor values without each opening its
// own broker connection. window.IoTManager.setSensors() is used by the IoT
// config page to persist changes; the manager reconnects/resubscribes as needed.

(function () {
  const BROKER = {
    host: 'conn.thaiiiot.com',
    port: 9001,
    path: '/mqtt',
    userName: 'iiotkub',
    password: 'iiotkub',
  };
  const STORAGE_KEY = 'mifs.iot.sensors.v4';

  const PLC_COLD_TOPIC   = 'PLC_CENTER/VIEW/bmRrWXdRT3JRQXRSZ3FCSmlGVHVGUT09/PLC/0';
  const PLC_FREEZE_TOPIC = 'PLC_CENTER/VIEW/bmRrWXdRT3JRQXRSZ3FCSmlGVHVGXXXX/PLC/0';

  const DEFAULT_SENSORS = [
    { id: 'cr-a',  name: 'ห้องเย็น A',     topic: PLC_COLD_TOPIC,   field: 'D5',  divisor: 10, unit: '°C', lo: 0,   hi: 8   },
    { id: 'cr-b1', name: 'ห้องเย็น B1',    topic: PLC_COLD_TOPIC,   field: 'D10', divisor: 10, unit: '°C', lo: 0,   hi: 8   },
    { id: 'cr-b2', name: 'ห้องเย็น B2',    topic: PLC_COLD_TOPIC,   field: 'D15', divisor: 10, unit: '°C', lo: 0,   hi: 8   },
    { id: 'fz-1',  name: 'ตู้แช่แข็ง No.1', topic: PLC_FREEZE_TOPIC, field: 'D10', divisor: 10, unit: '°C', lo: -25, hi: -10 },
    { id: 'fz-2',  name: 'ตู้แช่แข็ง No.2', topic: PLC_FREEZE_TOPIC, field: 'D11', divisor: 10, unit: '°C', lo: -25, hi: -10 },
    { id: 'fz-3',  name: 'ตู้แช่แข็ง No.3', topic: PLC_FREEZE_TOPIC, field: 'D12', divisor: 10, unit: '°C', lo: -25, hi: -10 },
  ];

  function loadSensors() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_SENSORS.slice();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_SENSORS.slice();
    } catch { return DEFAULT_SENSORS.slice(); }
  }
  function saveSensors(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

  function decodePayload(str) {
    if (!str) return null;
    const cleaned = String(str).replace(/[%]/g, ' ').trim();
    if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
      try { return JSON.parse(cleaned); } catch { return null; }
    }
    return cleaned.split(',');
  }
  function pickField(decoded, field) {
    if (decoded == null || field === '' || field == null) return undefined;
    if (Array.isArray(decoded)) {
      const i = Number(field);
      return Number.isFinite(i) ? decoded[i] : undefined;
    }
    if (typeof decoded === 'object') return decoded[field];
    return undefined;
  }
  function nowHM() {
    return new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // ---- shared state ----
  const HTTPS_POLL_ENDPOINT = '/api/iot-values';
  const HTTPS_POLL_INTERVAL_MS = 8000;

  const state = {
    sensors: loadSensors(),
    latest: {},     // { sensorId: { value, at, raw } }
    status: 'idle', // idle | connecting | connected | error
    error: '',
    client: null,
    subscribedTopics: new Set(),
    pollTimer: null,
    pollInFlight: false,
  };
  const listeners = new Set();
  function notify() { listeners.forEach(fn => { try { fn(); } catch {} }); }

  function topicsFromSensors(list) {
    const s = new Set();
    list.forEach(x => { if (x.topic) s.add(x.topic); });
    return s;
  }

  function disconnect() {
    const c = state.client;
    state.client = null;
    state.subscribedTopics = new Set();
    if (!c) return;
    try {
      if (c.isConnected && c.isConnected()) {
        c.disconnect();
      }
    } catch {}
  }

  function stopPolling() {
    if (state.pollTimer) {
      clearTimeout(state.pollTimer);
      state.pollTimer = null;
    }
  }

  // HTTPS fallback: poll the Netlify Function proxy.
  async function pollOnce() {
    if (state.pollInFlight) return;
    const topics = [...topicsFromSensors(state.sensors)];
    if (topics.length === 0) return;
    state.pollInFlight = true;
    try {
      const res = await fetch(HTTPS_POLL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!data || !data.values) throw new Error('bad response');
      const at = nowHM();
      const nextLatest = { ...state.latest };
      let changed = false;
      state.sensors.forEach(s => {
        const payload = data.values[s.topic];
        if (payload == null) return;
        const decoded = decodePayload(payload);
        if (decoded == null) return;
        const raw = pickField(decoded, s.field);
        const num = Number(raw);
        const divisor = Number(s.divisor) || 1;
        const value = Number.isFinite(num) ? num / divisor : null;
        nextLatest[s.id] = { value, at, raw };
        changed = true;
      });
      if (changed) state.latest = nextLatest;
      state.status = 'connected';
      state.error = '';
    } catch (e) {
      state.status = 'error';
      state.error = 'Proxy ดึงข้อมูลไม่สำเร็จ: ' + (e?.message || e);
    } finally {
      state.pollInFlight = false;
      notify();
      // Schedule next poll while sensors remain configured.
      if (topicsFromSensors(state.sensors).size > 0) {
        state.pollTimer = setTimeout(pollOnce, HTTPS_POLL_INTERVAL_MS);
      }
    }
  }

  function startPolling() {
    stopPolling();
    state.status = 'connecting';
    notify();
    pollOnce();
  }

  function ensureConnected() {
    const wanted = topicsFromSensors(state.sensors);
    if (wanted.size === 0) {
      disconnect();
      stopPolling();
      state.status = 'idle';
      state.error = '';
      notify();
      return;
    }
    // On https the browser blocks ws:// (mixed content). Fall back to the
    // Netlify Function proxy, which subscribes server-side and returns JSON.
    if (window.location.protocol === 'https:') {
      disconnect();
      if (!state.pollTimer) startPolling();
      return;
    }
    if (!window.Paho || !window.Paho.MQTT) {
      state.status = 'error';
      state.error = 'Paho MQTT library ยังไม่โหลด';
      notify();
      return;
    }
    stopPolling();

    // Already connected — diff subscriptions.
    if (state.client && state.client.isConnected && state.client.isConnected()) {
      const current = state.subscribedTopics;
      wanted.forEach(t => {
        if (!current.has(t)) {
          try { state.client.subscribe(t, { qos: 0 }); current.add(t); } catch {}
        }
      });
      [...current].forEach(t => {
        if (!wanted.has(t)) {
          try { state.client.unsubscribe(t); current.delete(t); } catch {}
        }
      });
      return;
    }

    // Fresh connection.
    const clientId = 'mifs_' + Math.random().toString(36).slice(2, 10);
    const client = new window.Paho.MQTT.Client(BROKER.host, BROKER.port, BROKER.path, clientId);
    state.client = client;
    state.subscribedTopics = new Set();
    state.status = 'connecting';
    state.error = '';
    notify();

    client.onConnectionLost = (resp) => {
      state.status = 'error';
      state.error = 'การเชื่อมต่อหลุด: ' + (resp.errorMessage || 'unknown');
      notify();
      // Try to reconnect after a short delay.
      setTimeout(() => { if (state.sensors.some(s => s.topic)) ensureConnected(); }, 5000);
    };
    client.onMessageArrived = (msg) => {
      const topic = msg.destinationName;
      const decoded = decodePayload(msg.payloadString);
      if (decoded == null) return;
      const at = nowHM();
      let changed = false;
      state.sensors.forEach(s => {
        if (s.topic !== topic) return;
        const raw = pickField(decoded, s.field);
        const num = Number(raw);
        const divisor = Number(s.divisor) || 1;
        const value = Number.isFinite(num) ? num / divisor : null;
        state.latest = { ...state.latest, [s.id]: { value, at, raw } };
        changed = true;
      });
      if (changed) notify();
    };

    try {
      client.connect({
        userName: BROKER.userName,
        password: BROKER.password,
        useSSL: false,
        keepAliveInterval: 60,
        cleanSession: true,
        timeout: 10,
        onSuccess: () => {
          state.status = 'connected';
          state.error = '';
          wanted.forEach(t => {
            try { client.subscribe(t, { qos: 0 }); state.subscribedTopics.add(t); } catch {}
          });
          notify();
        },
        onFailure: (e) => {
          state.status = 'error';
          state.error = 'เชื่อมต่อ broker ไม่สำเร็จ: ' + (e?.errorMessage || JSON.stringify(e));
          notify();
        },
      });
    } catch (e) {
      state.status = 'error';
      state.error = String(e?.message || e);
      notify();
    }
  }

  // Pause the proxy polling when the tab isn't visible to save Netlify quota.
  // The direct ws:// MQTT path on http is left alone — browsers already pause
  // background WebSocket pings effectively.
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (window.location.protocol !== 'https:') return;
      if (document.hidden) {
        stopPolling();
        state.status = 'idle';
        state.error = 'หยุดดึงข้อมูลขณะ tab ไม่ active';
        notify();
      } else {
        ensureConnected();
      }
    });
  }

  // ---- public API ----
  const IoTManager = {
    getSnapshot() {
      return {
        sensors: state.sensors,
        latest: state.latest,
        status: state.status,
        error: state.error,
      };
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    setSensors(next) {
      state.sensors = next;
      saveSensors(next);
      notify();
      // Reconnect/diff subscriptions.
      ensureConnected();
    },
    start() { ensureConnected(); },
    DEFAULT_SENSORS,
    BROKER,
  };

  // Status helper for cards/strips.
  function classifySensor(sensor, latest) {
    const v = latest?.value;
    const hasVal = Number.isFinite(v);
    if (!sensor.topic) return 'muted';
    if (!hasVal) return 'muted';
    if ((Number.isFinite(sensor.lo) && v < sensor.lo) || (Number.isFinite(sensor.hi) && v > sensor.hi)) return 'bad';
    return 'good';
  }

  // React hook — subscribes to manager and re-renders on updates.
  function useIoT() {
    const [snap, setSnap] = React.useState(IoTManager.getSnapshot());
    React.useEffect(() => {
      const fn = () => setSnap(IoTManager.getSnapshot());
      const unsub = IoTManager.subscribe(fn);
      IoTManager.start();
      return unsub;
    }, []);
    return snap;
  }

  window.IoTManager = IoTManager;
  window.useIoT = useIoT;
  window.classifyIoTSensor = classifySensor;
})();
