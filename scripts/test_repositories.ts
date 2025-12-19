
import { UserRepository } from '../src/repositories/UserRepository';
import { GameRepository } from '../src/repositories/GameRepository';
import { BetRepository } from '../src/repositories/BetRepository';
import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('--- REPO TEST START ---');

    // 1. User Repo
    const username = `repo_user_${Date.now()}`;
    const user = await UserRepository.create(`${username}@test.com`, username, 'hash');
    console.log('User Created:', user.id);

    // 2. Add Balance
    const updatedWallet = await UserRepository.updateBalance(user.id, 500, 'DEPOSIT');
    console.log('Balance Updated:', updatedWallet.balance);

    // 3. Game Repo
    const game = await GameRepository.create('POOL');
    console.log('Game Created:', game.id);

    const player = await GameRepository.joinGame(game.id, user.id);
    console.log('Joined Game:', player.id);

    // 4. Bet Repo
    try {
        const bet = await BetRepository.placeBet(game.id, user.id, player.id, 100);
        console.log('Bet Placed:', bet.amount, 'Status:', bet.status);
    } catch (e) {
        console.error('Bet Failed:', e);
    }

    // 5. Verify Final Balance
    const finalUser = await UserRepository.findById(user.id);
    console.log('Final Balance:', finalUser?.wallet?.balance); // Should be 400

    console.log('--- REPO TEST SUCCESS ---');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
