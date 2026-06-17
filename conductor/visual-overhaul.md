# Plan de Refonte Visuelle : Glassmorphism Moderne

Ce plan détaille les étapes pour transformer l'interface actuelle (style Neubrutalism avec des bordures noires épaisses) en une interface "Glassmorphism" moderne, élégante et épurée.

## 1. Objectifs de Conception
- **Modernité & Élégance :** Remplacer les bordures dures et les ombres noires par des effets de verre dépoli, des bordures semi-transparentes et des ombres douces.
- **Palette de Couleurs :** Utiliser des fonds sombres nuancés (zinc-950, zinc-900) avec des dégradés subtils et des touches de couleurs vives (bleu, émeraude) pour les éléments interactifs.
- **Typographie :** Garder la clarté mais adoucir les poids (passer de `font-black` à `font-semibold` ou `font-bold` là où c'est approprié).
- **Animations :** Ajouter des transitions fluides pour les interactions (survol, ouverture de fenêtres modales).

## 2. Étapes d'Implémentation

### Étape 1 : Mise à jour des styles globaux (`globals.css`)
- Ajouter des classes utilitaires pour l'effet "glass" (flou d'arrière-plan, bordures semi-transparentes).
- Mettre à jour les variables de couleurs si nécessaire pour des fonds plus doux.
- Ajouter un fond global (subtil dégradé ou motif) pour mettre en valeur les cartes "glass".

### Étape 2 : Refonte du Dashboard Professeur (`app/dashboard/page.tsx`)
- **Cartes Étudiants & Sessions :** Remplacer `border border-zinc-800 bg-zinc-900` par des classes d'effet verre (ex: `bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl`).
- **Fenêtres Modales (Popups) :** Remplacer les fonds pleins par des effets de flou profonds.
- **Boutons :** Adoucir les bordures, utiliser des dégradés subtils sur les boutons d'action principale.
- **Barres de compétences :** Rendre les barres plus arrondies avec des effets lumineux subtils.

### Étape 3 : Refonte de l'Interface Étudiant (`app/student-chat.tsx`)
- **Barre latérale (Sidebar) :** La rendre "flottante" et translucide.
- **Zone Principale :** Utiliser des fonds sombres élégants au lieu du blanc pur (qui contraste trop avec le reste du thème).
- **Cartes de Documents & Historique :** Remplacer les grosses bordures par le style "glass".
- **Sélecteur de Session :** Adoucir le design du sélecteur personnalisé créé précédemment.
- **Chat :** Styliser les bulles de message avec des couleurs pastel douces et de légères transparences.

## 3. Composants Techniques Clés
- Utilisation intensive de `backdrop-blur-md`, `bg-white/5` (ou `bg-black/40`), `border-white/10`.
- Utilisation de `ring-1 ring-white/10` pour de la profondeur.
- Animations fluides : `transition-all duration-300 ease-out`.

## 4. Vérification
- S'assurer que le contraste reste suffisant pour une bonne lisibilité (Accessibilité).
- Vérifier la réactivité (mobile/bureau) des fenêtres modales.
- Confirmer que l'interface professeur et l'interface étudiant partagent le même langage visuel.