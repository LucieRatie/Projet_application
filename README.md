# 🚀 Installation de l'application

![Node.js](https://img.shields.io/badge/Node.js-Dockerized-green)
![Docker](https://img.shields.io/badge/Docker-Required-blue)

## 📋 Prérequis

Avant de commencer, assurez-vous de disposer de :

* ✅ Docker installé et fonctionnel
* ✅ Docker Compose installé
* ✅ Une connexion Internet pour télécharger les images
* ✅ **75 Go d'espace disque disponible**
* ⏱️ **Temps d'installation estimé : 20 minutes**

---

## 📦 Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/LucieRatie/Projet_application.git
cd Projet_application
```

### 2. Construire les conteneurs Docker

```bash
docker compose build
```

Cette étape peut prendre plusieurs minutes selon votre machine et votre connexion Internet.

### 3. Démarrer l'application

```bash
docker compose up -d
```

Vérifiez que les conteneurs sont correctement démarrés :

```bash
docker ps
```

### 4. Télécharger et lancer le modèle IA

```bash
docker exec -it app-ollama ollama run gemma4:e2b
```

Lors du premier lancement, le modèle sera téléchargé automatiquement. Cette opération peut prendre plusieurs minutes.

---

## 🌐 Accès à l'application

Une fois l'installation terminée, l'interface web est accessible à l'adresse :

```text
http://localhost:3000
```

---

## 🔍 Vérification rapide

Vous devriez avoir :

* ✅ Les conteneurs Docker en cours d'exécution
* ✅ Le modèle `gemma4:e2b` téléchargé
* ✅ L'interface web accessible sur le port **3000**

---

## 🛠️ Dépannage

### Les conteneurs ne démarrent pas

Consultez les journaux :

```bash
docker compose logs -f
```

### Vérifier l'état des conteneurs

```bash
docker ps
```

### Arrêter l'application

```bash
docker compose down
```

---

## 📊 Résumé

| Élément              | Valeur                    |
| -------------------- | ------------------------- |
| Temps d'installation | ~20 min                   |
| Espace disque requis | 75 Go                     |
| Port Frontend        | 3000                      |
| Technologie          | Node.js + Docker + Ollama |
| Modèle IA            | gemma4:e2b                |
