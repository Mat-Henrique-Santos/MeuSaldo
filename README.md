# MeuSaldo

MeuSaldo é uma aplicação full stack para controle financeiro pessoal. O projeto permite cadastrar usuários, registrar receitas e despesas, visualizar saldo mensal, acompanhar gastos por categoria, criar metas financeiras e exportar relatórios em CSV ou PDF.

Este projeto foi feito com foco em portfólio: simples de rodar localmente, com arquitetura clara e  moderna.

## Funcionalidades

- Cadastro e login de usuário
- Autenticação com JWT
- Registro de receitas e despesas
- Categorias financeiras fixas:
  - Alimentação
  - Transporte
  - Lazer
  - Contas
  - Salário
  - Compras
- Dashboard com receitas, despesas e saldo do mês
- Gráfico por categoria
- Filtro por mês
- Cadastro de metas financeiras
- Edição de metas financeiras
- Exclusão de metas financeiras
- Dark mode com preferência salva no navegador
- Exportação de relatório em CSV
- Exportação de relatório em PDF
- API REST protegida por autenticação

## Stack

### Frontend

- React
- TypeScript
- Vite
- Recharts
- Lucide React
- CSS 

### Backend

- Node.js
- Express
- TypeScript
- Prisma ORM
- SQLite
- JWT
- bcryptjs
- Zod
- PDFKit

## Estrutura do projeto

```text
MeuSaldo/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── main.tsx
│   │   ├── styles.css
│   │   └── vite-env.d.ts
│   ├── index.html
│   ├── package.json
│   └── tsconfig.json
├── server/                 # Backend Express
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── goals.ts
│   │   │   ├── reports.ts
│   │   │   └── transactions.ts
│   │   ├── auth.ts
│   │   ├── index.ts
│   │   └── prisma.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── package.json
├── package-lock.json
└── README.md
```

## Como rodar localmente

### Modo fácil no Windows

Para uma pessoa que não programa, use os arquivos `.bat`:

1. Instale o Node.js LTS: https://nodejs.org
2. Baixe ou extraia este projeto, code - download zip
3. Dê dois cliques em `setup.bat`
4. Depois dê dois cliques em `start.bat`

O `setup.bat` instala as dependências, cria o arquivo `.env` e prepara o banco SQLite.

O `start.bat` inicia o projeto e abre o navegador em:

```text
http://localhost:5173
```

Para parar o app, feche a janela chamada `MeuSaldo Server`.

### Modo manual

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/meusaldo.git
cd meusaldo
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo de exemplo:

```bash
cp server/.env.example server/.env
```

No Windows PowerShell, se preferir:

```powershell
Copy-Item server/.env.example server/.env
```

