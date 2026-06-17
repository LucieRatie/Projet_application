# Guide du Projet - Application Assistant Pédagogique (DRAM)

Ce projet est organisé en deux parties distinctes : le **Frontend** (interface utilisateur) et le **Backend** (serveur, base de données et IA).

---

## 🏗️ Architecture du projet

Tout le code de l'application est contenu dans le dossier `apps/` :

### 1. Le Frontend (`apps/frontend/`)
- **Technologies** : Next.js, React, TailwindCSS, assistant-ui.
- **Rôle** : Interface web utilisée par les élèves (pour discuter avec l'IA) et par les professeurs (pour le suivi).
- **Où chercher ?**
  - L'interface du chat se trouve dans `apps/frontend/app/student-chat.tsx`.
  - Le tableau de bord du professeur se trouve dans `apps/frontend/app/dashboard/page.tsx`.

### 2. Le Backend (`apps/backend/`)
- **Technologies** : Node.js, Express.js, Mongoose (MongoDB), Vercel AI SDK.
- **Rôle** : Fournir une API pour communiquer avec la base de données (élèves, historiques) et traiter les prompts d'IA (via Ollama).
- **Où chercher ?**
  - Les routes API (Chat, Synchro, Evaluate) sont dans `apps/backend/src/server.ts`.
  - Les modèles de données sont dans `apps/backend/src/models/`.

---

## 🚀 Comment lancer le projet complet ?

Pour faire fonctionner le site web, vous devez lancer **le frontend et le backend en même temps**.

**1. Pré-requis :**
- Assurez-vous d'avoir une base de données **MongoDB locale** en cours d'exécution (sur le port 27017).
- Assurez-vous qu'Ollama est lancé si vous l'utilisez.

**2. Lancement :**
Ouvrez un terminal à la racine du projet et exécutez la commande suivante :
```bash
pnpm --parallel --filter frontend --filter backend dev
```

> **Que fait cette commande ?** 
> Elle démarre simultanément :
> 1. Le **Backend (Express)** sur le port `5000` (http://localhost:5000).
> 2. Le **Frontend (Next.js)** sur le port `3000` (http://localhost:3000).

**3. Accéder au site :**
Une fois les deux serveurs lancés, ouvrez votre navigateur à l'adresse :
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🤖 Données de test (Générer des élèves)

Si votre base de données est vide lors du premier lancement, vous pouvez la remplir automatiquement avec des données de démonstration. Pour cela, visitez cette URL de l'API (une fois le backend en cours d'exécution) :
👉 **[http://localhost:5000/api/seed](http://localhost:5000/api/seed)**
