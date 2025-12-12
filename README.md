# CloudBlitz CRM

A production-grade Customer Relationship Management (CRM) system built with modern technologies. CloudBlitz CRM is a full-stack inquiry management application with role-based access control, real-time notifications, and a beautiful modern UI/UX.

## 🚀 Features

### Core Features
- **Role-based Access Control**: User, Presales, Sales, and Admin roles with different permissions
- **Inquiry Management**: Complete CRUD operations for inquiries with advanced filtering
- **Real-time Notifications**: Socket.IO powered notifications for assignments and updates
- **Dashboard Analytics**: Comprehensive dashboard with statistics and charts
- **Follow-up Management**: Track and schedule follow-ups for inquiries
- **User Management**: Admin panel for managing users and permissions
- **Search & Filtering**: Advanced search and filter capabilities
- **Responsive Design**: Mobile-first responsive design with dark/light theme support

### Technical Features
- **JWT Authentication**: Secure authentication with 3-day token expiry
- **Google OAuth 2.0**: Social login integration
- **Real-time Updates**: Socket.IO for live notifications
- **Type Safety**: Full TypeScript implementation
- **Modern UI**: Tailwind CSS with Framer Motion animations
- **API Validation**: Comprehensive input validation and error handling
- **Security**: Helmet, CORS, rate limiting, and input sanitization

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express.js** (Latest version)
- **TypeScript** (Strict mode)
- **MongoDB** + **Mongoose**
- **JWT Authentication** (3-day expiry)
- **Google OAuth 2.0** integration
- **bcrypt** for password hashing
- **express-validator** for request validation
- **CORS** + **helmet** for security
- **Winston** for logging
- **Socket.IO** for real-time notifications

### Frontend
- **React 18** + **TypeScript**
- **Vite** for fast build and development
- **React Router v6** for routing
- **Tailwind CSS v3** + dark/light theme
- **Axios** with interceptors
- **React Toastify** for notifications
- **Framer Motion** for animations
- **React Query** for data fetching
- **React Hook Form** for form management

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v18 or higher)
- **MongoDB** (v5 or higher)
- **npm** or **yarn**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd EMS-CloudBlitz
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all dependencies (backend + frontend)
npm run install:all
```

### 3. Environment Setup

#### Backend Environment
Create a `.env` file in the `backend` directory:

```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/cloudblitz-crm

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
JWT_EXPIRE=3d

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# CORS
FRONTEND_URL=http://localhost:3000

# Rate Limiting
# General API rate limit: 1000 requests per minute (60000ms)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000
# Auth endpoint rate limit: 100 attempts per 15 minutes
AUTH_RATE_LIMIT_MAX=100
```

#### Frontend Environment
The frontend will automatically proxy API requests to `http://localhost:5000`.

### 4. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# Using MongoDB service
sudo systemctl start mongod

# Or using MongoDB Compass
# Start MongoDB Compass and ensure it's running on localhost:27017
```

### 5. Run the Application

#### Development Mode (Recommended)
```bash
# Run both backend and frontend concurrently
npm run dev
```

#### Individual Services
```bash
# Backend only
npm run server:dev

# Frontend only
npm run client:dev
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health

## 👥 Default User Accounts

The application comes with demo user accounts for testing:

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| Admin | admin@cloudblitz.com | admin123 | Full system access |
| Sales | sales@cloudblitz.com | sales123 | Sales management |
| Presales | presales@cloudblitz.com | presales123 | Presales management |
| User | user@cloudblitz.com | user123 | Basic user access |

## 🏗️ Project Structure

```
EMS-CloudBlitz/
├── backend/                 # Backend API
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Custom middleware
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # Utility functions
│   │   └── server.ts       # Main server file
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # Frontend React app
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # Utility functions
│   │   ├── App.tsx         # Main app component
│   │   └── main.tsx        # Entry point
│   ├── package.json
│   └── vite.config.ts
├── package.json            # Root package.json
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Inquiries
- `GET /api/inquiries` - Get all inquiries (with filters)
- `GET /api/inquiries/:id` - Get inquiry by ID
- `POST /api/inquiries` - Create new inquiry
- `PUT /api/inquiries/:id` - Update inquiry
- `DELETE /api/inquiries/:id` - Delete inquiry
- `POST /api/inquiries/:id/assign` - Assign inquiry to user
- `POST /api/inquiries/:id/follow-up` - Add follow-up
- `GET /api/inquiries/dashboard` - Get dashboard statistics

### Users (Admin only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PATCH /api/users/:id/toggle-status` - Toggle user status

### Notifications
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

## 🎨 UI Components

### Design System
- **Color Palette**: Primary, secondary, success, warning, error colors
- **Typography**: Inter font family with proper hierarchy
- **Components**: Buttons, inputs, cards, badges, modals
- **Animations**: Framer Motion powered smooth transitions
- **Theme**: Dark/Light mode with system preference detection

### Key Components
- **Layout**: Responsive sidebar and navbar
- **Dashboard**: Statistics cards and charts
- **Tables**: Sortable and filterable data tables
- **Forms**: Validated forms with error handling
- **Modals**: Reusable modal components
- **Notifications**: Toast notifications and in-app alerts

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: Comprehensive validation using express-validator
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS**: Configured CORS for secure cross-origin requests
- **Helmet**: Security headers for protection
- **Input Sanitization**: MongoDB injection prevention
- **Role-based Access**: Granular permission system

## 🚀 Deployment

### Backend Deployment

1. **Build the application**:
   ```bash
   cd backend
   npm run build
   ```

2. **Set production environment variables**:
   ```bash
   NODE_ENV=production
   MONGODB_URI=your-production-mongodb-uri
   JWT_SECRET=your-production-jwt-secret
   ```

3. **Start the application**:
   ```bash
   npm start
   ```

### Frontend Deployment

1. **Build the application**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy the `dist` folder** to your hosting service (Vercel, Netlify, etc.)

### Docker Deployment (Optional)

Create a `Dockerfile` in the root directory:

```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

## 📝 Development Guidelines

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for code quality
- **Prettier**: Code formatting
- **Conventional Commits**: Standardized commit messages

### Git Workflow
1. Create feature branches from `main`
2. Make atomic commits with descriptive messages
3. Create pull requests for code review
4. Merge after approval and testing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Contact the development team

## 🎯 Roadmap

### Upcoming Features
- [ ] Advanced analytics and reporting
- [ ] Email integration for notifications
- [ ] File upload for inquiries
- [ ] Mobile app (React Native)
- [ ] Advanced search with Elasticsearch
- [ ] Multi-tenant support
- [ ] API documentation with Swagger
- [ ] Automated testing suite
- [ ] CI/CD pipeline

## 🙏 Acknowledgments

- **React** team for the amazing framework
- **Express.js** team for the robust backend framework
- **MongoDB** team for the flexible database
- **Tailwind CSS** team for the utility-first CSS framework
- **Framer Motion** team for the smooth animations

---

**CloudBlitz CRM** - Built with ❤️ for modern businesses
