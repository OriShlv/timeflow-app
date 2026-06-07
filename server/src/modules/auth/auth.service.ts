import bcrypt from 'bcrypt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { prisma } from '../../db/prisma';
import { signAccessToken } from '../../core/jwt';
import { HttpError } from '../../app/errors/http-error';
import { USER_PUBLIC_SELECT } from '../users/users.constants';

export async function register(email: string, password: string, name?: string) {
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: { email, name: name ?? null, passwordHash },
      select: USER_PUBLIC_SELECT,
    });

    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    return { user, accessToken };
  } catch (err: unknown) {
    if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new HttpError(409, 'EmailAlreadyExists');
    }

    throw err;
  }
}
export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { ...USER_PUBLIC_SELECT, passwordHash: true },
  });
  if (!user) {
    return null;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return null;
  }

  const { passwordHash: _passwordHash, ...publicUser } = user;
  const accessToken = signAccessToken({ sub: publicUser.id, email: publicUser.email });
  return {
    user: publicUser,
    accessToken,
  };
}
