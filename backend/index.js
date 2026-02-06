const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const OpenAI = require('openai');

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Enhanced CORS configuration to handle different network conditions
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Production and development origins
    const allowedOrigins = [
      // Production
      'https://stress-less-omega.vercel.app',
      // Development
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/,  // Local network
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,   // Local network
    ];
    
    const isAllowed = allowedOrigins.some(pattern => 
      typeof pattern === 'string' ? pattern === origin : pattern.test(origin)
    );
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add timeout middleware
app.use((req, res, next) => {
  // Set timeout to 30 seconds
  req.setTimeout(30000);
  res.setTimeout(30000);
  next();
});

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// --- AUTH ROUTES ---

// Google Auth
app.post('/api/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'idToken is required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let user = await prisma.user.upsert({
      where: { email },
      update: { displayName: name, photoURL: picture },
      create: { email, displayName: name, photoURL: picture },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );

    res.json({ token, user });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Regular Login with Password (Placeholder for security - normally use bcrypt)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await prisma.user.findUnique({ where: { email } });
    
    // If user doesn't exist, we'll create one for this demo (Auto-signup)
    // In a real app, you would check the password here
    if (!user) {
      user = await prisma.user.create({
        data: { 
          email,
          displayName: email.split('@')[0]
        }
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Regular Signup
app.post('/api/auth/signup', async (req, res) => {
  const { email, displayName } = req.body;
  try {
    const user = await prisma.user.create({
      data: { email, displayName }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- APP ROUTES ---

// Store Stress Test Results
app.post('/api/results', authenticateToken, async (req, res) => {
  try {
    const { score, categoricalScores, level } = req.body;
    const result = await prisma.testResult.create({
      data: {
        userId: req.user.id,
        score,
        categoricalScores,
        level,
      },
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Book Appointment
app.post('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const { doctorName, slot } = req.body;
    const appointment = await prisma.appointment.create({
      data: {
        userId: req.user.id,
        doctorName,
        slot,
      },
    });
    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get User History
app.get('/api/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const results = await prisma.testResult.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });
    const appointments = await prisma.appointment.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });
    res.json({ results, appointments });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch history', 
      message: error.message,
      type: error.code || 'UNKNOWN_ERROR'
    });
  }
});

// AI Chatbot Route
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { message, history } = req.body;
    
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'OpenRouter API Key not configured' });
    }

    // Convert history format to OpenAI format
    const messages = [
      { 
        role: "system", 
        content: `You are CalmBot, a supportive and empathetic mental health and wellness AI assistant for the StressLess platform.
        Your instructions are:
        1. GOAL: Provide stress-relief tips, emotional support, and explain wellness concepts.
        2. TONE: Be kind, encouraging, professional, and concise. Format responses for chat bubbles.
        3. STRICT SCOPE RESTRICTION: You are strictly limited to mental health and wellness topics.
           - If a user asks about ANY other topic (e.g., programming, "what is Java", math, general facts), you MUST refuse to answer.
           - In these cases, reply ONLY with: "I am designed to help with mental wellness and stress relief. I cannot assist with that topic, but I'm here if you'd like to talk about how you're feeling."
    4. SAFETY: If a user expresses severe distress or self-harm, gently suggest they consult a professional immediately.`
      },
      ...(history || []).map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.parts[0].text
      })),
      { role: "user", content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: "stepfun/step-3.5-flash:free", 
      messages: messages,
    });

    const responseText = completion.choices[0].message.content;

    res.json({ text: responseText });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: 'Failed to get AI response: ' + (error.message || 'Unknown error') });
  }
});

