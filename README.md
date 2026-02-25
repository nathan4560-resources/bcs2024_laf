# Campus Lost & Found Management System

A web-based lost and found system for Quest International University built with Express.js and MySQL.

## Features

### Student Side (Public)
- **Report Lost Item** — Submit a report when you lose something on campus.
- **Report Found Item** — Submit a report when you find something on campus
- **View Items** — Browse all lost and found items with search and filter

### Admin Side (Authenticated)
- **Login** — Secure admin authentication with JWT tokens
- **Manage Items** — Update item status and delete reports
  - **Pending** → By default, anything added from student who report lost or found items belongs there.
  - **Claimed** → If anything is Claimed, it will move to Claimed status. We can always move it back to Pending or close the case by setting the status to Resolved.
  - **Resolved** → This will mark the report as resolved and also deletes the entry. This action is permanent and cannot be undone.

### Justification of the student & admin side access restrictions
This is to make sure that student will be able to report anything lost and found and also view the items that are lost or found, but not modify it by deleting the entries.

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
- Node.js
- MySQL

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
- **Frontend:** HTML, CSS and JavaScript
- **Database:** MySQL 8
- **Security:** Helmet, CORS headers, parameterized queries
