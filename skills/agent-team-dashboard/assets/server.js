#!/usr/bin/env node
// dli-dashboard — live server (zero deps). Reads team logs fresh on each request.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HOME = homedir();

// Auto-detect the active team if not given: a team dir is "active" when it has an inboxes/ folder.
function detectTeam() {
  const base = join(HOME, '.claude', 'teams');
  if (!existsSync(base)) return '';
  const teams = readdirSync(base).filter((d) => existsSync(join(base, d, 'inboxes')));
  return teams.length === 1 ? teams[0] : (teams[0] || '');
}

const TEAM = process.env.TEAM || detectTeam();
const PORT = Number(process.env.PORT || 4317);
const REPO = process.env.REPO || process.cwd();
const TASKS_DIR = join(HOME, '.claude', 'tasks', TEAM);
const INBOX_DIR = join(HOME, '.claude', 'teams', TEAM, 'inboxes');
const CONFIG = join(HOME, '.claude', 'teams', TEAM, 'config.json');
// Inboxes only hold UNREAD messages — they drain as agents read them. We accumulate
// every message we ever see into a persistent store so the feed keeps full history.
const FEED_STORE = join(tmpdir(), `agent-team-dashboard-feed-${TEAM}.json`);

const readJson = (p, fb) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fb; } };
const asText = (v) => (typeof v === 'string' ? v : v == null ? '' : JSON.stringify(v));

// Encode a repo path the way ~/.claude/projects/ does (non-alphanumeric → '-').
const PROJECT_DIR = join(HOME, '.claude', 'projects', REPO.replace(/[^a-zA-Z0-9]/g, '-'));

// Recursively list *.jsonl transcripts under a dir.
function walkJsonl(dir, out = []) {
  let ents; try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkJsonl(p, out);
    else if (e.name.endsWith('.jsonl')) out.push(p);
  }
  return out;
}

// Current team's member names (for scoping the orchestrator's recipients).
function memberNames() {
  const cfg = readJson(CONFIG, { members: [] });
  return new Set((cfg.members || []).map((m) => m.name));
}

// One-time backfill: mine SendMessage events from THIS team's transcripts so the feed
// shows full history even though inboxes only keep unread msgs. Scoped to the team:
//  - member transcripts self-identify via briefing "Você é `name` no time `team`";
//    a transcript whose briefing names a DIFFERENT team is skipped (the repo holds
//    transcripts from every team that ever ran here).
//  - the orchestrator root has no briefing → from=team-lead, but we keep only sends to
//    a current member and after the team was created (evita contaminação cross-team).
function seedFromTranscripts() {
  if (!existsSync(PROJECT_DIR)) return [];
  const members = memberNames();
  const sinceMs = (() => { const iso = teamCreatedAt(); return iso ? Date.parse(iso) : 0; })();
  const afterStart = (ts) => !sinceMs || (ts && Date.parse(ts) >= sinceMs);
  const seeded = [];
  for (const f of walkJsonl(PROJECT_DIR)) {
    let lines; try { lines = readFileSync(f, 'utf8').split('\n').filter(Boolean); } catch { continue; }
    // briefing → sender name + which team this transcript belongs to
    let from = '', fileTeam = '';
    for (const l of lines.slice(0, 6)) {
      const m = l.match(/(?:Você é|You are)\s*[`'"]?([a-z][a-z0-9-]{1,30})[`'"]?\s*(?:no time|in (?:the )?team)\s*[`'"]?([a-z0-9-]{1,40})[`'"]?/i);
      if (m) { from = m[1]; fileTeam = m[2]; break; }
    }
    // a briefing that names another team → not ours, skip the whole file
    if (fileTeam && fileTeam !== TEAM) continue;
    const sends = [];
    for (const l of lines) {
      let o; try { o = JSON.parse(l); } catch { continue; }
      const c = o.message?.content;
      if (!Array.isArray(c)) continue;
      for (const b of c) {
        if (b.type === 'tool_use' && b.name === 'SendMessage') {
          const i = b.input || {};
          sends.push({ to: asText(i.to) || '?', text: asText(i.message || i.content), summary: asText(i.summary), ts: o.timestamp || '' });
        }
      }
    }
    if (!sends.length) continue;
    if (from) {
      // member transcript of this team → keep all its sends
      for (const s of sends) seeded.push({ from, to: s.to, text: s.text, summary: s.summary, ts: s.ts, color: '' });
    } else {
      // no briefing → orchestrator root; keep only sends to a current member, after start
      for (const s of sends) {
        if (members.has(s.to) && afterStart(s.ts)) seeded.push({ from: 'team-lead', to: s.to, text: s.text, summary: s.summary, ts: s.ts, color: '' });
      }
    }
  }
  return seeded;
}

