# Publicar Eco-Clean Financiero en Vercel

## Opción recomendada: Vercel + Supabase

Esta opción guarda todo en nube. Es la que debes usar si Juan José capturará desde celular y tú revisarás desde computadora.

1. Sube el proyecto a GitHub.
2. Entra a Vercel y presiona `Add New Project`.
3. Importa el repositorio.
4. En `Environment Variables` agrega:

```env
APP_PASSWORD=EcoClean2026*
APP_SESSION_SECRET=eco-clean-frase-larga-cambiala-por-otra-muy-larga
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
APP_STATE_ID=eco-clean
```

5. Presiona `Deploy`.

## Opción rápida: solo Vercel, sin Supabase

Solo agrega:

```env
APP_PASSWORD=EcoClean2026*
APP_SESSION_SECRET=eco-clean-frase-larga-cambiala-por-otra-muy-larga
```

Limitación: los datos se quedan en el navegador donde se capturen. No se sincronizan entre dispositivos.
