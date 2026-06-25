# Eco-Clean Financiero PRO

App web hecha con Next.js para que Juan José pueda administrar Eco-Clean sin Excel ni Google Sheets.

## Qué hace

- Dashboard corporativo con ventas, gastos, compras, utilidad, deuda y metas.
- Captura dentro de la app: ventas, gastos, compras, ingresos extra y pagos de deuda.
- Control de deudas con saldo pendiente y porcentaje pagado.
- Categorías personalizables con color e ícono.
- Etiquetas personalizables para segmentar movimientos, por ejemplo: Mostrador, Mayoreo, Proveedor, Urgente.
- Métodos de pago editables.
- Reporte mensual imprimible / PDF desde el navegador.
- Exportación CSV y respaldo JSON.
- Login simple por contraseña.
- Modo local y modo nube con Supabase.

## Recomendación

Para Eco-Clean usa modo nube con Supabase. Así tu papá puede capturar desde celular y tú puedes revisar desde tu computadora con la misma información.

## Pasos rápidos

1. Sube este proyecto a GitHub.
2. Crea proyecto en Supabase.
3. Pega el SQL de `docs/supabase-schema.sql` en Supabase > SQL Editor.
4. Importa el repositorio en Vercel.
5. Agrega las variables de entorno en Vercel.
6. Publica.

Lee `docs/SUPABASE_Y_VERCEL_PASO_A_PASO.md` para instrucciones sin lenguaje técnico.
