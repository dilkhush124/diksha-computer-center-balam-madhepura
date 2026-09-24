const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlB-XvmuGM7DWDqHtLIhrkeXlEwJ3iabaELeyf4MVcv9UgMFlLxgg9oqgwhtRgb3P5FQ/exec";

const loginModal = document.getElementById("loginModal");
const registerModal = document.getElementById("registerModal");
const userModal = document.getElementById("userModal");

const ADMIN_ID = "8405877507";
const ADMIN_PASSWORD = "Diksha@197781";

function openLogin(){
  loginModal.classList.add("show");
  document.getElementById("loginError").textContent = "";
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  document.getElementById("username").focus();
}

document.getElementById("loginBtn").onclick = openLogin;
document.getElementById("loginBtn2").onclick = openLogin;
document.getElementById("closeLogin").onclick = () => loginModal.classList.remove("show");
document.getElementById("closeUser").onclick = () => userModal.classList.remove("show");
document.getElementById("userLogout").onclick = () => {
  userModal.classList.remove("show");
  document.getElementById("adminApplications").innerHTML = "";
};

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
  document.getElementById("userDashMobile").textContent = ADMIN_ID;
  userModal.classList.add("show");
  document.getElementById("password").value = "";
  document.getElementById("adminApplications").innerHTML = '<div class="admin-empty">Loading applications...</div>';
  await renderApplications();
};

function getApplications(){
  try { return JSON.parse(localStorage.getItem(APPLICATIONS_KEY) || "[]"); }
  catch { return []; }
}
function saveApplications(applications){
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(applications));
}
function createApplicationNumber(){
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth()+1).padStart(2,"0"),
    String(now.getDate()).padStart(2,"0")
  ].join("");
  const timePart = String(now.getTime()).slice(-6);
  const randomPart = Math.floor(100 + Math.random() * 900);
  return `DCC-${datePart}-${timePart}-${randomPart}`;
}

async function fetchApplicationsFromGoogle(){
  const response = await fetch(GOOGLE_SCRIPT_URL, { method: "GET", cache: "no-store" });
  if(!response.ok) throw new Error("Could not connect to Google Sheets.");
  const result = await response.json();
  if(!result.success) throw new Error(result.error || "Google Sheets error.");
  return Array.isArray(result.applications) ? result.applications : [];
}

function updateAdminStats(apps){
  const list = Array.isArray(apps) ? apps : getApplications();
  document.getElementById("adminTotalApplications").textContent = String(list.length);
  const n = list.filter(a => (a.status || "New") === "New").length;
  const p = list.filter(a => (a.status || "New") === "Processing").length;
  const c = list.filter(a => (a.status || "New") === "Completed").length;
  document.getElementById("adminNewApplications").textContent = String(n);
  document.getElementById("adminProcessingApplications").textContent = String(p);
  document.getElementById("adminCompletedApplications").textContent = String(c);
}

