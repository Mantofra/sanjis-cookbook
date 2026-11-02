import { Request, Response } from 'express';
import authService from './auth.service.js';

export const register = async (req: Request, res: Response) => {
  const user = await authService.registerUser(req.body);
  const token = authService.signToken(user.toObject().id);
  authService.setAuthCookie(res, token);
  res.status(201).json(user);
};
