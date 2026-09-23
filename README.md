# PACTO — Cumple o Asume las Consecuencias

Apuestas sociales de cumplimiento de metas para grupos de amigos (PWA full-stack instalable).

## 🚀 Requisitos e Instalación

### 1. Requisitos Previos
- **Node.js**: v18.0.0 o superior
- **npm**: v9.0.0 o superior

### 2. Configuración Local

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Iniciar servidor de desarrollo
npm run dev

# Ejecutar tests unitarios (Vitest)
npm test

# Compilar proyecto para producción
npm run build
```

## 🛠️ Stack Tecnológico

- **Frontend**: React 19 + TypeScript (Strict) + Vite 6 + TailwindCSS 4
- **PWA**: vite-plugin-pwa (Workbox)
- **Backend & Auth**: Supabase (PostgreSQL + RLS + Edge Functions + Storage + Realtime)
- **Estado**: TanStack Query + Zustand

## 🔐 Variables de Entorno

Crear un archivo `.env` en la raíz con las credenciales de tu proyecto Supabase:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```
