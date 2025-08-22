// utils/sessionsFormatter.js
import { UAParser } from "ua-parser-js";
import dayjsLib from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";
import "dayjs/locale/es.js";

dayjsLib.extend(relativeTime);
dayjsLib.locale("es");

// ── Helpers de IP ──────────────────────────────────────────────────────────────
export function normalizeIp(ip) {
  if (!ip) return null;
  if (ip === "::1") return "127.0.0.1";
  if (ip.startsWith("::ffff:")) return ip.slice(7); // ::ffff:192.168.0.10 → 192.168.0.10
  return ip;
}

export function isPrivateIp(ipV4) {
  if (!ipV4) return false;
  // rangos privados IPv4
  if (ipV4 === "127.0.0.1") return true;
  if (ipV4.startsWith("10.")) return true;
  if (ipV4.startsWith("192.168.")) return true;
  // 172.16.0.0 – 172.31.255.255
  const m = ipV4.match(/^172\.(\d{1,2})\./);
  if (m) {
    const oct = parseInt(m[1], 10);
    if (oct >= 16 && oct <= 31) return true;
  }
  return false;
}

// ── Formateo de user-agent ─────────────────────────────────────────────────────
export function formatUserAgent(uaString = "") {
  try {
    const p = new UAParser(uaString).getResult();
    const browser = p.browser?.name || "Navegador";
    const osName = p.os?.name || "OS";
    const osVer = p.os?.version ? ` ${p.os.version}` : "";
    return `${browser} - ${osName}${osVer}`.trim();
  } catch {
    return "Dispositivo";
  }
}

export function formatDeviceType(uaString = "") {
  try {
    const p = new UAParser(uaString).getResult();
    let tipoDispositivo;
    switch (p.device?.type) {
    case "mobile":
      tipoDispositivo = "Móvil";
      break;
    case "tablet":
      tipoDispositivo = "Tablet";
      break;
    case "console":
      tipoDispositivo = "Consola";
      break;
    case "smarttv":
      tipoDispositivo = "Smart TV";
      break;
    case "wearable":
      tipoDispositivo = "Reloj inteligente";
      break;
    default:
      tipoDispositivo = "Escritorio";
  }

  return tipoDispositivo;
  } catch (error) {
    console.error(error);
  }
}

// ── Última actividad (relative) ────────────────────────────────────────────────
export function formatLastSeen(ts) {
  if (!ts) return "—";
  const d = dayjsLib(ts);
  // si fue en el último minuto, mostrás "Activa ahora"
  if (d.isAfter(dayjsLib().subtract(1, "minute"))) return "Activa ahora";
  return d.fromNow(); // "hace 2 horas"
}

// ── Formateador SIN geolocalización (rápido/sync) ─────────────────────────────
export function formatSessionRow(row, { showPrivateAs = "Red local" } = {}) {
  const ip = normalizeIp(row.ip_last || row.ip_created);
  const dispositivo = formatUserAgent(row.user_agent);
  const ultimaActividad = formatLastSeen(row.last_seen_at);
  const deviceType = formatDeviceType(row.user_agent);

  let ubicacion = row.location_label || "—";
  if (!row.location_label) {
    if (!ip) ubicacion = "—";
    else if (isPrivateIp(ip)) ubicacion = showPrivateAs; // "Red local"
  }

  return {
    id: row.id,
    dispositivo,
    ubicacion,
    ultimaActividad,
    ip: ip || "—",
    isRevoked: !!row.revoked_at,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    device_type: deviceType
  };
}

// ── (Opcional) Geolocalizar IP pública si falta location_label ────────────────
// Usa ip-api.com (gratuito; sin HTTPS en plan free). Alterná por ipapi.co si querés HTTPS.
import fetch from "node-fetch";

/**
 * Devuelve "Ciudad, País" o "Red local"/"—"
 */
export async function resolveLocationLabel(ip) {
  const v4 = normalizeIp(ip);
  if (!v4) return "—";
  if (isPrivateIp(v4)) return "Red local";
  try {
    const r = await fetch(`http://ip-api.com/json/${v4}?fields=status,city,country,query`);
    const data = await r.json();
    if (data?.status === "success") {
      const city = data.city || "";
      const country = data.country || "";
      const label = [city, country].filter(Boolean).join(", ");
      return label || v4; // fallback a IP si no hay city/country
    }
  } catch {}
  return v4; // fallback
}

/**
 * Formatea y, si falta location_label, intenta geolocalizar IP pública.
 */
export async function formatSessionRowWithGeo(row) {
  const base = formatSessionRow(row);
  if (!row.location_label) {
    base.ubicacion = await resolveLocationLabel(base.ip);
  }
  return base;
}

/**
 * Helpers de conveniencia para arrays
 */
export function mapSessions(rows) {
  return rows.map((r) => formatSessionRow(r));
}

export async function mapSessionsWithGeo(rows) {
  return Promise.all(rows.map((r) => formatSessionRowWithGeo(r)));
}
