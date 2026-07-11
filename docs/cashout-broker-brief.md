# Brief de diseño — Wallet & Cashout del Broker (Azahares)

> App móvil del broker (Expo/React Native). Rol: **broker_owner** (el admin del
> broker). Este brief cubre el módulo de billetera y el nuevo flujo de retiro
> (cashout). Marca: navy `#0d1b3d`, acentos azul `#1d3a8a` / `#3b5bbf`, efectos
> **liquid glass**, tipografía serif para números/títulos, animaciones suaves
> (count-up, brillos, stepper). Idioma: español (los precios del portal van en EN,
> la app del broker en ES).

---

## 1. Concepto general

El broker acumula **saldo** en su billetera (wallet) por sus ventas: comisión y
markup. Cuando quiere cobrar ese dinero, **solicita un cashout** (retiro). El
equipo de Azahares lo procesa y le deposita a la cuenta bancaria que el broker
indique. La app es una **cuenta bancaria digital**: tarjeta, saldo, estado de
cuenta y retiros.

**Regla clave:** al solicitar, el saldo NO se descuenta de inmediato — se
**reserva**. El descuento real ocurre cuando Azahares completa el pago.
Por eso:
- **Saldo total** (balance)
- **Reservado** = suma de solicitudes pendientes
- **Disponible** = balance − reservado (es lo que se puede retirar)

---

## 2. Modelo de datos (para las pantallas)

**Wallet**
- `walletNumber`: 16 dígitos tipo tarjeta (`3333 xxxx xxxx xxxx`)
- `balance`, `reservedAmount`, `availableBalance`, `currency` (USD)
- `ownerName` (titular)

**Movimiento / transacción (WalletTx)** — el "estado de cuenta"
- `kind`: `commission` (Comisión) · `markup` (Markup) · `credit` (Crédito a favor) ·
  `usage` (Uso de crédito) · `cashout` (Cashout/Retiro) · `cashout_reverted`
  (Cashout devuelto) · `adjustment` (Ajuste)
- `amount` (positivo = ingreso, negativo = egreso), `balanceAfter` (saldo tras el
  movimiento), `description`, `createdAt`
- `cashoutId` (si es un cashout → lleva a su detalle), `salesOrderId` (si es
  comisión/markup → link a la orden de venta)

**Cashout (retiro)**
- `cashoutNumber`: folio legible, ej. **CO-000001**
- `amount`, `status`, `disbursedAmount`, `notes`, `rejectionReason`
- `requestedAt`, `processedAt`, `completedAt`
- `disbursements[]` (destinatarios / a dónde se depositó), cada uno:
  - `method`: `wired` (Wire transfer) · `ach` (ACH) · `cash` (Efectivo)
  - `accountType`: `business` (Negocio) · `personal` (Personal)
  - `country` (código ISO, ej. US), `payeeLabel` (nombre empresa/persona)
  - `bankName`, `accountNumber`, `routing` (ABA), `swift`, `bankAddress`
  - `amount`, `reference`
  - `proofUrl` (**recibo/comprobante** del banco — solo cuando está pagado)
  - `paidAt`

**Estados del cashout** (barra de progreso / stepper):
`Solicitado` → `En trámite` → `Completado`  ·  rama alterna: `Rechazado`
- Solicitado = amarillo/ámbar · En trámite = azul/sky · Completado = verde ·
  Rechazado = rojo/rose

**Destinatario guardado (Payee)** — la "libreta" del broker
- `label` (empresa o persona), `accountType`, `defaultMethod`, `country`,
  `bankName`, `accountNumber`, `routing`, `swift`, `bankAddress`

---

## 3. Pantallas y flujos

### 3.1 Home de la billetera (Wallet)
- **Tarjeta bancaria** grande, animada (proporción de tarjeta real ~1.586:1):
  gradiente navy, chip dorado, textura guilloché, brillo que barre, orbes liquid
  glass. Muestra: marca "Broker Pay", moneda, **número enmascarable** (ojo para
  mostrar/ocultar + copiar), titular, y **saldo** con animación **count-up**.
- Debajo o al costado: **Saldo disponible** grande + chip de **Reservado**
  ("$X en solicitudes pendientes") cuando aplique.
- **Chips de resumen**: Ingresos totales / Retiros totales.
- **CTA principal: "Solicitar cashout"** (solo visible para el broker admin).
- **Panel "Solicitudes pendientes"**: lista de cashouts en estado Solicitado /
  En trámite, con folio (CO-…), badge de estado, fecha y monto; al tocar → detalle.
  Pie con "Total reservado".

### 3.2 Estado de cuenta (movimientos)
- Lista de todos los movimientos, con **buscador** (por concepto/tipo/monto),
  **filtro** (Todos / Ingresos / Retiros) y **paginación de 25** por página.
