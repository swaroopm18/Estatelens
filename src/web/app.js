const $ = (id) => document.getElementById(id);
const money = (n) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n||0));
const compactMoney = (n) => {
  const v = Number(n||0); if (v >= 10000000) return `₹${(v/10000000).toFixed(2)}Cr`;
  if (v >= 100000) return `₹${(v/100000).toFixed(1)}L`; return money(v);
};
const state = {
  mode: 'BUY',
  allItems: {BUY:[], RENT:[]},
  currentItems: [],
  selectedCompare: JSON.parse(localStorage.getItem('estate_compare') || '[]'),
  favorites: JSON.parse(localStorage.getItem('estate_favorites') || '[]'),
  profile: JSON.parse(localStorage.getItem('estate_profile') || 'null'),
  accounts: [],
  sessionToken: sessionStorage.getItem('estate_session') || '',
  role: null,
  map: null,
  markers: [],
  property: null,
  personalize: true,
  dataMode: 'ACADEMIC',
  liveCity: localStorage.getItem('estate_live_city') || 'Coimbatore',
  liveLookup: {},
  liveStatus: null,
  liveInsights: null,
  pendingRole: 'BUYER',
  showcaseSeller: false,
};

const cityCoords = {
  'Coimbatore':[11.0168,76.9558], 'Chennai':[13.0827,80.2707], 'Madurai':[9.9252,78.1198], 'Tiruchirappalli':[10.7905,78.7047],
  'Tiruppur':[11.1085,77.3411], 'Erode':[11.3410,77.7172], 'Tirunelveli':[8.7139,77.7567], 'Vellore':[12.9165,79.1325], 'Visakhapatnam':[17.6868,83.2185]
};
const localityCoords = {
  'MVP Colony':[17.7428,83.3206], 'Rushikonda':[17.7864,83.3847], 'Dwaraka Nagar':[17.7197,83.3099],
  'Madhurawada':[17.8136,83.3542], 'Yendada':[17.7757,83.3576], 'PM Palem':[17.8337,83.3639],
  'Seethammadhara':[17.7354,83.2950], 'Akkayyapalem':[17.7385,83.2885], 'Kancharapalem':[17.7388,83.2550],
  'Gajuwaka':[17.6904,83.2185], 'Pendurthi':[17.8103,83.2041], 'Sujatha Nagar':[17.7445,83.2500]
};
const trendData = {
  'MVP Colony':[100,101,103,105,108,110,112,114,117,119,121,123],
  'Rushikonda':[100,102,105,106,110,113,115,118,120,123,126,129],
  'Dwaraka Nagar':[100,101,102,104,106,108,110,112,115,117,118,120],
  'Madhurawada':[100,102,104,107,109,111,113,116,118,121,123,125],
  'Yendada':[100,103,105,109,112,114,117,120,122,125,127,130],
  'PM Palem':[100,101,104,106,109,111,113,115,117,120,122,124],
  'Seethammadhara':[100,102,104,106,109,111,114,116,118,121,124,126],
  'Akkayyapalem':[100,101,103,105,107,109,112,113,116,119,121,124],
  'Kancharapalem':[100,100,102,104,105,107,109,111,113,114,116,118],
  'Gajuwaka':[100,103,104,106,108,110,112,115,116,118,120,123],
  'Pendurthi':[100,101,103,106,108,111,113,115,118,120,123,125],
  'Sujatha Nagar':[100,102,103,105,107,109,112,114,117,119,121,123]
};

function stat(value,label){return `<div class="stat"><b>${value}</b><span>${label}</span></div>`}
function escapeHtml(v){ return String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function showToast(message, error=false){ const t=$('toast'); t.textContent=message; t.className=`toast ${error?'error':''}`; setTimeout(()=>t.classList.add('hidden'),3200); }
function saveState(){
  localStorage.setItem('estate_compare',JSON.stringify(state.selectedCompare));
  localStorage.setItem('estate_favorites',JSON.stringify(state.favorites));
}
function setProfile(profile){ state.profile = profile; localStorage.setItem('estate_profile',JSON.stringify(profile)); updateAccountUI(); }
function currentProfile(){
  const raw = state.profile || {};
  return {
    mode: raw.mode || state.mode,
    locality: raw.locality || 'All',
    minBudget: Number(raw.minBudget ?? $('minPrice')?.value ?? 0),
    maxBudget: Number(raw.maxBudget ?? $('maxPrice')?.value ?? 0),
    bedrooms: Number(raw.bedrooms ?? 0),
    propertyType: raw.propertyType || 'All',
    amenities: Array.isArray(raw.amenities) ? raw.amenities : []
  };
}
function priceLabel(item){ return item.listingMode==='RENT' ? `${money(item.price)} / month` : money(item.price); }
function imageClass(item){
  const classes=['thumb-a','thumb-b','thumb-c','thumb-d','thumb-e','thumb-f']; return classes[(item.id||0)%classes.length];
}
function scoreBreakdown(item){
  const safeItem = item || {};
  const p=currentProfile();
  const a=(safeItem.advanced && typeof safeItem.advanced==='object') ? safeItem.advanced : {};
  const itemAmenities=Array.isArray(safeItem.amenities)?safeItem.amenities:[];
  const prefParts=[];
  const push=(label,value)=>prefParts.push({label, value:Math.max(0,Math.min(100,Math.round(value)))});
  push('Mode', p.mode===safeItem.listingMode ? 100 : 50);
  if(p.locality&&p.locality!=='All') push('Locality', p.locality===safeItem.locality ? 100 : 40);
  if(p.propertyType&&p.propertyType!=='All') push('Property type', p.propertyType===safeItem.propertyType ? 100 : 40);
  if(p.maxBudget){
    const ratio=Number(safeItem.price||0)/Math.max(1,p.maxBudget);
    push('Budget', ratio<=1 ? 100 : Math.max(25, Math.round(100-(ratio-1)*180)));
  }
  if(p.minBudget && Number(safeItem.price||0)>=p.minBudget) push('Budget floor',100);
  if(p.bedrooms&&p.bedrooms>0){
    if(Number(safeItem.bedrooms||0)<=0) push('Bedrooms',45);
    else push('Bedrooms',Math.max(25,100-Math.abs(Number(safeItem.bedrooms||0)-p.bedrooms)*22));
  }
  if(Array.isArray(p.amenities)&&p.amenities.length){
    const hits=p.amenities.filter(x=>itemAmenities.includes(x)).length;
    push('Amenities',Math.round((hits/Math.max(1,p.amenities.length))*100));
  }
  const preferenceFit=prefParts.length?Math.round(prefParts.reduce((sum,x)=>sum+x.value,0)/prefParts.length):65;
  let valueScore=65;
  if(safeItem.listingMode==='BUY'&&Number(Number(safeItem.estimatedPrice||0))>0){
    const gap=((item.price-Number(safeItem.estimatedPrice||0))/Number(safeItem.estimatedPrice||0))*100;
    valueScore = Math.max(35, Math.min(100, Math.round(100 - Math.abs(gap)*2.1 + (gap<0?8:0))));
  }
  const trust=Number(a.trustScore??70);
  const locality=Number(a.localityScore??75);
  const completeness=Number(a.completenessScore??70);
  const riskPenalty=a.duplicateFlag?12:0;
  const overall=Math.max(0,Math.min(99,Math.round(preferenceFit*0.35+valueScore*0.20+trust*0.20+locality*0.15+completeness*0.10-riskPenalty)));
  return {overall, preferenceFit, valueScore, trustScore:trust, localityScore:locality, completeness, parts:prefParts};
}
function scoreItem(item){ return scoreBreakdown(item).overall; }
function flagClass(flag){return flag?.startsWith('Above')?'above':flag?.startsWith('Below')?'below':'near'}
function recommendationReasons(item){
  const p=currentProfile(); const reasons=[];
  if(p.locality&&p.locality!=='All'&&p.locality===item.locality) reasons.push('Preferred locality');
  if(p.maxBudget&&item.price<=p.maxBudget) reasons.push('Within budget');
  if(p.bedrooms&&p.bedrooms>0&&item.bedrooms===p.bedrooms) reasons.push('Bedroom match');
  if(item.amenities&&p.amenities?.length){ const hit=p.amenities.filter(a=>item.amenities.includes(a)); if(hit.length) reasons.push(`${hit.length} preferred amenity${hit.length>1?'ies':'y'}`); }
  if(item.advanced?.priceAlert==='Potential value') reasons.push('Below model estimate');
  if(item.advanced?.duplicateFlag===false) reasons.push('No duplicate flag');
  return reasons.slice(0,4);
}
function distanceKmLocal(from,to){ const a=localityCoords[from], b=localityCoords[to]; if(!a||!b) return -1; const R=6371,dLat=(b[0]-a[0])*Math.PI/180,dLon=(b[1]-a[1])*Math.PI/180; const x=Math.sin(dLat/2)**2+Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dLon/2)**2; return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); }
function renderTrustDashboard(items=state.currentItems){
  const wrap=$('trustDecisionGrid'); if(!wrap)return;
  const picks=analysisScopeItems(items);
  const analyses=picks.map(x=>x.advanced||{});
  const verified=analyses.filter(a=>String(a.verificationStatus||'').toUpperCase().includes('VERIFIED')).length;
  const valueCount=analyses.filter(a=>String(a.priceAlert||'').toLowerCase().includes('value')).length;
  const riskCount=analyses.filter(a=>a.duplicateFlag===true || Number(a.completenessScore||0)<70).length;
  const top=picks[0], topA=top?.advanced||{};
  if($('trustOverallScore')) $('trustOverallScore').textContent=top?`${top.recommendationScore||scoreItem(top)}%`:'—';
  if($('trustOverallCaption')) $('trustOverallCaption').textContent=top?`${top.title} · ${topA.trustScore??'—'}/100 confidence`:'Run a search';
  if($('trustVerificationCount')) $('trustVerificationCount').textContent=`${verified}/${analyses.length||0}`;
  if($('trustValueCount')) $('trustValueCount').textContent=String(valueCount);
  if($('trustRiskCount')) $('trustRiskCount').textContent=String(riskCount);
  wrap.innerHTML=picks.length?picks.map(x=>{const a=x.advanced||{}; const reasons=recommendationReasons(x); const completeness=Number(a.completenessScore||0); const trust=Number(a.trustScore||0); const risk=a.duplicateFlag||completeness<70; const status=a.verificationStatus||'Pending review'; const priceGap=Number(a.priceDeltaPct||0); return `<article class="trust-card ${risk?'risk-card':''}"><div class="trust-card-head"><span class="score-badge">${x.recommendationScore||scoreItem(x)}% match</span><span class="status-pill">${escapeHtml(status)}</span></div><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.locality)} · ${priceLabel(x)} · ${escapeHtml(a.sellerName||x.sellerName||'Marketplace seller')}</p><div class="trust-meter"><span style="width:${Math.max(0,Math.min(100,trust))}%"></span></div><div class="trust-metrics"><span><b>${trust}</b> trust score</span><span><b>${completeness}</b> info completeness</span><span><b>${a.localityScore??'—'}</b> locality score</span><span><b>${priceGap===0?'—':`${priceGap>0?'+':''}${priceGap.toFixed(1)}%`}</b> price gap</span></div><div class="trust-status-row"><span class="trust-check ${a.duplicateFlag?'danger':'ok'}">${a.duplicateFlag?'⚠ Possible duplicate':'✓ No duplicate flag'}</span><span class="trust-check ${completeness>=70?'ok':'warn'}">${completeness>=70?'✓ Information is review-ready':'! Some listing details need review'}</span></div><ul>${(reasons.length?reasons:['Review details before deciding']).map(r=>`<li>✓ ${escapeHtml(r)}</li>`).join('')}</ul><div class="trust-actions"><button class="soft-btn compact" data-trust-open="${x.id}">Open property</button>${x.listingMode==='BUY'&&x.sellerOwned?`<button class="outline-btn compact" data-trust-offer="${x.id}">Make offer</button>`:''}<button class="soft-btn compact" data-trust-enquiry="${x.id}">Contact seller</button></div></article>`;}).join(''):'<div class="empty">Run a property search to see trust, price and locality signals.</div>';
  document.querySelectorAll('[data-trust-open]').forEach(b=>b.onclick=()=>openProperty(Number(b.dataset.trustOpen)));
  document.querySelectorAll('[data-trust-offer]').forEach(b=>b.onclick=()=>openOffer(Number(b.dataset.trustOffer)));
  document.querySelectorAll('[data-trust-enquiry]').forEach(b=>b.onclick=()=>openWorkflow(Number(b.dataset.trustEnquiry)));
  fillOptions('commuteFrom',Object.keys(localityCoords),state.profile?.locality||'MVP Colony');
  fillOptions('commuteTo',Object.keys(localityCoords),picks[0]?.locality||'MVP Colony');
  updateCommuteSuggestions($('commuteFrom')?.value,$('commuteTo')?.value);
}
function updateCommuteSuggestions(from,to){
  const el=$('commuteSuggestions'); if(!el || !from)return;
  const items=Object.keys(localityCoords).filter(x=>x!==from).map(x=>({name:x,km:distanceKmLocal(from,x)})).filter(x=>x.km>=0).sort((a,b)=>a.km-b.km).slice(0,3);
  if(!items.length){el.innerHTML='';return;}
  el.innerHTML=`<span>Nearby locality guide</span>${items.map(x=>`<button type="button" class="proximity-chip" data-proximity="${escapeHtml(x.name)}">${escapeHtml(x.name)} · ${x.km.toFixed(1)} km</button>`).join('')}`;
  el.querySelectorAll('[data-proximity]').forEach(b=>b.onclick=()=>{if($('commuteTo')){$('commuteTo').value=b.dataset.proximity;$('calculateCommute').click();}});
}
function renderMarketIntelligence(items=state.currentItems){
  const selected=getSelectedItems();
  const arr=(selected.length?selected:(items||[])).filter(Boolean).map(x=>({...x,amenities:Array.isArray(x?.amenities)?x.amenities:[],advanced:(x?.advanced&&typeof x.advanced==='object')?x.advanced:{}}));

  const prices=arr.map(x=>Number(x.price||0)).filter(v=>v>0);
  const buys=arr.filter(x=>x.listingMode==='BUY'&&Number(x.estimatedPrice)>0);
  const localities=[...new Set(arr.map(x=>x.locality).filter(Boolean))];
  const avg=prices.length?prices.reduce((a,b)=>a+b,0)/prices.length:0;
  const gaps=buys.map(x=>(x.price-x.estimatedPrice)/x.estimatedPrice*100);
  const avgGap=gaps.length?gaps.reduce((a,b)=>a+b,0)/gaps.length:null;
  const scored=arr.map(x=>({...x,recommendationScore:scoreItem(x)}));
  scored.sort((a,b)=>b.recommendationScore-a.recommendationScore);
  const top=scored[0]; const topScore=top?top.recommendationScore:null;
  const potential=buys.filter(x=>x.price<x.estimatedPrice*0.9).length;
  const over=buys.filter(x=>x.price>x.estimatedPrice*1.15).length;
  if($('marketMatchCount'))$('marketMatchCount').textContent=String(arr.length);
  if($('marketMatchCaption'))$('marketMatchCaption').textContent=`${localities.length} localities · ${potential} potential-value result${potential===1?'':'s'}`;
  if($('marketAvgAsk'))$('marketAvgAsk').textContent=avg?compactMoney(avg):'—';
  if($('marketAvgAskCaption'))$('marketAvgAskCaption').textContent=arr.length?`${compactMoney(Math.min(...prices))}–${compactMoney(Math.max(...prices))} asking range`:'Run a search to populate';
  if($('marketValueGap'))$('marketValueGap').textContent=avgGap==null?'—':`${avgGap>0?'+':''}${avgGap.toFixed(1)}%`;
  if($('marketValueGapCaption'))$('marketValueGapCaption').textContent=avgGap==null?'BUY estimates not available':avgGap>10?`${over} result${over===1?'':'s'} above the model band`:`${potential} result${potential===1?'':'s'} priced below estimate`;
  if($('marketTopMatch'))$('marketTopMatch').textContent=top?`${topScore}%`:'—';
  if($('marketTopMatchCaption'))$('marketTopMatchCaption').textContent=top?escapeHtml(top.title):'Run a search';
  if($('marketFairPriceText'))$('marketFairPriceText').textContent=buys.length?`Use this view to answer one question first: is the asking price close to the Python fair-price estimate? The current result-set average gap is ${avgGap==null?'not available':`${avgGap>0?'+':''}${avgGap.toFixed(1)}%`}.`:'Run a BUY search to activate the price-value lens.';
  if($('marketRecommendationText'))$('marketRecommendationText').textContent=top?`${top.title} is the current best profile fit at ${topScore}%. The score combines your preferences, value, trust, locality and information completeness.`:'Run a search to get a profile-based recommendation.';
  const trend=trendData[$('trendLocality')?.value]||trendData['MVP Colony'];
  const trendChange=trend.length?(trend[trend.length-1]-trend[0])/trend[0]*100:0;
  if($('marketDirectionText'))$('marketDirectionText').textContent=trendChange>4?`The selected academic trend is rising by about ${trendChange.toFixed(1)}%. Use this as directional context, not a guarantee.`:trendChange<-2?`The selected academic trend is softer by about ${Math.abs(trendChange).toFixed(1)}%.`:'The selected academic trend is broadly stable across the displayed periods.';
  if($('marketLocalityCount'))$('marketLocalityCount').textContent=String(localities.length);
  if($('marketMapCount'))$('marketMapCount').textContent=String(arr.length);
  if($('marketSelectedLocality'))$('marketSelectedLocality').textContent=$('locality')?.value&&$('locality').value!=='All'?$('locality').value:(top?.locality||'All');
  const bestGap=buys.length?buys.slice().sort((a,b)=>Math.abs((a.price-a.estimatedPrice)/a.estimatedPrice)-Math.abs((b.price-b.estimatedPrice)/b.estimatedPrice))[0]:null;
  const bestGapPct=bestGap?((bestGap.price-bestGap.estimatedPrice)/bestGap.estimatedPrice*100):null;
  if($('marketPricePosition'))$('marketPricePosition').textContent=bestGap? (Math.abs(bestGapPct)<=5?'Near estimate':bestGapPct<0?'Below estimate':'Above estimate') : 'Awaiting BUY estimate';
  if($('marketPricePositionText'))$('marketPricePositionText').textContent=bestGap?`${bestGap.title} is the closest price-to-estimate match in the current result set (${bestGapPct>0?'+':''}${bestGapPct.toFixed(1)}%).`:'Use Academic BUY results or a supported live city with price estimates.';
  if($('marketPreferenceFit'))$('marketPreferenceFit').textContent=top?`${topScore}% match`:'—';
  if($('marketPreferenceFitText'))$('marketPreferenceFitText').textContent=top?`This answers “which visible property fits me best?” using your saved locality, budget, type, bedrooms and amenities.`:'Run a search with your preferences.';
  const chosen=top?.locality||$('trendLocality')?.value||'MVP Colony'; const lScore=top?.advanced?.localityScore;
  if($('marketLocalitySignal'))$('marketLocalitySignal').textContent=lScore?`${lScore}/100`:chosen;
  if($('marketLocalitySignalText'))$('marketLocalitySignalText').textContent=top?`${chosen} is the strongest locality signal among the visible matches. The map shows where those matches are concentrated.`:'Select a locality to see the market context.';
  if($('marketSelectionContext'))$('marketSelectionContext').textContent=selected.length?`Focused comparison set: ${selected.length} selected · Market Intelligence is limited to these properties.`:'No comparison set selected · Market Intelligence is using the current search results.';
  if($('marketSelectedTop'))$('marketSelectedTop').textContent=selected.length?selected.map(x=>x.title).join(' · '):'None';
  renderTrend();
}

