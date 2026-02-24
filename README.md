# Campus Lost & Found Management System

A web-based lost and found system for Quest International University built with Express.js and MySQL.

## Features

### Student Side (Public)
- **Report Lost Item** — Submit a report when you lose something on campus
- **Report Found Item** — Submit a report when you find something on campus
- **View Items** — Browse all lost and found items with search and filter

### Admin Side (Authenticated)
- **Login** — Secure admin authentication with JWT tokens
- **Manage Items** — Update item status and delete reports
  - **Pending** → Default status for new reports
  - **Claimed** → Moves lost items to the found category automatically
  - **Resolved** → Permanently deletes the item (with confirmation)

### Security
- **SQL Injection Prevention** — Dual-layer protection:
  - Client-side: Pattern detection rejects forms containing SQL injection patterns
  - Server-side: Parameterized queries (prepared statements) via `mysql2`
  - Server-side: Input validation with `express-validator` custom validators
  - Inputs like `1=1 orders--`, `' OR 1=1--`, `UNION SELECT` are blocked
- **Authentication** — Admin routes protected by JWT tokens (bcrypt password hashing)
- **Input Sanitization** — All user inputs are trimmed, escaped, and length-validated
- **Security Headers** — Helmet.js for HTTP security headers

## Setup

### Prerequisites
- Node.js 18+
- MySQL 8+

### Installation

```bash
# Clone and install
npm install

# Set up database
mysql -u root -p < db/schema.sql
mysql -u root -p < db/seed.sql

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Start server
npm start        # Production
npm run dev      # Development (with nodemon)
```


These can be changed in the `.env` file.

## API Endpoints

### Public (Student)
| Method | Endpoint         | Description          |
|--------|------------------|----------------------|
| GET    | /api/items       | List all items       |
| GET    | /api/items/:id   | Get item by ID       |
| POST   | /api/items       | Create new report    |

### Authentication
| Method | Endpoint              | Description        |
|--------|-----------------------|--------------------|
| POST   | /api/items/auth/login | Admin login        |
| GET    | /api/items/auth/verify| Verify JWT token   |

### Admin (Requires JWT)
| Method | Endpoint                | Description        |
|--------|-------------------------|--------------------|
| PUT    | /api/items/:id          | Replace item       |
| PATCH  | /api/items/:id/status   | Update status      |
| DELETE | /api/items/:id          | Delete item        |

## Tech Stack
- **Backend:** Express.js, mysql2, express-validator, bcryptjs, jsonwebtoken
- **Frontend:** Vanilla JS, CSS3
- **Database:** MySQL 8
- **Security:** Helmet, CORS headers, parameterized queries
