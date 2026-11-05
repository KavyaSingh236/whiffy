FROM python:3.10-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DGLBACKEND=pytorch WHIFFY_ENSEMBLE_SIZE=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 libxrender1 libxext6 && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir torch==2.2.2 --index-url https://download.pytorch.org/whl/cpu && pip install --no-cache-dir -r backend/requirements.txt
COPY backend backend
COPY dist dist
RUN python backend/download_models.py && useradd --uid 1000 --create-home whiffy && chown -R whiffy /app
USER whiffy
WORKDIR /app/backend
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-7860} --workers 1"]
