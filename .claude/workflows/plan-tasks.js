export const meta = {
  name: 'plan-tasks',
  description:
    'Fan-out planning for any spec: read-only planners draft and deepen every task in parallel, one integrator writes tasks.md, repeat until READY',
  whenToUse:
    'Right after a spec (requirements.md + design.md) is approved, or to re-plan an existing tasks.md. Pass the spec folder as args.',
  phases: [
    { title: 'Draft', detail: 'one read-only planner drafts the plan' },
    { title: 'Deepen', detail: 'one read-only planner + one scope critic per task' },
    { title: 'Integrate', detail: 'the only writer: merges everything into tasks.md' },
  ],
};

// Usage:  /plan-tasks docs/specs/2026-10-21-normal-mode-scrolling
//   or    args = { spec: 'docs/specs/<folder>', date: 'YYYY-MM-DD', maxReviews: 5, answers: ['...'] }
// `answers` are decisions the user already made (from an earlier run's questions);
// every planner treats them as agreed and the integrator records them in Agreements.
// `date` stamps the status log (scripts cannot read the clock). Without it the
// integrator uses `date +%F` through Bash.
//
// Control flow lives here; judgment lives in the agents:
//   Draft -> [ Deepen (fan-out, pipeline) -> Integrate (barrier, only writer) ]* -> report
//
// Single-writer rule: every agent is the same `planner` (.claude/agents/planner.md).
// Fan-out runs are told they are read-only (see "Read-only runs" in planner.md)
// and return their work as structured output; only the integrate step writes
// tasks.md. A subagent's tool list cannot differ per call, and allowlists on
// agentType are reported not to be honoured inside workflows anyway, so the rule
// is checked: a guard agent fingerprints the working tree before and after each
// fan-out, and the run stops if anything changed.
//
// Nothing here talks to the user: questions are collected, answered provisionally
// with the planner's recommendation, and returned at the end for the main session.

const input = typeof args === 'string' ? { spec: args } : (args ?? {});
const SPEC = (input.spec ?? '').replace(/\/+$/, '');
const MAX_REVIEWS = input.maxReviews ?? 5; // per task, same cap as the plan skill
const TODAY = input.date ? `Today is ${input.date}.` : "Get today's date with `date +%F`.";
const MAX_ROUNDS = MAX_REVIEWS + 2; // splits can add tasks; this is the loop guard

if (!SPEC) {
  throw new Error('plan-tasks needs the spec folder: /plan-tasks docs/specs/YYYY-MM-DD-<topic>');
}

const ANSWERS = Array.isArray(input.answers) ? input.answers : [];
const COMMON = `Spec folder: ${SPEC}. ${TODAY} You cannot talk to the user: put anything only they can decide in your questions, each with your recommended answer.${
  ANSWERS.length
    ? `\n\nThe user already decided these (treat them as agreed; do not ask them again):\n${ANSWERS.map((a) => `- ${a}`).join('\n')}`
    : ''
}`;
const READ_ONLY =
  'You are read-only: do not create, edit or delete any file. Return everything in the structured output.';

const DRAFT = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['READY', 'ITERATE', 'BLOCKED'] },
    tasksExists: { type: 'boolean' },
    tasksMd: { type: 'string' },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          done: { type: 'boolean' },
        },
        required: ['id', 'title', 'done'],
      },
    },
    questions: { type: 'array', items: { type: 'string' } },
    specIssues: { type: 'array', items: { type: 'string' } },
  },
  required: ['verdict', 'tasksExists', 'tasksMd', 'tasks', 'questions', 'specIssues'],
};

const PROPOSAL = {
  type: 'object',
  properties: {
    taskId: { type: 'string' },
    verdict: { type: 'string', enum: ['READY', 'ITERATE', 'BLOCKED'] },
    findings: { type: 'array', items: { type: 'string' } },
    crossTaskNotes: { type: 'array', items: { type: 'string' } },
    questions: { type: 'array', items: { type: 'string' } },
    proposedSection: { type: 'string' },
  },
  required: ['taskId', 'verdict', 'findings', 'crossTaskNotes', 'questions', 'proposedSection'],
};

const SCOPE = {
  type: 'object',
  properties: {
    taskId: { type: 'string' },
    scope: { type: 'string', enum: ['ok', 'too_big', 'too_small', 'out_of_scope', 'gap'] },
    reasons: { type: 'array', items: { type: 'string' } },
    suggestion: { type: 'string' },
  },
  required: ['taskId', 'scope', 'reasons', 'suggestion'],
};

const INTEGRATION = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['READY', 'ITERATE', 'BLOCKED'] },
    taskCount: { type: 'number' },
    doneCount: { type: 'number' },
    needsAnotherLook: { type: 'array', items: { type: 'string' } },
    questions: { type: 'array', items: { type: 'string' } },
    specIssues: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: [
    'verdict',
    'taskCount',
    'doneCount',
    'needsAnotherLook',
    'questions',
    'specIssues',
    'summary',
  ],
};

