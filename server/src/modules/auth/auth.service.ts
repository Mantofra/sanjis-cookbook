import argon2 from 'argon2';
import { CookieOptions, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';
import { UserDocument, UserModel } from '../users/user.model.js';
import { RegisterInput } from './auth.schemas.js';
import { AppError } from '../../errors/app-error.js';

const cookieOptionS: CookieOptions = {
  httpOnly: true,
  secure: config.isProd,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

export class AuthSrv {
  async registerUser(input: RegisterInput): Promise<UserDocument> {
    const user = {
      email: input.email,
      passwordHash: await argon2.hash(input.password),
      displayName: input.displayName,
    };
    return await UserModel.create(user);
  }

  signToken(userId: string): string {
    return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '7d' });
  }

  setAuthCookie(res: Response, token: string): void {
    res.cookie('token', token, cookieOptionS);
  }

  async authenticate(email: string, password: string): Promise<UserDocument> {
    const user = await UserModel.findOne({ email }).select('+passwordHash');
    if (!user) throw new AppError(401, 'Invalid email or password');

    const match = await argon2.verify(user.passwordHash, password);
    if (match) {
      return user;
    } else {
      throw new AppError(401, 'Invalid email or password');
    }
  }

  logout(res: Response): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { maxAge, ...clearOptions } = cookieOptionS;
    res.clearCookie('token', clearOptions);
    return;
  }

  async me(userId: string): Promise<UserDocument> {
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError(401, 'User not found');
    return user;
  }
}

export default new AuthSrv();