async function refreshBuyerDeals(){
  if(state.role!=='BUYER') return;
  try{const [v,o]=await Promise.all([fetch('/api/advanced/visits?token='+encodeURIComponent(state.sessionToken)).then(r=>r.json()),fetch('/api/advanced/offers?token='+encodeURIComponent(state.sessionToken)).then(r=>r.json())]);
    const visits=v.items||[], offers=o.items||[];
    if($('buyerVisitCount')) $('buyerVisitCount').textContent=String(visits.length);
    if($('buyerOfferCount')) $('buyerOfferCount').textContent=String(offers.length);
    $('buyerVisitList').innerHTML=visits.map(x=>`<div class="seller-property-row"><div><strong>${escapeHtml(x.propertyTitle)}</strong><span>${escapeHtml(x.date||'Date not set')} · ${escapeHtml(x.status)}</span><small>${escapeHtml(x.message||'Site visit request')}</small></div></div>`).join('')||'<div class="empty actionable-empty"><b>No active site visits yet.</b><span>Open a property and choose Schedule site visit to create one.</span></div>';
    $('buyerOfferList').innerHTML=offers.map(x=>`<div class="seller-property-row"><div><strong>${escapeHtml(x.propertyTitle)}</strong><span>${money(x.amount)} · ${escapeHtml(x.status)}</span><small>${x.counterAmount>0?'Counter: '+money(x.counterAmount)+' · ':''}${escapeHtml(x.message||'')}</small></div></div>`).join('')||'<div class="empty actionable-empty"><b>No active offers yet.</b><span>Open a BUY property and choose Make an Offer to start negotiation.</span></div>';
  }catch(e){}
}

async function refreshSellerDeals(){
  if(state.role!=='SELLER') return;
  try{const [v,o,p]=await Promise.all([fetch('/api/advanced/visits?token='+encodeURIComponent(state.sessionToken)).then(r=>r.json()),fetch('/api/advanced/offers?token='+encodeURIComponent(state.sessionToken)).then(r=>r.json()),fetch('/api/seller/properties?token='+encodeURIComponent(state.sessionToken)).then(r=>r.json())]);
    $('sellerVisitList').innerHTML=(v.items||[]).map(x=>`<div class="seller-property-row"><div><strong>${escapeHtml(x.propertyTitle)}</strong><span>${escapeHtml(x.date||'Date not set')} · ${escapeHtml(x.status)}</span><small>${escapeHtml(x.message||'')}</small></div><div class="row-actions">${x.status==='REQUESTED'?`<button class="soft-btn compact" data-visit-action="${x.id}" data-visit-status="ACCEPTED">Accept</button><button class="outline-btn compact" data-visit-action="${x.id}" data-visit-status="DECLINED">Decline</button>`:''}</div></div>`).join('')||'<div class="empty">No site visits yet.</div>';
    $('sellerOfferList').innerHTML=(o.items||[]).map(x=>`<div class="seller-property-row"><div><strong>${escapeHtml(x.propertyTitle)}</strong><span>${money(x.amount)} · ${escapeHtml(x.status)}</span><small>${x.counterAmount>0?'Counter: '+money(x.counterAmount)+' · ':''}${escapeHtml(x.message||'')}</small></div><div class="row-actions">${x.status==='PENDING'?`<button class="soft-btn compact" data-offer-action="${x.id}" data-offer-status="ACCEPTED">Accept</button><button class="outline-btn compact" data-offer-action="${x.id}" data-offer-status="REJECTED">Reject</button><button class="soft-btn compact" data-offer-counter="${x.id}" data-offer-current="${x.amount}">Counter</button>`:''}</div></div>`).join('')||'<div class="empty">No offers yet.</div>';
    $('sellerQualityList').innerHTML=(p.items||[]).map(x=>{const a=x.advanced||{};return `<div class="seller-property-row"><div><strong>${escapeHtml(x.title)}</strong><span>${escapeHtml(a.verificationStatus||'PENDING REVIEW')} · confidence ${a.trustScore??'—'}</span><small>${escapeHtml(a.priceAlert||'')} · locality ${a.localityScore??'—'} · ${a.duplicateFlag?'Possible duplicate':'No duplicate flag'}</small></div></div>`}).join('')||'<div class="empty">No listings yet.</div>';
    document.querySelectorAll('[data-visit-action]').forEach(b=>b.onclick=async()=>{await postForm('/api/advanced/visits',{token:state.sessionToken,visitId:b.dataset.visitAction,status:b.dataset.visitStatus});showToast(`Site visit ${b.dataset.visitStatus.toLowerCase()}`);refreshSellerDeals();});
    document.querySelectorAll('[data-offer-action]').forEach(b=>b.onclick=async()=>{await postForm('/api/advanced/offers',{token:state.sessionToken,action:'respond',offerId:b.dataset.offerAction,status:b.dataset.offerStatus,message:''});showToast(`Offer ${b.dataset.offerStatus.toLowerCase()}`);refreshSellerDeals();refreshSellerInquiries(true);});
    document.querySelectorAll('[data-offer-counter]').forEach(b=>b.onclick=async()=>{const amount=prompt('Enter counter-offer amount',b.dataset.offerCurrent||'');if(!amount)return;await postForm('/api/advanced/offers',{token:state.sessionToken,action:'respond',offerId:b.dataset.offerCounter,status:'COUNTERED',counterAmount:amount,message:'Seller sent a counter-offer.'});showToast('Counter-offer sent');refreshSellerDeals();});
  }catch(e){}
}


async function loadSummary(){
  try{
    const s=await (await fetch('/api/summary')).json();
    $('stats').innerHTML=[
      stat(s.count,'total indexed listings'), stat(s.buyCount,'sale listings'), stat(s.rentCount,'monthly rentals'),
      stat(s.localities.length,'localities'), stat(compactMoney(s.avgPrice),'average sale price')
    ].join('');
    $('avlNodes').textContent=s.avlNodes; $('avlHeight').textContent=s.avlHeight;
    fillOptions('locality',s.localities,'All'); fillOptions('signLocality',s.localities,'All'); fillOptions('trendLocality',s.localities,s.localities[0]||'MVP Colony');
    fillOptions('amenity',s.amenities,'All');
  }catch(e){$('stats').innerHTML=stat('Offline','Java server');}
}
function fillOptions(id,values,first){ const el=$(id); if(!el) return; const existing=el.value; el.innerHTML=`<option>${escapeHtml(first)}</option>`; for(const x of values||[]){const o=document.createElement('option');o.value=x;o.textContent=x;el.appendChild(o)} if([...el.options].some(o=>o.value===existing)) el.value=existing; }

