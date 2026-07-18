# Les mondes de Raphael

Cette extension ajoute **21 cartes jouables** au projet Raphael. Elle conserve les jeux existants et leur ajoute un explorateur de mondes commun, utilisable avec le chasseur, le robot Azure Titan ou le personnage Pinstripe Shadows.

Les cartes sont reliées par un réseau de portails. Chaque monde contient un anneau énergétique placé dans sa moitié nord : le traverser mène au monde suivant sans changer de pilote. Après `Frontière de l’Orage`, le réseau mène à `Vallée des Blocs`, puis au `Canyon des Titans`, avant de revenir à `Nova City`.

## Lancement

Double-cliquer sur `Lancer_mondes.bat`, puis choisir un monde et un pilote. On peut également ouvrir `mondes.html` depuis le menu principal ou depuis le menu de la vallée.

## Catalogue

| Monde | Ambiance | Terrain et idée de jeu |
| --- | --- | --- |
| Nova City | Mégapole | Gratte-ciel, boulevards et flèche centrale |
| Forêt d'Émeraude | Forêt | Clairières, arbres denses et sanctuaire caché |
| Pics Blancs | Montagne | Crêtes enneigées, cols et radar d'altitude |
| Canyon Rouge | Canyon | Falaises, arches rocheuses et piste sinueuse |
| Archipel Azur | Îles | Îlots, ponts et phare au-dessus de l'océan |
| Royaume d'Ulvheim | Médiéval | Capitale fortifiée et ruines réelles du projet |
| Base Delta | Militaire | Deux pistes, hangars, radar et héliports |
| Paris 2099 | Futur urbain | Quartier parisien existant et tours futuristes |
| Neon Vegas | Nuit urbaine | Grand stade, boulevard lumineux et arène |
| Bassin de Fer | Industriel | Carrière, tours, routes de service et réacteur |
| Caldeira de Feu | Volcan | Lave, cratère et anneau de navigation aérienne |
| Citadelle Arctique | Glace | Plateau gelé, fortifications et dôme polaire |
| Côte Engloutie | Littoral | Routes inondées, ponts et ruines côtières |
| Convoi du Sahara | Désert | Dunes, pyramides, oasis et longue piste de raid |
| Îles du Ciel | Fantastique | Plateformes suspendues et ponts aériens |
| Marais de Cristal | Fantastique | Eau sombre, cristaux lumineux et passerelles |
| Avant-poste Lunaire | Lune | Cratères, dômes et antennes dans une faible gravité visuelle |
| Royaume Oublié | Grandes ruines | Ensemble étendu des bâtiments Ulvheim |
| Frontière des Tempêtes | Haute montagne | Relief agressif, pistes de motocross et radar |
| Vallée des Blocs | Aventure voxel | Relief cubique, rivière, village, mine et château en blocs |
| Canyon des Titans | Course aérienne | Douze portes chronométrées entre deux parois montagneuses géantes |

## Commandes communes

- Clavier : `ZQSD` ou flèches pour se déplacer, `Espace` pour monter ou sauter, `Maj` pour accélérer, `V` pour changer de caméra et `Échap` pour revenir au catalogue.
- Manette : stick gauche pour diriger, gâchettes pour l'accélération ou l'altitude, bouton principal pour sauter, bouton secondaire pour accélérer et bouton supérieur pour la caméra.
- Mobile : joystick tactile à gauche et boutons contextuels à droite. Les commandes occupent les zones basses de l'écran et tiennent compte des marges de sécurité des téléphones.
- Smartphone : le bouton `INCLINAISON` active l'accéléromètre/gyroscope après autorisation du navigateur. Le bouton `JOYSTICK` masque la commande gauche et `JOYSTICK +` la réaffiche à tout moment.
- Affichage mobile : le bouton `PLEIN ÉCRAN`, placé à côté de `JOYSTICK`, active ou quitte explicitement le plein écran. Les panneaux de mission, radar et télémétrie sont repliés dans le bouton `INFOS +`.
- Portail : traversez l’anneau pour un passage automatique. À moins de 70 mètres, maintenez `E`, le bouton manette secondaire/épaule ou le bouton tactile `PORTAIL` pour l’activer à distance.
- Combat aérien : une cible ennemie mobile est détectée par le radar dans chaque map jouée avec le chasseur. Alignez le losange dans le viseur jusqu'à `TIR AUTORISÉ`, puis tirez avec `F`/`Espace` pour le canon ou `G`/`M` pour le missile. Sur mobile, utilisez `CANON` et `MISSILE`; à la manette, le bouton principal tire au canon et le bouton latéral gauche lance le missile.
- Missiles : un tir sans verrouillage rouge part normalement mais reste non guidé et rate la cible. Seul un missile tiré pendant `TIR AUTORISÉ` poursuit et touche l'avion ennemi.
- Son : le réacteur et les bruitages de verrouillage, canon, missile et explosion démarrent après la première commande, conformément à la règle d’activation audio des navigateurs.

## Structure technique

- `world-catalog.js` décrit l'identité, la mission, les objectifs, les points de départ et les objets de chaque monde.
- `world-builder.js` génère le relief, les routes, la végétation, les bâtiments, l'eau, la lave et place les modèles 3D existants.
- `world-game.js` gère le catalogue, le chargement du pilote, le clavier, le tactile, la manette, les caméras et l'interface de mission.

Les objets lourds sont chargés à la demande. Les arbres, rochers et bâtiments répétitifs utilisent des instances 3D afin de garder un affichage fluide, notamment sur mobile.

## Ajouter un monde

Ajouter une entrée dans `WORLD_MAPS` de `world-catalog.js`. Une carte doit définir au minimum son identifiant, sa taille, son type de terrain, son plan de circulation, ses populations procédurales, son point de départ au sol, son point de départ aérien et sa mission. Les références d'objets doivent utiliser une clé déclarée dans `ASSET_LIBRARY`.

Le moteur construit ensuite automatiquement le terrain, les routes, le décor, les objectifs, les commandes et les trois modes de pilote.
