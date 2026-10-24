# themoviedb-discovery-app-demo-2

## Développement des composants avec Storybook

```bash
npm run storybook
```

Storybook est disponible sur <http://localhost:6006>. Les stories sont placées
à côté des composants dans des fichiers `*.stories.tsx`. Elles couvrent les
cartes du catalogue, les genres, les films, la fiche film et le tableau de bord,
avec des états renseignés, vides et des cas d’égalité.
Les contrôles permettent de modifier les propriétés des composants et la barre
d’outils permet de basculer entre les thèmes clair et sombre.
Les styles de l’application et le contexte React Router sont chargés
automatiquement. Les liens des cartes ouvrent un écran de démonstration ;
ils n’appellent pas l’API. Aucune clé TMDB ni serveur backend n’est nécessaire.

```bash
npm run build-storybook
```

Cette commande génère le site statique dans `storybook-static/` (ignoré par Git).
Les données fictives partagées se trouvent dans
`src/front-end/stories/fixtures.ts`. Pour ajouter une story, exporter une
configuration `Meta` et des états `StoryObj` depuis `@storybook/react-vite`,
en suivant les fichiers existants.
Ne pas renseigner `title` dans la configuration : Storybook le déduit du chemin
relatif à `src/front-end/components`, par exemple
`discovery/AverageRatingCard`.

### Vérification de l’accessibilité

L’addon Accessibility analyse automatiquement chaque story affichée avec
`axe-core`. Le panneau **Accessibility** présente les violations, les règles
respectées et les points à vérifier manuellement. Il permet aussi de mettre
en évidence les éléments concernés ; la barre d’outils propose des simulations
de déficiences visuelles.

La configuration globale `a11y.test: 'error'` définit les violations comme des
échecs pour une future intégration du runner de tests Storybook. Actuellement,
les contrôles s’effectuent dans Storybook : `npm test` exécute les tests unitaires,
pas les audits d’accessibilité, et `npm run build-storybook` ne les exécute pas.
Ces contrôles automatisés ne remplacent pas une vérification au clavier et
avec un lecteur d’écran.

## Collecte de films

Les trois autres cartes de genres sont également cliquables :
**Genre dominant** ouvre la répartition par genre,
**Meilleure note** ouvre `/exploration/movies/genres/ratings` et
**Meilleure note pondérée** ouvre `/exploration/movies/genres/weighted-ratings`.
Ces deux dernières pages proposent les barres horizontales et verticales,
une échelle de 0 à 10 et un tableau accessible. Les genres sont classés par
note décroissante (puis par identifiant en cas d’égalité).
La moyenne simple donne le même poids à chaque film noté ; la moyenne pondérée
utilise `somme(note × votes) / somme(votes)`. Les films sans vote sont exclus.
Les deux pages utilisent `GET /api/movies/genres/ratings`, sans appel à TMDB.

Les pages de graphiques (genres, années, durées, notes et pays) partagent
les mêmes contrôles et le même rendu Chart.js : barres horizontales par défaut,
barres verticales, anneau ou camembert, avec une légende pour les parts et une
adaptation aux thèmes clair/sombre. Les moyennes annuelles de notes proposent
uniquement les deux modes de barres, sur une échelle fixe de 0 à 10.
Chaque graphique dispose d’un tableau accessible sous **Afficher les données
du graphique**. Pour les pays et les genres, les parts représentent des
associations, et non des films distincts. Les données inconnues restent
comptées séparément et ne sont pas incluses dans les parts.

La carte **Genres représentés** ouvre `/exploration/movies/genres`.
Le graphique existant propose des barres horizontales ou verticales, un anneau
et un camembert, ainsi qu’un tableau accessible des données.
Un film compte une fois pour chacun de ses genres : les totaux représentent
les associations film/genre, pas des films distincts.
Les données proviennent de `GET /api/movies/genres/distribution` (SQLite,
sans appel à TMDB).

La carte **Pays le plus représenté** ouvre `/exploration/movies/countries`.
Un histogramme et un tableau accessible montrent tous les pays de production,
classés par nombre de films décroissant (puis par code pays en cas d’égalité).
Chaque coproduction compte une fois pour chaque pays ; la somme des valeurs
peut donc dépasser le nombre de films. Les films sans pays renseigné sont
comptés séparément. `GET /api/movies/countries/distribution` lit SQLite sans
appel à TMDB et renvoie
`{ "countries": [{ "code": "FR", "name": "France", "movieCount": 50 }], "unknownMovieCount": 2 }`.

