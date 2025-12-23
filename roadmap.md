# Roadmap to Production - PlayMaster Backend

**Progreso Estimado:** 85%

> La aplicación es funcional y segura, pero faltan características clave de retención (Chat), monetización (Retiros) y anti-trampas (Pool) para ser viable comercialmente.

## 1. Experiencia de Juego (UX/Gameplay)
- [ ] **Chat en Tiempo Real**: Indispensable para interacción social en mesas.
- [ ] **Gestión de Tiempos (Timers)**: Expulsar jugadores AFK (Away From Keyboard) o pasar turno automáticamente.
- [ ] **Reconexión**: Manejo robusto si al usuario se le cae el internet (volver a la mesa).
- [ ] **Pool Anti-Trampas**: Validar en servidor que la blanca no se mueva "mágicamente" (Lógica compleja).

## 2. Economía y Seguridad Financiera
- [ ] **Sistema de Retiros**: Panel para que usuarios soliciten cobrar y admin apruebe.
- [ ] **Transacciones Atómicas**: Tests de estrés para asegurar que no se duplique saldo en apuestas simultáneas.
- [ ] **Historial Detallado**: Vista de "Cajero" para el usuario (Depósitos, Retiros, Apuestas).

## 3. Infraestructura y Mantenimiento
- [ ] **Dockerización**: `Dockerfile` y `docker-compose.yml` para despliegue estándar.
- [ ] **CI/CD**: Pipeline que corra los Tests Automáticos antes de permitir un deploy.
- [ ] **Backups Automáticos**: Configuración de backups de Base de Datos (Postgres).

## 4. Completados Recientemente (Done)
- [x] **Seguridad Base**: Helmet, Rate Limiting, CORS.
- [x] **Validación de Entradas**: Zod Schemas en Auth.
- [x] **Testing Base**: Configuración Vitest + Tests Truco.
