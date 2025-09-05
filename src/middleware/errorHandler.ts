import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);

  const response: ApiResponse = {
    success: false,
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  };

  res.status(500).json(response);
};

export const notFoundHandler = (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: false,
    error: `Route ${req.originalUrl} not found`
  };
  res.status(404).json(response);
};
