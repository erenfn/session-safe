/* eslint-disable no-unused-vars */
import { ErrorRequestHandler } from 'express';
import HTTP_STATUS_CODES from '../utils/httpCodes';
import { response } from '../utils/response.helper';
import StatusError from '../utils/statusError';

const env = process.env.NODE_ENV;

const errorMiddleware: ErrorRequestHandler = (error, req, res, next) => {
  console.error(`${req.method} ${req.path} - Error:`, error);

  if (res.headersSent) return next(error);

  if (error instanceof StatusError) {
    return response({ res, status: error.statusCode, error: error.message });
  }

  if (error instanceof SyntaxError) {
    return response({ res, status: HTTP_STATUS_CODES.BAD_REQUEST, error: 'Invalid JSON payload passed.' });
  }

  if (error.name === 'ValidationError' && error.errors) {
    const messages = Object.values(error.errors).map((err: any) => err.message || String(err));
    return response({ res, status: HTTP_STATUS_CODES.BAD_REQUEST, error: messages.join(', ') });
  }

  if (typeof error !== 'object' || !error) {
    return response({ res, status: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, error: 'Unknown server error' });
  }

  if (env === 'development') {
    return response({ res, status: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, error: error.message });
  }

  return response({ res, status: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, error: 'Internal Server Error' });
};

export default errorMiddleware;
