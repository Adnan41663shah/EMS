# CloudBlitz CRM - Inquiry Management System

A production-grade Customer Relationship Management (CRM) system built with modern technologies. CloudBlitz CRM is a full-stack inquiry management application designed specifically for educational institutes to manage student inquiries, with role-based access control for Presales, Sales, and Admin teams.

## 🎯 Overview

CloudBlitz CRM streamlines the inquiry-to-admission process by providing:
- **Presales Team**: Handle initial inquiries, qualify leads, and forward hot prospects to Sales
- **Sales Team**: Convert qualified leads, manage follow-ups, and track admissions
- **Admin**: Full system oversight, analytics, and user management

## 🚀 Key Features

### Inquiry Management
- **Complete Inquiry Lifecycle**: Create, view, update, and track inquiries from initial contact to admission
- **Department-based Workflow**: Inquiries flow from Presales → Sales based on qualification
- **Smart Filtering**: Filter by status (Hot/Warm/Cold), course, location, date range, and more
- **Bulk Actions**: Efficiently manage multiple inquiries at once
- **Center-based Organization**: Inquiries organized by location (Nagpur, Pune, Nashik, Indore)

### Follow-up System
- **Presales Follow-ups**: Track calls, emails, and WhatsApp communications
- **Sales Follow-ups**: Advanced lead staging with sub-stages for detailed tracking
- **Lead Stages**: Cold → Warm → Hot → Walkin → Online-Conversion → Not Interested
- **Follow-up Outcomes**: Track positive, neutral, negative responses and next actions
- **Mandatory First Follow-up**: Sales users must add initial follow-up when attending an inquiry

### Role-Based Access Control
| Role | Capabilities |
|------|-------------|
| **Presales** | View/create inquiries, attend inquiries, add follow-ups, forward to Sales |
| **Sales** | Manage assigned inquiries, advanced follow-ups, track admissions, reassign leads |
| **Admin** | Full access, user management, analytics dashboard, system configuration |

### Dashboard & Analytics (Admin)
- **Overview Tab**: Key metrics, recent inquiries, status breakdown
- **Analytics Tab**: Interactive charts - Status distribution, Department split, Course popularity, Location trends, Time-series analysis
- **Reports Tab**: Exportable reports with filtering by date range
- **Data Tab**: Raw data management and configuration

### User Interface
- **Modern Design**: Clean, professional interface with smooth animations
- **Dark/Light Theme**: System preference detection with manual toggle
- **Responsive Layout**: Works seamlessly on desktop, tablet, and mobile
- **Real-time Updates**: Live notification badges for unattended inquiries
- **Collapsible Sidebar**: Maximize workspace when needed
- **Persistent Sessions**: Stay logged in for 3 days even after closing browser

### Additional Features
- **Admitted Students Tracking**: Track successful conversions separately
- **Manage Options**: Admin can configure courses, locations, mediums, and statuses
- **CSV Export**: Export inquiry data for external reporting (Admin & Sales)
- **Activity Logging**: Track all actions for audit purposes

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js + Express.js** | Server framework |
| **TypeScript** | Type safety and better developer experience |
| **MongoDB + Mongoose** | Database and ODM |
| **JWT** | Authentication (3-day token expiry) |
| **bcryptjs** | Password hashing with salt |
| **express-rate-limit** | API rate limiting (1000 req/min) |
| **helmet** | Security headers |
| **express-mongo-sanitize** | NoSQL injection prevention |
| **CORS** | Cross-origin resource sharing |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool and dev server |
| **React Router v6** | Client-side routing |
| **React Query** | Server state management and caching |
| **React Hook Form** | Form handling with validation |
| **Tailwind CSS v3** | Utility-first styling |
| **Framer Motion** | Animations and transitions |
| **Recharts** | Data visualization charts |
| **Lucide React** | Icon library |
| **React Toastify** | Toast notifications |
| **Axios** | HTTP client with interceptors |

## 📋 Prerequisites

- **Node.js** v18 or higher
- **MongoDB** v5 or higher (local or MongoDB Atlas)
- **npm** or **yarn**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd EMS-CloudBlitz
```

### 2. Install Dependencies

```bash
# Install root dependencies (for running both servers together)
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Go back to root
cd ..
```

Or use the shortcut:
```bash
npm run install:all
```

### 3. Environment Setup

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/cloudblitz-crm

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
JWT_EXPIRE=3d

# CORS
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000
AUTH_RATE_LIMIT_MAX=100
```

### 4. Start the Application

```bash
# Development mode (runs both backend and frontend together)
npm run dev

# Or run individually in separate terminals:
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## 👥 User Roles

| Role | Access Level |
|------|--------------|
| **Admin** | Full system access - user management, analytics, all inquiries |
| **Sales** | Sales department - manage assigned inquiries, follow-ups, conversions |
| **Presales** | Presales department - handle new inquiries, qualify leads, forward to sales |

> **Note**: New user registrations default to Presales role. Admin can change roles through User Management.

## 📁 Project Structure

```
EMS-CloudBlitz/
├── package.json            # Root - scripts to run both servers
├── backend/
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── controllers/     # Request handlers
│   │   │   ├── authController.ts
│   │   │   ├── inquiryController.ts
│   │   │   ├── userController.ts
│   │   │   └── ...
│   │   ├── middleware/      # Auth, validation middleware
│   │   ├── models/          # MongoDB schemas
│   │   │   ├── User.ts
│   │   │   ├── Inquiry.ts
│   │   │   └── ...
│   │   ├── routes/          # API route definitions
│   │   ├── types/           # TypeScript interfaces
│   │   ├── utils/           # Helper functions (JWT, logger)
│   │   └── server.ts        # Application entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── Layout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── CreateInquiryModal.tsx
│   │   │   ├── FollowUpModal.tsx
│   │   │   └── ...
│   │   ├── contexts/        # React contexts (Auth, Theme)
│   │   ├── pages/           # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Inquiries.tsx
│   │   │   ├── InquiryDetails.tsx
│   │   │   ├── PresalesAssigned.tsx
│   │   │   ├── SalesAssigned.tsx
│   │   │   └── ...
│   │   ├── services/        # API service layer
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Utility functions
│   │   └── App.tsx          # Main application
│   └── package.json
│
└── README.md
```

## 🔧 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/profile` | Get current user profile |
| PUT | `/api/auth/profile` | Update profile |

