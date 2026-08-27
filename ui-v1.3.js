(function(){
  "use strict";
  const KEY = "dinner-lego-planner-v1";
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  let stockCategory = "";
  let scheduled = false;

  function currentData(){
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && Array.isArray(saved.recipes)) return saved;
    } catch(e) {}
    return window.DEFAULT_DINNER_DATA || {recipes:[],ingredients:[],blocks:[]};
  }
  function recipeById(id){ return currentData().recipes.find(r => r.id === id); }
  function inferIngredient(i){
    const n=(i?.name||"").toLowerCase(), t=(i?.type||"").toLowerCase();
    if(/chicken|beef|lamb|pork|turkey|sausage|bacon|duck|meatball/.test(n)) return "Meat & poultry";
    if(/fish|salmon|prawn|tuna|seafood/.test(n)) return "Fish & seafood";
    if(/tofu|halloumi/.test(n)) return "Vegetarian proteins";
    if(/vegetable|veg|mushroom|spinach|pea|slaw|sweetcorn|pepper|courgette|broccoli|bean/.test(n)) return "Vegetables";
    if(/pasta|rice|noodle|udon|orzo|couscous|potato|gnocchi|tortellini|wrap|pitta/.test(n)) return "Carbs & grains";
    if(/cheese|yoghurt|egg|crème|cream/.test(n)) return "Dairy & eggs";
    if(/sauce|pesto|teriyaki|hoisin|curry|gravy|romesco|chimichurri|korma|satay|mustard/.test(n)) return "Sauces & freezer blocks";
    if(/lemon|apple|orange|lime/.test(n)) return "Fruit & flavourings";
    if(/cupboard|tin|pantry/.test(t)) return "Pantry & tins";
    return i?.type || "Other";
  }
  function categoryForIngredient(code){
    const data=currentData();
    const i=data.ingredients.find(x=>x.code===code) || window.DEFAULT_DINNER_DATA?.ingredients?.find(x=>x.code===code);
    return i?.category || window.DINNER_CATALOG?.ingredientCategories?.[code] || inferIngredient(i);
  }
  function categoryForBlock(code, row){
    const data=currentData();
    const b=data.blocks.find(x=>x.code===code) || window.DEFAULT_DINNER_DATA?.blocks?.find(x=>x.code===code);
    if(b?.category) return b.category;
    const known=window.DINNER_CATALOG?.blockCategories?.[code];
    if(known) return known;
    if(code?.startsWith("A")) return "Aromatics";
    if(code?.startsWith("V")) return "Vegetables";
    if(code?.startsWith("S") && code!=="S5") return "Sauces & marinades";
    if(code==="S5") return "Dairy";
    if(code==="C1") return "Carb prep";
    if(code==="C2") return "Protein prep";
    return b?.type || row?.querySelector(".sub")?.textContent?.split("·")[0]?.trim() || "Other";
  }

  function nutrition(recipe){
    const table=window.DINNER_CATALOG?.nutrition || {};
    const divisor=Number(window.DINNER_CATALOG?.portionDivisor || 2.75);
    const t={kcal:0,p:0,c:0,f:0};
    Object.entries(recipe?.ingredients || {}).forEach(([code,q])=>{
      const n=table[code]; if(!n) return;
      t.kcal+=Number(q)*Number(n.kcal||0);
      t.p+=Number(q)*Number(n.p||0);
      t.c+=Number(q)*Number(n.c||0);
      t.f+=Number(q)*Number(n.f||0);
    });
    return {
      kcal:Math.round(t.kcal/divisor/10)*10,
      p:Math.round(t.p/divisor),
      c:Math.round(t.c/divisor),
      f:Math.round(t.f/divisor)
    };
  }
  function nutritionNode(recipe){
    const n=nutrition(recipe);
    const div=document.createElement("div");
    div.className="nutrition-row v13-nutrition";
    div.title="Estimated per adult-equivalent serving: family recipe total divided by 2.75. Optional extras, brands and cooking oil may not be fully captured.";
    div.innerHTML=`<span class="nutrition-kcal">~${n.kcal} kcal</span><span>P ${n.p}g</span><span>C ${n.c}g</span><span>F ${n.f}g</span>`;
    return div;
  }
  function addNutrition(card, recipe, anchor){
    if(!card || !recipe || card.querySelector(".v13-nutrition")) return;
    const node=nutritionNode(recipe);
    if(anchor?.parentNode) anchor.parentNode.insertBefore(node, anchor.nextSibling);
    else card.appendChild(node);
  }

  function enhanceWeek(){
    $$("#weekGrid .day-card").forEach(card=>{
      const sel=card.querySelector("select.day-select");
      const r=recipeById(sel?.value);
      if(r) addNutrition(card,r,card.querySelector(".recipe-mini .meta"));
    });
  }
  function enhanceMatches(){
    $$("#recipeMatches .match-card").forEach(card=>{
      const id=card.querySelector(".add-match")?.dataset.id;
      const r=recipeById(id);
      if(r) addNutrition(card,r,card.querySelector(".match-details"));
    });
  }
  function enhanceRecipes(){
    const root=$("#recipeList"); if(!root) return;
    const direct=[...root.children].filter(x=>x.classList.contains("recipe-card"));
    if(!direct.length){
      $$(".recipe-card",root).forEach(card=>{
        const id=card.querySelector(".recipe-edit")?.dataset.id;
        const r=recipeById(id);
        if(r) addNutrition(card,r,card.querySelector(".meta"));
      });
      return;
    }
    const groups=new Map();
    direct.forEach(card=>{
      const id=card.querySelector(".recipe-edit")?.dataset.id;
      const r=recipeById(id);
      if(r) addNutrition(card,r,card.querySelector(".meta"));
      const cat=r?.category || "Other";
      if(!groups.has(cat)) groups.set(cat,[]);
      groups.get(cat).push(card);
    });
    const frag=document.createDocumentFragment();
    [...groups.keys()].sort().forEach(cat=>{
      const section=document.createElement("section");
      section.className="category-section";
      const head=document.createElement("div");
      head.className="group-heading-row";
      head.innerHTML=`<h3 class="group-heading">${esc(cat)}</h3><span class="group-count">${groups.get(cat).length} recipes</span>`;
      const grid=document.createElement("div");
      grid.className="recipe-grid";
      groups.get(cat).sort((a,b)=>a.querySelector("h3").textContent.localeCompare(b.querySelector("h3").textContent)).forEach(x=>grid.appendChild(x));
      section.append(head,grid);
      frag.appendChild(section);
    });
    root.replaceChildren(frag);
  }
  function enhanceEntities(rootSel, kind){
    const root=$(rootSel); if(!root) return;
    const list=[...root.children].find(x=>x.classList.contains("entity-list"));
    if(!list) return;
    const rows=[...list.children].filter(x=>x.classList.contains("entity-row"));
    if(!rows.length) return;
    const groups=new Map();
    rows.forEach(row=>{
      const code=row.querySelector(".code")?.textContent?.trim();
      const cat=kind==="block" ? categoryForBlock(code,row) : categoryForIngredient(code);
      if(!groups.has(cat)) groups.set(cat,[]);
      groups.get(cat).push(row);
    });
    const frag=document.createDocumentFragment();
    [...groups.keys()].sort().forEach(cat=>{
      const section=document.createElement("section");
      section.className="category-section";
      const head=document.createElement("div");
      head.className="group-heading-row";
      head.innerHTML=`<h3 class="group-heading">${esc(cat)}</h3><span class="group-count">${groups.get(cat).length} ${kind==="block"?"blocks":"items"}</span>`;
      const l=document.createElement("div");
      l.className="entity-list";
      groups.get(cat).forEach(x=>l.appendChild(x));
      section.append(head,l);
      frag.appendChild(section);
    });
    root.replaceChildren(frag);
  }

  function regroupStock(){
    const root=$("#stockInputs"); if(!root) return;
    const direct=[...root.children].filter(x=>x.classList.contains("stock-row"));
    if(direct.length){
      const groups=new Map();
      direct.forEach(row=>{
        const code=row.querySelector(".stock-qty")?.dataset.code;
        const cat=categoryForIngredient(code);
        if(!groups.has(cat)) groups.set(cat,[]);
        groups.get(cat).push(row);
      });
      const frag=document.createDocumentFragment();
      [...groups.keys()].sort().forEach(cat=>{
        const sec=document.createElement("section");
        sec.className="stock-category-group";
        sec.dataset.category=cat;
        const h=document.createElement("h4");
        h.className="group-heading compact";
        h.textContent=cat;
        sec.appendChild(h);
        groups.get(cat).sort((a,b)=>a.querySelector(".stock-name strong").textContent.localeCompare(b.querySelector(".stock-name strong").textContent)).forEach(x=>sec.appendChild(x));
        frag.appendChild(sec);
      });
      root.replaceChildren(frag);
    }
    $$("#stockInputs .stock-category-group").forEach(sec=>{
      sec.hidden=!!stockCategory && sec.dataset.category!==stockCategory;
    });
  }
  function resetStockCategorySelect(){
    const sel=$("#stockTypeFilter"); if(!sel) return;
    const cats=[...new Set(currentData().ingredients.map(i=>i.category || categoryForIngredient(i.code)))].sort();
    const html=`<option value="">All categories</option>`+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
    if(sel.innerHTML !== html) sel.innerHTML=html;
    sel.value=cats.includes(stockCategory)?stockCategory:"";
  }
  function wireStockFilter(){
    const sel=$("#stockTypeFilter"); if(!sel || sel.dataset.v13wired) return;
    sel.dataset.v13wired="1";
    sel.addEventListener("change",e=>{
      e.stopImmediatePropagation();
      stockCategory=e.target.value;
      regroupStock();
    },true);
  }

  function renderSauces(){
    const root=$("#sauceList"); if(!root) return;
    const q=($("#sauceSearch")?.value||"").toLowerCase();
    const data=currentData();
    const sauces=(window.DINNER_CATALOG?.sauces||[]).filter(s=>!q || [s.code,s.name,...(s.ingredients||[])].join(" ").toLowerCase().includes(q));
    root.innerHTML=sauces.map(s=>{
      const uses=data.recipes.filter(r=>Number(r.blocks?.[s.code]||0)>0).sort((a,b)=>a.name.localeCompare(b.name));
      return `<article class="sauce-card card"><div class="sauce-card-head"><div><div class="eyebrow">${esc(s.code)}</div><h3>${esc(s.name)}</h3></div><span class="chip">${uses.length} recipes</span></div><div class="sauce-yield">${esc(s.yield)}</div><div class="sauce-columns"><div><h4>Batch ingredients</h4><ul>${s.ingredients.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div><div><h4>Method</h4><ol>${s.steps.map(x=>`<li>${esc(x)}</li>`).join("")}</ol></div></div><div class="sauce-storage"><strong>Storage/use:</strong> ${esc(s.storage)}</div><details class="sauce-uses"><summary>Recipes using ${esc(s.code)}</summary><div class="use-chips">${uses.map(r=>`<button class="chip sauce-recipe-link" data-id="${esc(r.id)}" type="button">${esc(r.name)}</button>`).join("")||'<span class="muted">No recipes currently use this sauce.</span>'}</div></details></article>`;
    }).join("") || '<div class="empty">No sauces match.</div>';
    $$(".sauce-recipe-link",root).forEach(b=>b.addEventListener("click",()=>{
      document.querySelector('[data-tab="recipes"]')?.click();
      const r=recipeById(b.dataset.id);
      const search=$("#recipeSearch");
      if(search&&r){
        search.value=r.name;
        search.dispatchEvent(new Event("input",{bubbles:true}));
      }
    }));
  }

  function enhanceAll(){
    scheduled=false;
    enhanceWeek();
    enhanceMatches();
    enhanceRecipes();
    enhanceEntities("#blockList","block");
    enhanceEntities("#ingredientList","ingredient");
    resetStockCategorySelect();
    wireStockFilter();
    regroupStock();
  }
  function scheduleEnhance(){
    if(scheduled) return;
    scheduled=true;
    requestAnimationFrame(enhanceAll);
  }

  const observer=new MutationObserver(scheduleEnhance);
  ["weekGrid","recipeMatches","recipeList","blockList","ingredientList","stockInputs"].forEach(id=>{
    const el=document.getElementById(id);
    if(el) observer.observe(el,{childList:true,subtree:true});
  });

  $("#sauceSearch")?.addEventListener("input",renderSauces);
  document.querySelector('[data-tab="sauces"]')?.addEventListener("click",renderSauces);
  renderSauces();
  enhanceAll();
})();