// AI Assessment Review Route
app.post('/api/ai-analysis', authenticateToken, async (req, res) => {
  try {
    const { score, categoricalScores, level, resultId, forceRegenerate } = req.body;
    
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'OpenRouter API Key not configured. Please add OPENROUTER_API_KEY to your .env file.' });
    }

    // Validate required fields
    if (score === undefined || !categoricalScores || !level) {
      return res.status(400).json({ error: 'Missing required fields: score, categoricalScores, level' });
    }

    // Check if analysis already exists in DB for this result (unless forceRegenerate is true)
    if (resultId && !forceRegenerate) {
      console.log("Checking DB for existing analysis for ID:", resultId);
      try {
        const existingResult = await prisma.testResult.findUnique({
          where: { id: resultId }
        });
        if (existingResult?.aiAnalysis) {
          console.log("Found existing analysis in DB. Returning cached version.");
          return res.json({ analysis: existingResult.aiAnalysis, cached: true });
        }
        console.log("No existing analysis found in DB. Generating new one...");
      } catch (dbError) {
        console.error("Error checking DB for existing analysis:", dbError);
        // Continue to generate new analysis
      }
    } else if (forceRegenerate) {
      console.log("Force regenerate requested. Generating new analysis...");
    }

    // Determine which categories have the highest stress
    const categories = [
      { name: 'Medical/Health', score: categoricalScores.medical, max: 20 },
      { name: 'Financial', score: categoricalScores.financial, max: 20 },
      { name: 'Relationship', score: categoricalScores.relationship, max: 20 }
    ];
    
    // Sort by score descending to find highest stress areas
    const sortedCategories = [...categories].sort((a, b) => b.score - a.score);
    const highestStressArea = sortedCategories[0];
    const secondHighestArea = sortedCategories[1];
    
    // Determine stress levels for each category
    const getCategoryLevel = (score) => {
      if (score <= 5) return 'Low';
      if (score <= 10) return 'Mild';
      if (score <= 15) return 'Moderate';
      return 'High';
    };

    const medicalLevel = getCategoryLevel(categoricalScores.medical);
    const financialLevel = getCategoryLevel(categoricalScores.financial);
    const relationshipLevel = getCategoryLevel(categoricalScores.relationship);

    const prompt = `You are a wellness AI. Generate a PERSONALIZED stress management review.

ASSESSMENT RESULTS:
- Overall Level: ${level} (${score}/60 total)
- 🏥 Medical/Health Stress: ${categoricalScores.medical}/20 (${medicalLevel})
- 💰 Financial Stress: ${categoricalScores.financial}/20 (${financialLevel})
- 💑 Relationship Stress: ${categoricalScores.relationship}/20 (${relationshipLevel})

HIGHEST STRESS AREA: ${highestStressArea.name} (${highestStressArea.score}/20)
SECOND HIGHEST: ${secondHighestArea.name} (${secondHighestArea.score}/20)

IMPORTANT: Generate tips that SPECIFICALLY address the user's stress categories:
- If Medical/Health stress is high: Include tips about sleep, exercise, health checkups, physical relaxation
- If Financial stress is high: Include tips about budgeting, financial planning, reducing money anxiety, small savings habits
- If Relationship stress is high: Include tips about communication, setting boundaries, quality time, conflict resolution

OUTPUT FORMAT (follow exactly):

🌱 Personalized tips for your ${level} stress

📊 Your highest stress area: ${highestStressArea.name}

1️⃣ [First tip title - related to ${highestStressArea.name}]

[Step 1]

[Step 2]

[Step 3]

2️⃣ [Second tip title - related to ${secondHighestArea.name}]

[Step 1]

[Step 2]

[Step 3]

3️⃣ [Third tip - general wellness]

[Step 1]

[Step 2]

[Step 3]

4️⃣ [Fourth tip - based on overall ${level} level]

[Step 1]

[Step 2]

[Step 3]

5️⃣ [Fifth tip - self-care/support]

[Step 1]

[Step 2]

[Step 3]

💪 Remember: Small steps lead to big changes!

RULES:
- Use emojis 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣
- Title on same line as emoji number
- Each step on separate line
- Empty line between each tip
- Make tips SPECIFIC to the stress categories shown above
- Keep steps short and actionable

Generate now:`;

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "arcee-ai/trinity-large-preview:free", 
        messages: [
          { 
            role: "system", 
            content: "You are a wellness AI specializing in stress management. Generate PERSONALIZED tips based on the user's specific stress categories (Medical, Financial, Relationship). Output ONLY the formatted review. No intro text, no explanations - just the formatted tips starting with the 🌱 emoji." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 1200,
      });
    } catch (aiError) {
      console.error('OpenRouter API Error:', aiError);
      return res.status(503).json({ 
        error: 'AI service temporarily unavailable. Please try again later.',
        details: aiError.message
      });
    }

    const analysis = completion?.choices?.[0]?.message?.content;
    
    if (!analysis || analysis.trim() === '') {
      console.error('AI returned empty response');
      return res.status(503).json({ error: 'AI returned empty response. Please try again.' });
    }

    // Save to DB if resultId is provided
    if (resultId) {
      try {
        console.log("Saving new analysis to DB for ID:", resultId);
        await prisma.testResult.update({
          where: { id: resultId },
          data: { aiAnalysis: analysis }
        });
        console.log("Successfully saved analysis to DB.");
      } catch (dbSaveError) {
        console.error("Failed to save analysis to DB:", dbSaveError);
        // Still return the analysis even if save failed
      }
    }

    res.json({ analysis, cached: false });
  } catch (error) {
    console.error('AI Analysis Error:', error);
    res.status(500).json({ error: 'Failed to generate AI analysis: ' + (error.message || 'Unknown error') });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error.message
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 5000;

// Graceful shutdown
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Accessible on all network interfaces (0.0.0.0:${PORT})`);
  console.log(`📡 Local: http://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
  });
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
  });
  await prisma.$disconnect();
  process.exit(0);
});

