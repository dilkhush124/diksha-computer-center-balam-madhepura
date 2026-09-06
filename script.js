const loginModal=document.getElementById("loginModal");
const adminModal=document.getElementById("adminModal");
const openLogin=()=>loginModal.classList.add("show");
document.getElementById("loginBtn").onclick=openLogin;
document.getElementById("loginBtn2").onclick=openLogin;
document.getElementById("closeLogin").onclick=()=>loginModal.classList.remove("show");
document.getElementById("closeAdmin").onclick=()=>adminModal.classList.remove("show");

const KEY="diksha_notifications_v1";
function getNotices(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return[]}}
function saveNotices(x){localStorage.setItem(KEY,JSON.stringify(x))}
function renderNotices(){
  const list=document.getElementById("notificationList"), data=getNotices();
  list.innerHTML=data.length?data.map(n=>`<div class="notification"><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml(n.text)}</p><small>${escapeHtml(n.date)}</small></div>`).join(""):"<div class='notification'><h3>Welcome to DIKSHA COMPUTER CENTER</h3><p>New announcements will appear here.</p><small>Website Update</small></div>";
}
function renderAdmin(){
  const box=document.getElementById("adminNotices"), data=getNotices();
  box.innerHTML=data.length?data.map((n,i)=>`<div class="admin-item"><b>${escapeHtml(n.title)}</b><br>${escapeHtml(n.date)} <button onclick="deleteNotice(${i})">Delete</button></div>`).join(""):"<p>No published notifications yet.</p>";
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
window.deleteNotice=function(i){const d=getNotices();d.splice(i,1);saveNotices(d);renderNotices();renderAdmin()};

document.getElementById("doLogin").onclick=()=>{
  const u=document.getElementById("username").value.trim();
  const p=document.getElementById("password").value;
  // DEMO ONLY: replace this with server-side authentication before public deployment.
  if(u==="admin" && p==="change-me"){
    loginModal.classList.remove("show");
    adminModal.classList.add("show");
    renderAdmin();
  }else document.getElementById("loginError").textContent="Invalid login. This demo uses admin / change-me.";
};
document.getElementById("publishNotice").onclick=()=>{
  const title=document.getElementById("noticeTitle").value.trim();
  const text=document.getElementById("noticeText").value.trim();
  if(!title||!text){alert("Please enter a title and notification.");return}
  const data=getNotices();
  data.unshift({title,text,date:new Date().toLocaleString()});
  saveNotices(data);
  document.getElementById("noticeTitle").value="";
  document.getElementById("noticeText").value="";
  renderNotices();renderAdmin();
  alert("Notification published.");
};
document.getElementById("logout").onclick=()=>adminModal.classList.remove("show");
renderNotices();