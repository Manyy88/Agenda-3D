# RADAR DE AGENDA 3D · AUTOCOM WAY

MVP para Google Apps Script y Google Sheets. Una pantalla, tres cifras de agenda y una acción breve cuando existe déficit.

## Ver la pantalla

Abre `Vista-previa.html` en un navegador. Es la misma interfaz, con cálculos funcionales; no guarda datos. El guardado funciona en la Web App después de instalarla.

## Instalar una sola vez

1. Crea una hoja de Google Sheets para recibir los registros.
2. En esa hoja, abre **Extensiones → Apps Script**.
3. Sustituye el contenido de `Code.gs` por el archivo incluido.
4. Crea dos archivos HTML llamados exactamente `Index` y `Logic`; pega el contenido de `Index.html` y `Logic.html`, respectivamente. No instales `Vista-previa.html`.
5. En **Configuración del proyecto**, activa la visualización de `appsscript.json` y sustituye su contenido por el archivo incluido. La zona horaria inicial es `America/Mexico_City`; ajústala si la operación corresponde a otra zona.
6. Guarda y ejecuta **configurar** una vez desde el editor. Autoriza el acceso a la hoja. Se crea la pestaña **Radar** y se vincula su archivo como destino de los registros.
7. Selecciona **Implementar → Nueva implementación → Aplicación web**. Ejecutar como: propietario de la aplicación. Acceso: usuarios autorizados de la organización, según las opciones disponibles de Google Workspace. No habilites acceso público anónimo.
8. Comparte la URL terminada en `/exec` con las agencias autorizadas. Todas utilizan la misma aplicación y la misma base.

Antes de distribuir, guarda un Radar de prueba desde la URL y verifica una fila en la pestaña Radar. Este paso requiere tu entorno de Google; no se ha ejecutado desde aquí. Las pruebas locales del servidor utilizan servicios simulados.

## Uso

Introduce el objetivo mensual de ventas y el número de APV. Captura las citas agendadas para cada fecha. Si existe déficit, escribe una acción breve y pulsa **Guardar Radar**. El formulario conserva las cifras en la sesión abierta; al recargar deben capturarse nuevamente. No contiene identificación de agencia ni gerente, conforme al alcance aprobado.

## Cálculo aprobado

- Citas mensuales = objetivo de ventas × 8 (50% de asistencia y 25% de conversión a venta).
- Días operativos: lunes a sábado del mes; incluye festivos, omite domingos.
- Objetivo diario de agencia: citas mensuales / días operativos, redondeado hacia arriba.
- Referencia por APV: objetivo diario de agencia / APV, mostrada con un decimal.
- Brecha: agendadas − objetivo diario.
- D+1 / D+2 / D+3: siguientes tres días operativos, sin incluir hoy.
- Cruce de mes: se solicita el objetivo de cada mes representado; no se arrastra automáticamente el anterior.
- APV no modifica el objetivo total. Objetivo cero es válido y produce objetivo diario cero.

El objetivo redondeado puede generar una exigencia mensual ligeramente mayor que ventas × 8. No se redondea la conversión a 13%.

## Datos guardados

Una fila con identificador técnico (evita duplicados al reintentar), fecha/hora, fecha de revisión, zona horaria, APV, y para cada fecha: objetivo mensual utilizado, días operativos, objetivo diario, agendadas y brecha; al final, la acción. No almacena clientes, responsables ni compromisos estructurados.

El servidor vuelve a calcular los resultados, valida las entradas, serializa las escrituras simultáneas y trata la acción como texto. Los errores de guardado son visibles y permiten reintentar. Si cambia el día con la pantalla abierta, solicita recargar.

## Archivos

- `Code.gs`: lectura de contexto, validación y guardado.
- `Index.html`: pantalla y comportamiento.
- `Logic.html`: calendario y fórmulas compartidos por pantalla y servidor.
- `appsscript.json`: configuración de Apps Script.
- `Vista-previa.html`: vista local sin conexión de guardado.

## Referencias técnicas

- https://developers.google.com/apps-script/guides/html/communication
- https://developers.google.com/apps-script/guides/web
- https://developers.google.com/apps-script/reference/lock/

## Validación realizada

Pruebas locales aprobadas: fórmulas, APV, campos vacíos, domingo, cruce de mes y año, febrero bisiesto, objetivo cero, acción obligatoria, guardado simulado, protección contra fórmulas y reintentos duplicados. No se completó la revisión visual automatizada por falta de navegador disponible. La conexión y el guardado real en Google Sheets están pendientes de la instalación.
