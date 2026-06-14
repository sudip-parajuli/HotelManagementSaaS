FROM python:3.12-slim

# System dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements/ ./requirements/
RUN pip install --no-cache-dir -r requirements/development.txt

# Copy source code
COPY . .

# Create directories
RUN mkdir -p staticfiles media

# Expose port
EXPOSE 8000

# Default command (overridden in docker-compose)
CMD ["gunicorn", "config.asgi:application", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
