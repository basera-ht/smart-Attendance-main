import jwt from 'jsonwebtoken';

const generateToken = (payload, expiresIn = '30d') => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: expiresIn,
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

const generateRefreshToken = (payload, expiresIn = '1d') => {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: expiresIn,
  });
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
};

const generateAccessToken = (payload, expiresIn = '5m') => {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: expiresIn,
  });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
};

export { generateToken, verifyToken, generateRefreshToken, verifyRefreshToken, generateAccessToken, verifyAccessToken };