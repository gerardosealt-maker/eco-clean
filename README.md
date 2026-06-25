# Eco-Clean Financiero Next PRO v5

Sistema financiero interno para **Eco-Clean**, basado en la lógica del archivo original y la versión `Plan_Financiero_Negocio_JuanJose_PRO.xlsx`.

## Qué cambió en v5

- Se mantiene el enfoque original: ventas, compras de mercancía, gastos, ingresos/gastos extra, deudas, metas y resumen mensual.
- Se quitó inventario para no convertirlo en ERP.
- Meta diaria base: **$4,500 MXN**.
- Días objetivo base: **26 días**.
- Meta mensual base: **$117,000 MXN**.
- Proyecto limpio para Vercel: sin `node_modules`, sin `.next` y sin `package-lock.json` con rutas internas.
- Usa `pnpm` en Vercel para evitar el error de `npm install: Exit handler never called`.

## Módulos

- Dashboard ejecutivo.
- Nueva captura.
- Movimientos.
- Control de deudas.
- Reportes mensuales.
- Configuración de metas, categorías, etiquetas y métodos de pago.

## Variables de entorno en Vercel

Agrega estas variables en **Vercel > Project > Settings > Environment Variables**:

```env
APP_PASSWORD=EcoClean2026*
APP_SESSION_SECRET=eco-clean-juan-jose-sesion-segura-2026-cambiar
SUPABASE_URL=https://efyoehfgsrmunxekpkhe.supabase.co/rest/v1/
SUPABASE_SECRET_KEY=TU_SECRET_KEY_DE_SUPABASE
APP_STATE_ID=eco-clean
```

No subas `SUPABASE_SECRET_KEY` a GitHub.

## Supabase

Ejecuta el SQL de:

```txt
docs/supabase-schema.sql
```

En **Supabase > SQL Editor > New query > Run**.

## Vercel

El archivo `vercel.json` ya fuerza:

```txt
pnpm install --no-frozen-lockfile
pnpm build
```

Esto evita que Vercel use el `npm install` que te dio error.

## Desarrollo local

```bash
pnpm install
pnpm dev
```

## Producción

```bash
pnpm build
pnpm start
```
