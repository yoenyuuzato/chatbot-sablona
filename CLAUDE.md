@AGENTS.md

# Chatbot šablona – pravidla pro Claude Code

- Komunikuj česky.
- Přizpůsobení zákazníkovi = měnit JEN `client.config.ts` (profily) a `knowledge/<profil>/*.md`. Ostatní soubory měň jen při úpravě samotné šablony.
- Texty UI patří do `locales/index.ts` (cs i en vždy obě).
- Po změnách vždy `npm run lint && npm run build`.
- Nikdy necommituj `.env.local` ani API klíče.
