import { Request, Response, NextFunction, RequestHandler } from 'express';

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * Higher-order function que envuelve handlers asíncronos y canaliza
 * cualquier promesa rechazada directamente al middleware global de errores (next(err)).
 */
export const catchAsync = (fn: AsyncRequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
};

export default catchAsync;
