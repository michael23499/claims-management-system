# AI_LOG.md — Registro de uso de IA

Este documento detalla **cómo se utilizó la IA** durante el desarrollo de la prueba y, sobre todo, **cómo se supervisó y corrigió** lo que la IA generó. Se lleva como un **diario vivo**: cada entrada se anota en el momento en que ocurre, no a posteriori.

## Herramientas utilizadas

- **Claude Code** (Anthropic) — asistente principal: Generación de código y de tests, y apoyo en la lógica reactiva del frontend.

## Metodología de supervisión

- Trabajo **paso a paso**: cada decisión se entiende y valida antes de avanzar.
- **SDD (Spec-Driven Development)**: se define el contrato OpenAPI antes de programar.
- Nada se acepta "a ciegas": las afirmaciones de la IA se **verifican** contra la fuente original, y las decisiones de negocio las toma la persona, no la IA.

---

## Registro cronológico

### [2026-06-06] Entrada 1 — Detección de un campo oculto en el enunciado (`score`)

- **Contexto:** revisión del modelo de datos de la entidad `Damage`.
- **Aportación de la IA:** al extraer el texto completo del PDF (con `pdftotext`), la IA detectó el campo `Score (from 1 to 10)` que **no era visible a simple vista** en el documento (estaba en texto blanco/oculto).
- **Supervisión humana:** dudé del dato y exigí verificarlo en lugar de aceptarlo. Lo confirmé yo mismo abriendo el PDF y buscando con `Ctrl + F` la palabra `score` → el buscador devolvió **1/1**, resaltando el texto oculto al final de la línea del daño.
- **Decisión:** se incluye `score` (1–10) en el modelo, por formar parte del enunciado oficial aunque esté oculto.
- **Por qué importa:** demuestra que no se confía ciegamente ni en el documento ni en la IA; se verifica contra la fuente.

### [2026-06-06] Entrada 2 — Contradicción del enunciado: la `descripción` del daño

- **Contexto:** la regla de validación (sección 2.3) exige que al crear un daño la **descripción** sea obligatoria, pero el modelo de datos (sección 2.1) **no define** ese campo en el `Damage` (solo `part`).
- **Aportación de la IA:** detectó la contradicción y propuso inicialmente **ignorar** la mención y tratar `part` como único campo de texto.
- **Corrección humana:** aporté un razonamiento de **dominio** que la IA no había considerado: `part` y `description` son conceptos distintos y complementarios — `part` es **qué** pieza se dañó (ej. "puerta delantera") y `description` es **cómo** se dañó (ej. "abolladura por impacto"). En el peritaje real de siniestros, ambos coexisten.
- **Por qué importa:** es un ejemplo directo del criterio "Pensamiento Crítico (IA)": el criterio humano de negocio corrigió y mejoró la propuesta inicial de la IA.

### [2026-06-07] Entrada 3 — Decisión de stack tecnológico

- **Decisiones tomadas (supervisión humana):**
  - **Backend:** **NestJS**. Razón: DI de primera clase (misma filosofía que Angular → coherencia full-stack), El usuario conoce el lenguaje TypeScript nativo, testing integrado (facilita el objetivo >95% de cobertura) y soporte OpenAPI. Alternativas descartadas: Express + DI manual (más boilerplate y riesgo) y Fastify (menos idiomático para clean architecture).
  - **Persistencia:** **Mongoose** (`@nestjs/mongoose`) como ODM. Razón: schemas, validación declarativa y repositorio limpio; aporta la "consistencia de datos" que el reto evalúa, sin renunciar a la flexibilidad NoSQL.
  - **Tests:** **Jest** (default de NestJS, cobertura integrada) + **`mongodb-memory-server`** para el test de integración del total (Mongo efímero en RAM → el evaluador ejecuta `pnpm test` sin infraestructura ni credenciales).
  - **BD para ejecutar la app:** **Docker Compose** como método documentado por defecto (reproducible, sin filtrar secretos), con soporte opcional de **MongoDB Atlas** vía variable de entorno.
