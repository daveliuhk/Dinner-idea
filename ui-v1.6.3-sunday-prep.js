(function(){
"use strict";
const KEY="dinner-lego-planner-v1";
const DAYS=["Mon","Tue","Wed","Thu","Fri"];
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function readData(){
  try{
    const saved=JSON.parse(localStorage.getItem(KEY));
    if(saved&&Array.isArray(saved.recipes)&&Array.isArray(saved.week)) return saved;
  }catch(e){}
  const d=window.DEFAULT_DINNER_DATA||{};
  return {...d,week:[null,null,null,null,null]};
}
function ensureStyle(){
  if(document.getElementById("sundayPrepSpecificStyle")) return;
  const style=document.createElement("style");
  style.id="sundayPrepSpecificStyle";
  style.textContent=`
    .recipe-specific-prep{margin-top:18px;padding-top:16px;border-top:1px solid rgba(31,58,54,.15)}
    .recipe-specific-prep h4{margin:0 0 8px;font-size:1rem}
    .recipe-specific-prep .specific-prep-note{margin:8px 0 0;font-size:.82rem;line-height:1.4}
    .recipe-specific-prep .specific-prep-day{white-space:nowrap;font-weight:700}
    .recipe-specific-prep .specific-prep-meal{font-weight:700}
    .recipe-specific-prep td{vertical-align:top}
  `;
  document.head.appendChild(style);
}
function render(){
  const host=document.querySelector("#prepSummary");
  if(!host) return;
  ensureStyle();
  let section=document.getElementById("recipeSpecificSundayPrep");
  if(!section){
    section=document.createElement("div");
    section.id="recipeSpecificSundayPrep";
    section.className="recipe-specific-prep";
    host.insertAdjacentElement("afterend",section);
  }
  const data=readData();
  const byId=new Map((data.recipes||[]).map(r=>[r.id,r]));
  const rows=(data.week||[]).slice(0,5).map((id,idx)=>({day:DAYS[idx],recipe:byId.get(id)}))
    .filter(x=>x.recipe?.sundayPrepSpecific?.action);
  if(!rows.length){
    section.innerHTML=`<h4>Recipe-specific Sunday prep</h4><div class="empty">No extra recipe-specific prep worth doing for the selected meals. Shared blocks already cover the useful Sunday work.</div>`;
    return;
  }
  section.innerHTML=`
    <h4>Recipe-specific Sunday prep</h4>
    <table class="summary-table">
      <thead><tr><th>Day</th><th>Meal</th><th>Extra Sunday action</th></tr></thead>
      <tbody>${rows.map(({day,recipe})=>`<tr>
        <td class="specific-prep-day">${esc(day)}</td>
        <td class="specific-prep-meal">${esc(recipe.name)}</td>
        <td>${esc(recipe.sundayPrepSpecific.action)}</td>
      </tr>`).join("")}</tbody>
    </table>
    <p class="muted specific-prep-note">Cooked Sunday prep: cool promptly and refrigerate only for meals within 48 hours; freeze later-week portions. Reheat once until steaming hot. Rice is deliberately left as a weekday/microwave task rather than batch-cooked on Sunday.</p>`;
}
function schedule(){clearTimeout(schedule.t);schedule.t=setTimeout(render,0);}
const grid=document.querySelector("#weekGrid");
if(grid)new MutationObserver(schedule).observe(grid,{childList:true,subtree:true});
document.addEventListener("change",e=>{if(e.target?.classList?.contains("day-select"))schedule();});
document.addEventListener("click",e=>{if(e.target?.closest?.(".day-remove,#clearWeekBtn,#suggestWeekBtn"))setTimeout(schedule,20);});
setTimeout(render,0);
})();
