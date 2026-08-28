(function(){
  "use strict";
  const U=window.DinnerV14UI;
  if(!U) throw new Error("Dinner v1.4 UI core missing");
  const DAYS=["Mon","Tue","Wed","Thu","Fri"];

  U.blockGuideText=r=>{
    if(r?.blockGuide) return r.blockGuide;
    const data=U.data(), blocks=new Map((data.blocks||[]).map(b=>[b.code,b]));
    const codes=Object.keys(r?.blocks||{}).filter(c=>Number(r.blocks[c]||0)>0);
    return codes.length ? codes.map(c=>`${c} · ${blocks.get(c)?.name||"Unknown block"}`).join("; ") : "No shared Sunday prep block";
  };

  U.addBlockGuide=(card,r,anchor)=>{
    if(!card||!r||card.querySelector(".v141-block-guide")) return;
    const el=document.createElement("div");
    el.className="v141-block-guide";
    const codes=Object.keys(r.blocks||{}).filter(c=>Number(r.blocks[c]||0)>0);
    el.innerHTML=`<strong>Prep blocks:</strong> ${codes.length ? codes.map(c=>{
      const b=U.data().blocks.find(x=>x.code===c);
      return `<span class="v141-block-item"><b>${U.esc(c)}</b> · ${U.esc(b?.name||"Unknown block")}</span>`;
    }).join("") : '<span class="v141-no-block">None — no shared Sunday block required</span>'}`;
    if(anchor?.parentNode) anchor.parentNode.insertBefore(el,anchor.nextSibling); else card.appendChild(el);
  };

  U.annotatePrepSummary=()=>{
    const table=U.$("#prepSummary table.summary-table");
    if(!table || table.querySelector('th[data-v141="recipes"]')) return;
    const data=U.data();
    const week=Array.isArray(data.week)?data.week:[];
    const recipes=new Map((data.recipes||[]).map(r=>[r.id,r]));
    const head=table.querySelector("thead tr");
    if(head){
      const th=document.createElement("th");
      th.dataset.v141="recipes";
      th.textContent="For dinners";
      head.appendChild(th);
    }
    table.querySelectorAll("tbody tr").forEach(row=>{
      const code=row.querySelector("td strong")?.textContent?.trim();
      const uses=[];
      week.forEach((id,i)=>{
        const r=recipes.get(id);
        if(r && code && Number(r.blocks?.[code]||0)>0) uses.push(`${DAYS[i]} · ${r.name}`);
      });
      const td=document.createElement("td");
      td.className="v141-prep-recipes";
      td.innerHTML=uses.length ? uses.map(x=>`<div>${U.esc(x)}</div>`).join("") : '<span class="muted">—</span>';
      row.appendChild(td);
    });
  };

  const oldWeek=U.enhanceWeek;
  U.enhanceWeek=()=>{
    oldWeek();
    U.$$("#weekGrid .day-card").forEach(card=>{
      const r=U.recipeById(card.querySelector(".day-select")?.value);
      if(r) U.addBlockGuide(card,r,card.querySelector(".v14-nutrition")||card.querySelector(".recipe-mini .meta"));
    });
    U.annotatePrepSummary();
  };

  const oldMatches=U.enhanceMatches;
  U.enhanceMatches=()=>{
    oldMatches();
    U.$$("#recipeMatches .match-card").forEach(card=>{
      const r=U.recipeById(card.querySelector(".add-match")?.dataset.id);
      if(r) U.addBlockGuide(card,r,card.querySelector(".v14-nutrition")||card.querySelector(".match-details"));
    });
  };

  const oldRecipes=U.groupRecipes;
  U.groupRecipes=()=>{
    oldRecipes();
    U.$$("#recipeList .recipe-card").forEach(card=>{
      const r=U.recipeById(card.querySelector(".recipe-edit")?.dataset.id);
      if(r) U.addBlockGuide(card,r,card.querySelector("h3"));
    });
  };
})();
