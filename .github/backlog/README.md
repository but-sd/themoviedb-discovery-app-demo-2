# Un backlog agile pour les étudiants

Le fichier [`backlog.json`](backlog.json) est la source versionnée des **7
évolutions et 21 tickets**. Chaque étudiant peut l'adapter, puis instancier les
issues et un GitHub Project dans **son propre dépôt personnel ou d'organisation**. Rien n'est créé dans le
dépôt de l'enseignant automatiquement.

## Contenu de la configuration

Chaque évolution contient un identifiant stable, un objectif pédagogique et des
tickets. Chaque ticket possède une user story, une estimation, une priorité, des
critères d'acceptation et des dépendances. Les identifiants servent aussi à
reconnaître les issues lors d'une reprise : ne pas les renommer après import.

Chaque ticket porte `"type": "feature"`. Dans une organisation, le générateur
utilise le **type d'issue natif GitHub Feature** et vérifie qu'il est activé.
Dans un dépôt personnel, il utilise automatiquement un **label feature**, créé
s'il manque. Ce choix est annoncé pendant l'import. Une erreur d'accès à l'API
ou un type Feature désactivé dans une organisation reste une erreur explicite,
pas un basculement silencieux vers un label.

| Évolution                       | Identifiants        | Estimations initiales |
| ------------------------------- | ------------------- | --------------------- |
| Explorer le catalogue           | EXP-01 à EXP-03     | S, M, L               |
| Tableau de bord cinéma          | DASH-01 à DASH-03   | M, M, L               |
| Comparer les films              | COMP-01 à COMP-03   | XS, M, L              |
| Historique des tendances        | HIST-01 à HIST-03   | L, L, M               |
| Recommandation explicable       | REC-01 à REC-03     | M, L, XL              |
| Watchlist et notes personnelles | WATCH-01 à WATCH-03 | S, M, M               |
| Fiabiliser l'application        | REL-01 à REL-03     | S, M, M               |

### Estimer en tailles de T-shirt

| Taille | Poids relatif initial | Repère pour la discussion                                        |
| ------ | --------------------- | ---------------------------------------------------------------- |
| XS     | 1                     | Changement très local, peu d'incertitude                         |
| S      | 2                     | Petite fonctionnalité, périmètre clair                           |
| M      | 3                     | Plusieurs composants ou transformations à coordonner             |
| L      | 5                     | Fonctionnalité plus large, intégration ou incertitude importante |
| XL     | 8                     | Trop large ou trop incertain : découper avant le sprint          |

Ces tailles évaluent **l'effort relatif, la complexité et l'incertitude**, pas des
heures. Les poids sont une convention pédagogique, pas une mesure universelle :
ils ne servent ni à noter les étudiants ni à comparer les équipes. Les
estimations proposées sont un point de départ à **réestimer collectivement**.
Après une réestimation dans GitHub, ajuster Size et Weight ensemble pour conserver
la correspondance choisie par l'équipe.

P1 = socle conseillé ; P2 = enrichissement ; P3 = approfondissement. Une priorité
ne remplace pas les dépendances : commencer par les tickets dont les prérequis
sont satisfaits. Le backlog complet n'est pas un engagement à tout réaliser.

## Instancier dans son dépôt

Prérequis :

- Un dépôt GitHub personnel ou d'organisation avec les issues activées et un
  accès en écriture. Pour une organisation, le type Feature doit être activé ;
  pour un dépôt personnel, le label feature est géré automatiquement.
- Node.js dans la version prévue par le projet et le CLI `gh` à jour, disponible
  sur le PATH. Aucun paquet npm supplémentaire n'est requis par ce script.
- Une authentification GitHub autorisant les issues et les Projects. Pour une
  connexion OAuth classique au CLI :

```sh
gh auth login
gh auth refresh -s project
```

Avec un autre type de jeton, vérifier les droits correspondants ; les règles
d'une organisation peuvent restreindre la création de projets. Ne jamais écrire
un jeton dans la configuration.

Depuis la racine de la copie du projet, remplacer `MON_LOGIN` et `MON_DEPOT` :
dans `--repo`, utiliser le login personnel ou le nom de l'organisation comme
propriétaire du dépôt ; `--owner MON_LOGIN` reste le propriétaire du GitHub Project.