async function loadAll(){
  for(const mode of ['BUY','RENT']){
    try{const d=await (await fetch(`/api/all?mode=${mode}`)).json(); state.allItems[mode]=d.items||[];}catch(e){state.allItems[mode]=[];}
  }
  updateMap(state.allItems[state.mode]); updateFavoritesPreview(); updateComparePreview(); renderTrend();
}
function updateMode(mode){
  state.mode=mode;
  document.querySelectorAll('[data-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.mode===mode));
  $('searchBadge').textContent=mode;
  $('minPrice').value=mode==='RENT'?20000:3500000; $('maxPrice').value=mode==='RENT'?50000:20000000;
  $('minPrice').step=mode==='RENT'?1000:100000; $('maxPrice').step=mode==='RENT'?1000:100000;
  const modeNote=mode==='RENT'?'Monthly rent (₹)':'Purchase price (₹)';
  document.querySelectorAll('label').forEach(l=>{ if(l.textContent.trim().startsWith('Min price')) l.firstChild.textContent=`Min price · ${modeNote} `; if(l.textContent.trim().startsWith('Max price')) l.firstChild.textContent=`Max price · ${modeNote} `; });
  updateMap(state.allItems[mode]||[]);
}
function getParams(){return new URLSearchParams({
  mode:state.mode, locality:$('locality').value,minPrice:$('minPrice').value,maxPrice:$('maxPrice').value,
  minSize:$('minSize').value,maxSize:$('maxSize').value,amenity:$('amenity').value,propertyType:$('propertyType').value,
  bedrooms:$('bedrooms').value
}).toString()}

function hashId(value){ let h=0; for(let i=0;i<String(value).length;i++) h=((h<<5)-h)+String(value).charCodeAt(i)|0; return 100000000 + Math.abs(h); }
function itemById(id){
  const n=Number(id);
  const found=state.liveLookup[n] || [...(state.currentItems||[]),...(state.allItems?.BUY||[]),...(state.allItems?.RENT||[])].find(x=>Number(x?.id)===n);
  if(!found) return null;
  return {
    ...found,
    amenities:Array.isArray(found.amenities)?found.amenities:[],
    advanced:(found.advanced && typeof found.advanced==='object')?found.advanced:{},
    sellerName:found.sellerName || 'Marketplace seller'
  };
}
function cleanCompareToCurrentResults(){
  const visible=new Set((state.currentItems||[]).map(x=>Number(x?.id)).filter(Number.isFinite));
  const cleaned=(state.selectedCompare||[]).map(Number).filter(id=>visible.has(id)).slice(0,3);
  const changed=cleaned.length!==state.selectedCompare.length || cleaned.some((id,i)=>id!==state.selectedCompare[i]);
  state.selectedCompare=cleaned;
  if(changed) saveState();
  return cleaned;
}
function normalizeLiveListing(x, requestedLocality){
  const externalId=String(x.listingId||x.id||x.sourceId||''); const id=hashId(externalId);
  const locality=x.locality || x.neighborhood || requestedLocality || state.liveCity;
  const mode=String(x.listingType || x.transactionType || (state.mode==='RENT'?'rent':'sale')).toUpperCase()==='RENT'?'RENT':'BUY';
  const propertyTypeRaw=String(x.propertyType||'Apartment');
  const propertyType=/villa/i.test(propertyTypeRaw)?'Villa':/plot/i.test(propertyTypeRaw)?'Plot':/house|independent/i.test(propertyTypeRaw)?'Independent House':'Apartment';
  const item={id, externalId, title:x.title||'Live property listing', locality, city:x.city||state.liveCity, propertyType, listingClass:'Live Residential Listing', listingMode:mode, pricePeriod:mode==='RENT'?'MONTHLY':'ONE_TIME', price:Number(x.price||0), priceUnit:x.priceUnit||'INR', estimatedPrice:0, priceFlag:'Live source', areaSqFt:Number(x.areaSqft||x.carpetAreaSqft||x.area||0), bedrooms:Number(x.bhk||x.bedrooms||0), amenities:Array.isArray(x.amenities)?x.amenities:[], pricePerSqft:Number(x.pricePerSqft||0), sourceUrl:x.sourceUrl||x.handoffUrl||'', reraId:x.reraId||'', live:true, verified:!!x.verified, rank:x.rank||null, ageYears:Number(x.ageYears||0), floor:x.floor||null, totalFloors:x.totalFloors||null, furnishing:x.furnishing||''};
  state.liveLookup[id]=item; return item;
}
function populateLiveCities(cities){
  const el=$('liveCity'); if(!el) return; const options=(cities&&cities.length?cities:['Coimbatore','Chennai','Madurai','Tiruchirappalli','Tiruppur','Erode','Tirunelveli','Vellore']);
  el.innerHTML=options.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  if(!options.includes(state.liveCity)) state.liveCity=options[0]; el.value=state.liveCity;
}
async function loadLiveStatus(city=state.liveCity){
  try{ const d=await (await fetch('/api/live/status?city='+encodeURIComponent(city))).json(); state.liveStatus=d; populateLiveCities(d.supportedCities); $('liveProviderName').textContent=d.provider||'Live provider'; $('liveSourceMeta').textContent=`Live property feed · ${d.city||state.liveCity}`; $('heroLiveCity').textContent=d.city||state.liveCity; $('liveProviderLink').href=d.attributionUrl||'#'; $('reraLink').href=d.officialReraUrl||'https://rera.ap.gov.in/RERA/Views/Project.aspx'; $('liveStatusPill').classList.remove('offline'); $('liveStatusPill').classList.add('ready'); $('liveStatusText').textContent=`${d.provider||'Live'} configured · ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`; localStorage.setItem('estate_live_city',state.liveCity); }
  catch(e){ state.liveStatus=null; $('liveStatusPill').classList.remove('ready'); $('liveStatusPill').classList.add('offline'); $('liveStatusText').textContent='Live source unavailable'; }
}
async function liveSearch(){
  const locality=$('locality').value; const params=new URLSearchParams({mode:state.mode,locality:locality,minPrice:$('minPrice').value,maxPrice:$('maxPrice').value,propertyType:$('propertyType').value,bedrooms:$('bedrooms').value,city:state.liveCity});
  const r=await fetch('/api/live/search?'+params); const data=await r.json();
  if(!data.supported){ throw new Error(data.scopeMessage||data.liveError||'Live provider does not cover this city/query.'); }
  const items=(data.listings||[]).map(x=>normalizeLiveListing(x,locality==='All'?state.liveCity:locality));
  const minSize=Number($('minSize').value||0), maxSize=Number($('maxSize').value||Infinity), amenity=$('amenity').value;
  let filtered=items.filter(x=>x.areaSqFt>=minSize && x.areaSqFt<=maxSize && (!amenity||amenity==='All'||x.amenities.some(a=>String(a).toLowerCase()===amenity.toLowerCase())));
  const bedroomFilter=Number($('bedrooms').value||0); if(bedroomFilter) filtered=filtered.filter(x=>bedroomFilter===4?x.bedrooms>=4:x.bedrooms===bedroomFilter);
  return {items:filtered, total:data.total||filtered.length, attribution:data.attribution||state.liveStatus?.provider||'Live provider'};
}
async function loadLiveInsights(locality){
  try{ const loc=locality||$('trendLocality')?.value||$('locality')?.value; if(!loc || loc==='All'){ state.liveInsights=null; $('livePpsf').textContent='—'; $('liveAvgPrice').textContent='—'; $('liveGrowth').textContent='—'; $('liveSupply').textContent='—'; $('liveFreshness').textContent='Choose a live locality after running a city search.'; renderTrend(); return null; } const d=await (await fetch('/api/live/insights?city='+encodeURIComponent(state.liveCity)+'&locality='+encodeURIComponent(loc))).json(); state.liveInsights=d;
    if(d.supported&&d.insights){ const i=d.insights; $('livePpsf').textContent=i.pricePerSqftInr||i.avgPricePerSqft?money(i.pricePerSqftInr||i.avgPricePerSqft).replace('₹','₹'):'—'; $('liveAvgPrice').textContent=i.avgPriceInr?compactMoney(i.avgPriceInr):'—'; $('liveGrowth').textContent=(i.priceGrowth1YPct??i.yoyGrowthPct)!=null?`${(i.priceGrowth1YPct??i.yoyGrowthPct)}%`:'—'; $('liveSupply').textContent=i.supplyCount??'—'; $('liveFreshness').textContent=`Updated ${d.freshness?.updatedAt||'recently'} · confidence ${d.freshness?.confidence||'provider reported'}`; renderTrend(); return d; }
    $('livePpsf').textContent='—'; $('liveAvgPrice').textContent='—'; $('liveGrowth').textContent='—'; $('liveSupply').textContent='—'; $('liveFreshness').textContent=d.scopeMessage||'No live locality insight for this area.';
  }catch(e){ state.liveInsights=null; $('liveFreshness').textContent='Live locality insight unavailable.'; }
}


async function search(){
  $('resultCount').textContent='Searching…'; $('results').innerHTML='<div class="empty">Querying the selected property source…</div>';
  try{
    let items=[]; let sourceLabel='Academic dataset';
    if(state.dataMode==='LIVE') {
      try { const live=await liveSearch(); items=live.items; sourceLabel=live.attribution||'Live provider'; fillOptions('locality',[...new Set(items.map(x=>x.locality).filter(Boolean))],'All'); fillOptions('trendLocality',[...new Set(items.map(x=>x.locality).filter(Boolean))], items[0]?.locality || 'All'); } 
      catch(liveErr){ state.currentItems=[]; $('resultCount').textContent='Live feed unavailable'; $('results').innerHTML=`<div class="empty"><strong>Live market data is not available for this query.</strong><br>${escapeHtml(liveErr.message)}<br><br>Switch to <b>Academic dataset</b> to review the JNTUK AVL + set-operation pipeline.</div>`; updateMap([]); updateComparePreview(); updateFavoritesPreview(); return; }
      await loadLiveInsights($('trendLocality').value);
    } else {
      const r=await fetch('/api/search?'+getParams()); const data=await r.json(); items=data.items||[]; sourceLabel='Academic dataset'; await loadSummary();
      const bedroomFilter=Number($('bedrooms').value||0); if(bedroomFilter) items=items.filter(x=>bedroomFilter===4?x.bedrooms>=4:x.bedrooms===bedroomFilter);
    }
    items=items.map(x=>({...x,recommendationScore:scoreItem(x)})); sortItems(items); state.currentItems=items; cleanCompareToCurrentResults(); cleanCompareToCurrentResults();
    $('resultCount').textContent=`${items.length} result${items.length===1?'':'s'} · ${state.mode==='BUY'?'sale':'monthly rent'} · ${sourceLabel}`;
    $('results').innerHTML=items.length?items.map(card).join(''):`<div class="empty">No listings satisfy all conditions from the selected source.</div>`;
    $('searchSourceNote').textContent=state.dataMode==='LIVE'?`Live results from ${sourceLabel}. Open a listing's source link to verify the current offer. Coverage can vary by locality.`:'Academic dataset mode: the original Java/AVL/set-operation data is preserved for review.';
    const scopedItems=analysisScopeItems(items); updateMap(scopedItems.length?scopedItems:items); updateComparePreview(); updateFavoritesPreview(); renderMarketIntelligence(items); renderTrustDashboard(items); if(state.role==='BUYER') refreshBuyerDeals(); if(items[0]) syncFinanceSelection(items[0]); bindDynamic();
  }catch(e){ $('resultCount').textContent='Error'; $('results').innerHTML=`<div class="empty">${escapeHtml(e.message||'The property search is unavailable.')}</div>`; }
}

function sortItems(items){
  const mode=$('sortBy').value;
  if(mode==='priceAsc') items.sort((a,b)=>a.price-b.price);
  else if(mode==='priceDesc') items.sort((a,b)=>b.price-a.price);
  else if(mode==='sizeDesc') items.sort((a,b)=>b.areaSqFt-a.areaSqFt);
  else items.sort((a,b)=>(b.recommendationScore||0)-(a.recommendationScore||0));
}
function isFavorite(id){return state.favorites.includes(Number(id));}
function card(l){
  const flag=l.live?'<span class="flag live-flag">LIVE</span>':(l.priceFlag?.startsWith('Above')||l.priceFlag?.startsWith('Below')||l.priceFlag?.startsWith('Near')?`<span class="flag ${flagClass(l.priceFlag)}">${escapeHtml(l.priceFlag)}</span>`:'');
  const amenities=(l.amenities||[]).slice(0,4).map(x=>`<span>${escapeHtml(x)}</span>`).join('');
  const fav=isFavorite(l.id);
  const sourceTag=l.live?'<span class="source-mini">LIVE MARKET</span>':'<span class="source-mini">ACADEMIC</span>';
  const showcaseSellerTag=l.sellerName==='EstateLens Showcase Seller'?'<span class="source-mini showcase-seller-tag">SHOWCASE SELLER</span>':'';
  const estimateLine=l.live?(l.pricePerSqft?`<div class="estimate-line live-estimate"><span>Live price / sq ft</span><strong>${money(l.pricePerSqft)}</strong></div>`:''):(l.listingMode==='BUY'?`<div class="estimate-line"><span>Python fair estimate</span><strong>${money(l.estimatedPrice)}</strong></div>`:'');
  const sourceLink=l.live&&l.sourceUrl?`<a class="source-link" href="${escapeHtml(l.sourceUrl)}" target="_blank" rel="noreferrer">Open source listing ↗</a>`:'';
  return `<article class="card">
    <div class="property-thumb ${imageClass(l)}"><span class="listing-tag">${l.listingMode==='RENT'?'FOR RENT':'FOR SALE'}</span><button class="heart ${fav?'active':''}" data-fav="${l.id}" title="Favorite">${fav?'♥':'♡'}</button><div class="thumb-caption">${escapeHtml(l.propertyType)} · ${escapeHtml(l.locality)}</div></div>
    <div class="card-top"><span class="type">${escapeHtml(l.propertyType)} · ${escapeHtml(l.listingClass)}</span>${flag}</div>
    <div class="score-line"><span class="score-badge">${l.recommendationScore||scoreItem(l)}% match</span><span class="area-mini">${l.areaSqFt||'—'} sq ft</span>${sourceTag}${showcaseSellerTag}</div>
    <h3>${escapeHtml(l.title)}</h3><div class="loc">${escapeHtml(l.locality)}, ${escapeHtml(l.city||'Visakhapatnam')}</div><div class="seller-mini">${l.sellerOwned?`Seller: <b>${escapeHtml(l.sellerName||'Marketplace seller')}</b>`:(l.live?'Live source listing':'Seller marketplace listing')}</div><div class="price">${priceLabel(l)}</div>
    <div class="meta"><span>${l.bedrooms?l.bedrooms+' BHK':'Property'}</span>${amenities}</div>
    ${estimateLine}
    ${l.reraId?`<div class="rera-line">RERA: ${escapeHtml(l.reraId)}</div>`:''}
    ${sourceLink}
    <div class="card-actions"><button class="soft-btn compact" data-details="${l.id}">View details</button><button class="outline-btn compact" data-compare="${l.id}">${state.selectedCompare.includes(Number(l.id))?'✓ Compared':'Compare'}</button><button class="primary-btn compact" data-workflow="${l.id}">${l.listingMode==='RENT'?'Rent':'Buy'}</button></div>
  </article>`;
}

function bindDynamic(){
  document.querySelectorAll('[data-fav]').forEach(btn=>btn.addEventListener('click',()=>toggleFavorite(Number(btn.dataset.fav))));
  document.querySelectorAll('[data-details]').forEach(btn=>btn.addEventListener('click',()=>openProperty(Number(btn.dataset.details))));
  document.querySelectorAll('[data-compare]').forEach(btn=>btn.addEventListener('click',()=>toggleCompare(Number(btn.dataset.compare))));
  document.querySelectorAll('[data-workflow]').forEach(btn=>btn.addEventListener('click',()=>openWorkflow(Number(btn.dataset.workflow))));
}

function getSelectedItems(){
  cleanCompareToCurrentResults();
  return (state.selectedCompare||[]).map(itemById).filter(Boolean).slice(0,3);
}
function analysisScopeItems(items=state.currentItems){
  const selected=getSelectedItems();
  return selected.length ? selected : (items||[]).filter(Boolean);
}
function ensureCompareSelection(){
  const items=getSelectedItems();
  updateComparePreview();
  if(!items.length){ showToast('Select at least one property to compare.',true); return null; }
  return items;
}

function toggleFavorite(id){
  state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id]; saveState(); showToast(state.favorites.includes(id)?'Saved to favorites':'Removed from favorites'); search();
}
function toggleCompare(id){
  if(state.selectedCompare.includes(id)) state.selectedCompare=state.selectedCompare.filter(x=>x!==id);
  else { if(state.selectedCompare.length>=3){showToast('Compare up to 3 properties at a time',true);return;} state.selectedCompare.push(id); }
  saveState(); updateComparePreview(); search();
}
function updateComparePreview(){
  const items=state.selectedCompare.map(id=>itemById(id)).filter(Boolean);
  const bar=$('compareBar'); if(bar){bar.classList.toggle('hidden',items.length===0); $('compareCount').textContent=items.length;}
  $('comparePreview').innerHTML=items.length?items.map(x=>`<div class="compare-mini"><div class="mini-thumb ${imageClass(x)}"></div><div><strong>${escapeHtml(x.title)}</strong><span>${escapeHtml(x.locality)} · ${priceLabel(x)}</span><button class="text-btn" data-remove-compare="${x.id}">Remove</button></div></div>`).join(''):'<div class="empty">Select properties above to build your comparison.</div>';
  document.querySelectorAll('[data-remove-compare]').forEach(b=>b.addEventListener('click',()=>toggleCompare(Number(b.dataset.removeCompare))));
}
function openCompare(){
  const items=ensureCompareSelection();
  if(!items) return;
  try{
    const scored=items.map(item=>{const base={...item, amenities:Array.isArray(item.amenities)?item.amenities:[], advanced:(item.advanced&&typeof item.advanced==='object')?item.advanced:{}}; return {...base, breakdown:scoreBreakdown(base)};}).filter(x=>x&&x.breakdown);
    if(!scored.length){ showToast('The selected properties are no longer available in this search. Please refresh the selection.',true); return; }
    const best=scored.reduce((a,b)=>a.breakdown.overall>=b.breakdown.overall?a:b,scored[0]);
    const cols=scored.map(x=>{
      const b=x.breakdown; const badge=x.id===best.id?'<span class="compare-winner">BEST FIT</span>':'';
      return `<th><div class="compare-head-card"><div class="compare-score">${b.overall}%<span>overall fit</span></div>${badge}<strong>${escapeHtml(x.title||'Property')}</strong><small>${escapeHtml(x.locality||'—')} · ${priceLabel(x)}</small></div></th>`;
    }).join('');
    $('compareContent').innerHTML=`
      <div class="compare-explainer"><div><b>Focused comparison of your selected properties.</b><span>Every score below is calculated only for these selected properties. Market Intelligence and Trust & Deals use the same focused comparison context.</span></div><span class="badge dark">${scored.length} SELECTED</span></div>
      <div class="comparison-table-wrap premium-compare"><table><thead><tr><th>Decision factor</th>${cols}</tr></thead><tbody>
        ${cmpRow('Mode',scored.map(x=>x.listingMode==='RENT'?'Rent':'Buy'))}
        ${cmpRow('Price',scored.map(x=>priceLabel(x)))}
        ${cmpRow('Area',scored.map(x=>`${x.areaSqFt||'—'} sq ft`))}
        ${cmpRow('Bedrooms',scored.map(x=>x.bedrooms?`${x.bedrooms} BHK`:'Commercial'))}
        ${cmpRow('Amenities',scored.map(x=>(x.amenities||[]).join(', ')||'Not specified'))}
        ${cmpRow('Preference fit',scored.map(x=>`${x.breakdown.preferenceFit}%`))}
        ${cmpRow('Value score',scored.map(x=>`${x.breakdown.valueScore}%`))}
        ${cmpRow('Trust score',scored.map(x=>`${x.breakdown.trustScore}/100`))}
        ${cmpRow('Locality score',scored.map(x=>`${x.breakdown.localityScore}/100`))}
        ${cmpRow('Information completeness',scored.map(x=>`${x.breakdown.completeness}%`))}
        ${cmpRow('Recommendation',scored.map(x=>`${x.breakdown.overall}%`))}
        ${cmpRow('Price insight',scored.map(x=>x.live?(x.pricePerSqft?money(x.pricePerSqft)+' / sq ft':'Live source'):(x.listingMode==='BUY'?money(x.estimatedPrice||0):'Rental listing')))}
        ${cmpRow('Price gap',scored.map(x=>x.advanced?.priceDeltaPct==null?'—':`${Number(x.advanced.priceDeltaPct)>0?'+':''}${Number(x.advanced.priceDeltaPct).toFixed(1)}%`))}
      </tbody></table></div>
      <div class="compare-insight-grid">${scored.map(x=>{
        const b=x.breakdown; const parts=Array.isArray(b.parts)?b.parts:[]; const reasons=parts.filter(p=>Number(p?.value||0)>=80).slice(0,3).map(p=>p.label);
        return `<article class="compare-insight-card"><div class="compare-card-top"><span class="score-badge">${b.overall}%</span><span>${x.id===best.id?'Highest current fit':'Compared property'}</span></div><h3>${escapeHtml(x.title||'Property')}</h3><p>${reasons.length?`Strong signals: ${reasons.join(', ')}.`:'Balanced profile fit; review the factor scores before deciding.'}</p><div class="factor-bars"><div><span>Preference</span><i><em style="width:${b.preferenceFit}%"></em></i><b>${b.preferenceFit}</b></div><div><span>Value</span><i><em style="width:${b.valueScore}%"></em></i><b>${b.valueScore}</b></div><div><span>Trust</span><i><em style="width:${b.trustScore}%"></em></i><b>${b.trustScore}</b></div><div><span>Locality</span><i><em style="width:${b.localityScore}%"></em></i><b>${b.localityScore}</b></div></div><button class="soft-btn compact" data-compare-open="${x.id}">Open property</button></article>`;
      }).join('')}</div>
      <div class="comparison-foot"><button class="soft-btn" id="compareBest">Open highest-fit property</button><button class="primary-btn" id="compareInsights">Focus Trust & Deals on selected properties</button></div>`;
    $('compareBest').onclick=()=>{closeOverlay('compareOverlay');openProperty(best.id);};
    $('compareInsights').onclick=()=>{closeOverlay('compareOverlay'); document.querySelector('[data-workspace="trust"]')?.click(); renderTrustDashboard(state.currentItems); showToast('Trust & Deals is now focused on the selected properties.');};
    document.querySelectorAll('[data-compare-open]').forEach(b=>b.onclick=()=>{closeOverlay('compareOverlay');openProperty(Number(b.dataset.compareOpen));});
    $('compareOverlay').classList.remove('hidden');
  }catch(err){ console.error('Comparison open failed',err); updateComparePreview(); showToast('Comparison could not be opened. Please select the current properties again.',true); }
}

