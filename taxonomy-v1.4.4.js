(function(){
"use strict";
const T={};
const uniq=a=>[...new Set((a||[]).filter(Boolean))];
const txt=r=>[r.name,r.legacyCategory||r.category,r.appliance,r.requirement,r.extras,r.method].join(" ").toLowerCase();
const has=(obj,codes)=>{const s=new Set(Object.keys(obj||{}));return codes.some(c=>s.has(c));};
const proteinRules=[
  ["Chicken",["I001","I002","I003","I004","I005"],["P01","P03","P04","P05","P06"]],
  ["Beef",["I006","I007","I008"],["P07","P08","P09","P10"]],
  ["Pork",["I009","I010","I011","I012"],["P11","P13","P14"]],
  ["Lamb",["I013","I014","I015","I016"],["P16","P17","P18"]],
  ["Duck",["I017"],["P24"]],
  ["Fish",["I020","I021","I023"],["P20"]],
  ["Prawns / seafood",["I022"],[]]
];
const vegetarianCodes=["I024","I025","I026","I027","I063","I064","I065","I068"];
const carbRules=[
  ["Rice",["I031"],[]],
  ["Noodles",["I032"],[]],
  ["Pasta",["I028"],[]],
  ["Orzo",["I030"],["C04"]],
  ["Gnocchi",["I029"],[]],
  ["Couscous",["I033"],[]],
  ["Potatoes",["I035","I036"],["C01","C02","C03"]],
  ["Wraps / tortillas",["I037"],[]],
  ["Flatbreads / pittas",["I038"],[]],
  ["Bread / buns",["I039"],[]]
];
T.classify=function(r){
  const text=txt(r), proteins=[];
  // Mixed-use P02 is chicken or pork depending on the actual recipe.
  if((r.blocks||{}).P02){ proteins.push(/pork|schnitzel.*pork|pork.*cutlet/.test(text)?"Pork":"Chicken"); }
  if((r.blocks||{}).P22){ proteins.push("Beef","Pork"); }
  proteinRules.forEach(([name,ings,blocks])=>{if(has(r.ingredients,ings)||has(r.blocks,blocks))proteins.push(name);});
  let protein=uniq(proteins);
  if(!protein.length && (has(r.ingredients,vegetarianCodes)||/mushroom|halloumi|paneer|aubergine|vegetarian|mac & cheese|gnocchi|peanut/.test(text))) protein=["Vegetarian"];
  if(!protein.length) protein=["Vegetarian"];

  const carbs=[];
  carbRules.forEach(([name,ings,blocks])=>{if(has(r.ingredients,ings)||has(r.blocks,blocks))carbs.push(name);});
  let carb=uniq(carbs);
  if(!carb.length) carb=(has(r.ingredients,["I063","I064","I065"])?["Beans / legumes"]:["No main starch"]);

  const methods=[];
  const appliance=String(r.appliance||"").toLowerCase(), legacy=String(r.legacyCategory||r.category||"").toLowerCase(), method=String(r.method||"").toLowerCase();
  if(appliance.includes("air fryer")||method.includes("air-fry")||method.includes("air fry")) methods.push("Air fryer");
  if(appliance.includes("oven")||method.includes("oven")||method.includes("grill")||legacy.includes("traybake")||legacy.includes("roast")) methods.push("Oven / grill");
  if(appliance.includes("hob")||method.includes("pan")||method.includes("sear")||method.includes("fry")||method.includes("poach")||method.includes("simmer")) methods.push("Hob / pan");
  if(legacy.includes("stir-fr")||method.includes("stir-fry")||method.includes("stir fry")||method.includes("wok")) methods.push("Stir-fry");
  if(appliance.includes("microwave")||method.includes("microwave")) methods.push("Microwave assist");
  if((r.blocks||{}).P10||(r.blocks||{}).P18||/slow-cook|slow cook|pressure-cook|pressure cook/.test(text)) methods.push("Slow-cook / pressure prep");
  if(!methods.length) methods.push("Hob / pan");

  const primaryProtein=protein.length===1?protein[0]:protein.join(" & ");
  const keywords=uniq([
    ...protein,...carb,...methods,
    r.legacyCategory||r.category,
    ...(text.match(/\b(curry|pesto|tomato|teriyaki|miso|hoisin|lemon|garlic|mushroom|peanut|coconut|honey-mustard|meatball|burger|taco|wrap|traybake|stew|pie)\b/g)||[])
  ]).map(x=>String(x).trim()).filter(Boolean);
  return {protein,primaryProtein,carb,method:uniq(methods),keywords};
};
T.applyToRecipes=function(recipes){
  let changed=false;
  (recipes||[]).forEach(r=>{
    if(!r.legacyCategory) r.legacyCategory=r.category||"Other";
    let tags;
    if(r.taxonomyManual===true && r.tags?.protein?.length){
      const primary=r.tags.primaryProtein||r.tags.protein.join(" & ")||"Other";
      r.tags.primaryProtein=primary;
      r.keywords=uniq(r.keywords||r.tags.keywords||[]);
      r.tags.keywords=r.keywords;
      tags=r.tags;
    } else {
      tags=T.classify(r);
      r.tags=tags;
      r.keywords=tags.keywords;
    }
    const primary=tags.primaryProtein||tags.protein?.join(" & ")||"Other";
    if(r.category!==primary){r.category=primary;changed=true;}
    const baseExtras=String(r.extras||"").replace(/\s*⟦Tags:[^⟧]*⟧\s*$/i,"").trim();
    const searchTags=uniq([...(tags.protein||[]),...(tags.carb||[]),...(tags.method||[]),...(r.keywords||[])]);
    const nextExtras=(baseExtras?baseExtras+" ":"")+`⟦Tags: ${searchTags.join(" | ")}⟧`;
    if(r.extras!==nextExtras){r.extras=nextExtras;changed=true;}
  });
  return changed;
};
T.applyState=function(state){
  if(!state||!Array.isArray(state.recipes))return false;
  const changed=T.applyToRecipes(state.recipes);
  state.meta=state.meta||{};
  if(state.meta.dataVersion!=="v1.4.4-recipe-taxonomy"){state.meta.dataVersion="v1.4.4-recipe-taxonomy";return true;}
  return changed;
};
window.DinnerRecipeTaxonomy=T;
if(window.DEFAULT_DINNER_DATA){T.applyToRecipes(window.DEFAULT_DINNER_DATA.recipes);window.DEFAULT_DINNER_DATA.meta=window.DEFAULT_DINNER_DATA.meta||{};window.DEFAULT_DINNER_DATA.meta.dataVersion="v1.4.4-recipe-taxonomy";}
try{
  const KEY="dinner-lego-planner-v1",raw=localStorage.getItem(KEY);
  if(raw){const saved=JSON.parse(raw);if(saved&&Array.isArray(saved.recipes)){if(T.applyState(saved))localStorage.setItem(KEY,JSON.stringify(saved));}}
}catch(e){console.warn("Dinner v1.4.4 taxonomy migration skipped",e);}
})();
