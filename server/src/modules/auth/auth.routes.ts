import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { register } from './auth.controller.js';
import { registerSchema } from './auth.schemas.js';

const router = Router();

router.post('/register', validate(registerSchema), register);

export default router;
