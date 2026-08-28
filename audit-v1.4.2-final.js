(function(){
  "use strict";
  const {d,cat,byId,corePantry,beforeIngredients}=window.DinnerV142;
  d.ingredients=d.ingredients.filter(i=>!["I019","I027","I040"].includes(i.code));
  const peanuts=d.ingredients.find(i=>i.code==="I068");if(peanuts)peanuts.name="Peanut butter / peanuts";
  const currentBlocks=new Map(d.blocks.map(b=>[b.code,b]));
  const usage={};
  d.recipes.forEach(r=>{const codes=Object.keys(r.blocks||{}).filter(c=>Number(r.blocks[c]||0)>0);codes.forEach(c=>usage[c]=(usage[c]||0)+1);r.blockGuide=codes.length?codes.map(c=>`${c} · ${currentBlocks.get(c)?.name||"Unknown block"}`).join("; "):"No shared Sunday prep block";});
  d.blocks.forEach(b=>b.usageCount=usage[b.code]||0);
  d.recipes.forEach(r=>{r.name=String(r.name).replace(/romesco/ig,"roasted-pepper");r.requirement=String(r.requirement||"").replace(/romesco/ig,"roasted-pepper").replace(/onion gravy/ig,"onion-mushroom gravy").replace(/katsu sauce/ig,"curry sauce");r.method=String(r.method||"").replace(/romesco/ig,"roasted-pepper").replace(/onion gravy/ig,"onion-mushroom gravy").replace(/katsu sauce/ig,"curry sauce");});
  const nt=cat.nutrition||{},div=Number(cat.portionDivisor||2.75);const r10=n=>Math.max(0,Math.round(Number(n||0)/10)*10),r1=n=>Math.max(0,Math.round(Number(n||0)));
  d.recipes.forEach(r=>{if(!r.nutrition)return;const before=beforeIngredients.get(r.id)||{},after=r.ingredients||{};const codes=new Set([...Object.keys(before),...Object.keys(after)]);let dk=0,dp=0,dc=0,df=0;codes.forEach(code=>{const n=nt[code];if(!n)return;const dq=Number(after[code]||0)-Number(before[code]||0);dk+=dq*Number(n.kcal||0)/div;dp+=dq*Number(n.p||0)/div;dc+=dq*Number(n.c||0)/div;df+=dq*Number(n.f||0)/div;});r.nutrition.kcal=r10(Number(r.nutrition.kcal||0)+dk);r.nutrition.p=r1(Number(r.nutrition.p||0)+dp);r.nutrition.c=r1(Number(r.nutrition.c||0)+dc);r.nutrition.f=r1(Number(r.nutrition.f||0)+df);});
  const missingBlocks=[];d.recipes.forEach(r=>Object.keys(r.blocks||{}).forEach(c=>{if(!currentBlocks.has(c))missingBlocks.push(`${r.id}:${c}`)}));
  d.meta=d.meta||{};d.meta.dataVersion="v1.4.2-recipe-dissection-sauce-consolidation";d.meta.recipeCount=d.recipes.length;d.meta.blockCount=d.blocks.length;d.meta.ingredientCount=d.ingredients.length;d.meta.corePantry=corePantry;d.meta.audit="Each recipe rechecked against explicit shared blocks + tracked shopping ingredients. Specialist one-off condiments were removed/simplified; S11→S03, S15→S08, S13→S16.";d.meta.missingBlockRefs=missingBlocks.length;if(missingBlocks.length)console.warn("v1.4.2 missing blocks",missingBlocks);
})();