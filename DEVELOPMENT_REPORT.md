# Rapport de développement — Raphael

## Résultat

Le prototype existant a été conservé et complété par une couche de simulation aérienne commune à la ville et à la vallée. Les deux cartes utilisent désormais le même chasseur, les mêmes commandes, le même canon, la même caméra et les mêmes systèmes de combat.

## Fonctionnalités livrées

- Canon continu à environ 13 coups par seconde, trajectoire alignée sur le vol et son procédural soutenu.
- Tangage visuel fluide, roulis, lacet, inertie et caméra de poursuite cohérents dans les deux cartes.
- Portail animé entre la ville et la vallée, transition courte et démarrage automatique en mode chasseur.
- Cinq chasseurs ennemis avec apparition à distance, patrouille, interception, attaque et repli.
- Évitement minimal du relief, vitesses et agilité dégradées par les dommages.
- Radar circulaire, sélection dans le cône frontal, verrouillage progressif et autorisation de tir.
- Alertes d'accrochage et de missile avec signaux sonores.
- Missiles guidés avec durée de vie, vitesse, guidage limité, collision, perte de portée et explosion.
- Canon utilisable contre les cibles aériennes et les anciennes cibles au sol.
- Dégâts localisés : moteur, aile gauche, aile droite et coque.
- Conséquences de vol : moteur endommagé = vitesse réduite ; aile endommagée = virage réduit.
- Effets visuels plafonnés : traînées, fumée, impacts, explosions et particules.
- HUD moderne : coque, moteur, ailes, missiles, victoires, verrouillage et état d'alerte.
- Diagnostics accessibles par `RaphaelAirCombat.diagnostics()` pour faciliter les prochains tests.
- Lanceur Windows `Lancer_jeu.bat` avec détection du serveur, de Python et du port 8000.

## Commandes du chasseur

- Pilotage : commandes existantes clavier/manette.
- Canon continu : `Espace` ou commande de tir configurée.
- Missile : `M` ou bouton B de la manette, après verrouillage à 100 %.
- Missile arrière défensif : `R` ou bouton Y ; sélection automatique d'une menace située derrière.
- Montée directe : `E` / `Page précédente` selon la configuration actuelle.

## Architecture

- `chasseur.js` : modèle et apparence partagés.
- `combat.js` : canon, son et cibles au sol partagés.
- `air-combat.js` : IA aérienne, radar, missiles, dégâts, audio d'alerte, VFX et HUD partagés.
- `rzphzel.js` : contrôleur principal de la ville et portail.
- `vallee.html` : terrain de vallée et adaptateur vers les modules partagés.

Les particules sont limitées, les distances de radar bornent le travail de l'IA, et les objets temporaires sont retirés et libérés à expiration.

## Validation effectuée

- Vérification syntaxique JavaScript de tous les scripts modifiés.
- Chargement réel du mode chasseur dans la ville.
- Chargement direct de la vallée depuis l'URL du portail.
- Présence du HUD et des systèmes de combat dans les deux cartes.
- Absence d'erreurs JavaScript dans la console pendant les contrôles.

## Suite prévue

Le portail de course reste volontairement réservé à une phase distincte, conformément à la feuille de route. La structure actuelle permet d'ajouter ce troisième secteur sans dupliquer les systèmes du chasseur.