async function renderApplications(){
  const box = document.getElementById("adminApplications");
  box.innerHTML = '<div class="admin-empty">Loading applications...</div>';

  try {
    const apps = await fetchApplicationsFromGoogle();
    saveApplications(apps);
    updateAdminStats(apps);

    if(!apps.length){
      box.innerHTML = '<div class="admin-empty">No applications received yet.</div>';
      return;
    }

    const search = document.getElementById("applicationSearch").value.trim().toLowerCase();
    const filter = document.getElementById("applicationStatusFilter").value;
    const filtered = apps.filter(app => {
      const hay = [app.applicationNo, app.name, app.mobile, app.whatsapp, app.reason].join(" ").toLowerCase();
      const status = app.status || "New";
      return (!search || hay.includes(search)) && (!filter || status === filter);
    }).slice().reverse();

    if(!filtered.length){
      box.innerHTML = '<div class="admin-empty">No matching applications found.</div>';
      return;
    }

    box.innerHTML = '<h3>APPLICATIONS <small class="result-count">' + filtered.length + ' shown</small></h3>' + filtered.map((app) => {
      const status = app.status || "New";
      return `
      <div class="admin-item" data-app-no="${escapeHtml(app.applicationNo)}">
        <div><b>${escapeHtml(app.applicationNo)}</b> <small>${escapeHtml(app.createdAt)}</small></div>
        <p><b>Name:</b> ${escapeHtml(app.name)}</p>
        <p><b>Mobile:</b> ${escapeHtml(app.mobile)} &nbsp; <b>WhatsApp:</b> ${escapeHtml(app.whatsapp)}</p>
        <p><b>Apply For:</b> ${escapeHtml(app.reason)}</p>
        <div class="admin-row-actions">
          <select class="status-select" data-app-no="${escapeHtml(app.applicationNo)}">
            ${["New","Processing","Completed"].map(x => `<option ${x===status?'selected':''}>${x}</option>`).join("")}
          </select>
          <button class="secondary print-app" data-app-no="${escapeHtml(app.applicationNo)}">Print</button>
          <button class="secondary delete-app" data-app-no="${escapeHtml(app.applicationNo)}">Delete</button>
        </div>
      </div>`;
    }).join("");

    box.querySelectorAll(".status-select").forEach(select => {
      select.onchange = async () => {
        const applicationNo = select.dataset.appNo;
        select.disabled = true;
        try {
          const body = new URLSearchParams({ action: "status", applicationNo, status: select.value });
          const response = await fetch(GOOGLE_SCRIPT_URL, { method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"}, body });
          const result = await response.json();
          if(!result.success) throw new Error(result.error || "Status update failed.");
          const local = getApplications();
          const item = local.find(a => a.applicationNo === applicationNo);
          if(item) item.status = select.value;
          saveApplications(local);
          updateAdminStats(local);
        } catch (error) {
          alert("Status update failed: " + error.message);
          await renderApplications();
        } finally { select.disabled = false; }
      };
    });

    box.querySelectorAll(".print-app").forEach(btn => {
      btn.onclick = () => printApplication(apps.find(a => a.applicationNo === btn.dataset.appNo));
    });

    box.querySelectorAll(".delete-app").forEach(btn => {
      btn.onclick = async () => {
        const applicationNo = btn.dataset.appNo;
        if(!confirm("Delete this application from Google Sheet?")) return;
        btn.disabled = true;
        btn.textContent = "Deleting...";
        try {
          const body = new URLSearchParams({ action: "delete", applicationNo });
          const response = await fetch(GOOGLE_SCRIPT_URL, { method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"}, body });
          const result = await response.json();
          if(!result.success) throw new Error(result.error || "Delete failed.");
          await renderApplications();
        } catch (error) {
          alert("Delete failed: " + error.message);
          btn.disabled = false;
          btn.textContent = "Delete";
        }
      };
    });
  } catch (error) {
    updateAdminStats();
    box.innerHTML = `<div class="admin-empty">Could not load applications from Google Sheets.<br>${escapeHtml(error.message)}</div>`;
  }
}

function printApplication(app){
  if(!app) return;
  const w = window.open("", "_blank", "width=800,height=900");
  if(!w){ alert("Please allow pop-ups to print the application."); return; }
  const status = app.status || "New";
  w.document.write(`<!doctype html><html><head><title>${escapeHtml(app.applicationNo)}</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#123} .head{text-align:center;border-bottom:2px solid #073d91;padding-bottom:15px}.head h1{color:#073d91;margin:0}.head h2{color:#e1271d;margin:5px}.box{margin-top:25px;border:1px solid #ccd6e2;border-radius:10px;overflow:hidden}.row{display:grid;grid-template-columns:35% 65%;padding:13px;border-bottom:1px solid #e5ebf2}.row:last-child{border-bottom:0}.label{font-weight:bold;color:#607080}.status{font-weight:bold}.foot{margin-top:35px;font-size:12px;color:#607080}@media print{button{display:none}}</style></head><body><div class="head"><h1>DIKSHA COMPUTER CENTER</h1><h2>BALAM MADHEPURA</h2><b>APPLICATION / VISIT RECEIPT</b></div><div class="box"><div class="row"><div class="label">Application No.</div><div>${escapeHtml(app.applicationNo)}</div></div><div class="row"><div class="label">Name</div><div>${escapeHtml(app.name)}</div></div><div class="row"><div class="label">Mobile</div><div>${escapeHtml(app.mobile)}</div></div><div class="row"><div class="label">WhatsApp</div><div>${escapeHtml(app.whatsapp)}</div></div><div class="row"><div class="label">Apply For</div><div>${escapeHtml(app.reason)}</div></div><div class="row"><div class="label">Date & Time</div><div>${escapeHtml(app.createdAt)}</div></div><div class="row"><div class="label">Status</div><div class="status">${escapeHtml(status)}</div></div></div><div class="foot">This printout is generated from Diksha Computer Center Balam's online application system.</div><br><button onclick="window.print()">Print</button></body></html>`);
  w.document.close();
}

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}
document.getElementById("viewApplications").onclick = renderApplications;
document.getElementById("refreshApplications").onclick = renderApplications;
document.getElementById("applicationSearch").addEventListener("input", renderApplications);
document.getElementById("applicationStatusFilter").addEventListener("change", renderApplications);

[loginModal, userModal].forEach(modal => {
  modal.addEventListener("click", e => {
    if(e.target === modal) modal.classList.remove("show");
  });
});

/* APPLY NOW + RECEIPT SYSTEM */
const applyModal = document.getElementById("applyModal");
const receiptModal = document.getElementById("receiptModal");
const applyForm = document.getElementById("applyForm");
const applyReason = document.getElementById("applyReason");
const applyOtherReason = document.getElementById("applyOtherReason");

function openApply(){
  receiptModal.classList.remove("show");
  applyModal.classList.add("show");
  document.getElementById("applyError").textContent = "";
}
function closeApply(){ applyModal.classList.remove("show"); }

document.querySelectorAll('a[href="#applyNow"]').forEach(btn => {
  btn.addEventListener("click", e => { e.preventDefault(); openApply(); });
});
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

  const application = {
    applicationNo: createApplicationNumber(),
    name, mobile, whatsapp, reason, status: "New",
    createdAt: new Date().toLocaleString("en-IN")
  };

  submitButton.disabled = true;
  const oldButtonText = submitButton.textContent;
  submitButton.textContent = "Submitting...";

  try {
    const body = new URLSearchParams(application);
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body
    });

    const result = await response.json();
    if(!result.success) throw new Error(result.error || "Application could not be saved.");

    // Keep a local copy too, for offline/receipt continuity.
    const applications = getApplications();
    applications.push(application);
    saveApplications(applications);

    document.getElementById("receiptNo").textContent = application.applicationNo;
    document.getElementById("receiptName").textContent = application.name;
    document.getElementById("receiptMobile").textContent = application.mobile;
    document.getElementById("receiptWhatsapp").textContent = application.whatsapp;
    document.getElementById("receiptReason").textContent = application.reason;
    document.getElementById("receiptDate").textContent = application.createdAt;

    applyModal.classList.remove("show");
    receiptModal.classList.add("show");
  } catch (err) {
    error.textContent = "Application submit nahi ho paya. Internet/Google connection check karke dobara try karein.";
    console.error(err);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = oldButtonText;
  }
});

document.getElementById("printReceipt").onclick = () => window.print();

document.getElementById("newApplication").onclick = () => {
  receiptModal.classList.remove("show");
  applyForm.reset();
  applyOtherReason.classList.remove("show");
  applyOtherReason.required = false;
  document.getElementById("applyError").textContent = "";
  applyModal.classList.add("show");
};
