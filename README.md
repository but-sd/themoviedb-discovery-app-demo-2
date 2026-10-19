# themoviedb-discovery-app-demo-2

## Collecte de films

La vue d'exploration adopte un dashboard cinéma : trois chiffres clés en tête,
deux films à la une avec leurs affiches TMDB (ou un visuel de remplacement),
puis les quatre indicateurs de genres. La disposition s'adapte au mobile,
sans graphiques ; les explications restent accessibles au survol et au clavier.

Le panneau Films affiche aussi le **Film le mieux noté** (au moins 100 votes)
et le **Film le plus populaire** selon le score TMDB lors de la collecte.
Les égalités sont départagées par le nombre de votes puis l'identifiant TMDB.
Le survol précise l'année, la note et le nombre de votes.

Le panneau Genres inclut une vignette **Meilleure note pondérée**, en complément
de la moyenne simple : `SUM(note × nombre de votes) / SUM(nombre de votes)`.
Les films sans vote sont exclus ; les détails et les ex æquo sont accessibles
au survol, au clavier ou au toucher.

La carte **Note moyenne** du panneau Films présente la moyenne arithmétique
des notes des films ayant au moins un vote, sur 10, sans pondération.
Chaque film est compté une seule fois, indépendamment de ses genres.
Le nombre de films notés est précisé au survol.

Une carte **Durée moyenne** dans le panneau Films affiche la durée moyenne
en minutes, arrondie, des films ayant une durée connue. Le survol indique
le nombre de films pris en compte. La collecte récupère désormais les détails
TMDB de chaque film pour enregistrer sa durée dans `movie_runtimes`.
Une nouvelle collecte enrichit les films existants ; sans durée renseignée,
la carte indique « Non disponible ». Les durées nulles ou égales à zéro
sont exclues du calcul. Cette récupération ajoute une requête par film.

La page d'exploration affiche quatre cartes de synthèse : le nombre de films en base
avec les années de début et de fin de collecte, le nombre de genres représentés,
le genre le plus représenté
avec son nombre de films et le genre ayant la meilleure moyenne non pondérée
(films sans vote exclus). Elles affichent tous les ex æquo et sont actualisées
après la collecte.
Les cartes affichent uniquement le genre et sa valeur ; les explications et
les ex æquo apparaissent au survol, au focus clavier ou en touchant la carte.
Les indicateurs sont regroupés dans deux panneaux : **Films** pour la couverture
du catalogue et **Genres** pour la diversité, le genre dominant et la meilleure note.

Les cartes utilisent `GET /api/movies/genres/distribution` et
`GET /api/movies/genres/ratings`, calculés depuis SQLite.
Un film appartenant à plusieurs genres est compté dans chacun d'eux.
Les notes moyennes sont arithmétiques, sans pondération, sur une échelle
de 0 à 10 ; les films sans vote sont exclus.

Avec Node.js 24 ou plus et `TMDB_ACCESS_TOKEN` dans `.env` :

```sh
npm run collect:movies -- 2020
# Pour choisir le nombre maximum de films :
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

La création du fichier SQLite, de la table et de son index est centralisée
dans `src/back-end/movies-database.ts` via `createMoviesDatabase()`.
Les insertions et mises à jour transactionnelles sont exposées par
`upsertMovies(database, movies, year, genres)` dans le même module.
Le service de collecte appelle ces fonctions et ferme la connexion.

Ce schéma nécessite une nouvelle base SQLite ; aucune migration des anciennes
bases utilisant `movies.genre_ids` n'est effectuée.

Exemple d'exploitation :

```sql
SELECT genres.name, COUNT(*) AS movie_count
FROM movie_genres
JOIN genres ON genres.id = movie_genres.genre_id
JOIN movies ON movies.id = movie_genres.movie_id
WHERE movies.release_year = 2020
GROUP BY genres.id, genres.name;
```
