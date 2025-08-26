import {
  createUser,
  findUserByEmail,
  actualizarUltimoIngreso,
  userInformation,
  editUserInformation,
  updatePassword,
  createSession,
  getSessions,
  closeOneSession,
  closeAllSesions,
  recentActivity,
  getActivityRecent,
} from "../models/userModel.js";
import pool from "../config/db.js";
import { getClientIp, getUserAgent } from "../middlewares/authMiddlewares.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  formatUserAgent,
  mapSessionsWithGeo,
} from "../utils/sessionFormater.js";

export const newUser = async (req, res) => {
  const { nombre, email, password, rol, activo } = req.body;

  if (!nombre || !email || !password) {
    return res
      .status(400)
      .json({ msg: "Nombre, email y password son obligatorios." });
  }

  try {
    const userExistente = await findUserByEmail(email);
    if (userExistente) {
      return res
        .status(400)
        .json({ msg: "Ya existe una cuenta con este email." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const nuevoUsuario = await createUser({
      nombre,
      email,
      passwordHash,
      rol,
      activo,
    });
    delete nuevoUsuario.password;

    return res.status(201).json({
      msg: "Usuario creado con exito.",
      usuario: nuevoUsuario,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Error al crear un nuevo usuario." });
  }
};

export const loginUsuario = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ msg: "Email y password son obligatorios." });
  }

  try {
    const usuario = await findUserByEmail(email);
    if (!usuario) {
      return res.status(404).json({ msg: "Usuario no encontrado." });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      return res.status(400).json({ msg: "El password es incorrecto." });
    }

    // Actualizar ultimo acceso
    await actualizarUltimoIngreso(usuario.id);

    const userAgent = await getUserAgent(req);
    const ip = await getClientIp(req);

    const sessionId = await createSession({
      userId: usuario.id,
      userAgent,
      ip,
    });

    const payload = {
      sub: String(usuario.id),
      sid: String(sessionId),
      nombre: usuario.nombre,
      rol: usuario.rol,
    };

    const token = jwt.sign(payload, process.env.JWT_PASSWORD, {
      expiresIn: "1d",
    });

    delete usuario.password;

    // await activityRecent(req, {
    //   estado: "Exitoso",
    //   accion: "Inicio de sesión.",
    // });

    return res.status(200).json({
      msg: "Login exitoso.",
      usuario,
      token,
    });
  } catch (error) {
    console.error(error);
    await activityRecent(req, {
      estado: "Exitoso",
      accion: "Intento de acceso fallido.",
    });
    return res.status(500).json({ msg: "Error al iniciar sesion" });
  }
};

export const editUser = async (req, res) => {
  try {
    const { nombre, apellido, direccion, telefono } = req.body;
    // console.log(req.body);
    if (!nombre || !apellido || !direccion || !telefono) {
      return res.status(400).json({ msg: "Todos los campos son obligatorios" });
    }
    const userEdit = await editUserInformation({
      id: req.usuario.id,
      direccion,
      telefono,
      nombre,
      apellido,
    });

    if (!userEdit) {
      return res.status(400).json({ msg: "No se encontro usuario con ese ID" });
    }
    await activityRecent(req, {
      estado: "Exitoso",
      accion: "Modificó un usuario.",
    });
    return res.status(200).json({
      msg: "Usuario editado correctamente",
      userEdit,
    });
  } catch (error) {
    console.error(error);
    await activityRecent(req, {
      estado: "Fallido",
      accion: "Falló al modificar un usuario.",
    });
    return res.status(500).json({ msg: "Error al editar el usuario" });
  }
};

export const userInfo = async (req, res) => {
  try {
    const user = await userInformation(req.usuario.id);
    if (!user) {
      return res
        .status(400)
        .json({ msg: `No se encontró el usuario con el id ${req.usuario.id}` });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Error al encontrar el usuario" });
  }
};

export const updateUserPassword = async (req, res) => {
  try {
    const { nuevaPassword, password } = req.body;
    const userId = req.usuario.id;

    if (!nuevaPassword || !password) {
      return res.status(400).json({ msg: "Todos los campos son requeridos." });
    }

    const user = await userInformation(userId);

    if (!user) {
      return res
        .status(400)
        .json({ msg: `No se encontró el usuario con el id ${userId}` });
    }

    const compare = await bcrypt.compare(password, user.password);

    if (!compare) {
      return res
        .status(400)
        .json({ msg: "La contraseña actual no es correcta." });
    }

    const reuse = await bcrypt.compare(nuevaPassword, user.password);

    if (reuse) {
      return res
        .status(400)
        .json({ msg: "La nueva contraseña no puede ser igual a la actual." });
    }

    const nuevaPasswordHash = await bcrypt.hash(nuevaPassword, 10);

    const pass = await updatePassword({
      password: nuevaPasswordHash,
      id: userId,
    });

    return res
      .status(200)
      .json({ success: true, msg: "Contraseña actualizada" });
  } catch (error) {
    console.error(err);
    return res.status(500).json({ msg: "Error al cambiar la contraseña" });
  }
};

export const obtenerSessiones = async (req, res) => {
  try {
    if (!req.usuario.id) {
      return res.status(400).json({ msg: "No se encontró ningún usuario." });
    }

    const sessions = await getSessions(req.usuario.id);

    if (!sessions || sessions.length === 0) {
      return res.status(400).json({ msg: "No hay ninguna sesión activa." });
    }

    const formatted = await mapSessionsWithGeo(sessions);

    const sessionsWithFlag = formatted.map((s) => ({
      ...s,
      isCurrent: String(s.id) === String(req.sessionId),
    }));

    return res.status(200).json({
      msg: "Sesiones obtenidas exitosamente",
      sessions: sessionsWithFlag,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Error al obtener las sesiones." });
  }
};

export const cerrarSession = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("HIT close-session, id=", req.params.id);
    if (!id) {
      return res.status(400).json({ msg: "El id no fue especificado." });
    }

    const close = await closeOneSession(id, req.usuario.id);

    if (close === 0) {
      return res
        .status(404)
        .json({ msg: "Sesión no encontrada o ya cerrada." });
    }

    // console.log('cerrarSession affected=', close);
    return close
      ? res.status(200).json({ success: true })
      : res.status(404).json({ msg: "No encontrada o ya cerrada" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Error al cerrar la sesión." });
  }
};

export const cerrarTodasSessiones = async (req, res) => {
  try {
    const close = await closeAllSesions(req.sessionId, req.usuario.id);

    if (!close) {
      return res
        .status(400)
        .json({ msg: "Ocurrio un error al cerrar la sesión." });
    }

    return res.status(204).end();
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Error al cerrar la sesión." });
  }
};

export const activityRecent = async (req, { estado, accion }) => {
  try {
    const ua = req.headers["user-agent"] || "";
    const disp = formatUserAgent(ua);

    // Registra la actividad reciente
    await recentActivity({
      usuarioId: req.usuario.id,
      estado,
      accion,
      dispositivo: disp,
    });
  } catch (error) {
    console.error("Error guardando actividad", error);
  }
};

export const getRecentActivity = async (req, res) => {
  try {
    const { limite } = req.query;
    const activity = await getActivityRecent({
      limite,
      usuarioId: req.usuario.id,
    });
    if (!activity) {
      return res.status(400).json({ msg: "No se encontró ninguna actividad" });
    }

    return res.status(200).json(activity);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "No se encontró ninguna actividad" });
  }
};

export const getUsageStats = async (req, res) => {
  try {
    const userId = req.user?.id ?? req.usuario?.id;
    if (!userId) return res.status(401).json({ msg: "No autenticado" });
    const TZ = 'America/Argentina/Buenos_Aires';
    const TARGETS = {
    sessionsPerWeek: 12,
    avgHoursPerSession: 8,
    actionsPerWeek: 200,
    };

    // Sesiones esta semana (cantidad + promedio de duración)
    const qSessions = `
      SELECT
        COUNT(*)::int AS sessions,
        EXTRACT(EPOCH FROM AVG(COALESCE(revoked_at, last_seen_at, NOW()) - created_at))::bigint AS avg_seconds
      FROM user_sessions
      WHERE user_id = $1
        AND (created_at AT TIME ZONE $2) >= date_trunc('week', NOW() AT TIME ZONE $2)
    `;
    const { rows: sRows } = await pool.query(qSessions, [userId, TZ]);
    const sessions = sRows[0]?.sessions ?? 0;
    const avgSeconds = Number(sRows[0]?.avg_seconds ?? 0);
    const avgHours = avgSeconds ? +(avgSeconds / 3600).toFixed(1) : 0; 

    // Acciones esta semana
    const qActions = `
      SELECT COUNT(*)::int AS actions
      FROM actividad_reciente
      WHERE usuario_id = $1
        AND (fecha AT TIME ZONE $2) >= date_trunc('week', NOW() AT TIME ZONE $2)
    `;
    const { rows: aRows } = await pool.query(qActions, [userId, TZ]);
    const actions = aRows[0]?.actions ?? 0;

    // Progresos (contra metas fijas; si preferís contra semana previa, te dejo abajo)
    const sessionsProgress = Math.min(
      100,
      Math.round((sessions / TARGETS.sessionsPerWeek) * 100)
    );
    const timeProgress = Math.min(
      100,
      Math.round((avgHours / TARGETS.avgHoursPerSession) * 100)
    );
    const actionsProgress = Math.min(
      100,
      Math.round((actions / TARGETS.actionsPerWeek) * 100)
    );

    return res.json({
      sessions,
      avgHours,
      actions,
      progress: {
        sessions: sessionsProgress,
        time: timeProgress,
        actions: actionsProgress,
      },
      targets: TARGETS,
    });
  } catch (e) {
    console.error("getUsageStats:", e);
    return res.status(500).json({ msg: "Error calculando estadísticas" });
  }
};
