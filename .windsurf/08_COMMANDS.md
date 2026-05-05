# COMMANDS — CubeChat (BigPlayBot Dices)

## Development
| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |

## Quality
| Command | Purpose |
|---|---|
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type checking (`tsc --noEmit`) |

## Prisma (Database)
| Command | Purpose |
|---|---|
| `npm run prisma:validate` | Validate Prisma schema (`npx prisma validate`) |
| `npm run prisma:migrate` | Run migrations (`npx prisma migrate dev`) |
| `npm run prisma:seed` | Seed database (`npx prisma db seed`) |
| `npm run prisma:studio` | Open Prisma Studio GUI |

## Smoke Checks
| Command | Purpose |
|---|---|
| `npm run smoke:services` | Service layer smoke check |
| `npm run smoke:telegram` | Telegram webhook smoke check |
| `npm run smoke:telegram-handler` | Telegram webhook handler smoke check |
| `npm run smoke:telegram-api` | Telegram API smoke check |
| `npm run smoke:telegram-admin` | Telegram webhook admin smoke check |
| `npm run smoke:admin-security` | Admin security smoke check |
| `npm run smoke:env` | Environment validation smoke check |

## Telegram Webhook Management
| Command | Purpose |
|---|---|
| `npm run telegram:webhook:set` | Set Telegram webhook URL |
| `npm run telegram:webhook:info` | Get webhook info |
| `npm run telegram:webhook:delete` | Delete webhook |

## Full Verification Gate (before commit)
Run in order:
1. `npx prisma validate`
2. `npx prisma migrate status`
3. `npx prisma db seed`
4. `npm run type-check`
5. `npm run lint`
6. `npm run build`
