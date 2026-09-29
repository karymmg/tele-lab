const SAJALNI_API = "https://enregistrement.sajalni.tn/api/devices/verify-device";
const MAX_BODY_BYTES = 16_384;
const allowedOrigins = new Set([
  "https://www.telephonic-pro.tn",
  "https://telephonic-pro.tn",
  "https://localhost",
  "capacitor://localhost",
]);

function isAllowedOrigin(origin) {
  if (allowedOrigins.has(origin)) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    return (protocol === "http:" || protocol === "https:") &&
      (hostname === "localhost" || hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

async function readRequestBody(req) {
  if (req.body !== undefined) {
    if (typeof req.body === "string") return JSON.parse(req.body);
    return req.body;
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("حجم الطلب كبير برشة.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function classifyResult(value) {
  const registeredKeys = new Set(["registered", "isregistered", "deviceregistered", "imeiregistered"]);
  const strings = [];
  let explicit;
  const visit = (entry, key = "") => {
    const normalizedKey = key.toLowerCase().replace(/[_-]/g, "");
    if (registeredKeys.has(normalizedKey) && typeof entry === "boolean" && explicit === undefined) {
      explicit = entry;
    }
    if (typeof entry === "string") strings.push(entry);
    else if (Array.isArray(entry)) entry.forEach(item => visit(item, key));
    else if (entry && typeof entry === "object") {
      Object.entries(entry).forEach(([childKey, child]) => visit(child, childKey));
    }
  };

  visit(value);
  const text = strings.join(" ").toLowerCase();
  if (text.includes("reason_name_lookup_alreadyuseddevice")) return "registered";
  if (text.includes("reason_name_lookup_notaloweddevice") || text.includes("reason_name_lookup_notalloweddevice")) {
    return "unregistered";
  }
  if (text.includes("reason_name_lookup_notvaliddevice")) return "serial-mismatch";
  if (explicit !== undefined) return explicit ? "registered" : "unregistered";
  if (/غير\s*مسجل|غير\s*مرسّم|موش\s*مسجل|unregistered|not\s+registered|not_registered|non[- ]registered/.test(text)) {
    return "unregistered";
  }
  if (/مسجل|مرسّم|registered/.test(text)) return "registered";
  return "unknown";
}

export default async function imeiCheck(req, res) {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (origin && !isAllowedOrigin(origin)) {
    sendJson(res, 403, { error: "المصدر غير مسموح." });
    return;
  }
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "الطريقة غير مسموحة." });
    return;
  }

  let input;
  try {
    input = await readRequestBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error instanceof SyntaxError ? "صيغة الطلب غير صحيحة." : error.message });
    return;
  }

  const imei = String(input?.imei ?? "").trim();
  const serialNo = String(input?.serialNo ?? "").trim();
  if (!/^\d{14,16}$/.test(imei)) {
    sendJson(res, 400, { error: "IMEI لازم يكون بين 14 و16 رقم." });
    return;
  }
  if (serialNo.length < 5 || serialNo.length > 50) {
    sendJson(res, 400, { error: "اكتب Serial Number صحيح (بين 5 و50 حرف)." });
    return;
  }

  try {
    const upstream = await fetch(SAJALNI_API, {
      method: "POST",
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9,ar;q=0.8,fr;q=0.7",
        "content-type": "application/json",
        "user-lang": "fr",
        origin: "https://enregistrement.sajalni.tn",
        referer: "https://enregistrement.sajalni.tn/verify-device",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({ recaptchaResponse: "", imei, serialNo }),
      signal: AbortSignal.timeout(20_000),
    });
    const raw = await upstream.text();
    if (!upstream.ok) {
      sendJson(res, 502, { error: "خدمة سجلني موش متاحة توّا. عاود جرّب بعد شوية." });
      return;
    }

    let data = raw;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      // Keep unstructured upstream replies classified as unknown.
    }
    if (data?.ok === false) {
      sendJson(res, 502, { error: "خدمة سجلني رفضت الطلب. عاود جرّب بعد شوية." });
      return;
    }
    sendJson(res, 200, { outcome: classifyResult(data) });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError";
    console.error("IMEI verification request failed:", error?.cause?.code || error?.name || "unknown");
    sendJson(res, 502, {
      error: timedOut ? "خدمة سجلني ما جاوبتش في الوقت المحدّد." : "ما نجّمش نتّصل بخدمة سجلني.",
    });
  }
}
