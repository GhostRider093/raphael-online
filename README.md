# Raphael 3D

Version statique prete a publier du projet Raphael.

## Pages

- `index.html`: menu public
- `vallee.html`: scene Vallee du Chateau avec editeur et mode vol
- `raphael2.html`: jeu Trottinette avec vehicules
- `puppet_animation_editor.html`: editeur d'animation

## Lancer en local

```powershell
py -m http.server 8000
```

Puis ouvrir `http://127.0.0.1:8000/`.

## Publication

Le depot est prevu pour GitHub Pages ou tout hebergement statique.
Les dependances Three.js utilisees par les pages principales sont incluses localement dans `libs/`.

Note: le mode Wargun reutilise le modele OBJ Chasseur dans cette version publique afin d'eviter un fichier source de pres de 200 Mo que GitHub refuse en depot standard.
