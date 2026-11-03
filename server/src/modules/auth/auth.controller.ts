import { Request, Response } from 'express';
import authService from './auth.service.js';

export const register = async (req: Request, res: Response) => {
  const user = await authService.registerUser(req.body);
  const token = authService.signToken(user.toObject().id);
  authService.setAuthCookie(res, token);
  res.status(201).json(user);
};

export const login = async (req: Request, res: Response) => {
  const user = await authService.authenticate(req.body.email, req.body.password);
  const token = authService.signToken(user.id);
  authService.setAuthCookie(res, token);

  res.status(200).json(user);
};

export const logout = async (_req: Request, res: Response) => {
  authService.logout(res);
  res.sendStatus(204);
};

export const me = async (req: Request, res: Response) => {
  const user = await authService.me(req.userId!);
  res.status(200).json(user);
};
