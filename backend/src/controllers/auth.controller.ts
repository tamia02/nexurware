import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export class AuthController {

    async register(req: Request, res: Response) {
        try {
            const { email, password, name } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password required' });
            }
            const token = await authService.register(email, password, name);
            res.status(201).json({ token });
        } catch (error) {
            res.status(400).json({ error: String(error) });
        }
    }

    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;
            console.log(`[Auth] Login attempt for: ${email}`);
            const result = await authService.login(email, password);
            console.log(`[Auth] Login successful for: ${email}`);
            res.json(result);
        } catch (error) {
            console.error(`[Auth] Login failed for ${req.body.email}:`, error);
            res.status(401).json({ error: String(error) });
        }
    }

    async me(req: Request, res: Response) {
        // @ts-ignore
        res.json({ user: req.user });
    }

    async updateProfile(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId;
            const { name, password, oldPassword } = req.body;
            const updatedUser = await authService.updateProfile(userId, { name, password, oldPassword });
            res.json({ user: updatedUser });
        } catch (error) {
            res.status(400).json({ error: String(error) });
        }
    }
}
