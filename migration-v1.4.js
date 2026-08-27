(function(){
"use strict";
const KEY="dinner-lego-planner-v1";
try{
  const d=window.DEFAULT_DINNER_DATA;
  if(!d)return;
  const raw=localStorage.getItem(KEY);
  if(!raw)return;
  const old=JSON.parse(raw);
  if(old?.schemaVersion===4 && old?.meta?.dataVersion===d?.meta?.dataVersion)return;

  const norm=s=>String(s||"").toLowerCase().normalize("NFKD").replace(/[^\w]+/g," ").trim();
  const oldIngredients=Array.isArray(old?.ingredients)?old.ingredients:[];
  const oldStock=old?.stock||{};
  const oldByNorm=new Map(oldIngredients.map(i=>[norm(i.name),i]));
  const aliases={
    "chicken breast":["chicken"],
    "boneless chicken thigh":["chicken"],
    "bone in chicken thigh":["chicken"],
    "chicken drumsticks":["chicken"],
    "chicken wings":["chicken"],
    "salmon fillets":["salmon"],
    "pork sausages":["sausages"],
    "white fish fillets":["white fish"],
    "pork tenderloin loin":["pork"],
    "potatoes":["baby potatoes"],
    "dry pasta":["dry pasta spaghetti macaroni"],
    "quick noodles udon":["quick noodles udon"],
    "wraps tortillas":["wraps pittas"],
    "flatbreads pittas":["wraps pittas"],
    "greek yoghurt":["greek yoghurt"],
    "creme fraiche cream":["crème fraîche","creme fraiche"],
    "tinned tuna":["tinned tuna"],
    "sweetcorn":["sweetcorn"],
    "halloumi":["halloumi"],
    "turkey mince":["turkey mince"],
    "beef mince":["beef mince"],
    "lamb mince":["lamb mince"],
    "prawns":["prawns"],
    "mushrooms":["mushrooms"],
    "frozen peas":["frozen peas spinach"],
    "spinach":["frozen peas spinach"],
    "cheddar grated cheese":["grated cheese"]
  };
  const newStock={};
  (d.ingredients||[]).forEach(i=>{
    let oldIng=oldByNorm.get(norm(i.name));
    if(!oldIng){
      for(const a of aliases[norm(i.name)]||[]){oldIng=oldByNorm.get(norm(a));if(oldIng)break;}
    }
    newStock[i.code]=oldIng?Number(oldStock[oldIng.code]||0):0;
  });

  const oldRecipes=Array.isArray(old?.recipes)?old.recipes:[];
  const oldRecipeById=new Map(oldRecipes.map(r=>[r.id,r]));
  const newRecipeByName=new Map((d.recipes||[]).map(r=>[norm(r.name),r]));
  const oldWeek=Array.isArray(old?.week)?old.week.slice(0,5):[];
  const newWeek=oldWeek.map(id=>{
    const name=oldRecipeById.get(id)?.name;
    return name && newRecipeByName.get(norm(name))?.id || null;
  });
  while(newWeek.length<5)newWeek.push(null);

  const next=JSON.parse(JSON.stringify(d));
  next.week=newWeek;
  next.stock=newStock;
  next.ui=old?.ui||{activeTab:"planner"};
  localStorage.setItem(KEY,JSON.stringify(next));
}catch(e){console.warn("Dinner v1.4 migration skipped",e);}
})();
