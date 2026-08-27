(function(){
  "use strict";
  const KEY="dinner-lego-planner-v1";
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  let stockCategory="";
  let stockQuery="";
  let pending=false;
  let dataCache=null;

  function readData(){
    try{const x=JSON.parse(localStorage.getItem(KEY));if(x&&Array.isArray(x.recipes))return x;}catch(e){}
    return window.DEFAULT_DINNER_DATA||{recipes:[],ingredients:[],blocks:[]};
  }
  function data(){return dataCache||readData();}
  function recipeById(id){return data().recipes.find(r=>r.id===id);}
  function inferIngredient(i){
    const n=(i?.name||"").toLowerCase(),t=(i?.type||"").toLowerCase();
    if(/chicken|beef|lamb|pork|turkey|sausage|bacon|duck|meatball/.test(n))return"Meat & poultry";
    if(/fish|salmon|prawn|tuna|seafood/.test(n))return"Fish & seafood";
    if(/tofu|halloumi/.test(n))return"Vegetarian proteins";
    if(/vegetable|veg|mushroom|spinach|pea|slaw|sweetcorn|pepper|courgette|broccoli|bean/.test(n))return"Vegetables";
    if(/pasta|rice|noodle|udon|orzo|couscous|potato|gnocchi|tortellini|wrap|pitta/.test(n))return"Carbs & grains";
    if(/cheese|yoghurt|egg|crème|cream/.test(n))return"Dairy & eggs";
    if(/sauce|pesto|teriyaki|hoisin|curry|gravy|romesco|chimichurri|korma|satay|mustard/.test(n))return"Sauces & freezer blocks";
    if(/lemon|apple|orange|lime/.test(n))return"Fruit & flavourings";
    if(/cupboard|tin|pantry/.test(t))return"Pantry & tins";
    return i?.type||"Other";
  }
  function ingredientCategory(code){
    const i=data().ingredients.find(x=>x.code===code)||window.DEFAULT_DINNER_DATA?.ingredients?.find(x=>x.code===code);
    return i?.category||window.DINNER_CATALOG?.ingredientCategories?.[code]||inferIngredient(i);
  }
  function blockCategory(code,row){
    const b=data().blocks.find(x=>x.code===code)||window.DEFAULT_DINNER_DATA?.blocks?.find(x=>x.code===code);
    if(b?.category)return b.category;
    const k=window.DINNER_CATALOG?.blockCategories?.[code]; if(k)return k;
    if(code?.startsWith("A"))return"Aromatics";
    if(code?.startsWith("V"))return"Vegetables";
    if(code?.startsWith("S")&&code!=="S5")return"Sauces & marinades";
    if(code==="S5")return"Dairy";
    if(code==="C1")return"Carb prep";
    if(code==="C2")return"Protein prep";
    return b?.type||row?.querySelector(".sub")?.textContent?.split("·")[0]?.trim()||"Other";
  }

  function nutrition(r){
    const table=window.DINNER_CATALOG?.nutrition||{}, divisor=Number(window.DINNER_CATALOG?.portionDivisor||2.75);
    const t={kcal:0,p:0,c:0,f:0};
    Object.entries(r?.ingredients||{}).forEach(([code,q])=>{const n=table[code];if(!n)return;t.kcal+=q*n.kcal;t.p+=q*n.p;t.c+=q*n.c;t.f+=q*n.f;});
    return{kcal:Math.round(t.kcal/divisor/10)*10,p:Math.round(t.p/divisor),c:Math.round(t.c/divisor),f:Math.round(t.f/divisor)};
  }
  function addNutrition(card,r,anchor){
    if(!card||!r||card.querySelector(".v13-nutrition"))return;
    const n=nutrition(r),el=document.createElement("div");
    el.className="nutrition-row v13-nutrition";
    el.title="Estimated per adult-equivalent serving: family recipe total divided by 2.75. Brands, optional extras and cooking oil may not be fully captured.";
    el.innerHTML=`<span class="nutrition-kcal">~${n.kcal} kcal</span><span>P ${n.p}g</span><span>C ${n.c}g</span><span>F ${n.f}g</span>`;
    if(anchor?.parentNode)anchor.parentNode.insertBefore(el,anchor.nextSibling);else card.appendChild(el);
  }
  function enhanceWeek(){
    $$("#weekGrid .day-card").forEach(card=>{const sel=card.querySelector(".day-select"),r=recipeById(sel?.value);if(r)addNutrition(card,r,card.querySelector(".recipe-mini .meta"));});
  }
  function enhanceMatches(){
    $$("#recipeMatches .match-card").forEach(card=>{const id=card.querySelector(".add-match")?.dataset.id,r=recipeById(id);if(r)addNutrition(card,r,card.querySelector(".match-details"));});
  }
  function groupRecipes(){
    const root=$("#recipeList"); if(!root)return;
    const cards=[...root.children].filter(x=>x.classList.contains("recipe-card"));
    if(!cards.length){
      $$(".recipe-card",root).forEach(card=>{const r=recipeById(card.querySelector(".recipe-edit")?.dataset.id);if(r)addNutrition(card,r,card.querySelector(".meta"));});
      return;
    }
    const groups=new Map();
    cards.forEach(card=>{const r=recipeById(card.querySelector(".recipe-edit")?.dataset.id);if(r)addNutrition(card,r,card.querySelector(".meta"));const c=r?.category||"Other";if(!groups.has(c))groups.set(c,[]);groups.get(c).push(card);});
    const frag=document.createDocumentFragment();
    [...groups.keys()].sort().forEach(c=>{const sec=document.createElement("section"),head=document.createElement("div"),grid=document.createElement("div");sec.className="category-section";head.className="group-heading-row";head.innerHTML=`<h3 class="group-heading">${esc(c)}</h3><span class="group-count">${groups.get(c).length} recipes</span>`;grid.className="recipe-grid";groups.get(c).sort((a,b)=>a.querySelector("h3").textContent.localeCompare(b.querySelector("h3").textContent)).forEach(x=>grid.appendChild(x));sec.append(head,grid);frag.appendChild(sec);});
    root.replaceChildren(frag);
  }
  function groupEntities(rootSel,kind){
    const root=$(rootSel); if(!root)return;
    const list=[...root.children].find(x=>x.classList.contains("entity-list")); if(!list)return;
    const rows=[...list.children].filter(x=>x.classList.contains("entity-row")); if(!rows.length)return;
    const groups=new Map();
    rows.forEach(row=>{const code=row.querySelector(".code")?.textContent?.trim(),c=kind==="block"?blockCategory(code,row):ingredientCategory(code);if(!groups.has(c))groups.set(c,[]);groups.get(c).push(row);});
    const frag=document.createDocumentFragment();
    [...groups.keys()].sort().forEach(c=>{const sec=document.createElement("section"),head=document.createElement("div"),list2=document.createElement("div");sec.className="category-section";head.className="group-heading-row";head.innerHTML=`<h3 class="group-heading">${esc(c)}</h3><span class="group-count">${groups.get(c).length} ${kind==="block"?"blocks":"items"}</span>`;list2.className="entity-list";groups.get(c).forEach(x=>list2.appendChild(x));sec.append(head,list2);frag.appendChild(sec);});
    root.replaceChildren(frag);
  }

  function resetStockSelect(){
    const sel=$("#stockTypeFilter"); if(!sel)return;
    const cats=[...new Set(data().ingredients.map(i=>i.category||ingredientCategory(i.code)))].sort();
    sel.innerHTML=`<option value="">All categories</option>`+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
    sel.value=cats.includes(stockCategory)?stockCategory:"";
  }
  function groupStock(){
    const root=$("#stockInputs"); if(!root)return;
    const rows=[...root.children].filter(x=>x.classList.contains("stock-row"));
    if(rows.length){
      const groups=new Map();
      rows.forEach(row=>{const code=row.querySelector(".stock-qty")?.dataset.code,c=ingredientCategory(code);if(!groups.has(c))groups.set(c,[]);groups.get(c).push(row);});
      const frag=document.createDocumentFragment();
      [...groups.keys()].sort().forEach(c=>{const sec=document.createElement("section"),h=document.createElement("h4");sec.className="stock-category-group";sec.dataset.category=c;h.className="group-heading compact";h.textContent=c;sec.appendChild(h);groups.get(c).sort((a,b)=>a.querySelector(".stock-name strong").textContent.localeCompare(b.querySelector(".stock-name strong").textContent)).forEach(x=>sec.appendChild(x));frag.appendChild(sec);});
      root.replaceChildren(frag);
    }
    applyStockFilter();
  }
  function applyStockFilter(){
    $$("#stockInputs .stock-category-group").forEach(sec=>{
      let visible=0;
      $$(".stock-row",sec).forEach(row=>{const txt=row.textContent.toLowerCase(),show=(!stockQuery||txt.includes(stockQuery))&&(!stockCategory||sec.dataset.category===stockCategory);row.hidden=!show;if(show)visible++;});
      sec.hidden=visible===0;
    });
  }

  function renderSauces(){
    const root=$("#sauceList");if(!root)return;
    dataCache=readData();
    const q=($("#sauceSearch")?.value||"").toLowerCase();
    const sauces=(window.DINNER_CATALOG?.sauces||[]).filter(s=>!q||[s.code,s.name,...(s.ingredients||[])].join(" ").toLowerCase().includes(q));
    root.innerHTML=sauces.map(s=>{const uses=data().recipes.filter(r=>Number(r.blocks?.[s.code]||0)>0).sort((a,b)=>a.name.localeCompare(b.name));return `<article class="sauce-card card"><div class="sauce-card-head"><div><div class="eyebrow">${esc(s.code)}</div><h3>${esc(s.name)}</h3></div><span class="chip">${uses.length} recipes</span></div><div class="sauce-yield">${esc(s.yield)}</div><div class="sauce-columns"><div><h4>Batch ingredients</h4><ul>${s.ingredients.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div><div><h4>Method</h4><ol>${s.steps.map(x=>`<li>${esc(x)}</li>`).join("")}</ol></div></div><div class="sauce-storage"><strong>Storage/use:</strong> ${esc(s.storage)}</div><details class="sauce-uses"><summary>Recipes using ${esc(s.code)}</summary><div class="use-chips">${uses.map(r=>`<button class="chip sauce-recipe-link" data-id="${esc(r.id)}" type="button">${esc(r.name)}</button>`).join("")||'<span class="muted">No recipes currently use this sauce.</span>'}</div></details></article>`;}).join("")||'<div class="empty">No sauces match.</div>';
    dataCache=null;
  }

  function enhanceAll(){
    pending=false; dataCache=readData();
    enhanceWeek(); enhanceMatches(); groupRecipes(); groupEntities("#blockList","block"); groupEntities("#ingredientList","ingredient"); resetStockSelect(); groupStock();
    dataCache=null;
  }
  function schedule(){if(pending)return;pending=true;requestAnimationFrame(enhanceAll);}

  $("#stockTypeFilter")?.addEventListener("change",e=>{e.stopImmediatePropagation();stockCategory=e.target.value;applyStockFilter();},true);
  $("#stockSearch")?.addEventListener("input",e=>{e.stopImmediatePropagation();stockQuery=(e.target.value||"").toLowerCase();applyStockFilter();},true);
  $("#sauceSearch")?.addEventListener("input",renderSauces);

  document.addEventListener("click",e=>{
    if(e.target.closest('[data-tab="sauces"]')){setTimeout(renderSauces,0);return;}
    const link=e.target.closest(".sauce-recipe-link");
    if(link){const r=recipeById(link.dataset.id);document.querySelector('[data-tab="recipes"]')?.click();const search=$("#recipeSearch");if(search&&r){search.value=r.name;search.dispatchEvent(new Event("input",{bubbles:true}));}return;}
    schedule();
  });
  document.addEventListener("change",e=>{if(e.target.id!=="stockTypeFilter")schedule();});
  document.addEventListener("input",e=>{if(e.target.id!=="stockSearch"&&e.target.id!=="sauceSearch")schedule();});

  renderSauces(); enhanceAll();
})();