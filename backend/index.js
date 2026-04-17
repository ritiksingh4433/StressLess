const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const OpenAI = require('openai');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const prisma = new PrismaClient();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const adminEmails = new Set(
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

const configuredFrontendOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS || '').split(',')
]
  .map((url) => (url || '').trim())
  .filter(Boolean);

const isAdminEmail = (email) => {
  if (!email) return false;
  return adminEmails.has(String(email).trim().toLowerCase());
};

const isUuid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const promoteConfiguredAdminIfNeeded = async (user) => {
  if (!user || !isAdminEmail(user.email) || user.role === 'admin') {
    return user;
  }

  return prisma.user.update({
    where: { id: user.id },
    data: { role: 'admin' },
  });
};

// Enhanced CORS configuration to handle different network conditions
const corsOptions = {
  origin: function (origin, callback) {
    // In local development, allow all origins to avoid preflight/network issues.
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Production and development origins
    const allowedOrigins = [
      // Production
      'https://stress-less-omega.vercel.app',
      ...configuredFrontendOrigins,
      /^https:\/\/.+\.onrender\.com$/,
      /^https:\/\/.+\.vercel\.app$/,
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
      callback(null, false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return cors(corsOptions)(req, res, next);
  }
  return next();
});
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

const requireAdmin = async (req, res, next) => {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, role: true },
    });

    if (!dbUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (dbUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.admin = dbUser;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Failed to verify admin access' });
  }
};

// --- AUTH ROUTES ---

// Google Auth
app.post('/api/auth/google', async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: 'Google Sign-In is not configured on server.' });
    }

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
      update: {
        displayName: name,
        photoURL: picture,
        ...(isAdminEmail(email) ? { role: 'admin' } : {}),
      },
      create: {
        email,
        displayName: name,
        photoURL: picture,
        role: isAdminEmail(email) ? 'admin' : 'user',
      },
    });

    user = await promoteConfiguredAdminIfNeeded(user);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );

    res.json({ token, user });
  } catch (error) {
    console.error('Google Auth Error:', error);
    const message = error?.message || 'Google authentication failed';
    if (message.includes('Wrong recipient') || message.includes('audience')) {
      return res.status(401).json({ error: 'Google client ID mismatch. Please contact support.' });
    }
    if (message.includes('Token used too late') || message.includes('Invalid token')) {
      return res.status(401).json({ error: 'Google token expired or invalid. Please try again.' });
    }
    res.status(500).json({ error: 'Failed to login with Google.' });
  }
});

// Login - only existing users with correct password
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'No account found with this email. Please sign up first.' });
    }

    // Google-only users don't have a password
    if (!user.password) {
      return res.status(401).json({ error: 'This account uses Google Sign-In. Please log in with Google.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    user = await promoteConfiguredAdminIfNeeded(user);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );

    // Don't send password back to frontend
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Signup - create new account with hashed password
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, displayName } = req.body;
  try {
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        displayName,
        role: isAdminEmail(email) ? 'admin' : 'user',
      }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );

    // Don't send password back to frontend
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- USER ROUTES ---

// Get current user (validate token & user still exists)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update User Profile (age, gender)
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { age, gender } = req.body;
    const updateData = {};
    if (age !== undefined) updateData.age = parseInt(age) || null;
    if (gender !== undefined) updateData.gender = gender || null;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
    });

    res.json({ user });
  } catch (error) {
    console.error('Profile Update Error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
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

// --- ADMIN ROUTES ---

app.get('/api/admin/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [usersCount, resultsCount, appointmentsCount] = await prisma.$transaction([
      prisma.user.count(),
      prisma.testResult.count(),
      prisma.appointment.count(),
    ]);

    res.json({ usersCount, resultsCount, appointmentsCount });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ error: 'Failed to load admin overview' });
  }
});

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();

    const users = await prisma.user.findMany({
      where: search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { displayName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: {
        id: true,
        email: true,
        displayName: true,
        photoURL: true,
        age: true,
        gender: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            results: true,
            appointments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users });
  } catch (error) {
    console.error('Admin users list error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/admin/users/:userId/history', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        age: true,
        gender: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [results, appointments] = await prisma.$transaction([
      prisma.testResult.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
      }),
      prisma.appointment.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    res.json({ user, results, appointments });
  } catch (error) {
    console.error('Admin user history error:', error);
    res.status(500).json({ error: 'Failed to fetch user history' });
  }
});