function cmpRow(label,values){return `<tr><td>${escapeHtml(label)}</td>${values.map(v=>`<td>${escapeHtml(v)}</td>`).join('')}</tr>`;}

function updateFavoritesPreview(){
  const items=state.favorites.map(id=>itemById(id)).filter(Boolean).slice(0,3); $('favoriteBadge').textContent=`${state.favorites.length} saved`;
  $('favoritePreview').innerHTML=items.length?items.map(x=>`<div class="favorite-row"><div class="mini-thumb ${imageClass(x)}"></div><div><strong>${escapeHtml(x.title)}</strong><span>${escapeHtml(x.locality)} · ${priceLabel(x)}</span></div><button class="text-btn" data-details="${x.id}">Open</button></div>`).join(''):'<div class="empty">Click the ♡ icon on a property card to save it.</div>';
  document.querySelectorAll('#favoritePreview [data-details]').forEach(b=>b.addEventListener('click',()=>openProperty(Number(b.dataset.details))));
}
function updateAccountUI(){
  const has=!!state.profile; $('loginBtn').classList.toggle('hidden',has); $('signInBtn').classList.toggle('hidden',has); $('profileBtn').classList.toggle('hidden',!has); if(has) $('profileBtn').textContent=(state.profile.name||'U').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
}

