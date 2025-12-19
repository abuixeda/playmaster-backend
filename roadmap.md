# Roadmap to Production - PlayMaster Backend

**Estimated Completion:** 80%
> The current backend has the "skeleton" and infrastructure (Auth, Database, Basic APIs, Wallet Ledger), but lacks the deep game logic and real-time capabilities needed for a smooth player experience.

## 1. Core Game Logic (Critical)
- [x] **Truco Engine**: Implement full rules (Envido, Real Envido, Falta Envido, Flor, counting points, hands).
- [ ] **Chess Engine**: Integrate a library like `chess.js` to validate legal moves, checkmate, stalemate.
- [ ] **Pool Engine**: Define turn logic and ball state management (simplified or physics-based).
- [ ] **Turn Management**: Enforce time limits per turn to prevent stalling.

## 2. Real-Time Communication (Critical)
- [x] **WebSockets**: Implement `Socket.io` or `Fastify-Websocket`.
    - *Why?* Currently, players must refresh to see moves. Sockets allow instant updates.
- [x] **Game Rooms**: Logic to broadcast events (Move made, Game End) only to players in the specific room.

## 3. Financial Integration
- [x] **Payment Gateway**: Integrate Stripe, MercadoPago, or Crypto for *real* deposits.
- [ ] **Withdrawals**: System for users to request payouts and admins to approve them.
- [ ] **Security**: prevent race conditions in betting (already partially handled by BetLock, but needs stress testing).

## 4. Platform Features
- [x] **Matchmaking**: "Quick Play" button to find an opponent automatically vs. listing rooms.
- [ ] **Chat**: In-game chat for players.
- [ ] **Admin Backoffice**: API endpoints for you to ban users, refund bets, view stats.

## 5. Security & Infrastructure
- [ ] **Input Validation**: Add `zod` schemas for all endpoints to prevent bad data.
- [ ] **Rate Limiting**: Fine-tune rate limits to prevent DDoS.
- [ ] **Deployment**: Dockerize the application for easy hosting (AWS/DigitalOcean).
