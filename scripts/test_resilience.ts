
import { GameRepository } from '../src/repositories/GameRepository';
import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('--- RESILIENCE TEST START ---');
    const gameId = `resilience_test_${Date.now()}`;

    // 1. Simulate Server Running: Create and Update Game
    console.log(`1. Creating Game ${gameId} in DB...`);
    await GameRepository.createWithId(gameId, 'TRUCO');

    // Simulate some moves modifying state
    const complexState = {
        scoreA: 15,
        scoreB: 10,
        turn: 'player1',
        cards: ['1E', '7O']
    };

    console.log('2. Simulating gameplay (State Update)...');
    await GameRepository.updateState(gameId, complexState);
    console.log('   State saved to DB.');

    // 2. Simulate "Server Crash" (Memory Loss)
    console.log('3. Simulating Server Crash (Nothing in memory)...');
    // In a real server, 'sessions' would be empty now.

    // 3. Simulate "Server Restart" and Recovery
    console.log('4. Server Restart & Recovery (Fetching from DB)...');
    const recoveredGame = await GameRepository.findById(gameId);

    if (!recoveredGame) {
        throw new Error('FAILED: Game not found in DB after crash simulation.');
    }

    const recoveredState: any = recoveredGame.gameState;

    // 4. Verification
    console.log('5. Verifying Recovered State...');
    console.log('   Original ScoreA:', complexState.scoreA);
    console.log('   Recovered ScoreA:', recoveredState.scoreA);

    if (recoveredState.scoreA === complexState.scoreA && recoveredState.turn === complexState.turn) {
        console.log('✅ SUCCESS: State recovered correctly.');
    } else {
        console.error('❌ FAILED: State mismatch.', recoveredState);
        process.exit(1);
    }

    console.log('--- RESILIENCE TEST PASSED ---');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
