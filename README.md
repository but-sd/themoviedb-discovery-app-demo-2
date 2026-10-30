# themoviedb-discovery-app-demo-2

Application de découverte de films basée sur TMDB, utilisée comme support de
projet pour des étudiants de BUT Science des données.

## Backlog pédagogique et GitHub Projects

L'[epic d'exploration des films sur plusieurs années](.github/backlog/README.md)
est configurée dans [`.github/backlog/backlog.yaml`](.github/backlog/backlog.yaml)
avec 14 tickets Feature, du cadrage des données au tableau de bord, en passant
par la base, les imports CSV des genres et pays, le pipeline d'alimentation et son CLI. Les anciennes idées restent
commentées et ne sont pas générées.
Chaque ticket contient une user story, des critères d'acceptation, des
dépendances, une priorité et une estimation initiale en taille de T-shirt.

Chaque étudiant peut créer les issues et un GitHub Project dans son propre dépôt :
le générateur utilise les types d'issue natifs **Feature et Bug** pour les organisations
(qui doivent les activer), et automatiquement les labels **feature et bug** pour les dépôts
personnels. Cette classification est appliquée aussi aux issues existantes lors
d'une relance, sans retirer leurs autres labels.

Les vues **Features** et **Bugs** séparent les deux catégories, tandis que
**Backlog** conserve tous les tickets. La vue Bugs peut rester vide tant qu'aucun
ticket Bug n'est activé dans la configuration.

```sh
npm run backlog:instantiate -- --repo MON_LOGIN/MON_DEPOT --owner MON_LOGIN --dry-run
npm run backlog:instantiate -- --repo MON_LOGIN/MON_DEPOT --owner MON_LOGIN --apply
```

Consulter le [guide d'instanciation et d'atelier agile](.github/backlog/README.md)
pour les prérequis, la reprise d'import et l'utilisation du tableau.

Lors de l'ajout de nouvelles idées à la configuration, relancer avec
`--project-number NUMERO --apply` pour compléter le **même projet** sans dupliquer
les tickets ni écraser les estimations ou l'avancement des étudiants.
Ajouter `--update-existing` pour remplacer aussi les titres et descriptions
existants depuis la configuration ; cette option écrase les modifications
manuelles de ces contenus, mais conserve les champs du projet et commentaires.
