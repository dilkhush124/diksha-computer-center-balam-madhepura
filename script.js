const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlB-XvmuGM7DWDqHtLIhrkeXlEwJ3iabaELeyf4MVcv9UgMFlLxgg9oqgwhtRgb3P5FQ/exec";

// Fixed administrator credentials requested for this website.
const ADMIN_ID = "8405877507";
const ADMIN_PASSWORD = "Diksha@197781";
const APPLICATIONS_KEY = "diksha_applications_v2";

const loginModal = document.getElementById("loginModal");
const userModal = document.getElementById("userModal");
const adminApplications = document.getElementById("adminApplications");
let allApplications = [];

function openLogin(){
  loginModal.classList.add("show");
  document.getElementById("loginError").textContent = "";
  document.getElementById("username").focus();
}

document.getElementById("loginBtn").onclick = openLogin;
document.getElementById("loginBtn2").onclick = openLogin;
document.getElementById("closeLogin").onclick = () => loginModal.classList.remove("show");
document.getElementById("closeUser").onclick = () => userModal.classList.remove("show");
document.getElementById("userLogout").onclick = () => userModal.classList.remove("show");

document.getElementById("doLogin").onclick = async () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const error = document.getElementById("loginError");
  error.textContent = "";

  if(username !== ADMIN_ID || password !== ADMIN_PASSWORD){
    error.textContent = "Admin ID or Password is incorrect.";
    return;
  }

  loginModal.classList.remove("show");
  document.getElementById("userWelcomeName").textContent = "Welcome, Admin";
  document.getElementById("userDashUsername").textContent = ADMIN_ID;
  userModal.classList.add("show");
  document.getElementById("password").value = "";
  await renderApplications();
};

document.getElementById("password").addEventListener("keydown", e => {
  if(e.key === "Enter") document.getElementById("doLogin").click();
});
document.getElementById("username").addEventListener("keydown", e => {
  if(e.key === "Enter") document.getElementById("doLogin").click();
});

function getLocalApplications(){
  try { return JSON.parse(localStorage.getItem(APPLICATIONS_KEY) || "[]"); }
  catch { return []; }
}
function saveLocalApplications(applications){
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(applications));
}
function createApplicationNumber(){
  const now = new Date();
  const datePart = [now.getFullYear(), String(now.getMonth()+1).padStart(2,"0"), String(now.getDate()).padStart(2,"0")].join("");
  return `DCC-${datePart}-${Date.now().toString().slice(-7)}-${Math.floor(100+Math.random()*900)}`;
}

// Google Apps Script GET/JSONP is used so the public GitHub site works across browsers without CORS fetch failures.
function googleRequest(params){
  return new Promise((resolve, reject) => {
    const callback = "dccCallback_" + Date.now() + "_" + Math.floor(Math.random()*10000);
    const script = document.createElement("script");
    const query = new URLSearchParams({...params, callback});
    let finished = false;
    const cleanup = () => { try { delete window[callback]; } catch(e){} script.remove(); };
    const timer = setTimeout(() => { if(!finished){ finished=true; cleanup(); reject(new Error("Google connection timed out.")); } }, 20000);
    window[callback] = data => { if(finished) return; finished=true; clearTimeout(timer); cleanup(); resolve(data); };
    script.onerror = () => { if(finished) return; finished=true; clearTimeout(timer); cleanup(); reject(new Error("Could not connect to Google Sheets.")); };
    script.src = GOOGLE_SCRIPT_URL + "?" + query.toString();
    document.body.appendChild(script);
  });
}

async function fetchApplicationsFromGoogle(){
  const result = await googleRequest({action:"list"});
  if(!result || !result.success) throw new Error(result?.error || "Google Sheets error.");
  return Array.isArray(result.applications) ? result.applications : [];
}

function updateAdminStats(apps){
  const list = Array.isArray(apps) ? apps : [];
  document.getElementById("adminTotalApplications").textContent = list.length;
  document.getElementById("adminNewApplications").textContent = list.filter(a => (a.status||"New") === "New").length;
  document.getElementById("adminProcessingApplications").textContent = list.filter(a => (a.status||"New") === "Processing").length;
  document.getElementById("adminCompletedApplications").textContent = list.filter(a => (a.status||"New") === "Completed").length;
}