- **Razonamiento de producto (clave):** la decisión se optimizó para **cómo el evaluador percibe el skill**: lee el código y ejecuta `pnpm test`. Por eso los tests no dependen de ninguna BD externa, y la app se levanta con un solo comando sin compartir credenciales de Atlas. Atlas como BD principal del entregable se descartó por obligar a compartir un secreto (mala práctica) o impedir la ejecución.
- **Por qué importa:** demuestra criterio de producto (no solo técnico) y alineación con los criterios de evaluación de Bdeo: DI, además de seguir el patrón clean architecture, testing y reproducibilidad.

### [2026-06-07] Entrada 4 — Corrección: edición de daño no puede ser parcial

- **Contexto:** definición del endpoint para editar un daño en el `openapi.yaml`.
- **Propuesta inicial de la IA:** un `PATCH` con un schema `DamageUpdate` de **campos opcionales** (actualización parcial, p. ej. cambiar solo el precio).
- **Corrección humana:** se detectó que esto **viola las instrucciones**. La regla 2.3 exige que **todos los campos de un daño sean obligatorios**, y RULES regla 1 prohíbe inventar comportamiento no descrito. Una "actualización parcial" introducía una semántica ausente del enunciado e incoherente con la validación: un daño debe estar siempre completo y válido, se cree o se edite.
- **Decisión:** se elimina el schema `DamageUpdate`. Editar un daño exige **todos los campos** igual que crearlo, lo que semánticamente es un **`PUT`** (reemplazo completo), no un `PATCH`. El endpoint pasa a `PUT /claims/{id}/damages/{damageId}` reutilizando `DamageInput`.
- **Por qué importa:** ejemplo directo del criterio "Pensamiento Crítico (IA)": el criterio humano corrigió una decisión de la IA que se desviaba del enunciado y de las reglas del proyecto.

### [2026-06-07] Entrada 5 — Giro de método: SDD iterativo (rebanadas verticales)

- **Contexto:** tras definir los 7 endpoints de golpe en el contrato, se valoró el riesgo de especificar mucho "a ciegas" sin poder ejecutar ni ver nada todavía.
- **Decisión (humana):** reducir el `openapi.yaml` a una sola operación, `POST /claims`, y **re-añadir cada endpoint justo antes de implementarlo**. Se mantiene SDD (el contrato sigue siendo la fuente de verdad), pero por **rebanadas verticales**: especificar → implementar → verificar → siguiente endpoint.
- **Qué se quitó:** los 6 endpoints restantes y los payloads `ClaimUpdate` y `DamageInput`. Se conservó el núcleo del modelo (`Claim`, `Damage`, `Severity`, `ClaimStatus`, `ClaimInput`, `Error`) porque un claim recién creado ya expone `status`, `totalAmount` y `damages`.
- **Por qué importa:** prioriza el feedback temprano y reduce el trabajo especulativo, alineado con un flujo AI-first donde se valida pronto en lugar de diseñar todo por adelantado.

### [2026-06-07] Entrada 6 — Cobertura: 100% en líneas/statements/funcs, 75% en branches (explicado)

- **Contexto:** tras escribir los tests del `POST /claims` (2 unitarios + 1 de integración con `mongodb-memory-server`), la cobertura da 100% en Statements/Functions/Lines pero **75% en Branches (15/20)**.
- **Hallazgo (con verificación humana):** se desconfió del número y se abrió el informe HTML de istanbul para inspeccionarlo. Las 5 ramas sin cubrir están **todas en constructores con DI**. Causa: `emitDecoratorMetadata` (obligatorio para la DI de NestJS) genera por cada dependencia inyectada un ternario `typeof T === 'undefined' ? Object : T`; el lado `'undefined'` nunca se ejecuta → rama fantasma. **No es lógica de negocio sin testear.**
- **Decisión:** NO inflar el número con trucos (`istanbul ignore`, etc.). Se documenta el motivo en el README. Como el proyecto aún tiene solo 20 ramas, 5 fantasma pesan mucho (75%); conforme se añada lógica real con `if/else` y sus tests, el porcentaje de branches subirá hacia >95% de forma natural. Se reevaluará al final.
- **Corrección previa:** la IA había calificado el 75% de "peligroso" sin inspeccionar las ramas; tras revisarlas se confirmó que son artefactos del compilador, no un riesgo.
- **Por qué importa:** demuestra que la cobertura se entiende y se audita (qué mide cada métrica, de dónde sale cada rama), en lugar de perseguir un número a ciegas.