La carte **Note moyenne** ouvre `/exploration/movies/ratings`, avec deux
graphiques et leurs tableaux accessibles : la répartition des films par tranches
d’un point (0 inclus à 1 exclu, puis 1–<2, …, 9–10 inclus) et la note moyenne
par année de sortie. Seuls les films ayant au moins un vote sont inclus ;
les films non notés sont comptés séparément. Une note de zéro avec au moins
un vote reste une note valide. Les moyennes annuelles sont arithmétiques, sans
pondération par les votes, sur une échelle fixe de 0 à 10.
`GET /api/movies/ratings/distribution` lit SQLite sans appel à TMDB et renvoie
`{ "buckets": [{ "label": "0–<1", "movieCount": 2 }, ...], "years": [{ "year": 2020, "averageRating": 7.25, "movieCount": 50 }], "unratedMovieCount": 3 }`.

Dans l’exploration, cliquer sur la carte **Films en base** ouvre
`/exploration/movies/years` : un histogramme et un tableau accessible présentent
le nombre de films par année de sortie enregistrée en base, dans l’ordre
chronologique. Les années sans film sont omises. Les données proviennent de
`GET /api/movies/years/distribution` (SQLite, sans appel à TMDB), au format
`[{ "year": 2020, "movieCount": 150 }]`.

La carte **Durée moyenne** ouvre `/exploration/movies/runtimes` : un histogramme
et un tableau accessible répartissent les films dans les tranches suivantes :
moins de 1 h, 1 h–1 h 29, 1 h 30–1 h 59, 2 h–2 h 29, 2 h 30–2 h 59 et 3 h et plus.
Les tranches vides restent affichées. Les films sans durée connue sont comptés
séparément, sans être inclus dans les tranches, comme pour le calcul de la moyenne.
`GET /api/movies/runtimes/distribution` lit SQLite sans appel à TMDB et renvoie
`{ "buckets": [{ "label": "Moins de 1 h", "movieCount": 10 }, ...], "unknownMovieCount": 2 }`.

La collecte enregistre aussi `movies.budget` et `movies.revenue` en dollars US,
depuis la même requête de détails TMDB que la durée. Les montants à zéro ou
non renseignés sont stockés à `NULL` (inconnus, pas des budgets ou recettes nuls).
Les valeurs sont actualisées à chaque collecte. Les colonnes `runtime_minutes`,
`budget` et `revenue` font partie du schéma initial.

La page d’exploration présente le film le plus rentable et le moins rentable
selon le retour sur investissement : `(revenue - budget) / budget × 100`.
Seuls les films dont le budget et les recettes sont connus et positifs sont
classés ; les égalités sont départagées par identifiant croissant.
Les cartes affichent le ROI en pourcentage et détaillent les montants en dollars US.
Cet indicateur ne tient compte ni du marketing, ni des frais de distribution,
ni du partage des recettes.

La vue d’exploration affiche quatre indicateurs de catalogue, quatre films à la
une avec leurs affiches TMDB (ou un visuel de remplacement), puis quatre cartes
de genres. Les cartes d’indicateurs ouvrent leurs graphiques ; les cartes de
films ouvrent leur fiche. La disposition s’adapte au mobile et les liens sont
accessibles au clavier, sans informations réservées au survol.

Le panneau Films affiche aussi le **Film le mieux noté** (au moins 100 votes)
et le **Film le plus populaire** selon le score TMDB lors de la collecte.
Les égalités sont départagées par le nombre de votes puis l'identifiant TMDB.
Les fiches sont consultables depuis la totalité des cartes.

Le panneau Genres inclut une vignette **Meilleure note pondérée**, en complément
de la moyenne simple : `SUM(note × nombre de votes) / SUM(nombre de votes)`.
Les films sans vote sont exclus. En cas d’égalité, les cartes affichent un genre
et un badge indiquant le nombre d’autres genres à égalité ; les graphiques
permettent de consulter tous les genres.

La carte **Note moyenne** du panneau Films présente la moyenne arithmétique
des notes des films ayant au moins un vote, sur 10, sans pondération.
Chaque film est compté une seule fois, indépendamment de ses genres.
Le graphique des moyennes annuelles précise le nombre de films notés par année.

Une carte **Durée moyenne** dans le panneau Films affiche la durée moyenne
en minutes, arrondie, des films ayant une durée connue. Le graphique distingue
les durées inconnues. La collecte récupère les détails
TMDB de chaque film pour enregistrer sa durée dans `movies.runtime_minutes`.
Une nouvelle collecte enrichit les films existants ; sans durée renseignée,
la carte indique « Non disponible ». Les durées nulles ou égales à zéro
sont exclues du calcul. Cette récupération ajoute une requête par film.
Les anciennes bases ne sont pas migrées automatiquement.

La carte Films en base indique les bornes des années présentes ou collectées,
sans présumer une couverture continue. Après une collecte, rouvrir l’exploration
permet de charger les indicateurs actualisés.
Les indicateurs sont regroupés dans deux panneaux : **Films** pour la couverture
du catalogue et **Genres** pour la diversité, le genre dominant et la meilleure note.

