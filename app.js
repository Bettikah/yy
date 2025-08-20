const firebaseConfig = {
  apiKey: "AIzaSyByANBjLzBtTAsGNOwSSz5uqJm6QYuaw-g",
  authDomain: "youuh-5d9e3.firebaseapp.com",
  projectId: "youuh-5d9e3",
  storageBucket: "youuh-5d9e3.firebasestorage.app",
  messagingSenderId: "772789757705",
  appId: "1:772789757705:web:a8e73acadfcaa4324795d8"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const ATTEMPTS = db.collection("attempts");
const ONE_HOUR = 60 * 60 * 1000;

async function addAttempt(kind, emailOrPhone) {
  const now = new Date();
  const expires = new Date(now.getTime() + ONE_HOUR);
  try {
    await ATTEMPTS.add({
      type: kind,
      email: emailOrPhone || "unknown",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAtLocal: now,
      expiresAt: expires
    });
  } catch (e) {
    console.error("Failed to write attempt:", e);
    alert("Failed to store attempt. Check Firestore rules/connection.");
  }
}

async function deleteExpired() {
  const now = new Date();
  try {
    const snap = await ATTEMPTS.where("expiresAt", "<", now).get();
    const batch = db.batch();
    snap.forEach(doc => batch.delete(doc.ref));
    if (!snap.empty) await batch.commit();
  } catch (e) {
    console.warn("Cleanup skipped:", e);
  }
}
deleteExpired();
setInterval(deleteExpired, 5 * 60 * 1000);

const loginForm = document.getElementById("loginForm");
const signupLink = document.getElementById("signupLink");
const togglePwBtn = document.getElementById("togglePw");

if (togglePwBtn){
  togglePwBtn.addEventListener("click", () => {
    const pw = document.getElementById("password");
    pw.type = pw.type === "password" ? "text" : "password";
  });
}

if (loginForm){
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    await addAttempt("login", email);
    alert("Login attempt stored!");
    loginForm.reset();
  });
}
if (signupLink){
  signupLink.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    await addAttempt("signup", email);
    alert("Signup attempt stored!");
  });
}

const rows = document.getElementById("rows");
const refreshBtn = document.getElementById("refresh");

function formatDate(d){
  try {
    if (!d) return "-";
    if (d.toDate) d = d.toDate();
    return d.toLocaleString();
  }catch{return "-"}
}
function fromNow(d){
  try{
    if (!d) return "-";
    if (d.toDate) d = d.toDate();
    const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
    const m = Math.floor(s/60), r = s % 60;
    const h = Math.floor(m/60), mm = m % 60;
    if (h) return h+"h "+mm+"m ago";
    if (m) return m+"m "+r+"s ago";
    return s+"s ago";
  }catch{return "-"}
}

function renderRows(snap){
  if (!rows) return;
  rows.innerHTML = "";
  snap.forEach(doc => {
    const data = doc.data();
    const created = data.createdAt || data.createdAtLocal;
    const row = document.createElement("div");
    row.innerHTML = `
      <div>${data.type}</div>
      <div>${data.email || "unknown"}</div>
      <div>${formatDate(created)}</div>
      <div>${fromNow(created)}</div>
    `;
    rows.appendChild(row);
  });
}

let unsub = null;
function startLiveQuery(){
  if (!rows) return;
  const now = new Date();
  const q = ATTEMPTS
      .where("expiresAt", ">=", now)
      .orderBy("expiresAt", "desc");

  if (unsub) unsub();
  unsub = q.onSnapshot(renderRows, (err)=>{
    console.error("onSnapshot error", err);
  });
}
if (rows){
  startLiveQuery();
  if (refreshBtn){
    refreshBtn.addEventListener("click", ()=>{
      deleteExpired().then(startLiveQuery);
    });
  }
}
