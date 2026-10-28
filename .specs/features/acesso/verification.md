# Acesso verification

**Verdict**: PASS
**Mutations**: 3 - probed C11, C14, C15
**Proofs**: `proofs.md` no HEAD do fechamento
**Verifier**: self-verified (degraded - no sub-agent)

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |

## Probed

- **Mutações (3, todas mortas):** "lembrar" invertido em `seed-login.ts` (C11); `/console` liberado para qualquer papel em `apps/web/src/lib/access.ts` (C14); procedimentos por papel aceitando qualquer perfil em `packages/api/src/index.ts` (C15).
- **Exemplos próprios (fora do repositório, descartados):** `curl` no dev local: `POST /api/auth/sign-in/seed` com Ana e `rememberMe` devolve `Max-Age=2592000`; sem lembrar, cookie de sessão; e-mail fora do seed devolve 401 `EMAIL_NOT_FOUND`; `POST /api/auth/sign-up/email` devolve `EMAIL_PASSWORD_SIGN_UP_DISABLED`; `me` da Ana devolve 42 dias. Todos conferem.
- **Sensibilidade:** C13 ("no sign up") falhou com `emailAndPassword` ligado de volta, então o teste mede o que diz.
- **Walk:** 14 de 14 passos (ver `**Walked:**` em tasks.md); fotos em `captures/*.running.png` a 1440x900.
