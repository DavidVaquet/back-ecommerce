import {
  createUser,
  findUserByEmailID,
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
  getUsers,
  deleteUser,
  updatePasswordRecovery,
} from "../models/userModel.js";
import pool from "../config/db.js";
import { getClientIp, getUserAgent } from "../middlewares/authMiddlewares.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  formatUserAgent,
  mapSessionsWithGeo,
} from "../utils/sessionFormater.js";
import { ORG_ID } from "../config/tenancy.js";
import { generarHashToken, hashPassword, sha256 } from "../utils/security.js";
import { enviarEmailConLink } from "../utils/enviarEmailAdjunto.js";

export const newUser = async (req, res) => {
  const { nombre, email, password, rol, activo, telefono, apellido, direccion } = req.body;

  // console.log(req.body);
  if (!nombre || !nombre.trim()) {
  return res.status(400).json({ msg: "El nombre es obligatorio." });
}

if (!apellido || !apellido.trim()) {
  return res.status(400).json({ msg: "El apellido es obligatorio." });
}

if (!password) {
  return res.status(400).json({ msg: 'Debes introducir una contraseña.'});
}
if (!email) {
  return res.status(400).json({ msg: 'Debes introducir un correo.'});
}


  try {
    const userExistente = await findUserByEmailID({email});
    if (userExistente) {
      return res
        .status(400)
        .json({ msg: "Ya existe una cuenta con este email." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const nuevoUsuario = await createUser({
      nombre,
      email,
      password: passwordHash,
      passwordNoHash: password,
      rol,
      activo,
      telefono,
      apellido,
      direccion,
      org_id: ORG_ID
    });
    delete nuevoUsuario.password;

    return res.status(201).json({
      msg: "Usuario creado con exito.",
      ok: true
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
    const usuario = await findUserByEmailID({email});
    if (!usuario) {
      return res.status(404).json({ msg: "Usuario no encontrado." });
    }
    // console.log(usuario);
    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      return res.status(400).json({ msg: "El password es incorrecto." });
    }

    if (!usuario.activo) {
      return res.status(400).json({ msg: "Tu cuenta esta deshabilitada, contacta con soporte." });
    };

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
      org_id: usuario.org_id ?? ''
    };

    const token = jwt.sign(payload, process.env.JWT_PASSWORD, {
      expiresIn: "1d",
    });
    // console.log(token);
    delete usuario.password;

    await activityRecent(req, {
    estado: "Exitoso",
    accion: "Inicio de sesión.",
    userId: usuario.id
      });

    return res.status(200).json({
      msg: "Login exitoso.",
      usuario,
      token,
    });
  } catch (error) {
    console.error(error);
    await activityRecent(req, {
      estado: "Fallido",
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
      accion: "Editó su perfil.",
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

    const {password, password_no_hash, reset_pw_token, reset_pw_token_expires_at, ...resto} = user;

    return res.status(200).json(resto);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Error al encontrar el usuario" });
  }
};

export const adminEditUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, rol, activo } = req.body
    const idParsed = parseInt(id);
    const estadoParsed = activo === 'activo' ? true : false;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ msg: "El nombre es obligatorio." });
    }

    if (!apellido || !apellido.trim()) {
      return res.status(400).json({ msg: "El apellido es obligatorio." });
    }

    if (!rol) {
      return res.status(400).json({ msg: "Debes seleccionar un rol." });
    }

    if (activo === undefined || activo === null) {
      return res.status(400).json({ msg: "Debes seleccionar un estado." });
    }
    
    const userExistente = await findUserByEmailID({id: idParsed});

    if (!userExistente) {
      return res.status(404).json({ msg: 'Usuario no encontrado'});
    }

    const usuarioEditado = await editUserInformation({id, nombre, apellido, rol, activo: estadoParsed});
    
    if (!usuarioEditado) {
        return res.status(400).json({ msg: 'Ocurrió un error al editar el usuario'});
     }

    return res.status(200).json({ ok: true, usuarioEditado });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al editar el usuario'});
  }
}

export const eliminarUsuario = async (req, res) => {

  try {
    const { id } = req.params;
    const idParsed = parseInt(id);

    const usuarioExistente = await findUserByEmailID({id: idParsed});

    if (!usuarioExistente) {
      return res.status(400).json({ msg: 'Usuario no encontrado'});
    };

    const userEliminado = await deleteUser(idParsed);

    return res.status(200).json({ ok: true, msg: 'Usuario eliminado correctamente'});

  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al eliminar el usuario'});
  }
}

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

