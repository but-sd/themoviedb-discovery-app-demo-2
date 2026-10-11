import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  instantiate,
  issueBody,
  marker,
  parseOptions,
  validateBacklog,
} from '../instantiate-backlog.mjs';

const config = JSON.parse(
  readFileSync(
    new URL('../../.github/backlog/backlog.json', import.meta.url),
    'utf8',
  ),
);

test('backlog accepts a growing set of ideas with unique tickets', () => {
  validateBacklog(config);
  const tickets = config.epics.flatMap((epic) => epic.tickets);
  assert.equal(
    new Set(tickets.map((ticket) => ticket.id)).size,
    tickets.length,
  );
});

test('invalid sizing, priorities, stories and criteria are rejected', () => {
  for (const [key, value] of [
    ['size', 'XXL'],
    ['priority', 'P0'],
    ['story', ''],
    ['acceptance', []],
  ]) {
    const invalid = structuredClone(config);
    invalid.epics[0].tickets[0][key] = value;
    assert.throws(() => validateBacklog(invalid));
  }
  const invalid = structuredClone(config);
  invalid.sizes[1].weight = invalid.sizes[0].weight;
  assert.throws(() => validateBacklog(invalid), /poids/);
});

test('unknown dependencies, duplicated identifiers and cycles are rejected', () => {
  const unknown = structuredClone(config);
  unknown.epics[0].tickets[0].dependsOn = ['MISSING-01'];
  assert.throws(() => validateBacklog(unknown), /inconnue/);
  const cycle = structuredClone(config);
  cycle.epics[0].tickets[0].dependsOn = ['EXP-02'];
  assert.throws(() => validateBacklog(cycle), /Cycle/);
  const duplicate = structuredClone(config);
  duplicate.epics[0].tickets.push(duplicate.epics[0].tickets[0]);
  assert.throws(() => validateBacklog(duplicate), /duplique/);
});

test('target is explicit and writes require --apply', () => {
  const options = parseOptions([
    '--repo',
    'student/movies',
    '--owner',
    'student',
  ]);
  assert.equal(options.apply, false);
  assert.throws(() => parseOptions([]), /--repo/);
  assert.throws(
    () =>
      parseOptions([
        '--repo',
        'student/movies',
        '--owner',
        'student',
        '--project-number',
        '0',
      ]),
    /entier/,
  );
  assert.throws(() => parseOptions(['--apply', '--dry-run']), /combiner/);
});

test('simulation performs no GitHub calls and displays every ticket in Backlog', () => {
  const output = [];
  instantiate(
    config,
    { repo: 'student/movies', owner: 'student', apply: false },
    () => assert.fail('Unexpected GitHub call'),
    (line) => output.push(line),
  );
  assert.equal(
    output.filter((line) => line.startsWith('Backlog |')).length,
    config.epics.reduce((total, epic) => total + epic.tickets.length, 0),
  );
});

test('issue body includes story, size, weight, criteria, dependency URLs and Done', () => {
  const epic = config.epics[0];
  const ticket = epic.tickets[0];
  const body = issueBody(
    epic,
    ticket,
    config,
    new Map([['REL-01', 'https://github.com/student/movies/issues/1']]),
  );
  for (const text of [
    marker(ticket.id),
    ticket.story,
    '**Taille : S**',
    '**Poids relatif : 2**',
    '- [ ]',
    'https://github.com/student/movies/issues/1',
    'Definition of Done',
    'ni des heures ni une note',
  ]) {
    assert.ok(body.includes(text), text);
  }
});