Arquivo `server/.env`:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="troque-isto"
PORT=3333
CLIENT_URL="http://localhost:5173"
```

Para uso local, SQLite já basta. O banco será criado dentro da pasta `server`.

### 4. Rode as migrações do banco

```bash
npm run db:migrate -w server -- --name init
```

Ou pelo script raiz:

```bash
npm run db:migrate
```

### 5. Inicie o projeto

```bash
npm run dev
```

URLs:

- Frontend: http://localhost:5173
- Backend: http://localhost:3333
- Health check: http://localhost:3333/health

## Scripts disponíveis

Na raiz do projeto:

```bash
npm run dev
```

Roda frontend e backend ao mesmo tempo.

```bash
npm run build
```

Compila backend e gera build de produção do frontend.

```bash
npm run db:generate
```

Gera o Prisma Client.

```bash
npm run db:migrate
```

Executa as migrações do Prisma.

Rodar apenas o backend:

```bash
npm run dev -w server
```

Rodar apenas o frontend:

```bash
npm run dev -w client
```

## Banco de dados

O projeto usa SQLite para facilitar o desenvolvimento local e a apresentação no portfólio.

Vantagens para este projeto:

- Não precisa instalar PostgreSQL
- Não precisa Docker
- Setup rápido
- Bom para demonstração
- Fácil de versionar estrutura com Prisma Migrate

O schema está em:

```text
server/prisma/schema.prisma
```

Principais modelos:

- `User`
- `Transaction`
- `Goal`

Enums:

- `TransactionType`
- `Category`

## Autenticação

A autenticação usa JWT.

Fluxo:

1. Usuário cria conta ou faz login
2. API retorna um token JWT
3. Frontend salva o token no `localStorage`
4. Requisições protegidas enviam:

```http
Authorization: Bearer token-aqui
```

Rotas protegidas:

- `/transactions`
- `/goals`
- `/reports/csv`
- `/reports/pdf`

## Endpoints da API

Base URL local:

```text
http://localhost:3333
```

### Auth

Criar usuário:

```http
POST /auth/register
```

Body:

```json
{
  "name": "João",
  "email": "joao@email.com",
  "password": "123456"
}
```

Login:

```http
POST /auth/login
```

Body:

```json
{
  "email": "joao@email.com",
  "password": "123456"
}
```

### Transações

Listar transações:

```http
GET /transactions?month=2026-05
```

Criar transação:

```http
POST /transactions
```

Body:

```json
{
  "type": "EXPENSE",
  "category": "FOOD",
  "amount": 45.9,
  "description": "Almoço",
  "date": "2026-05-24"
}
```

Excluir transação:

```http
DELETE /transactions/:id
```

Resumo mensal:

```http
GET /transactions/summary/monthly?month=2026-05
```

### Metas

Listar metas:

```http
GET /goals
```

Criar meta:

```http
POST /goals
```

Body:

```json
{
  "title": "Reserva de emergência",
  "target": 5000,
  "saved": 1200
}
```

Atualizar meta:

```http
PATCH /goals/:id
```

Excluir meta:

```http
DELETE /goals/:id
```

### Relatórios

Exportar CSV:

```http
GET /reports/csv?month=2026-05
```

Exportar PDF:

```http
GET /reports/pdf?month=2026-05
```

Essas rotas precisam do token JWT no header `Authorization`.

## Categorias

No banco, as categorias são salvas em inglês para manter padrão técnico:

```text
FOOD
TRANSPORT
FUN
BILLS
SALARY
SHOPPING
```

Na interface, elas aparecem em português:

```text
Alimentação
Transporte
Lazer
Contas
Salário
Compras
```

## Build de produção

```bash
npm run build
```

Saídas:

- Backend compilado em `server/dist`
- Frontend compilado em `client/dist`

Para rodar o backend compilado:

```bash
npm run start -w server
```

## Deploy

Este projeto pode ser publicado de algumas formas.

### Frontend

Opções:

- Vercel
- Netlify
- Render Static Site

Build command:

```bash
npm run build -w client
```

Output:

```text
client/dist
```

Configure a variável:

```env
VITE_API_URL=https://sua-api.com
```

### Backend

Opções:

- Render
- Railway
- Fly.io

Build command:

```bash
npm install && npm run build -w server
```

Start command:

```bash
npm run start -w server
```

Variáveis:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="sua-chave-secreta"
PORT=3333
```

Para produção real, o ideal é usar PostgreSQL.

## Migrar de SQLite para PostgreSQL

Como o projeto usa Prisma, a migração é simples.

No `server/prisma/schema.prisma`, troque:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

Por:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Depois configure:

```env
DATABASE_URL="postgresql://usuario:senha@host:5432/meusaldo?schema=public"
```

E rode:

```bash
npm run db:migrate
npm run db:generate
```

Observação: ao migrar para PostgreSQL, pode ser interessante voltar a usar tipos com precisão decimal no Prisma, como `@db.Decimal(12, 2)`.

## Melhorias futuras

- Edição de transações
- Recuperação de senha
- Paginação de lançamentos
- Testes automatizados
- Tema claro/escuro
- Upload de comprovantes
- Dashboard anual
- Deploy com PostgreSQL em produção
- Docker Compose para ambiente completo

## Autor

Feito por Matheus para estudo, portfólio e evolução como desenvolvedor full stack.

## Licença

Este projeto está disponível para uso educacional e portfólio.