### [2026-06-07] Entrada 7 — Máquina de estados del claim: decisión de negocio (humana)

- **Contexto:** al implementar `PATCH /claims/{id}` se detectó que el enunciado solo fija 2 reglas de transición explícitas (cancelar solo desde `pending`; finalizar exige descripción >100 chars si hay daño `high`) y no define el resto del grafo de estados.
- **Riesgo señalado por la IA:** inventar transiciones no especificadas violaría la regla 1 (no asumir).
- **Decisión humana (razonamiento de dominio):**
  - **No** imponer un orden obligatorio `pending→in_review→finalized` (podría añadirse más adelante).
  - **`finalized` es terminal:** si un siniestro está finalizado, el daño ya se resolvió; no debe cambiar de estado.
  - **`canceled` es terminal:** si se cancela desde `pending`, no debe poder salir de ahí.
- **Implementación:** las reglas viven en un helper puro y testeable (`claim-rules.ts`: `hasHighSeverityDamage`, `assertStatusChange`), reutilizando los types centralizados (regla 5).
- **Por qué importa:** las dos reglas de "terminal" son interpretación humana razonada (no estaban literales), documentada aquí; el resto se ciñe al enunciado sin inventar.

### [2026-06-07] Entrada 8 — Auditoría de errores: hub central + bug del id malformado

- **Contexto:** a petición humana se auditó que TODOS los errores del backend se manejaran correctamente y estuvieran centralizados.
- **Centralización:** todos los mensajes de error viven en un único hub `src/common/errors/index.ts` (objeto `ClaimErrors`, agrupado por dominio; crecerá con `DamageErrors`). El helper y el service lanzan sus excepciones con esos mensajes (cero strings sueltos) → más legible y una sola fuente de verdad.
- **Bug encontrado al verificar:** un `id` con formato inválido (no ObjectId, ej. `/claims/abc`) provocaba un `CastError` de Mongoose **sin manejar → 500**. Se detectó escribiendo tests que esperaban `404` y verificando que fallaban (500).
- **Fix:** `MongoClaimsRepository.findById` valida con `isValidObjectId`; si el id es inválido devuelve `null`, que el service convierte en `404` (coherente con el contrato de `GET /claims/{id}`, que solo documenta 200/404). Cubierto con 2 tests de integración (GET y PATCH).
- **Por qué importa:** la verificación activa (no asumir que "ya está bien") descubrió un fallo real; el manejo de errores queda consistente y centralizado.

### [2026-06-07] Entrada 9 — Branch coverage al 100% real: de ts-jest a SWC

- **Contexto:** el branch coverage se estancaba (~88%) por ramas fantasma `typeof T === 'undefined' ? Object : T` que `ts-jest` genera con `emitDecoratorMetadata` (necesario para la DI de NestJS) en cada constructor/parámetro decorado.
- **Intentos descartados (verificados en vivo):** (1) `coverageProvider: 'v8'` → peor (no entiende los decoradores, hundió el schema). (2) `/* istanbul ignore next */` en constructores → **no funciona**: el ternario se compila en un bloque `__decorate` al final de la clase, no en la línea del comentario.
- **Solución que sí funciona:** compilar los tests con **SWC** (`@swc/jest` + `.swcrc`), que emite la metadata de decoradores **sin** ese ternario → istanbul no ve ramas fantasma. Además se añadió `useDefineForClassFields: false` para que los campos `@Prop` declarados (sin inicializador) no cuenten como statements sin ejecutar.
- **Resultado:** branch y functions al **100%**, statements 97.56% y lines 98.66% (todas >95%), sin trucos. El build de la app sigue con `tsc`; SWC solo compila los tests.
- **Por qué importa:** se llegó al objetivo de forma **genuina** (eliminando el artefacto en origen), no inflando el número; y se descartaron 2 caminos probándolos, no asumiendo.

### [2026-06-07] Entrada 10 — `POST /claims/{id}/damages` + cobertura 100%