function fixture({
  existing = false,
  missingSize = false,
  failEdit = false,
} = {}) {
  const small = structuredClone(config);
  small.epics = [small.epics[5]];
  small.epics[0].tickets = [small.epics[0].tickets[0]];
  const ticket = small.epics[0].tickets[0];
  const url = 'https://github.com/student/movies/issues/1';
  const fields = [
    { id: 'title', name: 'Title' },
    {
      id: 'status',
      name: 'Status',
      options: [{ id: 'backlog', name: 'Backlog' }],
    },
    {
      id: 'size',
      name: 'Size',
      options: small.sizes.map((size) => ({ id: size.name, name: size.name })),
    },
    { id: 'weight', name: 'Weight' },
    { id: 'epic', name: 'Epic', options: [{ id: 'WATCH', name: 'WATCH' }] },
    {
      id: 'priority',
      name: 'Priority',
      options: ['P1', 'P2', 'P3'].map((name) => ({ id: name, name })),
    },
  ];
  const calls = [];
  function run(args, input) {
    calls.push({ args, input });
    const command = args.slice(0, 2).join(' ');
    if (command === 'auth status' || command === 'project link') return '';
    if (command === 'repo view')
      return JSON.stringify({
        hasIssuesEnabled: true,
        viewerPermission: 'WRITE',
      });
    if (args[0] === 'api' && args[1].includes('/issues?')) {
      return JSON.stringify([
        existing
          ? [
              {
                number: 1,
                type: { name: 'Feature' },
                body: marker(ticket.id),
                html_url: url,
              },
            ]
          : [],
      ]);
    }
    if (command === 'project create' || command === 'project view')
      return JSON.stringify({
        id: 'project',
        number: 7,
        url: 'https://github.com/users/student/projects/7',
      });
    if (args[0] === 'api' && args[1] === 'repos/student/movies')
      return JSON.stringify({ owner: { type: 'Organization' } });
    if (args[0] === 'api' && args[1] === 'orgs/student/issue-types')
      return JSON.stringify([{ name: 'Feature', is_enabled: true }]);
    if (command === 'project field-list') return JSON.stringify({ fields });
    if (command === 'api graphql') {
      const payload = JSON.parse(input);
      if (
        payload.variables.id === 'size' &&
        /options\s*\{\s*id\s+name\s+color\s+description\s*\}/.test(
          payload.query,
        )
      )
        return JSON.stringify({
          data: {
            node: {
              options: small.sizes.map((size) => ({
                id: size.name,
                name: size.name,
                color: size.color,
                description: '',
              })),
            },
          },
        });
      if (payload.query.includes('visibleFields(first: 100)'))
        return JSON.stringify({
          data: {
            node: {
              views: {
                nodes: [
                  {
                    id: 'view',
                    name: 'Backlog',
                    configuration: {
                      visibleFields: {
                        nodes: [
                          { id: 'title' },
                          { id: 'epic' },
                          { id: 'size' },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        });
      if (payload.query.includes('views(first: 100'))
        return JSON.stringify({
          data: {
            node: {
              views: {
                nodes: [{ id: 'view', name: 'Backlog', number: 1 }],
                pageInfo: { hasNextPage: false },
              },
            },
          },
        });
      if (payload.query.includes('updateProjectV2Field'))
        return JSON.stringify({ data: { updateProjectV2Field: {} } });
      if (payload.query.includes('dataType'))
        return JSON.stringify({ data: { node: { dataType: 'NUMBER' } } });
      const nodes = existing
        ? [
            {
              id: 'item',
              content: { url },
              fieldValues: {
                nodes: fields
                  .filter((field) => !(missingSize && field.name === 'Size'))
                  .map((field) => ({
                    field: { name: field.name },
                    name: 'student-edited',
                    number: 5,
                  })),
              },
            },
          ]
        : [];
      return JSON.stringify({
        data: { node: { items: { nodes, pageInfo: { hasNextPage: false } } } },
      });
    }
    if (args[0] === 'api' && args[1].endsWith('/issues'))
      return JSON.stringify({ html_url: url });
    if (command === 'project item-add') return JSON.stringify({ id: 'item' });
    if (command === 'project item-edit') {
      if (failEdit) throw new Error('Permission refusee');
      return '';
    }
    assert.fail(`Unhandled command: ${args.join(' ')}`);
  }
  return {
    small,
    calls,
    run,
    options: {
      repo: 'student/movies',
      owner: 'student',
      apply: true,
      ...(existing ? { 'project-number': '7' } : {}),
    },
  };
}

test('apply creates issues and assigns Backlog, size, weight, epic and priority', () => {
  const { small, calls, run, options } = fixture();
  instantiate(small, options, run, () => {});
  assert.equal(calls.filter(({ args }) => args.includes('POST')).length, 1);
  const creation = calls.find(({ args }) => args.includes('POST'));
  assert.equal(JSON.parse(creation.input).type, 'Feature');
  assert.ok(!Object.hasOwn(JSON.parse(creation.input), 'labels'));
  const edits = calls.filter(({ args }) => args[1] === 'item-edit');
  assert.equal(edits.length, 5);
  assert.ok(edits.some(({ args }) => args.includes('backlog')));
  assert.ok(
    edits.some(({ args }) => args.includes('--number') && args.includes('2')),
  );
  assert.ok(calls.some(({ input }) => input?.includes('updateProjectV2Field')));
});

test('resume preserves existing issues, estimates and workflow status', () => {
  const { small, calls, run, options } = fixture({ existing: true });
  instantiate(small, options, run, () => {});
  assert.equal(
    calls.filter(
      ({ args }) =>
        args.includes('POST') ||
        args[1] === 'item-edit' ||
        args[1] === 'item-add' ||
        args[1] === 'create',
    ).length,
    0,
  );
  assert.ok(
    !calls.some(({ input }) => input?.includes('updateProjectV2Field')),
  );
});

test('resume repairs missing fields after a partial run without resetting other values', () => {
  const { small, calls, run, options } = fixture({
    existing: true,
    missingSize: true,
  });
  instantiate(small, options, run, () => {});
  const edits = calls.filter(({ args }) => args[1] === 'item-edit');
  assert.equal(edits.length, 1);
  assert.ok(edits[0].args.includes('size'));
});

test('GitHub errors stop the import instead of reporting success', () => {
  const { small, run, options } = fixture({ failEdit: true });
  assert.throws(
    () => instantiate(small, options, run, () => {}),
    /Permission refusee/,
  );
});

test('new project receives all custom fields with their expected types', () => {
  const { small, run, options } = fixture();
  const created = new Map();
  function withoutCustomFields(args, input) {
    if (args[1] === 'field-create') {
      created.set(
        args[args.indexOf('--name') + 1],
        args[args.indexOf('--data-type') + 1],
      );
      return '';
    }
    const result = run(args, input);
    if (args[1] === 'field-list') {
      const data = JSON.parse(result);
      data.fields = data.fields.filter(
        (field) =>
          ['Title', 'Status'].includes(field.name) || created.has(field.name),
      );
      return JSON.stringify(data);
    }
    return result;
  }
  instantiate(small, options, withoutCustomFields, () => {});
  assert.deepEqual(
    [...created],
    [
      ['Size', 'SINGLE_SELECT'],
      ['Weight', 'NUMBER'],
      ['Epic', 'SINGLE_SELECT'],
      ['Priority', 'SINGLE_SELECT'],
    ],
  );
});

test('resume searches all issue pages and all project item pages', () => {
  const { small, calls, run, options } = fixture({ existing: true });
  let itemPages = 0;
  function paginated(args, input) {
    const result = run(args, input);
    if (args[0] === 'api' && args[1].includes('/issues?'))
      return JSON.stringify([[], ...JSON.parse(result)]);
    if (args[1] === 'graphql') {
      const payload = JSON.parse(input);
      if (payload.query.includes('items(first: 100')) {
        itemPages++;
        if (payload.variables.cursor === null) {
          return JSON.stringify({
            data: {
              node: {
                items: {
                  nodes: [],
                  pageInfo: { hasNextPage: true, endCursor: 'next' },
                },
              },
            },
          });
        }
        assert.equal(payload.variables.cursor, 'next');
      }
    }
    return result;
  }
  instantiate(small, options, paginated, () => {});
  assert.equal(itemPages, 2);
  assert.ok(
    !calls.some(
      ({ args }) =>
        args.includes('POST') ||
        args[1] === 'item-add' ||
        args[1] === 'item-edit',
    ),
  );
});

test('dependencies are created first and linked even when configuration order differs', () => {
  const { small, calls, run, options } = fixture();
  small.epics[0].tickets.unshift(structuredClone(config.epics[5].tickets[1]));
  let issueNumber = 0;
  function numbered(args, input) {
    const result = run(args, input);
    if (args.includes('POST'))
      return JSON.stringify({
        html_url: `https://github.com/student/movies/issues/${++issueNumber}`,
      });
    return result;
  }
  instantiate(small, options, numbered, () => {});
  const issues = calls
    .filter(({ args }) => args.includes('POST'))
    .map(({ input }) => JSON.parse(input));
  assert.ok(issues[0].title.startsWith('[WATCH-01]'));
  assert.ok(issues[1].title.startsWith('[WATCH-02]'));
  assert.ok(
    issues[1].body.includes('https://github.com/student/movies/issues/1'),
  );
});

test('duplicate issue markers stop the import before creating a project', () => {
  const { small, calls, run, options } = fixture({ existing: true });
  function duplicate(args, input) {
    const result = run(args, input);
    if (args[0] === 'api' && args[1].includes('/issues?'))
      return JSON.stringify([...JSON.parse(result), ...JSON.parse(result)]);
    return result;
  }
  assert.throws(
    () => instantiate(small, options, duplicate, () => {}),
    /Plusieurs issues/,
  );
  assert.ok(!calls.some(({ args }) => args[0] === 'project'));
});

test('incompatible existing Weight field fails explicitly before issue creation', () => {
  const { small, calls, run, options } = fixture({ existing: true });
  function incompatible(args, input) {
    const result = run(args, input);
    if (input && JSON.parse(input).query?.includes('dataType'))
      return JSON.stringify({ data: { node: { dataType: 'TEXT' } } });
    return result;
  }
  assert.throws(
    () => instantiate(small, options, incompatible, () => {}),
    /NUMBER/,
  );
  assert.ok(
    !calls.some(({ args }) => args.includes('POST') || args[1] === 'item-edit'),
  );
});

test('regeneration adds new tickets and epics once without changing existing work', () => {
  const { small, run, options } = fixture({ existing: true });
  small.epics[0].tickets.push({
    ...structuredClone(small.epics[0].tickets[0]),
    id: 'WATCH-04',
    title: 'Nouvelle fonctionnalite',
    dependsOn: ['WATCH-01'],
  });
  small.epics.push({
    id: 'NEW',
    title: 'Nouvelle idee',
    objective: 'Apprendre un nouveau concept.',
    tickets: [
      {
        ...structuredClone(small.epics[0].tickets[0]),
        id: 'NEW-01',
        title: 'Premier ticket de la nouvelle idee',
        dependsOn: ['WATCH-04'],
      },
    ],
  });
  const fields = JSON.parse(run(['project', 'field-list'])).fields;
  for (const field of fields) {
    if (field.options) {
      field.options = field.options.map((option) => ({
        ...option,
        color: 'BLUE',
        description: `Description ${option.name}`,
      }));
    }
  }
  const epic = fields.find((field) => field.name === 'Epic');
  epic.options.push({
    id: 'custom',
    name: 'CUSTOM',
    color: 'RED',
    description: 'Option de l equipe',
  });
  const originalOptions = structuredClone(epic.options);
  const existingItem = {
    id: 'original',
    content: { url: 'https://github.com/student/movies/issues/1' },
    fieldValues: {
      nodes: fields.map((field) => ({
        field: { name: field.name },
        name: 'Done',
        number: 8,
      })),
    },
  };
  const issues = [
    {
      number: 1,
      type: { name: 'Feature' },
      body: marker('WATCH-01'),
      html_url: existingItem.content.url,
    },
  ];
  const items = [existingItem];
  const mutations = [];
  const bodies = [];
  function evolving(args, input) {
    if (args[0] === 'api' && args[1].includes('/issues?'))
      return JSON.stringify([issues]);
    if (args[0] === 'api' && args.includes('POST')) {
      const issue = {
        ...JSON.parse(input),
        number: issues.length + 1,
        type: { name: JSON.parse(input).type },
        html_url: `https://github.com/student/movies/issues/${issues.length + 1}`,
      };
      issues.push(issue);
      bodies.push(issue);
      return JSON.stringify(issue);
    }
    if (args[1] === 'field-list') return JSON.stringify({ fields });
    if (args[1] === 'item-add') {
      const item = {
        id: `item-${items.length}`,
        content: { url: args[args.indexOf('--url') + 1] },
        fieldValues: { nodes: [] },
      };
      items.push(item);
      mutations.push({ type: 'add', id: item.id });
      return JSON.stringify(item);
    }
    if (args[1] === 'item-edit') {
      const item = items.find(
        (candidate) => candidate.id === args[args.indexOf('--id') + 1],
      );
      const field = fields.find(
        (candidate) => candidate.id === args[args.indexOf('--field-id') + 1],
      );
      item.fieldValues.nodes.push({ field: { name: field.name } });
      mutations.push({ type: 'edit', id: item.id });
      return '';
    }
    if (args[1] === 'graphql') {
      const { query, variables } = JSON.parse(input);
      if (variables.id === 'size') return run(args, input);
      if (/options\s*\{\s*id\s+name\s+color\s+description\s*\}/.test(query))
        return JSON.stringify({ data: { node: { options: epic.options } } });
      if (query.includes('updateProjectV2Field')) {
        assert.equal(variables.id, 'epic');
        assert.deepEqual(
          variables.options.slice(0, originalOptions.length),
          originalOptions,
        );
        epic.options = variables.options.map((option) => ({
          ...option,
          id: option.id ?? `new-${option.name}`,
        }));
        mutations.push({ type: 'options' });
        return JSON.stringify({ data: { updateProjectV2Field: {} } });
      }
      if (query.includes('items(first: 100'))
        return JSON.stringify({
          data: {
            node: { items: { nodes: items, pageInfo: { hasNextPage: false } } },
          },
        });
    }
    return run(args, input);
  }
  const originalItem = structuredClone(existingItem);
  instantiate(small, options, evolving, () => {});
  assert.equal(issues.length, 3);
  assert.equal(items.length, 3);
  assert.deepEqual(existingItem, originalItem);
  assert.ok(bodies[1].body.includes(issues[1].html_url));
  assert.ok(epic.options.some((option) => option.name === 'NEW'));
  assert.equal(
    mutations.filter((mutation) => mutation.type === 'edit').length,
    10,
  );
  const mutationCount = mutations.length;
  instantiate(small, options, evolving, () => {});
  assert.equal(issues.length, 3);
  assert.equal(items.length, 3);
  assert.equal(mutations.length, mutationCount);
  assert.deepEqual(existingItem, originalItem);
});

test('existing single-select fields with the wrong type are not replaced', () => {
  const { small, run, options } = fixture({ existing: true });
  function invalidSelect(args, input) {
    const result = run(args, input);
    if (args[1] === 'field-list') {
      const data = JSON.parse(result);
      delete data.fields.find((field) => field.name === 'Epic').options;
      return JSON.stringify(data);
    }
    return result;
  }
  assert.throws(
    () => instantiate(small, options, invalidSelect, () => {}),
    /SINGLE_SELECT/,
  );
});

test('explicit updates replace only title and body, resolve new dependencies and skip unchanged content', () => {
  const { small, run, options } = fixture({ existing: true });
  const existingTicket = small.epics[0].tickets[0];
  existingTicket.title = 'Titre revise';
  existingTicket.acceptance.push('Nouveau critere.');
  existingTicket.dependsOn = ['WATCH-04'];
  small.epics[0].tickets.push({
    ...structuredClone(existingTicket),
    id: 'WATCH-04',
    title: 'Nouvelle dependance',
    dependsOn: [],
  });
  const existing = {
    number: 1,
    title: 'Titre modifie manuellement',
    body: `${marker(existingTicket.id)}\nDescription et cases cochees`,
    html_url: 'https://github.com/student/movies/issues/1',
    state: 'closed',
    type: { name: 'Feature' },
  };
  const patches = [];
  function updating(args, input) {
    if (args[0] === 'api' && args[1].includes('/issues?'))
      return JSON.stringify([[existing]]);
    if (args.includes('PATCH')) {
      assert.equal(args[1], 'repos/student/movies/issues/1');
      const payload = JSON.parse(input);
      assert.deepEqual(Object.keys(payload).sort(), ['body', 'title']);
      Object.assign(existing, payload);
      patches.push(payload);
      return JSON.stringify(existing);
    }
    if (args.includes('POST'))
      return JSON.stringify({
        html_url: 'https://github.com/student/movies/issues/2',
      });
    if (args[1] === 'item-edit') {
      assert.notEqual(
        args[args.indexOf('--id') + 1],
        'item',
        'Existing project fields must remain intact',
      );
      return '';
    }
    if (args[1] === 'item-add') return JSON.stringify({ id: 'new-item' });
    return run(args, input);
  }
  const updateOptions = { ...options, 'update-existing': true };
  instantiate(small, updateOptions, updating, () => {});
  assert.equal(patches.length, 1);
  assert.equal(existing.title, '[WATCH-01] Titre revise');
  assert.ok(existing.body.includes('Nouveau critere.'));
  assert.ok(
    existing.body.includes('https://github.com/student/movies/issues/2'),
  );
  assert.equal(existing.state, 'closed');
  instantiate(small, updateOptions, updating, () => {});
  assert.equal(
    patches.length,
    1,
    'Identical contents must not be patched again',
  );
});

test('update simulation makes no GitHub calls and warns about manual edits', () => {
  const output = [];
  const options = parseOptions([
    '--repo',
    'student/movies',
    '--owner',
    'student',
    '--update-existing',
    '--dry-run',
  ]);
  instantiate(
    config,
    options,
    () => assert.fail('Unexpected GitHub call'),
    (line) => output.push(line),
  );
  assert.ok(output.some((line) => line.includes('modifications manuelles')));
});

test('update errors are surfaced without a success summary', () => {
  const { small, run, options } = fixture({ existing: true });
  const output = [];
  function denied(args, input) {
    if (args[0] === 'api' && args[1].includes('/issues?')) {
      return JSON.stringify([
        [
          {
            number: 1,
            type: { name: 'Feature' },
            body: marker('WATCH-01'),
            html_url: 'https://github.com/student/movies/issues/1',
          },
        ],
      ]);
    }
    if (args.includes('PATCH')) throw new Error('Modification refusee');
    return run(args, input);
  }
  assert.throws(
    () =>
      instantiate(
        small,
        { ...options, 'update-existing': true },
        denied,
        (line) => output.push(line),
      ),
    /Modification refusee/,
  );
  assert.ok(!output.some((line) => line.includes('tickets presents')));
});

test('every configured ticket has the feature type and invalid types are rejected', () => {
  assert.ok(
    config.epics
      .flatMap((epic) => epic.tickets)
      .every((ticket) => ticket.type === 'feature'),
  );
  const invalid = structuredClone(config);
  invalid.epics[0].tickets[0].type = 'bug';
  assert.throws(() => validateBacklog(invalid), /type attendu feature/);
});

test('rerun assigns native Feature to existing tickets without replacing other properties', () => {
  const { small, run, options } = fixture({ existing: true });
  const patches = [];
  function withoutType(args, input) {
    const result = args.includes('PATCH') ? '{}' : run(args, input);
    if (args[0] === 'api' && args[1].includes('/issues?')) {
      const pages = JSON.parse(result);
      delete pages[0][0].type;
      return JSON.stringify(pages);
    }
    if (args.includes('PATCH')) {
      assert.equal(args[1], 'repos/student/movies/issues/1');
      patches.push(JSON.parse(input));
    }
    return result;
  }
  instantiate(small, options, withoutType, () => {});
  assert.deepEqual(patches, [{ type: 'Feature' }]);
});

test('unknown owners and disabled organization types fail before creating anything', () => {
  for (const scenario of ['unknown', 'disabled']) {
    const { small, calls, run, options } = fixture();
    function unsupported(args, input) {
      const result = run(args, input);
      if (scenario === 'unknown' && args[1] === 'repos/student/movies')
        return JSON.stringify({ owner: { type: 'Unknown' } });
      if (scenario === 'disabled' && args[1] === 'orgs/student/issue-types')
        return JSON.stringify([{ name: 'Feature', is_enabled: false }]);
      return result;
    }
    assert.throws(
      () => instantiate(small, options, unsupported, () => {}),
      scenario === 'unknown' ? /inconnu/ : /Activer/,
    );
    assert.ok(
      !calls.some(
        ({ args }) =>
          args[0] === 'project' ||
          args.includes('POST') ||
          args.includes('PATCH'),
      ),
    );
  }
});

test('personal repositories use labels for creation and additive reruns, never native types', () => {
  for (const existing of [false, true]) {
    const { small, run, options } = fixture({ existing });
    const labels = [];
    const writes = [];
    const current = {
      number: 1,
      body: marker('WATCH-01'),
      html_url: 'https://github.com/student/movies/issues/1',
      labels: [{ name: 'student-label' }],
    };
    function personal(args, input) {
      if (args[1] === 'repos/student/movies' && !input)
        return JSON.stringify({ owner: { type: 'User' } });
      if (args[1] === 'orgs/student/issue-types')
        assert.fail('Personal repositories must not query organization types');
      if (args[1].includes('/labels?')) return JSON.stringify([[], labels]);
      if (args[0] === 'api' && args.includes('POST')) {
        const payload = JSON.parse(input);
        assert.ok(!Object.hasOwn(payload, 'type'));
        writes.push({ endpoint: args[1], payload });
        if (args[1] === 'repos/student/movies/labels') {
          labels.push({ name: payload.name });
          return '{}';
        }
        if (args[1].endsWith('/1/labels')) {
          current.labels.push({ name: 'feature' });
          return '{}';
        }
        return JSON.stringify({ html_url: current.html_url });
      }
      if (existing && args[1].includes('/issues?'))
        return JSON.stringify([[current]]);
      return run(args, input);
    }
    instantiate(small, options, personal, () => {});
    assert.equal(writes.length, 2);
    assert.equal(labels[0].name, 'feature');
    assert.deepEqual(writes[1].payload.labels, ['feature']);
    if (existing) {
      assert.equal(writes[1].endpoint, 'repos/student/movies/issues/1/labels');
      assert.ok(current.labels.some((label) => label.name === 'student-label'));
      instantiate(small, options, personal, () => {});
      assert.equal(
        writes.length,
        2,
        'Reruns must not recreate labels or relabel existing issues',
      );
    }
  }
});

test('existing feature labels are preserved regardless of case', () => {
  const { small, run, options } = fixture({ existing: true });
  function labeled(args, input) {
    if (args[1] === 'repos/student/movies')
      return JSON.stringify({ owner: { type: 'User' } });
    if (args[1].includes('/labels?'))
      return JSON.stringify([[{ name: 'Feature' }]]);
    if (args[1].includes('/issues?'))
      return JSON.stringify([
        [
          {
            number: 1,
            body: marker('WATCH-01'),
            html_url: 'https://github.com/student/movies/issues/1',
            labels: [{ name: 'Feature' }],
          },
        ],
      ]);
    assert.ok(!args.includes('POST') && !args.includes('PATCH'));
    return run(args, input);
  }
  instantiate(small, options, labeled, () => {});
});

test('default view is renamed to configured Backlog once, without altering its layout', () => {
  const { small, run, options } = fixture({ existing: true });
  const view = { id: 'view', name: 'View 1', number: 1 };
  const updates = [];
  function withDefaultView(args, input) {
    if (args[1] === 'graphql') {
      const { query, variables } = JSON.parse(input);
      if (query.includes('visibleFields(first: 100)')) return run(args, input);
      if (query.includes('views(first: 100'))
        return JSON.stringify({
          data: {
            node: {
              views: { nodes: [view], pageInfo: { hasNextPage: false } },
            },
          },
        });
      if (query.includes('updateProjectV2View')) {
        assert.deepEqual(variables, { id: 'view', name: 'Backlog' });
        assert.ok(!query.includes('layout:'));
        view.name = variables.name;
        updates.push(variables);
        return JSON.stringify({
          data: { updateProjectV2View: { projectV2View: view } },
        });
      }
    }
    return run(args, input);
  }
  instantiate(small, options, withDefaultView, () => {});
  instantiate(small, options, withDefaultView, () => {});
  assert.equal(updates.length, 1);
});

test('custom views are preserved and a missing Backlog view is created', () => {
  const { small, run, options } = fixture({ existing: true });
  const views = [{ id: 'custom', name: 'Sprint actuel', number: 1 }];
  const original = structuredClone(views[0]);
  let creations = 0;
  function withCustomView(args, input) {
    if (args[1] === 'graphql') {
      const { query, variables } = JSON.parse(input);
      if (query.includes('visibleFields(first: 100)')) return run(args, input);
      if (query.includes('views(first: 100'))
        return JSON.stringify({
          data: {
            node: { views: { nodes: views, pageInfo: { hasNextPage: false } } },
          },
        });

      assert.ok(!query.includes('updateProjectV2View'));
      if (query.includes('createProjectV2View')) {
        assert.equal(variables.name, 'Backlog');
        assert.ok(query.includes('TABLE_LAYOUT'));
        const view = { id: 'new-view', name: variables.name, number: 2 };
        views.push(view);
        creations++;
        return JSON.stringify({
          data: { createProjectV2View: { projectV2View: view } },
        });
      }
    }
    return run(args, input);
  }
  instantiate(small, options, withCustomView, () => {});
  instantiate(small, options, withCustomView, () => {});
  assert.deepEqual(views[0], original);
  assert.equal(creations, 1);
});

test('Epic and Size follow Title while other columns keep their relative order', () => {
  const { small, run, options } = fixture({ existing: true });
  const columns = [{ id: 'title' }, { id: 'status' }, { id: 'custom-column' }];
  let updates = 0;
  function visible(args, input) {
    if (args[1] === 'graphql') {
      const { query, variables } = JSON.parse(input);
      if (query.includes('visibleFields(first: 100)'))
        return JSON.stringify({
          data: {
            node: {
              views: {
                nodes: [
                  {
                    id: 'view',
                    name: 'Backlog',
                    configuration: { visibleFields: { nodes: columns } },
                  },
                ],
              },
            },
          },
        });

      if (query.includes('visibleFieldIds:')) {
        assert.deepEqual(variables.fields, [
          'title',
          'epic',
          'size',
          'status',
          'custom-column',
        ]);
        columns.splice(
          0,
          columns.length,
          ...variables.fields.map((id) => ({ id })),
        );
        updates++;
        return JSON.stringify({
          data: { updateProjectV2View: { projectV2View: { id: 'view' } } },
        });
      }
    }
    return run(args, input);
  }
  instantiate(small, options, visible, () => {});
  instantiate(small, options, visible, () => {});
  assert.equal(updates, 1);
});

test('Size palette preserves option IDs, descriptions and custom options and applies only once', () => {
  const { small, run, options } = fixture({ existing: true });
  let sizeOptions = [
    ...small.sizes.map((size) => ({
      id: `id-${size.name}`,
      name: size.name,
      color: 'GRAY',
      description: `Details ${size.name}`,
    })),
    {
      id: 'custom',
      name: 'Unestimated',
      color: 'PURPLE',
      description: 'Equipe',
    },
  ];
  const original = structuredClone(sizeOptions);
  let changes = 0;
  function colors(args, input) {
    if (args[1] === 'graphql') {
      const { query, variables } = JSON.parse(input);
      if (variables.id === 'size') {
        if (query.includes('updateProjectV2Field')) {
          sizeOptions = variables.options;
          changes++;
          return JSON.stringify({ data: { updateProjectV2Field: {} } });
        }
        return JSON.stringify({ data: { node: { options: sizeOptions } } });
      }
    }
    return run(args, input);
  }
  instantiate(small, options, colors, () => {});
  instantiate(small, options, colors, () => {});
  assert.equal(changes, 1);
  for (const size of small.sizes)
    assert.equal(
      sizeOptions.find((option) => option.name === size.name).color,
      size.color,
    );
  assert.deepEqual(
    sizeOptions.map(({ id, name, description }) => ({ id, name, description })),
    original.map(({ id, name, description }) => ({ id, name, description })),
  );
  assert.deepEqual(sizeOptions.at(-1), original.at(-1));
});
