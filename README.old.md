# Eco-Clean Financiero Next PRO v3

App privada para Eco-Clean: dashboard financiero + inventario + deudas + reportes, lista para publicar en Vercel y guardar datos en Supabase.

## Incluye

- Dashboard ejecutivo con ventas, gastos, utilidad, deuda e inventario.
- Captura de ventas, gastos, compras, ingresos extra y pagos de deuda.
- Inventario completo por producto:
  - producto, categoría, unidad, existencia, mínimo, costo, precio de venta, proveedor, SKU, color e ícono.
  - unidades como Litros, Piezas, Cajas, Paquetes, Kilos, Galones, Bultos, Metros u Otro.
  - entradas, salidas, ajustes y mermas.
  - alertas de stock bajo.
  - valor del inventario a costo y venta potencial.
- Categorías editables con color e ícono.
- Etiquetas editables con color e ícono.
- Métodos de pago editables.
- Reportes mensuales y exportación CSV.
- Respaldo/importación JSON.
- Login por contraseña.
- Modo nube con Supabase.

## Variables en Vercel

Agrega estas variables en Vercel > Project > Settings > Environment Variables:

```env
APP_PASSWORD=EcoClean2026*
APP_SESSION_SECRET=eco-clean-juan-jose-sesion-segura-2026
SUPABASE_URL=https://TU-PROYECTO.supabase.co/rest/v1/
SUPABASE_SECRET_KEY=TU_SECRET_KEY
APP_STATE_ID=eco-clean
```

## Supabase

En Supabase > SQL Editor > New query, pega y ejecuta:

```txt
docs/supabase-schema.sql
```

La app guarda todo en un solo JSON dentro de `finance_app_state`, para que sea fácil mantenerla sin crear varias tablas.

## Desarrollo local

```bash
npm install
npm run dev
```

## Producción

```bash
npm run build
npm start
```
