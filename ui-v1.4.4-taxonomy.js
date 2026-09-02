(function(){
"use strict";
const U=window.DinnerV14UI,T=window.DinnerRecipeTaxonomy;
if(!U||!T)return;
const $=U.$,$$=U.$$,esc=U.esc;
const tagsFor=r=>r?.tags||T.classify(r);
const fill=(sel,values,label)=>{if(!sel)return;const cur=sel.value;sel.innerHTML=`<option value="">${esc(label)}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");if(values.includes(cur))sel.value=cur;};
function populate(){
  U.dataCache=U.readData();
  const rs=U.data().recipes||[];
  fill($("#recipeCarbFilter"),[...new Set(rs.flatMap(r=>tagsFor(r).carb||[]))].sort(),"All carbs");
  fill($("#recipeMethodFilter"),[...new Set(rs.flatMap(r=>tagsFor(r).method||[]))].sort(),"All cooking methods");
  const p=$("#recipeCategoryFilter option:first-child");if(p)p.textContent="All proteins";
  U.dataCache=null;
}
function decorate(){
  U.dataCache=U.readData();
  $$("#recipeList .recipe-card").forEach(card=>{
    const id=card.querySelector(".recipe-edit")?.dataset.id,r=U.recipeById(id);if(!r)return;
    const tags=tagsFor(r),extras=card.querySelector(".extras");
    if(extras)extras.textContent=extras.textContent.replace(/\s*⟦Tags:[^⟧]*⟧\s*$/i,"");
    const meta=card.querySelector(".meta");
    if(meta&&!meta.querySelector(".taxonomy-secondary")){
      const holder=document.createElement("span");holder.className="taxonomy-secondary";
      holder.innerHTML=[...(tags.carb||[]),...(tags.method||[]).slice(0,2)].map(x=>`<span class="chip">${esc(x)}</span>`).join("");
      meta.appendChild(holder);
    }
  });
  U.dataCache=null;
}
function apply(){
  U.dataCache=U.readData();
  const carb=$("#recipeCarbFilter")?.value||"",method=$("#recipeMethodFilter")?.value||"";
  $$("#recipeList .recipe-card").forEach(card=>{
    const id=card.querySelector(".recipe-edit")?.dataset.id,r=U.recipeById(id),t=tagsFor(r);
    card.hidden=!!((carb&&!(t.carb||[]).includes(carb))||(method&&!(t.method||[]).includes(method)));
  });
  $$("#recipeList .category-section").forEach(sec=>{
    const cards=$$(".recipe-card",sec),visible=cards.filter(c=>!c.hidden).length;
    sec.hidden=visible===0;
    const count=sec.querySelector(".group-count");if(count)count.textContent=`${visible} recipe${visible===1?"":"s"}`;
  });
  U.dataCache=null;
}
const base=U.enhanceAll;
U.enhanceAll=()=>{base();populate();decorate();apply();};
$("#recipeCarbFilter")?.addEventListener("change",()=>U.schedule());
$("#recipeMethodFilter")?.addEventListener("change",()=>U.schedule());
$("#clearRecipeFilters")?.addEventListener("click",()=>{
  const q=$("#recipeSearch"),p=$("#recipeCategoryFilter"),c=$("#recipeCarbFilter"),m=$("#recipeMethodFilter");
  if(q)q.value="";if(p)p.value="";if(c)c.value="";if(m)m.value="";
  q?.dispatchEvent(new Event("input",{bubbles:true}));
  setTimeout(()=>U.schedule(),0);
});
})();
