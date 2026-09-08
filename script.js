const loginModal = document.getElementById("loginModal");
const userModal = document.getElementById("userModal");

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "DCC@2026";

function openLogin(){
  loginModal.classList.add("show");
  document.getElementById("loginError").textContent = "";
}

document.getElementById("loginBtn").onclick = openLogin;
document.getElementById("loginBtn2").onclick = openLogin;
document.getElementById("closeLogin").onclick = () => loginModal.classList.remove("show");
document.getElementById("closeUser").onclick = () => userModal.classList.remove("show");

document.getElementById("doLogin").onclick = () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const error = document.getElementById("loginError");
  error.textContent = "";

  if(username === ADMIN_USERNAME && password === ADMIN_PASSWORD){
    loginModal.classList.remove("show");
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    userModal.classList.add("show");
    renderAdminApplications();
  } else {
    error.textContent = "Admin Username या Password गलत है।";
  }
};

document.getElementById("adminLogout").onclick = () => userModal.classList.remove("show");
document.getElementById("refreshApplications").onclick = renderAdminApplications;
document.getElementById("adminSearch").addEventListener("input", renderAdminApplications);

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

function renderAdminApplications(){
  const list = document.getElementById("adminApplicationsList");
  const search = (document.getElementById("adminSearch").value || "").trim().toLowerCase();
  const applications = getApplications().slice().reverse();

  const today = new Date().toLocaleDateString("en-IN");
  const todayCount = applications.filter(a => String(a.createdAt || "").startsWith(today)).length;

  document.getElementById("totalApplications").textContent = applications.length;
  document.getElementById("todayApplications").textContent = todayCount;

  const filtered = applications.filter(a => {
    const hay = [a.applicationNo,a.name,a.mobile,a.whatsapp,a.reason,a.createdAt].join(" ").toLowerCase();
    return hay.includes(search);
  });

  if(!filtered.length){
    list.innerHTML = '<div class="admin-item"><b>No applications found.</b><br><small>Customer Apply Now form submit करने के बाद application यहाँ दिखाई देगी।</small></div>';
    return;
  }

  list.innerHTML = filtered.map(a => `
    <div class="application-row">
      <div class="application-top">
        <span class="application-no">${escapeHtml(a.applicationNo)}</span>
        <span class="application-date">${escapeHtml(a.createdAt)}</span>
      </div>
      <div class="application-grid">
        <div><span>Name:</span> <b>${escapeHtml(a.name)}</b></div>
        <div><span>Mobile:</span> <b>${escapeHtml(a.mobile)}</b></div>
        <div><span>WhatsApp:</span> <b>${escapeHtml(a.whatsapp)}</b></div>
        <div><span>Apply For:</span> <b>${escapeHtml(a.reason)}</b></div>
      </div>
    </div>
  `).join("");
}

document.getElementById("exportApplications").onclick = () => {
  const applications = getApplications();
  const blob = new Blob([JSON.stringify(applications, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "diksha-applications.json";
  a.click();
  URL.revokeObjectURL(url);
};

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
const APPLICATIONS_KEY = "diksha_applications_v1";

function openApply(){
  receiptModal.classList.remove("show");
  applyModal.classList.add("show");
  document.getElementById("applyError").textContent = "";
}

function closeApply(){
  applyModal.classList.remove("show");
}

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
  const apps = getApplications();
  const serial = String(apps.length + 1).padStart(3,"0");
  return `DCC-${datePart}-${serial}`;
}

document.querySelectorAll('a[href="#applyNow"]').forEach(btn => {
  btn.addEventListener("click", e => {
    e.preventDefault();
    openApply();
  });
});

document.getElementById("closeApply").onclick = closeApply;
document.getElementById("closeReceipt").onclick = () => receiptModal.classList.remove("show");

applyReason.addEventListener("change", () => {
  const isOther = applyReason.value === "Other";
  applyOtherReason.classList.toggle("show", isOther);
  applyOtherReason.required = isOther;
  if(!isOther) applyOtherReason.value = "";
});

applyForm.addEventListener("submit", e => {
  e.preventDefault();

  const name = document.getElementById("applyName").value.trim();
  const mobile = document.getElementById("applyMobile").value.replace(/\D/g, "");
  const whatsapp = document.getElementById("applyWhatsapp").value.replace(/\D/g, "");
  const selectedReason = applyReason.value;
  const reason = selectedReason === "Other"
    ? applyOtherReason.value.trim()
    : selectedReason;
  const error = document.getElementById("applyError");
  error.textContent = "";

  if(name.length < 2){
    error.textContent = "कृपया अपना पूरा नाम दर्ज करें।";
    return;
  }
  if(!/^\d{10}$/.test(mobile)){
    error.textContent = "कृपया 10 अंकों का सही Mobile Number दर्ज करें।";
    return;
  }
  if(!/^\d{10}$/.test(whatsapp)){
    error.textContent = "कृपया 10 अंकों का सही WhatsApp Number दर्ज करें।";
    return;
  }
  if(!reason){
    error.textContent = "कृपया Visit Reason / Apply Service चुनें।";
    return;
  }

  const application = {
    applicationNo: createApplicationNumber(),
    name,
    mobile,
    whatsapp,
    reason,
    createdAt: new Date().toLocaleString("en-IN")
  };

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
});

document.getElementById("printReceipt").onclick = () => {
  window.print();
};

document.getElementById("newApplication").onclick = () => {
  receiptModal.classList.remove("show");
  applyForm.reset();
  applyOtherReason.classList.remove("show");
  applyOtherReason.required = false;
  document.getElementById("applyError").textContent = "";
  applyModal.classList.add("show");
};

[applyModal, receiptModal].forEach(modal => {
  modal.addEventListener("click", e => {
    if(e.target === modal) modal.classList.remove("show");
  });
});
