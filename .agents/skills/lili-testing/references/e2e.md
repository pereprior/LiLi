# E2E

El ejemplo revisado es
[`auth.e2e-spec.ts`](../../../../test/auth/auth.e2e-spec.ts).
Lee su montaje, organización por endpoint y flujos HTTP inline antes de añadir
un E2E. Las cookies y rutas de auth ilustran el patrón; no son requisitos de todos
los módulos.

## Montaje y aislamiento

- Ubica los E2E en `test/**/*.e2e-spec.ts`.
- Arranca `AppModule` mediante `Test.createTestingModule()`, crea la aplicación y
  aplica `configureApp(app)` como en el ejemplo. Usa `app.listen(0)` y
  `app.getUrl()` para evitar fijar un puerto del servidor de test.
- Usa la aplicación y la base de datos de test reales. Mockea las fronteras
  externas que no deban ejecutarse, como `GoogleOidcClient`, mediante
  `overrideProvider(...).useValue(...)`. No mockees servicios internos o Prisma
  en un test que debe demostrar el flujo completo.
- Comparte el arranque en `beforeAll` y cierra la aplicación en `afterAll`.
  Reinicia mocks y limpia los datos pertinentes entre casos, respetando las
  relaciones de claves foráneas. Mantén también la limpieza final.
- Verifica que se usa `.env.test` y la base de datos E2E antes de borrar datos.
  Adapta la limpieza a las entidades del flujo; no copies borrados de auth a
  otros specs ni uses resets o eliminación de volúmenes como limpieza habitual.
- El proyecto E2E actual usa `fileParallelism: false` porque comparte la base de
  datos. No uses casos concurrentes que compitan con la limpieza de otros tests
  ni actives paralelismo sin un aislamiento adecuado.

## Flujos visibles

- Agrupa los casos en `describe` por endpoint o rama funcional. Conserva un
  recorrido completo cuando aporte confianza en la integración; separa las
  garantías específicas de cabeceras, validación o persistencia.
- Usa `fetch` inline con métodos, URLs, headers y datos visibles. Para comprobar
  redirecciones, especifica `redirect: 'manual'` y verifica estado y destino.
- En flujos con cookies, extrae las cookies reales de la respuesta. Usa
  `headers.getSetCookie()` para distinguir cada cookie y envía solo su par
  nombre/valor al continuar el flujo. Comprueba los atributos de la cookie
  correspondiente, sin mezclar varias cabeceras `Set-Cookie`.
- Usa datos deterministas permitidos por la configuración de test. El URL local
  del servidor en un puerto dinámico y el origen configurado de la aplicación
  cumplen funciones diferentes; no intercambies sus expectativas.
- Comprueba la respuesta pública completa cuando el esquema tenga campos
  definidos; así detectas campos sensibles o inesperados añadidos accidentalmente.
- Consulta Prisma cuando demuestre un efecto relevante que HTTP no prueba bien,
  como ausencia de sesiones tras un rechazo o unicidad de un usuario. Relaciona
  el dato consultado con el escenario; no inspecciones columnas internas sin
  una razón contractual.
- Para logout o rechazos de operaciones mutables, prueba el efecto con la cookie
  anterior: debe dejar de funcionar tras revocación y seguir funcionando cuando
  la operación se rechaza sin modificar la sesión.
- No exageres garantías de concurrencia. `Promise.all` permite enviar varias
  peticiones juntas; una carrera específica exige controlar o demostrar el
  solapamiento relevante. Mantén el nombre ajustado a la prueba ejecutada.
- Explica el límite de las fronteras mockeadas: el E2E de auth prueba el flujo
  local, pero no valida credenciales, conectividad o autenticación real con Google.
