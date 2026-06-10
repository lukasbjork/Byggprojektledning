# Byggprojektledning

Personligt AI-drivet kontrollcenter för projektledare/beställare inom bygg och fastighet.
Projekt, möten, åtgärdspunkter, ekonomi (budget/fakturor/ÄTA), dokument, risker,
automationer och rapporter — på ett ställe, helt på svenska.

**Live:** sajten deployas till Netlify från detta repo.

## Teknik

- Next.js (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Prisma + Neon Postgres (gratis molndatabas — samma data lokalt och på Netlify)
- Anthropic API (Claude) för AI-funktionerna, alltid server-side

## Kom igång lokalt

1. **Installera beroenden**

   ```bash
   npm install
   ```

2. **Skapa `.env`** — kopiera `.env.example` till `.env` och fyll i värdena:

   - `DATABASE_URL` / `DIRECT_URL` — anslutningssträngar från [Neon](https://neon.tech)
     (pooled respektive direkt; den direkta saknar `-pooler` i hostnamnet).
   - `ANTHROPIC_API_KEY` — skapas på [platform.claude.com](https://platform.claude.com)
     under *API Keys*. Krävs för AI-funktionerna (möten, assistent, rapporter).
   - `APP_PASSWORD` — lösenordet du loggar in med.
   - `SESSION_SECRET` — slumpsträng som signerar inloggnings-cookien:
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

3. **Skapa tabellerna och fyll med exempeldata**

   ```bash
   npx prisma migrate dev
   npm run db:seed
   ```

4. **Starta**

   ```bash
   npm run dev
   ```

   Öppna [http://localhost:3000](http://localhost:3000) och logga in med ditt `APP_PASSWORD`.

## Backup av databasen

Databasen ligger i Neon (Postgres). Två sätt att ta backup:

1. **Neons inbyggda återställning** — Neon sparar historik automatiskt
   (*Restore/Point-in-time* i Neon-konsolen) så att du kan återställa till en
   tidigare tidpunkt utan egen backup.

2. **Egen dump med `pg_dump`** (kräver PostgreSQL-klienten installerad):

   ```bash
   pg_dump "DIN_DIRECT_URL_HÄR" --format=custom --file=backup_2026-06-10.dump
   ```

   Återställ med `pg_restore --dbname="DIN_DIRECT_URL" backup_2026-06-10.dump`.

## Bra att veta

- **Seed-datat** (tre exempelprojekt) kan läggas tillbaka när som helst med
  `npm run db:seed` — observera att kommandot först rensar alla projekt.
- **AI-modellen** styrs av `ANTHROPIC_MODEL` i `.env` (standard `claude-sonnet-4-6`).
  AI-anrop kostar per användning enligt Anthropics prislista.
- **Databasen i webbläsaren:** `npm run db:studio` öppnar Prisma Studio.

## Byggfaser

| Fas | Innehåll | Status |
| --- | --- | --- |
| 1 | Grund, inloggning, projektregister, dashboard | ✅ Klar |
| 2 | Möteshantering med AI-protokoll och åtgärdspunkter | ✅ Klar |
| 3 | Ekonomiuppföljning: budget, fakturor, ÄTA, prognos | Planerad |
| 4 | Dokumenthantering med versioner och AI-kategorisering | Planerad |
| 5 | AI-assistent med projektkontext | Planerad |
| 6 | Automationer, notiser och rapportgenerator | Planerad |
