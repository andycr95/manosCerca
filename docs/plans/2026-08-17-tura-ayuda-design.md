# Manos Cerca — diseño inicial del MVP

## Decisión de producto

La primera versión pone la operación en campo antes que la administración. La pantalla de inicio responde en segundos a las preguntas de coordinación: qué casos son urgentes, cuáles no tienen responsable, qué entregas están próximas y qué pasó recientemente. Desde cualquier tamaño de pantalla la acción primaria es registrar una solicitud.

La interfaz usa una dirección cálida y territorial: verde profundo, crema y acentos coral y ámbar. La tipografía editorial para los encabezados comunica cercanía, mientras que la tipografía de interfaz mantiene los datos escaneables. No se usa una estética de ERP ni gráficos que oculten el trabajo importante.

## Alcance implementado

- Dashboard responsive con indicadores, urgencias y actividad.
- Búsqueda por código, beneficiario, sector o necesidad.
- Filtro operativo por estado.
- Navegación de escritorio y navegación inferior móvil.
- Composición rápida de una solicitud desde el botón principal.
- Datos de ejemplo representativos de los estados, prioridades, sectores y responsables del MVP.

## Canal público de solicitudes

La ruta `/solicitar-ayuda` está deliberadamente separada del espacio de trabajo del equipo. No solicita una cuenta, contraseña, documento de identidad ni dirección exacta. Primero pide una elección simple: solicitar para sí o la familia, o solicitar como líder para otra persona o comunidad. La misma conversación continúa en tres pantallas cortas: contacto, necesidad y ubicación.

El flujo usa lenguaje cotidiano, muestra solo una tarea por pantalla, permite seleccionar necesidades con botones grandes y explica por qué se piden los datos. Al enviarlo, entrega un código de seguimiento visible. También incluye un teléfono de asistencia y una advertencia de seguridad para reducir el riesgo de estafas.

## Catálogo territorial

El formulario público usa el catálogo nacional DIVIPOLA de DANE, descargado desde Datos Abiertos Colombia el 17 de agosto de 2026. La copia incluida contiene 1.122 entidades municipales, distritales, islas y áreas no municipalizadas de los 33 departamentos; cada registro mantiene los códigos DIVIPOLA oficiales. La selección es encadenada: departamento, municipio y tipo de zona (urbana o rural).

Para Buenaventura, la zona urbana muestra barrios agrupados por las localidades Isla de la Paz y El Pailón, además de comuna. La zona rural solicita corregimiento y después vereda. La lista local se elaboró a partir del Anuario Estadístico de Buenaventura 2014–2018, de la Oficina Asesora de Planeación y Ordenamiento Territorial, que reporta 258 veredas. Se debe programar una actualización anual del archivo DIVIPOLA y conciliar altas o cambios de barrios y veredas con Planeación Distrital antes de producción.

## Acceso y seguridad inicial

El espacio de trabajo interno se protege con una sesión firmada y almacenada en una cookie `HttpOnly`, con vigencia de 12 horas, `SameSite=Lax` y atributo `Secure` en producción. La ruta pública `/solicitar-ayuda` y su endpoint permanecen sin autenticación para no impedir el acceso ciudadano. Las rutas internas se redirigen a `/login` cuando no existe una sesión válida.

Los roles son `SUPERADMIN`, `ADMIN`, `LEADER` y `COLLABORATOR`. La autorización se verifica nuevamente en rutas sensibles del servidor; por ejemplo, la administración de usuarios devuelve 403 a colaboradores. El seed crea un superadministrador local con contraseña BCrypt tomada de `SUPERADMIN_PASSWORD`, nunca como texto plano en la base de datos.

## Siguiente incremento técnico

El modelo de datos debe materializarse en Prisma/PostgreSQL por los dominios `users`, `locations`, `beneficiaries`, `requests`, `deliveries` y `audit`. Las rutas de solicitud, detalle, entrega e importación se conectarán mediante Server Actions validadas con Zod; autenticación y autorización se añaden antes de exponer cambios de información. La UI creada en esta entrega se usará como la capa de presentación de ese flujo.
