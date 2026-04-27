# 🚀 PPSM: Personal Portfolio Manager (PSX Edition)

**PPSM** is a high-performance, AI-powered investment companion specifically designed for the **Pakistan Stock Exchange (PSX)**. It bridges the gap between raw market data and actionable investment intelligence, providing retail investors with tools previously reserved for institutional brokers.

---

## 🌟 Why Use PPSM?

Investing in the PSX can be overwhelming due to fragmented data and fast-moving market trends. PPSM centralizes your entire investment journey into a single, premium dashboard.

### **Key Benefits for the User:**
*   **Real-Time Intelligence**: Stop relying on delayed quotes. PPSM scrapes the PSX Data Portal every 5 minutes to give you the most accurate pricing, volume, and change metrics.
*   **Your Personal AI Broker**: The integrated **AI Analyst** isn't just a chatbot—it's a financial expert. It automatically detects symbols in your chat, searches the live web for news, checks your actual portfolio holdings, and gives you a **BUY/HOLD/SELL verdict** based on real-time data.
*   **Visual Market Clarity**: Understand where the money is moving with **Sector Heatmaps**. Instantly see which industries are leading the market and which are lagging.
*   **Simplified Portfolio Tracking**: Effortlessly manage your holdings. Track your profit/loss in real-time, view your transaction history, and even "bin" stocks you're no longer interested in without losing your historical data.
*   **Data-Driven Decisions**: View detailed candlestick charts and 10-hour price trends to identify entry and exit points with precision.

---

## 🛠️ Technology Stack

PPSM is built using a modern, scalable **Monorepo Architecture** with industry-leading technologies:

### **Frontend (The UI/UX Experience)**
*   **React & Vite**: For a lightning-fast, reactive user interface.
*   **TypeScript**: Ensuring robust, type-safe code and fewer runtime errors.
*   **Tailwind CSS & Shadcn UI**: A premium design system featuring glassmorphism, dark mode, and responsive layouts.
*   **Framer Motion**: Smooth micro-animations that make the interface feel alive and professional.
*   **TanStack Query**: High-performance data fetching and synchronization with the backend.

### **Backend (The Engine)**
*   **FastAPI (Python)**: A high-performance, asynchronous web framework for building the API layer.
*   **Motor (Async MongoDB)**: Non-blocking database interactions for handling high-frequency market data.
*   **OpenAI GPT-4o-mini**: Powers the AI Analyst for deep-dive stock reports and conversational financial advice.
*   **DuckDuckGo Search (DDGS)**: Real-time web scraping for the latest news and market sentiment.
*   **BeautifulSoup4**: Precision scraping of the PSX Data Portal for live market metrics.

### **Infrastructure & Security**
*   **MongoDB Atlas**: A cloud-hosted, scalable NoSQL database.
*   **Clerk Authentication**: Secure, enterprise-grade user authentication and session management.
*   **Concurrent Orchestration**: Managed startup of both services using a unified development environment.

---

## 🚦 Getting Started

1.  **Clone the Repo**: `git clone <repo-url>`
2.  **Install Dependencies**: `npm install` (at the root)
3.  **Environment Variables**: 
    *   Add your `MONGODB_URI`, `OPENAI_API_KEY`, and `CLERK_SECRET_KEY` to the `backend/.env` file.
    *   Add your `VITE_CLERK_PUBLISHABLE_KEY` to the `frontend/.env` file.
4.  **Run Development**: `npm run dev`

---

**PPSM** — Empowering Pakistani investors with elite-level data and AI.
