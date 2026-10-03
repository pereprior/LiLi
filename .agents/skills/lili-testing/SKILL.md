---
name: lili-testing
description: Crea, modifica o revisa tests unitarios y E2E de LiLi con Vitest y NestJS siguiendo sus patrones de TestingModule, escenarios inline y organización por ramas. Úsala para trabajo de testing en este repositorio, incluidas regresiones y cobertura solicitada.
---

# Tests de LiLi

Crea salvaguardas de regresión que prueben comportamientos reales y sean fáciles
de leer y mantener. El verde y la cobertura son resultados de la verificación;
no sustituyen demostrar el contrato del sujeto.

## Contexto y alcance

- Lee `AGENTS.md`, la implementación objetivo y sus colaboradores relevantes.
  Usa rutas relativas a la raíz del repositorio al explorar el proyecto.
- Comprueba `package.json`, `vitest.config.ts` y `test/setup.ts` antes de elegir
  comandos, APIs, configuración o mecanismos de logging. El estado actual del
  repositorio y las instrucciones del usuario prevalecen sobre esta skill.
- Elige el nivel de prueba según la garantía necesaria. Para unitarios, lee
  [references/unit.md](references/unit.md); para E2E, lee
  [references/e2e.md](references/e2e.md). Lee ambos si el cambio necesita ambos.
- Usa la skill `vitest` del proyecto cuando necesites detalles de su API,
  contrastándolos con la versión instalada. No copies patrones de specs antiguos
  que contradigan los ejemplos revisados de esta skill.
- Mantén el trabajo dentro del encargo. No aproveches la creación de tests para
  rediseñar producción, instalar dependencias o cambiar contratos o umbrales.

## Filosofía compartida

- Para cada test, identifica el comportamiento protegido y qué cambio incorrecto
  debería hacerlo fallar. Diseña las aserciones para detectar esa regresión.
- Usa un comportamiento concreto por `it`. Varias aserciones son adecuadas cuando
  juntas demuestran el mismo comportamiento, incluidos sus efectos y ausencia de
  efectos indebidos. Separa responsabilidades independientes.
- Prueba lo que pertenece al sujeto. En un unitario, verifica su coordinación
  contractual con colaboradores mockeados; prueba la implementación de cada
  colaborador en su propia suite. En un E2E, el sujeto es el flujo de la aplicación.
- Nombra los tests según la garantía que realmente demuestran. Un mock que devuelve
  cero filas modificadas no demuestra por sí solo expiración real en PostgreSQL;
  lanzar peticiones con `Promise.all` no garantiza una carrera concreta.
- Agrupa mediante un `describe` exterior para el sujeto y `describe` interiores
  por rama funcional. En E2E, agrupa por endpoint o flujo. Añade niveles solo cuando
  mejoren la lectura; no impongas un número fijo de grupos.
- Usa `it.each` cuando los escenarios tengan la misma estructura y expectativas,
  con nombres que identifiquen cada caso. Evita bucles de escenarios dentro de un
  único `it`: cada caso debe ejecutarse y reportarse por separado.
- Mantén los datos del escenario, llamadas y aserciones inline. Acepta repetición
  cuando permite comprender el test sin saltar a helpers. Comparte montaje y
  limpieza técnica en hooks; no escondas flujos o aserciones en helpers de login,
  requests, fixtures o verificaciones.
- Añade líneas en blanco entre preparación, ejecución y comprobación, y entre las
  distintas peticiones o extracciones de datos de un flujo. No separes cada línea
  de un bloque que expresa una sola operación. Conserva los nombres en inglés y
  el estilo TypeScript/imports del repositorio.
- Compara objetos completos cuando el contrato de salida lo permita, especialmente
  respuestas públicas donde campos adicionales serían una regresión. Usa matchers
  parciales cuando deliberadamente solo interese una parte del contrato.
- No suplas datos obligatorios ausentes con fallbacks como una cookie vacía. Haz
  que la ausencia falle en el punto de extracción con una causa clara.
- Si un error debe ocultar detalles internos, comprueba la excepción pública y el
  mensaje exacto. Comprobar solo su clase o una subcadena no demuestra esa garantía.
- Para orden o espera entre operaciones, controla una promesa pendiente y comprueba
  qué no ha ocurrido antes de resolverla. Las aserciones de argumentos por sí solas
  no demuestran el orden ni que se espere a la operación.

## Logs y aislamiento

`test/setup.ts` se carga en los proyectos unitario y E2E de Vitest. Mockea los
niveles de `ConsoleLogger` de Nest al cargar el archivo y antes de cada test.
Esto cubre `AppLogger` y el logger instalado por `TestingModule`.

Reutiliza ese setup; no repitas mocks de logging en cada spec para silenciar la
salida. Los tests del logger pueden usar spies para verificar sus llamadas.
No silencies globalmente stdout/stderr o los errores de Vitest. Si una nueva
fuente de logs necesita tratamiento, identifica su origen y actúa dentro del
alcance solicitado.

## Verificación

- Ejecuta primero el spec afectado. Para unitarios sin infraestructura, usa
  `pnpm exec vitest run --project=unit <ruta-del-spec>`.
- Para E2E, usa `pnpm test --project=e2e <ruta-del-spec>`: el script prepara la
  base de datos de test y aplica sus migraciones antes de ejecutar Vitest.
- Después de cambiar tests, ejecuta `pnpm typecheck`, `pnpm lint` y
  `pnpm format:check` según `AGENTS.md`. Usa `pnpm run ci` para cambios amplios o
  sustanciales; no repitas verificaciones que ya pasan sin una razón nueva.
- Si falta el cliente Prisma generado, confirma la causa antes de regenerarlo.
  No conviertas errores de infraestructura en cambios del código o de los tests.
- Usa `pnpm test:coverage` si la tarea necesita cobertura. Consulta la configuración
  y los reportes actuales; no fijes porcentajes históricos ni añadas aserciones
  sin valor solo para alcanzar un umbral.
- No resetees bases de datos ni elimines volúmenes para desbloquear tests sin
  evaluar los datos afectados y obtener la autorización necesaria.
- Informa de lo cambiado, los comandos ejecutados y sus resultados. Distingue
  fallos del cambio, fallos ajenos y verificaciones que no se pudieron ejecutar.
  No presentes mocks de servicios externos como validación de sus integraciones
  reales.
