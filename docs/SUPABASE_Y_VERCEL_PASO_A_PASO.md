# Guía sin programar: Supabase + Vercel

## Qué es Supabase en esta app

Supabase será la nube donde se guardan los datos de Eco-Clean: movimientos, deudas, categorías, etiquetas y configuración.

No vas a programar ahí. Solo vas a crear un proyecto, pegar un SQL y copiar dos datos para Vercel.

## Paso 1: crear Supabase

1. Entra a Supabase.
2. Crea una cuenta o inicia sesión.
3. Presiona `New project`.
4. Nombre sugerido del proyecto: `eco-clean-financiero`.
5. Crea una contraseña para la base de datos. Guárdala por si Supabase la pide después.
6. Region: elige la más cercana disponible. Si no sabes, deja la recomendada.
7. Presiona `Create new project`.
8. Espera a que termine de crear el proyecto.

## Paso 2: crear la tabla

1. Dentro del proyecto de Supabase, abre `SQL Editor`.
2. Presiona `New query`.
3. Copia todo el contenido de este archivo: `docs/supabase-schema.sql`.
4. Pégalo en Supabase.
5. Presiona `Run`.

Con eso queda creada la tabla donde la app guardará todo.

## Paso 3: copiar los datos que necesita Vercel

En Supabase abre `Project Settings` > `API`.

Copia estos dos datos:

1. `Project URL`
2. `service_role key`

Importante: usa `service_role key`, no `anon public`.

La `service_role key` es privada. No la subas a GitHub, no la pegues en chats públicos y no la pongas dentro del código.

## Paso 4: variables en Vercel

Cuando importes el proyecto en Vercel, entra a:

`Settings` > `Environment Variables`

Agrega estas variables:

```env
APP_PASSWORD=EcoClean2026*
APP_SESSION_SECRET=eco-clean-frase-larga-cambiala-por-otra-muy-larga
SUPABASE_URL=pega-aqui-el-Project-URL-de-Supabase
SUPABASE_SERVICE_ROLE_KEY=pega-aqui-la-service-role-key-de-Supabase
APP_STATE_ID=eco-clean
```

Después presiona `Redeploy` o vuelve a desplegar.

## Paso 5: probar

1. Abre la URL que te dé Vercel.
2. Entra con la contraseña que pusiste en `APP_PASSWORD`.
3. Ve a Configuración.
4. Presiona `Dejar en blanco` si quieres empezar limpio.
5. Agrega categorías, etiquetas y métodos de pago según necesite Juan José.
6. Registra una venta de prueba.
7. Abre la app desde otro dispositivo. Si ves lo mismo, Supabase quedó bien configurado.

## Datos que me puedes pasar sin riesgo

Puedes pasarme:

- Project URL de Supabase.
- Nombre del proyecto.
- APP_STATE_ID.

No es ideal que me pases la service_role key. Esa pégala tú directamente en Vercel.

## Qué NO debes subir a GitHub

No subas archivos `.env`, `.env.local` ni capturas donde se vea la service_role key.
