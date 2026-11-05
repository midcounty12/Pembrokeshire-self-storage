
(function(){
"use strict";
const state={assets:[],customers:[],tenancies:[],payments:[],transactions:[],bankConnections:[],loading:null};
const byId=id=>document.getElementById(id);
const esc=value=>String(value===null||value===undefined?"":value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const money=p=>p==null?"—":"£"+(Number(p)/100).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2});
const asPence=value=>{const s=String(value||"").trim();return /^\d+(\.\d{1,2})?$/.test(s)?Math.round(Number(s)*100):null};
const today=()=>new Date().toISOString().slice(0,10);
const active=t=>t.status==="active"||t.status==="pending";
const nameForCustomer=id=>(state.customers.find(c=>c.id===id)||{}).full_name||"Customer not found";
const assetFor=id=>state.assets.find(a=>a.id===id);
const getActiveTenancy=assetId=>state.tenancies.find(t=>t.asset_id===assetId&&active(t));
const nameForAsset=id=>(assetFor(id)||{}).name||"Unknown asset";
const status=message=>{const el=byId("managerMessage");if(el)el.textContent=message||""};
const readableError=e=>(e&&e.message)||String(e||"Unexpected error");
function initUI(){
 if(byId("managerPanel"))return;
 const style=document.createElement("style");
 style.textContent=".mg-actions{display:flex;flex-wrap:wrap;align-items:center;gap:9px}.mg-actions button{white-space:nowrap}.mg-cols{display:grid;grid-template-columns:1fr 1fr;gap:18px}.mg-field{display:flex;flex-direction:column;gap:5px;margin:8px 0}.mg-field input,.mg-field select,.mg-field textarea{padding:10px;border-radius:7px;border:1px solid #c7d2d9;width:100%;font:inherit}.mg-table{width:100%;min-width:580px}.mg-table td,.mg-table th{padding:9px;text-align:left;border-bottom:1px solid #dde3e6}.mg-tablewrap{overflow:auto}.mg-help{color:#596f7e;font-size:13px}.mg-tag{padding:4px 6px;border-radius:5px;background:#edf2f4;font-size:12px}.mg-alert{font-weight:600;color:#174569;min-height:16px}.mg-edit{background:#fff8e7;border:1px solid #d8ae50;padding:17px;border-radius:10px;margin:16px 0}.mg-disabled{opacity:.7}.mg-warn{background:#fff5df;padding:12px;border-radius:9px;border-left:3px solid #d49b1f}.mg-compact{font-size:13px}@media(max-width:850px){.mg-cols{grid-template-columns:1fr}.mg-actions{gap:8px}}";
 document.head.appendChild(style);
 const shell=document.createElement("section");
 shell.id="managerPanel";
 shell.innerHTML=
 '<div class="card"><h2>Manage your rentals</h2><p class="muted">Changes here update your private database. Available containers update on the public website. Only mark payments paid once you have checked the money has arrived.</p>'+
 '<p id="managerMessage" class="mg-alert" role="status" aria-live="polite"></p>'+
 '<div class="mg-actions"><label for="assetFilter"><b>Find asset</b></label><input id="assetFilter" style="padding:9px;border:1px solid #c7d2d9;border-radius:7px;min-width:175px" placeholder="Search by name or code">'+
 '<select id="assetGroupFilter" style="padding:9px;border:1px solid #c7d2d9;border-radius:7px"><option value="">All groups</option></select>'+
 '<button class="btn btn2" type="button" data-action="refresh">Refresh records</button></div>'+
 '<div id="assetEditor" class="mg-edit" style="display:none"></div></div>'+
 '<div class="mg-cols"><div class="card"><h2>Add a tenant / customer</h2>'+
 '<form id="addCustomerForm"><div class="mg-field"><label for="customerName">Full name *</label><input id="customerName" required maxlength="150"></div>'+
 '<div class="mg-field"><label for="customerEmail">Email</label><input id="customerEmail" type="email" maxlength="240"></div>'+
 '<div class="mg-field"><label for="customerPhone">Phone</label><input id="customerPhone" type="tel" maxlength="40"></div>'+
 '<button class="btn" type="submit">Save customer</button></form>'+
 '<p class="mg-help">Tenants are kept private. This does not create a website login or send an email.</p><p id="customerCount" class="mg-help"></p></div>'+
 '<div class="card"><h2>Set up a tenancy</h2>'+
 '<form id="addTenancyForm"><div class="mg-field"><label for="tenancyAsset">Property / container *</label><select id="tenancyAsset" required></select></div>'+
 '<div class="mg-field"><label for="tenancyCustomer">Customer *</label><select id="tenancyCustomer" required></select></div>'+
 '<div class="mg-field"><label for="tenancyStart">Start date *</label><input type="date" id="tenancyStart" required></div>'+
 '<div class="mg-field"><label for="tenancyRent">Rent amount (£) *</label><input type="number" min="0.01" step="0.01" id="tenancyRent" required></div>'+
 '<div class="mg-field"><label for="tenancyPayDay">Payment day (1–28, optional)</label><input type="number" min="1" max="28" id="tenancyPayDay"></div>'+
 '<button type="submit" class="btn">Save tenancy</button></form>'+
 '<p class="mg-help">A tenancy records who rents an asset; it does not automatically collect rent or create legal agreements.</p></div></div>'+
 '<div class="card"><h2>Current tenancies</h2><div id="tenancyList" class="mg-tablewrap"></div></div>'+
 '<div class="mg-cols"><div class="card"><h2>Record money received</h2>'+
 '<form id="recordPaymentForm"><div class="mg-field"><label for="payTenancy">Tenancy *</label><select id="payTenancy" required></select></div>'+
 '<div class="mg-field"><label for="payAmount">Amount received (£) *</label><input type="number" min="0.01" step="0.01" id="payAmount" required></div>'+
 '<div class="mg-field"><label for="payMethod">How it was received</label><select id="payMethod"><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="other">Other</option></select></div>'+
 '<div class="mg-field"><label for="payDate">Date received</label><input type="date" id="payDate"></div>'+
 '<div class="mg-field"><label for="payNotes">Reference / notes</label><input id="payNotes" maxlength="300" placeholder="Optional"></div>'+
 '<button class="btn" type="submit">Record received payment</button></form>'+
 '<p class="mg-help">Manual records do not verify bank arrival or change the paid-through date automatically.</p></div>'+
 '<div class="card"><h2>Recent receipts</h2><div id="paymentList" class="mg-tablewrap"></div></div></div>'+
 '<div class="card"><h2>Bank transactions to review</h2><p class="mg-help">Incoming bank credits are not automatically allocated. You must review and confirm which tenancy each credit belongs to.</p>'+
 '<div id="bankReview" class="mg-tablewrap"></div></div>';
 byId("app").appendChild(shell);
 const header=byId("assetRows")?.closest("table")?.querySelector("thead tr");
 if(header&&!header.querySelector(".mg-manage-heading"))header.insertAdjacentHTML("beforeend",'<th class="mg-manage-heading">Manage</th>');
 shell.addEventListener("click",event=>{
  const btn=event.target.closest("button[data-action]");if(!btn)return;
  const action=btn.dataset.action,id=btn.dataset.id;
  if(action==="refresh")reload();
  if(action==="assetEdit")editAsset(id);
  if(action==="assetCancel"){byId("assetEditor").style.display="none";byId("assetEditor").innerHTML=""}
  if(action==="assetSave")saveAsset(id);
  if(action==="endTenancy")endTenancy(id);
  if(action==="syncBank")syncBank(id,btn);
  if(action==="matchPayment")matchBankPayment(id,btn);
 });
 byId("assetRows").addEventListener("click",event=>{
  const btn=event.target.closest("button[data-action=assetEdit]");if(btn)editAsset(btn.dataset.id);
 });
 byId("assetFilter").addEventListener("input",renderAssets);
 byId("assetGroupFilter").addEventListener("change",renderAssets);
 byId("addCustomerForm").addEventListener("submit",addCustomer);
 byId("addTenancyForm").addEventListener("submit",addTenancy);
 byId("recordPaymentForm").addEventListener("submit",recordPayment);
 byId("tenancyAsset").addEventListener("change",setSuggestedRent);
 byId("payTenancy").addEventListener("change",setSuggestedPayment);
 byId("tenancyStart").value=today();
 byId("payDate").value=today();
 const qs=new URLSearchParams(location.search);
 if(qs.get("bank_connected")==="1")status("Bank permission received. Refresh the dashboard and sync the connected account to load transactions.");
 else if(qs.get("bank_error"))status("Bank connection was not completed: "+qs.get("bank_error"));
}
async function query(name,columns="*"){
 let q=db.from(name).select(columns);
 if(name==="assets")q=q.order("code");
 if(name==="bank_connections")q=q.order("institution_name");
 if(name==="bank_transactions")q=q.order("booked_at",{ascending:false}).limit(250);
 if(name==="payments")q=q.order("received_at",{ascending:false}).limit(250);
 if(name==="tenancies")q=q.order("created_at",{ascending:false});
 if(name==="customers")q=q.order("full_name");
 const {data,error}=await q;
 if(error)throw new Error(name+": "+error.message);
 return data||[];
}
async function reload(){
 if(state.loading)return state.loading;
 state.loading=(async()=>{
  initUI();
  status("Loading rental and bank records…");
  const names=["assets","customers","tenancies","payments","bank_connections","bank_transactions"];
  const results=await Promise.allSettled(names.map(n=>query(n)));
  const failures=[];
  for(let i=0;i<names.length;i++){
   if(results[i].status==="fulfilled")state[names[i]==="bank_transactions"?"transactions":names[i]==="bank_connections"?"bankConnections":names[i]]=results[i].value;
   else failures.push(names[i]+": "+readableError(results[i].reason));
  }
  renderAssets();renderManager();renderBanks();
  if(failures.length)status("Some records could not load: "+failures.join(" | "));
  else status("Records loaded. Changes can be made using the controls below.");
 })().finally(()=>{state.loading=null});
 return state.loading;
}
function renderAssets(){
 if(!byId("assetRows"))return;
 const groups=[...new Set(state.assets.map(a=>a.portfolio_group).filter(Boolean))].sort();
 const groupSelect=byId("assetGroupFilter");
 if(groupSelect){
  const selected=groupSelect.value;
  groupSelect.innerHTML='<option value="">All groups</option>'+groups.map(g=>'<option value="'+esc(g)+'">'+esc(g)+'</option>').join("");
  groupSelect.value=selected;
 }
 const term=(byId("assetFilter")?.value||"").toLowerCase();
 const group=groupSelect?.value||"";
 const rows=state.assets.filter(a=>(!group||group===a.portfolio_group)&&(!term||(a.code+" "+a.name+" "+a.portfolio_group).toLowerCase().includes(term)));
 const body=byId("assetRows");
 body.innerHTML=rows.map(a=>{
  const tenancy=getActiveTenancy(a.id);
  const tenant=tenancy?nameForCustomer(tenancy.customer_id):"Not linked";
  return '<tr><td><b>'+esc(a.code)+'</b><br><small>'+esc(a.name)+'</small></td><td>'+esc(a.portfolio_group||"—")+'</td>'+
  '<td>'+esc(a.status)+'</td><td>'+money(a.monthly_rent_pence)+(a.billing_frequency==="weekly"?"/week":a.billing_frequency==="none"?"":"/month")+'</td>'+
  '<td>'+esc(a.expected_bank_account||"—")+'</td><td>'+esc(a.manual_paid_until||"Not set")+'</td>'+
  '<td>'+esc(a.public_listing?"Yes":"No")+'</td>'+
  '<td><button class="btn btn2" type="button" data-action="assetEdit" data-id="'+esc(a.id)+'">Edit</button><br><small>'+esc(tenant)+'</small></td></tr>';
 }).join("")||'<tr><td colspan="8">No assets match the filter.</td></tr>';
 byId("total").textContent=state.assets.length;
 byId("occupied").textContent=state.assets.filter(x=>x.status==="occupied").length;
 byId("available").textContent=state.assets.filter(x=>x.status==="available").length;
}
function editAsset(id){
 const a=assetFor(id);if(!a)return;
 const choices=["available","reserved","occupied","maintenance","inactive"];
 const panel=byId("assetEditor");
 panel.innerHTML='<h3>Edit '+esc(a.code)+' — '+esc(a.name)+'</h3>'+
 '<p class="mg-help">Check this is the correct asset. Changing availability may immediately affect the public container page.</p>'+
 '<div class="mg-cols"><div class="mg-field"><label>Status</label><select id="editStatus">'+choices.map(x=>'<option value="'+x+'" '+(a.status===x?"selected":"")+'>'+x+'</option>').join("")+'</select></div>'+
 '<div class="mg-field"><label>Advertise as available publicly?</label><label><input type="checkbox" id="editPublic" '+(a.public_listing?"checked":"")+'> List when status is available</label></div>'+
 '<div class="mg-field"><label>Rent (£)</label><input id="editRent" type="number" step="0.01" min="0" value="'+esc(a.monthly_rent_pence==null?"":(a.monthly_rent_pence/100).toFixed(2))+'"></div>'+
 '<div class="mg-field"><label>Frequency</label><select id="editFreq">'+["monthly","weekly","none"].map(x=>'<option value="'+x+'" '+(a.billing_frequency===x?"selected":"")+'>'+x+'</option>').join("")+'</select></div>'+
 '<div class="mg-field"><label>Paid through (manual)</label><input type="date" id="editPaidUntil" value="'+esc(a.manual_paid_until||"")+'"></div>'+
 '<div class="mg-field"><label>Expected bank / reference</label><input id="editBankRef" value="'+esc(a.expected_bank_account||"")+'" maxlength="200"></div>'+
 '<div class="mg-field"><label>Manual payment note</label><input id="editPaidNote" value="'+esc(a.manual_payment_note||"")+'" maxlength="300"></div></div>'+
 '<div class="mg-actions"><button type="button" class="btn" data-action="assetSave" data-id="'+esc(a.id)+'">Save asset</button>'+
 '<button type="button" class="btn btn2" data-action="assetCancel">Cancel</button></div>';
 panel.style.display="block";
 panel.scrollIntoView({behavior:"smooth",block:"start"});
}
async function saveAsset(id){
 const a=assetFor(id);if(!a)return;
 const amount=byId("editRent").value.trim(),pence=amount===""?null:asPence(amount);
 if(amount!==""&&pence===null){status("Rent must be a valid pounds and pence amount.");return}
 const s=byId("editStatus").value,publicFlag=!!byId("editPublic").checked&&s==="available";
 if(s==="available"&&getActiveTenancy(id)){status("End the active tenancy before marking this asset available.");return}
 const update={status:s,public_listing:publicFlag,monthly_rent_pence:pence,billing_frequency:byId("editFreq").value,
 manual_paid_until:byId("editPaidUntil").value||null,expected_bank_account:byId("editBankRef").value.trim()||null,
 manual_payment_note:byId("editPaidNote").value.trim()||null,updated_at:new Date().toISOString()};
 try{
  const {data,error}=await db.from("assets").update(update).eq("id",id).select("id");
  if(error)throw error;if(!data?.length)throw new Error("No record updated. Check your staff permissions.");
  byId("assetEditor").style.display="none";status("Saved "+a.code+".");await reload();
 }catch(e){status("Could not save asset: "+readableError(e))}
}
function renderManager(){
 const activeTen=state.tenancies.filter(active);
 byId("customerCount").textContent=state.customers.length+" customers entered; "+activeTen.length+" current or pending tenancies.";
 const customerOpts=state.customers.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.full_name)+'</option>').join("");
 byId("tenancyCustomer").innerHTML='<option value="">Select a customer</option>'+customerOpts;
 const selectable=state.assets.filter(a=>!getActiveTenancy(a.id)&&a.billing_frequency!=="none");
 byId("tenancyAsset").innerHTML='<option value="">Select an asset</option>'+selectable.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.code+" — "+a.name)+'</option>').join("");
 const tenOpts=activeTen.map(t=>'<option value="'+esc(t.id)+'">'+esc(nameForAsset(t.asset_id)+" — "+nameForCustomer(t.customer_id))+'</option>').join("");
 byId("payTenancy").innerHTML='<option value="">Select tenancy</option>'+tenOpts;
 renderTenancies();renderReceipts();renderBankReview();
}
function renderTenancies(){
 const tenancies=state.tenancies;
 byId("tenancyList").innerHTML=!tenancies.length?'<p class="mg-help">No tenants linked to assets yet. Add customers and assign a tenancy above.</p>':
 '<table class="mg-table"><thead><tr><th>Asset</th><th>Tenant</th><th>Status</th><th>Rent</th><th></th></tr></thead><tbody>'+
 tenancies.map(t=>'<tr><td>'+esc(nameForAsset(t.asset_id))+'</td><td>'+esc(nameForCustomer(t.customer_id))+'</td>'+
 '<td>'+esc(t.status)+'</td><td>'+money(t.monthly_rent_pence)+'</td>'+
 '<td>'+(active(t)?'<button class="btn btn2 mg-compact" type="button" data-action="endTenancy" data-id="'+esc(t.id)+'">End</button>':"—")+'</td></tr>').join("")+
 '</tbody></table>';
}
function renderReceipts(){
 byId("paymentList").innerHTML=!state.payments.length?'<p class="mg-help">No payments recorded yet.</p>':
 '<table class="mg-table"><thead><tr><th>Date</th><th>Asset / customer</th><th>Amount</th><th>Method</th></tr></thead><tbody>'+
 state.payments.slice(0,50).map(p=>{
  const tenancy=state.tenancies.find(t=>t.id===p.tenancy_id);
  return '<tr><td>'+esc((p.received_at||"").slice(0,10))+'</td><td>'+esc(tenancy?nameForAsset(tenancy.asset_id)+" / "+nameForCustomer(p.customer_id):nameForCustomer(p.customer_id))+'</td><td>'+money(p.amount_pence)+'</td><td>'+esc(p.method)+'</td></tr>';
 }).join("")+'</tbody></table>';
}
function renderBanks(){
 const banks=state.bankConnections;
 byId("banks").textContent=banks.filter(x=>x.status==="connected").length;
 byId("bankList").innerHTML=banks.length?banks.map(b=>
  '<div style="border-top:1px solid #e0e5e8;padding:9px 0"><b>'+esc(b.institution_name)+'</b> <span class="mg-tag">'+esc(b.status.replace(/_/g," "))+'</span><br>'+
  '<small>'+esc(b.account_label||"")+'</small><br>'+
  (b.status==="connected"?'<button type="button" class="btn btn2 mg-compact" data-action="syncBank" data-id="'+esc(b.id)+'">Sync last 60 days</button>':"")+
  (b.last_synced_at?'<p class="mg-help">Last synced: '+esc(b.last_synced_at.slice(0,16).replace("T"," "))+'</p>':"")+'</div>'
 ).join(""):'<p>No bank connections configured.</p>';
 const connected=banks.filter(b=>b.status==="connected").length;
 const explanation=connected===0?"No live bank feed connected. Click Connect a bank, approve access on your bank's secure site, then sync and review transactions.":"After syncing, incoming transactions appear below. Matching always needs your confirmation.";
 const note=byId("managerBankNote")||document.createElement("p");
 note.id="managerBankNote";note.className="mg-help";note.textContent=explanation;byId("bankList").after(note);
}
function renderBankReview(){
 const matched=new Set(state.payments.map(p=>p.bank_transaction_id).filter(Boolean));
 const pending=state.transactions.filter(tx=>Number(tx.amount_pence)>0&&!matched.has(tx.id));
 byId("needsMatching").textContent=pending.length;
 const activeTen=state.tenancies.filter(active);
 if(!pending.length){byId("bankReview").innerHTML='<p class="mg-help">No unmatched incoming bank transactions currently loaded. Bank feeds must be connected and synced first.</p>';return}
 byId("bankReview").innerHTML='<table class="mg-table"><thead><tr><th>Date</th><th>Sender / reference</th><th>Amount</th><th>Match to</th><th></th></tr></thead><tbody>'+
 pending.map(tx=>
 '<tr><td>'+esc((tx.booked_at||"").slice(0,10))+'</td><td>'+esc(tx.counterparty_name||"—")+'<br><small>'+esc(tx.reference||"")+'</small></td>'+
 '<td>'+money(tx.amount_pence)+'</td><td><select id="match-'+esc(tx.id)+'" style="min-width:160px"><option value="">Choose tenancy</option>'+
 activeTen.map(t=>'<option value="'+esc(t.id)+'">'+esc(nameForAsset(t.asset_id)+" / "+nameForCustomer(t.customer_id))+'</option>').join("")+'</select></td>'+
 '<td><button class="btn btn2 mg-compact" type="button" data-action="matchPayment" data-id="'+esc(tx.id)+'">Confirm match</button></td></tr>'
 ).join("")+'</tbody></table>';
}
function setSuggestedRent(){
 const a=assetFor(byId("tenancyAsset").value);
 byId("tenancyRent").value=a?.monthly_rent_pence!=null?(a.monthly_rent_pence/100).toFixed(2):"";
}
function setSuggestedPayment(){
 const t=state.tenancies.find(t=>t.id===byId("payTenancy").value);
 byId("payAmount").value=t?.monthly_rent_pence?(t.monthly_rent_pence/100).toFixed(2):"";
}
async function addCustomer(event){
 event.preventDefault();
 const name=byId("customerName").value.trim();
 if(!name){status("Enter the customer's full name.");return}
 const record={full_name:name,email:byId("customerEmail").value.trim()||null,phone:byId("customerPhone").value.trim()||null};
 try{const {error}=await db.from("customers").insert(record);if(error)throw error;event.target.reset();await reload();status("Customer saved.");}
 catch(e){status("Customer could not be saved: "+readableError(e))}
}
async function addTenancy(event){
 event.preventDefault();
 const assetId=byId("tenancyAsset").value,cid=byId("tenancyCustomer").value,amount=asPence(byId("tenancyRent").value);
 const day=byId("tenancyPayDay").value.trim();
 if(!assetId||!cid||amount===null||amount<=0){status("Choose an asset, customer and valid rent amount.");return}
 if(getActiveTenancy(assetId)){status("This asset already has a current tenancy.");return}
 if(day&&(Number(day)<1||Number(day)>28)){status("Payment day must be between 1 and 28.");return}
 const asset=assetFor(assetId);
 const record={asset_id:assetId,customer_id:cid,start_date:byId("tenancyStart").value,
 monthly_rent_pence:amount,vat_rate:asset?.vat_rate||0,payment_day:day?Number(day):null,status:"active",contract_status:"not_started"};
 if(!record.start_date){status("Choose the tenancy start date.");return}
 try{
  const {error}=await db.from("tenancies").insert(record);if(error)throw error;
  const {error:assetError}=await db.from("assets").update({status:"occupied",public_listing:false}).eq("id",assetId);
  event.target.reset();byId("tenancyStart").value=today();await reload();
  status(assetError?"Tenancy saved, but couldn't update asset occupancy. Please edit the asset manually.":"Tenancy saved. Asset marked occupied; no payment or contract was created.");
 }catch(e){status("Tenancy could not be saved: "+readableError(e))}
}
async function endTenancy(id){
 const t=state.tenancies.find(t=>t.id===id);if(!t||!active(t))return;
 if(!window.confirm("End this tenancy? This keeps the asset occupied until you separately confirm it is vacant."))return;
 try{
  const {error}=await db.from("tenancies").update({status:"ended",end_date:today()}).eq("id",id);
  if(error)throw error;await reload();status("Tenancy ended. Review the asset status before advertising it again.");
 }catch(e){status("Could not end tenancy: "+readableError(e))}
}
async function recordPayment(event){
 event.preventDefault();
 const t=state.tenancies.find(t=>t.id===byId("payTenancy").value),amount=asPence(byId("payAmount").value);
 if(!t||amount===null||amount<=0){status("Choose a tenancy and a valid amount.");return}
 if(!window.confirm("Confirm that you have checked this payment was actually received?"))return;
 const date=byId("payDate").value||today();
 const record={tenancy_id:t.id,customer_id:t.customer_id,amount_pence:amount,method:byId("payMethod").value,
 received_at:date+"T12:00:00Z",notes:byId("payNotes").value.trim()||null,status:"confirmed"};
 try{const {data:session}=await db.auth.getSession();record.created_by=session?.session?.user?.id||null;
  const {error}=await db.from("payments").insert(record);if(error)throw error;
  event.target.reset();byId("payDate").value=today();await reload();
  status("Manual payment recorded. Paid-through dates remain separate until you update them.");
 }catch(e){status("Could not record payment: "+readableError(e))}
}
async function matchBankPayment(txid,btn){
 const tx=state.transactions.find(x=>x.id===txid),select=byId("match-"+txid);
 const t=state.tenancies.find(x=>x.id===select?.value);
 if(!tx||!t||Number(tx.amount_pence)<=0){status("Select the correct tenancy for this incoming bank payment.");return}
 if(state.payments.some(p=>p.bank_transaction_id===txid)){status("That bank credit is already matched.");return}
 if(!window.confirm("Match "+money(tx.amount_pence)+" from "+(tx.counterparty_name||"the bank")+" to "+nameForCustomer(t.customer_id)+"? No further payment will be taken."))return;
 btn.disabled=true;
 try{
  const {data:session}=await db.auth.getSession();
  const {error}=await db.from("payments").insert({tenancy_id:t.id,customer_id:t.customer_id,amount_pence:tx.amount_pence,
   method:"open_banking",status:"confirmed",bank_transaction_id:tx.id,received_at:tx.booked_at||new Date().toISOString(),
   created_by:session?.session?.user?.id||null,notes:"Manually matched bank credit"});
  if(error)throw error;await reload();status("Bank credit matched to "+nameForCustomer(t.customer_id)+".");
 }catch(e){status("Bank payment could not be matched: "+readableError(e))}
 finally{btn.disabled=false}
}
async function syncBank(id,btn){
 btn.disabled=true;status("Checking bank transactions…");
 try{
  const {data:{session}}=await db.auth.getSession();if(!session)throw new Error("Please sign in again.");
  const url="https://vxurmlmmrlclfydiobgm.supabase.co/functions/v1/truelayer-sync";
  const res=await fetch(url,{method:"POST",headers:{Authorization:"Bearer "+session.access_token,
   apikey:"sb_publishable_nYgRvuOk0nK1oQfLIaksqA_n0bfFMMg","Content-Type":"application/json"},body:JSON.stringify({connection_id:id})});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||"Could not sync this bank.");
  await reload();status("Bank sync complete. "+data.processed+" transactions processed; review unmatched incoming payments below.");
 }catch(e){status("Bank sync unsuccessful: "+readableError(e))}
 finally{btn.disabled=false}
}
window.rentalManagerLoad=reload;
window.rentalManagerState=()=>({assets:state.assets.length,customers:state.customers.length,tenancies:state.tenancies.length,transactions:state.transactions.length});
})();
