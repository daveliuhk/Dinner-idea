(function(){
  "use strict";
  const KEY="dinner-lego-planner-v1";
  try{
    const d=window.DEFAULT_DINNER_DATA;if(!d)return;
    const raw=localStorage.getItem(KEY);if(!raw)return;
    const old=JSON.parse(raw);
    if(old?.meta?.dataVersion===d?.meta?.dataVersion)return;
    const norm=s=>String(s||"").toLowerCase().normalize("NFKD").replace(/[^\w]+/g," ").trim();
    const next=JSON.parse(JSON.stringify(d));
    const oldIngs=Array.isArray(old?.ingredients)?old.ingredients:[],oldStock=old?.stock||{};
    const oldByCode=new Map(oldIngs.map(i=>[i.code,i])),oldByName=new Map(oldIngs.map(i=>[norm(i.name),i]));
    next.stock={};
    next.ingredients.forEach(i=>{const oi=oldByCode.get(i.code)||oldByName.get(norm(i.name));next.stock[i.code]=oi?Number(oldStock[oi.code]||0):0;});
    const ids=new Set(next.recipes.map(r=>r.id)),oldRecipes=new Map((old?.recipes||[]).map(r=>[r.id,r])),newByName=new Map(next.recipes.map(r=>[norm(r.name),r]));
    next.week=(Array.isArray(old?.week)?old.week.slice(0,5):[]).map(id=>ids.has(id)?id:(newByName.get(norm(oldRecipes.get(id)?.name))?.id||null));
    while(next.week.length<5)next.week.push(null);
    next.ui=old?.ui||{activeTab:"planner"};
    next.schemaVersion=4;
    localStorage.setItem(KEY,JSON.stringify(next));
  }catch(e){console.warn("Dinner v1.4.5 migration skipped",e);}
})();