- Cada fila: ícono por tipo (comisión=chispa, markup=tendencia, crédito=flecha
  entra, uso/cashout=flecha sale, etc.), etiqueta, descripción, fecha, y monto
  con signo (+ verde / − rojo). Las filas de cashout indican "Ver detalle y recibo".
- Tocar una fila abre el **detalle de la transacción**.

### 3.3 Detalle de una transacción
- Header navy con el **monto** grande (+/−), tipo y fecha completa.
- "Saldo tras el movimiento".
- Si es **comisión/markup/uso**: muestra el **Concepto** con el número de factura/
  orden como **link** para abrir la orden de venta.
- Si es **cashout**: muestra la **barra de estado**, los **destinatarios** (banco,
  cuenta, routing/SWIFT, dirección), y —cuando está completado— el **recibo de
  pago** (botón "Ver recibo"). Si está pendiente, muestra el estado actual
  ("pendiente de aprobación" / "en proceso"). Muestra la nota si la hubo.

### 3.4 Solicitar cashout — WIZARD de 3 pasos
Modal/pantalla guiada con indicador de pasos (1-2-3):

**Paso 1 — Tipo de cuenta**
- Dos tarjetas grandes seleccionables: **Cuenta de negocio** / **Cuenta personal**.

**Paso 2 — Destinatario**
- **Buscador** + lista de **destinatarios guardados** (filtrados por el tipo del
  paso 1). Tocar uno → autocompleta y avanza.
- Botón **"Crear nuevo destinatario"** → formulario:
  - **Método**: Wire transfer / ACH / Efectivo (segmented).
  - **País**: selector con **bandera** (estilo picker de teléfono, con búsqueda).
  - Campos según país/método:
    - **USA (wire/ACH)**: Nombre de la empresa (o persona), Nombre del banco,
      Número de cuenta, **Número de ruta (routing/ABA)**, Dirección.
    - **Otro país (internacional)**: Beneficiario, Banco, Número de cuenta,
      **SWIFT/BIC**, Dirección.
    - **Efectivo**: solo nombre/beneficiario + país.

**Paso 3 — Monto y confirmación**
- Input de **monto** (con atajos 25% / 50% / Todo), tope = **saldo disponible**.
- **Nota** (opcional).
- **Resumen** del destino elegido (bandera, nombre, método, banco/cuenta, tipo).
- Botón **"Solicitar"** → crea el cashout en estado **Solicitado**.
- Copy importante: "Queda pendiente de aprobación del equipo de Azahares".

> El destinatario es **obligatorio**: la orden se monta con el destino cargado
> para que Azahares sepa a dónde depositar. Un destinatario nuevo se **guarda**
> en la libreta para reusarlo.

### 3.5 Detalle de un cashout (desde pendientes o desde un movimiento)
- Header navy: **folio CO-…**, monto grande, fecha de solicitud.
- **Barra de estado** (Solicitado → En trámite → Completado) o "Rechazado" con
  motivo.
- Mensaje contextual del estado ("pendiente de aprobación" / "procesando").
- Lista de **destinatarios** con sus datos bancarios; cuando está completado, cada
  uno muestra su **recibo de pago** (comprobante) y la fecha de pago.
- Nota del broker si la hubo.

---

## 4. Interacciones, estados y reglas

- **Solo el broker admin** (broker_owner) puede solicitar cashouts; los vendedores
  ven la billetera pero no el botón.
- Validaciones del monto: > 0 y ≤ saldo **disponible** (no el total).
- Estados vacíos con ilustración/ícono suave y copy amable (sin movimientos, sin
  solicitudes, sin resultados de búsqueda).
- Animaciones: count-up del saldo, entrada escalonada de filas, brillo en la
  tarjeta, spinner en cargas, stepper animado.
- Accesibilidad: número de tarjeta enmascarado por defecto; montos con
  `tabular-nums`.

## 5. Endpoints (referencia para el equipo, no para la UI)
- `GET /wallets/me` — billetera (incluye `reservedAmount`, `availableBalance`)
- `GET /wallets/:id/transactions?limit=` — movimientos
- `POST /wallets/:id/cashout` — solicitar (body: `amount`, `notes`, `payee{…}`)
- `GET /accounting/my-cashouts?status=` — cashouts del broker
- `GET /accounting/cashouts/:id` — detalle (con destinatarios + recibos)
- `GET /accounting/brokers/:brokerId/payees` — libreta de destinatarios
  (`brokerId` = `wallet.ownerId`)

## 6. Paleta y estilo
- Navy `#0d1b3d` / `#16327a` / `#1e3a8a` / `#3b5bbf`; verde éxito `#10b981`;
  ámbar `#f59e0b`; rojo `#f43f5e`; sky para "en trámite".
- Superficies: tarjetas liquid glass sobre fondo claro; header navy con orbes.
- Badges de estado: ámbar (Solicitado), sky (En trámite), verde (Completado),
  rojo (Rechazado).
- Botones de acción con ícono: Solicitar (flecha/enviar), Ver (ojo), etc.
