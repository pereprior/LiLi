# Unitarios

El ejemplo revisado es
[`complete-oidc-login.service.spec.ts`](../../../../src/auth/google-login/attempts/services/complete-oidc-login/complete-oidc-login.service.spec.ts).
Lee su montaje, los grupos de tests y el escenario con una promesa pendiente
antes de crear un spec de un servicio Nest. Adapta sus criterios al sujeto;
no copies sus datos OIDC o sus tres grupos en módulos que no los necesitan.

## Montaje del sujeto

- Ubica los unitarios junto al código como `src/**/*.spec.ts`.
- Para servicios y otros sujetos Nest con inyección de dependencias, usa
  `Test.createTestingModule()` en un `beforeEach` asíncrono. Registra el sujeto y
  sus dependencias con tokens de runtime y `useValue`; obtén el sujeto con
  `module.get` y cierra el módulo en `afterEach`.
- Importa como valores las clases o tokens usados en `provide`; reserva
  `import type` para tipos. No importes `AppModule` ni conectes a una base de datos
  real para probar un servicio aislado.
- Usa mocks tipados de los métodos consumidos. Prefiere el tipo del método del
  colaborador; para delegates genéricos de Prisma, usa tipos de argumentos y
  resultados generados para describir el contrato asíncrono que necesitas.
  Evita `as unknown as` para convertir objetos incompletos en servicios enteros.
- Reinicia los mocks en `beforeEach`. Si se reutiliza un mock entre casos,
  `mockReset()` evita que se hereden respuestas o implementaciones anteriores;
  limpiar solo las llamadas no basta para eso.
- Comparte en el hook la configuración fija de DI. Configura las respuestas
  de mocks y las fixtures dentro del test que las necesita. Los casos que
  rechazan antes de usar un colaborador no necesitan su respuesta exitosa.
- Las funciones puras y utilidades sin DI pueden probarse directamente: no montes
  un módulo Nest que no aporte nada a su contrato.

## Comprobaciones

- Separa salida del servicio, argumentos relevantes de colaboradores, rechazos
  tempranos, errores públicos y efectos cuando sean comportamientos distintos.
- Verifica argumentos y número de llamadas cuando formen parte del contrato;
  por ejemplo, consumir una sola vez o usar el hash correcto. No compruebes
  detalles internos solo porque el mock los deja visibles.
- En un rechazo temprano, verifica que no se inicia el trabajo que debe evitarse.
  Un `rejects` sin esa comprobación puede pasar aunque haya efectos indebidos.
- Para fechas o expiración, fija el tiempo en los tests que lo necesitan con
  `vi.useFakeTimers()` y `vi.setSystemTime()`. Restaura con `vi.useRealTimers()` en
  teardown. No uses pausas reales para simular expiraciones.
- Usa `Promise.withResolvers()` cuando debas comprobar que una operación espera a
  otra. Arranca la llamada, conecta su expectativa de resultado, comprueba que el
  siguiente colaborador no se ha llamado, resuelve la promesa y espera el final.
- Configura fallos de cada colaborador relevante por separado. Cuando compruebes
  clase y mensaje de una excepción, reutiliza la misma promesa para evitar
  ejecutar la acción dos veces.
- Mantén explícito el límite de la prueba: una respuesta mockeada de Prisma
  demuestra cómo reacciona el servicio; no demuestra consultas, restricciones,
  atomicidad o carreras reales en la base de datos.
