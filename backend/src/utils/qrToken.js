import jwt from 'jsonwebtoken';

const QR_SECRET = process.env.QR_SECRET || (process.env.JWT_SECRET || 'fallback-secret') + '-qr';

export const createQRToken = (payload, expiresInSeconds = 300) => {
  return jwt.sign(payload, QR_SECRET, { expiresIn: expiresInSeconds });
};

export const verifyQRToken = (token) => {
  return jwt.verify(token, QR_SECRET);
};

export default { createQRToken, verifyQRToken };


