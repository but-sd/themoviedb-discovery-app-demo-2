import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const defaultConfig = new URL(
  '../.github/backlog/backlog.json',
  import.meta.url,
);
const fieldNames = ['Size', 'Weight', 'Epic', 'Priority'];

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

export function validateBacklog(config) {
  requireValue(
    config?.version === 1,
    'Version de configuration non supportee.',
  );
  requireValue(
    typeof config.project?.title === 'string' && config.project.title.trim(),
    'Titre de projet manquant.',
  );
  requireValue(
    typeof config.project.viewName === 'string' &&
      config.project.viewName.trim(),
    'Nom de vue manquant.',
  );
  requireValue(
    Array.isArray(config.project.stages) &&
      config.project.stages[0] === 'Backlog' &&
      config.project.stages.every(
        (stage) => typeof stage === 'string' && stage.trim(),
      ) &&
      new Set(config.project.stages).size === config.project.stages.length,
    'Les etapes doivent etre uniques et commencer par Backlog.',
  );
  requireValue(
    Array.isArray(config.sizes) &&
      config.sizes.map((size) => size.name).join(',') === 'XS,S,M,L,XL' &&
      config.sizes.every(
        (size) => Number.isInteger(size.weight) && size.weight > 0,
      ) &&
      config.sizes.every(
        (size, index) =>
          index === 0 || size.weight > config.sizes[index - 1].weight,
      ),
    'Tailles attendues : XS,S,M,L,XL avec des poids entiers positifs croissants.',
  );
  requireValue(
    Array.isArray(config.epics) && config.epics.length > 0,
    'Aucune evolution.',
  );
  const tickets = new Map();
  const epicIds = new Set();
  for (const epic of config.epics) {
    requireValue(
      typeof epic.id === 'string' &&
        /^[A-Z]+$/.test(epic.id) &&
        !epicIds.has(epic.id),
      'Identifiant d evolution invalide ou duplique.',
    );
    epicIds.add(epic.id);
    for (const key of ['title', 'objective']) {
      requireValue(
        typeof epic[key] === 'string' && epic[key].trim(),
        `${epic.id} : ${key} manquant.`,
      );
    }
    requireValue(
      Array.isArray(epic.tickets) && epic.tickets.length > 0,
      `${epic.id} : aucun ticket.`,
    );
    for (const ticket of epic.tickets) {
      requireValue(
        typeof ticket.id === 'string' &&
          new RegExp(`^${epic.id}-\\d{2}$`).test(ticket.id) &&
          !tickets.has(ticket.id),
        'Identifiant de ticket invalide ou duplique.',
      );
      for (const key of ['title', 'story']) {
        requireValue(
          typeof ticket[key] === 'string' && ticket[key].trim(),
          `${ticket.id} : ${key} manquant.`,
        );
      }
      requireValue(
        ticket.type === 'feature',
        `${ticket.id} : type attendu feature.`,
      );
      requireValue(
        config.sizes.some((size) => size.name === ticket.size),
        `${ticket.id} : taille inconnue.`,
      );
      requireValue(
        ['P1', 'P2', 'P3'].includes(ticket.priority),
        `${ticket.id} : priorite inconnue.`,
      );
      requireValue(
        Array.isArray(ticket.acceptance) &&
          ticket.acceptance.length > 0 &&
          ticket.acceptance.every(
            (criterion) => typeof criterion === 'string' && criterion.trim(),
          ),
        `${ticket.id} : criteres d'acceptation manquants.`,
      );
      requireValue(
        Array.isArray(ticket.dependsOn) &&
          ticket.dependsOn.every((id) => typeof id === 'string') &&
          new Set(ticket.dependsOn).size === ticket.dependsOn.length,
        `${ticket.id} : dependances invalides.`,
      );
      tickets.set(ticket.id, ticket);
    }
  }
  const visited = new Set();
  const visiting = new Set();
  function visit(id) {
    requireValue(tickets.has(id), `Dependance inconnue : ${id}.`);
    requireValue(!visiting.has(id), `Cycle de dependances : ${id}.`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of tickets.get(id).dependsOn) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of tickets.keys()) visit(id);
  return config;
}

