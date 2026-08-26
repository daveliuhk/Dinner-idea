(() => {
  "use strict";

  const STORAGE_KEY = "dinner-lego-planner-v1";
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const clone = (obj) => JSON.parse(JSON.stringify(obj));
  const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
  const fmt = (n) => Number.isInteger(Number(n)) ? String(Number(n)) : Number(n).toFixed(1).replace(/\.0$/,"");
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function freshState() {
    const d = clone(window.DEFAULT_DINNER_DATA);
    return {
      ...d,
      week: [null, null, null, null, null],
      stock: Object.fromEntries(d.ingredients.map(i => [i.code, 0])),
      ui: { activeTab: "planner" }
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Array.isArray(saved.recipes) && Array.isArray(saved.blocks) && Array.isArray(saved.ingredients)) {
        saved.week = Array.isArray(saved.week) ? saved.week.slice(0,5) : [null,null,null,null,null];
        while (saved.week.length < 5) saved.week.push(null);
        saved.stock = saved.stock || {};
        saved.ingredients.forEach(i => { if (saved.stock[i.code] == null) saved.stock[i.code] = 0; });
        saved.ui = saved.ui || {activeTab:"planner"};
        return saved;
      }
    } catch (e) {
      console.warn("Could not load saved state", e);
    }
    return freshState();
  }

  let state = loadState();
  let currentEditor = null;

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 1900);
  }

  function recipeById(id) { return state.recipes.find(r => r.id === id); }
  function blockByCode(code) { return state.blocks.find(b => b.code === code); }
  function ingredientByCode(code) { return state.ingredients.find(i => i.code === code); }

  function normalizeStateRefs() {
    state.week = state.week.map(id => recipeById(id) ? id : null);
    const validIngredients = new Set(state.ingredients.map(i => i.code));
    Object.keys(state.stock).forEach(k => { if (!validIngredients.has(k)) delete state.stock[k]; });
    state.ingredients.forEach(i => { if (state.stock[i.code] == null) state.stock[i.code] = 0; });
  }

  // ----------------------------------------------------------
  // Navigation
  // ----------------------------------------------------------
  function activateTab(name) {
    $$(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
    $$(".panel").forEach(p => p.classList.toggle("active", p.id === name));
    state.ui.activeTab = name;
    saveState();
    if (name === "planner") renderPlanner();
    if (name === "stock") renderStock();
    if (name === "recipes") renderRecipes();
    if (name === "blocks") renderBlocks();
    if (name === "ingredients") renderIngredients();
  }

  $$(".tab").forEach(btn => btn.addEventListener("click", () => activateTab(btn.dataset.tab)));

  // ----------------------------------------------------------
  // Week planner
  // ----------------------------------------------------------
  function selectedRecipes() {
    return state.week.map(recipeById).filter(Boolean);
  }

  function aggregateSelected() {
    const blockUse = {};
    const ingredientUse = {};
    selectedRecipes().forEach(r => {
      Object.entries(r.blocks || {}).forEach(([code, qty]) => blockUse[code] = (blockUse[code] || 0) + Number(qty));
      Object.entries(r.ingredients || {}).forEach(([code, qty]) => ingredientUse[code] = (ingredientUse[code] || 0) + Number(qty));
    });
    return {blockUse, ingredientUse};
  }

  function recipeOptionHtml(selectedId = null) {
    const categories = [...new Set(state.recipes.map(r => r.category))].sort();
    let html = `<option value="">— choose dinner —</option>`;
    categories.forEach(cat => {
      html += `<optgroup label="${esc(cat)}">`;
      state.recipes.filter(r => r.category === cat).sort((a,b) => a.name.localeCompare(b.name)).forEach(r => {
        html += `<option value="${esc(r.id)}" ${r.id === selectedId ? "selected" : ""}>${esc(r.name)}</option>`;
      });
      html += `</optgroup>`;
    });
    return html;
  }

  function renderPlanner() {
    const grid = $("#weekGrid");
    grid.innerHTML = DAYS.map((day, idx) => {
      const r = recipeById(state.week[idx]);
      return `
        <article class="day-card">
          <div class="day-label">${day}</div>
          <select class="input day-select" data-day="${idx}">${recipeOptionHtml(state.week[idx])}</select>
          ${r ? `
            <div class="recipe-mini">
              <div class="meta"><span class="chip">${fmt(r.minutes)} min</span><span class="chip">${esc(r.appliance)}</span></div>
              <div class="requirement">${esc(r.requirement)}</div>
              <div class="method">${esc(r.method)}</div>
            </div>` : `<div class="empty">No dinner selected.</div>`}
        </article>`;
    }).join("");

    $$(".day-select", grid).forEach(sel => sel.addEventListener("change", e => {
      state.week[Number(e.target.dataset.day)] = e.target.value || null;
      saveState();
      renderPlanner();
    }));

    const {blockUse, ingredientUse} = aggregateSelected();

    const prepRows = Object.entries(blockUse)
      .filter(([,q]) => q > 0)
      .map(([code,q]) => ({b:blockByCode(code), q}))
      .filter(x => x.b)
      .sort((a,b) => a.b.code.localeCompare(b.b.code));

    $("#prepSummary").innerHTML = prepRows.length ? `
      <table class="summary-table">
        <thead><tr><th>Block</th><th>Need</th><th>Sunday action</th></tr></thead>
        <tbody>${prepRows.map(({b,q}) => `
          <tr><td><strong>${esc(b.code)}</strong> · ${esc(b.name)}</td><td>${fmt(q)} × ${esc(b.unitMeans)}</td><td>${esc(b.prep)}</td></tr>
        `).join("")}</tbody>
      </table>` : `<div class="empty">Pick dinners to calculate prep.</div>`;

    const usageRows = Object.entries(ingredientUse)
      .filter(([,q]) => q > 0)
      .map(([code,used]) => {
        const ing = ingredientByCode(code);
        const have = Number(state.stock[code] || 0);
        return {ing, used, have, remaining: have - used};
      }).filter(x => x.ing);

    $("#weekStockSummary").innerHTML = usageRows.length ? `
      <table class="summary-table">
        <thead><tr><th>Ingredient</th><th>Used</th><th>On hand</th><th>Balance</th></tr></thead>
        <tbody>${usageRows.map(x => {
          let statusClass = "";
          let label = "";
          if (x.have === 0) { statusClass="short"; label=`need ${fmt(x.used)} ${esc(x.ing.unit)}`; }
          else if (x.remaining < 0) { statusClass="short"; label=`short ${fmt(Math.abs(x.remaining))} ${esc(x.ing.unit)}`; }
          else if (Math.abs(x.remaining) < 1e-9) { statusClass="good"; label="exact"; }
          else { statusClass="leftover"; label=`${fmt(x.remaining)} ${esc(x.ing.unit)} left`; }
          const pct = x.have > 0 ? clamp(x.used / x.have * 100, 0, 100) : 0;
          return `<tr>
            <td>${esc(x.ing.name)}</td><td>${fmt(x.used)} ${esc(x.ing.unit)}</td><td>${fmt(x.have)} ${esc(x.ing.unit)}</td>
            <td class="${statusClass}">${label}<div class="util-bar"><div class="util-fill" style="width:${pct}%"></div></div></td>
          </tr>`;
        }).join("")}</tbody>
      </table>` : `<div class="empty">Pick dinners to calculate ingredient use.</div>`;
  }

  // ----------------------------------------------------------
  // Reverse stock matching
  // ----------------------------------------------------------
  function enteredStockCodes() {
    return state.ingredients.filter(i => Number(state.stock[i.code] || 0) > 0).map(i => i.code);
  }

  function perishableWeight(ing) {
    if (!ing) return 1;
    if (/Fresh protein/i.test(ing.type)) return 1.55;
    if (/Fresh veg|Fresh dairy|Fridge/i.test(ing.type)) return 1.25;
    if (/Freezer|Cupboard|Sauce stock/i.test(ing.type)) return 0.8;
    return 1;
  }

  function scoreRecipeAgainstStock(recipe, stockObj = state.stock) {
    const entered = state.ingredients.filter(i => Number(stockObj[i.code] || 0) > 0);
    if (!entered.length) return {score:0, matched:0, shortfalls:0, usedShare:0};

    let score = 0, matched = 0, shortfalls = 0, usedShare = 0;
    entered.forEach(ing => {
      const have = Number(stockObj[ing.code] || 0);
      const req = Number(recipe.ingredients?.[ing.code] || 0);
      if (req <= 0) return;
      const w = perishableWeight(ing);
      if (req <= have) {
        matched += 1;
        const share = req / have;
        usedShare += share;
        score += (45 + 35 * Math.min(1, share)) * w;
      } else {
        shortfalls += 1;
        score -= 160 * w * (req / have);
      }
    });
    return {score, matched, shortfalls, usedShare};
  }

  function rankedRecipes() {
    return state.recipes.map(r => ({recipe:r, ...scoreRecipeAgainstStock(r)}))
      .filter(x => x.matched > 0)
      .sort((a,b) => b.score - a.score || a.recipe.minutes - b.recipe.minutes);
  }

  function greedySuggestedWeek() {
    const entered = enteredStockCodes();
    if (!entered.length) return [];
    const remaining = Object.fromEntries(Object.entries(state.stock).map(([k,v]) => [k, Number(v || 0)]));
    const picked = [];
    const usedCategories = new Set();

    for (let slot = 0; slot < 5; slot++) {
      let best = null;
      for (const r of state.recipes) {
        if (picked.some(p => p.id === r.id)) continue;

        let matched = 0, shortfalls = 0, score = 0;
        for (const code of entered) {
          const req = Number(r.ingredients?.[code] || 0);
          if (!req) continue;
          matched++;
          const ing = ingredientByCode(code);
          const haveNow = Number(remaining[code] || 0);
          const original = Number(state.stock[code] || 0);
          const w = perishableWeight(ing);

          if (req <= haveNow) {
            const packShare = original > 0 ? req / original : 0;
            score += (55 + 45 * Math.min(1, packShare)) * w;
            if (Math.abs(req - haveNow) < 1e-9) score += 35 * w; // exact finish bonus
          } else {
            shortfalls++;
            score -= 260 * w * (req / Math.max(original, 1));
          }
        }
        if (!matched) continue;
        if (!usedCategories.has(r.category)) score += 12;
        score -= Math.max(0, r.minutes - 15) * 1.2;

        if (!best || score > best.score) best = {recipe:r, score, matched, shortfalls};
      }

      if (!best || best.score <= 0) break;
      picked.push(best.recipe);
      usedCategories.add(best.recipe.category);
      entered.forEach(code => {
        const req = Number(best.recipe.ingredients?.[code] || 0);
        if (req) remaining[code] = Number(remaining[code] || 0) - req;
      });
    }

    return picked;
  }

  function renderStockFilters() {
    const types = [...new Set(state.ingredients.map(i => i.type))].sort();
    const sel = $("#stockTypeFilter");
    const current = sel.value;
    sel.innerHTML = `<option value="">All types</option>` + types.map(t => `<option>${esc(t)}</option>`).join("");
    if (types.includes(current)) sel.value = current;
  }

  function renderStock() {
    renderStockFilters();
    const q = ($("#stockSearch").value || "").toLowerCase();
    const type = $("#stockTypeFilter").value;

    const items = state.ingredients.filter(i =>
      (!q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q)) &&
      (!type || i.type === type)
    );

    $("#stockInputs").innerHTML = items.map(i => `
      <div class="stock-row">
        <div class="stock-name"><strong>${esc(i.name)}</strong><span>${esc(i.type)} · typical ${fmt(i.defaultPack)} ${esc(i.unit)}</span></div>
        <input class="input stock-qty" type="number" min="0" step="any" data-code="${esc(i.code)}" value="${Number(state.stock[i.code] || 0) || ""}" placeholder="0" />
        <div class="stock-unit">${esc(i.unit)}</div>
      </div>
    `).join("") || `<div class="empty">No ingredients match.</div>`;

    $$(".stock-qty").forEach(input => input.addEventListener("change", e => {
      state.stock[e.target.dataset.code] = Math.max(0, Number(e.target.value || 0));
      saveState();
      renderStockMatches();
      renderPlanner();
    }));

    renderStockMatches();
  }

  function renderStockMatches() {
    const ranked = rankedRecipes().slice(0, 12);
    $("#recipeMatches").innerHTML = ranked.length ? ranked.map((x, idx) => `
      <div class="match-card">
        <div class="match-title"><strong>${idx+1}. ${esc(x.recipe.name)}</strong><span class="chip">${Math.round(x.score)}</span></div>
        <div class="match-details">${esc(x.recipe.requirement)} · ${fmt(x.recipe.minutes)} min · ${x.matched} entered item${x.matched===1?"":"s"} used${x.shortfalls ? ` · ${x.shortfalls} shortfall` : ""}</div>
        <div class="match-actions"><button class="button secondary small add-match" data-id="${esc(x.recipe.id)}">Add to week</button></div>
      </div>
    `).join("") : `<div class="empty">Enter at least one quantity on the left to generate recipe matches.</div>`;

    $$(".add-match").forEach(btn => btn.addEventListener("click", () => addRecipeToWeek(btn.dataset.id)));
  }

  function addRecipeToWeek(id) {
    const empty = state.week.findIndex(x => !x);
    if (empty === -1) { toast("The five-day week is already full"); return; }
    state.week[empty] = id;
    saveState();
    toast(`Added to ${DAYS[empty]}`);
    renderPlanner();
  }

  $("#suggestWeekBtn").addEventListener("click", () => {
    const picks = greedySuggestedWeek();
    if (!picks.length) { toast("Enter some stock quantities first"); activateTab("stock"); return; }
    state.week = [...picks.map(r => r.id), null, null, null, null].slice(0,5);
    saveState();
    renderPlanner();
    toast(`Built a ${picks.length}-meal stock-fit week`);
  });

  $("#stockSearch").addEventListener("input", renderStock);
  $("#stockTypeFilter").addEventListener("change", renderStock);

  $("#clearStockBtn").addEventListener("click", () => {
    state.ingredients.forEach(i => state.stock[i.code] = 0);
    saveState(); renderStock(); renderPlanner(); toast("Stock cleared");
  });

  $("#loadTypicalPacksBtn").addEventListener("click", () => {
    state.ingredients.forEach(i => {
      if (/Fresh protein|Fresh veg|Fresh carb|Fresh dairy|Fridge carb/i.test(i.type)) {
        state.stock[i.code] = Number(i.defaultPack || 0);
      }
    });
    saveState(); renderStock(); renderPlanner(); toast("Loaded typical perishable pack sizes");
  });

  // ----------------------------------------------------------
  // Recipes
  // ----------------------------------------------------------
  function renderRecipeFilters() {
    const cats = [...new Set(state.recipes.map(r => r.category))].sort();
    const sel = $("#recipeCategoryFilter");
    const cur = sel.value;
    sel.innerHTML = `<option value="">All categories</option>` + cats.map(c => `<option>${esc(c)}</option>`).join("");
    if (cats.includes(cur)) sel.value = cur;
  }

  function renderRecipes() {
    renderRecipeFilters();
    const q = ($("#recipeSearch").value || "").toLowerCase();
    const cat = $("#recipeCategoryFilter").value;
    const rows = state.recipes.filter(r =>
      (!q || [r.name,r.category,r.appliance,r.requirement,r.extras].some(v => String(v).toLowerCase().includes(q))) &&
      (!cat || r.category === cat)
    );

    $("#recipeList").innerHTML = rows.map(r => `
      <article class="recipe-card">
        <div class="meta"><span class="chip">${esc(r.category)}</span><span class="chip">${fmt(r.minutes)} min</span></div>
        <h3>${esc(r.name)}</h3>
        <div class="requirement">${esc(r.requirement)}</div>
        <div class="extras">${esc(r.extras)}</div>
        <div class="method">${esc(r.method)}</div>
        <div class="actions">
          <button class="button secondary small recipe-add" data-id="${esc(r.id)}">Add to week</button>
          <button class="button secondary small recipe-edit" data-id="${esc(r.id)}">Edit</button>
          <button class="button secondary small recipe-delete" data-id="${esc(r.id)}">Delete</button>
        </div>
      </article>
    `).join("") || `<div class="empty">No recipes match.</div>`;

    $$(".recipe-add").forEach(b => b.addEventListener("click", () => addRecipeToWeek(b.dataset.id)));
    $$(".recipe-edit").forEach(b => b.addEventListener("click", () => openRecipeEditor(b.dataset.id)));
    $$(".recipe-delete").forEach(b => b.addEventListener("click", () => deleteRecipe(b.dataset.id)));
  }

  $("#recipeSearch").addEventListener("input", renderRecipes);
  $("#recipeCategoryFilter").addEventListener("change", renderRecipes);
  $("#addRecipeBtn").addEventListener("click", () => openRecipeEditor());

  function requirementLine(kind, code="", qty="") {
    const list = kind === "block" ? state.blocks : state.ingredients;
    const label = kind === "block" ? b => `${b.code} · ${b.name}` : i => `${i.name} (${i.unit})`;
    return `
      <div class="requirement-line req-line" data-kind="${kind}">
        <select class="input req-code">
          <option value="">— choose —</option>
          ${list.map(x => `<option value="${esc(x.code)}" ${x.code===code?"selected":""}>${esc(label(x))}</option>`).join("")}
        </select>
        <input class="input req-qty" type="number" min="0" step="any" value="${esc(qty)}" placeholder="Qty" />
        <button type="button" class="button secondary small remove-req">Remove</button>
      </div>`;
  }

  function wireRequirementEditor(root) {
    $$(".remove-req", root).forEach(b => b.addEventListener("click", () => b.closest(".req-line").remove()));
  }

  function openRecipeEditor(id=null) {
    const r = id ? recipeById(id) : {
      id:null,name:"",category:"",minutes:15,appliance:"",requirement:"",extras:"",method:"",blocks:{},ingredients:{}
    };
    currentEditor = {type:"recipe", id};
    $("#dialogEyebrow").textContent = id ? "Edit recipe" : "New recipe";
    $("#dialogTitle").textContent = id ? r.name : "Add recipe";
    $("#editorBody").innerHTML = `
      <div class="form-grid">
        <div class="form-field full"><label>Name</label><input id="f-name" class="input" value="${esc(r.name)}"></div>
        <div class="form-field"><label>Category</label><input id="f-category" class="input" value="${esc(r.category)}" placeholder="e.g. Pasta & gnocchi"></div>
        <div class="form-field"><label>Weeknight minutes</label><input id="f-minutes" class="input" type="number" min="1" value="${esc(r.minutes)}"></div>
        <div class="form-field"><label>Appliance</label><input id="f-appliance" class="input" value="${esc(r.appliance)}"></div>
        <div class="form-field full"><label>Human-readable requirement</label><input id="f-requirement" class="input" value="${esc(r.requirement)}" placeholder="e.g. 300g beef + 2×S1"></div>
        <div class="form-field full"><label>Extra ingredients</label><textarea id="f-extras" class="input">${esc(r.extras)}</textarea></div>
        <div class="form-field full"><label>Weeknight method</label><textarea id="f-method" class="input">${esc(r.method)}</textarea></div>
      </div>
      <div class="requirement-editor">
        <div class="card-heading"><h4>Prep block requirements</h4><button type="button" class="button secondary small" id="addBlockReq">Add block</button></div>
        <div id="blockReqs">${Object.entries(r.blocks||{}).map(([c,q]) => requirementLine("block",c,q)).join("") || `<div class="empty req-empty">No prep blocks.</div>`}</div>
      </div>
      <div class="requirement-editor">
        <div class="card-heading"><h4>Purchasable ingredient requirements</h4><button type="button" class="button secondary small" id="addIngReq">Add ingredient</button></div>
        <div id="ingReqs">${Object.entries(r.ingredients||{}).map(([c,q]) => requirementLine("ingredient",c,q)).join("") || `<div class="empty req-empty">No ingredient requirements yet.</div>`}</div>
      </div>`;
    wireRequirementEditor($("#editorBody"));
    $("#addBlockReq").addEventListener("click", () => {
      $(".req-empty", $("#blockReqs"))?.remove();
      $("#blockReqs").insertAdjacentHTML("beforeend", requirementLine("block"));
      wireRequirementEditor($("#blockReqs"));
    });
    $("#addIngReq").addEventListener("click", () => {
      $(".req-empty", $("#ingReqs"))?.remove();
      $("#ingReqs").insertAdjacentHTML("beforeend", requirementLine("ingredient"));
      wireRequirementEditor($("#ingReqs"));
    });
    $("#editorDialog").showModal();
  }

  function collectReqs(container) {
    const out = {};
    $$(".req-line", container).forEach(row => {
      const code = $(".req-code", row).value;
      const qty = Number($(".req-qty", row).value || 0);
      if (code && qty > 0) out[code] = (out[code] || 0) + qty;
    });
    return out;
  }

  function saveRecipeEditor() {
    const name = $("#f-name").value.trim();
    if (!name) { toast("Recipe name is required"); return; }
    const obj = {
      id: currentEditor.id || uid("recipe"),
      name,
      category: $("#f-category").value.trim() || "Other",
      minutes: Math.max(1, Number($("#f-minutes").value || 15)),
      appliance: $("#f-appliance").value.trim(),
      requirement: $("#f-requirement").value.trim(),
      extras: $("#f-extras").value.trim(),
      method: $("#f-method").value.trim(),
      blocks: collectReqs($("#blockReqs")),
      ingredients: collectReqs($("#ingReqs"))
    };
    if (currentEditor.id) {
      const idx = state.recipes.findIndex(r => r.id === currentEditor.id);
      state.recipes[idx] = obj;
    } else state.recipes.push(obj);
    saveState();
    $("#editorDialog").close();
    renderRecipes(); renderPlanner(); renderStockMatches();
    toast(currentEditor.id ? "Recipe updated" : "Recipe added");
  }

  function deleteRecipe(id) {
    const r = recipeById(id);
    if (!r || !confirm(`Delete “${r.name}”?`)) return;
    state.recipes = state.recipes.filter(x => x.id !== id);
    state.week = state.week.map(x => x === id ? null : x);
    saveState(); renderRecipes(); renderPlanner(); renderStockMatches(); toast("Recipe deleted");
  }

  // ----------------------------------------------------------
  // Blocks
  // ----------------------------------------------------------
  $("#addBlockBtn").addEventListener("click", () => openBlockEditor());

  function renderBlocks() {
    $("#blockList").innerHTML = `<div class="entity-list">` + state.blocks.slice().sort((a,b)=>a.code.localeCompare(b.code)).map(b => `
      <div class="entity-row">
        <div class="code">${esc(b.code)}</div>
        <div><strong>${esc(b.name)}</strong><div class="sub">${esc(b.type)} · ${esc(b.planningUnit)}</div></div>
        <div><strong>${esc(b.unitMeans)}</strong><div class="sub">${esc(b.storage)}</div></div>
        <div class="wide">${esc(b.prep)}</div>
        <div class="entity-actions">
          <button class="button secondary small block-edit" data-code="${esc(b.code)}">Edit</button>
          <button class="button secondary small block-delete" data-code="${esc(b.code)}">Delete</button>
        </div>
      </div>`).join("") + `</div>`;
    $$(".block-edit").forEach(b => b.addEventListener("click", () => openBlockEditor(b.dataset.code)));
    $$(".block-delete").forEach(b => b.addEventListener("click", () => deleteBlock(b.dataset.code)));
  }

  function openBlockEditor(code=null) {
    const b = code ? blockByCode(code) : {code:"",type:"",name:"",planningUnit:"1 prep portion",unitMeans:"",prep:"",storage:""};
    currentEditor={type:"block", id:code};
    $("#dialogEyebrow").textContent=code?"Edit prep block":"New prep block";
    $("#dialogTitle").textContent=code?b.name:"Add prep block";
    $("#editorBody").innerHTML=`
      <div class="form-grid">
        <div class="form-field"><label>Code</label><input id="f-code" class="input" value="${esc(b.code)}" ${code?'disabled':''}></div>
        <div class="form-field"><label>Type</label><input id="f-type" class="input" value="${esc(b.type)}"></div>
        <div class="form-field full"><label>Name</label><input id="f-name" class="input" value="${esc(b.name)}"></div>
        <div class="form-field"><label>Planning unit</label><input id="f-planning-unit" class="input" value="${esc(b.planningUnit)}"></div>
        <div class="form-field"><label>1 unit means</label><input id="f-unit-means" class="input" value="${esc(b.unitMeans)}"></div>
        <div class="form-field full"><label>Sunday preparation</label><textarea id="f-prep" class="input">${esc(b.prep)}</textarea></div>
        <div class="form-field full"><label>Storage / use</label><textarea id="f-storage" class="input">${esc(b.storage)}</textarea></div>
      </div>`;
    $("#editorDialog").showModal();
  }

  function saveBlockEditor() {
    const code=(currentEditor.id || $("#f-code").value.trim()).toUpperCase();
    const name=$("#f-name").value.trim();
    if (!code || !name) { toast("Code and name are required"); return; }
    if (!currentEditor.id && blockByCode(code)) { toast("That block code already exists"); return; }
    const obj={code,type:$("#f-type").value.trim(),name,planningUnit:$("#f-planning-unit").value.trim(),
      unitMeans:$("#f-unit-means").value.trim(),prep:$("#f-prep").value.trim(),storage:$("#f-storage").value.trim()};
    if (currentEditor.id) state.blocks[state.blocks.findIndex(b=>b.code===currentEditor.id)] = obj;
    else state.blocks.push(obj);
    saveState(); $("#editorDialog").close(); renderBlocks(); renderPlanner(); toast(currentEditor.id?"Block updated":"Block added");
  }

  function deleteBlock(code) {
    const used = state.recipes.filter(r => Number(r.blocks?.[code] || 0)>0);
    const msg = used.length ? `This block is used by ${used.length} recipe(s). Delete it and remove those references?` : `Delete block ${code}?`;
    if (!confirm(msg)) return;
    state.recipes.forEach(r => { if (r.blocks) delete r.blocks[code]; });
    state.blocks=state.blocks.filter(b=>b.code!==code);
    saveState(); renderBlocks(); renderRecipes(); renderPlanner(); toast("Block deleted");
  }

  // ----------------------------------------------------------
  // Ingredients
  // ----------------------------------------------------------
  $("#addIngredientBtn").addEventListener("click", () => openIngredientEditor());

  function renderIngredients() {
    $("#ingredientList").innerHTML = `<div class="entity-list">` + state.ingredients.slice().sort((a,b)=>a.code.localeCompare(b.code)).map(i => `
      <div class="entity-row">
        <div class="code">${esc(i.code)}</div>
        <div><strong>${esc(i.name)}</strong><div class="sub">${esc(i.type)}</div></div>
        <div><strong>${fmt(i.defaultPack)} ${esc(i.unit)}</strong><div class="sub">typical pack</div></div>
        <div class="wide">Current stock: ${fmt(Number(state.stock[i.code]||0))} ${esc(i.unit)}</div>
        <div class="entity-actions">
          <button class="button secondary small ing-edit" data-code="${esc(i.code)}">Edit</button>
          <button class="button secondary small ing-delete" data-code="${esc(i.code)}">Delete</button>
        </div>
      </div>`).join("") + `</div>`;
    $$(".ing-edit").forEach(b=>b.addEventListener("click",()=>openIngredientEditor(b.dataset.code)));
    $$(".ing-delete").forEach(b=>b.addEventListener("click",()=>deleteIngredient(b.dataset.code)));
  }

  function nextIngredientCode() {
    const nums=state.ingredients.map(i=>Number(String(i.code).replace(/\D/g,""))||0);
    return `I${String(Math.max(0,...nums)+1).padStart(2,"0")}`;
  }

  function openIngredientEditor(code=null) {
    const i=code?ingredientByCode(code):{code:nextIngredientCode(),name:"",unit:"g",defaultPack:0,type:"Fresh protein"};
    currentEditor={type:"ingredient",id:code};
    $("#dialogEyebrow").textContent=code?"Edit ingredient":"New ingredient";
    $("#dialogTitle").textContent=code?i.name:"Add ingredient";
    $("#editorBody").innerHTML=`
      <div class="form-grid">
        <div class="form-field"><label>Code</label><input id="f-code" class="input" value="${esc(i.code)}" ${code?'disabled':''}></div>
        <div class="form-field"><label>Unit</label><input id="f-unit" class="input" value="${esc(i.unit)}" placeholder="g / count / ml / pouches"></div>
        <div class="form-field full"><label>Name</label><input id="f-name" class="input" value="${esc(i.name)}"></div>
        <div class="form-field"><label>Typical retail pack</label><input id="f-pack" class="input" type="number" min="0" step="any" value="${esc(i.defaultPack)}"></div>
        <div class="form-field"><label>Type</label><input id="f-type" class="input" value="${esc(i.type)}" placeholder="Fresh protein"></div>
      </div>`;
    $("#editorDialog").showModal();
  }

  function saveIngredientEditor() {
    const code=(currentEditor.id || $("#f-code").value.trim()).toUpperCase();
    const name=$("#f-name").value.trim();
    if (!code || !name) { toast("Code and name are required"); return; }
    if (!currentEditor.id && ingredientByCode(code)) { toast("That ingredient code already exists"); return; }
    const obj={code,name,unit:$("#f-unit").value.trim()||"g",defaultPack:Math.max(0,Number($("#f-pack").value||0)),type:$("#f-type").value.trim()};
    if (currentEditor.id) state.ingredients[state.ingredients.findIndex(i=>i.code===currentEditor.id)] = obj;
    else { state.ingredients.push(obj); state.stock[code]=0; }
    saveState(); $("#editorDialog").close(); renderIngredients(); renderStock(); toast(currentEditor.id?"Ingredient updated":"Ingredient added");
  }

  function deleteIngredient(code) {
    const used=state.recipes.filter(r=>Number(r.ingredients?.[code]||0)>0);
    const ing=ingredientByCode(code);
    const msg=used.length?`“${ing.name}” is used by ${used.length} recipe(s). Delete it and remove those requirements?`:`Delete “${ing.name}”?`;
    if(!confirm(msg)) return;
    state.recipes.forEach(r=>{if(r.ingredients)delete r.ingredients[code];});
    state.ingredients=state.ingredients.filter(i=>i.code!==code);
    delete state.stock[code];
    saveState(); renderIngredients(); renderStock(); renderRecipes(); renderPlanner(); toast("Ingredient deleted");
  }

  // ----------------------------------------------------------
  // Shared editor save
  // ----------------------------------------------------------
  $("#saveEditorBtn").addEventListener("click", () => {
    if (!currentEditor) return;
    if (currentEditor.type==="recipe") saveRecipeEditor();
    if (currentEditor.type==="block") saveBlockEditor();
    if (currentEditor.type==="ingredient") saveIngredientEditor();
  });

  // ----------------------------------------------------------
  // Data import/export/reset
  // ----------------------------------------------------------
  function exportData() {
    const payload={...state, exportedAt:new Date().toISOString()};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`dinner-lego-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    toast("Backup downloaded");
  }
  $("#exportBtn").addEventListener("click", exportData);
  $("#quickExportBtn").addEventListener("click", exportData);

  $("#importFile").addEventListener("change", async e => {
    const file=e.target.files?.[0];
    if(!file) return;
    try{
      const obj=JSON.parse(await file.text());
      if(!Array.isArray(obj.recipes)||!Array.isArray(obj.blocks)||!Array.isArray(obj.ingredients)) throw new Error("Invalid backup format");
      state=obj;
      state.week=Array.isArray(state.week)?state.week.slice(0,5):[null,null,null,null,null];
      while(state.week.length<5)state.week.push(null);
      state.stock=state.stock||{};
      state.ui=state.ui||{activeTab:"planner"};
      normalizeStateRefs();
      saveState();
      renderAll();
      toast("Backup imported");
    }catch(err){ alert(`Could not import this file: ${err.message}`); }
    e.target.value="";
  });

  $("#resetBtn").addEventListener("click", () => {
    if(!confirm("Reset every recipe, block, ingredient, stock quantity and weekly selection to the original starter data?")) return;
    state=freshState(); saveState(); renderAll(); toast("App reset");
  });

  // ----------------------------------------------------------
  // Initial render
  // ----------------------------------------------------------
  function renderAll() {
    normalizeStateRefs();
    renderPlanner();
    renderStock();
    renderRecipes();
    renderBlocks();
    renderIngredients();
    activateTab(state.ui?.activeTab || "planner");
  }

  renderAll();
})();