const FINGERPRINT = {
  type: 'object',
  properties: { digest: { type: 'string' }, status: { type: 'string' } },
  required: ['digest', 'status'],
};

// Fingerprint of every modified or untracked file, so any write by a fan-out
// agent shows up as a different digest.
const snapshot = (label, phaseName) =>
  agent(
    `Run exactly this command and return its output: the first line of stdout as "digest" and the text of \`git status --porcelain\` as "status". Do not edit anything.\n\n{ git status --porcelain; git ls-files -m -o --exclude-standard -z | xargs -0 git hash-object 2>/dev/null; } | shasum`,
    { label, phase: phaseName, model: 'haiku', effort: 'low', schema: FINGERPRINT },
  );

const assertNoWrites = async (before, label, phaseName) => {
  const after = await snapshot(label, phaseName);
  if (!before || !after)
    throw new Error(
      `${label}: could not fingerprint the working tree, so the read-only rule is unchecked.`,
    );
  // Agents relay the shasum line with different trailing text ("  -"), so compare the hash only.
  const hash = (f) => f.digest.trim().split(/\s+/)[0];
  if (hash(after) !== hash(before)) {
    throw new Error(
      `${label}: the working tree changed during a read-only fan-out. Only the integrator may write.\nBefore:\n${before.status}\nAfter:\n${after.status}`,
    );
  }
};

// ---- Draft (read-only) ----------------------------------------------------------
phase('Draft');
let baseline = await snapshot('fingerprint before draft', 'Draft');

const draft = await agent(
  `${COMMON}\n\n${READ_ONLY}\n\nRun in plan mode. If ${SPEC}/tasks.md already exists, this is a re-plan: set "tasksExists" to true, leave "tasksMd" as an empty string (the file stays on disk and later rounds review its tasks one by one), and list every task with its done flag. Otherwise set "tasksExists" to false and put the complete drafted tasks.md text in "tasksMd" (you write nothing to disk; the integrator writes it later). Always return the verdict, your questions and any spec issues.`,
  { agentType: 'planner', label: 'draft plan', phase: 'Draft', schema: DRAFT },
);
if (!draft) throw new Error('The drafting planner failed; nothing was written.');
await assertNoWrites(baseline, 'fingerprint after draft', 'Draft');

const questions = new Map(); // dedupe by normalized text, kept for the final report
const specIssues = new Set(draft.specIssues);
const collect = (qs) => qs.forEach((q) => questions.set(q.trim().toLowerCase(), q));
collect(draft.questions);

if (draft.verdict === 'BLOCKED') {
  return {
    verdict: 'BLOCKED',
    spec: SPEC,
    reason: 'The draft could not proceed without the user. Nothing was written.',
    questions: [...questions.values()],
    specIssues: [...specIssues],
  };
}

// ---- Deepen (read-only fan-out) + Integrate (single writer), round by round ------
const reviews = new Map(); // task id -> deep reviews used
const weak = new Set(); // tasks that hit the review cap still ITERATE
let pending = draft.tasks.filter((t) => !t.done).map((t) => t.id);
let overall = draft.verdict;
let round = 0;
let lastIntegration = null;
let planOnDisk = draft.tasksExists; // a new plan is on disk only after the first integration; a re-plan already is

