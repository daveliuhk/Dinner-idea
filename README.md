# Dinner LEGO Planner

A static, browser-based family dinner planning app built from the **realistic-portions v4** workbook.

## What it does

- Plan five weekday dinners.
- Calculates reusable Sunday prep blocks automatically.
- Enter supermarket pack quantities and rank recipes that make good use of them.
- `Suggest 5-meal week` builds a practical stock-fit week and then shows remaining quantities.
- Includes the original 50-recipe bank.
- Add, edit and delete recipes.
- Add, edit and delete prep building blocks.
- Add, edit and delete purchasable ingredients / pack sizes.
- Export and import the entire database as JSON.
- Stores edits in browser `localStorage`.

## Run locally

No build step is required.

You can open `index.html` directly, although using a tiny local web server is cleaner:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy with GitHub Pages

1. Create a GitHub repository.
2. Put the files in this folder at the repository root.
3. Commit and push.
4. In GitHub: **Settings → Pages**.
5. Under **Build and deployment**, select **Deploy from a branch**.
6. Choose your default branch (usually `main`) and `/ (root)`.
7. Save.

GitHub will provide the public Pages URL.

A `.nojekyll` file is included so GitHub Pages serves the static files as-is.

## Data model

The app deliberately keeps three editable concepts separate:

- **Recipes** — cooking method plus required quantities.
- **Prep blocks** — reusable Sunday-prep components (e.g. sauce cubes, chopped aromatics).
- **Ingredients** — things you buy and enter in the reverse planner.

This makes the system extensible. For example, adding a venison recipe means you can first add `Venison` as an ingredient, then use it in any number of recipes.

## Storage and syncing

This version is backend-free. That is intentional: it makes deployment almost trivial and hosting free.

Edits are stored per browser/device. They do **not** automatically sync between devices. Use **Data → Export everything** to create a JSON backup and import it elsewhere.

A future version could add cloud sync (e.g. Supabase/Firebase) without replacing the current recipe model.

## Files

- `index.html` — app shell
- `styles.css` — responsive styling
- `data.js` — initial 50 recipes / blocks / ingredients
- `app.js` — planner, matching, editors and local storage
- `.nojekyll` — GitHub Pages compatibility
