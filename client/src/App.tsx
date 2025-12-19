import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

// Layout & Views
import { Layout } from './components/layout/Layout';
import { BottomNav } from './components/layout/BottomNav';
import { GameHub } from './components/views/GameHub';

// Game Components
import { GameTable } from './components/GameTable';
import { ChessGame } from './components/ChessGame';
import { RPSGame } from './components/RPSGame';
import { PoolGame } from './components/PoolGame';
import { Profile } from './components/Profile';
import { SimulationPayment } from './components/SimulationPayment';
import { AdminDashboard } from './components/views/AdminDashboard';

// Connect to backend (assuming port 3005)
const token = localStorage.getItem('token');
const socket: Socket = io('http://localhost:3005', {
  auth: { token }
});

function App() {
  const [gameState, setGameState] = useState<any>(null);
  const [playerId, setPlayerId] = useState<string>(() => {
    // Auto-load ID if authenticated to fix Matchmaking race condition
    try {
      const u = localStorage.getItem('user');
      if (u) return JSON.parse(u).id;
    } catch (e) { }
    return '';
  });
  const [gameId, setGameId] = useState<string>('');

  // View State
  const [currView, setCurrView] = useState<string>('LOBBY'); // LOBBY, EXPLORE, PROFILE, GAME

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('game_state', (state) => {
      console.log("Game State Update:", state);
      setGameState(state);
      if (state.gameId) setGameId(state.gameId);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('game_state');
    };
  }, []);

  // Automatic routing based on GameState
  useEffect(() => {
    if (gameState) {
      setCurrView('GAME');
    } else if (currView === 'GAME') {
      // If game ended, go back to Lobby
      setCurrView('LOBBY');
    }
  }, [gameState, currView]);

  const handleJoinGame = (gid: string, pid: string, type: string = "TRUCO") => {
    setPlayerId(pid);
    setGameId(gid);
    socket.emit('join_game', { gameId: gid, playerId: pid, gameType: type });
  };

  // Simple Router Logic for Sim
  const path = window.location.pathname;
  if (path === '/simulate_payment') {
    return <SimulationPayment />;
  }

  const renderGame = () => {
    if (!gameState) return null;

    // NOTE: Old games might need adjustments for dark theme but we leave them as is for now.
    if (gameState.gameType === 'CHESS') {
      return <ChessGame gameState={gameState} playerId={playerId} gameId={gameId} socket={socket} />;
    }
    if (gameState.gameType === 'POOL') {
      return <PoolGame gameState={gameState} playerId={playerId} gameId={gameId} socket={socket} />;
    }
    // RPS Hack Check
    if (gameState.players && Object.values(gameState.players).some((p: any) => (p as any).choice !== undefined)) {
      return <RPSGame gameState={gameState} playerId={playerId} gameId={gameId} socket={socket} />;
    }
    return <GameTable gameState={gameState} playerId={playerId} gameId={gameId} socket={socket} />;
  };

  // Main UI Router
  const renderView = () => {
    switch (currView) {
      case 'LOBBY':
        return <GameHub onJoin={handleJoinGame} socket={socket} />;
      case 'PROFILE':
        // Wrap old Profile in a generic container
        return (
          <div className="pt-8 px-4 h-full relative z-20">
            <Profile onBack={() => setCurrView('LOBBY')} onAdmin={() => setCurrView('ADMIN')} />
          </div>
        );
      case 'EXPLORE':
        return <div className="p-4 text-center mt-20">Explorar (Próximamente)</div>;
      case 'CHAT':
        return <div className="p-4 text-center mt-20">Chat Global (Próximamente)</div>;

      // ... existing imports ...

      // ... inside renderView ...
      case 'ADMIN':
        return <AdminDashboard onBack={() => setCurrView('LOBBY')} />;
      case 'CREATE':
        return <GameHub onJoin={handleJoinGame} socket={socket} />;
      default:
        return <GameHub onJoin={handleJoinGame} socket={socket} />;
    }
  };

  // If in GAME, show Game (Fullscreen, no Layout/Nav usually to maximize space)
  if (currView === 'GAME') {
    return (
      <div className="bg-[--color-page-dark] min-h-screen text-white">
        {renderGame()}
      </div>
    );
  }

  return (
    <Layout>
      {renderView()}
      <BottomNav currentView={currView} onChangeView={setCurrView} />
    </Layout>
  );
}

export default App;
