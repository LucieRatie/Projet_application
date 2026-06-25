FROM python:3.11-slim

WORKDIR /app

# Copie du fichier de dépendances
COPY requirements.txt .

# Installation des dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "serveur_rag.py"]