export function marker(id) {
  return `<!-- tmdb-student-backlog:${id} -->`;
}

export function issueBody(epic, ticket, config, issueUrls) {
  const weight = config.sizes.find((size) => size.name === ticket.size).weight;
  const dependencies = ticket.dependsOn.length
    ? ticket.dependsOn.map((id) => `- ${issueUrls.get(id) ?? id}`).join('\n')
    : 'Aucune.';
  return [
    marker(ticket.id),
    '## User story',
    ticket.story,
    '## Objectif pedagogique',
    `${epic.title} : ${epic.objective}`,
    '## Estimation initiale',
    `**Taille : ${ticket.size}** | **Poids relatif : ${weight}** | **Priorite : ${ticket.priority}**`,
    'Estimation indicative a discuter en refinement. Le poids ne represente ni des heures ni une note. Un ticket XL doit etre decoupe avant engagement en sprint.',
    '## Criteres d acceptation',
    ticket.acceptance.map((criterion) => `- [ ] ${criterion}`).join('\n'),
    '## Dependances',
    dependencies,
    '## Definition of Done',
    '- [ ] Criteres d acceptation verifies et demonstration preparee.',
    '- [ ] Tests pertinents ajoutes ou adaptes et verifications du projet reussies.',
    '- [ ] Code relu et documentation utile mise a jour.',
    '- [ ] Aucun secret ni donnee personnelle non necessaire dans le depot.',
  ].join('\n\n');
}

export function gh(args, input) {
  try {
    return execFileSync('gh', args, {
      encoding: 'utf8',
      input,
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
    }).trim();
  } catch (error) {
    throw new Error(
      `Echec de gh ${args.slice(0, 2).join(' ')} : ${error.stderr?.toString().trim() || error.message}`,
      { cause: error },
    );
  }
}

function graphql(run, query, variables) {
  const result = JSON.parse(
    run(
      ['api', 'graphql', '--input', '-'],
      JSON.stringify({ query, variables }),
    ),
  );
  requireValue(
    !result.errors?.length,
    `Erreur GraphQL : ${JSON.stringify(result.errors)}`,
  );
  requireValue(result.data, 'Reponse GraphQL sans donnees.');
  return result.data;
}

function json(run, args) {
  return JSON.parse(run(args));
}

function ensureBacklogView(run, projectId, name, log) {
  const views = [];
  let cursor = null;
  do {
    const data = graphql(
      run,
      `
        query ($id: ID!, $cursor: String) {
          node(id: $id) {
            ... on ProjectV2 {
              views(first: 100, after: $cursor) {
                nodes {
                  id
                  name
                  number
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        }
      `,
      { id: projectId, cursor },
    );
    requireValue(data.node?.views, 'Impossible de lire les vues du projet.');
    views.push(...data.node.views.nodes);
    cursor = data.node.views.pageInfo.hasNextPage
      ? data.node.views.pageInfo.endCursor
      : null;
  } while (cursor);
  if (views.some((view) => view.name === name)) return;
  if (views.length === 1 && views[0].name === 'View 1') {
    graphql(
      run,
      `
        mutation ($id: ID!, $name: String!) {
          updateProjectV2View(input: { viewId: $id, name: $name }) {
            projectV2View {
              id
              name
            }
          }
        }
      `,
      { id: views[0].id, name },
    );
  } else {
    graphql(
      run,
      `
        mutation ($id: ID!, $name: String!) {
          createProjectV2View(
            input: { projectId: $id, name: $name, layout: TABLE_LAYOUT }
          ) {
            projectV2View {
              id
              name
            }
          }
        }
      `,
      { id: projectId, name },
    );
  }
  log(`Vue ${name} configuree.`);
}

