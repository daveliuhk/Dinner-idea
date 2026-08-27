(function(){
  const KEY = "dinner-lego-planner-v1";
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw || !window.DEFAULT_DINNER_DATA) return;
    const saved = JSON.parse(raw);
    if (!saved || !Array.isArray(saved.recipes) || !Array.isArray(saved.blocks) || !Array.isArray(saved.ingredients)) return;
    const d = window.DEFAULT_DINNER_DATA;
    const recipeIds = new Set(saved.recipes.map(x => x.id));
    const blockCodes = new Set(saved.blocks.map(x => x.code));
    const ingredientCodes = new Set(saved.ingredients.map(x => x.code));
    d.recipes.forEach(x => { if (!recipeIds.has(x.id)) saved.recipes.push(x); });
    d.blocks.forEach(x => { if (!blockCodes.has(x.code)) saved.blocks.push(x); });
    d.ingredients.forEach(x => { if (!ingredientCodes.has(x.code)) saved.ingredients.push(x); });
    if (window.enrichDinnerData) window.enrichDinnerData(saved);
    saved.schemaVersion = 3;
    saved.stock = saved.stock || {};
    saved.ingredients.forEach(i => { if (saved.stock[i.code] == null) saved.stock[i.code] = 0; });
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch (e) {
    console.warn("Dinner v1.3 migration skipped", e);
  }
})();
