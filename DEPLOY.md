# Guía de Despliegue con Docker

Este proyecto ya está configurado para ser desplegado fácilmente usando Docker.

## Prerrequisitos
- Tener [Docker](https://www.docker.com/products/docker-desktop/) instalado.
- Tener el archivo `.env` configurado con la URL de la base de datos (`DATABASE_URL`).

## Ejecución Local (Docker Compose)
Para levantar el servidor rápidamente sin instalar Node.js localmente:

```bash
docker-compose up --build
```

El servidor estará disponible en `http://localhost:3000`.

## Despliegue Manual (Build & Run)
Si deseas construir la imagen manualmente para subirla a un registro (AWS ECR, Docker Hub):

1. **Construir la imagen**:
   ```bash
   docker build -t playmaster-backend .
   ```

2. **Ejecutar el contenedor**:
   ```bash
   docker run -p 3000:3000 --env-file .env playmaster-backend
   ```