- **Endpoint:** añadir daño a un claim. Reglas aplicadas: solo si el claim está en `pending` (helper `assertClaimIsPending`, error centralizado `damagesOnlyWhenPending`); todos los campos del daño obligatorios (`CreateDamageDto`); el `totalAmount` se recalcula en el servidor con el helper puro `calculateTotal` (suma de precios). Persistencia con `ClaimsRepository.save` (documento hidratado). Devuelve el claim actualizado (201).
- **Test de integración exigido por el humano:** "keeps the total equal to the sum of the damage prices" (100 + 50 = 150). Cubierto, junto con 400 (no pending / validación) y 404.
- **Cobertura (decisión final, humana):** la clase `Damage` del schema queda sin cubrir porque Mongoose castea el subdocumento vía metadata y nunca llama a `new Damage()` (el constructor no se ejecuta). Se valoró **excluir `*.schema.ts`** (llegaba a 100%), pero por **transparencia** se decidió **NO excluirlo**: el schema cuenta en el informe, con su línea sin cubrir a la vista. Solo se excluyen los archivos de cableado puro (`*.module.ts`, `main.ts`). Resultado: branches y functions 100%, statements ~98%, lines ~99% (todas >95%), 48 tests. La lógica del schema (transform `toJSON`) sigue testeada por integración (se verifica `id`/`_id` en claims y daños).
- **Por qué importa:** el cálculo del total vive en un helper puro y testeado (consistencia de datos garantizada en servidor), y el 100% se logra sin tests artificiales, excluyendo solo lo declarativo.

### [2026-06-07] Entrada 11 — `PUT` y `DELETE` de daños: backend completo (7/7)

- **Endpoints:** `PUT /claims/{id}/damages/{damageId}` (reemplazar daño) y `DELETE` (eliminar daño). Ambos: solo si el claim está en `pending`, **recalculan el `totalAmount`** y devuelven el claim actualizado. Reutilizan los helpers `calculateTotal`/`assertClaimIsPending` y el error centralizado `damageNotFound` (regla 5 pagando: cero duplicación).
- **Cuidado con el DELETE (señalado por el usuario):** si el daño no existe se devuelve **404** explícito (no se borra "en silencio"); validado con test de integración.
- **Bug de tipos cazado por `tsc` (no por los tests):** como los tests se compilan con **SWC (sin chequeo de tipos)**, un error real (`claim.damages.id()` no existe en el tipo `Damage[]`) habría pasado desapercibido en `pnpm test`. Se detectó corriendo `tsc --noEmit` aparte. Fix type-safe: declarar `_id?: Types.ObjectId` en la clase `Damage` y localizar el subdocumento con `find`/`findIndex` por `_id.toString()`. **Lección:** con SWC hay que validar tipos con `tsc` por separado.
- **Estado:** backend **feature-complete** — 7 endpoints, **64 tests**, branch/functions 100%, statements/lines ~98-99%.
- **Por qué importa:** se cerró el backend reutilizando la base (helpers/errores/Repository) y se reforzó la disciplina de validar tipos aparte cuando el runner no lo hace.

### [2026-06-07] Entrada 12 — Cobertura 100% honesta: extraer el `toJSON`

- **Contexto:** el usuario quería la mayor cobertura posible pero con **máxima transparencia** (sin esconder nada). El schema no llega al 100% porque la clase `Damage` nunca se instancia (Mongoose usa metadata, no `new Damage()`); forzarlo con `new Damage()` sería gaming.
- **Mejora aplicada:** se **extrajo el transform `toJSON`** a un helper testeado `common/mongo/to-json.ts` (`stripMongoId` + `ID_TRANSFORM`). Así toda la lógica de serialización queda cubierta y **visible** en el helper (100%), y el schema queda **puramente declarativo**.
- **Decisión final (humana):** una vez extraído el `toJSON`, el schema quedó **sin nada de lógica** → se **excluye `*.schema.ts`** del cómputo, igual que `*.module.ts`/`main.ts` (todos declarativos/cableado). Excluir un archivo sin lógica no esconde nada. (Se valoró antes dejarlo visible en ~98%; finalmente se excluyó por coherencia con los demás declarativos.)
- **Resultado:** **100% en statements/branches/functions/lines**, 64 tests. La lógica del `toJSON` queda cubierta y visible en su helper; solo se excluyen archivos sin lógica.
- **Por qué importa:** se llegó al 100% **honesto** atacando la causa (sacar la lógica a un helper testeado) en lugar de esconder lógica o falsear un test.