app.patch('/api/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { displayName, age, gender, role } = req.body;

    if (!isUuid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Allowed values: user, admin' });
    }

    const data = {};
    if (displayName !== undefined) data.displayName = displayName || null;
    if (age !== undefined) data.age = age === null || age === '' ? null : parseInt(age);
    if (gender !== undefined) data.gender = gender || null;
    if (role !== undefined) data.role = role;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        displayName: true,
        age: true,
        gender: true,
        role: true,
      },
    });

    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Admin update user error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isUuid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    if (userId === req.admin.id) {
      return res.status(400).json({ error: 'You cannot delete your own admin account' });
    }

    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.$transaction([
      prisma.testResult.deleteMany({ where: { userId } }),
      prisma.appointment.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Admin delete user error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.get('/api/admin/results', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const results = await prisma.testResult.findMany({
      include: {
        user: {
          select: { id: true, email: true, displayName: true },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    res.json({ results });
  } catch (error) {
    console.error('Admin results list error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

app.delete('/api/admin/results/:resultId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { resultId } = req.params;
    await prisma.testResult.delete({ where: { id: resultId } });
    res.json({ success: true });
  } catch (error) {
    console.error('Admin delete result error:', error);
    res.status(500).json({ error: 'Failed to delete result' });
  }
});

app.get('/api/admin/appointments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        user: {
          select: { id: true, email: true, displayName: true },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    res.json({ appointments });
  } catch (error) {
    console.error('Admin appointments list error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

app.patch('/api/admin/appointments/:appointmentId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { doctorName, slot, status } = req.body;
    const data = {};

    if (doctorName !== undefined) data.doctorName = doctorName;
    if (slot !== undefined) data.slot = slot;
    if (status !== undefined) data.status = status;

    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data,
      include: {
        user: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    res.json({ appointment });
  } catch (error) {
    console.error('Admin update appointment error:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

app.delete('/api/admin/appointments/:appointmentId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    await prisma.appointment.delete({ where: { id: appointmentId } });
    res.json({ success: true });
  } catch (error) {
    console.error('Admin delete appointment error:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
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
    if (error.status === 401 || error.status === 403 || (error.message && error.message.includes('401'))) {
      return res.status(503).json({ error: 'AI service authentication failed. Please check your OpenRouter API key.' });
    }
    res.status(500).json({ error: 'Failed to get AI response. Please try again.' });
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
    if (error.status === 401 || error.status === 403 || (error.message && error.message.includes('401'))) {
      return res.status(503).json({ error: 'AI service authentication failed. Please check your OpenRouter API key.' });
    }
    res.status(500).json({ error: 'Failed to generate AI analysis. Please try again.' });
  }
});

// AI-Powered Personalized Question Generation
app.post('/api/generate-questions', authenticateToken, async (req, res) => {
  try {
    const { userResponse } = req.body;

    const validCategories = ['medical', 'financial', 'relationship'];
    const genericFallbacks = {
      medical: [
        'Do you feel physically exhausted most days?',
        'Do you experience trouble sleeping due to stress?',
        'Do you feel mentally drained during the day?',
        'Do you experience headaches or body tension?',
        'Do you feel burnout from daily responsibilities?'
      ],
      financial: [
        'Do you worry about money regularly?',
        'Do you feel anxious about your financial future?',
        'Do unexpected expenses cause you significant stress?',
        'Do financial concerns affect your daily mood?',
        'Do you feel financially insecure?'
      ],
      relationship: [
        'Do you feel emotionally unsupported by those close to you?',
        'Do conflicts with others affect your peace of mind?',
        'Do you feel lonely even around people?',
        "Do others' expectations cause you stress?",
        'Do you find it hard to express your feelings?'
      ]
    };

    const buildFallbackResponse = (inputText) => {
      const text = String(inputText || '').toLowerCase();
      const categorySignals = {
        medical: ['sleep', 'tired', 'fatigue', 'health', 'pain', 'headache', 'burnout', 'exhausted', 'body'],
        financial: ['money', 'bill', 'debt', 'expense', 'salary', 'income', 'loan', 'rent', 'financial'],
        relationship: ['family', 'friend', 'relationship', 'partner', 'conflict', 'lonely', 'trust', 'argument']
      };

      const scores = {
        medical: 0,
        financial: 0,
        relationship: 0,
      };

      Object.entries(categorySignals).forEach(([cat, words]) => {
        words.forEach((word) => {
          if (text.includes(word)) scores[cat] += 1;
        });
      });

      const ranked = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .map(([cat]) => cat);

      const primaryCategory = ranked[0] || 'medical';
      const secondary = ranked[1] || (primaryCategory === 'financial' ? 'medical' : 'financial');
      const tertiary = ranked[2] || 'relationship';
      const distribution = {
        [primaryCategory]: 8,
        [secondary]: 4,
        [tertiary]: 3,
      };

      const keywords = text
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 3)
        .slice(0, 5);

      const questions = [];
      [primaryCategory, secondary, tertiary].forEach((cat) => {
        const source = genericFallbacks[cat] || [];
        const count = distribution[cat] || 0;

        for (let i = 0; i < count; i += 1) {
          const base = source[i % source.length] || `Do you experience stress related to ${cat}?`;
          questions.push({ text: base, category: cat });
        }
      });

      return {
        primaryCategory,
        keywords,
        questions: questions.slice(0, 15),
      };
    };

    if (!userResponse || userResponse.trim().length < 10) {
      return res.status(400).json({ error: 'Please describe your situation in at least a few sentences.' });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      const fallback = buildFallbackResponse(userResponse);
      return res.json({ ...fallback, generatedBy: 'fallback' });
    }

    const completion = await openai.chat.completions.create({
      model: "stepfun/step-3.5-flash:free",
      messages: [
        {
          role: "system",
          content: `You are a clinical psychologist designing a personalized stress assessment. You will receive a user's description of their problems. Your job:

1. ANALYZE the user's text to identify their main stress areas among these 3 categories:
   - medical (health, sleep, fatigue, physical symptoms, burnout)
   - financial (money, debt, expenses, income, savings, career finances)
   - relationship (family, friends, loneliness, conflicts, social pressure, trust)

2. DETERMINE which category is the PRIMARY concern (the one they mention most or seems most distressing).

3. GENERATE exactly 15 stress assessment questions following these rules:
   - The PRIMARY category gets 8 questions
   - The other two categories get 4 and 3 questions respectively (whichever is more relevant gets 4)
   - Questions should be PERSONALIZED based on the specific issues the user described
   - Questions must be answerable on a Never/Rarely/Sometimes/Often/Always scale (0-4)
   - Questions should start with "Do you..." or "Have you..." 
   - Questions should be empathetic and non-judgmental
   - Extract KEYWORDS from the user's description and weave them into questions
   - Make questions specific to their situation, not generic

4. RESPOND in this exact JSON format (no markdown, no code blocks, just raw JSON):
{
  "primaryCategory": "medical|financial|relationship",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "questions": [
    {"text": "Do you...", "category": "medical"},
    {"text": "Do you...", "category": "financial"},
    ...
  ]
}

IMPORTANT: Return ONLY valid JSON. No extra text, no explanation, no markdown.`
        },
        {
          role: "user",
          content: userResponse
        }
      ],
    });

    let responseText = completion.choices[0].message.content.trim();
    
    // Clean up response - remove markdown code blocks if present
    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse AI response:', responseText);
      return res.status(500).json({ error: 'AI returned invalid format. Please try again.' });
    }

    // Validate the response structure
    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length < 10) {
      const fallback = buildFallbackResponse(userResponse);
      return res.json({ ...fallback, generatedBy: 'fallback' });
    }

    // Ensure exactly 15 questions and proper categories
    const validQuestions = parsed.questions
      .filter(q => q.text && q.category && validCategories.includes(q.category))
      .slice(0, 15);

    if (validQuestions.length < 15) {
      // Pad with generic questions if AI didn't produce enough
      while (validQuestions.length < 15) {
        for (const cat of validCategories) {
          if (validQuestions.length >= 15) break;
          const catQuestions = validQuestions.filter(q => q.category === cat);
          const fallback = genericFallbacks[cat].find(
            fb => !validQuestions.some(q => q.text === fb)
          );
          if (fallback) {
            validQuestions.push({ text: fallback, category: cat });
          }
        }
      }
    }

    res.json({
      primaryCategory: parsed.primaryCategory || 'medical',
      keywords: parsed.keywords || [],
      questions: validQuestions
    });

  } catch (error) {
    console.error('Question Generation Error:', error);
    const text = req?.body?.userResponse || '';
    const fallback = {
      primaryCategory: 'medical',
      keywords: text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 3)
        .slice(0, 5),
      questions: [
        { text: 'Do you feel physically exhausted most days?', category: 'medical' },
        { text: 'Do you experience trouble sleeping due to stress?', category: 'medical' },
        { text: 'Do you feel mentally drained during the day?', category: 'medical' },
        { text: 'Do you experience headaches or body tension?', category: 'medical' },
        { text: 'Do you feel burnout from daily responsibilities?', category: 'medical' },
        { text: 'Do you worry about money regularly?', category: 'financial' },
        { text: 'Do you feel anxious about your financial future?', category: 'financial' },
        { text: 'Do unexpected expenses cause you significant stress?', category: 'financial' },
        { text: 'Do financial concerns affect your daily mood?', category: 'financial' },
        { text: 'Do you feel emotionally unsupported by those close to you?', category: 'relationship' },
        { text: 'Do conflicts with others affect your peace of mind?', category: 'relationship' },
        { text: 'Do you feel lonely even around people?', category: 'relationship' },
        { text: "Do others' expectations cause you stress?", category: 'relationship' },
        { text: 'Do you find it hard to express your feelings?', category: 'relationship' },
        { text: 'Do relationship conflicts affect your daily peace?', category: 'relationship' },
      ],
    };

    res.json({ ...fallback, generatedBy: 'fallback' });
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

