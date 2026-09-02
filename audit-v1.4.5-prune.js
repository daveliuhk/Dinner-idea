(function(){
  "use strict";
  const d=window.DEFAULT_DINNER_DATA;
  if(!d) throw new Error("v1.4.5 prune requires Dinner LEGO data");
  const removeIds=new Set([
    "R018","R064","R095","R100","R109","R110","R111","R116","R117","R123","R125","R126",
    "R133","R135","R136","R137","R138","R140","R141","R142","R143","R144","R161","R163",
    "R182","R184","R185","R186"
  ]);
  d.recipes=d.recipes.filter(r=>!removeIds.has(r.id));
  // P20 no longer has a retained recipe after this review; I065 is likewise unused.
  d.blocks=d.blocks.filter(b=>b.code!=="P20");
  d.ingredients=d.ingredients.filter(i=>i.code!=="I065");
  const usage={};
  d.recipes.forEach(r=>Object.entries(r.blocks||{}).forEach(([c,q])=>{if(Number(q)>0)usage[c]=(usage[c]||0)+1;}));
  d.blocks.forEach(b=>b.usageCount=usage[b.code]||0);
  d.meta=d.meta||{};
  d.meta.dataVersion="v1.4.5-user-recipe-prune";
  d.meta.recipeCount=d.recipes.length;
  d.meta.blockCount=d.blocks.length;
  d.meta.ingredientCount=d.ingredients.length;
  d.meta.recipePrune="Removed 28 recipes after manual review. Removed now-unused P20 breaded-fish block and I065 cooked-lentils ingredient. New recipe ideas are being reviewed separately before addition.";
})();
