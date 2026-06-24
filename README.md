# Guide du Projet - Application Assistant Pédagogique (DRAM)

Ce projet est organisé en deux parties distinctes : le **Frontend** (interface utilisateur) et le **Backend** (serveur, base de données et IA).

---

## 🏗️ Architecture du projet

Tout le code de l'application est contenu dans le dossier `apps/` :

### 1. Le Frontend (`apps/frontend/`)
- **Technologies** : Next.js, React, TailwindCSS, assistant-ui.
- **Rôle** : Interface web utilisée par les élèves (pour discuter avec l'IA, voir les documents, générer des glossaires) et par les professeurs (pour le suivi et la gestion des cours).
- **Où chercher ?**
  - L'interface élève se trouve dans `apps/frontend/app/student-chat.tsx`.
  - Le tableau de bord du professeur se trouve dans `apps/frontend/app/dashboard/page.tsx`.

### 2. Le Backend (`apps/backend/`)
- **Technologies** : Node.js, Express.js, Mongoose (MongoDB), Vercel AI SDK.
- **Rôle** : API pour communiquer avec la base de données (élèves, historiques, sessions) et traiter les prompts d'IA (via Google Gemini ou Ollama). Gère également le parsing des PDF et la création de fichiers.
- **Où chercher ?**
  - Les routes API (Chat, Synchro, Evaluate, Glossary, Upload) sont dans `apps/backend/src/server.ts`.
  - Les modèles de données sont dans `apps/backend/src/models/`.

---

## ⚙️ Configuration (Variables d'environnement)

Pour utiliser les nouvelles fonctionnalités d'IA (comme la génération de glossaires basés sur des PDF), l'application utilise **Google Gemini 2.5 Flash**.

1. Naviguez dans le dossier Backend : `apps/backend/`
2. Créez ou modifiez le fichier `.env` avec les variables suivantes :
```env
# Clé API Google (Recommandé pour la stabilité et les nouvelles fonctionnalités RAG/Glossaire)
GOOGLE_GENERATIVE_AI_API_KEY=VOTRE_CLE_API_ICI

# Mode Online (true = utilise Google Gemini, false = utilise Ollama en local)
ONLINE_MODE=true

# (Optionnel si vous utilisez Ollama)
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3.5:9b
```

---

## 🚀 Comment lancer le projet complet ?

Pour faire fonctionner le site web, vous devez lancer **le frontend et le backend en même temps**.

**1. Pré-requis :**
- Assurez-vous d'avoir une base de données **MongoDB locale** en cours d'exécution (sur le port 27017).

**2. Lancement :**
Ouvrez un terminal à la racine du projet et exécutez la commande suivante :
```bash
pnpm --parallel --filter frontend --filter backend dev
```

> **Que fait cette commande ?** 
> Elle démarre simultanément :
> 1. Le **Backend (Express)** sur le port `5000` (http://localhost:5000). Les fichiers uploadés sont servis publiquement.
> 2. Le **Frontend (Next.js)** sur le port `3000` (http://localhost:3000).

**3. Accéder au site :**
Une fois les deux serveurs lancés, ouvrez votre navigateur à l'adresse :
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🌟 Nouvelles Fonctionnalités

### 👨‍🏫 Espace Professeur (Dashboard)
- **Gestion des Sessions** : Vous pouvez créer des "Sessions" (ex: Cours de Géographie, Exercices de Mathématiques).
- **Assignation des Élèves** : Vous pouvez attribuer des élèves spécifiques à une session.
- **Base de connaissances IA** : Téléversez des documents (PDF, TXT) que l'IA lira pour pouvoir interagir intelligemment avec l'élève.
- **Documents de cours** : Téléversez des documents que l'élève pourra télécharger ou consulter directement.

### 🎓 Espace Élève
- **Chat Pédagogique** : Discute avec l'assistant IA. L'IA adapte ses réponses au profil de l'élève (langue maternelle, niveau de français, cycle).
- **📚 Docs (Documents de cours)** : L'élève peut consulter et télécharger les PDF/exercices que le professeur a assignés à la session.
- **✨ Vocabulaire Bilingue (Nouveau)** : 
  - L'élève peut cliquer sur le bouton **"Créer mon glossaire"**.
  - L'IA va scanner tous les PDF de cours, en extraire 10 à 15 mots difficiles.
  - Elle génère un glossaire traduisant ces mots dans la **langue maternelle** de l'élève avec des explications simples en français.
  - Le glossaire s'affiche directement à l'écran **ET** est automatiquement sauvegardé sous forme de fichier `.txt` dans l'onglet **Docs** pour être téléchargé !

---

## 🤖 Données de test (Générer des élèves)

Si votre base de données est vide lors du premier lancement, vous pouvez la remplir automatiquement avec des données de démonstration. Pour cela, visitez cette URL de l'API (une fois le backend en cours d'exécution) :
👉 **[http://localhost:5000/api/seed](http://localhost:5000/api/seed)**

---

## 🖥️ Déploiement sur un serveur (Debian/Linux)

Si vous souhaitez déployer cette application sur un serveur Debian (ou Ubuntu) équipé pour faire tourner un modèle IA en local, voici la marche à suivre :

### 1. Pré-requis sur le serveur
* **Node.js (v18+) & pnpm** : Requis pour faire tourner le Frontend (Next.js) et le Backend (Express).
* **Python 3 & pip** : Requis pour le serveur RAG (`langchain_python`).
* **MongoDB** : Ciblez une instance locale ou un conteneur Docker.
* **Ollama** : Pour faire tourner les modèles locaux. (Installation rapide : `curl -fsSL https://ollama.com/install.sh | sh`).

### 2. Téléchargement du modèle IA
Une fois Ollama installé, téléchargez le modèle que vous souhaitez utiliser (par exemple, Qwen) :
```bash
ollama pull qwen2.5:0.5b
```

### 3. Lancement en production
Pour un environnement de production, il est recommandé d'utiliser des gestionnaires de processus (comme `pm2` ou `tmux`) :

1. **Serveur RAG (Python)** : Installez les dépendances (`pip install -r requirements.txt`) et lancez l'API FastAPI (généralement sur le port 8000).
2. **Backend (Node.js)** :
   * Modifiez le fichier `apps/backend/.env` pour définir `ONLINE_MODE=false` et `OLLAMA_MODEL=qwen2.5:0.5b`.
   * Démarrez avec `pnpm install` puis lancez le serveur via PM2 ou `npm run start` (port 5000).
3. **Frontend (Next.js)** :
   * Allez dans `apps/frontend/`.
   * Lancez le build : `pnpm install` puis `pnpm build`.
   * Démarrez le serveur en écoute publique : `pnpm start --host 0.0.0.0` (port 3000).

Pour un accès externe propre (nom de domaine, HTTPS), nous recommandons de configurer un reverse proxy avec **Nginx** pointant vers le port 3000 de votre frontend.


Debian / Linux
git clone
cd Projet_application/
docker-compose up
