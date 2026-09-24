const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlB-XvmuGM7DWDqHtLIhrkeXlEwJ3iabaELeyf4MVcv9UgMFlLxgg9oqgwhtRgb3P5FQ/exec";
const ADMIN_ID = "8405877507";
const ADMIN_PASSWORD = "Diksha@197781";

const loginModal = document.getElementById("loginModal");
const userModal = document.getElementById("userModal");
const APPLICATIONS_KEY = "diksha_applications_v2";

function openLogin(){
  loginModal.classList.add("show");
  document.getElementById("loginError").textContent = "";
  document.getElementById("username").focus();
}

document.getElementById("loginBtn").onclick = openLogin;
document.getElementById("loginBtn2").onclick = openLogin;
document.getElementById("closeLogin").onclick = () => loginModal.classList.remove("show");
document.getElementById("closeUser").onclick = () => userModal.classList.remove("show");

document.getElementById("doLogin").onclick = async () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const error = document.getElementById("loginError");
  error.textContent = "";

  if(username !== ADMIN_ID || password !== ADMIN_PASSWORD){
    error.textContent = "Admin ID या Password गलत है।";
    return;
  }

  loginModal.classList.remove("show");
  document.getElementById("userWelcomeName").textContent = "Welcome, Admin";
  document.getElementById("userDashUsername").textContent = ADMIN_ID;
  document.getElementById("userDashMobile").textContent = ADMIN_ID;
  document.getElementById("password").value = "";
  userModal.classList.add("show");
  await renderApplications();
};

document.getElementById("userLogout").onclick = () => {
  userModal.classList.remove("show");
  document.getElementById("adminApplications").innerHTML = "";
};

function getApplications(){
  try { return JSON.parse(localStorage.getItem(APPLICATIONS_KEY) || "[]"); }
  catch { return []; }
}
function saveApplications(applications){ localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(applications)); }
function createApplicationNumber(){
  const now = new Date();
  const datePart = [now.getFullYear(), String(now.getMonth()+1).padStart(2,"0"), String(now.getDate()).padStart(2,"0")].join("");
  return `DCC-${datePart}-${String(now.getTime()).slice(-6)}-${Math.floor(100 + Math.random()*900)}`;
}

// Google Apps Script GET via JSONP avoids browser CORS problems on GitHub Pages.
function fetchApplicationsFromGoogle(){
  return new Promise((resolve, reject) => {
    const callback = "__dikshaApps_" + Date.now() + "_" + Math.floor(Math.random()*10000);
    const script = document.createElement("script");
    let finished = false;
    const timer = setTimeout(() => finish(new Error("Google Sheets से connection नहीं हो पाया।")), 15000);
    function cleanup(){
      clearTimeout(timer);
      delete window[callback];
      if(script.parentNode) script.parentNode.removeChild(script);
    }
    function finish(err, data){
      if(finished) return;
      finished = true; cleanup();
      err ? reject(err) : resolve(data);
    }
    window[callback] = data => {
      if(!data || !data.success) return finish(new Error((data && data.error) || "Google Sheets error."));
      finish(null, Array.isArray(data.applications) ? data.applications : []);
    };
    script.onerror = () => finish(new Error("Google Apps Script URL उपलब्ध नहीं है।"));
    script.src = GOOGLE_SCRIPT_URL + "?callback=" + encodeURIComponent(callback) + "&_=" + Date.now();
    document.head.appendChild(script);
  });
}

function postToGoogle(data){
  // HTML form + hidden iframe: works cross-origin without fetch/CORS restrictions.
  return new Promise((resolve, reject) => {
    const iframeName = "diksha_post_" + Date.now() + "_" + Math.floor(Math.random()*10000);
    const iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const form = document.createElement("form");
    form.method = "POST";
    form.action = GOOGLE_SCRIPT_URL;
    form.target = iframeName;
    form.style.display = "none";
    Object.entries(data).forEach(([key,value]) => {
      const input = document.createElement("input");
      input.type = "hidden"; input.name = key; input.value = value == null ? "" : String(value);
      form.appendChild(input);
    });
    document.body.appendChild(form);
    let done = false;
    const cleanup = () => { if(form.parentNode) form.parentNode.removeChild(form); setTimeout(()=>iframe.remove(),1000); };
    iframe.onload = () => { if(done) return; done = true; cleanup(); resolve({success:true}); };
    iframe.onerror = () => { if(done) return; done = true; cleanup(); reject(new Error("Google Sheets request failed.")); };
    form.submit();
    setTimeout(() => { if(!done){ done=true; cleanup(); resolve({success:true}); } }, 2500);
  });
}