Les cartes utilisent `GET /api/movies/genres/distribution` et
`GET /api/movies/genres/ratings`, calculés depuis SQLite.
Un film appartenant à plusieurs genres est compté dans chacun d'eux.
Les notes moyennes sont arithmétiques, sans pondération, sur une échelle
de 0 à 10 ; les films sans vote sont exclus.

Avec Node.js 24 ou plus et `TMDB_ACCESS_TOKEN` dans `.env` :
La commande utilise Commander : `--help` affiche l'usage. `<year>` est une
année passée à quatre chiffres (1870 à l'année courante) ; `[count]` est un
entier positif facultatif, fixé à 100 par défaut.

```sh
# Afficher l'aide
npm run collect:movies -- --help

# Collecter jusqu'à 100 films pour 2020
npm run collect:movies -- 2020

# Limiter la collecte à 50 films
npm run collect:movies -- 2020 50
```

Le service `collectMovies(year, limit = 100, databasePath)` collecte jusqu'à
100 films par défaut, triés par popularité, depuis TMDB Discover pour une
année (de 1870 à l'année courante) et stocke les films dans
`data/movies.sqlite`. Il partage sa recherche avec
`GET /api/movies/discover?year=2020`. Aucun serveur local n'est nécessaire.

Dans la page **Administration** (`/administration`), accessible depuis la navigation,
le formulaire de collecte
permet de sélectionner une année de début et une année de fin.
Avec le serveur démarré (`npm run dev`), il collecte séquentiellement jusqu'à
100 films par année, bornes incluses, via `POST /api/movies/collect?year=2020`.
La progression est affichée et les années déjà enregistrées sont conservées
si une année échoue. Gardez la page ouverte pendant la collecte.

La page affiche le nombre de films stockés et les années déjà collectées,
via `GET /api/movies/collection`. Le bouton indique **Instancier** si la base
est vide, ou **Mettre à jour** sinon. Ces informations sont actualisées à la
fin de chaque lancement, y compris en cas d'échec partiel.
La table `collection_years` enregistre les années collectées avec succès,
même lorsqu'aucun film n'est disponible. Les années des films déjà présents
sont également incluses dans le récapitulatif.

La table `movies` contient les informations des films, leur année, leurs
statistiques et la date de collecte. La table `genres` contient les identifiants
TMDB et les libellés français récupérés pendant la collecte.
La table `movie_genres` relie les films aux genres avec une clé primaire
composée et des clés étrangères ; un film peut avoir plusieurs genres.
La table `production_countries` relie les films aux codes pays TMDB, sans
dupliquer les libellés. La table `countries` associe chaque code ISO 3166-1
alpha-2 à son libellé TMDB. Les pays de production et leurs libellés sont
synchronisés lors de la collecte des détails du film.
La carte « Pays le plus représenté » affiche le pays associé au plus grand
nombre de films du catalogue en base. Une coproduction compte une fois par
pays ; les films sans pays connu sont exclus. En cas d’égalité, le code pays
croissant départage les pays.
Les associations sont synchronisées à chaque collecte, dans la même transaction
que les films et les libellés.
Une nouvelle collecte met à jour les films existants, identifiés par leur ID
TMDB, sans doublons ni suppression des autres années.

Les écritures sont transactionnelles et commencent uniquement après récupération
des pages nécessaires. La collecte s'arrête dès que la limite demandée est
atteinte, ou lorsque toutes les pages disponibles ont été parcourues.
Le nombre demandé doit être un entier strictement positif.
En cas d'erreur réseau ou si le nombre demandé nécessite de dépasser la limite
TMDB de 500 pages, la collecte échoue sans enregistrer de résultats partiels.
Le troisième argument optionnel du service permet de choisir le chemin SQLite.

La persistance est organisée dans `src/back-end/database/` :

- `connection.ts` ouvre la base, active les clés étrangères et initialise le schéma
  via `createMoviesDatabase()`. L’appelant ferme la connexion après utilisation.
- `schema.ts` définit l’ensemble des tables, colonnes, contraintes et index initiaux.
- `movie-writer.ts` expose `upsertMovies(database, movies, year, genres, details)`
  pour enregistrer une collecte dans une transaction.
- `movie-statistics.ts` fournit les distributions et les notes moyennes par genre.
- `collection-summary.ts` regroupe les indicateurs et les films remarquables du catalogue.

Aucune migration n’est exécutée. Après un changement de schéma, sauvegardez puis
retirez l’ancien fichier `data/movies.sqlite` (ou le fichier configuré) avant de
relancer une collecte : une base vide au schéma actuel sera créée. Relancer la
collecte sans retirer une ancienne base incompatible ne met pas son schéma à jour.

Exemple d'exploitation :

```sql
SELECT genres.name, COUNT(*) AS movie_count
FROM movie_genres
JOIN genres ON genres.id = movie_genres.genre_id
JOIN movies ON movies.id = movie_genres.movie_id
WHERE movies.release_year = 2020
GROUP BY genres.id, genres.name;
```
