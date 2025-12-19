import { prisma } from '../lib/prisma';
import { Game, GamePlayer, GameStatus } from '@prisma/client';

export class GameRepository {

    static async create(typeCode: string): Promise<Game> {
        return prisma.game.create({
            data: {
                typeCode,
                status: 'WAITING',
                gameState: {} // Initial empty state
            }
        });
    }

    static async createWithId(id: string, typeCode: string): Promise<Game> {
        return prisma.game.create({
            data: {
                id,
                typeCode,
                status: 'WAITING',
                gameState: {}
            }
        });
    }

    static async findById(id: string): Promise<(Game & { players: GamePlayer[] }) | null> {
        return prisma.game.findUnique({
            where: { id },
            include: { players: true }
        });
    }

    static async joinGame(gameId: string, userId: string): Promise<GamePlayer> {
        // Enforce max players logic here if needed, or in service
        return prisma.gamePlayer.create({
            data: {
                gameId,
                userId
            }
        });
    }

    static async updateState(gameId: string, newState: any): Promise<Game> {
        return prisma.game.update({
            where: { id: gameId },
            data: {
                gameState: newState
            }
        });
    }

    static async setStatus(gameId: string, status: GameStatus): Promise<Game> {
        return prisma.game.update({
            where: { id: gameId },
            data: { status }
        });
    }
}
