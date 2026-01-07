import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export type JwtPayload = { sub: string; email: string };

const secret: Secret = env.JWT_SECRET;

export function signAccessToken(payload: JwtPayload) {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
  };

  return jwt.sign(payload, secret, options);
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, secret) as JwtPayload;
}
