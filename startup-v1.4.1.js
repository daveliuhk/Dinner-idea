(function(){
  "use strict";
  let active="planner";
  try{active=JSON.parse(localStorage.getItem("dinner-lego-planner-v1"))?.ui?.activeTab||"planner"}catch(e){}
  const roots={stock:["stockInputs","recipeMatches"],recipes:["recipeList"],blocks:["blockList"],ingredients:["ingredientList"]};
  const keep=new Set(roots[active]||[]), all=["stockInputs","recipeMatches","recipeList","blockList","ingredientList"], stash=[];
  all.forEach(id=>{
    if(keep.has(id))return;
    const real=document.getElementById(id);if(!real)return;
    const dummy=document.createElement("div");dummy.id=id;dummy.className=real.className;
    Object.defineProperty(dummy,"innerHTML",{configurable:true,get(){return ""},set(){}});
    real.replaceWith(dummy);stash.push({real,dummy});
  });
  window.__DinnerRestoreStartupRoots=function(){while(stash.length){const {real,dummy}=stash.shift();if(dummy.isConnected)dummy.replaceWith(real)}};
  setTimeout(()=>window.__DinnerRestoreStartupRoots?.(),4000);
})();