function extendSelectField(run, field, names, log) {
  requireValue(
    Array.isArray(field.options),
    `Le champ ${field.name} doit etre de type SINGLE_SELECT.`,
  );
  const missing = names.filter(
    (name) => !field.options.some((option) => option.name === name),
  );
  if (!missing.length) return;
  const data = graphql(
    run,
    `
      query ($id: ID!) {
        node(id: $id) {
          ... on ProjectV2SingleSelectField {
            options {
              id
              name
              color
              description
            }
          }
        }
      }
    `,
    { id: field.id },
  );
  requireValue(
    Array.isArray(data.node?.options),
    `Impossible de lire les options du champ ${field.name}.`,
  );
  const additions = names
    .filter((name) => !data.node.options.some((option) => option.name === name))
    .map((name) => ({ name, color: 'GRAY', description: '' }));
  if (!additions.length) return;
  graphql(
    run,
    `
      mutation ($id: ID!, $options: [ProjectV2SingleSelectFieldOptionInput!]!) {
        updateProjectV2Field(
          input: { fieldId: $id, singleSelectOptions: $options }
        ) {
          projectV2Field {
            ... on ProjectV2SingleSelectField {
              id
            }
          }
        }
      }
    `,
    { id: field.id, options: [...data.node.options, ...additions] },
  );
  log(
    `Options ajoutees a ${field.name} : ${additions.map((option) => option.name).join(', ')}.`,
  );
}

