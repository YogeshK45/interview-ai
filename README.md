# Interview-AI

An intelligent full-stack AI-powered job preparation platform that helps candidates ace technical and behavioral interviews. The application extracts and parses resume content, evaluates candidate experience against target job descriptions, generates tailored interview questions with model answers, builds structured preparation roadmaps, and provides downloadable PDF reports.

---

## 📌 Project Overview

**Interview-AI** streamlines interview readiness by eliminating guesswork. Instead of generic preparation materials, it uses Google Gemini AI to conduct in-depth skill matching and ATS score analysis, creating targeted preparation strategies for developers and job seekers.

### User Flow:
1. **Authentication**: User registers or logs in with secure JWT-based authentication.
2. **Input Submission**: Candidate uploads a PDF resume (or enters self-description) and submits the target Job Description (JD) along with a target preparation timeline (e.g., 15 minutes, 24 hours, 7 days, 30 days).
3. **AI Evaluation & Plan Generation**: The backend parses the PDF resume, extracts key sections, and prompts Gemini AI to generate role match metrics, categorized interview questions (Technical, Behavioral, HR, System Design, Coding, Projects), and a timeline-tailored preparation roadmap.
4. **Review & History**: The candidate views the interactive report in the React dashboard and accesses previously generated reports.
5. **PDF Export**: The candidate downloads an executive, printable PDF version rendered via headless Chromium/Puppeteer.

---

## ✨ Key Features

- 🔐 **Authentication & Session Management**
  - Secure JWT authentication with HTTP-only cookies.
  - Password hashing with bcrypt.
  - Token blacklisting for secure logout sessions.

- 📄 **Resume Parsing & Caching**
  - Server-side PDF text extraction using `pdf-parse`.
  - In-memory parsing cache to prevent redundant PDF processing.

- 🤖 **Gemini AI Analysis & Strategy Generation**
  - **Role Match Score & ATS Compatibility** evaluation.
  - **Categorized Question Sets**: Targeted questions for Technical, Behavioral, HR, System Design, Coding, and Project Architecture—each with interviewer intention and model answers.
  - **Timeline-Based Roadmaps**: Step-by-step preparation plans tailored to chosen durations (e.g., quick 15-minute refresher up to 30-day mastery plans).

- 🖨️ **Server-Side PDF Export**
  - Dynamic HTML report rendering into formatted PDF documents using headless `puppeteer-core` and system Chromium.

- 🗄️ **Persistent User Reports History**
  - Comprehensive history of all generated interview plans per user with delete and view capabilities.

- 🐳 **Production-Ready Docker Architecture**
  - Multi-container setup orchestrating Frontend (Nginx), Backend (Express + Chromium), and MongoDB with healthchecks and persistent volumes.

- 🚀 **Automated CI/CD Pipeline**
  - Automated GitHub Actions workflow to build and push Docker images to Docker Hub on every push to `main`.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite 7, React Router 7, SCSS, Axios |
| **Backend** | Node.js 22 LTS, Express.js 5, Multer, Cookie-Parser, CORS |
| **Database** | MongoDB 7.0, Mongoose 9 ODM |
| **AI & Utilities** | Google Gemini API (`@google/genai`), `zod`, `pdf-parse`, `puppeteer-core`, `@sparticuz/chromium` |
| **Containerization** | Docker, Docker Compose, Nginx Alpine (Reverse Proxy & SPA server) |
| **CI/CD & Registry** | GitHub Actions, Docker Hub |

---

## 📐 Project Architecture

### 1. Application Request Flow
```
┌─────────────────┐       HTTP / SPA      ┌─────────────────────────┐
│                 │ ────────────────────► │  Frontend (React / SPA) │
│  User Browser   │                       └───────────┬─────────────┘
│                 │       REST API (JSON)             │ Axios (/api/...)
│                 │ ──────────────────────────────────┼─────────────┐
└─────────────────┘                                   │             │
                                                      ▼             ▼
                                      ┌─────────────────────────────────────┐
                                      │       Backend (Express.js API)      │
                                      └───────┬──────────────┬──────────────┘
                                              │              │
                     Mongoose / MongoDB Wire  │              │ Gemini AI SDK
                                              ▼              ▼
                                      ┌──────────────┐ ┌────────────────────┐
                                      │   MongoDB    │ │  Google Gemini AI  │
                                      │   Database   │ └────────────────────┘
                                      └──────────────┘
```

