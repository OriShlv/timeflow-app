import { prisma } from '../../db/prisma';
import { HttpError } from '../../app/errors/http-error';
import { USER_PUBLIC_SELECT } from './users.constants';
import type { UpdateUserSettingsInput } from './users.schemas';

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_PUBLIC_SELECT,
  });

  if (user === null) {
    throw new HttpError(404, 'UserNotFound');
  }

  return user;
}

export async function updateUserSettings(userId: string, input: UpdateUserSettingsInput) {
  const data: {
    name?: string | null;
    timezone?: string;
    language?: string;
  } = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.timezone !== undefined) {
    data.timezone = input.timezone;
  }
  if (input.language !== undefined) {
    data.language = input.language;
  }

  if (Object.keys(data).length === 0) {
    return getUserProfile(userId);
  }

  try {
    return await prisma.user.update({
      where: { id: userId },
      data,
      select: USER_PUBLIC_SELECT,
    });
  } catch {
    throw new HttpError(404, 'UserNotFound');
  }
}
