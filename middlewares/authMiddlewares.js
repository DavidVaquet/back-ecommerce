import jwt from "jsonwebtoken";
import pool from "../config/db.js";

export const verifyToken = async (req, res, next) => {
  const autHeader = req.headers.authorization;

  if (!autHeader || !autHeader.startsWith("Bearer ")) {
    return res.status(404).json({ msg: "Token no proporcionado." });
  }

  const token = autHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_PASSWORD);
    req.usuario = {
      id: decoded.sub ? parseInt(decoded.sub, 10) : parseInt(decoded.id),
      rol: decoded.rol,
      nombre: decoded.nombre,
      raw: decoded
    };
    // console.log(decoded);

    req.orgId = decoded.org_id;
    req.sessionId = decoded.sid || decoded.sessionId || null;

    return next();
  } catch (error) {
    console.error(error);
    return res.status(403).json({ msg: "Error al validar el token." });
  }
};

export const verifyRole = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ msg: "No autenticado" });
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ msg: "No autorizado" });
    }
    next();
  };
};

const norm = (v) =>
  String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const verifyAdmin = (req, res, next) => {
  const rol = norm(req.user?.rol ?? req.usuario?.rol);
  if (!rol || !["admin", "superadmin", 'vendedor', 'supervisor'].includes(rol)) {
    return res.status(403).json({ msg: "No tienes permisos para realizar esta acción." });
  }
  next();
};

export const getUserAgent = (req) => req.headers["user-agent"] || "Desconocido";

export const getClientIp = (req) =>
  req.ip || req.connection?.remoteAddress || "0.0.0.0";

export const requireActiveSession = async (req, res, next) => {
  try {
    if (!req.sessionId) {
      return res.status(401).json({ msg: "No autorizado." });
    }
    const { rows } = await pool.query(
      "SELECT 1 FROM user_sessions WHERE id = $1 AND revoked_at IS NULL",
      [req.sessionId]
    );
    if (!rows.length) {
      return res.status(401).json({ msg: "Sesión revocada." });
    }
    next();
  } catch (e) {
    console.error("requireActiveSession:", e.message);
    return res.status(500).json({ msg: "Error de validación de sesión." });
  }
};

export const touchSession = async (req, res, next) => {
  try {
    if (req.sessionId) {
      await pool.query(
        `UPDATE user_sessions
            SET last_seen_at = NOW(),
                ip_last = $1
          WHERE id = $2 AND revoked_at IS NULL`,
        [getClientIp(req), req.sessionId]
      );
    }
  } catch (e) {
    console.warn("touchSession:", e.message);
  }
  next();
};