while (pending.length && round < MAX_ROUNDS) {
  round += 1;
  const batch = pending.filter((id) => (reviews.get(id) ?? 0) < MAX_REVIEWS);
  pending.filter((id) => !batch.includes(id)).forEach((id) => weak.add(id));
  if (!batch.length) break;
  batch.forEach((id) => reviews.set(id, (reviews.get(id) ?? 0) + 1));
  log(
    `Round ${round}: deepening ${batch.join(', ')} (${batch.length} planners + ${batch.length} scope critics, all read-only)`,
  );

  // Round 1 works from the draft held in memory; later rounds read what the integrator wrote.
  const planSource = planOnDisk
    ? `The current plan is ${SPEC}/tasks.md.`
    : `The current plan is NOT on disk yet. It is this draft (ignore any older ${SPEC}/tasks.md):\n\n<plan>\n${draft.tasksMd}\n</plan>`;

  // Fan-out with no barrier: each task goes review -> scope check on its own clock.
  const results = await pipeline(
    batch,
    (id) =>
      agent(
        `${COMMON}\n\n${READ_ONLY}\n\n${planSource}\n\nRun in task mode: ${id}. Go deep on that one task only, then return your full task-mode report in the output fields, with the complete rewritten section in "proposedSection". If the task holds two changes, put both sections there.`,
        {
          agentType: 'planner',
          label: `${id} review r${round}`,
          phase: 'Deepen',
          schema: PROPOSAL,
        },
      ),
    (proposal, id) =>
      proposal
        ? agent(
            `Read-only scope check of task ${id} in ${SPEC}. Read ${SPEC}/requirements.md and ${SPEC}/design.md. ${planSource}\n\nJudge this proposed rewrite of ${id}:\n\n${proposal.proposedSection}\n\nAnswer only: is it ONE commit-sized logical change (too_big / too_small)? Does it do anything the design does not ask for (out_of_scope)? Is a criterion or design element it claims to cover left uncovered by it and by every other task (gap)? Otherwise ok. Be skeptical: look for reasons it is wrong before accepting it. ${READ_ONLY}`,
            {
              agentType: 'planner',
              label: `${id} scope r${round}`,
              phase: 'Deepen',
              schema: SCOPE,
            },
          ).then((scope) => ({ proposal, scope }))
        : null,
  );

  // Read-only rule check before the only writer runs.
  await assertNoWrites(baseline, `fingerprint after round ${round} fan-out`, 'Deepen');

  const ok = results.filter(Boolean);
  const missing = batch.filter((id) => !ok.some((r) => r.proposal.taskId === id));
  if (missing.length) log(`No proposal returned for ${missing.join(', ')}; they stay pending`);
  ok.forEach((r) => collect(r.proposal.questions));

  // Barrier: the integrator needs every proposal at once to reconcile cross-task notes.
  phase('Integrate');
  const scopeNotes = ok
    .filter((r) => r.scope && r.scope.scope !== 'ok')
    .map(
      (r) =>
        `- ${r.scope.taskId}: ${r.scope.scope} — ${r.scope.reasons.join('; ')}. Suggestion: ${r.scope.suggestion}`,
    )
    .join('\n');
  const proposals = ok.map((r) => r.proposal);

  lastIntegration = await agent(
    `${COMMON}\n\nRun in integrate mode, with one change: the proposals are not in .proposals/, they are below. You are the only agent allowed to write; write only ${SPEC}/tasks.md.\n\n${
      planOnDisk
        ? `Start from the current ${SPEC}/tasks.md.`
        : `${SPEC}/tasks.md is not up to date. Start from this draft, write it as tasks.md (if a file already exists, keep the status of tasks marked done), then merge the proposals:\n\n<draft>\n${draft.tasksMd}\n</draft>`
    }\n\nProposals from this round (JSON):\n${JSON.stringify(proposals, null, 2)}\n\nIndependent scope critics flagged these; treat each as a finding to resolve (split, shrink, cut or add a task), or explain in Review notes why you reject it:\n${scopeNotes || '(none)'}\n\n${ANSWERS.length ? 'Record the user answers listed above in Agreements, attributed to the user. ' : ''}For every other open question apply your recommended answer and mark it provisional in Agreements; you cannot ask the user during this run. Under needsAnotherLook list task ids only (include any new ids from splits).`,
    { agentType: 'planner', label: `integrate r${round}`, phase: 'Integrate', schema: INTEGRATION },
  );
  if (!lastIntegration) {
    throw new Error(
      `The integrator failed in round ${round}; tasks.md may be stale. Re-run, or resume with resumeFromRunId.`,
    );
  }
  planOnDisk = true;
  // The integrator legitimately changed tasks.md: take a new baseline for the next fan-out.
  baseline = await snapshot(`fingerprint after integrate r${round}`, 'Integrate');

  collect(lastIntegration.questions);
  lastIntegration.specIssues.forEach((s) => specIssues.add(s));
  overall = lastIntegration.verdict;
  log(`Round ${round}: ${overall} — ${lastIntegration.summary}`);

  if (overall === 'BLOCKED') break;
  // Retry tasks whose proposal never came back, plus whatever the integrator wants re-read.
  pending = [...new Set([...lastIntegration.needsAnotherLook, ...missing])];
  if (overall === 'READY' && !pending.length) break;
}

pending.filter((id) => (reviews.get(id) ?? 0) >= MAX_REVIEWS).forEach((id) => weak.add(id));
if (round >= MAX_ROUNDS && pending.length) {
  log(`Stopped at the ${MAX_ROUNDS}-round guard with ${pending.join(', ')} still pending`);
}

// ---- Report (the main session asks the user, approves and commits) ---------------
return {
  verdict: weak.size && overall === 'READY' ? 'ITERATE' : overall,
  spec: SPEC,
  tasksFile: `${SPEC}/tasks.md`,
  rounds: round,
  taskCount: lastIntegration?.taskCount ?? draft.tasks.length,
  doneCount: lastIntegration?.doneCount ?? draft.tasks.filter((t) => t.done).length,
  stillWeak: [...weak],
  stillPending: pending,
  questionsForTheUser: [...questions.values()],
  specIssues: [...specIssues],
  next: 'Ask the user the questions (answers were applied provisionally), have them approve tasks.md, run Prettier on it and commit it as "Docs: add the <topic> task plan".',
};
