FROM python:3.12-slim

WORKDIR /app

# Install CA certificates for SSL connections
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Python needs to find the takehome package inside backend/src
ENV PYTHONPATH=/app/backend/src:$PYTHONPATH

# Set SSL certificate file to use system certificates
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
ENV REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt

# Copy dependency files first (layer caching)
COPY pyproject.toml uv.lock* ./

# Install dependencies
RUN uv sync --group dev

# Update certifi CA bundle to use system certificates
RUN cp /etc/ssl/certs/ca-certificates.crt .venv/lib/python3.12/site-packages/certifi/cacert.pem

# Copy source (will be overridden by volume mount in dev)
COPY backend/src ./backend/src
COPY alembic ./alembic
COPY alembic.ini ./alembic.ini

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "takehome.web.app:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]
