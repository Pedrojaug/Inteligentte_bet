# 🏆 Bolão Inteligentte — Copa do Mundo 2026

Plataforma de bolões para a Copa do Mundo FIFA 2026. Crie seu próprio bolão, defina regras e valores, convide amigos e acompanhe tudo em tempo real!

## ⚽ Features

- **Crie bolões personalizados** com regras e valores customizáveis
- **Sistema de pagamento** integrado via PIX (ASAAS)
- **Placares ao vivo** da Copa do Mundo 2026
- **Ranking em tempo real** por bolão
- **Convites por link/código** para facilitar a participação
- **10% de comissão** da casa em cada bolão

## 🛠️ Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Pagamentos:** ASAAS API v3 (PIX / Boleto)
- **Placares:** API-Football (api-sports.io)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL
- ASAAS API Key
- API-Football API Key

### Backend
```bash
cd backend
npm install
cp .env.example .env  # Configure suas keys
npx prisma db push
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## 📝 License

Private — Inteligentte Lab

---

**Powered by Inteligentte Lab** ⚡
