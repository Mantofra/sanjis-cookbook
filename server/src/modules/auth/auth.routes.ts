import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { login, logout, me, register } from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.schemas.js';
import { requireAuth } from '../../middleware/require-auth.js';

const router = Router();

router.get('/me', requireAuth, me);

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', requireAuth, logout);

export default router;
