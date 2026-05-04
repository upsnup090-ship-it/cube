# CHANGELOG

## [2026-05-04]

### Added
- `src/middleware.ts` — HTTP Basic Auth для `/admin/*` с timing-safe сравнением (P0-1).
- `next.config.ts` — базовые security headers и `poweredByHeader: false`.
- `.env.example` — шаблон с `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_BOT_TOKEN`.
- `docs/action-plan.md` — подробный план работ по внешнему аудиту.
- `package.json` — поле `engines.node: >=20.0.0`.

### Security
- Маршрут `/admin/*` больше не доступен публично: production fail-closed (503 без env),
  dev-fallback (открыт без env), проверка креденшелов через timing-safe equal.
- Добавлены HTTP-заголовки: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` для camera/mic/geo.

### Changed
- `README.md` — добавлен раздел "Доступ к админ-панели", обновлен блок "Переменные окружения".

## [2026-04-30]

### Added
- `docs/mvp-readiness-audit.md` (v0.1 readiness snapshot)
- `docs/current-project-state.md` (facts-only state doc)
- `docs/next-milestones.md` (post-audit milestone ordering)

### Changed
- Documentation updated to reflect current implementation status (no product logic changes).

### Fixed
- ...

### Notes
- No Prisma schema changes.
- No real Telegram/Supabase integration was added.