export function parseOptions(args) {
  const { values } = parseArgs({
    args,
    options: {
      repo: { type: 'string' },
      owner: { type: 'string' },
      config: { type: 'string' },
      'project-number': { type: 'string' },
      apply: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      'update-existing': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });
  requireValue(
    !(values.apply && values['dry-run']),
    'Ne pas combiner --apply et --dry-run.',
  );
  if (values.help) return values;
  requireValue(
    typeof values.repo === 'string' &&
      /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(values.repo),
    '--repo OWNER/REPO est obligatoire.',
  );
  requireValue(
    typeof values.owner === 'string' && /^[A-Za-z0-9-]+$/.test(values.owner),
    '--owner LOGIN est obligatoire (utilisateur ou organisation).',
  );
  requireValue(
    !values['project-number'] || /^[1-9]\d*$/.test(values['project-number']),
    '--project-number doit etre un entier positif.',
  );
  return values;
}

function readProjectItems(run, projectId) {
  const items = new Map();
  let cursor = null;
  do {
    const data = graphql(
      run,
      `
        query ($id: ID!, $cursor: String) {
          node(id: $id) {
            ... on ProjectV2 {
              items(first: 100, after: $cursor) {
                nodes {
                  id
                  content {
                    ... on Issue {
                      url
                    }
                  }
                  fieldValues(first: 100) {
                    nodes {
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                        field {
                          ... on ProjectV2SingleSelectField {
                            name
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldNumberValue {
                        number
                        field {
                          ... on ProjectV2Field {
                            name
                          }
                        }
                      }
                    }
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        }
      `,
      { id: projectId, cursor },
    );
    requireValue(data.node?.items, 'Impossible de lire les tickets du projet.');
    for (const item of data.node.items.nodes) {
      if (item.content?.url) items.set(item.content.url, item);
    }
    cursor = data.node.items.pageInfo.hasNextPage
      ? data.node.items.pageInfo.endCursor
      : null;
  } while (cursor);
  return items;
}

export function instantiate(config, options, run = gh, log = console.log) {
  validateBacklog(config);
  const allTickets = config.epics.flatMap((epic) => epic.tickets);
  if (!options.apply) {
    log(
      `Simulation : ${options.repo}, proprietaire ${options.owner}, ${allTickets.length} tickets. Aucune requete GitHub.`,
    );
    if (options['update-existing']) {
      log(
        'Avec --apply, les titres et descriptions existants seront remplaces par la configuration, y compris les modifications manuelles.',
      );
    }
    for (const epic of config.epics) {
      for (const ticket of epic.tickets)
        log(
          `Backlog | ${ticket.id} | ${ticket.size} | ${ticket.priority} | ${ticket.title}`,
        );
    }
    return;
  }

  run(['auth', 'status']);
  const repository = json(run, [
    'repo',
    'view',
    options.repo,
    '--json',
    'hasIssuesEnabled,viewerPermission',
  ]);
  requireValue(
    repository.hasIssuesEnabled,
    'Les issues doivent etre activees dans le depot cible.',
  );
  requireValue(
    ['ADMIN', 'MAINTAIN', 'WRITE'].includes(repository.viewerPermission),
    'Un acces en ecriture au depot cible est requis.',
  );
  const repositoryDetails = json(run, ['api', `repos/${options.repo}`]);
  requireValue(
    ['Organization', 'User'].includes(repositoryDetails.owner?.type),
    'Type de proprietaire du depot inconnu.',
  );
  const personal = repositoryDetails.owner.type === 'User';
  let featureType;
  if (!personal) {
    const issueTypes = json(run, [
      'api',
      `orgs/${options.repo.split('/')[0]}/issue-types`,
    ]);
    featureType = issueTypes.find(
      (type) => type.name.toLowerCase() === 'feature' && type.is_enabled,
    );
    requireValue(
      featureType,
      'Activer le type d issue Feature dans les parametres de l organisation avant de generer le backlog.',
    );
  }
  log(
    personal
      ? 'Depot personnel : le type feature sera represente par un label.'
      : `Depot d organisation : type natif ${featureType.name}.`,
  );
  const issuePages = json(run, [
    'api',
    `repos/${options.repo}/issues?state=all&per_page=100`,
    '--paginate',
    '--slurp',
  ]);
  const existingIssues = issuePages
    .flat()
    .filter((issue) => !issue.pull_request);
  const issueUrls = new Map();
  const issuesById = new Map();
  for (const ticket of allTickets) {
    const matches = existingIssues.filter((issue) =>
      issue.body?.includes(marker(ticket.id)),
    );
    requireValue(
      matches.length <= 1,
      `Plusieurs issues correspondent a ${ticket.id} : resoudre le doublon avant de continuer.`,
    );
    if (matches[0]) {
      issueUrls.set(ticket.id, matches[0].html_url);
      issuesById.set(ticket.id, matches[0]);
    }
  }

  const projectArgs = ['--owner', options.owner, '--format', 'json'];
  const isNew = !options['project-number'];
  const project = isNew
    ? json(run, [
        'project',
        'create',
        ...projectArgs,
        '--title',
        `${config.project.title} - ${options.repo.split('/')[1]}`,
      ])
    : json(run, ['project', 'view', options['project-number'], ...projectArgs]);
  requireValue(
    project.id && project.number && project.url,
    'Reponse de projet incomplete.',
  );
  requireValue(!project.closed, 'Le projet cible est ferme.');
  log(`Projet : ${project.url}`);
  log(
    `Reprise : npm run backlog:instantiate -- --repo ${options.repo} --owner ${options.owner} --project-number ${project.number} --apply`,
  );
  const number = String(project.number);
  ensureBacklogView(run, project.id, config.project.viewName, log);
  let fields = json(run, [
    'project',
    'field-list',
    number,
    ...projectArgs,
    '--limit',
    '100',
  ]).fields;
  const status = fields.find((field) => field.name === 'Status');
  requireValue(
    status?.options,
    'Le projet doit posseder le champ natif Status.',
  );
  if (isNew) {
    graphql(
      run,
      `
        mutation (
          $id: ID!
          $options: [ProjectV2SingleSelectFieldOptionInput!]!
        ) {
          updateProjectV2Field(
            input: { fieldId: $id, singleSelectOptions: $options }
          ) {
            projectV2Field {
              ... on ProjectV2SingleSelectField {
                id
              }
            }
          }
        }
      `,
      {
        id: status.id,
        options: config.project.stages.map((name, index) => ({
          name,
          description: '',
          color: ['GRAY', 'BLUE', 'YELLOW', 'ORANGE', 'GREEN'][index % 5],
        })),
      },
    );
    fields = json(run, [
      'project',
      'field-list',
      number,
      ...projectArgs,
      '--limit',
      '100',
    ]).fields;
  }
  requireValue(
    fields
      .find((field) => field.name === 'Status')
      ?.options?.some((option) => option.name === 'Backlog'),
    'Ajouter manuellement l option Backlog au champ Status du projet existant, puis relancer.',
  );
  const specifications = [
    { name: 'Size', values: config.sizes.map((size) => size.name) },
    { name: 'Weight' },
    { name: 'Epic', values: config.epics.map((epic) => epic.id) },
    { name: 'Priority', values: ['P1', 'P2', 'P3'] },
  ];
  for (const specification of specifications) {
    const field = fields.find(
      (candidate) => candidate.name === specification.name,
    );
    if (!field) {
      const args = [
        'project',
        'field-create',
        number,
        ...projectArgs,
        '--name',
        specification.name,
        '--data-type',
        specification.values ? 'SINGLE_SELECT' : 'NUMBER',
      ];
      if (specification.values)
        args.push('--single-select-options', specification.values.join(','));
      run(args);
    } else if (specification.values) {
      extendSelectField(run, field, specification.values, log);
    } else {
      const data = graphql(
        run,
        `
          query ($id: ID!) {
            node(id: $id) {
              ... on ProjectV2Field {
                dataType
              }
            }
          }
        `,
        { id: field.id },
      );
      requireValue(
        data.node?.dataType === 'NUMBER',
        'Le champ Weight doit etre de type NUMBER.',
      );
    }
  }
  fields = json(run, [
    'project',
    'field-list',
    number,
    ...projectArgs,
    '--limit',
    '100',
  ]).fields;
  run([
    'project',
    'link',
    number,
    '--owner',
    options.owner,
    '--repo',
    options.repo,
  ]);
  const items = readProjectItems(run, project.id);
  if (personal) {
    const labels = json(run, [
      'api',
      `repos/${options.repo}/labels?per_page=100`,
      '--paginate',
      '--slurp',
    ]).flat();
    if (!labels.some((label) => label.name.toLowerCase() === 'feature')) {
      run(
        [
          'api',
          `repos/${options.repo}/labels`,
          '--method',
          'POST',
          '--input',
          '-',
        ],
        JSON.stringify({
          name: 'feature',
          color: 'a2eeef',
          description: 'Nouvelle fonctionnalite du backlog pedagogique',
        }),
      );
    }
  }

  const ordered = [];
  const queued = new Set();
  function enqueue(ticket) {
    if (queued.has(ticket.id)) return;
    for (const dependency of ticket.dependsOn)
      enqueue(allTickets.find((candidate) => candidate.id === dependency));
    queued.add(ticket.id);
    ordered.push(ticket);
  }
  for (const ticket of allTickets) enqueue(ticket);

  for (const ticket of ordered) {
    const epic = config.epics.find((candidate) =>
      candidate.tickets.includes(ticket),
    );
    if (!issueUrls.has(ticket.id)) {
      const issue = JSON.parse(
        run(
          [
            'api',
            `repos/${options.repo}/issues`,
            '--method',
            'POST',
            '--input',
            '-',
          ],
          JSON.stringify({
            title: `[${ticket.id}] ${ticket.title}`,
            body: issueBody(epic, ticket, config, issueUrls),
            ...(personal
              ? { labels: [ticket.type] }
              : { type: featureType.name }),
          }),
        ),
      );
      requireValue(issue.html_url, `Creation de ${ticket.id} sans URL.`);
      issueUrls.set(ticket.id, issue.html_url);
      log(`Issue creee : ${issue.html_url}`);
    }
    const existing = issuesById.get(ticket.id);
    if (
      existing &&
      (personal
        ? !existing.labels?.some(
            (label) => label.name.toLowerCase() === ticket.type,
          )
        : existing.type?.name !== featureType.name)
    ) {
      requireValue(
        Number.isInteger(existing.number) && existing.number > 0,
        `Numero d issue manquant pour ${ticket.id}.`,
      );
      run(
        [
          'api',
          `repos/${options.repo}/issues/${existing.number}${personal ? '/labels' : ''}`,
          '--method',
          personal ? 'POST' : 'PATCH',
          '--input',
          '-',
        ],
        JSON.stringify(
          personal ? { labels: [ticket.type] } : { type: featureType.name },
        ),
      );
      log(
        `${personal ? 'Label feature ajoute' : `Type ${featureType.name} defini`} : ${existing.html_url}`,
      );
    }
    const url = issueUrls.get(ticket.id);
    const existingItem = items.get(url);
    const item =
      existingItem ??
      json(run, ['project', 'item-add', number, ...projectArgs, '--url', url]);
    requireValue(item.id, `Ajout au projet de ${ticket.id} sans identifiant.`);
    const populated = new Set(
      existingItem?.fieldValues.nodes
        .filter((value) => value.field?.name)
        .map((value) => value.field.name),
    );
    const values = {
      Status: 'Backlog',
      Size: ticket.size,
      Weight: config.sizes.find((size) => size.name === ticket.size).weight,
      Epic: epic.id,
      Priority: ticket.priority,
    };
    for (const name of ['Status', ...fieldNames]) {
      if (populated.has(name)) continue;
      const field = fields.find((candidate) => candidate.name === name);
      requireValue(field, `Champ ${name} absent.`);
      const args = [
        'project',
        'item-edit',
        '--id',
        item.id,
        '--project-id',
        project.id,
        '--field-id',
        field.id,
      ];
      if (name === 'Weight') {
        args.push('--number', String(values[name]));
      } else {
        const option = field.options?.find(
          (candidate) => candidate.name === values[name],
        );
        requireValue(option, `Option ${values[name]} absente de ${name}.`);
        args.push('--single-select-option-id', option.id);
      }
      run(args);
    }
  }
  let updated = 0;
  if (options['update-existing']) {
    for (const epic of config.epics) {
      for (const ticket of epic.tickets) {
        const existing = issuesById.get(ticket.id);
        if (!existing) continue;
        const title = `[${ticket.id}] ${ticket.title}`;
        const body = issueBody(epic, ticket, config, issueUrls);
        if (existing.title === title && existing.body === body) continue;
        requireValue(
          Number.isInteger(existing.number) && existing.number > 0,
          `Numero d issue manquant pour ${ticket.id}.`,
        );
        run(
          [
            'api',
            `repos/${options.repo}/issues/${existing.number}`,
            '--method',
            'PATCH',
            '--input',
            '-',
          ],
          JSON.stringify({ title, body }),
        );
        updated++;
        log(`Contenu mis a jour : ${existing.html_url}`);
      }
    }
  }
  log(
    `${allTickets.length} tickets presents dans le projet. ${updated} contenu(s) mis a jour. Les champs deja renseignes sont conserves.`,
  );
}

export function main(args = process.argv.slice(2)) {
  const options = parseOptions(args);
  if (options.help) {
    console.log(
      'Usage : npm run backlog:instantiate -- --repo OWNER/REPO --owner LOGIN [--config FILE] [--project-number N] [--update-existing] [--dry-run | --apply]\nSans --apply : simulation locale, sans requete GitHub.\n--update-existing : remplace les titres et descriptions, y compris les modifications manuelles ; conserve les champs et commentaires.',
    );
    return;
  }
  const config = JSON.parse(
    readFileSync(
      options.config ? resolve(options.config) : defaultConfig,
      'utf8',
    ),
  );
  instantiate(config, options);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