function updateAdminStats(apps){
  const list = Array.isArray(apps) ? apps : getApplications();
  document.getElementById("adminTotalApplications").textContent = String(list.length);
  document.getElementById("adminNewApplications").textContent = String(list.filter(a=>(a.status||"New")==="New").length);
  document.getElementById("adminProcessingApplications").textContent = String(list.filter(a=>(a.status||"New")==="Processing").length);
  document.getElementById("adminCompletedApplications").textContent = String(list.filter(a=>(a.status||"New")==="Completed").length);
}

async function renderApplications(){
  const box = document.getElementById("adminApplications");
  box.innerHTML = '<div class="admin-empty">Loading applications...</div>';
  try {
    const apps = await fetchApplicationsFromGoogle();
    saveApplications(apps); updateAdminStats(apps);
    const search = document.getElementById("applicationSearch").value.trim().toLowerCase();
    const filter = document.getElementById("applicationStatusFilter").value;
    const filtered = apps.filter(app => {
      const hay = [app.applicationNo,app.name,app.mobile,app.whatsapp,app.reason].join(" ").toLowerCase();
      const status = app.status || "New";
      return (!search || hay.includes(search)) && (!filter || status===filter);
    }).slice().reverse();
    if(!filtered.length){ box.innerHTML='<div class="admin-empty">No applications received yet.</div>'; return; }
    box.innerHTML = '<h3>APPLICATIONS <small class="result-count">'+filtered.length+' shown</small></h3>' + filtered.map(app => {
      const status=app.status||"New";
      return `<div class="admin-item" data-app-no="${escapeHtml(app.applicationNo)}">
        <div><b>${escapeHtml(app.applicationNo)}</b> <small>${escapeHtml(app.createdAt)}</small></div>
        <p><b>Name:</b> ${escapeHtml(app.name)}</p>
        <p><b>Mobile:</b> ${escapeHtml(app.mobile)} &nbsp; <b>WhatsApp:</b> ${escapeHtml(app.whatsapp)}</p>
        <p><b>Apply For:</b> ${escapeHtml(app.reason)}</p>
        <div class="admin-row-actions">
          <select class="status-select" data-app-no="${escapeHtml(app.applicationNo)}">${["New","Processing","Completed"].map(x=>`<option ${x===status?'selected':''}>${x}</option>`).join("")}</select>
          <button class="secondary print-app" data-app-no="${escapeHtml(app.applicationNo)}">Print</button>
          <button class="secondary delete-app" data-app-no="${escapeHtml(app.applicationNo)}">Delete</button>
        </div>
      </div>`;
    }).join("");

    box.querySelectorAll(".status-select").forEach(select => {
      select.onchange = async () => {
        const applicationNo=select.dataset.appNo, status=select.value; select.disabled=true;
        try {
          await postToGoogle({action:"status",applicationNo,status});
          const local=getApplications(); const item=local.find(a=>a.applicationNo===applicationNo);
          if(item) item.status=status; saveApplications(local); updateAdminStats(local);
        } catch(e){ alert("Status update failed: "+e.message); await renderApplications(); }
        finally { select.disabled=false; }
      };
    });
    box.querySelectorAll(".print-app").forEach(btn => btn.onclick=()=>printApplication(apps.find(a=>a.applicationNo===btn.dataset.appNo)));
    box.querySelectorAll(".delete-app").forEach(btn => {
      btn.onclick = async () => {
        const applicationNo=btn.dataset.appNo;
        if(!confirm("Delete this application from Google Sheet?")) return;
        btn.disabled=true; btn.textContent="Deleting...";
        try { await postToGoogle({action:"delete",applicationNo}); await renderApplications(); }
        catch(e){ alert("Delete failed: "+e.message); btn.disabled=false; btn.textContent="Delete"; }
      };
    });
  } catch(error){
    const local=getApplications(); updateAdminStats(local);
    box.innerHTML='<div class="admin-empty">Google Sheets से applications load नहीं हो पाईं।<br>'+escapeHtml(error.message)+'</div>';
  }
}

document.getElementById("viewApplications").onclick=renderApplications;
document.getElementById("refreshApplications").onclick=renderApplications;
document.getElementById("applicationSearch").addEventListener("input", renderApplications);
document.getElementById("applicationStatusFilter").addEventListener("change", renderApplications);

