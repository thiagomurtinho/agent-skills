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

// One-time backfill: mine SendMessage events from this team's transcripts so the feed
// shows full history even though inboxes only keep unread msgs. Sender identity comes
// from the agent's briefing ("Você é `name`" / "You are `name`"); the orchestrator root
// (multi-recipient, no self-briefing) is the team-lead.
function seedFromTranscripts() {
  if (!existsSync(PROJECT_DIR)) return [];
  const seeded = [];
  for (const f of walkJsonl(PROJECT_DIR)) {
    let lines; try { lines = readFileSync(f, 'utf8').split('\n').filter(Boolean); } catch { continue; }
    // identity from first few user messages
    let from = '';
    for (const l of lines.slice(0, 6)) {
      const m = l.match(/(?:Você é|You are)\s*[`'"]?([a-z][a-z0-9-]{1,30})[`'"]?/i);
      if (m) { from = m[1]; break; }
    }
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
    // no briefing identity + sends to ≥2 distinct recipients → orchestrator (team-lead)
    if (!from) { const tos = new Set(sends.map((s) => s.to)); from = tos.size >= 2 ? 'team-lead' : ''; }
    if (!from) continue;
    for (const s of sends) seeded.push({ from, to: s.to, text: s.text, summary: s.summary, ts: s.ts, color: '' });
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

// Seed once at boot (merged into whatever the store already had).
try {
  const seeded = seedFromTranscripts();
  if (seeded.length) {
    const merged = mergeMsgs(readJson(FEED_STORE, []), seeded);
    writeFileSync(FEED_STORE, JSON.stringify(merged));
    console.log(`seeded ${seeded.length} msgs from transcripts → ${merged.length} total`);
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

function commits() {
  try {
    const raw = execSync('git log --pretty=format:%h%x1f%s%x1f%cI -20', { cwd: REPO }).toString();
    return raw.split('\n').filter(Boolean).map((l) => { const [hash, subject, date] = l.split('\x1f'); return { hash, subject, date }; });
  } catch { return []; }
}

function agents() {
  const cfg = readJson(CONFIG, { members: [] });
  return (cfg.members || []).map((m) => ({ name: m.name, type: m.agentType || '', id: m.agentId || '' }));
}

function state() {
  const t = tasks();
  return {
    team: TEAM,
    repo: REPO,
    branch: (() => { try { return execSync('git rev-parse --abbrev-ref HEAD', { cwd: REPO }).toString().trim(); } catch { return ''; } })(),
    generatedAt: new Date().toISOString(),
    tasks: t,
    messages: messages(),
    commits: commits(),
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
