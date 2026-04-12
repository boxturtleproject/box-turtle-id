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

# Install frontend dependencies (cached layer)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy everything
COPY . .

# Install Python dependencies
RUN cd backend && pip install --no-cache-dir .

# Build frontend
RUN bun run build

# Create data directories (volume will mount over /app/backend/data)
RUN mkdir -p backend/data/images backend/data/thumbnails backend/data/submissions

WORKDIR /app/backend
CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