async function openProperty(id){
  try{
    if(state.liveLookup[Number(id)]){
      const base=state.liveLookup[Number(id)]; const detail=await (await fetch('/api/live/property?listingId='+encodeURIComponent(base.externalId))).json();
      const raw=detail.listing||{}; const d={...base,title:raw.title||base.title,price:Number(raw.price||base.price),areaSqFt:Number(raw.areaSqft||raw.carpetAreaSqft||base.areaSqFt),bedrooms:Number(raw.bhk||base.bedrooms),amenities:Array.isArray(raw.amenities)?raw.amenities:base.amenities,reraId:raw.reraId||base.reraId,sourceUrl:raw.handoffUrl||base.sourceUrl,live:true};
      state.property=d; $('propertyDetail').innerHTML=propertyPage(d); $('propertyOverlay').classList.remove('hidden'); history.replaceState(null,'',`#property/${id}`);
      $('favoriteDetail').textContent=isFavorite(id)?'♥ Favorited':'♡ Favorite'; $('favoriteDetail').onclick=()=>{toggleFavorite(Number(id));$('favoriteDetail').textContent=isFavorite(id)?'♥ Favorited':'♡ Favorite';}; $('workflowDetail').onclick=()=>openWorkflow(Number(id)); $('workflowDetail').textContent=d.listingMode==='RENT'?'Rent / Contact Owner':'Buy / Contact Seller'; $('offerDetail')?.classList.add('hidden'); renderDetailMap(d); $('loanPrice').value=d.price; calculateEmi(); return;
    }
    const data=await (await fetch(`/api/property?id=${id}`)).json(); state.property=data; $('propertyDetail').innerHTML=propertyPage(data); $('propertyOverlay').classList.remove('hidden');
    history.replaceState(null,'',`#property/${id}`); $('favoriteDetail').textContent=isFavorite(id)?'♥ Favorited':'♡ Favorite'; $('favoriteDetail').onclick=()=>{toggleFavorite(id);$('favoriteDetail').textContent=isFavorite(id)?'♥ Favorited':'♡ Favorite';}; $('workflowDetail').onclick=()=>openWorkflow(id); const offerBtn=$('offerDetail'); offerBtn?.classList.toggle('hidden',!(data.listingMode==='BUY'&&data.sellerOwned&&state.role==='BUYER')); if(offerBtn) offerBtn.onclick=()=>openOffer(id); renderDetailMap(data); $('loanPrice').value=data.price; calculateEmi();
  }catch(e){showToast('Unable to load property details from the selected source',true);}
}

function propertyPage(d){
  const savings=d.live ? (d.pricePerSqft ? `<div class="detail-stat"><span>Live price / sq ft</span><strong>${money(d.pricePerSqft)}</strong><small>Provider-reported current listing figure</small></div>` : '') : ((d.listingMode==='BUY' && d.estimatedPrice) ? `<div class="detail-stat"><span>Python estimate</span><strong>${money(d.estimatedPrice)}</strong><small>${escapeHtml(d.priceFlag)}</small></div>` : '');
  const amen=d.amenities.map(a=>`<span>${escapeHtml(a)}</span>`).join('');
  return `<div class="detail-hero"><div class="property-hero-image ${imageClass(d)}"><span class="listing-tag">${d.listingMode==='RENT'?'FOR RENT':'FOR SALE'}</span><span class="hero-image-label">${escapeHtml(d.propertyType)}</span></div><div class="detail-hero-copy"><p class="eyebrow">${escapeHtml(d.locality)} · ${escapeHtml(d.city||'Visakhapatnam')}</p><h1>${escapeHtml(d.title)}</h1><p class="detail-lede">A ${escapeHtml(d.propertyType.toLowerCase())} listing in ${escapeHtml(d.locality)} with ${d.areaSqFt} sq ft, ${d.bedrooms?d.bedrooms+' bedrooms':'commercial configuration'} and ${d.amenities.length} listed amenities.</p><div class="detail-price">${priceLabel(d)}</div><div class="detail-tags"><span>${d.areaSqFt} sq ft</span><span>${d.bedrooms?d.bedrooms+' BHK':'Property'}</span><span>${d.listingMode==='BUY'?'One-time purchase':'Monthly rental'}</span>${d.verified?'<span class="live-detail-tag">VERIFIED FLAG</span>':''}${d.live?'<span class="live-detail-tag">LIVE SOURCE</span>':''}</div></div></div>
  <div class="detail-grid"><section class="panel inset"><div class="panel-head"><div><p class="kicker">PROPERTY DETAILS</p><h2>Overview</h2></div></div><div class="detail-stats"><div class="detail-stat"><span>Locality</span><strong>${escapeHtml(d.locality)}</strong></div><div class="detail-stat"><span>Type</span><strong>${escapeHtml(d.propertyType)}</strong></div><div class="detail-stat"><span>Area</span><strong>${d.areaSqFt} sq ft</strong></div><div class="detail-stat"><span>Bedrooms</span><strong>${d.bedrooms?d.bedrooms:'—'}</strong></div>${savings}<div class="detail-stat"><span>Seller</span><strong>${escapeHtml(d.sellerName||'Marketplace seller')}</strong><small>${d.sellerOwned?'Connected seller account':'Source listing'}</small></div></div><h3 class="mini-heading">Amenities</h3><div class="amenity-list">${amen}</div><div class="location-callout"><strong>Map reference</strong><span>${escapeHtml(d.mapLabel||((d.locality||'Visakhapatnam')+', Visakhapatnam'))}</span><small>${escapeHtml(d.locationNote||'Locality-level reference; exact property address is not exposed by the public feed.')}</small></div>${d.live&&d.sourceUrl?`<div class="location-callout live-callout"><strong>Source verification</strong><a href="${escapeHtml(d.sourceUrl)}" target="_blank" rel="noreferrer">Open provider listing ↗</a>${d.reraId?`<small>RERA reference: ${escapeHtml(d.reraId)}</small>`:''}</div>`:''}</section>
  <section class="panel inset"><div class="panel-head"><div><p class="kicker">LOCATION</p><h2>Where it sits</h2></div><a class="soft-btn compact" target="_blank" rel="noreferrer" href="https://www.openstreetmap.org/?mlat=${d.mapLat}&mlon=${d.mapLng}#map=14/${d.mapLat}/${d.mapLng}">Open map ↗</a></div><div id="detailMap" class="detail-map"></div><p class="map-note">The map is centred on the real locality name supplied by the listing dataset; it is not an exact building address.</p></section></div>
  <section class="panel inset detail-trust-panel"><div class="panel-head"><div><p class="kicker">TRUST & DECISION SIGNALS</p><h2>Before you decide</h2></div><span class="badge">EXPLAINABLE</span></div><div class="trust-metrics"><span><b>${d.advanced?.trustScore??'—'}</b> listing confidence</span><span><b>${d.advanced?.completenessScore??'—'}%</b> information completeness</span><span><b>${d.advanced?.localityScore??'—'}</b> locality score</span><span><b>${escapeHtml(d.advanced?.priceAlert||'—')}</b></span></div><div class="detail-trust-grid"><div><strong>Verification</strong><p>${escapeHtml(d.advanced?.verificationStatus||'PENDING REVIEW')}</p></div><div><strong>Duplicate check</strong><p>${d.advanced?.duplicateFlag?'Possible duplicate listing':'No duplicate flag detected'}</p></div><div><strong>Seller</strong><p>${escapeHtml(d.sellerName||d.advanced?.sellerName||'Marketplace seller')}</p></div><div><strong>Price insight</strong><p>${d.advanced?.priceDeltaPct!=null?`${d.advanced.priceDeltaPct>0?'+':''}${d.advanced.priceDeltaPct}% vs model estimate`:'See price estimate above'}</p></div></div><div class="price-history-line"><strong>Price history</strong><div>${(d.advanced?.priceHistory||[]).map(p=>`<span>${money(p.price)}</span>`).join(' → ')||'Initial listing price recorded'}</div></div></section>`;
}
function renderDetailMap(d){
  const el=$('detailMap'); if(!el || !window.L) return; const c=localityCoords[d.locality]||cityCoords[d.city]||cityCoords['Visakhapatnam']; const lat=Number(d.mapLat||c[0]), lng=Number(d.mapLng||c[1]); const label=d.mapLabel||((d.locality||d.city||'Visakhapatnam')+', '+(d.city||'Visakhapatnam')); const m=L.map(el,{scrollWheelZoom:false}).setView([lat,lng],13); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(m); L.marker([lat,lng]).addTo(m).bindPopup(escapeHtml(label)).openPopup(); setTimeout(()=>m.invalidateSize(),80); }

function closeOverlay(id){ $(id)?.classList.add('hidden'); }
function openWorkflow(id){
  const x=itemById(id); if(!x){showToast('Property not found',true);return;}
  if(!state.sessionToken || state.role!=='BUYER'){ showToast('Please log in as a buyer before sending an inquiry.',true); $('loginOverlay').classList.remove('hidden'); return; }
  $('workflowListingId').value=id; $('workflowKicker').textContent=x.listingMode==='RENT'?'RENT WORKFLOW':'BUY WORKFLOW'; $('workflowTitle').textContent=x.listingMode==='RENT'?`Request a viewing for ${x.title}`:`Start a purchase enquiry for ${x.title}`;
  $('workflowSummary').innerHTML=`<strong>${escapeHtml(x.title)}</strong><span>${escapeHtml(x.locality)} · ${priceLabel(x)} · Seller: ${escapeHtml(x.sellerName||'Marketplace seller')}</span>`;
  if(state.profile){$('workflowName').value=state.profile.name||'';$('workflowEmail').value=state.profile.email||'';$('workflowPhone').value=state.profile.phone||'';}
  $('workflowOverlay').classList.remove('hidden'); $('workflowMsg').textContent='';
}
function openOffer(id){
  const x=itemById(id); if(!x){showToast('Property not found',true);return;}
  if(state.role!=='BUYER'){showToast('Please log in as a buyer to make an offer.',true);$('loginOverlay').classList.remove('hidden');return;}
  if(x.listingMode!=='BUY'){showToast('Offers are available for purchase listings only.',true);return;}
  $('offerListingId').value=id; $('offerSummary').innerHTML=`<strong>${escapeHtml(x.title)}</strong><span>${escapeHtml(x.locality)} · Asking ${priceLabel(x)} · Seller: ${escapeHtml(x.sellerName||'Marketplace seller')}</span>`; $('offerAmount').value=x.price; $('offerMessage').value=''; $('offerMsg').textContent=''; $('offerOverlay').classList.remove('hidden');
}
function initOffer(){
  const f=$('offerForm'); if(!f)return;
  f.addEventListener('submit',async e=>{e.preventDefault();$('offerMsg').textContent='Sending offer…';try{const d=await postForm('/api/advanced/offers',{token:state.sessionToken,action:'create',listingId:$('offerListingId').value,amount:$('offerAmount').value,message:$('offerMessage').value});$('offerMsg').textContent=`Offer ${d.item?.id||''} sent to the seller.`;showToast('Offer sent to seller');setTimeout(()=>{closeOverlay('offerOverlay');refreshBuyerDeals();},700);}catch(err){$('offerMsg').textContent=err.message;}});
}

function initWorkflow(){
  document.querySelectorAll('.workflow-toggle button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.workflow-toggle button').forEach(x=>x.classList.remove('active'));b.classList.add('active');}));
  $('workflowForm').addEventListener('submit',async e=>{e.preventDefault();$('workflowMsg').textContent='Sending to seller…'; const body=new URLSearchParams({token:state.sessionToken,listingId:$('workflowListingId').value,phone:$('workflowPhone').value,email:$('workflowEmail').value,date:$('workflowDate').value,message:$('workflowMessage').value,kind:document.querySelector('.workflow-toggle button.active')?.dataset.kind||'SITE_VISIT'}); try{const r=await fetch('/api/inquiry',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});const d=await r.json();if(!d.ok)throw new Error(d.message||'Inquiry failed');$('workflowMsg').textContent=`Reference ${d.reference}. ${d.message}`;showToast(`Inquiry sent to ${d.sellerName}`);setTimeout(()=>{closeOverlay('workflowOverlay');openBuyerInbox();},700);}catch(err){$('workflowMsg').textContent=err.message||'Inquiry could not be sent.';}});
}

function updateMap(items){
  if(!window.L || !$('map')) { $('mapFallback').classList.remove('hidden'); return; }
  $('mapFallback').classList.add('hidden');
  if(!state.map){ state.map=L.map('map',{scrollWheelZoom:false}).setView([17.76,83.34],12); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(state.map); }
  state.markers.forEach(m=>m.remove()); state.markers=[];
  const grouped={}; (items||[]).forEach(x=>{if(!grouped[x.locality]) grouped[x.locality]=[];grouped[x.locality].push(x);});
  Object.entries(grouped).forEach(([loc,list])=>{const first=list[0]||{}; const c=localityCoords[loc]||cityCoords[first.city]||cityCoords[state.liveCity]||cityCoords['Visakhapatnam']; if(!c)return; const marker=L.marker(c).addTo(state.map).bindPopup(`<strong>${escapeHtml(loc)}</strong><br>${list.length} current match${list.length===1?'':'es'}`); marker.on('click',()=>{const first=list[0];openProperty(first.id);}); state.markers.push(marker);});
  if(state.markers.length){const group=L.featureGroup(state.markers);state.map.fitBounds(group.getBounds().pad(0.25));} else { const c=cityCoords[state.liveCity]||cityCoords['Visakhapatnam']; state.map.setView(c,12); }
  setTimeout(()=>state.map.invalidateSize(),100);
}

