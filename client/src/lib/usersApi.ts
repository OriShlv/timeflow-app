import { apiRequest } from './apiClient';
import type { AuthUser } from './types';

export type UserMeResponse = {
  ok: boolean;
  user: AuthUser;
};

export type UpdateUserSettingsBody = {
  name?: string | null;
  timezone?: string;
  language?: string;
};

export async function getMe(): Promise<AuthUser> {
  const response = await apiRequest<UserMeResponse>({
    method: 'GET',
    path: '/users/me',
    body: undefined,
    includeAuth: true,
  });
  return response.user;
}

export async function updateUserSettings(body: UpdateUserSettingsBody): Promise<AuthUser> {
  const response = await apiRequest<UserMeResponse>({
    method: 'PATCH',
    path: '/users/me/settings',
    body,
    includeAuth: true,
  });
  return response.user;
}