### [2026-06-08] Entrada 13 — Subida real de imágenes (backend) + 2 fantasmas de cobertura y un bug

- **Contexto:** el campo `imageUrl` del daño es obligatorio (2.3). En lugar de pegar una URL a mano, se implementó **subida real con almacenamiento** (decisión del usuario, buscando demostrar profundidad full-stack).
- **Endpoint:** `POST /uploads` con `FileInterceptor` (multer): guarda el archivo en disco con nombre único (`randomUUID`), valida que sea imagen (`fileFilter`) y limita a 5 MB. Devuelve `{ path }`. Se sirve `/uploads` como estático (`app.useStaticAssets`, app tipada como `NestExpressApplication`). La carpeta `uploads/` va en `.gitignore`. Añadido al `openapi.yaml` (regla 4).
- **Cobertura 100% mantenida (2 fantasmas resueltos, mismo patrón que SWC):** (1) la config de multer **dentro** del decorador `@UseInterceptors(...)` no la instrumenta SWC → se extrajo a una **constante** a nivel de módulo. (2) el tipo `Express.Multer.File` (namespace global) generaba una rama fantasma en la firma del método → se usó una **interfaz local mínima** (`{ filename }`). Tests: subir imagen → 201; no-imagen → 400; `uploadDir()` con/sin `UPLOAD_DIR` (carpeta temporal aislada). **68 tests, 100% en las 4 métricas.**
- **Decisión (humana) — interfaz mínima en vez del tipo global de Multer:** "No usé el tipo global de Multer (`Express.Multer.File`) porque ensuciaba la cobertura con una rama fantasma y, además, solo necesitaba el `filename`. Definí una interfaz local mínima con justo lo que uso — más limpio y 100% honesto." Es el mismo criterio que con las otras ramas fantasma: **atacar la causa en vez de esconderla con `istanbul ignore`**.
- **Bug cazado al integrar front + back:** al añadir un daño con la imagen subida, el `POST` devolvía **400 en silencio**. Causa: la URL subida es de `localhost` y `@IsUrl()` por defecto **rechaza localhost** (`require_tld: true`). Fix: `@IsUrl({ require_tld: false })`. Además se añadió **feedback de error visible** en el frontend (antes fallaba sin avisar al usuario).
- **Por qué importa:** el 100% se mantuvo atacando la causa de cada fantasma (no con `istanbul ignore`), y la verificación **end-to-end** (front llamando al back real) destapó un bug de validación que los tests unitarios del backend no podían ver.

### [2026-06-08] Entrada 14 — Frontend: supervisión de la lógica reactiva (el total)

- **Contexto:** el requisito estrella (2.3): el total se actualiza en tiempo real al **añadir, eliminar o modificar** el precio de un daño.
- **Aportación de la IA:** modelar el total como un `computed()` derivado de los daños del claim (fuente única de verdad); el claim vive en un `signal`, y cada acción (add/remove/edit) hace `claim.set(updated)` → el total se recalcula solo.
- **Supervisión / correcciones humanas (varias, clave para el criterio 5):**
  - El usuario incorporo un efecto "en vivo tipo JavaScript" → se añadió un **preview del total** mientras se teclea el precio (signal del valor del form), separado del total real (que lo confirma el backend).
  - **`PUT` vs `PATCH` al editar un daño:** el usuario dudó ("si cambio un dato fallará"). Se razonó que es **`PUT`** (reemplazo completo) porque la regla 2.3 exige el daño siempre completo; la UI pre-rellena todos los campos, así que el `PUT` nunca va incompleto.
  - **"Editar terminales":** el usuario propuso bloquear la edición de claims `finalized`/`canceled`. Al **verificar el enunciado**, 2.3 solo restringe los **daños** a `pending` → por RULES regla 1 no se inventó la restricción (decisión aplazada y documentada).
