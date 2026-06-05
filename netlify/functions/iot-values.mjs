// MQTT → HTTP proxy. Browsers loaded over HTTPS cannot open ws:// from a
// secure page, so this serverless function opens it instead. We implement
// just enough of MQTT 3.1.1 over WebSocket (CONNECT, SUBSCRIBE, parse
// PUBLISH for QoS 0) to avoid pulling in the heavy `mqtt` npm package,
// which kept failing to bundle/resolve on Netlify.
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
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);
  let body;
  try { body = await req.json(); }
  catch (e) { return json({ ok: false, error: 'invalid json: ' + e.message }, 400); }

  const topics = Array.isArray(body?.topics)
    ? body.topics.filter(t => typeof t === 'string' && t)
    : [];
  if (topics.length === 0) return json({ ok: true, values: {} });

  try {
    const values = await collectMqtt(topics);
    return json({ ok: true, values });
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e), stack: String(e?.stack || '').slice(0, 800) });
  }
};

// -------------------- minimal MQTT 3.1.1 over WebSocket --------------------

function encodeRemainingLength(n) {
  const out = [];
  do { let b = n % 128; n = Math.floor(n / 128); if (n > 0) b |= 0x80; out.push(b); } while (n > 0);
  return out;
}
function encodeString(s) {
  const buf = Buffer.from(s, 'utf8');
  const len = Buffer.alloc(2);
  len.writeUInt16BE(buf.length, 0);
  return Buffer.concat([len, buf]);
}
function buildConnect(clientId, username, password, keepAliveSec = 60) {
  // Variable header: protocol name "MQTT" + level 4 + connect flags + keep-alive
  const protocolName = encodeString('MQTT');
  const protocolLevel = Buffer.from([4]);
  let flags = 0x02; // clean session
  if (username) flags |= 0x80;
  if (password) flags |= 0x40;
  const flagsBuf = Buffer.from([flags]);
  const keepAlive = Buffer.alloc(2);
  keepAlive.writeUInt16BE(keepAliveSec, 0);
  // Payload: clientId, username?, password?
  const parts = [encodeString(clientId)];
  if (username) parts.push(encodeString(username));
  if (password) parts.push(encodeString(password));
  const payload = Buffer.concat(parts);
  const variable = Buffer.concat([protocolName, protocolLevel, flagsBuf, keepAlive]);
  const body = Buffer.concat([variable, payload]);
  const remLen = Buffer.from(encodeRemainingLength(body.length));
  return Buffer.concat([Buffer.from([0x10]), remLen, body]);
}
function buildSubscribe(packetId, topics) {
  const packetIdBuf = Buffer.alloc(2);
  packetIdBuf.writeUInt16BE(packetId, 0);
  const filters = topics.map(t => Buffer.concat([encodeString(t), Buffer.from([0])])); // QoS 0
  const body = Buffer.concat([packetIdBuf, ...filters]);
  const remLen = Buffer.from(encodeRemainingLength(body.length));
  return Buffer.concat([Buffer.from([0x82]), remLen, body]);
}
function buildDisconnect() { return Buffer.from([0xE0, 0x00]); }

// Decode the remaining-length varint starting at offset `i`. Returns [value, nextOffset].
function decodeRemainingLength(buf, i) {
  let multiplier = 1, value = 0;
  while (true) {
    if (i >= buf.length) return null;
    const b = buf[i++];
    value += (b & 0x7f) * multiplier;
    if ((b & 0x80) === 0) break;
    multiplier *= 128;
    if (multiplier > 128 * 128 * 128) throw new Error('malformed remaining length');
  }
  return [value, i];
}

// Parse PUBLISH packets in the buffer. Returns { messages: [{topic, payload}], rest: Buffer }.
function parsePackets(buf) {
  const messages = [];
  let i = 0;
  while (i < buf.length) {
    const fixed = buf[i];
    const type = (fixed >> 4) & 0x0f;
    const rl = decodeRemainingLength(buf, i + 1);
    if (!rl) break;
    const [remLen, bodyStart] = rl;
    if (bodyStart + remLen > buf.length) break; // incomplete
    if (type === 3) {
      // PUBLISH
      const topicLen = buf.readUInt16BE(bodyStart);
      const topic = buf.slice(bodyStart + 2, bodyStart + 2 + topicLen).toString('utf8');
      const qos = (fixed >> 1) & 0x03;
      let payloadStart = bodyStart + 2 + topicLen;
      if (qos > 0) payloadStart += 2; // skip packet identifier
      const payload = buf.slice(payloadStart, bodyStart + remLen).toString('utf8');
      messages.push({ topic, payload });
    }
    i = bodyStart + remLen;
  }
  return { messages, rest: buf.slice(i) };
}

function collectMqtt(topics) {
  return new Promise((resolve, reject) => {
    let ws;
    let timer;
    let buf = Buffer.alloc(0);
    const values = {};
    const want = new Set(topics);
    let done = false;

    const finish = (err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { ws && ws.send(buildDisconnect()); } catch {}
      try { ws && ws.close(); } catch {}
      if (err) reject(err); else resolve(values);
    };

    try {
      // Native WebSocket in Node 22 doesn't support sub-protocol "mqtt" easily,
      // use the 'ws' built-in interface via undici's WebSocket which accepts
      // protocols as a string option. Globally available in Node 20+.
      ws = new WebSocket(BROKER_URL, 'mqtt');
    } catch (e) { finish(e); return; }

    timer = setTimeout(() => finish(null), WAIT_MS);

    ws.binaryType = 'arraybuffer';
    ws.addEventListener('open', () => {
      const clientId = 'mifs_proxy_' + Math.random().toString(36).slice(2, 10);
      ws.send(buildConnect(clientId, USERNAME, PASSWORD));
    });
    ws.addEventListener('message', (ev) => {
      const chunk = Buffer.from(ev.data instanceof ArrayBuffer ? new Uint8Array(ev.data) : ev.data);
      buf = Buffer.concat([buf, chunk]);

      // Check for CONNACK as the very first packet (type 2).
      if (buf.length >= 4 && (buf[0] >> 4) === 2) {
        // CONNACK: byte 3 = return code (0 = success)
        if (buf[3] !== 0) { finish(new Error('CONNACK rc=' + buf[3])); return; }
        // Drop the CONNACK (4 bytes) and send SUBSCRIBE.
        buf = buf.slice(4);
        try { ws.send(buildSubscribe(1, topics)); } catch (e) { finish(e); return; }
      }
      const { messages, rest } = parsePackets(buf);
      buf = rest;
      for (const m of messages) {
        if (!want.has(m.topic)) continue;
        values[m.topic] = m.payload;
        want.delete(m.topic);
      }
      if (want.size === 0) finish(null);
    });
    ws.addEventListener('error', (e) => finish(new Error('ws error: ' + (e?.message || ''))));
    ws.addEventListener('close', () => { /* timer will resolve if not already */ });
  });
}

export const config = { path: '/api/iot-values' };