### 2. Docker Container Networking Architecture
```
                         ┌───────────────────────────┐
                         │   Host Machine (Browser)  │
                         └─────────────┬─────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            │ Port 5173:80                                        │ Port 3000:3000
            ▼                                                     ▼
┌───────────────────────────────┐                     ┌───────────────────────────────┐
│     interview_ai_frontend     │                     │     interview_ai_backend      │
│     (Nginx Alpine Container)  │                     │    (Node 22 + Chromium)       │
└───────────────────────────────┘                     └───────────────┬───────────────┘
                                                                      │ MONGO_URI
                                                                      │ mongodb://mongodb:27017/interview-ai
                                                                      ▼
                                                      ┌───────────────────────────────┐
                                                      │     interview_ai_mongodb      │
                                                      │     (Mongo 7.0 Container)     │
                                                      │     Volume: mongodb_data      │
                                                      └───────────────────────────────┘
```

---

## 📁 Project Structure

```
interview-ai/
├── .github/
│   └── workflows/
│       └── docker-ci.yml             # GitHub Actions CI/CD pipeline definition
├── Backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js           # Mongoose connection logic
│   │   ├── controllers/
│   │   │   ├── auth.controller.js    # Register, login, logout, getMe handlers
│   │   │   └── interview.controller.js # Generate report, fetch, delete, PDF export
│   │   ├── middlewares/
│   │   │   └── auth.middleware.js    # JWT authentication & blacklist verification
│   │   ├── models/
│   │   │   ├── blacklist.model.js    # Blacklisted tokens schema
│   │   │   ├── interviewReport.model.js # Interview report schema
│   │   │   └── user.model.js         # User account schema
│   │   ├── routes/
│   │   │   ├── auth.routes.js        # /api/auth endpoints
│   │   │   └── interview.routes.js   # /api/interview endpoints
│   │   ├── services/
│   │   │   └── ai.service.js         # Gemini AI & Puppeteer PDF generation
│   │   └── app.js                    # Express app configuration, CORS & middlewares
│   ├── .dockerignore                 # Backend build ignore rules
│   ├── .env.example                  # Backend environment variables template
│   ├── Dockerfile                    # Backend Dockerfile (Node 22 + Chromium)
│   ├── package.json                  # Backend dependencies and scripts
│   └── server.js                     # Backend HTTP server entry point
├── Frontend/
│   ├── public/                       # Static public assets
│   ├── src/
│   │   ├── features/
│   │   │   ├── auth/                 # Auth pages, components, and API service
│   │   │   └── interview/            # Interview report generation, view & styling
│   │   ├── pages/                    # Landing and general application pages
│   │   ├── style/                    # Global SCSS styles and tokens
│   │   ├── App.jsx                   # React root component
│   │   ├── app.routes.jsx            # React Router 7 configuration
│   │   └── main.jsx                  # React application entry point
│   ├── .dockerignore                 # Frontend build ignore rules
│   ├── .env.example                  # Frontend environment variables template
│   ├── Dockerfile                    # Multi-stage Dockerfile (Vite Build + Nginx)
│   ├── index.html                    # Single Page Application HTML template
│   ├── nginx.conf                    # Nginx SPA fallback and caching configuration
│   ├── package.json                  # Frontend dependencies and scripts
│   └── vite.config.js                # Vite build configuration
├── .env.example                      # Root Docker environment template
├── docker-compose.yml                # Docker Compose orchestration file
└── README.md                         # Project documentation
```

---

## 🔑 Environment Variables

Create your local `.env` files using the provided templates:

### Root Docker Environment (`.env`)
Used by `docker-compose.yml` when running containerized:
```env
PORT=3000
MONGO_URI=mongodb://mongodb:27017/interview-ai
JWT_SECRET=your_jwt_secret_key_here
GOOGLE_GENAI_API_KEY=your_gemini_api_key_here
FRONTEND_URL=http://localhost:5173
VITE_API_URL=http://localhost:3000
```

### Backend Environment (`Backend/.env`)
Used when running backend locally without Docker:
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/interview-ai
JWT_SECRET=your_jwt_secret_key_here
GOOGLE_GENAI_API_KEY=your_gemini_api_key_here
FRONTEND_URL=http://localhost:5173
```

### Frontend Environment (`Frontend/.env`)
Used when running frontend locally without Docker:
```env
VITE_API_URL=http://localhost:3000
```

---

## 🚀 Running the Project Locally

### Method 1: Using Docker Compose (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YogeshK45/interview-ai.git
   cd interview-ai
   ```

