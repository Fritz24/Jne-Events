# JNE Events

Event management platform for movie nights, music events, and more.

## Backend
This project uses **Supabase** for:
- Database (PostgreSQL)
- Authentication
- Storage (Images)

## Prerequisites
1.  **Supabase Project**: Set up a Supabase project and database using `supabase_setup.sql`.
2.  **Environment Variables**: Create a `.env` file with the following:
    ```
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```
3.  **Storage**: Create a public bucket named `events` in Supabase Storage.

## Development
```bash
npm install
npm run dev
```

## Production
```bash
npm run build
```
