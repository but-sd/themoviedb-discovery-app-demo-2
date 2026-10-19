# themoviedb-discovery-app-demo-2

## Collecte de films

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

La table `movies` contient les informations des films, leur année, leurs
statistiques et la date de collecte. `genre_ids` contient un tableau JSON.
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
`upsertMovies(database, movies, year)` dans le même module.
Le service de collecte appelle ces fonctions et ferme la connexion.