### Inquiries
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inquiries` | List inquiries (with filters) |
| GET | `/api/inquiries/:id` | Get inquiry details |
| POST | `/api/inquiries` | Create new inquiry |
| PUT | `/api/inquiries/:id` | Update inquiry |
| DELETE | `/api/inquiries/:id` | Delete inquiry |
| POST | `/api/inquiries/:id/claim` | Claim/attend an inquiry |
| POST | `/api/inquiries/:id/follow-up` | Add follow-up |
| PUT | `/api/inquiries/:id/follow-up/:followUpId` | Update follow-up |
| POST | `/api/inquiries/:id/forward-to-sales` | Forward to Sales |
| POST | `/api/inquiries/:id/reassign-sales` | Reassign to another Sales user |
| GET | `/api/inquiries/dashboard` | Dashboard statistics |
| GET | `/api/inquiries/unattended-counts` | Unattended inquiry counts |

### Users (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |
| PATCH | `/api/users/:id/toggle-status` | Activate/deactivate user |

### Options Management (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/options` | Get all options |
| PUT | `/api/options` | Update options |

## 📊 Workflow

### Presales Workflow
```
1. New Inquiry Created → Appears in "All Inquiries"
2. Presales Claims Inquiry → Moves to "My Attended Inquiries"
3. Add Follow-ups → Track communication history
4. Qualify Lead → Update status (Hot/Warm/Cold)
5. Forward to Sales → Transfers to Sales department
```

### Sales Workflow
```
1. Inquiry Forwarded → Appears in Sales "All Inquiries"
2. Sales Claims Inquiry → Must add first follow-up
3. Track Lead Stage → Cold → Warm → Hot
4. Add Follow-ups → With detailed sub-stages
5. Convert → Mark as Walkin or Online-Conversion
6. Optional: Reassign to another Sales user
```

### Admin Workflow
```
1. Monitor all inquiries across departments
2. View analytics and generate reports
3. Manage users and their roles
4. Configure system options
5. Track admitted students
```

## 🔐 Security Features

- **JWT Authentication**: Secure 3-day token-based sessions stored in localStorage
- **Persistent Login**: Users stay logged in for 3 days even after closing browser
- **Password Security**: bcrypt hashing with 12 salt rounds
- **Rate Limiting**: 1000 requests/minute to prevent abuse
- **Input Sanitization**: MongoDB injection prevention
- **Security Headers**: Helmet.js protection
- **CORS Configuration**: Controlled cross-origin access
- **Role-based Authorization**: Endpoint-level permission checks

## 🎨 UI/UX Features

- **Gradient Theme**: Beautiful orange-to-purple sidebar gradient
- **Dark Mode**: Full dark theme support
- **Responsive Design**: Mobile-first approach
- **Loading States**: Skeleton loaders and spinners
- **Toast Notifications**: Success/error feedback
- **Form Validation**: Real-time validation with helpful messages
- **Keyboard Navigation**: Accessible interface
- **Collapsible Sidebar**: More screen space when needed

## 🚀 Deployment

### Backend Production Build
```bash
cd backend
npm run build
NODE_ENV=production npm start
```

### Frontend Production Build
```bash
cd frontend
npm run build
# Deploy dist/ folder to hosting service
```

### Full Build (from root)
```bash
npm run build
```

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://your-production-uri
JWT_SECRET=your-very-long-random-production-secret
FRONTEND_URL=https://your-frontend-domain.com
```

## 🛠️ Troubleshooting

### Port Already in Use
If you get `EADDRINUSE: address already in use :::5000`:
```bash
# Kill the process using port 5000
npx kill-port 5000

# Then restart
npm run dev
```

### MongoDB Connection Issues
- Ensure MongoDB is running locally or your Atlas connection string is correct
- Check if `MONGODB_URI` in `.env` is properly configured

### Frontend Not Loading
- Check if backend is running on port 5000
- Verify the Vite proxy configuration in `frontend/vite.config.ts`

## 📈 Performance

- **Request Handling**: Supports 1000+ concurrent users
- **Rate Limit**: 1000 requests per minute per IP
- **Token Expiry**: 3-day sessions for user convenience
- **Query Optimization**: Indexed MongoDB queries
- **Frontend Caching**: React Query with smart cache invalidation

## 🧪 Development

### Available Scripts

**From Root:**
```bash
npm run dev          # Run both backend and frontend
npm run build        # Build both for production
npm run install:all  # Install all dependencies
```

**Backend:**
```bash
cd backend
npm run dev          # Development with hot reload
npm run build        # TypeScript compilation
npm start            # Run production build
```

**Frontend:**
```bash
cd frontend
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
```

### Code Quality
- TypeScript strict mode enabled
- ESLint for code linting
- Consistent naming conventions

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -m 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- React team for the excellent UI framework
- Express.js for the robust backend framework
- MongoDB for the flexible document database
- Tailwind CSS for the utility-first CSS framework
- Framer Motion for smooth animations
- Recharts for beautiful data visualizations

---

**CloudBlitz CRM** - Streamlining Inquiry Management for Educational Institutes 🎓
