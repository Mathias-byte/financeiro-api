# MS Financeiro — PropTech (PI5 Senac RJ)

Microsserviço de **cobranças, boletos, pagamentos, receitas e despesas** do condomínio. NestJS 11, TypeScript, Prisma 7 (adapter MariaDB/MySQL) e MySQL 5.7 (servidor da faculdade). Porta **7523**, rotas sob **`/condominio/financeiro`**.

Faz parte do PropTech junto com o MS Moradores (porta 7522), que **emite o login/JWT**. Este serviço só **valida** o token.

## Rotas

Todas exigem `Authorization: Bearer <token>` (exceto `/health`).

| Recurso | Rota | Síndico | Morador |
| --- | --- | --- | --- |
| Cobranças | `/condominio/financeiro/cobrancas` | tudo | só leitura, só dos imóveis dele |
| Boletos | `/condominio/financeiro/boletos` | tudo | só leitura, só dos imóveis dele |
| Pagamentos | `/condominio/financeiro/pagamentos` | tudo | só leitura, só dos imóveis dele |
| Receitas | `/condominio/financeiro/receitas` | tudo | sem acesso (403) |
| Despesas | `/condominio/financeiro/despesas` | tudo | sem acesso (403) |
| Saúde | `/condominio/financeiro/health` | público | público |

Cada recurso tem `POST`, `GET` (lista), `GET /:id`, `PATCH /:id` e `DELETE /:id`.

**Listagem:** `?page=1&pageSize=20` (máx. 500) → `{ data, total, page, pageSize, totalPages }`, o mesmo contrato do Moradores. Filtros: `status` (1 ativo, 0 inativo) em todos; `situacao`, `imovelId` e `busca` (descrição) em cobranças; `cobrancaId`, `imovelId` e `formaPagamento` em pagamentos; `cobrancaId` e `imovelId` em boletos; `categoria` e `busca` em receitas/despesas (despesas também busca no fornecedor).

**Valores:** dinheiro volta como texto (`"850.50"`) para não perder precisão. Datas `DATE` são `AAAA-MM-DD`; `dataPagamento` é um instante ISO (envie, por exemplo, `2026-11-05T12:00:00.000Z`).

## Regras de negócio

- **`DELETE` não apaga.** O registro fica inativo (`*_status = 0`) e continua consultável. Dado financeiro não some.
- **Pagamento atualiza a cobrança.** Registrar, alterar ou cancelar um pagamento reavalia a cobrança na mesma transação: quando a soma dos pagamentos ativos cobre o valor ela vira `PAGO`; se deixar de cobrir, volta para `PENDENTE` (ou `VENCIDO`, se já passou do vencimento). `CANCELADO` nunca é alterado automaticamente. Cobrança cancelada ou inativa não recebe pagamento (409).
- Uma cobrança por imóvel e competência (use sempre o dia 01). Um boleto por cobrança. O boleto é só um **cadastro** (linha digitável, código de barras, link do PDF): não há emissão bancária.
- O pagamento não troca de cobrança: para corrigir, cancele e registre outro.
- Situação `VENCIDO` **não** é marcada sozinha com o passar do tempo (não há tarefa agendada): ela só muda quando alguém altera a cobrança ou um pagamento.

## Autenticação

O token é o do MS Moradores (`POST /condominio/morador/auth/login`) e precisa ser assinado com o **mesmo `JWT_SECRET`**. O token traz `usuarioPerfil` e `imovelIds` (imóveis com relação ativa do morador no login). Morador que pede cobrança de outro imóvel recebe **404**.

Limites desta validação: não há consulta de usuário a cada requisição (o banco do Financeiro não tem usuários). Conta desativada ou rebaixada no Moradores continua valendo aqui até o token expirar (8 h por padrão). Mudanças nas relações do morador só aparecem no próximo login. Tokens emitidos antes da atualização do Moradores não trazem `imovelIds`: o morador precisa entrar de novo.

## Variáveis de ambiente (Infisical)

Os segredos ficam no Infisical, nunca no repositório (veja `.env.example`):

| Variável | Para quê |
| --- | --- |
| `DATABASE_URL` | MySQL do banco do Financeiro (o nome diferencia maiúsculas/minúsculas no servidor Linux) |
| `JWT_SECRET` | igual ao do MS Moradores |
| `PORT` | padrão 7523 |
| `SWAGGER_ENABLED` | `true` liga o Swagger em produção; vazio liga só fora de produção |

## Banco de dados

O usuário da aplicação só tem `SELECT/INSERT/UPDATE/DELETE`; as tabelas são criadas pelo professor com **`database/Financeiro.sql`**. A API não cria nem altera tabelas (não use `prisma db push` no servidor).

## Como rodar

```bash
git clone https://github.com/Mathias-byte/financeiro-api.git && cd financeiro-api
npm install
npx prisma generate            # gera o Prisma Client em src/generated (não vai para o Git)

npx infisical run --env=dev -- docker compose up --build      # com Docker
# ou, sem Docker:
npm run start:dev                                             # recarrega ao salvar (usa o Infisical)
npm run build && npm run start:prod
```

- API: <http://localhost:7523/condominio/financeiro>
- Health: <http://localhost:7523/condominio/financeiro/health> (200 `Healthy` ou 503 `Unhealthy`)
- Swagger: <http://localhost:7523/condominio/financeiro/docs>. Na imagem Docker ele fica **desligado**; para uma demonstração defina `SWAGGER_ENABLED=true` e desligue depois, porque a página expõe toda a API.

Pelo gateway da faculdade a rota pública fica `/condominio/gateway/financeiro` (combinar com o professor).

## Testes

```bash
npm test                       # unitários + HTTP com banco simulado, não precisa de MySQL
```

Teste ponta a ponta contra a API e o banco reais (cria dados temporários; **nunca em produção**): `node scripts/smoke-live.mjs` com as variáveis descritas no topo do arquivo.

## Deploy (Jenkins)

`JenkinsfileLinux` baixa os segredos do Infisical num `.env` temporário, constrói a imagem, sobe o container `financeiro-proptech` e confere `/health`. `INFISICAL_PROJECT_ID` já aponta para o projeto do Financeiro (o mesmo do `.infisical.yaml`); confirme apenas a credencial do token no Jenkins.

## Organização

`src/main.ts` e `src/app.setup.ts` (inicialização), `src/auth/` (validação do JWT e perfis), `src/health/`, `src/common/` (log de acesso, paginação, filtro de erros do Prisma), `src/swagger/`, e uma pasta por recurso (`cobrancas`, `boletos`, `pagamentos`, `receitas`, `despesas`) com controller, service, DTO e module. `prisma/schema.prisma` espelha o SQL via `@map`.