function printApplication(app){
  if(!app) return;
  const w=window.open("","_blank","width=800,height=900");
  if(!w){alert("Please allow pop-ups to print the application.");return;}
  const status=app.status||"New";
  w.document.write(`<!doctype html><html><head><title>${escapeHtml(app.applicationNo)}</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#123}.head{text-align:center;border-bottom:2px solid #073d91;padding-bottom:15px}.head h1{margin:0}.head h2{margin:5px}.box{margin-top:25px;border:1px solid #ccd6e2;border-radius:10px;overflow:hidden}.row{display:grid;grid-template-columns:35% 65%;padding:13px;border-bottom:1px solid #e5ebf2}.label{font-weight:bold;color:#607080}.status{font-weight:bold}</style></head><body><div class="head"><h1>DIKSHA COMPUTER CENTER</h1><h2>BALAM MADHEPURA</h2><b>APPLICATION / VISIT RECEIPT</b></div><div class="box"><div class="row"><div class="label">Application No.</div><div>${escapeHtml(app.applicationNo)}</div></div><div class="row"><div class="label">Name</div><div>${escapeHtml(app.name)}</div></div><div class="row"><div class="label">Mobile</div><div>${escapeHtml(app.mobile)}</div></div><div class="row"><div class="label">WhatsApp</div><div>${escapeHtml(app.whatsapp)}</div></div><div class="row"><div class="label">Apply For</div><div>${escapeHtml(app.reason)}</div></div><div class="row"><div class="label">Date & Time</div><div>${escapeHtml(app.createdAt)}</div></div><div class="row"><div class="label">Status</div><div class="status">${escapeHtml(status)}</div></div></div><br><button onclick="window.print()">Print</button></body></html>`);
  w.document.close();
}

function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));}

/* APPLY NOW + RECEIPT SYSTEM */
const applyModal=document.getElementById("applyModal");
const receiptModal=document.getElementById("receiptModal");
const applyForm=document.getElementById("applyForm");
const applyReason=document.getElementById("applyReason");
const applyOtherReason=document.getElementById("applyOtherReason");

function openApply(){receiptModal.classList.remove("show");applyModal.classList.add("show");document.getElementById("applyError").textContent="";}
function closeApply(){applyModal.classList.remove("show");}
document.querySelectorAll('a[href="#applyNow"]').forEach(btn=>btn.addEventListener("click",e=>{e.preventDefault();openApply();}));
document.getElementById("closeApply").onclick=closeApply;
document.getElementById("closeReceipt").onclick=()=>receiptModal.classList.remove("show");
applyReason.addEventListener("change",()=>{const other=applyReason.value==="Other";applyOtherReason.classList.toggle("show",other);applyOtherReason.required=other;if(!other)applyOtherReason.value="";});

applyForm.addEventListener("submit",async e=>{
  e.preventDefault();
  const name=document.getElementById("applyName").value.trim();
  const mobile=document.getElementById("applyMobile").value.replace(/\D/g,"");
  const whatsapp=document.getElementById("applyWhatsapp").value.replace(/\D/g,"");
  const selected=applyReason.value;
  const reason=selected==="Other"?applyOtherReason.value.trim():selected;
  const error=document.getElementById("applyError"); const submit=applyForm.querySelector('button[type="submit"]'); error.textContent="";
  if(name.length<2){error.textContent="Please enter your full name.";return;}
  if(!/^\d{10}$/.test(mobile)){error.textContent="Please enter a valid 10-digit Mobile Number.";return;}
  if(!/^\d{10}$/.test(whatsapp)){error.textContent="Please enter a valid 10-digit WhatsApp Number.";return;}
  if(!reason){error.textContent="Please select a service.";return;}
  const application={applicationNo:createApplicationNumber(),name,mobile,whatsapp,reason,status:"New",createdAt:new Date().toLocaleString("en-IN")};
  submit.disabled=true; const old=submit.textContent; submit.textContent="Submitting...";
  try {
    await postToGoogle(application);
    const local=getApplications(); local.push(application); saveApplications(local);
    document.getElementById("receiptNo").textContent=application.applicationNo;
    document.getElementById("receiptName").textContent=application.name;
    document.getElementById("receiptMobile").textContent=application.mobile;
    document.getElementById("receiptWhatsapp").textContent=application.whatsapp;
    document.getElementById("receiptReason").textContent=application.reason;
    document.getElementById("receiptDate").textContent=application.createdAt;
    applyModal.classList.remove("show"); receiptModal.classList.add("show"); applyForm.reset(); applyOtherReason.classList.remove("show"); applyOtherReason.required=false;
  } catch(err){ error.textContent="Application submit नहीं हो पाया। Internet/Google connection check करके दोबारा try करें."; console.error(err); }
  finally {submit.disabled=false;submit.textContent=old;}
});

document.getElementById("printReceipt").onclick=()=>window.print();
document.getElementById("newApplication").onclick=()=>{receiptModal.classList.remove("show");applyForm.reset();applyOtherReason.classList.remove("show");applyOtherReason.required=false;document.getElementById("applyError").textContent="";applyModal.classList.add("show");};

[loginModal,userModal,applyModal,receiptModal].forEach(modal=>modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.remove("show");}));
