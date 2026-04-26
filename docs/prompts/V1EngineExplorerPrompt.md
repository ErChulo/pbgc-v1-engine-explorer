Created the prompt file:



\[V1EngineExplorerPrompt.md](sandbox:/mnt/data/V1EngineExplorerPrompt.md)



The prompt is anchored on the current HTML app structure, which reads the embedded JSON from `data-block` and uses `DATA.cells`, `DATA.formulas`, `DATA.dependents`, and `DATA.namedRanges` for rendering. 



\## Step-by-step from your project directory



SpecKit’s quick start supports initializing a project in the current directory with `uvx --from git+https://github.com/github/spec-kit.git specify init .`, and OpenAI’s Codex CLI documentation lists installation with `npm install -g @openai/codex`. (\[GitHub Guides]\[1])



```bash

cd /path/to/pbgc-v1-engine-explorer

```



If you have not cloned it yet:



```bash

git clone https://github.com/ErChulo/pbgc-v1-engine-explorer.git

cd pbgc-v1-engine-explorer

```



Create a development branch:



```bash

git status

git checkout -b feature/option-b-summary-json

```



Create a prompt directory and copy the downloaded prompt there:



```bash

mkdir -p docs/prompts

cp \~/Downloads/V1EngineExplorerPrompt.md docs/prompts/V1EngineExplorerPrompt.md

```



Initialize SpecKit in the existing repository:



```bash

uvx --from git+https://github.com/github/spec-kit.git specify init . --ai codex --script sh

```



Install or update Codex CLI:



```bash

npm install -g @openai/codex

codex --version

```



Start Codex from the repository root:



```bash

codex --auto-edit

```



Then paste this instruction into Codex:



```text

Read docs/prompts/V1EngineExplorerPrompt.md and implement it. Start by inspecting the current repository structure and current HTML app. Make a plan first. Preserve the current working app behavior. Do not rewrite from scratch.

```



After Codex edits the project:



```bash

git diff

git status

```



Test the app both ways:



```bash

python3 -m http.server 8000

```



Then open:



```text

http://localhost:8000/

```



Also test direct `file://` loading with the new JSON file picker or drag-and-drop.



When it works:



```bash

git add .

git commit -m "feat: support Option B source-tab-aware V1 summary JSON"

git push -u origin feature/option-b-summary-json

```



After review, tag the working version:



```bash

git tag v2.7.0

git push origin v2.7.0

```



I did not push anything to GitHub; the file above is ready for you to place into the repository.



\[1]: https://github.github.com/spec-kit/quickstart.html?utm\_source=chatgpt.com "Quick Start Guide | Spec Kit Documentation"