function renderTrend(){
  const loc=$('trendLocality')?.value; const svg=$('trendChart'); if(!svg||!loc)return;
  let data=trendData[loc]||trendData['MVP Colony']; let label='Academic index · base 100'; let scalePercent=false;
  const insights=state.liveInsights?.supported?state.liveInsights.insights:null; const trend=insights?.priceTrends||[];
  if(state.dataMode==='LIVE' && insights){
    const vals=trend.map(x=>Number(x.avgPriceInr||x.pricePerSqftInr||x.avgPricePerSqft||0)).filter(Boolean);
    if(vals.length>=2){ data=vals; label='Live provider price trend'; scalePercent=false; }
    else if(insights.priceGrowth1YPct!=null || insights.yoyGrowthPct!=null){ const g=Number(insights.priceGrowth1YPct??insights.yoyGrowthPct); data=[100,100*(1+g/100)]; label=`Live 1Y growth ${g}%`; scalePercent=true; }
    else { label='Live insight available · trend history not supplied'; }
  }
  const first=Number(data[0]||0), last=Number(data[data.length-1]||0); const change=first?((last-first)/first*100):0; const direction=change>3?'Rising':change<-3?'Softening':'Stable';
  if($('trendChange'))$('trendChange').textContent=`${change>0?'+':''}${change.toFixed(1)}%`;
  if($('trendLatest'))$('trendLatest').textContent=scalePercent?`${last.toFixed(1)}%`:Math.round(last).toLocaleString('en-IN');
  if($('trendDirection'))$('trendDirection').textContent=direction;
  const W=720,H=270,pad=44; const min=Math.min(...data)-((Math.max(...data)-Math.min(...data))*0.08||2),max=Math.max(...data)+((Math.max(...data)-Math.min(...data))*0.08||2); const x=i=>pad+i*(W-2*pad)/Math.max(1,data.length-1); const y=v=>H-pad-(v-min)*(H-2*pad)/Math.max(1,max-min); let path=''; data.forEach((v,i)=>path+=(i?'L':'M')+x(i).toFixed(1)+','+y(v).toFixed(1));
  let circles=data.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="currentColor" />`).join(''); let grid=[0,1,2,3].map(i=>{const gv=min+i*(max-min)/3;return `<line x1="${pad}" y1="${y(gv)}" x2="${W-pad}" y2="${y(gv)}" stroke="#d8ddd7" stroke-dasharray="4 6"/><text x="8" y="${y(gv)+4}" fill="#79827f" font-size="11">${scalePercent?gv.toFixed(0)+'%':Math.round(gv).toLocaleString('en-IN')}</text>`}).join('');
  svg.innerHTML=`${grid}<path d="${path}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>${circles}<text x="${pad}" y="${H-12}" fill="#79827f" font-size="11">${escapeHtml(label)}</text><text x="${W-pad-145}" y="26" fill="#536b52" font-size="12" font-weight="700">${escapeHtml(loc)}</text>`;
  $('trendBadge').textContent=(state.dataMode==='LIVE'&&insights)?'LIVE MARKET':'ACADEMIC FALLBACK';
  $('trendDescription').textContent=(state.dataMode==='LIVE'&&insights)?`Current provider insight for ${loc}. The displayed change is ${change>0?'+':''}${change.toFixed(1)}% across the available periods.`:`Academic index for ${loc}. The displayed change is ${change>0?'+':''}${change.toFixed(1)}% across the labelled periods.`;
  if($('marketDirectionText'))$('marketDirectionText').textContent=direction==='Rising'?`The selected index is rising by about ${change.toFixed(1)}% across the displayed periods.`:direction==='Softening'?`The selected index is softer by about ${Math.abs(change).toFixed(1)}% across the displayed periods.`:`The selected index is broadly stable across the displayed periods.`;
}

function calculateEmi(){
  const price=Math.max(0,Number($('loanPrice').value||0)); const down=Math.max(0,Number($('downPayment').value||0)); const P=Math.max(0,price-down); const annual=Math.max(0,Number($('interestRate').value||0)); const n=Math.max(1,Number($('tenure').value||0))*12; const r=annual/1200; const emi=r===0?P/n:(P*r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1); const total=emi*n; const income=Math.max(0,Number($('grossIncome')?.value||0)); const existing=Math.max(0,Number($('existingEmi')?.value||0)); const taxMonthly=Math.max(0,Number($('propertyTax')?.value||0))/12; const insMonthly=Math.max(0,Number($('propertyInsurance')?.value||0))/12; const housing=emi+taxMonthly+insMonthly; const totalDebt=existing+housing; const ltv=price>0?(P/price*100):0; const processing=price*0.005; const upfront=down+processing; const debtRatio=income>0?(totalDebt/income*100):0;
  $('loanAmount').textContent=money(P); $('emiValue').textContent=money(emi); $('interestValue').textContent=money(Math.max(0,total-P));
  if($('ltvValue'))$('ltvValue').textContent=`${ltv.toFixed(1)}%`;
  if($('housingLoad'))$('housingLoad').textContent=income?`${debtRatio.toFixed(1)}%`:money(housing);
  if($('upfrontCash'))$('upfrontCash').textContent=money(upfront);
  if($('affordabilityStatus')) $('affordabilityStatus').textContent=income===0?'Add income':debtRatio<=35?'Comfortable':debtRatio<=45?'Watch monthly load':'High monthly load';
  if($('affordabilityText')) $('affordabilityText').textContent=income===0?'Add gross income to estimate the recurring burden.':`Estimated housing + existing debt uses about ${debtRatio.toFixed(1)}% of the stated gross income. LTV is ${ltv.toFixed(1)}%.`;
}
function syncFinanceSelection(item){
  if(!item)return; $('loanPrice').value=Number(item.price||0); if($('financeSelectedProperty'))$('financeSelectedProperty').textContent=item.title||`Property ${item.id}`; if($('financeCurrentMode'))$('financeCurrentMode').textContent=item.listingMode==='RENT'?'Rent':'Buy'; if($('financeNextAction'))$('financeNextAction').textContent=item.listingMode==='RENT'?'Request a viewing':'Send a purchase enquiry'; calculateEmi();
}
function openFinanceStep(step){
  if(step==='search'){document.querySelector('[data-workspace="search"]')?.click();return;}
  const item=state.currentItems?.[0]||state.allItems?.[state.mode]?.[0];
  if(step==='details'&&item){openProperty(item.id);return;}
  if(step==='buy'&&item){openWorkflow(item.id);return;}
  if(step==='connect'&&item){openWorkflow(item.id);return;}
  showToast('Run a property search first so this action has a listing to work with.',true);
}

function showLanding(){
  $('landingAuthPanel')?.classList.add('hidden');
  $('welcomeScreen')?.classList.remove('hidden');
  $('appShell')?.classList.add('hidden');
  $('buyerWorkspaceNav')?.classList.add('hidden');
  $('sellerDashboardOverlay')?.classList.add('hidden');
  document.querySelectorAll('.overlay').forEach(o=>{if(o.id!=='welcomeScreen') o.classList.add('hidden');});
}
function showBuyerWorkspace(view='overview'){
  if(view==='trust') refreshBuyerDeals();
  $('welcomeScreen')?.classList.add('hidden');
  $('appShell')?.classList.remove('hidden');
  $('buyerWorkspaceNav')?.classList.remove('hidden');
  $('sellerDashboardOverlay')?.classList.add('hidden');
  document.querySelectorAll('.workspace-btn').forEach(b=>b.classList.toggle('active',b.dataset.workspace===view));
  document.querySelectorAll('[data-workspace-view]').forEach(el=>{
    const views=(el.dataset.workspaceView||'').split(/\s+/);
    el.classList.toggle('workspace-hidden',!views.includes(view));
  });
  const main=$('top'); if(main) main.scrollTop=0;
}
function showSellerWorkspace(){
  $('welcomeScreen')?.classList.add('hidden');
  $('appShell')?.classList.remove('hidden');
  $('buyerWorkspaceNav')?.classList.add('hidden');
  $('sellerDashboardOverlay')?.classList.remove('hidden');
}
function enterWorkspaceAfterAuth(){
  if(state.role==='BUYER') showBuyerWorkspace('overview');
  else if(state.role==='SELLER') showSellerWorkspace();
  else showLanding();
}
function initWorkspaceNav(){
  document.querySelectorAll('.workspace-btn').forEach(b=>b.addEventListener('click',()=>showBuyerWorkspace(b.dataset.workspace)));
}

function setSession(token,user){
  state.sessionToken=token||''; state.profile=user||null; state.role=user?.role||null;
  if(token) sessionStorage.setItem('estate_session',token); else sessionStorage.removeItem('estate_session');
  updateAccountUI();
}
async function authMe(){
  if(!state.sessionToken) return false;
  try{const d=await (await fetch('/api/me?token='+encodeURIComponent(state.sessionToken))).json(); if(d.ok){setSession(state.sessionToken,d.user);return true;}}catch(e){}
  setSession('',null); return false;
}
async function postForm(url, data){ const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data)}); const d=await r.json(); if(!r.ok||d.ok===false) throw new Error(d.message||'Request failed'); return d; }
function openRoleChooser(role){
  state.pendingRole=role;
  const isBuyer=role==='BUYER';
  const panel=$('landingAuthPanel');
  if(panel){
    $('landingAuthKicker').textContent=isBuyer?'BUYER ACCESS':'SELLER ACCESS';
    $('landingAuthTitle').textContent=isBuyer?'Continue as Buyer':'Continue as Seller';
    $('landingAuthText').textContent=isBuyer
      ?'Use Login for an existing buyer account or Sign In to create a new buyer account.'
      :'Use Login for an existing seller account or Sign In to create a new seller account.';
    $('landingLoginBtn').textContent=isBuyer?'Buyer Login':'Seller Login';
    $('landingSignupBtn').textContent=isBuyer?'Buyer Sign Up / Create Account':'Seller Sign Up / Create Account';
    $('landingShowcaseBtn')?.classList.toggle('hidden', isBuyer);
    if($('landingShowcaseBtn')) $('landingShowcaseBtn').textContent='Open Showcase Seller Account';
    panel.classList.remove('hidden');
    panel.scrollIntoView({behavior:'smooth',block:'nearest'});
    return;
  }
  $('roleAuthKicker').textContent=isBuyer?'BUYER ACCESS':'SELLER ACCESS';
  $('roleAuthTitle').textContent=isBuyer?'Enter as Buyer':'Enter as Seller';
  $('roleAuthText').textContent='Use Login for an existing account or Sign Up to create a new account.';
  $('roleLoginBtn').textContent=isBuyer?'Buyer Login':'Seller Login';
  $('roleSignupBtn').textContent=isBuyer?'Buyer Sign In':'Seller Sign In';
  $('roleShowcaseBtn')?.classList.toggle('hidden', isBuyer);
  $('roleAuthOverlay').classList.remove('hidden');
}
function closeLandingRoleChooser(){ $('landingAuthPanel')?.classList.add('hidden'); }
function openSignup(role){
  state.pendingRole=role;
  const isBuyer=role==='BUYER';
  $('signupRole').value=role;
  $('signupKicker').textContent=isBuyer?'BUYER ACCOUNT':'SELLER ACCOUNT';
  $('signupTitle').textContent=isBuyer?'Create Buyer Account':'Create Seller Account';
  $('buyerSignupFields').classList.toggle('hidden',!isBuyer);
  $('sellerSignupFields').classList.toggle('hidden',isBuyer);
  const nameLabel=$('signupName')?.closest('label'); if(nameLabel) nameLabel.firstChild.textContent=isBuyer?'Full name ':'Seller / agency name ';
  $('signupOverlay').classList.remove('hidden');
}
async function openShowcaseSeller(){
  try{
    closeLandingRoleChooser(); closeOverlay('roleAuthOverlay'); closeOverlay('sellerLoginOverlay');
    $('landingShowcaseBtn')?.setAttribute('disabled','disabled'); $('roleShowcaseBtn')?.setAttribute('disabled','disabled');
    const d=await postForm('/api/auth/demo-seller',{});
    setSession(d.token,d.user); state.showcaseSeller=true;
    showToast('Showcase Seller Account opened with preloaded properties.');
    openSellerDashboard();
  }catch(e){ showToast(e.message||'Could not open the showcase seller account.',true); }
  finally{ $('landingShowcaseBtn')?.removeAttribute('disabled'); $('roleShowcaseBtn')?.removeAttribute('disabled'); }
}

