# MyEduProgress

A multi-school student assessment and progress platform.

## Current milestone: application foundation

- React + TypeScript + Vite frontend
- Responsive landing page with student and staff login entry points
- Supabase client configuration through environment variables
- No service-role key or privileged credential is used in the browser

## Local development

1. Install Node.js 20 or later.
2. Copy `.env.example` to `.env.local`.
3. Set `VITE_SUPABASE_URL` to the MyEduProgress Supabase project URL.
4. Set `VITE_SUPABASE_ANON_KEY` to the project's publishable key.
5. Run `npm install`, then `npm run dev`.

## Security and implementation status

The initial database migration is maintained separately in the Supabase SQL Editor. Staff password sign-in is wired to Supabase Auth once environment variables are configured. Student ID + Personal Access Code sign-in is intentionally not implemented in the browser; it requires a server-side verification function with rate limiting.

School registration, role-aware dashboards, teacher/class management, student registration and assessment workflows are upcoming milestones. Do not expose a Supabase service-role key in frontend environment variables.

## Planned architecture

- School → teachers → classes → students
- A student identity persists across class and academic-year changes
- Tenant isolation enforced by PostgreSQL Row Level Security
- Privileged account creation and student credential verification through Supabase Edge Functions