export const obtenerUsuarios = async(req, res) => {
  
  try {
    const filters = {
      excludeRole: req.query.excludeRole ?? '',
      activo: req.query.activo === 'true' ? true
      : req.query.activo === 'false' ? false
      : undefined,
      limite: Number(req.query.limite),
      offset: Number(req.query.offset)
    };

    const users = await getUsers({ filters });
    res.json({users});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al obtener los usuarios'});
  }
}

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

export const activityRecent = async (req, { estado, accion, userId }) => {
  try {
    const ua = req.headers["user-agent"] || "";
    const disp = formatUserAgent(ua);

    let userIdentificador;

    if (userId) {
      userIdentificador = Number(userId);
    } else {
      userIdentificador = Number(req.usuario.id);
    }

    // Registra la actividad reciente
    await recentActivity({
      usuarioId: userIdentificador,
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


export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    console.log(req.body);

    if (!email) return res.status(400).json({ msg: 'Debes introducir un correo válido.'});

    const user = await findUserByEmailID(email);

    if (!user) return res.status(400).json({ msg: 'El email no existe, prueba con otro.'});
    // console.log(user);
    const rawToken = generarHashToken(30);
    const tokenHash = sha256(rawToken);
    const expire_at = new Date(Date.now() + 1000 * 60 * 30);
    const API_PUBLIC_URL = process.env.API_PUBLIC_URL;

    await pool.query(`
      UPDATE users 
      SET reset_pw_token = $1,
      reset_pw_token_expires_at = $2
      WHERE id = $3`, [tokenHash, expire_at, user.id]);

    const resetUrl = `${process.env.APP_PUBLIC_URL}/restablecer-password/${rawToken}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; padding: 24px;">
          
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${API_PUBLIC_URL}/public/logoIclub.png" alt="iClub" style="width: 120px;" />
          </div>

          <h2 style="color: #1e40af;">¡Hola ${user.nombre}!</h2>
          <p style="font-size: 16px;">
            Recibimos una solicitud para restablecer tu contraseña en <strong>iClub</strong>.
          </p>
          <p style="font-size: 16px;">
            Para continuar, hacé clic en el siguiente botón. El enlace vence en <strong>30 minutos</strong>.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" target="_blank"
              style="
                background-color: #1e40af;
                color: white;
                text-decoration: none;
                padding: 14px 28px;
                border-radius: 6px;
                font-size: 16px;
                display: inline-block;
              ">
              🔑 RESTABLECER CONTRASEÑA
            </a>
          </div>

          <p style="font-size: 14px; color: #555;">
            Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br>
            <a href="${resetUrl}" style="color:#1e40af; word-break: break-all;">${resetUrl}</a>
          </p>

          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />

          <div style="font-size: 13px; color: #777;">
            iClub Catamarca<br>
            Intendente Yamil Fadel esq. Illia s/n<br>
            Tel: 3834292951 - 3834345859
          </div>
        </div>
      `;

      const subject = `Restablecer tu contraseña - iClub Catamarca`
    try {
      await enviarEmailConLink({
        html,
        subject,
        para: user.email

      })
    } catch (error) {
      console.error(error);
      throw error;
    }

    return res.status(200).json({ msg: 'Te envíamos un correo con las instrucciones, sigue los pasos para restablecer tu contraseña.'});

  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Ocurrió un error al enviar el email, intentalo de nuevo.'});
  }
}

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ msg: 'Token y nueva contraseña son requeridos.'});
    };
    
    if (password.length < 8) return res.status(400).json({ msg: 'La contraseña debe tener al menos 8 caracteres.'});

    const tokenHash = sha256(token);

    const { rows } = await pool.query(`
      SELECT id, reset_pw_token, reset_pw_token_expires_at
      FROM users
      WHERE reset_pw_token = $1`, [tokenHash]);

      if (rows.length === 0) return res.status(400).json({ msg: 'El enlace expiró, reintenta nuevamente.'});

      const user = rows[0];

      const newHash = await hashPassword(password);

      await pool.query('BEGIN');
      try {
        await updatePasswordRecovery(newHash, password, user.id);
        await pool.query('COMMIT');
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      };

      return res.status(200).json({ msg: 'Contraseña actualizada. Ya podés iniciar sesión.'});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Ocurrió un error al restablecer la contraseña.'});
  }
}