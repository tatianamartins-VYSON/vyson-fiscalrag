FROM python:3.12-slim
WORKDIR /app
COPY api/ api/
COPY public/ public/
COPY server.py .
ENV PORT=8080
# RAG_BASE_URL, RAG_API_KEY, RAG_MODEL and RAG_GPU come from the environment (never baked into the image)
EXPOSE 8080
CMD ["python", "server.py"]
