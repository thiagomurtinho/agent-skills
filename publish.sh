#!/usr/bin/env bash
# One-shot: prepara, cria repo público <owner>/agent-skills e faz push. Requer gh autenticado.
set -euo pipefail

OWNER=$(gh api user -q .login)
echo "owner: $OWNER"

# substitui placeholder do badge/install no README (idempotente)
sed -i.bak "s/GH_OWNER/$OWNER/g" README.md && rm -f README.md.bak

# git init + commit se necessário
if [ ! -d .git ]; then git init -q; fi
git add -A
git diff --cached --quiet || git commit -qm "feat: add cave-handoff skill

Session handoff as caveman-compressed verifiable operational state.
Tested: 47% char reduction vs verbose template, 0 anchors lost."

gh repo create "agent-skills" --public --source=. --remote=origin \
  --description "Reusable agent skills — handoff, compression, token economy. AI prepares, human decides." \
  --push

gh repo edit "$OWNER/agent-skills" --add-topic claude-code --add-topic agent-skills --add-topic skills --add-topic llm --add-topic tokens --add-topic claude

echo
echo "✓ https://github.com/$OWNER/agent-skills"
echo "✓ instalar: npx skills add $OWNER/agent-skills --skill cave-handoff"
echo "✓ skills.sh indexa automaticamente quando alguém instala via CLI"
