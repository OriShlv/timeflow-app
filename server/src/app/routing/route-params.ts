import { HttpError } from '../errors/http-error';

export function getRequiredRouteParam(
  params: Record<string, string | string[] | undefined>,
  name: string,
): string {
  const value = params[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new HttpError(400, 'InvalidRouteParam', `Missing or invalid route parameter: ${name}`);
  }
  return value;
}