- **Decisión:** total = `computed` sobre los daños; modificar = `PUT` con el daño completo; "Save" solo activo con **cambios reales** (compara el form con el original).
- **Por qué importa:** documenta la **supervisión de la lógica reactiva** que pide el enunciado: la IA propuso el patrón con signals y el criterio humano lo ajustó a las reglas de negocio reales.

### [2026-06-08] Entrada 15 — Frontend: tests con Jest y 100% honesto

- **Contexto:** elegir el runner de tests del frontend y alcanzar cobertura alta.
- **Aportación de la IA:** recomendar **Jest** (mismo stack que el backend → monorepo coherente, headless, no deprecado) frente a Karma (deprecado por Angular) y Vitest (experimental). Setup con `jest-preset-angular` (peer `@angular/platform-browser-dynamic` fijado a v20, `jest-environment-jsdom` aparte).
- **Fantasmas de rama (mismo patrón que el backend con SWC):** el tipo `Partial` de `valueChanges` obligaba a `?.`/`??` defensivos sobre valores del form que en runtime **siempre existen** → ramas imposibles de cubrir. **Fix en la causa** (no `istanbul ignore`): (1) mapear `valueChanges` a `getRawValue()` (tipo completo), y (2) guardar el daño en edición en un `signal` en vez de re-buscarlo con `find()`. Eso eliminó las ramas y dejó el código más limpio.
- **Resultado:** **50 tests, 100% en statements/branch/functions/lines.**
- **Por qué importa:** el 100% se logró **atacando la causa**, igual que en el backend, no falseando; y la decisión de runner se justificó por coherencia y mantenibilidad.

### [2026-06-08] Entrada 16 — Frontend: manejo de errores en capas (sin duplicar)

- **Contexto:** mejorar el manejo de errores del frontend.
- **Aportación de la IA:** un **HTTP interceptor** (`errorInterceptor`) + un `NotificationService` (banner global) para errores inesperados (servidor caído, 5xx).
- **Pensamiento crítico humano:** el usuario detectó que un error de red mostraría **DOS** mensajes — el banner global **y** un mensaje inline genérico → **duplicación**.
- **Decisión (separación de responsabilidades en un solo sitio):** el interceptor maneja lo **global** (red/5xx → banner); los componentes manejan **validación** (4xx → inline). El helper `errorMessage` devuelve `null` para los errores que ya maneja el interceptor, así **nunca** se muestran dos mensajes para el mismo fallo.
- **Por qué importa:** el centralizar el manejo de errores (helper + interceptor) **sí aportó** en el frontend — quitó duplicación y dejó una arquitectura de errores en capas, clara y testeable (100%).

### [2026-06-08] Entrada 17 — Diseño profesional: dirección y criterio del usuario

- **Contexto:** el usuario marcó el listón — subir el diseño de "básico" a **nivel de evaluación profesional** — y dirigió el proceso de principio a fin.
- **Dirección y criterio (humano):** la visión, la jerarquía visual y cada decisión estética las puso el usuario. Decidió montar un **sistema de diseño** (tokens, tipografía, paleta, sombras) + **componentes reutilizables** en lugar de CSS suelto (regla 5), y fijó el estándar de "que parezca un producto, no un prototipo".
- **Aportación de la IA (acotada):** traducir esa dirección a código (CSS/markup, `StatusBadge`, `Icon` con `@switch`, segmented control). Útil para teclear rápido y dejar el andamiaje, pero **sin el criterio visual del usuario lo habría dejado en "correcto pero soso"** — el salto a profesional no salió de la primera salida de la IA.
- **Supervisión iterativa humana (criterio 5) — donde estuvo el valor real:** el usuario detectó y corrigió lo que la IA NO clavó: el `<select>` de severidad feo → **segmented control con animación**; **Edit/Delete** desalineados verticalmente; **descripciones largas** desbordando la tabla (faltaba `overflow-wrap` + ancho limitado); botones primarios mal ubicados → **a la derecha**; el input de imagen pobre → **dropzone con drag & drop**; **resaltar los totales** (pill). Cada mejora salió de su ojo, no del borrador inicial.
- **Resultado:** UI profesional y **reutilizable** (sistema + componentes, cero CSS duplicado), 100% cobertura mantenida.
- **Por qué importa:** caso de libro del **criterio 5** — la IA produce un borrador funcional; **el criterio, la dirección y las correcciones humanas son las que lo llevan a nivel de evaluación**.

