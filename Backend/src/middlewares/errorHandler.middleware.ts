import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../utils/AppError';

interface MySQLError extends Error {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
}

export const errorHandler: ErrorRequestHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);
  let status = err.status && typeof err.status === 'string' ? err.status : 'error';
  let errorCode = err.errorCode || err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'Ha ocurrido un error inesperado';
  let isOperational = Boolean(err.isOperational);

  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Manejo especializado de errores comunes de MySQL
  const mysqlErr = err as MySQLError;
  if (mysqlErr.code === 'ER_DUP_ENTRY' || mysqlErr.errno === 1062) {
    statusCode = 409;
    status = 'fail';
    errorCode = 'DUPLICATE_ENTRY';
    message = 'El registro o valor proporcionado ya existe en el sistema.';
    isOperational = true;
  } else if (mysqlErr.code === 'ER_NO_REFERENCED_ROW_2' || mysqlErr.code === 'ER_NO_REFERENCED_ROW' || mysqlErr.errno === 1452) {
    statusCode = 400;
    status = 'fail';
    errorCode = 'FOREIGN_KEY_VIOLATION';
    message = 'El recurso o entidad referenciada no existe.';
    isOperational = true;
  } else if (mysqlErr.code === 'ER_ROW_IS_REFERENCED_2' || mysqlErr.errno === 1451) {
    statusCode = 409;
    status = 'fail';
    errorCode = 'RECORD_IN_USE';
    message = 'No se puede eliminar o modificar el registro porque está vinculado a otros recursos.';
    isOperational = true;
  }

  // 2. Manejo de errores de JWT
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    status = 'fail';
    errorCode = 'INVALID_TOKEN';
    message = 'Token de autenticación inválido o manipulado.';
    isOperational = true;
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    status = 'fail';
    errorCode = 'TOKEN_EXPIRED';
    message = 'La sesión ha expirado. Por favor, inicia sesión nuevamente.';
    isOperational = true;
  }

  // 3. Manejo de sintaxis JSON inválida en requests
  if (err instanceof SyntaxError && 'body' in err && (err as any).type === 'entity.parse.failed') {
    statusCode = 400;
    status = 'fail';
    errorCode = 'INVALID_JSON_BODY';
    message = 'El cuerpo de la solicitud no es un JSON válido.';
    isOperational = true;
  }

  // 4. Logging obligatorio de errores no operacionales (Infraestructura / Bugs)
  if (!isOperational || statusCode >= 500) {
    console.error('CRITICAL ERROR 💥', err);
  }

  // 5. En producción, suprimir detalles internos y trazas
  if (isProduction && !isOperational) {
    message = 'Ha ocurrido un error inesperado en el servidor.';
    errorCode = 'INTERNAL_SERVER_ERROR';
  }

  const responseBody: Record<string, any> = {
    status: 'error',
    code: errorCode,
    message,
    error: message, // Compatibilidad retroactiva con clientes anteriores//
  };

  if (!isProduction && err.stack) {
    responseBody.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
};

export default errorHandler;