const msgKey = (m) => m.from + '|' + m.to + '|' + m.ts + '|' + asText(m.text).slice(0, 40);
function mergeMsgs(...lists) {
  const seen = new Set();
  return lists.flat()
    .filter((m) => { const k = msgKey(m); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
}

// Rebuild the store from clean seed at boot — overwrite (not merge) so any cross-team
// contamination from older runs is wiped; transcripts re-recover this team's history.
// messages() then accumulates live inbox on top during the run.
try {
  const seeded = mergeMsgs(seedFromTranscripts());
  if (seeded.length) {
    writeFileSync(FEED_STORE, JSON.stringify(seeded));
    console.log(`seeded ${seeded.length} msgs from ${TEAM} transcripts`);
  }
} catch (e) { console.error('seed failed:', e.message); }

function tasks() {
  if (!existsSync(TASKS_DIR)) return [];
  return readdirSync(TASKS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => readJson(join(TASKS_DIR, f), null))
    .filter(Boolean)
    .map((t) => ({
      id: Number(t.id),
      subject: t.subject || '',
      description: t.description || '',
      owner: t.owner || '',
      status: t.status || 'pending',
      blockedBy: (t.blockedBy || []).map(Number),
      phase: (String(t.subject).match(/F(\d)/) || [, '?'])[1],
    }))
    .sort((a, b) => a.id - b.id);
}

function messages() {
  if (!existsSync(INBOX_DIR)) return [];
  const out = [];
  for (const f of readdirSync(INBOX_DIR).filter((x) => x.endsWith('.json'))) {
    const to = f.replace(/\.json$/, '');
    const arr = readJson(join(INBOX_DIR, f), []);
    if (Array.isArray(arr)) {
      for (const m of arr) {
        out.push({
          from: m.from || '?',
          to,
          text: m.text || (typeof m.message === 'string' ? m.message : ''),
          summary: m.summary || '',
          ts: m.timestamp || '',
          color: m.color || '',
        });
      }
    }
  }
  // Merge currently-pending inbox msgs with everything seen before (persisted store),
  // so the feed survives inboxes draining.
  const prev = readJson(FEED_STORE, []);
  const merged = mergeMsgs(prev, out);
  if (merged.length !== prev.length) { try { writeFileSync(FEED_STORE, JSON.stringify(merged)); } catch {} }
  return merged;
}

const gitSafe = (cmd) => { try { return execSync('git ' + cmd, { cwd: REPO }).toString().trim(); } catch { return ''; } };

// ISO of when the team was created (config.createdAt, else earliest member joinedAt).
function teamCreatedAt() {
  const cfg = readJson(CONFIG, {});
  let ms = cfg.createdAt || 0;
  if (!ms) ms = (cfg.members || []).reduce((a, m) => (m.joinedAt && m.joinedAt < a ? m.joinedAt : a), Infinity);
  return Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : '';
}

// Default base branch (origin/main → "origin/main"), fallback to local main/master.
function baseBranch() {
  const sym = gitSafe('symbolic-ref refs/remotes/origin/HEAD'); // refs/remotes/origin/main
  if (sym) return sym.replace('refs/remotes/', '');
  for (const c of ['main', 'master']) if (gitSafe('rev-parse --verify ' + c)) return c;
  return '';
}

// Commits scoped to the team's work: prefer commits on the current branch since the
// team was created; degrade to branch-diff, then team time-window, then last 20.
function commits() {
  const fmt = '--pretty=format:%h%x1f%s%x1f%cI';
  const since = teamCreatedAt();
  const base = baseBranch();
  const head = gitSafe('rev-parse --abbrev-ref HEAD');
  const onBranch = base && head && head !== 'HEAD' && head !== base.replace(/^origin\//, '');
  const tries = [];
  if (onBranch && since) tries.push(['branch', `log ${fmt} ${base}..HEAD --since="${since}"`]);
  if (onBranch) tries.push(['branch', `log ${fmt} ${base}..HEAD`]);
  if (since) tries.push(['team', `log ${fmt} --since="${since}"`]);
  tries.push(['todos', `log ${fmt} -20`]);
  for (const [scope, cmd] of tries) {
    const raw = gitSafe(cmd);
    if (!raw) continue;
    const list = raw.split('\n').filter(Boolean).map((l) => { const [hash, subject, date] = l.split('\x1f'); return { hash, subject, date }; });
    if (list.length) return { list, scope };
  }
  return { list: [], scope: 'todos' };
}

function agents() {
  const cfg = readJson(CONFIG, { members: [] });
  return (cfg.members || []).map((m) => ({
    name: m.name, type: m.agentType || '', id: m.agentId || '',
    model: m.model || '', joinedAt: m.joinedAt || 0,
  }));
}

function state() {
  const t = tasks();
  const cm = commits();
  return {
    team: TEAM,
    repo: REPO,
    branch: gitSafe('rev-parse --abbrev-ref HEAD'),
    generatedAt: new Date().toISOString(),
    tasks: t,
    messages: messages(),
    commits: cm.list,
    commitScope: cm.scope,
    agents: agents(),
  };
}

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

createServer((req, res) => {
  if (req.url.startsWith('/api/state')) {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(state()));
    return;
  }
  // serve index.html for everything else
  try {
    res.writeHead(200, { 'Content-Type': types['.html'] });
    res.end(readFileSync(join(HERE, 'index.html')));
  } catch {
    res.writeHead(500); res.end('index.html missing');
  }
}).listen(PORT, '0.0.0.0', () => {
  // 0.0.0.0 → reachable on localhost AND via the Mac's LAN IP simultaneously (iPhone/iPad).
  const ip = (() => {
    try { return execSync("ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}'").toString().trim(); }
    catch { return ''; }
  })();
  console.log(`agent-team-dashboard live (team=${TEAM})`);
  console.log(`  local →  http://localhost:${PORT}`);
  if (ip) console.log(`  LAN   →  http://${ip}:${PORT}   (mesma rede Wi-Fi)`);
});
