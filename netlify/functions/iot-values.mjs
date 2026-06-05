// MQTT → HTTP proxy. Browsers loaded over HTTPS cannot open a ws:// MQTT
// connection (mixed content), so this serverless function does it instead:
// connect to the thaiiiot broker, capture one message per requested topic,
// and return a JSON map of { topic: payload }.
//
// Frontend usage:
//   POST /api/iot-values   body: { topics: ["PLC_CENTER/.../PLC/0", ...] }
//
// Tweak WAIT_MS to trade freshness vs. response time. Topics that don't deliver
// a message within the window are simply omitted from the response.

import mqtt from 'mqtt';

const BROKER_URL = 'ws://conn.thaiiiot.com:9001/mqtt';
const USERNAME = 'iiotkub';
const PASSWORD = 'iiotkub';
const WAIT_MS = 4500;

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'POST only' }), { status: 405, headers: JSON_HEADERS });
  }
  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ ok: false, error: 'invalid json' }), { status: 400, headers: JSON_HEADERS }); }

  const topics = Array.isArray(body?.topics) ? body.topics.filter(t => typeof t === 'string' && t) : [];
  if (topics.length === 0) {
    return new Response(JSON.stringify({ ok: true, values: {} }), { headers: JSON_HEADERS });
  }

  return await collect(topics);
};

function collect(topics) {
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
      const body = { ok: !err, values };
      if (err) body.error = String(err.message || err);
      resolve(new Response(JSON.stringify(body), { headers: JSON_HEADERS }));
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
      topics.forEach(t => {
        client.subscribe(t, { qos: 0 }, () => {});
      });
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
