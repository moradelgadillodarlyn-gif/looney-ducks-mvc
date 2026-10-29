# Club Deportivo Looney Ducks — Versión MVC

## Arquitectura MVC

```
backend/
├── app.js                    ← punto de entrada (antes server.js)
├── config/
│   └── db.js                  ← conexión MySQL (pool de promesas)
├── models/                    ← acceso a datos (consultas SQL)
│   ├── usuarioModel.js
│   ├── jugadorModel.js
│   └── pagoModel.js
├── controllers/               ← lógica de negocio
│   ├── authController.js
│   ├── usuarioController.js
│   ├── jugadorController.js
│   └── pagoController.js
├── routes/                    ← definición de endpoints
│   ├── authRoutes.js
│   ├── usuarioRoutes.js
│   ├── jugadorRoutes.js
│   └── pagoRoutes.js
├── middlewares/
│   └── auth.js                ← requireAuth, requireAdmin
├── utils/
│   └── auth.js                ← hasheo de contraseñas
├── create-admin.js
├── schema.sql
├── package.json
└── .env.example
frontend/
├── index.html
├── css/style.css
└── js/app.js
```

**Vista (View)** = `frontend/` — HTML + CSS + JS que consume la API.
**Controlador (Controller)** = `backend/controllers/` — recibe la petición, valida, llama al modelo, responde.
**Modelo (Model)** = `backend/models/` — únicos archivos que hablan directo con MySQL.

## Eliminación lógica

**`estado = 0` → registro ACTIVO (se muestra)**
**`estado = 1` → registro ELIMINADO (se oculta, pero sigue en la BD)**

Todas las consultas `SELECT` de los modelos filtran con `WHERE estado = 0`.
Los métodos `.remove()` de cada controlador **no usan `DELETE FROM`** — hacen
`UPDATE ... SET estado = 1`, así que el dato nunca se pierde de verdad.

## Instalación

```bash
cd backend
npm install
mysql -u root -p < schema.sql
cp .env.example .env      # edita con tus datos reales de MySQL
node create-admin.js admin MiClaveSegura123 Juan Perez Lopez 12345678 70011122 Admin
npm start
```

Abre **http://localhost:3000**.

## Endpoints disponibles

| Método | Ruta | Protegida | Descripción |
|---|---|---|---|
| POST | `/api/login` | No | Iniciar sesión |
| POST | `/api/logout` | No | Cerrar sesión |
| GET | `/api/sesion` | No | Ver si hay sesión activa |
| POST | `/api/cambiar-clave` | Sí | Cambiar tu propia contraseña |
| GET | `/api/jugadores` | No | Listar jugadores activos |
| POST | `/api/jugadores` | No | Inscribir jugador (público) |
| PUT | `/api/jugadores/:id` | Sí | Editar jugador |
| DELETE | `/api/jugadores/:id` | Sí | Eliminar jugador (lógico) |
| GET | `/api/pagos` | Sí | Listar pagos activos |
| GET | `/api/pagos/matriz/:anio` | Sí | Matriz anual de mensualidades |
| POST | `/api/pagos` | Sí | Registrar un cobro |
| DELETE | `/api/pagos/:id` | Sí | Eliminar pago (lógico) |
| GET | `/api/usuarios` | Sí (Admin) | Listar usuarios de directiva |
| POST | `/api/usuarios` | Sí (Admin) | Crear usuario de directiva |
| PUT | `/api/usuarios/:id` | Sí (Admin) | Editar usuario |
| DELETE | `/api/usuarios/:id` | Sí (Admin) | Eliminar usuario (lógico) |

## Diferencias importantes con la versión anterior

- Ya **no existe** `server.js` — ahora es `app.js`, y la lógica está repartida en `models/`, `controllers/`, `routes/`.
- La tabla `jugadores` **ya no tiene** columnas de pago (`mes_pago`, `monto_pago`, `estado_pago`). Esos datos ahora viven en la tabla `pagos`, relacionada por `jugador_id`.
- Se agregó `usuarios_id` en `jugadores` y `pagos` para saber qué miembro de la directiva registró cada cosa.
- `create-admin.js` ahora pide más datos: nombre, apellidos, CI y celular, según tu nuevo diagrama de `usuarios`.

## Crear un usuario nuevo (además del admin)

```bash
node create-admin.js maria ClaveSegura456 Maria Perez Rojas 87654321 70022233 Tesorero
```

## "Eliminar" y recuperar un registro

Como es eliminación lógica, si borras algo por error, puedes "revivirlo" directamente en MySQL:

```sql
UPDATE jugadores SET estado = 0 WHERE id = 5;
UPDATE pagos SET estado = 0 WHERE id = 12;
UPDATE usuarios SET estado = 0 WHERE id = 2;
```
