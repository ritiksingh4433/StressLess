# StressLess 🧘

A modern mental wellness web application that helps users assess their stress levels, receive AI-powered analysis, and discover personalized remedies for stress management.

![React](https://img.shields.io/badge/React-19.1-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-7.1-646CFF?logo=vite)
![Express](https://img.shields.io/badge/Express-5.2-000000?logo=express)
![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)

## ✨ Features

- **Stress Assessment** - Take a 15-question test based on the Perceived Stress Scale (PSS) covering medical, financial, and relationship stress categories
- **AI-Powered Analysis** - Receive personalized stress analysis and recommendations powered by AI
- **CalmBot** - Chat with an AI wellness companion for mental health support and guidance
- **Therapy Remedies** - Explore curated wellness activities including:
  - 🧘 Yoga poses with guided instructions
  - 📚 Recommended reading materials
  - 🎧 Audio therapy and guided meditations
  - 👨‍⚕️ Professional doctor consultations
- **Appointment Booking** - Schedule appointments with mental health specialists
- **Dashboard** - Track your stress history and visualize progress over time
- **Dark/Light Mode** - Seamless theme switching for comfortable viewing

## 🛠️ Tech Stack

### Frontend
- **React 19** with Vite
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Recharts** for data visualization
- **Lucide React** for icons
- **Axios** for API calls

### Backend
- **Express.js 5** REST API
- **Prisma ORM** with PostgreSQL
- **JWT** for authentication
- **Google OAuth 2.0** integration
- **OpenRouter AI** for chat and analysis

## 📁 Project Structure

```
StressLess/
├── src/
│   ├── components/
│   │   ├── HomePage.jsx        # Landing page
│   │   ├── StressTest.jsx      # Assessment quiz
│   │   ├── ResultsPage.jsx     # Test results display
│   │   ├── Remedies.jsx        # Therapy options grid
│   │   ├── TherapyDetails.jsx  # Detailed therapy pages
│   │   ├── ChatBot.jsx         # AI wellness chatbot
│   │   ├── Dashboard.jsx       # User dashboard
│   │   ├── AppointmentSystem.jsx # Booking system
│   │   ├── Header.jsx          # Navigation header
│   │   ├── Footer.jsx          # Site footer
│   │   ├── Login.jsx           # Login form
│   │   ├── Signup.jsx          # Registration form
│   │   └── About.jsx           # About page
│   ├── context/
│   │   ├── AuthContext.jsx     # Authentication state
│   │   └── ThemeContext.jsx    # Dark/light mode
│   ├── utils/
│   │   └── networkHelper.js    # API utilities
│   ├── App.jsx                 # Main app component
│   └── main.jsx                # Entry point
├── backend/
│   ├── index.js                # Express server & routes
│   └── prisma/
│       └── schema.prisma       # Database schema
└── public/                     # Static assets
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Google OAuth credentials
- OpenRouter API key

### Environment Variables

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

#### Backend (backend/.env)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/stressless
JWT_SECRET=your-jwt-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_IDS=your-google-client-id
FRONTEND_URL=https://your-live-frontend-domain
FRONTEND_URLS=https://your-live-frontend-domain
OPENROUTER_API_KEY=your-openrouter-api-key
```

### Production Deployment Checklist

Use these values for the live StressLess deployment:

#### Frontend host
```env
VITE_API_URL=https://stressless.onrender.com/api
VITE_GOOGLE_CLIENT_ID=941813256456-k6uonsb8qmrqj7q2uql3r3njl23e0qpj.apps.googleusercontent.com
```

#### Backend host
```env
DATABASE_URL=your-production-neon-url
JWT_SECRET=use-a-long-random-secret
GOOGLE_CLIENT_ID=941813256456-k6uonsb8qmrqj7q2uql3r3njl23e0qpj.apps.googleusercontent.com
GOOGLE_CLIENT_IDS=941813256456-k6uonsb8qmrqj7q2uql3r3njl23e0qpj.apps.googleusercontent.com
FRONTEND_URL=https://stress-less-omega.vercel.app
FRONTEND_URLS=https://stress-less-omega.vercel.app
OPENROUTER_API_KEY=your-openrouter-api-key
```

#### Google Cloud Console
- Add `https://stress-less-omega.vercel.app` to Authorized JavaScript origins.
- Add `http://localhost:5173` to Authorized JavaScript origins for local development.
- Make sure the Web OAuth client ID matches the frontend and backend values above.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/stressless.git
   cd stressless
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Set up the database**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start the backend server**
   ```bash
   npm run dev
   ```

6. **Start the frontend (new terminal)**
   ```bash
   cd ..
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:5173`

## 📜 Available Scripts

### Frontend
| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

### Backend
| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (hot reload) |
| `npm start` | Start production server |
| `npx prisma migrate dev` | Run database migrations |
| `npx prisma studio` | Open Prisma Studio GUI |

## 🗄️ Database Schema

### User
- `id` - UUID primary key
- `email` - Unique email address
- `displayName` - User's display name
- `photoURL` - Profile picture URL
- `createdAt` / `updatedAt` - Timestamps

### TestResult
- `id` - UUID primary key
- `userId` - Foreign key to User
- `score` - Overall stress score (0-120)
- `categoricalScores` - JSON with medical/financial/relationship scores
- `level` - Stress level (Low/Moderate/High/Severe)
- `aiAnalysis` - Cached AI analysis text

### Appointment
- `id` - UUID primary key
- `userId` - Foreign key to User
- `doctorName` - Name of the specialist
- `slot` - Appointment time slot
- `status` - Booking status

## 🔐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/google` | Google OAuth login |
| POST | `/api/auth/login` | Email login |
| GET | `/api/user/history` | Get user's test history |
| POST | `/api/results` | Save test results |
| GET | `/api/results/:id/analysis` | Get AI analysis |
| POST | `/api/chat` | Chat with CalmBot |
| POST | `/api/appointments` | Book appointment |
| GET | `/api/appointments` | Get user's appointments |

## 🎨 Theme System

StressLess supports both dark and light modes using Tailwind CSS's `darkMode: 'class'` strategy. Toggle the theme using the sun/moon button in the header.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- [Perceived Stress Scale (PSS)](https://www.das.nh.gov/wellness/docs/percieved%20stress%20scale.pdf) - The psychological instrument used for stress assessment
- [OpenRouter](https://openrouter.ai/) - AI API provider
- [Unsplash](https://unsplash.com/) - Beautiful imagery

---

<p align="center">
  Made with ❤️ for mental wellness
</p>