```sh
# Vérifier les tickets localement : aucune requête GitHub, aucune écriture.
npm run backlog:instantiate -- --repo MON_ORGANISATION/MON_DEPOT --owner MON_LOGIN --dry-run

# Créer réellement un projet et les issues dans le dépôt indiqué explicitement.
npm run backlog:instantiate -- --repo MON_ORGANISATION/MON_DEPOT --owner MON_LOGIN --apply
```

Le script crée un GitHub Project lié au dépôt, les issues et les champs :
**Status**, **Size**, **Weight**, **Epic** et **Priority**. Tous les nouveaux
tickets sont initialisés dans **Backlog**. Le champ Status propose ensuite
**Ready**, **In Progress**, **In Review** et **Done**. Les dépendances sont des
liens dans les descriptions des issues, pas des blocages natifs GitHub.
Chaque nouvelle issue reçoit le type natif **Feature** (organisation) ou le label
**feature** (dépôt personnel). Lors d'une relance, les issues existantes reçoivent
également cette classification si nécessaire, sans modifier leurs autres
propriétés ni retirer leurs labels existants. Cette attribution ne nécessite pas
`--update-existing`, qui ne concerne que les titres et descriptions.

Le script garantit une vue **Backlog**, nommée par `project.viewName` dans la
configuration. La vue initiale unique « View 1 » est renommée sans changer sa
mise en page. Si des vues personnalisées existent déjà, elles sont conservées et
une vue tabulaire Backlog est ajoutée si nécessaire. Les relances ne créent pas
de vue en double. La colonne **Epic** est rendue visible dans Backlog sans
retirer ni réordonner les autres colonnes.

Pour utiliser un tableau Kanban, choisir la disposition **Board** de la vue
Backlog dans GitHub, la grouper par **Status**, puis afficher Size, Epic et
Priority. Le script ne modifie pas les filtres ou regroupements ; il ajoute
uniquement Epic aux colonnes visibles si nécessaire.

### Reprendre un import ou utiliser un projet existant

La création affiche immédiatement l'URL et le numéro du projet, ainsi que la
commande de reprise. Conserver ce numéro :

```sh
npm run backlog:instantiate -- --repo MON_ORGANISATION/MON_DEPOT --owner MON_LOGIN --project-number 7 --apply
```

**Sans `--project-number`, chaque lancement avec `--apply` crée un nouveau
projet.** Avec le numéro, les issues sont retrouvées par leur marqueur stable,
y compris celles qui sont fermées. Les issues existantes ne sont ni réouvertes
ni réécrites. Les champs déjà renseignés, notamment les estimations revues et le
statut d'avancement, sont conservés ; seuls les champs manquants sont initialisés.

Pour un projet préexistant créé autrement, ajouter d'abord l'option **Backlog**
au champ natif **Status**. Les champs personnalisés existants doivent avoir les
types attendus ; sinon le script s'arrête avec une erreur explicite. Les options
manquantes de Size, Epic et Priority sont ajoutées sans retirer les anciennes.
Il ne remplace pas les options de statut d'un projet existant.

L'import n'est pas transactionnel : en cas d'erreur, les créations déjà effectuées
restent sur GitHub. Corriger le problème et reprendre avec le même numéro.
Ne pas lancer deux imports simultanément vers le même dépôt/projet.

Pour modifier le backlog avant import, éditer `backlog.json` ou utiliser une
copie avec `--config chemin/mon-backlog.json`. Après import, les modifications
de contenu restent à effectuer dans GitHub : le script n'est pas un outil de
synchronisation destructive.

### Ajouter de nouvelles idées et relancer

Ajouter des tickets à une évolution existante ou ajouter une évolution dans
`backlog.json`. Utiliser de **nouveaux identifiants stables** : par exemple
`EXP-04` pour un ticket supplémentaire, ou `NEW` et `NEW-01` pour une nouvelle
évolution. Fournir les mêmes propriétés que les tickets existants, avec une
taille, une priorité, des critères d'acceptation et une liste de dépendances.

Après récupération de la nouvelle configuration, chaque étudiant relance vers
**le même numéro de projet** :

