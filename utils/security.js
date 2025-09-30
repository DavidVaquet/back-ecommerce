import bcrypt from "bcryptjs";
import crypto from 'crypto';
const saltos = 12;

export const hashPassword = (pw) => {
    return bcrypt.hash(pw, saltos);
}

export const verifyPassword = (pw, pwhash) => {
    return bcrypt.compare(pw, pwhash);
};

export const generarHashToken = (saltos = 30) => {
    return crypto.randomBytes(saltos).toString('hex');
};

export function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}
