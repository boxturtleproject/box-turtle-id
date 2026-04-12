FROM python:3.12-slim

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

WORKDIR /app

# Install Python dependencies
COPY backend/pyproject.toml backend/app/__init__.py backend/app/
RUN cd backend && pip install --no-cache-dir .

# Install frontend dependencies and build
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Build frontend
RUN bun run build

# Copy YOLO config (weights added via volume)
# backend/yolo/ already in repo with .cfg file

# Create data directories
RUN mkdir -p backend/data/images backend/data/thumbnails backend/data/submissions

EXPOSE $PORT

WORKDIR /app/backend
CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