```sh
npm run backlog:instantiate -- --repo MON_ORGANISATION/MON_DEPOT --owner MON_LOGIN --project-number 7 --dry-run
npm run backlog:instantiate -- --repo MON_ORGANISATION/MON_DEPOT --owner MON_LOGIN --project-number 7 --apply
```

La simulation reste locale : elle affiche le backlog configuré, pas la différence
avec GitHub. L'import ajoute uniquement les issues absentes et les rattachements
manquants. Les nouveaux tickets démarrent dans Backlog ; une nouvelle évolution
ajoute automatiquement son option dans le champ Epic, en conservant les
identifiants, couleurs et descriptions des options existantes.

Une nouvelle relance sans modification ne crée aucun doublon. Les tickets déjà
en cours ou terminés, leurs contenus, leurs estimations et les options ajoutées
par l'équipe restent intacts. Retirer une idée du fichier ne supprime rien dans
GitHub. Modifier un ticket existant dans le fichier ne remplace pas son contenu
sur GitHub : utiliser un nouvel identifiant pour un nouveau besoin, ou modifier
l'issue manuellement pour préciser le besoin initial, ou utiliser la mise à jour
explicite ci-dessous.

### Mettre à jour le contenu des tickets existants

Pour répercuter les changements de titres, user stories, critères d'acceptation,
objectifs pédagogiques ou dépendances, ajouter `--update-existing` :

```sh
npm run backlog:instantiate -- --repo MON_ORGANISATION/MON_DEPOT --owner MON_LOGIN --project-number 7 --update-existing --dry-run
npm run backlog:instantiate -- --repo MON_ORGANISATION/MON_DEPOT --owner MON_LOGIN --project-number 7 --update-existing --apply
```

**Cette option remplace le titre et toute la description de chaque issue dont le
contenu diffère de la configuration**, y compris les modifications manuelles et
les cases cochées dans la description. Prévenir les étudiants avant de l'utiliser.
Les commentaires, affectations, labels, état ouvert/fermé et champs déjà
renseignés du projet restent conservés, notamment l'avancement, Size et Weight.
Les estimations affichées dans la description restent les estimations initiales
de la configuration, pas celles réévaluées dans les champs du projet.

Les liens de dépendances sont reconstruits après création des nouveaux tickets.
Les contenus identiques ne sont pas réécrits. Sans cette option, la relance reste
strictement additive pour les titres et descriptions. La simulation ne consulte
pas GitHub et ne détermine donc pas quelles issues ont changé.

## Proposition d'atelier agile

1. **Refinement** : lire les user stories, discuter les critères d'acceptation,
   repérer les dépendances et comparer les tailles à un ticket de référence.
2. **Estimation collective** : chacun propose une taille, puis les estimations
   extrêmes sont expliquées avant de chercher un accord. Découper le ticket XL
   en petits tickets livrables ; garder l'original comme référence.
3. **Sprint planning** : choisir un objectif, sélectionner un petit ensemble
   réaliste et déplacer seulement les tickets prêts dans Ready. Un ticket prêt
   a des critères compris, une taille discutée et des prérequis satisfaits.
4. **Réalisation** : limiter les travaux simultanés, passer par In Progress puis
   In Review et relier les pull requests aux issues. Chaque équipe peut ajouter
   un champ Sprint pour suivre sa sélection.
5. **Review** : démontrer les critères d'acceptation et appliquer la Definition
   of Done du ticket avant de le passer dans Done.
6. **Rétrospective** : comparer ce qui a été prévu et livré, discuter les
   incertitudes et ajuster le découpage et les estimations du sprint suivant.

Pour une première itération, **REL-01, EXP-01 et WATCH-01** forment une sélection
possible, pas une obligation. Un projet orienté science des données peut ensuite
viser REL-02, DASH-01 et DASH-02 avant la visualisation.

## Vérifier le dispositif

```sh
npm run backlog:test
```

Ces vérifications couvrent la configuration, les dépendances, la simulation,
l'import et la reprise avec un CLI GitHub simulé. Elles ne créent aucune issue et
ne consomment pas de jeton. Le fonctionnement réel dépend des droits GitHub et
des politiques du compte cible.