function initAuth(){
  $('landingBuyerRole').onclick=()=>openRoleChooser('BUYER');
  $('landingSellerRole').onclick=()=>openRoleChooser('SELLER');
  $('landingAuthBack').onclick=closeLandingRoleChooser;
  $('landingLoginBtn').onclick=()=>{
    closeLandingRoleChooser();
    if(state.pendingRole==='BUYER') $('loginOverlay').classList.remove('hidden');
    else $('sellerLoginOverlay').classList.remove('hidden');
  };
  $('landingSignupBtn').onclick=()=>{closeLandingRoleChooser();openSignup(state.pendingRole);};
  $('landingShowcaseBtn')?.addEventListener('click',openShowcaseSeller);
  $('roleShowcaseBtn')?.addEventListener('click',openShowcaseSeller);
  $('roleAuthClose').onclick=()=>closeOverlay('roleAuthOverlay');
  $('roleLoginBtn').onclick=()=>{closeOverlay('roleAuthOverlay'); if(state.pendingRole==='BUYER') $('loginOverlay').classList.remove('hidden'); else $('sellerLoginOverlay').classList.remove('hidden');};
  $('roleSignupBtn').onclick=()=>{closeOverlay('roleAuthOverlay'); openSignup(state.pendingRole);};

  $('loginBtn').onclick=()=>openRoleChooser('BUYER');
  $('signInBtn').onclick=()=>openSignup('BUYER');
  $('heroSignIn')?.addEventListener('click',()=>openSignup('BUYER'));
  $('sellerLoginBtn').onclick=()=>openRoleChooser('SELLER');
  $('sellerSignupFromLogin').onclick=()=>{closeOverlay('sellerLoginOverlay');openSignup('SELLER');};
  $('sellerShowcaseFromLogin')?.addEventListener('click',openShowcaseSeller);
  $('buyerSignupFromLogin').onclick=()=>{closeOverlay('loginOverlay');openSignup('BUYER');};
  $('signupLoginSwitch').onclick=()=>{const role=$('signupRole').value; closeOverlay('signupOverlay'); if(role==='BUYER') $('loginOverlay').classList.remove('hidden'); else $('sellerLoginOverlay').classList.remove('hidden');};
  $('profileBtn').onclick=()=>openProfile();
  $('buyerInboxBtn').onclick=()=>openBuyerInbox();
  $('buyerSidebarInbox').onclick=()=>openBuyerInbox();
  $('sellerDashboardBtn').onclick=()=>openSellerDashboard();

  $('loginForm').addEventListener('submit',async e=>{
    e.preventDefault();$('loginMsg').textContent='Signing in…';
    try{const d=await postForm('/api/auth/login',{email:$('loginEmail').value,password:$('loginPassword').value});
      if(d.user.role!=='BUYER')throw new Error('This account is not a buyer. Choose Seller for seller accounts.');
      setSession(d.token,d.user);closeOverlay('loginOverlay');showToast(`Welcome, ${d.user.name}`);applyProfileToForm();await search();enterWorkspaceAfterAuth();
    }catch(err){$('loginMsg').textContent=err.message;}
  });

  $('signupForm').addEventListener('submit',async e=>{
    e.preventDefault();$('signupMsg').textContent='Creating account…';
    const role=$('signupRole').value;
    const password=$('signupPassword').value; const confirm=$('signupPasswordConfirm').value;
    if(password!==confirm){$('signupMsg').textContent='Passwords do not match.'; return;}
    const sellerRole=role==='SELLER';
    const payload={role,name:$('signupName').value,email:$('signupEmail').value,phone:$('signupPhone').value,password,mode:$('signupMode').value,locality:sellerRole?$('signupSellerLocality').value:$('signupLocality').value,minBudget:$('signupMinBudget').value,maxBudget:$('signupMaxBudget').value};
    try{const d=await postForm('/api/auth/register',payload);setSession(d.token,d.user);closeOverlay('signupOverlay');showToast(`${role==='BUYER'?'Buyer':'Seller'} account created.`);if(role==='BUYER'){applyProfileToForm();await search();}enterWorkspaceAfterAuth();}
    catch(err){$('signupMsg').textContent=err.message;}
  });

  $('sellerLoginForm').addEventListener('submit',async e=>{
    e.preventDefault();$('sellerLoginMsg').textContent='Signing in…';
    try{const d=await postForm('/api/auth/login',{email:$('sellerLoginEmail').value,password:$('sellerLoginPassword').value});
      if(d.user.role!=='SELLER')throw new Error('This account is not a seller. Choose Buyer for buyer accounts.');
      setSession(d.token,d.user);closeOverlay('sellerLoginOverlay');showToast(`Seller workspace ready, ${d.user.name}`);openSellerDashboard();
    }catch(err){$('sellerLoginMsg').textContent=err.message;}
  });
  $('sellerLogoutBtn').onclick=logoutCurrent;
  if($('sellerLogoutBtn2')) $('sellerLogoutBtn2').onclick=logoutCurrent;
}
function applyProfileToForm(){ const p=state.profile; if(!p||p.role!=='BUYER')return; updateMode(p.preferredMode||'BUY'); if([...$('locality').options].some(o=>o.value===p.locality)) $('locality').value=p.locality||'All'; if(p.minBudget) $('minPrice').value=p.minBudget; if(p.maxBudget) $('maxPrice').value=p.maxBudget; }
function openProfile(){
  const p=state.profile; if(!p)return; $('profileTitle').textContent=p.name; $('profileContent').innerHTML=`<div class="profile-card"><div class="profile-badge">${(p.name||'U').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase()}</div><div><strong>${escapeHtml(p.email)}</strong><span>Role: Buyer</span><span>Preferred mode: ${p.preferredMode==='RENT'?'Rent':'Buy'}</span><span>Locality: ${escapeHtml(p.locality||'All')}</span></div></div><button class="soft-btn full" id="openBuyerInboxFromProfile">Open my inquiry inbox</button><button class="primary-btn full" id="logoutBtn">Log out</button><p class="auth-hint">Buyer account data is stored on the Java server; passwords are PBKDF2-hashed and the browser holds only a session token.</p>`; $('profileOverlay').classList.remove('hidden'); $('logoutBtn').onclick=logoutCurrent; $('openBuyerInboxFromProfile').onclick=openBuyerInbox;
}
async function logoutCurrent(){ try{if(state.sessionToken) await postForm('/api/auth/logout',{token:state.sessionToken});}catch(e){} if(state.sellerPoll)clearInterval(state.sellerPoll); setSession('',null); closeOverlay('profileOverlay'); closeOverlay('sellerDashboardOverlay'); showLanding(); showToast('Logged out'); }
function updateAccountUI(){
  const buyer=state.role==='BUYER', seller=state.role==='SELLER';
  $('loginBtn').classList.toggle('hidden',buyer||seller); $('signInBtn').classList.toggle('hidden',buyer||seller); $('profileBtn').classList.toggle('hidden',!buyer); $('buyerInboxBtn').classList.toggle('hidden',!buyer); $('sellerDashboardBtn').classList.toggle('hidden',!seller);
  $('sellerLoginBtn').classList.toggle('hidden',seller); if(buyer) $('profileBtn').textContent=(state.profile.name||'U').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
}

async function openSellerDashboard(){
  if(state.role!=='SELLER'){ $('sellerLoginOverlay').classList.remove('hidden'); return; }
  $('sellerWelcome').textContent=`Logged in as ${state.profile.name} · ${state.profile.email}` + (state.profile.isShowcase ? ' · PRELOADED SHOWCASE ACCOUNT' : '');
  $('sellerAccountName').textContent=state.profile.name||'Seller'; $('sellerAccountEmail').textContent=state.profile.email||'—'; $('sellerAccountBadge').textContent=(state.profile.name||'SE').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
  showSellerWorkspace(); await refreshSellerListings(); await refreshSellerInquiries(true); await updateSellerOverview(); startSellerPolling();
}
async function updateSellerOverview(){
  const rows=document.querySelectorAll('#sellerListingList .seller-property-row'); $('sellerListingCount').textContent=rows.length;
  $('sellerInquiryCount').textContent=$('sellerBadge')?.textContent||'0';
}
async function loadSellerMarket(){
  const city=$('sellerMarketCity')?.value||'Coimbatore'; const status=$('sellerMarketStatus'); if(!status)return; status.textContent='Refreshing market data…';
  try{ const d=await (await fetch('/api/live/insights?city='+encodeURIComponent(city))).json(); const x=d.insights||{}; $('sellerMarketPpsf').textContent=x.avgPricePerSqft?money(x.avgPricePerSqft):'—'; $('sellerMarketAvg').textContent=x.avgPrice?money(x.avgPrice):'—'; $('sellerMarketGrowth').textContent=x.yoyGrowth!=null?`${x.yoyGrowth}%`:'—'; $('sellerMarketSupply').textContent=x.supply??'—'; status.textContent=`${city} · ${d.live?'Live provider':'Fallback/academic reference'}`;}catch(e){status.textContent='Live market is unavailable for this city right now.';}
}
function startSellerPolling(){ if(state.sellerPoll)clearInterval(state.sellerPoll); state.sellerPoll=setInterval(async()=>{if(state.role!=='SELLER'){clearInterval(state.sellerPoll);return;} await refreshSellerInquiries(false); if(document.getElementById('sellerDealsTab') && !document.getElementById('sellerDealsTab').classList.contains('hidden')) refreshSellerDeals();},3000); }
async function refreshSellerListings(){try{const d=await (await fetch('/api/seller/properties?token='+encodeURIComponent(state.sessionToken))).json(); if(!d.ok)throw new Error(d.message||'Unable to load listings'); const list=d.items||[]; $('sellerListingList').innerHTML=list.map(p=>`<div class="seller-property-row"><div><strong>${escapeHtml(p.title)}</strong><span>${escapeHtml(p.locality)} · ${p.listingMode==='RENT'?money(p.price)+' / month':money(p.price)} · ${p.areaSqFt} sq ft</span><small>${escapeHtml(p.amenities.join(', '))}</small><em class="listing-visibility">Buyer-visible listing</em></div><button class="soft-btn compact" data-edit-property="${p.id}">Edit</button></div>`).join('')||'<div class="empty">No properties yet. Use Add Property to publish one.</div>'; document.querySelectorAll('[data-edit-property]').forEach(b=>b.onclick=()=>editSellerProperty(Number(b.dataset.editProperty)));}catch(e){$('sellerListingList').innerHTML=`<div class="empty">${escapeHtml(e.message)}</div>`;} finally { updateSellerOverview(); }}
function fillSellerForm(p){$('sellerPropertyId').value=p?.id||'';$('sellerTitle').value=p?.title||'';$('sellerMode').value=p?.listingMode||'BUY';$('sellerLocality').value=p?.locality||'';$('sellerPropertyType').value=p?.propertyType||'Apartment';$('sellerPrice').value=p?.price||'';$('sellerArea').value=p?.areaSqFt||'';$('sellerBedrooms').value=p?.bedrooms||0;$('sellerAmenities').value=(p?.amenities||[]).join(', ');$('sellerAddress').value=p?.address||'';$('sellerLat').value=p?.lat||'';$('sellerLng').value=p?.lng||'';$('sellerDescription').value=p?.description||'';$('sellerAddTab').classList.remove('hidden');$('sellerListingsTab').classList.add('hidden');document.querySelectorAll('.seller-tab-nav').forEach(b=>b.classList.toggle('active',b.dataset.sellerTab==='add'));}
function editSellerProperty(id){fetch('/api/seller/properties?token='+encodeURIComponent(state.sessionToken)).then(r=>r.json()).then(d=>{const p=(d.items||[]).find(x=>x.id===id);if(p)fillSellerForm(p);});}
async function refreshSellerInquiries(initial=false){try{const d=await (await fetch('/api/seller/inquiries?token='+encodeURIComponent(state.sessionToken))).json();if(!d.ok)throw new Error(d.message||'Unable to load inquiries');$('sellerBadge').textContent=d.unread||0; if(!initial && Number(d.unread||0)>Number(state.lastUnread||0)){showToast(`New buyer inquiry received (${d.unread} unread)`);} state.lastUnread=Number(d.unread||0); $('sellerInquiryCount').textContent=Number(d.unread||0); $('sellerInquiryList').innerHTML=(d.items||[]).map(q=>`<button class="inquiry-row ${q.status==='NEW'?'new':''}" data-seller-inquiry="${escapeHtml(q.id)}"><strong>${escapeHtml(q.propertyTitle)}</strong><span>${escapeHtml(q.buyerName)} · ${escapeHtml(q.kind)}</span><small>${escapeHtml(q.message)}</small><em>${escapeHtml(q.status)}</em></button>`).join('')||'<div class="empty">No buyer inquiries yet.</div>';document.querySelectorAll('[data-seller-inquiry]').forEach(b=>b.onclick=()=>openConversation(b.dataset.sellerInquiry,'seller'));}catch(e){}}
async function openConversation(inquiryId, role){
  const panel=role==='seller'?'sellerConversation':'buyerConversation';
  if(role==='seller') await postForm('/api/seller/inquiries/read',{token:state.sessionToken,inquiryId});
  const source=await (await fetch('/api/'+(role==='seller'?'seller/inquiries':'buyer/inquiries')+'?token='+encodeURIComponent(state.sessionToken))).json();
  const q=(source.items||[]).find(x=>x.id===inquiryId); if(!q)return;
  const ms=await (await fetch('/api/messages?token='+encodeURIComponent(state.sessionToken)+'&inquiryId='+encodeURIComponent(inquiryId))).json();
  let actions='';
  if(role==='seller' && q.kind==='SITE_VISIT'){
    try{const vd=await (await fetch('/api/advanced/visits?token='+encodeURIComponent(state.sessionToken))).json(); const v=(vd.items||[]).find(x=>Number(x.listingId)===Number(q.listingId)&&String(x.date||'')===String(q.date||'')); if(v){ actions=`<div class="deal-actions"><span class="status-pill">Site visit: ${escapeHtml(v.status)}</span>${v.status==='REQUESTED'?`<button class="soft-btn compact" id="acceptVisitBtn">Accept visit</button><button class="outline-btn compact" id="declineVisitBtn">Decline</button>`:''}</div>`; window.__openVisitId=v.id; }}catch(e){}
  }
  $(panel).innerHTML=`<div class="conversation-head"><div><strong>${escapeHtml(q.propertyTitle)}</strong><span>${escapeHtml(q.buyerName)} · ${escapeHtml(q.kind)}${q.date?' · '+escapeHtml(q.date):''}</span></div><div class="conversation-head-actions"><span class="status-pill">${escapeHtml(q.status)}</span><button type="button" class="text-btn" id="clearChatBtn">Clear chat</button></div></div><div class="buyer-contact-card"><b>Buyer contact</b><span>${escapeHtml(q.phone)}</span><span>${escapeHtml(q.email)}</span><p>${escapeHtml(q.message)}</p></div>${actions}<div class="message-thread">${(ms.items||[]).map(m=>`<div class="message-bubble ${m.senderId===state.profile.id?'mine':''}">${escapeHtml(m.text)}<small>${new Date(m.createdAt).toLocaleString('en-IN')}</small></div>`).join('')}</div><form class="reply-form" id="replyForm"><textarea id="replyText" rows="2" required placeholder="Type your reply..."></textarea><button class="primary-btn" type="submit">Send reply</button></form>`;
  if($('acceptVisitBtn')) $('acceptVisitBtn').onclick=async()=>{try{await postForm('/api/advanced/visits',{token:state.sessionToken,visitId:window.__openVisitId,status:'ACCEPTED'});showToast('Site visit accepted');openConversation(inquiryId,role);refreshSellerDeals();}catch(e){showToast(e.message,true)}};
  if($('declineVisitBtn')) $('declineVisitBtn').onclick=async()=>{try{await postForm('/api/advanced/visits',{token:state.sessionToken,visitId:window.__openVisitId,status:'DECLINED'});showToast('Site visit declined');openConversation(inquiryId,role);refreshSellerDeals();}catch(e){showToast(e.message,true)}};
  $('clearChatBtn')?.addEventListener('click',async()=>{if(!confirm('Clear messages from this conversation? The enquiry itself will remain.'))return;try{await postForm('/api/messages',{token:state.sessionToken,inquiryId,action:'clear'});showToast('Conversation messages cleared');openConversation(inquiryId,role);}catch(err){showToast(err.message,true);}});
  $('replyForm').onsubmit=async e=>{e.preventDefault();try{await postForm('/api/messages',{token:state.sessionToken,inquiryId,text:$('replyText').value});openConversation(inquiryId,role);}catch(err){showToast(err.message,true);}};
}
async function openBuyerInbox(){if(state.role!=='BUYER'){showToast('Buyer login required.',true);return;} $('buyerInboxOverlay').classList.remove('hidden'); await refreshBuyerInquiries();}
async function refreshBuyerInquiries(){try{const d=await (await fetch('/api/buyer/inquiries?token='+encodeURIComponent(state.sessionToken))).json();const unread=(d.items||[]).filter(x=>x.status==='CONTACTED').length; $('buyerInboxBadge').textContent=unread; $('buyerSidebarBadge').textContent=unread; $('buyerInquiryList').innerHTML=(d.items||[]).map(q=>`<button class="inquiry-row" data-buyer-inquiry="${escapeHtml(q.id)}"><strong>${escapeHtml(q.propertyTitle)}</strong><span>${escapeHtml(q.kind)} · Seller response thread</span><small>${escapeHtml(q.message)}</small><em>${escapeHtml(q.status)}</em></button>`).join('')||'<div class="empty">Your submitted inquiries will appear here.</div>';document.querySelectorAll('[data-buyer-inquiry]').forEach(b=>b.onclick=()=>openConversation(b.dataset.buyerInquiry,'buyer'));}catch(e){}}
function activateSellerTab(tab){
  document.querySelectorAll('.seller-tab-nav').forEach(x=>x.classList.toggle('active',x.dataset.sellerTab===tab));
  document.querySelectorAll('.seller-tab').forEach(x=>x.classList.add('hidden'));
  const map={overview:'sellerOverviewTab',listings:'sellerListingsTab',add:'sellerAddTab',inquiries:'sellerInquiriesTab',deals:'sellerDealsTab',market:'sellerMarketTab',account:'sellerAccountTab'};
  $(map[tab]||'sellerOverviewTab')?.classList.remove('hidden');
  if(tab==='inquiries') refreshSellerInquiries(true);
  if(tab==='market') loadSellerMarket();
  if(tab==='deals') refreshSellerDeals();
  if(tab==='account'){ $('sellerAccountName').textContent=state.profile?.name||'Seller'; $('sellerAccountEmail').textContent=state.profile?.email||'—'; }
}
function initSellerDashboard(){
  document.querySelectorAll('.seller-tab-nav').forEach(b=>b.onclick=()=>activateSellerTab(b.dataset.sellerTab));
  $('sellerPropertyForm').addEventListener('submit',async e=>{e.preventDefault();$('sellerPropertyMsg').textContent='Saving property…';const body=new URLSearchParams({token:state.sessionToken,action:$('sellerPropertyId').value?'update':'create',id:$('sellerPropertyId').value,title:$('sellerTitle').value,mode:$('sellerMode').value,locality:$('sellerLocality').value,propertyType:$('sellerPropertyType').value,price:$('sellerPrice').value,areaSqFt:$('sellerArea').value,bedrooms:$('sellerBedrooms').value,amenities:$('sellerAmenities').value,address:$('sellerAddress').value,lat:$('sellerLat').value,lng:$('sellerLng').value,description:$('sellerDescription').value});try{const d=await postForm('/api/seller/properties',Object.fromEntries(body));$('sellerPropertyMsg').textContent='Property published and added to buyer search.';showToast('Property saved');await refreshSellerListings();await loadSummary();await loadAll();activateSellerTab('listings');setTimeout(()=>search(),100);}catch(err){$('sellerPropertyMsg').textContent=err.message;}});
  $('cancelSellerEdit').onclick=()=>{fillSellerForm(null);activateSellerTab('listings');};
  $('useSellerLocation').onclick=()=>{if(!navigator.geolocation){showToast('Location is not available in this browser.',true);return;}navigator.geolocation.getCurrentPosition(pos=>{$('sellerLat').value=pos.coords.latitude.toFixed(6);$('sellerLng').value=pos.coords.longitude.toFixed(6);},()=>showToast('Location permission was not granted.',true));};
  $('sellerRefreshMarket').onclick=loadSellerMarket; $('sellerMarketCity').onchange=loadSellerMarket; activateSellerTab('overview');
}