2. **Set up root environment variables**:
   ```bash
   cp .env.example .env
   ```
   *(Update `GOOGLE_GENAI_API_KEY` and `JWT_SECRET` in `.env`)*

3. **Build and start all containers**:
   ```bash
   docker compose up -d --build
   ```

4. **Access the application**:
   - **Frontend UI**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:3000](http://localhost:3000)
   - **MongoDB**: `localhost:27017`

5. **Stop containers**:
   ```bash
   docker compose down
   ```

---

### Method 2: Manual Local Execution (Without Docker)

#### Prerequisites
- Node.js (v20+ or v22+)
- Local MongoDB running on `mongodb://localhost:27017`
- Google Chrome installed locally (for PDF generation)

#### 1. Start Backend
```bash
cd Backend
cp .env.example .env
# Configure your GOOGLE_GENAI_API_KEY and JWT_SECRET in .env
npm install
npm run dev
```
Backend runs on `http://localhost:3000`.

#### 2. Start Frontend
```bash
cd ../Frontend
cp .env.example .env
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

---

## 🐳 Docker Setup

The project includes customized Docker configurations for each tier:

### Backend Dockerfile (`Backend/Dockerfile`)
- **Base Image**: `node:22-bookworm-slim`
- **Chromium Dependencies**: Installs Debian `chromium` packages and fonts (`fonts-ipafont-gothic`, `fonts-wqy-zenhei`, `libxss1`, etc.) so Puppeteer PDF generation executes reliably in Linux containers.
- **Optimization**: Uses `npm ci --omit=dev` for deterministic and clean production installs.

### Frontend Dockerfile (`Frontend/Dockerfile`)
- **Multi-Stage Build**:
  - **Stage 1 (`build`)**: Compiles the React/Vite SPA bundle using `node:22-alpine` with `VITE_API_URL` build arg.
  - **Stage 2 (`production`)**: Serves compiled assets with `nginx:alpine` using custom `nginx.conf` (`try_files $uri $uri/ /index.html;`) to prevent 404s on browser refreshes.

### Docker Compose (`docker-compose.yml`)
- Orchestrates `frontend`, `backend`, and `mongodb:7.0`.
- Implements container healthchecks (`mongosh --eval "db.adminCommand('ping')"`).
- Uses named volume `mongodb_data` for persistent database storage across restarts.
- Uses bridge network `interview_network` for secure container-to-container DNS resolution.

---

## 🔄 CI/CD Pipeline

The project uses **GitHub Actions** for Continuous Integration and Continuous Delivery defined in [`.github/workflows/docker-ci.yml`](.github/workflows/docker-ci.yml).

### Workflow Flow:
```
  Git Push / PR to main
            ↓
   GitHub Actions Runner
            ↓
    Checkout Repository
            ↓
    Set up Docker Buildx
            ↓
  Log in to Docker Hub  (On push to main using Secrets)
            ↓
Build & Push Backend Image  ──►  ${DOCKERHUB_USERNAME}/interview-ai-backend:latest
            ↓
Build & Push Frontend Image ──►  ${DOCKERHUB_USERNAME}/interview-ai-frontend:latest
```

### Pipeline Triggers:
- **`push` to `main` branch**: Builds and pushes Docker images to Docker Hub.
- **`pull_request` to `main` branch**: Builds Docker images to validate code integrity without pushing to Docker Hub.

### Configured GitHub Repository Secrets:
- `DOCKERHUB_USERNAME`: Your Docker Hub account username.
- `DOCKERHUB_TOKEN`: Your Docker Hub Personal Access Token (PAT).

---

## 📡 API Reference

### Authentication Routes (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user | No |
| `POST` | `/api/auth/login` | Log in user and receive JWT cookie | No |
| `GET` | `/api/auth/logout` | Invalidate token and log out | Yes |
| `GET` | `/api/auth/get-me` | Get current authenticated user profile | Yes |

### Interview Routes (`/api/interview`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/interview/` | Upload resume (PDF) & generate AI report | Yes |
| `GET` | `/api/interview/` | Get all interview reports for current user | Yes |
| `GET` | `/api/interview/report/:interviewId` | Get single report details by ID | Yes |
| `DELETE` | `/api/interview/:interviewId` | Delete interview report by ID | Yes |
| `POST` | `/api/interview/report/pdf/:interviewReportId` | Generate & download PDF report | Yes |

---

## 👨‍💻 Author

Developed by **Yogesh Kumar**  
GitHub: [@YogeshK45](https://github.com/YogeshK45)
