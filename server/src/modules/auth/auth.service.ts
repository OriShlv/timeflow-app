import bcrypt from 'bcrypt';
import { prisma } from '../../db/prisma';
import { signAccessToken } from '../../core/jwt';
import { Prisma } from '@prisma/client';
import { HttpError } from '../../app/errors/http-error';

export async function register(email: string, password: string, name?: string) {
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: { email, name: name ?? null, passwordHash },
      select: { id: true, email: true, name: true },
    });

    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    return { user, accessToken };
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new HttpError(409, 'EmailAlreadyExists');
    }

    throw err;
  }
}
export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return null;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return null;
  }

  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  return {
    user: { id: user.id, email: user.email, name: user.name },
    accessToken,
  };
}
