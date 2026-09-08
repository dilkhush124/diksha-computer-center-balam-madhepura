const loginModal = document.getElementById("loginModal");
const registerModal = document.getElementById("registerModal");
const userModal = document.getElementById("userModal");

const USERS_KEY = "diksha_users_v2";

function getUsers(){
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); }
  catch { return []; }
}
function saveUsers(users){ localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
function encodePassword(password){ return btoa(unescape(encodeURIComponent(password))); }

function openLogin(){
  registerModal.classList.remove("show");
  loginModal.classList.add("show");
  document.getElementById("loginError").textContent = "";
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
document.getElementById("userLogout").onclick = () => userModal.classList.remove("show");

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

  if(name.length < 2){ error.textContent = "कृपया अपना पूरा नाम दर्ज करें।"; return; }
  if(!/^\d{10}$/.test(mobile)){ error.textContent = "कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें।"; return; }
  if(!/^[a-z0-9._-]{4,20}$/.test(username)){ error.textContent = "Username 4-20 characters का होना चाहिए।"; return; }
  if(password.length < 6){ error.textContent = "Password कम से कम 6 characters का होना चाहिए।"; return; }
  if(password !== confirmPassword){ error.textContent = "दोनों Password समान नहीं हैं।"; return; }

  const users = getUsers();
  if(users.some(u => u.username === username)){ error.textContent = "यह Username पहले से registered है।"; return; }
  if(users.some(u => u.mobile === mobile)){ error.textContent = "यह Mobile Number पहले से registered है।"; return; }

  users.push({
    name,
    mobile,
    username,
    password: encodePassword(password),
    registeredAt: new Date().toLocaleString("en-IN")
  });
  saveUsers(users);

  success.textContent = "Registration सफल हुआ! अब Login करें।";
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

  const user = getUsers().find(u => u.username === username && u.password === encodePassword(password));
  if(!user){
    error.textContent = "Username या Password गलत है। पहले Register करें।";
    return;
  }

  loginModal.classList.remove("show");
  document.getElementById("userWelcomeName").textContent = `Welcome, ${user.name}`;
  document.getElementById("userDashUsername").textContent = user.username;
  document.getElementById("userDashMobile").textContent = user.mobile;
  userModal.classList.add("show");
  document.getElementById("password").value = "";
};

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
