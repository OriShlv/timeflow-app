import { Request, Response, NextFunction } from "express";

export function errorHandler(
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction
) {
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

    // In development, include error details in response for debugging
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
        ok: false,
        error: "InternalServerError",
        ...(isDevelopment && {
            debug: {
                errorName: errorDetails.errorName,
                errorMessage: errorDetails.errorMessage,
                path: errorDetails.path,
            }
        })
    });
}
