const express = require('express')
const path = require('path')
const dotenv = require('dotenv')
const colors = require('colors')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const mongoSanitize = require('express-mongo-sanitize')
const fileupload = require('express-fileupload')
const helmet = require('helmet')
const xss = require('xss-clean')
const rateLimit = require('express-rate-limit')
const hpp = require('hpp')
const cors = require('cors')
const fetch = require('node-fetch')
const errorHandler = require('./middleware/error')
const DBConnection = require('./config/db')

dotenv.config({ path: './config/.env' })
DBConnection()

const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users')
const categoryRoutes = require('./routes/categories')
const videoRoutes = require('./routes/videos')
const commentRoutes = require('./routes/comments')
const replyRoutes = require('./routes/replies')
const feelingRoutes = require('./routes/feelings')
const subscriptionRoutes = require('./routes/subscriptions')
const historiesRoutes = require('./routes/histories')
const searchRoutes = require('./routes/search')

const app = express()

app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ limit: '100mb', extended: true }))
app.use(cookieParser())

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// File uploading...
app.use(
  fileupload({
    useTempFiles: true,
    tempFileDir: '/tmp/',
    createParentPath: true,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max file size
  })
)

// Sanitize data
app.use(mongoSanitize())

// Set security headers
app.use(helmet())

// Set Content Security Policy
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      mediaSrc: ["'self'", "https://res.cloudinary.com"],
    },
  })
)

// Prevent XSS attacks
app.use(xss())

// Enable CORS
const allowedOrigins = process.env.CLIENT_URL.split(',');

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow non-browser requests
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));

// Add CORP header
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Prevent http param pollution
app.use(hpp())

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve video files with correct MIME type
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), {
  setHeaders: (res, path, stat) => {
    if (path.endsWith('.mp4')) {
      res.set('Content-Type', 'video/mp4');
    }
  }
}));

// Cloudinary proxy for videos
app.get('/cloudinary-video/*', async (req, res) => {
  const videoUrl = `https://res.cloudinary.com/${req.params[0]}`;
  try {
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    res.set('Content-Type', 'video/mp4');
    response.body.pipe(res);
  } catch (error) {
    console.error('Error proxying Cloudinary video:', error);
    res.status(500).send('Error fetching video');
  }
});

// Test route for static file serving
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'test.html'));
});

const versionOne = (routeName) => `/api/v1/${routeName}`

const mountRoute = (path, router) => {
  if (typeof router === 'function') {
    app.use(path, router);
  } else {
    console.error(`Invalid router for path: ${path}`);
  }
};

mountRoute(versionOne('auth'), authRoutes);
mountRoute(versionOne('users'), userRoutes);
mountRoute(versionOne('categories'), categoryRoutes);
mountRoute(versionOne('videos'), videoRoutes);
mountRoute(versionOne('comments'), commentRoutes);
mountRoute(versionOne('replies'), replyRoutes);
mountRoute(versionOne('feelings'), feelingRoutes);
mountRoute(versionOne('subscriptions'), subscriptionRoutes);
mountRoute(versionOne('histories'), historiesRoutes);
mountRoute(versionOne('search'), searchRoutes);

app.use(errorHandler)

const PORT = process.env.PORT
const server = app.listen(PORT, () => {
  console.log(
    `We are live on ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
  )
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`.red)
  // Close server & exit process
  server.close(() => process.exit(1))
})

module.exports = app
