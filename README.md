# Shenrui Liu — Research Notebook

A personal academic blog for research notes on embodied intelligence, tactile perception, and multimodal learning.

## Local environment

The project environment lives in `.conda-env` and contains Node.js and Python. It does not modify or connect to any GitHub repository.

```bash
conda activate ./conda-env
npm run dev
```

Then open `http://localhost:4321`.

## Build

```bash
conda activate ./conda-env
npm run build
```

The static site is generated in `dist/`.

## Sync and deploy

The repository is configured to deploy from the `main` branch to GitHub Pages at `https://fengzheng-kite.github.io`.

On another computer:

```bash
git clone https://github.com/fengzheng-kite/fengzheng-kite.github.io.git
cd fengzheng-kite.github.io
npm install
npm run dev
```

After editing:

```bash
git pull --rebase
git add .
git commit -m "Update site"
git push
```

GitHub Actions rebuilds and publishes the site after each push to `main`. In GitHub repository settings, set **Pages → Source** to **GitHub Actions**.

## Add content

- Blog posts: `src/content/blog/`
- Paper notes: `src/content/papers/`

Copy an existing Markdown file and update its frontmatter. Draft blog posts can use `draft: true`.

## GitHub safety

This prototype contains no GitHub Actions workflow, Git remote, authentication, API mutation, or automatic repository publishing. The GitHub icon is a normal public link to the profile.