function bindStatic(){
  $('searchBtn').addEventListener('click',search); $('heroSearch').addEventListener('click',()=>{document.getElementById('search').scrollIntoView({behavior:'smooth'});search();}); $('retrainBtn')?.addEventListener('click',async()=>{const msg=$('retrainMsg');msg.textContent='Running Python…';try{const d=await(await fetch('/api/retrain')).json();msg.textContent=d.message;await loadSummary();await loadAll();await search();}catch(e){msg.textContent='Estimator could not be re-run.';}});
  $('refreshLive')?.addEventListener('click',async()=>{const b=$('refreshLive');b.disabled=true;b.textContent='Refreshing…';try{await loadLiveStatus(state.liveCity);await search();}finally{b.disabled=false;b.textContent='Refresh live data';}});
  $('liveCity')?.addEventListener('change',async()=>{state.liveCity=$('liveCity').value;localStorage.setItem('estate_live_city',state.liveCity);$('locality').value='All';await loadLiveStatus(state.liveCity);await search();});
  $('sortBy').addEventListener('change',search); $('openCompare').onclick=openCompare; $('openCompare2').onclick=openCompare; $('refreshCompare')?.addEventListener('click',()=>{getSelectedItems();updateComparePreview();showToast('Comparison selection refreshed.');}); $('clearCompare').addEventListener('click',()=>{state.selectedCompare=[];saveState();updateComparePreview();search();}); $('personalizeToggle').addEventListener('click',()=>{$('personalizeToggle').classList.toggle('active');state.personalize=$('personalizeToggle').classList.contains('active');if(!state.personalize){state.currentItems.forEach(x=>x.recommendationScore=50);}search();});
  document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{updateMode(btn.dataset.mode);search();}));
  document.querySelectorAll('[data-data-mode]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-data-mode]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');state.dataMode=btn.dataset.dataMode; if(state.dataMode==='LIVE'){ loadLiveStatus(state.liveCity); } search();}));
  $('trendLocality').addEventListener('change',async()=>{if(state.dataMode==='LIVE') await loadLiveInsights($('trendLocality').value); renderTrend(); renderMarketIntelligence(state.currentItems);}); $('calculateEmi').addEventListener('click',calculateEmi); $('financeUseSelected')?.addEventListener('click',()=>{const item=state.currentItems?.[0]||state.allItems?.[state.mode]?.[0]; if(item){syncFinanceSelection(item); $('financeMsg').textContent=`Loaded ${item.title}.`; } else $('financeMsg').textContent='Run a property search first.';}); ['loanPrice','downPayment','interestRate','tenure','grossIncome','existingEmi','propertyTax','propertyInsurance'].forEach(id=>$(id)?.addEventListener('input',calculateEmi)); $('calculateCommute')?.addEventListener('click',()=>{const from=$('commuteFrom').value,to=$('commuteTo').value; const km=distanceKmLocal(from,to); $('commuteResult').textContent=km<0?'Locality coordinates unavailable.':`${from} → ${to}: approximately ${km.toFixed(1)} km straight-line distance. ${km<=3?'Very close':km<=7?'Convenient locality link':km<=12?'Moderate distance':'Longer locality link'}.`; updateCommuteSuggestions(from,to);}); $('commuteFrom')?.addEventListener('change',()=>updateCommuteSuggestions($('commuteFrom').value,$('commuteTo').value)); $('commuteTo')?.addEventListener('change',()=>updateCommuteSuggestions($('commuteFrom').value,$('commuteTo').value)); $('marketFitMap')?.addEventListener('click',()=>{updateMap(state.currentItems); $('mapSection')?.scrollIntoView({behavior:'smooth',block:'start'});}); $('marketResetMap')?.addEventListener('click',()=>{const c=cityCoords[state.liveCity]||cityCoords['Visakhapatnam']; if(state.map){state.map.setView(c,12);setTimeout(()=>state.map.invalidateSize(),100);} }); $('refreshMarketIntel')?.addEventListener('click',()=>{renderMarketIntelligence(state.currentItems); updateMap(state.currentItems); if(state.dataMode==='LIVE'&&$('trendLocality')?.value&&$('trendLocality').value!=='All') loadLiveInsights($('trendLocality').value); showToast('Market Intelligence refreshed.');}); $('refreshTrustDeals')?.addEventListener('click',()=>{renderTrustDashboard(state.currentItems); refreshBuyerDeals(); showToast('Trust & Deals refreshed.');}); document.querySelectorAll('[data-finance-step]').forEach(b=>b.addEventListener('click',()=>openFinanceStep(b.dataset.financeStep))); $('financeOpenSearch')?.addEventListener('click',()=>document.querySelector('[data-workspace="search"]')?.click());
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeOverlay(b.dataset.close))); $('closeProperty').addEventListener('click',()=>{$('propertyOverlay').classList.add('hidden');history.replaceState(null,'','#top');}); $('workflowDetail')?.addEventListener('click',()=>{});
  document.querySelector('[data-close=buyerInboxOverlay]')?.addEventListener('click',()=>closeOverlay('buyerInboxOverlay'));
  document.querySelector('[data-close=sellerDashboardOverlay]')?.addEventListener('click',()=>closeOverlay('sellerDashboardOverlay'));
  initSellerDashboard();
}

function bindWorkflowClose(){document.querySelectorAll('.overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.add('hidden');}));}

(async function init(){
  initAuth(); initWorkspaceNav(); bindStatic(); initWorkflow(); initOffer(); bindWorkflowClose(); updateAccountUI();
  await authMe();
  state.selectedCompare=[...new Set((state.selectedCompare||[]).map(Number))];
  await loadLiveStatus(state.liveCity); await loadSummary(); await loadAll(); applyProfileToForm(); if(state.mode==='BUY') updateMode('BUY');
  document.querySelectorAll('[data-data-mode]').forEach(x=>x.classList.toggle('active',x.dataset.dataMode===state.dataMode));
  if(state.dataMode==='LIVE' && $('trendLocality')?.value && $('trendLocality').value!=='All') await loadLiveInsights($('trendLocality').value); calculateEmi();
  if(state.role==='BUYER') { await search(); showBuyerWorkspace('overview'); }
  else if(state.role==='SELLER') { await search(); openSellerDashboard(); }
  else { showLanding(); }
  window.addEventListener('hashchange',()=>{const m=location.hash.match(/#property\/(\d+)/); if(m)openProperty(Number(m[1]));});
})();
