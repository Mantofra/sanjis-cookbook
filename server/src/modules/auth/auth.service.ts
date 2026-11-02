import argon2 from 'argon2';
import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';
import { UserDocument, UserModel } from '../users/user.model.js';
import { RegisterInput } from './auth.schemas.js';

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
    res.cookie('token', token, {
      httpOnly: true,
      secure: config.isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}

export default new AuthSrv();
