// @ts-ignore
import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_dev_key';

export class AuthService {

    async register(email: string, password: string, name?: string) {
        // Check if user exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new Error('User already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Transaction: Create User -> Create Default Workspace -> Link User
        // Actually, schema allows User to be created without Workspace, then linked.
        // But better to do it in one go.

        const result = await prisma.$transaction(async (tx: any) => {
            // 1. Create Workspace
            const workspace = await tx.workspace.create({
                data: {
                    name: `${name || email}'s Workspace`
                }
            });

            // 2. Create User linked to Workspace
            const user = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    workspaceId: workspace.id
                }
            });

            return user;
        });

        // Return token
        return this.generateToken(result);
    }

    async login(email: string, password: string) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new Error('Invalid credentials');
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            throw new Error('Invalid credentials');
        }

        return {
            token: this.generateToken(user),
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                workspaceId: user.workspaceId
            }
        };
    }

    private generateToken(user: User) {
        return jwt.sign(
            { userId: user.id, email: user.email, workspaceId: user.workspaceId },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
    }

    verifyToken(token: string) {
        return jwt.verify(token, JWT_SECRET);
    }

    async updateProfile(userId: string, data: { name?: string, password?: string, oldPassword?: string }) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const updateData: any = {};
        if (data.name) updateData.name = data.name;

        if (data.password) {
            if (!data.oldPassword) throw new Error('Old password required to set new password');
            const valid = await bcrypt.compare(data.oldPassword, user.password);
            if (!valid) throw new Error('Invalid old password');
            updateData.password = await bcrypt.hash(data.password, 10);
        }

        return await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: { id: true, email: true, name: true, workspaceId: true }
        });
    }
}
