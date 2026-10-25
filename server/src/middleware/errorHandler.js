import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  // If response has already started streaming, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong. Please try again.';
  let errors = err.errors || null;
  let code = err.code || null;

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Resource not found.';
    errors = null;
    code = 'NOT_FOUND';
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed.';
    errors = Object.keys(err.errors).map((field) => ({
      field,
      message: err.errors[field].message,
    }));
  }

  // Handle Mongo duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `An entry with this ${field} already exists.`;
    errors = [{ field, message }];
    code = 'DUPLICATE_KEY';
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation failed.';
    errors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token. Please sign in again.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expired. Please sign in again.';
  }

  // In production, do not leak internal 500 error messages or stack traces
  if (env.NODE_ENV === 'production' && statusCode === 500 && !(err instanceof AppError)) {
    message = 'Internal server error. Please try again later.';
    errors = null;
  }

  if (statusCode >= 500) {
    console.error('Unhandled server error:', err);
  }

  const response = { message };
  if (errors) response.errors = errors;
  if (code) response.code = code;
  if (env.NODE_ENV === 'development' && statusCode === 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

export default errorHandler;
