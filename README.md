# 🤖 AI-Powered Job Preparation Assistant

An intelligent full-stack web application that helps candidates prepare for jobs by analyzing their resume against job requirements using AI. The system leverages Gemini AI to provide skill gap analysis, interview preparation, and a personalized day-wise roadmap to improve job readiness.



## 🚀 Features

* 🔐 **User Authentication**

  * Secure login system for registered users

* 📄 **Resume & Job Description Analysis**

  * Upload resume and input job role or description

* 🤖 **AI-Powered Insights (Gemini AI)**

  * 📊 Skill Gap Percentage between resume and job requirements
  * ❓ Role-specific Interview Questions
  * 📚 Suggested Skills to Learn
  * 🗺️ Day-wise Preparation Roadmap

* 📈 **Personalized Career Guidance**

  * Helps users identify weaknesses and improve effectively before applying

---

## 🛠️ Tech Stack

### Frontend

* React.js (Vite)
* SCSS

### Backend

* Node.js
* Express.js

### Database

* MongoDB

### Tools & APIs

* Gemini AI (for analysis and recommendations)
* Thunder Client (API testing)


## ⚙️ Installation & Setup

### 1️⃣ Clone the repository

git clone https://github.com/YogeshK45/interview-ai.git
cd interview-ai


### 2️⃣ Backend Setup

cd backend
npm install
npm run dev

---

### 3️⃣ Frontend Setup

cd frontend
npm install
npm run dev

---

## 🌐 Environment Variables

Create a `.env` file in the backend folder and add:

PORT=3000

MONGO_URI=your_mongodb_connection_string

GEMINI_API_KEY=your_gemini_api_key

JWT_SECRET=your_secret_key

---

## 🔌 Ports Configuration

* Frontend runs on: http://localhost:5173
* Backend runs on: http://localhost:3000


## 🎯 How It Works

1. User logs into the platform
2. Uploads resume and enters job description
3. Gemini AI analyzes both inputs
4. System generates:

   * Skill gap percentage
   * Interview questions
   * Required skills
   * Day-wise preparation roadmap

## 👨‍💻 Author

Developed by **Yogesh Kumar**
