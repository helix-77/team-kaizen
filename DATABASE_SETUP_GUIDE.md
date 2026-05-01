# Database Setup Guide for RentPi

This guide details the database architecture and setup for the RentPi backend platform.

## 1. Database Architecture

We are using two distinct database technologies to fulfill the requirements of the microservices:

* **PostgreSQL**: Used by the `user-service` for structured relational data (Users, Authentication, Credentials).
* **MongoDB**: Used by the `agentic-service` for flexible, schema-less document storage (Chat Sessions, Chat History).

## 2. Docker Integration

Both databases are fully containerized and managed via `docker-compose`. You do not need to install PostgreSQL or MongoDB directly on your local machine.

### Named Volumes

To ensure data persistence across container restarts and system reboots, we use Docker named volumes:

* `postgres_data`: Persists PostgreSQL data.
* `mongodb_data`: Persists MongoDB data.
* [ ] 3. PostgreSQL Configuration (user-service)

The PostgreSQL container will be initialized with a default database, user, and password via environment variables.

### Environment Variables

```env
# .env (root)
POSTGRES_USER=rentpi_user
POSTGRES_PASSWORD=rentpi_password
POSTGRES_DB=rentpi_users
```

### Connection String

The `user-service` connects to PostgreSQL using the internal Docker DNS:
`postgresql://rentpi_user:rentpi_password@postgres:5432/rentpi_users`

### Schema Setup

When the `user-service` starts, it will use raw SQL scripts (`pg` library) to automatically run migrations and create the necessary tables:

* `users`: id, name, email (unique), password_hash, created_at

## 4. MongoDB Configuration (agentic-service)

MongoDB runs on standard port 27017 and does not require a complex initialization script for basic usage.

### Connection String

The `agentic-service` connects to MongoDB using the internal Docker DNS:
`mongodb://mongodb:27017/rentpi_chat`

### Collections

The `agentic-service` will automatically create the required collections (via Mongoose):

* `sessions`: sessionId, name, createdAt, lastMessageAt
* `messages`: sessionId, role, content, timestamp

## 5. First-Time Setup Instructions

1. **Install Docker Desktop**: Ensure Docker and Docker Desktop are installed and running on your system with at least 6GB RAM allocated.
2. **Environment File**: Create a `.env` file in the root of the repository. Make sure the DB credentials are set.
3. **Start the Services**: Run the following command from the root directory:
   ```bash
   docker-compose up --build -d
   ```
4. Docker will pull the `postgres:15-alpine` and `mongo:6` images, create the named volumes, and start the database servers. The microservices will then connect to them automatically.

## 6. Managing the Databases

* **View PostgreSQL Logs**: `docker-compose logs -f postgres`
* **View MongoDB Logs**: `docker-compose logs -f mongodb`
* **Reset Databases (WARNING: DELETES ALL DATA)**:
  ```bash
  docker-compose down -v
  ```
  The `-v` flag removes the named volumes. Next time you run `docker-compose up`, fresh databases will be created.
