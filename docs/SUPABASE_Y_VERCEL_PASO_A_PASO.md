# Guía fácil: Supabase + Vercel para Eco-Clean

Esta guía está pensada para hacerlo sin saber programar.

## 1. Qué es Supabase

Supabase será la nube/base de datos de Eco-Clean. La app guarda ahí todos los movimientos, deudas, categorías, etiquetas, metas y métodos de pago.

## 2. Crear la tabla en Supabase

1. Entra a tu proyecto de Supabase.
2. En el menú izquierdo, entra a **SQL Editor**.
3. Abre el archivo `docs/supabase-schema.sql` de este proyecto.
4. Copia todo el contenido.
5. Pégalo en SQL Editor.
6. Da clic en **Run**.

Con eso queda creada la tabla que usa la app.

## 3. Variables que van en Vercel

Cuando importes el proyecto en Vercel, entra a:

**Project > Settings > Environment Variables**

Agrega estas 5 variables, una por una:

| Name | Value |
|---|---|
| `APP_PASSWORD` | la contraseña temporal de acceso, por ejemplo `EcoClean2026*` |
| `APP_SESSION_SECRET` | una frase larga cualquiera, por ejemplo `eco-clean-juan-jose-sesion-segura-2026-cambiar` |
| `SUPABASE_URL` | el API URL o Project URL de Supabase |
| `SUPABASE_SECRET_KEY` | la Secret Key de Supabase |
| `APP_STATE_ID` | `eco-clean` |

Importante: la Secret Key no va en GitHub. Solo va en Vercel.

## 4. Sobre el API URL

Supabase puede mostrarte algo como:

`https://xxxx.supabase.co/rest/v1/`

Puedes pegarlo tal cual en `SUPABASE_URL`. La app ya lo limpia automáticamente.

## 5. Publicar

Después de poner las variables:

1. Guarda los cambios.
2. Ve a **Deployments**.
3. Da clic en **Redeploy**.
4. Cuando termine, abre la URL de Vercel.

## 6. Prueba rápida

1. Entra con la contraseña.
2. Registra una venta de prueba por $100.
3. Cierra la app.
4. Ábrela en otro navegador o celular.
5. Si la venta aparece, Supabase quedó funcionando.
