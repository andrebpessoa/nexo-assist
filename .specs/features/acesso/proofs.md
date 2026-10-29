# acesso proofs

**HEAD**: afe77a9
**Tree**: clean
**Result**: 25 pass, 0 fail; mutations 3 killed, 0 not

| Check | Proof                                                                                                 | Ran | Passed | Result |
| ----- | ----------------------------------------------------------------------------------------------------- | --- | ------ | ------ |
| C1    | `bun --cwd apps/web test src/lib/access.test.ts -t "no session goes to login"`                        | 1   | 1      | pass   |
| C2    | `bun --cwd apps/web test src/features/login/login-page.test.tsx -t "prototype texts"`                 | 1   | 1      | pass   |
| C3    | `bun test packages/auth/src/seed-login.test.ts -t "employee signs in"`                                | 1   | 1      | pass   |
| C4    | `bun test packages/auth/src/seed-login.test.ts -t "analyst signs in"`                                 | 1   | 1      | pass   |
| C5    | `bun test packages/auth/src/seed-login.test.ts -t "email is normalized"`                              | 1   | 1      | pass   |
| C6    | `bun test packages/auth/src/seed-login.test.ts -t "unknown email"`                                    | 1   | 1      | pass   |
| C6    | `bun --cwd apps/web test src/features/login/login-page.test.tsx -t "unknown email message"`           | 1   | 1      | pass   |
| C7    | `bun --cwd apps/web test src/features/login/login-page.test.tsx -t "invalid fields are not sent"`     | 1   | 1      | pass   |
| C8    | `bun --cwd apps/web test src/features/login/login-page.test.tsx -t "pending disables submit"`         | 1   | 1      | pass   |
| C9    | `bun --cwd apps/web test src/features/login/login-page.test.tsx -t "server error keeps input"`        | 1   | 1      | pass   |
| C10   | `bun --cwd apps/web test src/features/login/login-page.test.tsx -t "eye toggles password"`            | 1   | 1      | pass   |
| C11   | `bun test packages/auth/src/seed-login.test.ts -t "remember me"`                                      | 1   | 1      | pass   |
| C12   | `bun --cwd apps/web test src/features/login/login-page.test.tsx -t "forgot password is simulated"`    | 1   | 1      | pass   |
| C13   | `bun test packages/auth/src/seed-login.test.ts -t "no sign up"`                                       | 1   | 1      | pass   |
| C13   | `bun --cwd apps/web test src/features/login/login-page.test.tsx -t "no sign up link"`                 | 1   | 1      | pass   |
| C14   | `bun --cwd apps/web test src/lib/access.test.ts -t "role areas"`                                      | 2   | 2      | pass   |
| C15   | `bun test packages/api/src/access.test.ts -t "role procedures"`                                       | 2   | 2      | pass   |
| C16   | `bun --cwd apps/web test src/features/shell/app-sidebar.test.tsx -t "sign out"`                       | 1   | 1      | pass   |
| C17   | `bun --cwd apps/web test src/features/profile/profile-page.test.tsx -t "profile data"`                | 1   | 1      | pass   |
| C18   | `bun --cwd apps/web test src/features/shell/app-sidebar.test.tsx -t "user and active item"`           | 2   | 2      | pass   |
| C19   | `bun test packages/api/src/access.test.ts -t "password age in days"`                                  | 2   | 2      | pass   |
| C20   | `bun --cwd apps/web test src/features/profile/profile-page.test.tsx -t "reset password is simulated"` | 1   | 1      | pass   |
| Build | `bun run check-types`                                                                                 | -   | -      | pass   |
| Build | `bun biome check apps packages`                                                                       | -   | -      | pass   |
| Build | `bun run test`                                                                                        | -   | -      | pass   |

## Mutations

| Mutation                                                 | Location                             | Killed |
| -------------------------------------------------------- | ------------------------------------ | ------ |
| remember me inverted (30-day cookie only when unchecked) | `packages/auth/src/seed-login.ts:70` | yes    |
| console open to every signed-in role                     | `apps/web/src/lib/access.ts:29`      | yes    |
| role procedures accept any role with a profile           | `packages/api/src/index.ts:31`       | yes    |