function filteredApplications(){
  const q = document.getElementById("adminSearch").value.trim().toLowerCase();
  const status = document.getElementById("adminStatusFilter").value;
  return allApplications.filter(app => {
    const appStatus = app.status || "New";
    const text = [app.applicationNo, app.name, app.mobile, app.whatsapp, app.reason, app.createdAt].join(" ").toLowerCase();
    return (!q || text.includes(q)) && (status === "All" || appStatus === status);
  });
}

function printApplication(app){
  const w = window.open("", "_blank", "width=700,height=800");
  if(!w) { alert("Please allow pop-ups to print the application."); return; }
  w.document.write(`<!doctype html><html><head><title>${escapeHtml(app.applicationNo)}</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#123}h1{color:#073d91}table{width:100%;border-collapse:collapse;margin-top:20px}td{border:1px solid #ccc;padding:12px}td:first-child{font-weight:700;width:35%}.head{text-align:center;border-bottom:2px solid #073d91;padding-bottom:15px}.status{font-weight:700}</style></head><body><div class="head"><h1>DIKSHA COMPUTER CENTER</h1><div>BALAM MADHEPURA</div><p>Customer Application</p></div><table><tr><td>Application No.</td><td>${escapeHtml(app.applicationNo)}</td></tr><tr><td>Name</td><td>${escapeHtml(app.name)}</td></tr><tr><td>Mobile</td><td>${escapeHtml(app.mobile)}</td></tr><tr><td>WhatsApp</td><td>${escapeHtml(app.whatsapp)}</td></tr><tr><td>Apply For</td><td>${escapeHtml(app.reason)}</td></tr><tr><td>Date & Time</td><td>${escapeHtml(app.createdAt)}</td></tr><tr><td>Status</td><td class="status">${escapeHtml(app.status || "New")}</td></tr></table><script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}

async function changeStatus(applicationNo, status){
  try {
    const result = await googleRequest({action:"updateStatus", applicationNo, status});
    if(!result?.success) throw new Error(result?.error || "Status update failed.");
    await renderApplications();
  } catch(err) {
    alert("Status update failed: " + err.message);
    await renderApplications();
  }
}

async function deleteApplication(applicationNo){
  if(!confirm("Delete this application from Google Sheet?")) return;
  try {
    const result = await googleRequest({action:"delete", applicationNo});
    if(!result?.success) throw new Error(result?.error || "Delete failed.");
    await renderApplications();
  } catch(err) { alert("Delete failed: " + err.message); }
}

function renderApplicationCards(){
  const apps = filteredApplications();
  updateAdminStats(allApplications);
  if(!apps.length){ adminApplications.innerHTML = '<div class="admin-empty">No matching applications found.</div>'; return; }
  adminApplications.innerHTML = '<h3>ALL CUSTOMER APPLICATIONS</h3>' + apps.slice().reverse().map(app => {
    const status = app.status || "New";
    return `<div class="admin-item">
      <div><b>${escapeHtml(app.applicationNo)}</b><small>${escapeHtml(app.createdAt)}</small></div>
      <p><b>Name:</b> ${escapeHtml(app.name)}</p>
      <p><b>Mobile:</b> ${escapeHtml(app.mobile)} &nbsp; <b>WhatsApp:</b> ${escapeHtml(app.whatsapp)}</p>
      <p><b>Apply For:</b> ${escapeHtml(app.reason)}</p>
      <div class="admin-item-actions">
        <label><b>Status:</b> <select class="status-select" data-app-no="${escapeHtml(app.applicationNo)}"><option ${status==='New'?'selected':''}>New</option><option ${status==='Processing'?'selected':''}>Processing</option><option ${status==='Completed'?'selected':''}>Completed</option></select></label>
        <button class="secondary print-app" data-app-no="${escapeHtml(app.applicationNo)}">Print</button>
        <button class="secondary delete-app" data-app-no="${escapeHtml(app.applicationNo)}">Delete</button>
      </div>
    </div>`;
  }).join("");

  adminApplications.querySelectorAll(".status-select").forEach(el => el.onchange = () => changeStatus(el.dataset.appNo, el.value));
  adminApplications.querySelectorAll(".print-app").forEach(btn => btn.onclick = () => { const app=allApplications.find(a=>a.applicationNo===btn.dataset.appNo); if(app) printApplication(app); });
  adminApplications.querySelectorAll(".delete-app").forEach(btn => btn.onclick = () => deleteApplication(btn.dataset.appNo));
}

async function renderApplications(){
  adminApplications.innerHTML = '<div class="admin-empty">Loading customer applications...</div>';
  try {
    allApplications = await fetchApplicationsFromGoogle();
    saveLocalApplications(allApplications);
    renderApplicationCards();
  } catch(error) {
    allApplications = getLocalApplications();
    updateAdminStats(allApplications);
    adminApplications.innerHTML = `<div class="admin-empty">Google Sheet से applications load नहीं हो पाईं.<br>${escapeHtml(error.message)}<br><br>Refresh करके फिर कोशिश करें.</div>`;
  }
}

document.getElementById("refreshApplications").onclick = renderApplications;
document.getElementById("adminSearch").addEventListener("input", renderApplicationCards);
document.getElementById("adminStatusFilter").addEventListener("change", renderApplicationCards);

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
}

[loginModal, userModal].forEach(modal => modal.addEventListener("click", e => { if(e.target === modal) modal.classList.remove("show"); }));

/* APPLY NOW + RECEIPT SYSTEM */
const applyModal = document.getElementById("applyModal");
const receiptModal = document.getElementById("receiptModal");
const applyForm = document.getElementById("applyForm");
const applyReason = document.getElementById("applyReason");
const applyOtherReason = document.getElementById("applyOtherReason");

function openApply(){ receiptModal.classList.remove("show"); applyModal.classList.add("show"); document.getElementById("applyError").textContent = ""; }
function closeApply(){ applyModal.classList.remove("show"); }
document.querySelectorAll('a[href="#applyNow"]').forEach(btn => btn.addEventListener("click", e => { e.preventDefault(); openApply(); }));
document.getElementById("closeApply").onclick = closeApply;
document.getElementById("closeReceipt").onclick = () => receiptModal.classList.remove("show");

applyReason.addEventListener("change", () => {
  const isOther = applyReason.value === "Other";
  applyOtherReason.classList.toggle("show", isOther);
  applyOtherReason.required = isOther;
  if(!isOther) applyOtherReason.value = "";
});

applyForm.addEventListener("submit", async e => {
  e.preventDefault();
  const name = document.getElementById("applyName").value.trim();
  const mobile = document.getElementById("applyMobile").value.replace(/\D/g, "");
  const whatsapp = document.getElementById("applyWhatsapp").value.replace(/\D/g, "");
  const selectedReason = applyReason.value;
  const reason = selectedReason === "Other" ? applyOtherReason.value.trim() : selectedReason;
  const error = document.getElementById("applyError");
  const submitButton = applyForm.querySelector('button[type="submit"]');
  error.textContent = "";
  if(name.length < 2){ error.textContent = "Please enter your full name."; return; }
  if(!/^\d{10}$/.test(mobile)){ error.textContent = "Please enter a valid 10-digit Mobile Number."; return; }
  if(!/^\d{10}$/.test(whatsapp)){ error.textContent = "Please enter a valid 10-digit WhatsApp Number."; return; }
  if(!reason){ error.textContent = "Please select a service."; return; }
  const application = {applicationNo:createApplicationNumber(), name, mobile, whatsapp, reason, createdAt:new Date().toLocaleString("en-IN"), status:"New"};
  submitButton.disabled=true; const old=submitButton.textContent; submitButton.textContent="Submitting...";
  try {
    const result = await googleRequest({action:"submit", ...application});
    if(!result?.success) throw new Error(result?.error || "Application could not be saved.");
    const local=getLocalApplications(); local.push(application); saveLocalApplications(local);
    ["receiptNo","receiptName","receiptMobile","receiptWhatsapp","receiptReason","receiptDate"].forEach(id=>{});
    document.getElementById("receiptNo").textContent=application.applicationNo;
    document.getElementById("receiptName").textContent=application.name;
    document.getElementById("receiptMobile").textContent=application.mobile;
    document.getElementById("receiptWhatsapp").textContent=application.whatsapp;
    document.getElementById("receiptReason").textContent=application.reason;
    document.getElementById("receiptDate").textContent=application.createdAt;
    applyModal.classList.remove("show"); receiptModal.classList.add("show"); applyForm.reset(); applyOtherReason.classList.remove("show"); applyOtherReason.required=false;
  } catch(err) { error.textContent="Application submit नहीं हो पाया. Google Sheet/Internet connection check करें."; console.error(err); }
  finally { submitButton.disabled=false; submitButton.textContent=old; }
});

document.getElementById("printReceipt").onclick=()=>window.print();
document.getElementById("newApplication").onclick=()=>{ receiptModal.classList.remove("show"); applyForm.reset(); applyOtherReason.classList.remove("show"); applyOtherReason.required=false; document.getElementById("applyError").textContent=""; applyModal.classList.add("show"); };