### [2026-06-08] Entrada 18 — Paginado en backend (escalabilidad)

- **Contexto:** el usuario preguntó si había que paginar la lista para cuando haya muchos claims.
- **Decisión (humana):** paginado en el **backend**, no client-side → escala de verdad (no trae todo).
- **Backend:** `GET /claims?page&limit` → `{ items, total, page, limit }`, más nuevos primero; el repositorio expone `findPage(skip, limit)` + `count()`; `PaginationQueryDto` valida/coerce los params; `openapi.yaml` actualizado.
- **Frontend:** estado de página (signal) + controles Previous / "Page X of Y" / Next; recarga al navegar y al crear (vuelve a la página 1).
- **100% cobertura** mantenida (backend 71 tests; frontend con tests de paginado y defaults).
- **Por qué importa:** decisión de escalabilidad correcta y completa (toda la pila), no un apaño visual.

### [2026-06-08] Entrada 19 — Límites de caracteres (robustez)

- **Contexto:** el usuario detectó que no había **máximos** (se podían meter descripciones gigantes).
- **Decisión:** límites centralizados en `claims/types/limits.ts` (título 120, descripción claim 1000, part 80, descripción daño 280) — una sola fuente (regla 5).
- **Enforcement en capas:** backend `@MaxLength` (fuente de verdad → 400) + frontend `maxlength` (no deja teclear de más) + `openapi.yaml` (`maxLength`). Test de integración: título >120 → 400.
- **Por qué importa:** robustez y validación consistente en toda la pila, sin duplicar los números.

### [2026-06-08] Entrada 20 — Datos semilla (seed) para que la app no arranque vacía

- **Idea (humana):** el usuario pidió que al inicializar la app ya se vea data cargada (claims, daños, totales, estados), para que el evaluador no tenga que crear todo a mano y perciba la app funcionando de un vistazo.
- **Implementación:** `backend/src/seed/seed-data.json` con **12 claims** (3 por estado, cubriendo los **4 estados** y las **3 severidades**), imágenes de placeholder públicas. Con 12 y paginado de 10 se activa la paginación en la demo. Un `SeedService` siembra **auto al arrancar solo si la BD está vacía** (`onModuleInit`, idempotente) y expone `pnpm seed` para un reseed forzado (limpia + recarga). El `totalAmount` lo calcula el seed (suma de daños), no se confía en el JSON.
- **Coherencia con el dominio (decisión humana):** los claims `finalized` se sembraron con un daño `high` + descripción >100 caracteres, para que respeten la regla de negocio (no data que la propia app rechazaría).
- **Cobertura 100% intacta:** el seed es utilidad de arranque/dev → se **excluye del coverage** (`!**/seed/**`), igual que `main.ts`/módulos. No se infló ni se escondió nada; la lógica de negocio sigue al 100% (backend 71 tests).
- **Por qué importa:** decisión de producto (mejorar la primera impresión del evaluador) resuelta sin ensuciar la métrica de calidad ni inventar data incoherente con las reglas.

### [2026-06-08] Entrada 22 — Monorepo: arranque y evaluación con un comando

- **Contexto:** facilitar al evaluador ejecutar la app y medir la cobertura sin fricción (lo que pide el enunciado en 6).
- **Decisión:** un `package.json` en la raíz que orquesta ambos paquetes con `pnpm -C <pkg>` (sin migrar a pnpm workspaces, para no reestructurar lo que ya funcionaba). Scripts: `setup`, `dev` (Mongo + API + web con `concurrently`; el frontend espera al backend con `wait-on`), `test:cov`, `seed`.
- **Detalle clave:** `pnpm test:cov` no necesita Docker porque la integración usa `mongodb-memory-server`. Clonar → `setup` → `test:cov` y se ve la cobertura.
- **Por qué importa:** reduce la barrera para evaluar; decisión de bajo riesgo (paquetes independientes) con la conveniencia de un solo comando.
