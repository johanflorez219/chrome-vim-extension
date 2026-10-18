// Commit format (see CONTRIBUTING.md):
//
//   <Type>: <subject>
//
//   Why: <motivation and context>
//
//   What: - <change 1>
//   - <change 2>

const TYPES = [
  'Add',
  'Change',
  'Fix',
  'Refactor',
  'Remove',
  'Test',
  'Docs',
  'Style',
  'Perf',
  'Build',
  'CI',
  'Chore',
];

const AI_ATTRIBUTION = /co-authored-by:.*(claude|copilot|gpt|anthropic|openai)|generated with/i;

const hasSection = (raw, name) => new RegExp(`^${name}:\\s*\\S`, 'm').test(raw ?? '');

export default {
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\w+)(?:\[([\w-]+)\])?: (.+)$/,
      headerCorrespondence: ['type', 'scope', 'subject'],
    },
  },
  plugins: [
    {
      rules: {
        'body-has-why': ({ raw }) => [hasSection(raw, 'Why'), 'body must have a "Why: ..." line'],
        'body-has-what': ({ raw }) => [
          hasSection(raw, 'What'),
          'body must have a "What: - ..." line',
        ],
        'subject-imperative': ({ subject }) => [
          !/^\w+ed\b/i.test(subject ?? ''),
          'subject must use the imperative mood ("add", not "added")',
        ],
        'no-ai-attribution': ({ raw }) => [
          !AI_ATTRIBUTION.test(raw ?? ''),
          'commit must not include AI attribution lines',
        ],
      },
    },
  ],
  rules: {
    'header-min-length': [2, 'always', 20],
    'header-max-length': [2, 'always', 80],
    'type-empty': [2, 'never'],
    'type-enum': [2, 'always', TYPES],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 80],
    'footer-max-line-length': [2, 'always', 80],
    'body-has-why': [2, 'always'],
    'body-has-what': [2, 'always'],
    'subject-imperative': [2, 'always'],
    'no-ai-attribution': [2, 'always'],
  },
};
