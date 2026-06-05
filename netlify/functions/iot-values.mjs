// MQTT → HTTP proxy. Browsers loaded over HTTPS cannot open a ws:// MQTT
// connection (mixed content), so this serverless function does it instead:
// connect to the thaiiiot broker, capture one message per requested topic,
// and return a JSON map of { topic: payload }.
//
// Frontend usage:
//   POST /api/iot-values   body: { topics: ["PLC_CENTER/.../PLC/0", ...] }

const BROKER_URL = 'ws://conn.thaiiiot.com:9001/mqtt';
const USERNAME = 'iiotkub';
const PASSWORD = 'iiotkub';
const WAIT_MS = 4500;

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });
}

export default async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'POST only' }, 405);
  }

  let body;
  try { body = await req.json(); }
  catch (e) { return jsonResponse({ ok: false, error: 'invalid json: ' + e.message }, 400); }

  const topics = Array.isArray(body?.topics) ? body.topics.filter(t => typeof t === 'string' && t) : [];
  if (topics.length === 0) {
    return jsonResponse({ ok: true, values: {} });
  }

  // Dynamic import so any module-load error is captured as a normal response
  // instead of crashing the Lambda before it can reply.
  let mqtt;
  try {
    const mod = await import('mqtt');
    mqtt = mod.default || mod;
  } catch (e) {
    return jsonResponse({ ok: false, stage: 'import', error: String(e?.message || e), stack: String(e?.stack || '').slice(0, 800) });
  }

  try {
    return await collect(mqtt, topics);
  } catch (e) {
    return jsonResponse({ ok: false, stage: 'collect', error: String(e?.message || e), stack: String(e?.stack || '').slice(0, 800) });
  }
};

function collect(mqtt, topics) {
  return new Promise((resolve) => {
    const values = {};
    const want = new Set(topics);
    let client;
    let timer;
    let done = false;

    const finish = (err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { client && client.end(true); } catch {}
      const out = { ok: !err, values };
      if (err) out.error = String(err.message || err);
      resolve(jsonResponse(out));
    };

    try {
      client = mqtt.connect(BROKER_URL, {
        username: USERNAME,
        password: PASSWORD,
        connectTimeout: 4000,
        reconnectPeriod: 0,
        clean: true,
        clientId: 'mifs_proxy_' + Math.random().toString(36).slice(2, 10),
      });
    } catch (e) {
      finish(e);
      return;
    }

    timer = setTimeout(() => finish(null), WAIT_MS);

    client.on('connect', () => {
      topics.forEach(t => client.subscribe(t, { qos: 0 }, () => {}));
    });
    client.on('message', (topic, payload) => {
      if (!want.has(topic)) return;
      values[topic] = payload.toString();
      want.delete(topic);
      if (want.size === 0) finish(null);
    });
    client.on('error', (e) => finish(e));
  });
}

export const config = { path: '/api/iot-values' };
