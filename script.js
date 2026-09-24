const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlB-XvmuGM7DWDqHtLIhrkeXlEwJ3iabaELeyf4MVcv9UgMFlLxgg9oqgwhtRgb3P5FQ/exec";

const loginModal = document.getElementById("loginModal");
const registerModal = document.getElementById("registerModal");
const userModal = document.getElementById("userModal");

const ADMINS_KEY = "diksha_admins_v1";
const APPLICATIONS_KEY = "diksha_applications_v1";

function getAdmins(){
  try { return JSON.parse(localStorage.getItem(ADMINS_KEY) || "[]"); }
  catch { return []; }
}
function saveAdmins(admins){ localStorage.setItem(ADMINS_KEY, JSON.stringify(admins)); }
function encodePassword(password){
  return btoa(unescape(encodeURIComponent(password)));
}

function openLogin(){
  registerModal.classList.remove("show");
  loginModal.classList.add("show");
  document.getElementById("loginError").textContent = "";
  document.getElementById("username").focus();
}
function openRegister(){
  loginModal.classList.remove("show");
  registerModal.classList.add("show");
  document.getElementById("registerError").textContent = "";
  document.getElementById("registerSuccess").textContent = "";
}

document.getElementById("loginBtn").onclick = openLogin;
document.getElementById("loginBtn2").onclick = openLogin;
document.getElementById("registerBtn2").onclick = openRegister;
document.getElementById("openRegister").onclick = openRegister;
document.getElementById("backToLogin").onclick = openLogin;
document.getElementById("closeLogin").onclick = () => loginModal.classList.remove("show");
document.getElementById("closeRegister").onclick = () => registerModal.classList.remove("show");
document.getElementById("closeUser").onclick = () => userModal.classList.remove("show");
document.getElementById("userLogout").onclick = () => {
  userModal.classList.remove("show");
  document.getElementById("adminApplications").innerHTML = "";
};

document.getElementById("doRegister").onclick = () => {
  const name = document.getElementById("regName").value.trim();
  const mobile = document.getElementById("regMobile").value.replace(/\D/g, "");
  const username = document.getElementById("regUsername").value.trim().toLowerCase();
  const password = document.getElementById("regPassword").value;
  const confirmPassword = document.getElementById("regConfirmPassword").value;
  const error = document.getElementById("registerError");
  const success = document.getElementById("registerSuccess");
  error.textContent = "";
  success.textContent = "";

  if(name.length < 2){ error.textContent = "Please enter the admin name."; return; }
  if(!/^\d{10}$/.test(mobile)){ error.textContent = "Please enter a valid 10-digit mobile number."; return; }
  if(!/^[a-z0-9._-]{4,20}$/.test(username)){
    error.textContent = "Admin ID must be 4-20 characters: a-z, 0-9, dot, underscore or hyphen.";
    return;
  }
  if(password.length < 6){ error.textContent = "Admin password must be at least 6 characters."; return; }
  if(password !== confirmPassword){ error.textContent = "Both passwords do not match."; return; }

  const admins = getAdmins();
  if(admins.some(a => a.username === username)){
    error.textContent = "This Admin ID is already registered.";
    return;
  }

  admins.push({
    name, mobile, username,
    password: encodePassword(password),
    registeredAt: new Date().toLocaleString("en-IN")
  });
  saveAdmins(admins);

  success.textContent = "Admin registration successful! Please login.";
  document.getElementById("regPassword").value = "";
  document.getElementById("regConfirmPassword").value = "";
  setTimeout(() => {
    registerModal.classList.remove("show");
    document.getElementById("username").value = username;
    document.getElementById("password").value = "";
    loginModal.classList.add("show");
  }, 700);
};

document.getElementById("doLogin").onclick = () => {
  const username = document.getElementById("username").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const error = document.getElementById("loginError");
  error.textContent = "";

  const admin = getAdmins().find(a =>
    a.username === username && a.password === encodePassword(password)
  );

  if(!admin){
    error.textContent = "Admin ID or Password is incorrect. Please register first.";
    return;
  }

  loginModal.classList.remove("show");
  document.getElementById("userWelcomeName").textContent = `Welcome, ${admin.name}`;
  document.getElementById("userDashUsername").textContent = admin.username;
  document.getElementById("userDashMobile").textContent = admin.mobile;
  userModal.classList.add("show");
  document.getElementById("password").value = "";
  updateAdminStats();
  document.getElementById("adminApplications").innerHTML = '<div class="admin-empty">Click View Applications to load applications.</div>';
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

function updateAdminStats(count){
  document.getElementById("adminTotalApplications").textContent = String(
    typeof count === "number" ? count : getApplications().length
  );
}

async function renderApplications(){
  const box = document.getElementById("adminApplications");
  box.innerHTML = '<div class="admin-empty">Loading applications...</div>';

  try {
    const apps = await fetchApplicationsFromGoogle();
    saveApplications(apps);
    updateAdminStats(apps.length);

    if(!apps.length){
      box.innerHTML = '<div class="admin-empty">No applications received yet.</div>';
      return;
    }

    box.innerHTML = '<h3>APPLICATIONS</h3>' + apps.slice().reverse().map((app) => `
      <div class="admin-item">
        <div><b>${escapeHtml(app.applicationNo)}</b> <small>${escapeHtml(app.createdAt)}</small></div>
        <p><b>Name:</b> ${escapeHtml(app.name)}</p>
        <p><b>Mobile:</b> ${escapeHtml(app.mobile)} &nbsp; <b>WhatsApp:</b> ${escapeHtml(app.whatsapp)}</p>
        <p><b>Apply For:</b> ${escapeHtml(app.reason)}</p>
        <button class="secondary delete-app" data-app-no="${escapeHtml(app.applicationNo)}">Delete</button>
      </div>
    `).join("");

    box.querySelectorAll(".delete-app").forEach(btn => {
      btn.onclick = async () => {
        const applicationNo = btn.dataset.appNo;
        if(!confirm("Delete this application from Google Sheet?")) return;

        btn.disabled = true;
        btn.textContent = "Deleting...";
        try {
          const body = new URLSearchParams({ action: "delete", applicationNo });
          const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
            body
          });
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

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}
document.getElementById("viewApplications").onclick = renderApplications;

[loginModal, registerModal, userModal].forEach(modal => {
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
    name, mobile, whatsapp, reason,
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
