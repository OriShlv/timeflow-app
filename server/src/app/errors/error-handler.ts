import { Request, Response, NextFunction } from 'express';
import { HttpError } from './http-error';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // HttpError - return as-is
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      ok: false,
      error: err.code,
      ...(isDevelopment && {
        debug: {
          message: err.message,
          path: req.path,
        },
      }),
    });
  }

  const errObj = err as Error;
  const errorDetails = {
    path: req.path,
    method: req.method,
    errorName: errObj?.constructor?.name,
    errorMessage: errObj?.message,
    errorStack: errObj?.stack,
    timestamp: new Date().toISOString(),
  };

  // eslint-disable-next-line no-console
  console.error('[ERROR HANDLER]', errorDetails);
  // eslint-disable-next-line no-console
  console.error('[ERROR HANDLER] Full error:', err);

  res.status(500).json({
    ok: false,
    error: 'InternalServerError',
    ...(isDevelopment && {
      debug: {
        errorName: errorDetails.errorName,
        errorMessage: errorDetails.errorMessage,
        path: errorDetails.path,
      },
    }),
  });
}
