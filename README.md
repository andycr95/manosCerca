# Manos Cerca

Aplicación de gestión de ayudas comunitarias. Incluye el panel interno, un formulario público y catálogo territorial de Colombia basado en DIVIPOLA.

## Entorno local

Requisitos: Node.js 20+ y Docker Desktop.

```bash
npm install
npm run db:up
npm run db:push
npm run db:seed
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). El formulario público está en [http://localhost:3000/solicitar-ayuda](http://localhost:3000/solicitar-ayuda).

PostgreSQL se ejecuta de manera aislada en el contenedor `turahelp-postgres`, accesible en el puerto `5434`. La cadena de conexión local está en `.env`; no la uses en producción.

## Datos locales incluidos

- 33 departamentos y 1.122 entidades DIVIPOLA.
- Barrios de Buenaventura por localidad y comuna.
- Corregimientos y veredas de Buenaventura.
- Usuarios de demostración, categorías y solicitudes semilla.

## Comandos útiles

```bash
npm run db:reset  # reconstruye y vuelve a sembrar la base local
npm run db:down   # detiene PostgreSQL local
npm run lint
npm run build
```

El formulario público usa `POST /api/public-requests` y persiste la solicitud en PostgreSQL.

## Acceso local

El panel interno requiere una sesión. El seed crea estas cuentas de prueba:

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Superadministrador | `1000000001` | valor de `SUPERADMIN_PASSWORD` en `.env` |
| Administradora | `1000000002` | `Colabora2026!` |
| Líder | `1000000003` | `Colabora2026!` |
| Colaboradora | `1000000004` | `Colabora2026!` |

La contraseña y `AUTH_SECRET` locales no deben usarse en producción. Define valores nuevos y seguros antes de desplegar.
