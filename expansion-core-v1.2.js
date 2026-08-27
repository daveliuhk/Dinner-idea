(function(){
  const KEY="dinner-lego-planner-v1";
  window.addDinnerExpansion=function(chunk){
    const merge=(target)=>{
      target.blocks=target.blocks||[]; target.ingredients=target.ingredients||[]; target.recipes=target.recipes||[];
      const bc=new Set(target.blocks.map(x=>x.code)), ic=new Set(target.ingredients.map(x=>x.code)), ri=new Set(target.recipes.map(x=>x.id));
      (chunk.blocks||[]).forEach(x=>{if(!bc.has(x.code)){target.blocks.push(x);bc.add(x.code)}});
      (chunk.ingredients||[]).forEach(x=>{if(!ic.has(x.code)){target.ingredients.push(x);ic.add(x.code)}});
      (chunk.recipes||[]).forEach(x=>{if(!ri.has(x.id)){target.recipes.push(x);ri.add(x.id)}});
      target.schemaVersion=2;
      target.meta=Object.assign({},target.meta||{},{recipeCount:98,sauceExpansion:"v1.2: 12 additional modular sauce families"});
      return target;
    };
    if(window.DEFAULT_DINNER_DATA) merge(window.DEFAULT_DINNER_DATA);
    try{
      const raw=localStorage.getItem(KEY);
      if(raw){
        const saved=JSON.parse(raw);
        if(Number(saved.schemaVersion||1)<2){
          merge(saved);
          saved.stock=saved.stock||{};
          saved.ingredients.forEach(i=>{if(saved.stock[i.code]==null)saved.stock[i.code]=0});
          localStorage.setItem(KEY,JSON.stringify(saved));
        }
      }
    }catch(e){console.warn("Dinner v1.2 migration skipped",e)}
  };
})();