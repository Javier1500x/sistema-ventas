# Backend del Motor de Decisiones

Este directorio contiene un servidor Node.js con Express y una base de datos SQLite, diseñado para complementar el frontend de React del sistema de ventas.

## Arquitectura

- **`server.js`**: El punto de entrada del servidor Express. Define los endpoints de la API.
- **`database.js`**: Gestiona la conexión con la base de datos SQLite (`inventory.db`) y la creación de las tablas.
- **`decisionEngine.js`**: Contiene la lógica principal para analizar el historial de ventas y el inventario actual para generar insights.
- **`inventory.db`**: El archivo de la base de datos SQLite. Se crea automáticamente.

## API Endpoints

- `POST /api/record-sale`
  - Registra una venta individual en la tabla `sales_history`.
  - **Body (JSON):** `{ "productId": "...", "productName": "...", "quantity": ..., "price": ... }`

- `POST /api/insights`
  - Analiza el estado del inventario y el historial para devolver recomendaciones.
  - **Body (JSON):** `{ "currentProducts": [...] }` (Se debe enviar la lista completa de productos del frontend).
  - **Respuesta (JSON):** Un objeto que contiene `lowStockAlerts`, `fastMovers`, y `slowMovers`.

## Cómo Empezar

El proyecto principal ha sido configurado para ejecutar este backend simultáneamente con el frontend.

Para iniciar ambos servicios, ejecuta el siguiente comando desde el directorio **raíz** del proyecto:

```bash
npm run dev
```

Esto utilizará `concurrently` para lanzar el servidor de Vite (frontend) y el servidor de Node.js (backend) al mismo tiempo.
