import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getDatabase, ref, push, set, remove, onValue, update, get } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAvmXorDhKlBr3fzNz-NWLPUVQtNHTY8Ig",
  authDomain: "irfaniye-takip-88e84.firebaseapp.com",
  databaseURL: "https://irfaniye-takip-88e84-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "irfaniye-takip-88e84",
  storageBucket: "irfaniye-takip-88e84.firebasestorage.app",
  messagingSenderId: "1038479221874",
  appId: "1:1038479221874:web:b9555c31bf5bf9cf214eeb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);

function getLocalDateStr(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function getTodayDateStr() {
  return getLocalDateStr(new Date());
}

let students = {}, editingId = null, unsubscribe = null;
let staff = {}, systemSettings = {}, currentStudentEditingId = null, currentStaffEditingId = null;
let currentAdminName = "Sistem Kaydı";
let currentSessionUser = null;
let dbUnsubs = [];
let currentActiveLoginRole = "admin"; // "admin" | "staff"

const SESSION_KEY = "irfaniye_auth_session_v2";

function saveSession(userData) {
  currentSessionUser = userData;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData));
  } catch (e) {
    console.warn("Session kaydedilemedi:", e);
  }
}

function getStoredSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Session okunamadı:", e);
  }
  return null;
}

function clearSession() {
  currentSessionUser = null;
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch (e) {}
}

function stopDatabaseListeners() {
  if (unsubscribe) {
    try { unsubscribe(); } catch (e) {}
    unsubscribe = null;
  }
  dbUnsubs.forEach(unsub => {
    try { if (typeof unsub === "function") unsub(); } catch (e) {}
  });
  dbUnsubs = [];
}

function startDatabaseListeners() {
  stopDatabaseListeners();
  try { checkTvHash(); } catch (e) {}

  unsubscribe = onValue(ref(db, "students"), snap => {
    students = snap.val() || {};
    try { renderStudentTable(); } catch (e) { console.warn("renderStudentTable:", e); }
    try { render(); } catch (e) { console.warn("render:", e); }
    try { fillLeaveStudents(); } catch (e) {}
    try { renderPrayerStudents(); } catch (e) {}
    try { renderBedStudents(); } catch (e) {}
    try { renderSchoolReturnStudents(); } catch (e) {}
    try { fillDailyDutyStudents(); } catch (e) {}
    try { fillSupportLessonStudents(); } catch (e) {}
    try { fillTestResultStudents(); } catch (e) {}
    try { fillQuranStudents(); } catch (e) {}
    try { fillAwardStudents(); } catch (e) {}
    try { loadTodayAttendanceSummary(); } catch (e) {}
    try { loadWeeklyAttendanceSummary(); } catch (e) {}
    try { loadTodayPrayerSummary(); } catch (e) {}
    try { loadWeeklyPrayerSummary(); } catch (e) {}
    try { loadTodayBedSummary(); } catch (e) {}
    try { loadWeeklyBedSummary(); } catch (e) {}
    try { loadTodaySchoolReturnSummary(); } catch (e) {}
    try { loadWeeklySchoolReturnSummary(); } catch (e) {}
    try { loadTodayLeaveSummary(); } catch (e) {}
    try { loadWeeklyLeaveSummary(); } catch (e) {}
    try { loadTodayDutySummary(); } catch (e) {}
    try { loadWeeklyDutySummary(); } catch (e) {}
    setTimeout(() => {
      try { loadBedAttendance(); } catch (e) {}
      try { loadSchoolReturnAttendance(); } catch (e) {}
    }, 300);
    try { updateDashboard(); } catch (e) {}
  });

  const staffUnsub = onValue(ref(db, "staff"), snap => {
    staff = snap.val() || {};
    try { renderStaffTable(); } catch (e) {}
    try { fillDailyDutyStudents(); } catch (e) {}
  });
  dbUnsubs.push(staffUnsub);

  const settingsUnsub = onValue(ref(db, "systemSettings"), snap => {
    systemSettings = snap.val() || {};
    try { applySystemSettings(); } catch (e) {}
  });
  dbUnsubs.push(settingsUnsub);

  try { loadDailyDuties(); } catch (e) {}
}

function setAppState(user) {
  currentSessionUser = user;
  const isLoggedIn = !!user;

  if (typeof window.applyAppStateUI === "function") {
    try { window.applyAppStateUI(user); } catch(e) {}
  }

  $("loginCard")?.classList.toggle("hidden", isLoggedIn);
  $("appArea")?.classList.toggle("hidden", !isLoggedIn);
  $("logoutBtn")?.classList.toggle("hidden", !isLoggedIn);
  $("menuToggleBtn")?.classList.toggle("hidden", !isLoggedIn);
  $("floatingMenuBtn")?.classList.toggle("hidden", !isLoggedIn);
  $("headerRefreshBtn")?.classList.toggle("hidden", !isLoggedIn);
  $("headerTvBtn")?.classList.toggle("hidden", !isLoggedIn);
  $("floatingClearCacheBtn")?.classList.toggle("hidden", !isLoggedIn);

  if (!isLoggedIn) {
    closeDrawer();
    stopDatabaseListeners();
    students = {};
    staff = {};
    systemSettings = {};
    return;
  }

  const isStaff = user.role === "staff" || user.access === "hoca" || user.access === "personel";
  currentAdminName = user.name || user.email || (isStaff ? "Personel / Hoca" : "Kurum Yöneticisi");

  if (isStaff) {
    if ($("headerManagerBadge")) {
      $("headerManagerBadge").classList.remove("hidden");
      $("headerManagerBadge").className = "headerPillBadge badgeMint";
      $("headerManagerBadge").innerHTML = `👨‍🏫 ${esc(user.name || "Personel")}`;
    }
    if ($("headerStudentBadge")) $("headerStudentBadge").classList.remove("hidden");
    if ($("drawerAdminName")) $("drawerAdminName").textContent = user.name || "Personel";
    if ($("drawerAdminRole")) $("drawerAdminRole").textContent = user.roleTitle || "Hoca / Personel";

    // Yöneticiye özel kritik yönetim kartlarını personele gizle
    $("staffManagementCard")?.classList.add("hidden");
    $("systemSettingsCard")?.classList.add("hidden");
    document.querySelectorAll('a[href="#staffManagementCard"], a[href="#systemSettingsCard"]').forEach(a => {
      a.style.display = "none";
    });

    // Veritabanı sıfırlama/yedekten yükleme butonlarını gizle
    $("btnUploadFullJson")?.classList.add("hidden");
    $("restoreBackupBtn")?.classList.add("hidden");
    $("importJsonBtn")?.classList.add("hidden");
  } else {
    if ($("headerManagerBadge")) {
      $("headerManagerBadge").classList.remove("hidden");
      $("headerManagerBadge").className = "headerPillBadge badgeGold";
      $("headerManagerBadge").innerHTML = `👑 Kurum Yöneticisi`;
    }
    if ($("headerStudentBadge")) $("headerStudentBadge").classList.remove("hidden");
    if ($("drawerAdminName")) $("drawerAdminName").textContent = systemSettings.adminName || user.name || "ÖMER AVNİYEL";
    if ($("drawerAdminRole")) $("drawerAdminRole").textContent = systemSettings.adminRole || "Kurum Yöneticisi";

    $("staffManagementCard")?.classList.remove("hidden");
    $("systemSettingsCard")?.classList.remove("hidden");
    document.querySelectorAll('a[href="#staffManagementCard"], a[href="#systemSettingsCard"]').forEach(a => {
      a.style.display = "";
    });

    $("btnUploadFullJson")?.classList.remove("hidden");
    $("restoreBackupBtn")?.classList.remove("hidden");
    $("importJsonBtn")?.classList.remove("hidden");
  }

  startDatabaseListeners();
}

async function handleLogout() {
  clearSession();
  try {
    await signOut(auth);
  } catch (e) {}
  setAppState(null);
  const msgEl = $("loginMsg");
  if (msgEl) {
    msgEl.textContent = "👋 Güvenli çıkış yapıldı.";
    msgEl.className = "success";
    setTimeout(() => { if (msgEl) msgEl.textContent = ""; }, 3000);
  }
}

// Sekmeler ve Hızlı Doldurma
function setLoginRoleTab(role) {
  currentActiveLoginRole = role;
  const adminTab = $("roleTabAdmin");
  const staffTab = $("roleTabStaff");
  const inputLabel = $("loginInputLabel");
  const emailInput = $("email");
  const submitBtn = $("submitLoginBtn");

  if (role === "admin") {
    adminTab?.classList.add("active");
    staffTab?.classList.remove("active");
    if (inputLabel) inputLabel.childNodes[0].nodeValue = "👤 Yönetici İsim (Ad Soyad veya Kullanıcı Adı)\n";
    if (emailInput) emailInput.placeholder = "Örn: Ömer Avniyel veya admin";
    if (submitBtn) {
      submitBtn.textContent = "👑 Yönetici Olarak Giriş Yap";
      submitBtn.classList.remove("btnStaffActive");
    }
  } else {
    staffTab?.classList.add("active");
    adminTab?.classList.remove("active");
    if (inputLabel) inputLabel.childNodes[0].nodeValue = "👤 Personel / Hoca Adı\n";
    if (emailInput) emailInput.placeholder = "Örn: Personel veya Hoca Adı (Yasin Ekinci)";
    if (submitBtn) {
      submitBtn.textContent = "👨‍🏫 Personel Olarak Giriş Yap";
      submitBtn.classList.add("btnStaffActive");
    }
  }
}

$("roleTabAdmin")?.addEventListener("click", () => setLoginRoleTab("admin"));
$("roleTabStaff")?.addEventListener("click", () => setLoginRoleTab("staff"));

$("togglePasswordBtn")?.addEventListener("click", () => {
  const passEl = $("password");
  const btn = $("togglePasswordBtn");
  if (!passEl) return;
  if (passEl.type === "password") {
    passEl.type = "text";
    if (btn) btn.textContent = "🙈";
  } else {
    passEl.type = "password";
    if (btn) btn.textContent = "👁️";
  }
});

$("quickAdminBtn")?.addEventListener("click", () => {
  setLoginRoleTab("admin");
  const emailInput = $("email");
  const passInput = $("password");
  if (emailInput) emailInput.value = "Ömer Avniyel";
  if (passInput) passInput.value = "123456";
  $("loginMsg") && ($("loginMsg").textContent = "");
  handleLoginSubmit();
});

$("quickStaffBtn")?.addEventListener("click", () => {
  setLoginRoleTab("staff");
  const emailInput = $("email");
  const passInput = $("password");
  if (emailInput) emailInput.value = "Personel";
  if (passInput) passInput.value = "123456";
  $("loginMsg") && ($("loginMsg").textContent = "");
  handleLoginSubmit();
});

async function handleLoginSubmit(e) {
  if (e && typeof e.preventDefault === "function") {
    e.preventDefault();
    e.stopPropagation();
  }
  const emailInput = $("email");
  const passInput = $("password");
  const msgEl = $("loginMsg");

  let rawName = (emailInput?.value || "").trim();
  let rawPass = (passInput?.value || "").trim();

  // Boş bırakıldıysa seçili sekmeye göre otomatik doldur
  if (!rawName) {
    rawName = (currentActiveLoginRole === "admin") ? "Ömer Avniyel" : "Personel";
    if (emailInput) emailInput.value = rawName;
  }
  if (!rawPass) {
    rawPass = "123456";
    if (passInput) passInput.value = rawPass;
  }

  const clean = s => (s || "").trim().toLowerCase()
    .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u")
    .replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/\s+/g, "");

  const nameClean = clean(rawName);

  if (msgEl) {
    msgEl.textContent = "✅ Giriş başarılı! Sistem açılıyor...";
    msgEl.className = "success";
  }

  // 1. YÖNETİCİ GİRİŞİ:
  // İsim 'ömer', 'omer', 'avniyel', 'admin', 'yonetici' içeriyorsa VEYA Yönetici sekmesindeyse:
  const isAdmin = currentActiveLoginRole === "admin" ||
                  nameClean.includes("omer") ||
                  nameClean.includes("admin") ||
                  nameClean.includes("yonetici") ||
                  nameClean.includes("avniyel");

  if (isAdmin && currentActiveLoginRole !== "staff") {
    const adminSession = {
      role: "admin",
      name: rawName || "ÖMER AVNİYEL",
      roleTitle: "Kurum Yöneticisi",
      email: "admin@irfaniye.com",
      access: "yonetici"
    };
    saveSession(adminSession);
    setAppState(adminSession);
    if (msgEl) msgEl.textContent = "";
    return;
  }

  // 2. DİNAMİK PERSONEL & HOCA LİSTESİ (staff/ veritabanından):
  try {
    const staffSnap = await get(ref(db, "staff"));
    const staffData = staffSnap.val() || {};

    for (const [stId, st] of Object.entries(staffData)) {
      if (!st) continue;
      const stNameClean = clean(st.name);
      const stPhone = (st.phone || "").replace(/\D/g, "");
      const inputPhone = rawName.replace(/\D/g, "");

      const nameMatch = stNameClean && (stNameClean === nameClean || nameClean.includes(stNameClean) || stNameClean.includes(nameClean));
      const phoneMatch = inputPhone && stPhone && stPhone.endsWith(inputPhone) && inputPhone.length >= 7;

      if (nameMatch || phoneMatch) {
        const isYoneticiAccess = (st.access === "yonetici");
        const foundSession = {
          role: isYoneticiAccess ? "admin" : "staff",
          name: st.name || rawName,
          roleTitle: st.role || (isYoneticiAccess ? "Kurum Yöneticisi" : "Hoca / Personel"),
          email: st.email || "",
          access: st.access || "hoca",
          id: stId
        };
        saveSession(foundSession);
        setAppState(foundSession);
        if (msgEl) msgEl.textContent = "";
        return;
      }
    }
  } catch (dbErr) {
    console.warn("Personel tablosu denetlenirken:", dbErr);
  }

  // 3. PERSONEL GİRİŞİ (Varsayılan veya personel seçiliyse):
  const staffSession = {
    role: "staff",
    name: rawName || "Personel",
    roleTitle: "Hoca / Personel",
    email: "personel@irfaniye.com",
    access: "hoca"
  };
  saveSession(staffSession);
  setAppState(staffSession);
  if (msgEl) msgEl.textContent = "";
}

$("loginForm")?.addEventListener("submit", e => {
  e.preventDefault();
  handleLoginSubmit(e);
});

$("submitLoginBtn")?.addEventListener("click", e => {
  e.preventDefault();
  handleLoginSubmit(e);
});

// Enter tuşuna basıldığında otomatik giriş yap
$("email")?.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    if (!$("password")?.value) {
      $("password")?.focus();
    } else {
      handleLoginSubmit(e);
    }
  }
});

$("password")?.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleLoginSubmit(e);
  }
});

$("logoutBtn")?.addEventListener("click", handleLogout);
$("drawerLogoutBtn")?.addEventListener("click", handleLogout);

function updateAttendanceSummary() {
  const selects = document.querySelectorAll(".attendanceStatus");

  let geldi = 0;
  let gelmedi = 0;
  let izinli = 0;

  selects.forEach(select => {
    if (select.value === "geldi") geldi++;
    if (select.value === "gelmedi") gelmedi++;
    if (select.value === "izinli") izinli++;
  });

  $("attendanceSummary").textContent =
    `Toplam: ${selects.length} | Geldi: ${geldi} | Gelmedi: ${gelmedi} | İzinli: ${izinli}`;
}

document.addEventListener("change", e => {
  if (e.target.classList.contains("attendanceStatus")) {
    updateAttendanceSummary();
  }
});

// Oturum Başlatma Kontrolü (Sayfa Yüklendiğinde)
const storedSession = getStoredSession();
if (storedSession) {
  setAppState(storedSession);
} else {
  setAppState(null);
}

// Bağımsız Giriş Motoru ile Köprü (Standalone Login Bridge)
window.triggerAppDatabase = function(session) {
  setAppState(session);
};

window.triggerAppLogout = function() {
  handleLogout();
};

onAuthStateChanged(auth, user => {
  if (user) {
    const isEmailAdmin = (user.email || "").toLowerCase().includes("admin");
    const active = currentSessionUser || {
      role: isEmailAdmin ? "admin" : "staff",
      name: user.displayName || (isEmailAdmin ? "Kurum Yöneticisi" : "Personel"),
      roleTitle: isEmailAdmin ? "Kurum Yöneticisi" : "Hoca / Personel",
      email: user.email || "",
      access: isEmailAdmin ? "yonetici" : "hoca"
    };
    saveSession(active);
    setAppState(active);
  }
});
  const supportLessonDateInput = $("supportLessonDate");

if (supportLessonDateInput && !supportLessonDateInput.value) {
  supportLessonDateInput.value = new Date().toISOString().slice(0, 10);
}
  $("saveSupportLessonBtn")?.addEventListener("click", async () => {
  const date = $("supportLessonDate")?.value;
  const studentId = $("supportLessonStudent")?.value;
  const lessonType = $("supportLessonType")?.value;
  const note = $("supportLessonNote")?.value.trim();
    if (!date || !studentId || !lessonType || !note) {
  $("supportLessonMsg").textContent =
    "Lütfen tarih, talebe, ders ve not girin.";
  return;
}
const student = students[studentId];

try {
  await set(
    ref(db, `supportLessons/${date}/${studentId}/${lessonType}`),
    {
      name: student.name || "İsimsiz",
      note: note
    }
  );

  $("supportLessonMsg").textContent =
    "✅ Ders notu kaydedildi.";
  await loadSupportLessons();
} catch (error) {
  console.error(error);

  $("supportLessonMsg").textContent =
    "❌ Ders notu kaydedilirken hata oluştu.";
}    
});
$("studentForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const data = {
    name: $("name")?.value.trim() || "",
    studentNo: $("studentNo")?.value.trim() || "",
    parentName: $("parentName")?.value.trim() || "",
    parentPhone: $("parentPhone")?.value.trim() || "",
    className: $("className")?.value.trim() || "",
    dormNo: $("dormNo")?.value.trim() || "",
    notes: $("notes")?.value.trim() || ""
  };
  if (editingId) await set(ref(db, "students/" + editingId), data);
  else await set(push(ref(db, "students")), data);
  resetForm();
});

if ($("cancelBtn")) $("cancelBtn").onclick = resetForm;
$("search")?.addEventListener("input", render);

$("importExcelBtn")?.addEventListener("click", async () => {
  const file = $("excelFile")?.files?.[0];
  const msg = $("importMsg");
  if (!file) {
    if (msg) msg.textContent = "Önce Excel dosyasını seçin.";
    return;
  }

  try {
    msg.textContent = "Excel okunuyor...";
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });

    if (!rows.length) {
      msg.textContent = "Excel dosyasında aktarılacak kayıt bulunamadı.";
      return;
    }

    const existingNos = new Set(
      Object.values(students)
        .map(s => String(s.studentNo || "").trim())
        .filter(Boolean)
    );

    const changes = {};
    let added = 0, skipped = 0;

   const normalizeHeader = value => String(value ?? "")
  .replace(/\s+/g, " ")
  .trim()
  .toLocaleUpperCase("tr-TR");

for (const originalRow of rows) {
  const row = {};

  for (const [key, value] of Object.entries(originalRow)) {
    row[normalizeHeader(key)] = value;
  }

  const studentNo = String(
    row["ÖĞRENCİ NO"] ?? row["OGRENCI NO"] ?? ""
  ).trim();

  const name = String(
    row["AD-SOYAD"] ?? row["AD SOYAD"] ?? ""
  ).trim();

  if (!name || !studentNo || existingNos.has(studentNo)) {
    skipped++;
    continue;
  }

  const newRef = push(ref(db, "students"));

  changes["students/" + newRef.key] = {
    name,
    studentNo,
    parentName: String(row["VELİ ADI"] ?? row["VELI ADI"] ?? "").trim(),
    parentPhone: String(row["VELİ TEL"] ?? row["VELI TEL"] ?? "").trim(),
    className: String(row["SINIF"] ?? "").trim(),
    dormNo: String(row["YATAK NO"] ?? row["YATAKHANE NO"] ?? "").trim(),
    notes: ""
  };

  existingNos.add(studentNo);
  added++;
}

    if (!added) {
      msg.textContent = `Yeni kayıt bulunamadı. ${skipped} satır atlandı.`;
      return;
    }

    await update(ref(db), changes);
    msg.textContent = `${added} talebe başarıyla aktarıldı. ${skipped} satır atlandı.`;
    $("excelFile").value = "";
  } catch (err) {
    console.error("Excel aktarım hatası:", err);
    msg.textContent = "Excel aktarımı sırasında hata oluştu. Dosya başlıklarını kontrol edin.";
  }
});

function resetForm() {
  editingId = null;
  $("studentForm")?.reset();
  if ($("saveBtn")) $("saveBtn").textContent = "Talebeyi Kaydet";
  $("cancelBtn")?.classList.add("hidden");
}

function esc(v="") {
  return String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function render() {
  const searchEl = $("search") || $("studentSearch");
  const q = searchEl ? searchEl.value.trim().toLocaleLowerCase("tr-TR") : "";
  const listEl = $("studentList");
  if (!listEl) return;
  const rows = Object.entries(students).filter(([id,s]) =>
    [s.name,s.studentNo,s.className,s.dormNo].join(" ").toLocaleLowerCase("tr-TR").includes(q)
  );
  if (!rows.length) {
    listEl.innerHTML = '<div class="empty">Henüz kayıt bulunmuyor.</div>';
    return;
  }
  listEl.innerHTML = rows.map(([id,s]) => `
    <div class="student">
      <strong>${esc(s.name)}</strong>
      <div class="meta">
        Öğrenci No: ${esc(s.studentNo)}<br>
        Veli: ${esc(s.parentName || "-")} | Tel: ${esc(s.parentPhone || "-")}<br>
        Sınıf: ${esc(s.className || "-")} | Yatakhane No: ${esc(s.dormNo || "-")}<br>
        Notlar: ${esc(s.notes || "-")}
      </div>
      <button data-edit="${id}">Düzenle</button>
      <button class="danger" data-delete="${id}">Sil</button>
    </div>`).join("");

  document.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => editStudent(b.dataset.edit));
  document.querySelectorAll("[data-delete]").forEach(b => b.onclick = async () => {
    if (confirm("Bu talebe kaydı silinsin mi?")) await remove(ref(db, "students/" + b.dataset.delete));
  });
}

function editStudent(id) {
  openStudentEditModal(id);
}
// ===== GÜNLÜK YOKLAMA =====

const attendanceDate = $("attendanceDate");
const attendanceList = $("attendanceList");
const attendanceMsg = $("attendanceMsg");

if (attendanceDate && !attendanceDate.value) {
  attendanceDate.value = new Date().toISOString().slice(0, 10);
}

$("loadAttendanceBtn")?.addEventListener("click", loadAttendance);
$("saveAttendanceBtn")?.addEventListener("click", saveAttendance);

async function loadAttendance() {
  const date = attendanceDate?.value;

  if (!date) {
    if (attendanceMsg) attendanceMsg.textContent = "Lütfen tarih seçin.";
    return;
  }

  const snapshot = await get(ref(db, "attendance/" + date));
  const saved = snapshot.val() || {};

  const list = Object.entries(students);

  if (!list.length) {
    attendanceList.innerHTML = "<p>Talebe bulunamadı.</p>";
    return;
  }

  attendanceList.innerHTML = list.map(([id, s]) => {
    const status = saved[id]?.status || "geldi";

    return `
      <div class="student">
        <strong>${esc(s.name)}</strong>
        <span> — ${esc(s.className || "")}</span>

        <div class="attendanceStatusButtons">
  <button type="button" data-attendance-id="${id}" data-status="geldi"
    class="${status === "geldi" ? "selected" : ""}">Geldi</button>

  <button type="button" data-attendance-id="${id}" data-status="gelmedi"
    class="${status === "gelmedi" ? "selected" : ""}">Gelmedi</button>

  <button type="button" data-attendance-id="${id}" data-status="izinli"
    class="${status === "izinli" ? "selected" : ""}">İzinli</button>
</div>
      </div>
    `;
  }).join("");
  document.querySelectorAll("[data-attendance-id]").forEach(button => {
  button.addEventListener("click", () => {
    const studentId = button.dataset.attendanceId;

    document
      .querySelectorAll(`[data-attendance-id="${studentId}"]`)
      .forEach(btn => btn.classList.remove("selected"));

    button.classList.add("selected");
    updateAttendanceSummary();
  });
});
updateAttendanceSummary();
  attendanceMsg.textContent = "Yoklama açıldı.";
}

async function saveAttendance() {
  const date = attendanceDate.value;

  if (!date) {
    attendanceMsg.textContent = "Lütfen tarih seçin.";
    return;
  }

  const records = {};

  document.querySelectorAll(".attendanceStatusButtons").forEach(group => {
  const selected = group.querySelector("button.selected");
  if (!selected) return;

  const id = selected.dataset.attendanceId;

  records[id] = {
    status: selected.dataset.status,
    studentName: students[id]?.name || "",
    studentNo: students[id]?.studentNo || ""
  };
});

  if (!Object.keys(records).length) {
    attendanceMsg.textContent = "Önce Yoklamayı Aç butonuna basın.";
    return;
  }

  await set(ref(db, "attendance/" + date), records);

  attendanceMsg.textContent = "Yoklama başarıyla kaydedildi.";
}
// ===== AYLIK YOKLAMA RAPORU =====

const reportMonth = $("reportMonth");
const reportSummary = $("reportSummary");
const reportList = $("reportList");

if (reportMonth && !reportMonth.value) {
  reportMonth.value = new Date().toISOString().slice(0, 7);
}

$("loadReportBtn")?.addEventListener("click", loadMonthlyReport);

async function loadMonthlyReport() {
  const month = reportMonth?.value;

  if (!month) {
    if (reportSummary) reportSummary.textContent = "Lütfen bir ay seçin.";
    return;
  }

  reportSummary.textContent = "Rapor hazırlanıyor...";
  reportList.innerHTML = "";

  const snapshot = await get(ref(db, "attendance"));
  const allAttendance = snapshot.val() || {};

  const monthRecords = Object.entries(allAttendance)
    .filter(([date]) => date.startsWith(month));

  if (!monthRecords.length) {
    reportSummary.textContent = "Bu aya ait kayıtlı yoklama bulunamadı.";
    return;
  }

  const totals = {};

  Object.entries(students).forEach(([id, student]) => {
    totals[id] = {
      name: student.name || "",
      studentNo: student.studentNo || "",
      className: student.className || "",
      geldi: 0,
      gelmedi: 0,
      izinli: 0
      
    };
  });

  monthRecords.forEach(([date, records]) => {
    Object.entries(records || {}).forEach(([id, record]) => {
      if (!totals[id]) return;

      if (record.status === "geldi") totals[id].geldi++;
      if (record.status === "gelmedi") totals[id].gelmedi++;
      if (record.status === "izinli") totals[id].izinli++;
    });
  });

  reportSummary.textContent =
    `Bu ay ${monthRecords.length} günlük yoklama kaydı bulundu.`;

  reportList.innerHTML = Object.values(totals)
    .map(student => `
      <div class="student">
        <strong>${esc(student.name)}</strong>
        — ${esc(student.className)}
        <br>
        Geldi: ${student.geldi} |
        Gelmedi: ${student.gelmedi} |
        İzinli: ${student.izinli}
      </div>
    `).join("");
}
// ===== ETÜT TAKİBİ =====

const studyDate = $("studyDate");
const studySession = $("studySession");
const studyList = $("studyList");
const studySummary = $("studySummary");
const studyMsg = $("studyMsg");

if (studyDate && !studyDate.value) {
  studyDate.value = new Date().toISOString().slice(0, 10);
}

$("loadStudyBtn")?.addEventListener("click", loadStudy);
$("saveStudyBtn")?.addEventListener("click", saveStudy);

async function loadStudy() {
  const date = studyDate?.value;
  const session = studySession?.value;

  if (!date) {
    if (studyMsg) studyMsg.textContent = "Lütfen tarih seçin.";
    return;
  }

  const snapshot = await get(
    ref(db, `study/${date}/${session}`)
  );

  const saved = snapshot.val() || {};
  const list = Object.entries(students);

  if (!list.length) {
    studyList.innerHTML = "<p>Talebe bulunamadı.</p>";
    return;
  }

  studyList.innerHTML = list.map(([id, student]) => {
    const record = saved[id] || {};
    const status = record.status || "katildi";
    const note = record.note || "";

    return `
      <div class="student">
        <strong>${esc(student.name)}</strong>
        — ${esc(student.className || "")}
<div class="studyStatusButtons">
  <button type="button" data-study-id="${id}" data-status="katildi"
    class="${status === "katildi" ? "selected" : ""}">Katıldı</button>

  <button type="button" data-study-id="${id}" data-status="katilmadi"
    class="${status === "katilmadi" ? "selected" : ""}">Katılmadı</button>

  <button type="button" data-study-id="${id}" data-status="izinli"
    class="${status === "izinli" ? "selected" : ""}">İzinli</button>
</div>
        <input
          type="text"
          class="studyNote"
          data-id="${id}"
          placeholder="Not..."
          value="${esc(note)}"
        >
      </div>
    `;
  }).join("");
document.querySelectorAll("[data-study-id]").forEach(button => {
  button.addEventListener("click", () => {
    const studentId = button.dataset.studyId;

    document
      .querySelectorAll(`[data-study-id="${studentId}"]`)
      .forEach(btn => btn.classList.remove("selected"));

    button.classList.add("selected");

    updateStudySummary();
  });
});
  updateStudySummary();
  studyMsg.textContent = "Etüt açıldı.";
}
function updateStudySummary() {
  const selectedButtons = document.querySelectorAll(
    ".studyStatusButtons button.selected"
  );

  let katildi = 0;
  let katilmadi = 0;
  let izinli = 0;

  selectedButtons.forEach(button => {
    const status = button.dataset.status;

    if (status === "katildi") katildi++;
    if (status === "katilmadi") katilmadi++;
    if (status === "izinli") izinli++;
  });

  studySummary.textContent =
    `Toplam: ${selectedButtons.length} | Katıldı: ${katildi} | Katılmadı: ${katilmadi} | İzinli: ${izinli}`;
}

async function saveStudy() {
  const date = studyDate.value;
  const session = studySession.value;

  if (!date) {
    studyMsg.textContent = "Lütfen tarih seçin.";
    return;
  }

  const records = {};
document.querySelectorAll(".studyStatusButtons button.selected").forEach(button => {
  const id = button.dataset.studyId;
  const noteInput = document.querySelector(`.studyNote[data-id="${id}"]`);

  records[id] = {
    status: button.dataset.status,
    note: noteInput ? noteInput.value.trim() : "",
    studentName: students[id]?.name || "",
    studentNo: students[id]?.studentNo || ""
  };
});
  if (!Object.keys(records).length) {
    studyMsg.textContent = "Önce Etüdü Aç butonuna basın.";
    return;
  }

  await set(
    ref(db, `study/${date}/${session}`),
    records
  );

  studyMsg.textContent = "Etüt başarıyla kaydedildi.";
}
// ===== AYLIK ETÜT RAPORU =====

const studyReportMonth = $("studyReportMonth");
const studyReportSummary = $("studyReportSummary");
const studyReportList = $("studyReportList");

if (studyReportMonth && !studyReportMonth.value) {
  studyReportMonth.value = new Date().toISOString().slice(0, 7);
}

$("loadStudyReportBtn")?.addEventListener("click", loadStudyReport);

async function loadStudyReport() {
  const month = studyReportMonth?.value;

  if (!month) {
    if (studyReportSummary) studyReportSummary.textContent = "Lütfen bir ay seçin.";
    return;
  }

  studyReportSummary.textContent = "Rapor hazırlanıyor...";
  studyReportList.innerHTML = "";

  const snapshot = await get(ref(db, "study"));
  const allStudy = snapshot.val() || {};

  const monthRecords = Object.entries(allStudy)
    .filter(([date]) => date.startsWith(month));

  if (!monthRecords.length) {
    studyReportSummary.textContent =
      "Bu aya ait kayıtlı etüt bulunamadı.";
    return;
  }

  const totals = {};

  Object.entries(students).forEach(([id, student]) => {
    totals[id] = {
      name: student.name || "",
      studentNo: student.studentNo || "",
      className: student.className || "",
      katildi: 0,
      katilmadi: 0,
      izinli: 0,
      notes: []
    };
  });

  let totalSessions = 0;

  monthRecords.forEach(([date, sessions]) => {
    Object.entries(sessions || {}).forEach(([session, records]) => {
      totalSessions++;

      Object.entries(records || {}).forEach(([id, record]) => {
        if (!totals[id]) return;

        if (record.status === "katildi") totals[id].katildi++;
        if (record.status === "katilmadi") totals[id].katilmadi++;
        if (record.status === "izinli") totals[id].izinli++;

        if (record.note && record.note.trim()) {
          totals[id].notes.push(
            `${date} - ${session}. Etüt: ${record.note}`
          );
        }
      });
    });
  });

  studyReportSummary.textContent =
    `Bu ay ${totalSessions} etüt kaydı bulundu.`;

  studyReportList.innerHTML = Object.values(totals)
    .map(student => `
      <div class="student">
        <strong>${esc(student.name)}</strong>
        — ${esc(student.className)}
        <br>
        Katıldı: ${student.katildi} |
        Katılmadı: ${student.katilmadi} |
        İzinli: ${student.izinli}

        ${
          student.notes.length
            ? `<br><strong>Notlar:</strong><br>${student.notes
                .map(note => esc(note))
                .join("<br>")}`
            : ""
        }
      </div>
    `).join("");
}
// ===== İZİN / ÇIKIŞ TAKİBİ =====

const leaveStudent = $("leaveStudent");
const leaveStart = $("leaveStart");
const leaveEnd = $("leaveEnd");
const leaveReason = $("leaveReason");
const leaveReceiver = $("leaveReceiver");
const leaveMsg = $("leaveMsg");
const leaveList = $("leaveList");

function fillLeaveStudents() {
  if (!leaveStudent) return;
  leaveStudent.innerHTML = '<option value="">Talebe seçin</option>';

  Object.entries(students)
    .sort((a, b) =>
      (a[1].name || "").localeCompare(b[1].name || "", "tr")
    )
    .forEach(([id, student]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent =
        `${student.name || ""} - ${student.className || ""}`;
      leaveStudent.appendChild(option);
    });
}

$("saveLeaveBtn")?.addEventListener("click", saveLeave);

async function saveLeave() {
  const studentId = leaveStudent?.value;

  if (!studentId) {
    if (leaveMsg) leaveMsg.textContent = "Lütfen talebe seçin.";
    return;
  }

  if (!leaveStart?.value) {
    if (leaveMsg) leaveMsg.textContent = "Lütfen çıkış tarihini ve saatini seçin.";
    return;
  }

  const student = students[studentId];

  const newRef = push(ref(db, "leaves"));

  await set(newRef, {
    studentId,
    studentName: student.name || "",
    studentNo: student.studentNo || "",
    className: student.className || "",
    start: leaveStart.value,
    end: leaveEnd.value,
    reason: leaveReason.value.trim(),
    receiver: leaveReceiver.value.trim(),
    returned: false
  });

  leaveMsg.textContent = "İzin kaydı başarıyla oluşturuldu.";

  leaveStudent.value = "";
  leaveStart.value = "";
  leaveEnd.value = "";
  leaveReason.value = "";
  leaveReceiver.value = "";
}

onValue(ref(db, "leaves"), snapshot => {
  const leaves = snapshot.val() || {};

  const records = Object.entries(leaves).sort(
    (a, b) => (b[1].start || "").localeCompare(a[1].start || "")
  );

  if (!records.length) {
    leaveList.innerHTML =
      '<div class="empty">Henüz izin kaydı bulunmuyor.</div>';
    return;
  }

  leaveList.innerHTML = records.map(([id, item]) => `
    <div class="student">
      <strong>${esc(item.studentName || "")}</strong>
      — ${esc(item.className || "")}
      <br>
      Çıkış: ${esc(item.start || "-")}
      <br>
      Planlanan Dönüş: ${esc(item.end || "-")}
      <br>
      Neden: ${esc(item.reason || "-")}
      <br>
      Teslim Alan: ${esc(item.receiver || "-")}
      <br>
      Durum:
      <strong>${item.returned ? "Döndü" : "Dışarıda"}</strong>
      <br><br>

      ${
        !item.returned
          ? `<button type="button" data-return="${id}">Döndü</button>`
          : ""
      }
    </div>
  `).join("");

  document.querySelectorAll("[data-return]").forEach(button => {
    button.onclick = async () => {
      await update(ref(db, "leaves/" + button.dataset.return), {
        returned: true,
        returnedAt: new Date().toISOString()
      });
    };
  });
});
async function updateDashboard() {
  const today = new Date().toISOString().slice(0, 10);

  const total = Object.keys(students || {}).length;

  let geldi = 0;
  let gelmedi = 0;
  let izinli = 0;
  let disarida = 0;

  // Bugünkü yoklama
  const attendanceSnap = await get(ref(db, "attendance/" + today));
  const attendance = attendanceSnap.val() || {};

  Object.values(attendance).forEach(record => {
    if (record.status === "geldi") geldi++;
    if (record.status === "gelmedi") gelmedi++;
    if (record.status === "izinli") izinli++;
  });

  // Şu anda dışarıda olanlar
  const leaveSnap = await get(ref(db, "leaves"));
  const leaves = leaveSnap.val() || {};

  Object.values(leaves).forEach(record => {
    if (!record.returned) disarida++;
  });

  if ($("dashTotal")) $("dashTotal").textContent = total;
  if ($("dashPresent")) $("dashPresent").textContent = geldi;
  if ($("dashAbsent")) $("dashAbsent").textContent = gelmedi;
  if ($("dashExcused")) $("dashExcused").textContent = izinli;
  if ($("dashOutside")) $("dashOutside").textContent = disarida;

  if ($("dashboardDate")) {
    $("dashboardDate").textContent =
      "Son güncelleme: " + new Date().toLocaleString("tr-TR");
  }
}
$("boxAbsent")?.addEventListener("click", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const snap = await get(ref(db, "attendance/" + today));
  const attendance = snap.val() || {};

  const absentIds = Object.entries(attendance)
    .filter(([id, record]) => record.status === "gelmedi")
    .map(([id]) => id);

  const absentStudents = absentIds
    .map(id => students[id])
    .filter(Boolean);

  if (absentStudents.length === 0) {
    alert("Bugün gelmeyen talebe yok.");
    return;
  }

  const liste = absentStudents
    .map((student, i) =>
      `${i + 1}. ${student.name || "İsimsiz"} - ${student.className || "Sınıf belirtilmemiş"}`
    )
    .join("\n");

  openStudentModal("BUGÜN GELMEYEN TALEBELER", absentStudents);
});
$("boxExcused")?.addEventListener("click", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const snap = await get(ref(db, "attendance/" + today));
  const attendance = snap.val() || {};

  const excusedIds = Object.entries(attendance)
    .filter(([id, record]) => record.status === "izinli")
    .map(([id]) => id);

  const excusedStudents = excusedIds
    .map(id => students[id])
    .filter(Boolean);

  if (excusedStudents.length === 0) {
    alert("Bugün izinli talebe yok.");
    return;
  }

  const liste = excusedStudents
    .map((student, i) =>
      `${i + 1}. ${student.name || "İsimsiz"} - ${student.className || "Sınıf belirtilmemiş"}`
    )
    .join("\n");

  openStudentModal("BUGÜN İZİNLİ TALEBELER", excusedStudents);
});
$("boxOutside")?.addEventListener("click", async () => {
  const snap = await get(ref(db, "leaves"));
  const leaves = snap.val() || {};

  const outsideStudents = Object.values(leaves)
    .filter(record => !record.returned)
    .map(record => students[record.studentId])
    .filter(Boolean);

  const liste = outsideStudents
    .map((student, i) =>
      `${i + 1}. ${student.name || "İsimsiz"} - ${student.className || "Sınıf belirtilmemiş"}`
    )
    .join("\n");

  openStudentModal("ŞU AN DIŞARIDA OLAN TALEBELER", outsideStudents);
});
$("boxPresent")?.addEventListener("click", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const snap = await get(ref(db, "attendance/" + today));
  const attendance = snap.val() || {};

  const presentIds = Object.entries(attendance)
    .filter(([id, record]) => record.status === "geldi")
    .map(([id]) => id);

  const presentStudents = presentIds
    .map(id => students[id])
    .filter(Boolean);

  if (presentStudents.length === 0) {
    alert("Bugün gelen talebe yok.");
    return;
  }

  const liste = presentStudents
    .map((student, i) =>
      `${i + 1}. ${student.name || "İsimsiz"} - ${student.className || "Sınıf belirtilmemiş"}`
    )
    .join("\n"); 

 openStudentModal("BUGÜN GELEN TALEBELER", presentStudents);
});
// Açılır talebe listesi
const studentModal = $("studentModal");
const studentModalTitle = $("studentModalTitle");
const studentModalBody = $("studentModalBody");
const studentModalClose = $("studentModalClose");

function openStudentModal(title, studentList) {
  if (studentModalTitle) studentModalTitle.textContent = title;
  if (studentModalBody) {
    studentModalBody.innerHTML = "";

    if (studentList.length === 0) {
      studentModalBody.innerHTML =
        `<tr><td colspan="3">Bu durumda talebe yok.</td></tr>`;
    } else {
      studentList.forEach(student => {
        const row = document.createElement("tr");

        row.innerHTML = `
          <td>${student.name || "İsimsiz"}</td>
          <td>${student.className || "-"}</td>
          <td>${student.studentNo || "-"}</td>
        `;

        studentModalBody.appendChild(row);
      });
    }
  }

  studentModal?.classList.remove("hidden");
}

studentModalClose?.addEventListener("click", () => {
  studentModal.classList.add("hidden");
});

studentModal?.addEventListener("click", (e) => {
  if (e.target === studentModal) {
    studentModal.classList.add("hidden");
  }
});
// ==============================
// NAMAZ TAKİP SİSTEMİ
// ==============================

let selectedPrayer = "sabah";
let prayerStatuses = {};
let prayerClassFilter = "all";
let prayerStudentSearch = "";
function renderPrayerStudents() {
  const container = $("prayerStudentList");
  if (!container) return;

  container.innerHTML = "";
Object.entries(students || {}).forEach(([id, student]) => {
  if (
  prayerClassFilter !== "all" &&
  (student.className || "").trim().toUpperCase() !== prayerClassFilter.toUpperCase()
) return;

if (prayerStudentSearch) {
  const searchText = prayerStudentSearch.toLowerCase();
  const studentName = (student.name || "").toLowerCase();

  if (!studentName.includes(searchText)) return;
}
    const row = document.createElement("div");
    row.className = "prayerStudentRow";

    row.innerHTML = `
      <div class="prayerStudentName">
        <strong>${student.name || "İsimsiz"}</strong>
        <small>${student.className || ""}</small>
      </div>

      <div class="prayerStatusButtons">
        <button type="button" data-prayer-student="${id}" data-status="var">Var</button>
        <button type="button" data-prayer-student="${id}" data-status="yok">Yok</button>
        <button type="button" data-prayer-student="${id}" data-status="gec">Geç</button>
        <button type="button" data-prayer-student="${id}" data-status="izinli">İzinli</button>
        <button type="button" data-prayer-student="${id}" data-status="takkesiz">Takkesiz</button>
      </div>
    `;

    container.appendChild(row);
  });
}
$("prayerClassFilters")?.addEventListener("click", (e) => {
  const button = e.target.closest("[data-class]");
  if (!button) return;

  prayerClassFilter = button.dataset.class;

  document
    .querySelectorAll("#prayerClassFilters [data-class]")
    .forEach(btn => btn.classList.remove("active"));

  button.classList.add("active");
  renderPrayerStudents();
});
$("prayerStudentSearch")?.addEventListener("input", (e) => {
  prayerStudentSearch = e.target.value.trim();
  renderPrayerStudents();
});
$("prayerStudentList")?.addEventListener("click", (e) => {
  const button = e.target.closest("[data-prayer-student]");
  if (!button) return;

  const studentId = button.dataset.prayerStudent;
  const status = button.dataset.status;
if (status === "takkesiz") {
  if (!prayerStatuses[studentId] || typeof prayerStatuses[studentId] !== "object") {
    prayerStatuses[studentId] = {
      durum: prayerStatuses[studentId] || "",
      takkesiz: false
    };
  }

  prayerStatuses[studentId].takkesiz = !prayerStatuses[studentId].takkesiz;
  button.classList.toggle("selected", prayerStatuses[studentId].takkesiz);

} else {
  if (!prayerStatuses[studentId] || typeof prayerStatuses[studentId] !== "object") {
    prayerStatuses[studentId] = {
      durum: "",
      takkesiz: false
    };
  }

  prayerStatuses[studentId].durum = status;

  button.parentElement.querySelectorAll("button").forEach(btn => {
    if (btn.dataset.status !== "takkesiz") {
      btn.classList.remove("selected");
    }
  });

  button.classList.add("selected");
}
  updatePrayerCounts();
  });
$("prayerAllPresentBtn")?.addEventListener("click", () => {
  Object.keys(students || {}).forEach(id => {
    prayerStatuses[id] = {
      durum: "var",
      takkesiz: false
    };
  });

  document.querySelectorAll("[data-prayer-student]").forEach(button => {
    button.classList.remove("selected");

    if (button.dataset.status === "var") {
      button.classList.add("selected");
    }
  });

  updatePrayerCounts();
});
$("prayerReviewAbsentBtn")?.addEventListener("click", () => {
  const absentStudents = [];

  Object.entries(prayerStatuses || {}).forEach(([studentId, record]) => {
    if (!record || typeof record !== "object") return;

    if (["yok", "gec", "izinli"].includes(record.durum)) {
      const student = students?.[studentId];

      absentStudents.push(
        `${student?.name || "İsimsiz"} - ${
          record.durum === "yok"
            ? "Yok"
            : record.durum === "gec"
            ? "Geç"
            : "İzinli"
        }`
      );
    }
  });

  if (absentStudents.length === 0) {
  const modal = $("prayerAbsentModal");
  const info = $("prayerAbsentModalInfo");
  const list = $("prayerAbsentModalList");

  if (modal && info && list) {
    info.textContent = "Bu vakitte olmayan talebe bulunmuyor.";
    list.innerHTML = `<div class="prayerAbsentItem">✅ Tüm talebeler mevcut.</div>`;
    modal.classList.remove("hidden");
  }

  return;
}

  const modal = $("prayerAbsentModal");
const info = $("prayerAbsentModalInfo");
const list = $("prayerAbsentModalList");

if (modal && info && list) {
  info.textContent = `${absentStudents.length} talebe bulundu.`;

  list.innerHTML = absentStudents
    .map(item => `<div class="prayerAbsentItem">${item}</div>`)
    .join("");

  modal.classList.remove("hidden");
}
});
$("closePrayerAbsentModal")?.addEventListener("click", () => {
  $("prayerAbsentModal")?.classList.add("hidden");
});
function updatePrayerCounts() {
  const counts = {
    var: 0,
    yok: 0,
    gec: 0,
    izinli: 0,
    takkesiz: 0
  };

  Object.values(prayerStatuses).forEach(status => {
    if (typeof status === "object" && status !== null) {
      if (status.durum && counts[status.durum] !== undefined) {
        counts[status.durum]++;
      }

      if (status.takkesiz === true) {
        counts.takkesiz++;
      }
    }
  });

  $("prayerVarCount").textContent = counts.var;
  $("prayerYokCount").textContent = counts.yok;
  $("prayerGecCount").textContent = counts.gec;
  $("prayerIzinliCount").textContent = counts.izinli;
  $("prayerTakkesizCount").textContent = counts.takkesiz;
}
document.querySelectorAll("#prayerTimes [data-prayer]").forEach(button => {
  button.addEventListener("click", () => {
    selectedPrayer = button.dataset.prayer;
document.querySelectorAll("#prayerTimes [data-prayer]").forEach(btn => {
  btn.classList.remove("active");
});

button.classList.add("active");
    const names = {
      sabah: "Sabah",
      ogle: "Öğle",
      ikindi: "İkindi",
      aksam: "Akşam",
      yatsi: "Yatsı"
    };

    $("selectedPrayer").textContent =
      "Seçili Vakit: " + names[selectedPrayer];

    prayerStatuses = {};

    document.querySelectorAll("[data-prayer-student]").forEach(btn => {
      btn.classList.remove("selected");
    });

    updatePrayerCounts();
  });
});
const prayerDateInput = $("prayerDate");

if (prayerDateInput && !prayerDateInput.value) {
  prayerDateInput.value = new Date().toISOString().slice(0, 10);
}
$("savePrayerBtn")?.addEventListener("click", async () => {
  const date = $("prayerDate")?.value;

  if (!date) {
    $("prayerMsg").textContent = "Lütfen tarih seçin.";
    return;
  }

  if (Object.keys(prayerStatuses).length === 0) {
    $("prayerMsg").textContent = "Önce namaz yoklamasını işaretleyin.";
    return;
  }

  try {
    await set(
      ref(db, `prayerAttendance/${date}/${selectedPrayer}`),
      prayerStatuses
    );
await set(
  ref(db, `prayerAudit/${date}/${selectedPrayer}`),
  {
    recordedAt: Date.now(),
   recordedBy: currentAdminName
  }
);
    $("prayerMsg").textContent = "✅ Namaz yoklaması kaydedildi.";
    await loadPrayerAuditPanel();
  } catch (error) {
    console.error(error);
    $("prayerMsg").textContent = "❌ Kayıt sırasında hata oluştu.";
  }
});
async function loadPrayerAttendance() {
  const date = $("prayerDate")?.value;
  if (!date) return;

  try {
    const snap = await get(
      ref(db, `prayerAttendance/${date}/${selectedPrayer}`)
    );

    prayerStatuses = snap.val() || {};

    document.querySelectorAll("[data-prayer-student]").forEach(button => {
  button.classList.remove("selected");

  const studentId = button.dataset.prayerStudent;
  const status = button.dataset.status;
  const saved = prayerStatuses[studentId];

  if (!saved) return;

  if (typeof saved === "object") {
    if (status === "takkesiz" && saved.takkesiz === true) {
      button.classList.add("selected");
    }

    if (status !== "takkesiz" && saved.durum === status) {
      button.classList.add("selected");
    }
  }
});

    updatePrayerCounts();
  } catch (error) {
    console.error(error);
  }
}
async function loadPrayerTimeCounts() {
  const date = $("prayerDate")?.value;
  if (!date) return;

  try {
    const snap = await get(ref(db, `prayerAttendance/${date}`));
    const dayData = snap.val() || {};

    document.querySelectorAll("#prayerTimes [data-prayer]").forEach(button => {
      const prayer = button.dataset.prayer;
      const records = dayData[prayer] || {};

      let varCount = 0;

      Object.values(records).forEach(record => {
        if (record && typeof record === "object" && record.durum === "var") {
          varCount++;
        }
      });

      button.dataset.varCount = varCount;
      const prayerNames = {
  sabah: "🔒 Sabah",
  ogle: "🌞 Öğle",
  ikindi: "🌤️ İkindi",
  aksam: "🌆 Akşam",
  yatsi: "🌙 Yatsı"
};

button.textContent = `${prayerNames[prayer]} (${varCount})`;
    });
  } catch (error) {
    console.error(error);
  }
}
$("prayerDate")?.addEventListener("change", () => {
  loadPrayerAttendance();
  loadPrayerTimeCounts();
});
loadPrayerAttendance();
loadPrayerTimeCounts();
async function loadPrayerAuditPanel() {
  const date = $("prayerDate")?.value;
  if (!date) return;

  const auditDate = $("prayerAuditDate");
  const auditTotal = $("prayerAuditTotal");

  if (auditDate) {
    auditDate.textContent = `(${date})`;
  }

  const prayers = ["sabah", "ogle", "ikindi", "aksam", "yatsi"];
  let completedCount = 0;

  try {
    const snap = await get(ref(db, `prayerAttendance/${date}`));
    const dayData = snap.val() || {};
const auditSnap = await get(
  ref(db, `prayerAudit/${date}`)
);
const auditData = auditSnap.val() || {};
    prayers.forEach(prayer => {
      const card = document.querySelector(
        `[data-audit-prayer="${prayer}"]`
      );

      if (!card) return;

      const statusEl = card.querySelector(".auditStatus");
      const countsEl = card.querySelector(".auditCounts");
      const auditInfo = auditData[prayer] || {};
      const records = dayData[prayer] || {};

      const entries = Object.values(records);

      if (entries.length === 0) {
        card.classList.remove("completed");
        statusEl.textContent = "Bekleniyor";
        countsEl.textContent = "-";
        return;
      }

      completedCount++;

      let varCount = 0;
      let yokCount = 0;
      let gecCount = 0;
      let izinliCount = 0;
      let takkesizCount = 0;

      entries.forEach(record => {
        if (!record || typeof record !== "object") return;

        if (record.durum === "var") varCount++;
        if (record.durum === "yok") yokCount++;
        if (record.durum === "gec") gecCount++;
        if (record.durum === "izinli") izinliCount++;
        if (record.takkesiz === true) takkesizCount++;
      });

      card.classList.add("completed");
      statusEl.textContent = `✓ Alındı (${entries.length} T.)`;
if (auditInfo.recordedAt) {
  const time = new Date(auditInfo.recordedAt).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit"
  });

  statusEl.textContent += ` • ${auditInfo.recordedBy || "Sistem Kaydı"} • ${time}`;
}
      countsEl.textContent =
        `Var: ${varCount} • Yok: ${yokCount} • Geç: ${gecCount} • İzinli: ${izinliCount} • Takkesiz: ${takkesizCount}`;
    });

    if (auditTotal) {
      auditTotal.textContent = `${completedCount} / 5 Vakit Alındı`;
    }
  } catch (error) {
    console.error("Namaz denetim paneli yüklenemedi:", error);
  }
}
$("prayerDate")?.addEventListener("change", () => {
  loadPrayerAuditPanel();
});

loadPrayerAuditPanel();
// ==============================
// YATAK YOKLAMASI
// ==============================

let bedStatuses = {};

function renderBedStudents() {
  const container = $("bedStudentList");
  if (!container) return;

  container.innerHTML = "";

  Object.entries(students || {}).forEach(([id, student]) => {
    const row = document.createElement("div");
    row.className = "bedStudentRow";

    row.innerHTML = `
      <div>
        <strong>${student.name || "İsimsiz"}</strong>
        <small>${student.className || ""}</small>
      </div>

      <div>
        <button type="button" data-bed-student="${id}" data-status="present">
          Yatağında
        </button>

        <button type="button" data-bed-student="${id}" data-status="absent">
          Yatağında Değil
        </button>

        <button type="button" data-bed-student="${id}" data-status="excused">
          İzinli
        </button>
      </div>
    `;

    container.appendChild(row);
  });
}

$("bedStudentList")?.addEventListener("click", (e) => {
  const button = e.target.closest("[data-bed-student]");
  if (!button) return;

  const studentId = button.dataset.bedStudent;
  const status = button.dataset.status;

  bedStatuses[studentId] = status;

  button.parentElement.querySelectorAll("button").forEach(btn => {
    btn.classList.remove("selected");
  });

  button.classList.add("selected");
  updateBedCounts();
});

function updateBedCounts() {
  let present = 0;
  let absent = 0;
  let excused = 0;

  Object.values(bedStatuses).forEach(status => {
    if (status === "present") present++;
    if (status === "absent") absent++;
    if (status === "excused") excused++;
  });

  $("bedPresentCount").textContent = present;
  $("bedAbsentCount").textContent = absent;
  $("bedExcusedCount").textContent = excused;
}

$("bedAllPresentBtn")?.addEventListener("click", () => {
  Object.keys(students || {}).forEach(id => {
    bedStatuses[id] = "present";
  });

  document.querySelectorAll("[data-bed-student]").forEach(button => {
    button.classList.remove("selected");

    if (button.dataset.status === "present") {
      button.classList.add("selected");
    }
  });

  updateBedCounts();
});

const bedDateInput = $("bedDate");

if (bedDateInput && !bedDateInput.value) {
  bedDateInput.value = new Date().toISOString().slice(0, 10);
}

$("saveBedBtn")?.addEventListener("click", async () => {
  const date = $("bedDate")?.value;

  if (!date) {
    $("bedMsg").textContent = "Lütfen tarih seçin.";
    return;
  }

  if (Object.keys(bedStatuses).length === 0) {
    $("bedMsg").textContent = "Önce yatak yoklamasını işaretleyin.";
    return;
  }

  try {
    await set(
      ref(db, `bedAttendance/${date}`),
      bedStatuses
    );

    $("bedMsg").textContent = "✅ Yatak yoklaması kaydedildi.";
  } catch (error) {
    console.error(error);
    $("bedMsg").textContent = "❌ Kayıt sırasında hata oluştu.";
  }
});

async function loadBedAttendance() {
  const date = $("bedDate")?.value;
  if (!date) return;

  try {
    const snap = await get(
      ref(db, `bedAttendance/${date}`)
    );

    bedStatuses = snap.val() || {};

    document.querySelectorAll("[data-bed-student]").forEach(button => {
      button.classList.remove("selected");

      const studentId = button.dataset.bedStudent;
      const status = button.dataset.status;

      if (bedStatuses[studentId] === status) {
        button.classList.add("selected");
      }
    });

    updateBedCounts();
  } catch (error) {
    console.error(error);
  }
}

$("bedDate")?.addEventListener("change", () => {
  loadBedAttendance();
});

loadBedAttendance();
// ==============================
// OKUL DÖNÜŞÜ YOKLAMASI
// ==============================

let schoolReturnStatuses = {};

function renderSchoolReturnStudents() {
  const container = $("schoolStudentList");
  if (!container) return;

  container.innerHTML = "";

  Object.entries(students || {}).forEach(([id, student]) => {
    const row = document.createElement("div");
    row.className = "schoolStudentRow";

    row.innerHTML = `
      <div>
        <strong>${student.name || "İsimsiz"}</strong>
        <small>${student.className || ""}</small>
      </div>

      <div>
        <button type="button" data-school-student="${id}" data-status="present">
          Geldi
        </button>

        <button type="button" data-school-student="${id}" data-status="absent">
          Gelmedi
        </button>

        <button type="button" data-school-student="${id}" data-status="excused">
          İzinli
        </button>
      </div>
    `;

    container.appendChild(row);
  });
}
$("schoolStudentList")?.addEventListener("click", (e) => {
  const button = e.target.closest("[data-school-student]");
  if (!button) return;

  const studentId = button.dataset.schoolStudent;
  const status = button.dataset.status;

  schoolReturnStatuses[studentId] = status;

  button.parentElement.querySelectorAll("button").forEach(btn => {
    btn.classList.remove("selected");
  });

  button.classList.add("selected");
  updateSchoolReturnCounts();
});
function updateSchoolReturnCounts() {
  let present = 0;
  let absent = 0;
  let excused = 0;

  Object.values(schoolReturnStatuses).forEach(status => {
    if (status === "present") present++;
    if (status === "absent") absent++;
    if (status === "excused") excused++;
  });

  $("schoolPresentCount").textContent = present;
  $("schoolAbsentCount").textContent = absent;
  $("schoolExcusedCount").textContent = excused;
}
$("schoolAllPresentBtn")?.addEventListener("click", () => {
  Object.keys(students || {}).forEach(id => {
    schoolReturnStatuses[id] = "present";
  });

  document.querySelectorAll("[data-school-student]").forEach(button => {
    button.classList.remove("selected");

    if (button.dataset.status === "present") {
      button.classList.add("selected");
    }
  });

  updateSchoolReturnCounts();
});

const schoolReturnDateInput = $("schoolReturnDate");

if (schoolReturnDateInput && !schoolReturnDateInput.value) {
  schoolReturnDateInput.value = new Date().toISOString().slice(0, 10);
}

$("saveSchoolReturnBtn")?.addEventListener("click", async () => {
  const date = $("schoolReturnDate")?.value;

  if (!date) {
    $("schoolReturnMsg").textContent = "Lütfen tarih seçin.";
    return;
  }

  if (Object.keys(schoolReturnStatuses).length === 0) {
    $("schoolReturnMsg").textContent =
      "Önce okul dönüşü yoklamasını işaretleyin.";
    return;
  }

  try {
    await set(
      ref(db, `schoolReturnAttendance/${date}`),
      schoolReturnStatuses
    );

    $("schoolReturnMsg").textContent =
      "✅ Okul dönüşü yoklaması kaydedildi.";
  } catch (error) {
    console.error(error);
    $("schoolReturnMsg").textContent =
      "❌ Kayıt sırasında hata oluştu.";
  }
});
async function loadSchoolReturnAttendance() {
  const date = $("schoolReturnDate")?.value;
  if (!date) return;

  try {
    const snap = await get(
      ref(db, `schoolReturnAttendance/${date}`)
    );

    schoolReturnStatuses = snap.val() || {};

    document.querySelectorAll("[data-school-student]").forEach(button => {
      button.classList.remove("selected");

      const studentId = button.dataset.schoolStudent;
      const status = button.dataset.status;

      if (schoolReturnStatuses[studentId] === status) {
        button.classList.add("selected");
      }
    });
    updateSchoolReturnCounts();
    } catch (error) {
    console.error(error);
  }
}

$("schoolReturnDate")?.addEventListener("change", () => {
  loadSchoolReturnAttendance();
});

loadSchoolReturnAttendance();
// ==============================
// GÜNÜN GÖREVLİLERİ (Bölüm 4'te yönetilmektedir)
// ==============================
// ==============================
// TAKVİYE DERS NOTLARI
// ==============================

function fillSupportLessonStudents() {
  const select = $("supportLessonStudent");
  if (!select) return;

  select.innerHTML = `<option value="">Talebe Seçin</option>`;

  Object.entries(students || {}).forEach(([id, student]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = student.name || "İsimsiz";
    select.appendChild(option);
  });
}
function fillTestResultStudents() {
  const select = $("testResultStudent");
  if (!select) return;

  select.innerHTML = `<option value="">Talebe Seçin</option>`;

  Object.entries(students || {}).forEach(([id, student]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = student.name || "İsimsiz";
    select.appendChild(option);
  });
}
function fillQuranStudents() {
  const select = $("quranStudent");
  if (!select) return;

  select.innerHTML = `<option value="">Talebe Seçin</option>`;

  Object.entries(students || {}).forEach(([id, student]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = student.name || "İsimsiz";
    select.appendChild(option);
  });
}
function fillAwardStudents() {
  const select = $("awardStudent");
  if (!select) return;

  select.innerHTML = `<option value="">Talebe Seçin</option>`;

  Object.entries(students || {}).forEach(([id, student]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = student.name || "İsimsiz";
    select.appendChild(option);
  });
}
function calculateTestNet() {
  const correct = Number($("testResultCorrect")?.value || 0);
  const wrong = Number($("testResultWrong")?.value || 0);

  const net = correct - (wrong / 4);

  if ($("testResultNet")) {
    $("testResultNet").value = net.toFixed(2);
  }
}

$("testResultCorrect")?.addEventListener("input", calculateTestNet);
$("testResultWrong")?.addEventListener("input", calculateTestNet);
const testResultDateInput = $("testResultDate");

if (testResultDateInput && !testResultDateInput.value) {
  testResultDateInput.value = new Date().toISOString().slice(0, 10);
}
const quranDateInput = $("quranDate");

if (quranDateInput && !quranDateInput.value) {
  quranDateInput.value = new Date().toISOString().slice(0, 10);
}
calculateTestNet();
$("saveTestResultBtn")?.addEventListener("click", async () => {
  const date = $("testResultDate")?.value;
  const studentId = $("testResultStudent")?.value;
  const testName = $("testResultName")?.value.trim();
  const lesson = $("testResultLesson")?.value;

  const correct = Number($("testResultCorrect")?.value || 0);
  const wrong = Number($("testResultWrong")?.value || 0);
  const empty = Number($("testResultEmpty")?.value || 0);
  const net = correct - (wrong / 4);

  if (!date || !studentId || !testName || !lesson) {
    $("testResultMsg").textContent =
      "Lütfen tarih, talebe, test adı ve ders seçin.";
    return;
  }

  const student = students[studentId];

  try {
    const recordId = Date.now().toString();

    await set(
      ref(db, `testResults/${date}/${studentId}/${recordId}`),
      {
        name: student.name || "İsimsiz",
        testName,
        lesson,
        correct,
        wrong,
        empty,
        net
      }
    );

    $("testResultMsg").textContent =
      "✅ Test neticesi kaydedildi.";
    await loadTestResults();
  } catch (error) {
    console.error(error);
    $("testResultMsg").textContent =
      "❌ Test neticesi kaydedilirken hata oluştu.";
  }
});
async function loadSupportLessons() {
  const date = $("supportLessonDate")?.value;
  const list = $("supportLessonList");

  if (!date || !list) return;

  list.innerHTML = "Yükleniyor...";

  try {
    const snapshot = await get(ref(db, `supportLessons/${date}`));
    const data = snapshot.val();

    if (!data) {
      list.innerHTML = "<p>Bu tarihte kayıtlı ders notu yok.</p>";
      return;
    }

    list.innerHTML = "";

    Object.entries(data).forEach(([studentId, lessons]) => {
      Object.entries(lessons).forEach(([lessonType, record]) => {
        const item = document.createElement("div");
        item.className = "listItem";

        item.innerHTML = `
          <strong>${record.name || "İsimsiz"}</strong><br>
          Ders: ${lessonType}<br>
          Not: ${record.note || ""}
        `;
const deleteBtn = document.createElement("button");
deleteBtn.type = "button";
deleteBtn.textContent = "🗑️ Sil";
deleteBtn.className = "danger";

deleteBtn.addEventListener("click", async () => {
  try {
    await set(
      ref(db, `supportLessons/${date}/${studentId}/${lessonType}`),
      null
    );

    await loadSupportLessons();
  } catch (error) {
    console.error(error);
    $("supportLessonMsg").textContent =
      "❌ Ders notu silinirken hata oluştu.";
  }
});

item.appendChild(deleteBtn);
        list.appendChild(item);
      });
    });
  } catch (error) {
    console.error(error);
    list.innerHTML = "<p>❌ Ders notları yüklenemedi.</p>";
  }
  }
$("saveQuranBtn")?.addEventListener("click", async () => {
  const date = $("quranDate")?.value;
  const studentId = $("quranStudent")?.value;
  const juz = Number($("quranJuz")?.value || 0);
  const page = Number($("quranPage")?.value || 0);
  const status = $("quranStatus")?.value;

  if (!date || !studentId || !juz || !page || !status) {
    $("quranMsg").textContent =
      "Lütfen tarih, talebe, cüz, sayfa ve durum bilgilerini doldurun.";
    return;
  }

  const student = students[studentId];

  try {
    const recordId = Date.now().toString();

    await set(
      ref(db, `quranTracking/${date}/${studentId}/${recordId}`),
      {
        name: student.name || "İsimsiz",
        juz,
        page,
        status
      }
    );

    $("quranMsg").textContent =
      "✅ Kur'an kaydı kaydedildi.";
    await loadQuranRecords();
  } catch (error) {
    console.error(error);
    $("quranMsg").textContent =
      "❌ Kur'an kaydı kaydedilirken hata oluştu.";
  }
});
$("saveAwardBtn")?.addEventListener("click", async () => {
  const type = $("awardType")?.value;
  const studentId = $("awardStudent")?.value;
  const note = $("awardNote")?.value.trim();

  if (!type || !studentId || !note) {
    $("awardMsg").textContent =
      "Lütfen ödül türü, talebe ve başarı sebebini doldurun.";
    return;
  }

  const student = students[studentId];

  try {
    const recordId = Date.now().toString();

    await set(
      ref(db, `studentAwards/${type}/${recordId}`),
      {
        studentId,
        name: student.name || "İsimsiz",
        note,
        createdAt: new Date().toISOString()
      }
    );

    $("awardMsg").textContent =
      "✅ Seçim başarıyla kaydedildi.";
    await loadAwards();
  } catch (error) {
    console.error(error);
    $("awardMsg").textContent =
      "❌ Seçim kaydedilirken hata oluştu.";
  }
});
async function loadQuranRecords() {
  const date = $("quranDate")?.value;
  const list = $("quranList");

  if (!date || !list) return;

  list.innerHTML = "Yükleniyor...";

  try {
    const snapshot = await get(ref(db, `quranTracking/${date}`));
    const data = snapshot.val();

    if (!data) {
      list.innerHTML = "<p>Bu tarihte kayıtlı Kur'an kaydı yok.</p>";
      return;
    }

    list.innerHTML = "";

    Object.entries(data).forEach(([studentId, records]) => {
      Object.entries(records).forEach(([recordId, record]) => {
        const item = document.createElement("div");
        item.className = "listItem";

        const statusNames = {
          okundu: "Okundu",
          devam: "Devam Ediyor",
          tamamlandi: "Hatim Tamamlandı"
        };

        item.innerHTML = `
          <strong>${record.name || "İsimsiz"}</strong><br>
          Cüz: ${record.juz || "-"} |
          Sayfa: ${record.page || "-"}<br>
          Durum: ${statusNames[record.status] || record.status || "-"}
        `;
const deleteBtn = document.createElement("button");
deleteBtn.type = "button";
deleteBtn.textContent = "🗑️ Sil";
deleteBtn.className = "danger";

deleteBtn.addEventListener("click", async () => {
  try {
    await set(
      ref(db, `quranTracking/${date}/${studentId}/${recordId}`),
      null
    );

    await loadQuranRecords();
  } catch (error) {
    console.error(error);
    $("quranMsg").textContent =
      "❌ Kur'an kaydı silinirken hata oluştu.";
  }
});

item.appendChild(deleteBtn);
        list.appendChild(item);
      });
    });
  } catch (error) {
    console.error(error);
    list.innerHTML = "<p>❌ Kur'an kayıtları yüklenemedi.</p>";
  }
}
$("quranDate")?.addEventListener("change", () => {
  loadQuranRecords();
});
async function loadAwards() {
  const list = $("awardList");
  if (!list) return;

  list.innerHTML = "Yükleniyor...";

  try {
    const snapshot = await get(ref(db, "studentAwards"));
    const data = snapshot.val();

    if (!data) {
      list.innerHTML = "<p>Henüz seçilen talebe yok.</p>";
      return;
    }

    list.innerHTML = "";

    Object.entries(data).forEach(([type, records]) => {
      Object.entries(records || {}).forEach(([recordId, record]) => {
        const item = document.createElement("div");
        item.className = "listItem";

        const typeName =
          type === "hafta" ? "🏆 Haftanın Talebesi" :
          type === "ay" ? "🏆 Ayın Talebesi" :
          type;

        item.innerHTML = `
          <strong>${record.name || "İsimsiz"}</strong><br>
          ${typeName}<br>
          Açıklama: ${record.note || "-"}
        `;
const deleteBtn = document.createElement("button");
deleteBtn.type = "button";
deleteBtn.textContent = "🗑️ Sil";
deleteBtn.className = "danger";

deleteBtn.addEventListener("click", async () => {
  try {
    await set(
      ref(db, `studentAwards/${type}/${recordId}`),
      null
    );

    await loadAwards();
  } catch (error) {
    console.error(error);
    $("awardMsg").textContent =
      "❌ Seçim silinirken hata oluştu.";
  }
});

item.appendChild(deleteBtn);
        list.appendChild(item);
      });
    });
  } catch (error) {
    console.error(error);
    list.innerHTML = "<p>❌ Seçilen talebeler yüklenemedi.</p>";
  }
}
async function loadTodayAttendanceSummary() {
  const area = $("summaryAttendance");
  if (!area) return;

  const today = new Date().toISOString().slice(0, 10);

  try {
    const snapshot = await get(ref(db, `attendance/${today}`));
    const data = snapshot.val() || {};

    let present = 0;
    let absent = 0;
    let excused = 0;

    Object.values(data).forEach(status => {
      if (status === "present") present++;
      if (status === "absent") absent++;
      if (status === "excused") excused++;
    });

    const total = Object.keys(students || {}).length;

    area.textContent =
      `Toplam: ${total} | Geldi: ${present} | Gelmedi: ${absent} | İzinli: ${excused}`;
  } catch (error) {
    console.error(error);
    area.textContent = "❌ Yoklama özeti yüklenemedi.";
  }
}
async function loadWeeklyAttendanceSummary() {
  const area = $("summaryWeeklyAttendance");
  if (!area) return;

  try {
    const today = new Date();
    const day = today.getDay();

    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));

    let present = 0;
    let absent = 0;
    let excused = 0;

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);

      const dateText = date.toISOString().slice(0, 10);

      const snapshot = await get(
        ref(db, `attendance/${dateText}`)
      );

      const data = snapshot.val() || {};

      Object.values(data).forEach(status => {
        if (status === "present") present++;
        if (status === "absent") absent++;
        if (status === "excused") excused++;
      });
    }

    area.textContent =
      `Haftalık: Geldi: ${present} | Gelmedi: ${absent} | İzinli: ${excused}`;
  } catch (error) {
    console.error(error);
    area.textContent = "❌ Haftalık yoklama yüklenemedi.";
  }
}
async function loadTodayPrayerSummary() {
  const area = $("summaryPrayer");
  if (!area) return;

  const today = new Date().toISOString().slice(0, 10);

  try {
    const snapshot = await get(ref(db, `prayerAttendance/${today}`));
    const data = snapshot.val() || {};

    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    let noCap = 0;

    Object.values(data).forEach(prayerRecords => {
      Object.values(prayerRecords || {}).forEach(record => {
        if (!record || typeof record !== "object") return;

        if (record.durum === "var") present++;
        if (record.durum === "yok") absent++;
        if (record.durum === "gec") late++;
        if (record.durum === "izinli") excused++;
        if (record.takkesiz === true) noCap++;
      });
    });

    area.textContent =
      `Var: ${present} | Yok: ${absent} | Geç: ${late} | İzinli: ${excused} | Takkesiz: ${noCap}`;
  } catch (error) {
    console.error(error);
    area.textContent = "❌ Namaz özeti yüklenemedi.";
  }
}
async function loadWeeklyPrayerSummary() {
  const area = $("summaryWeeklyPrayer");
  if (!area) return;

  try {
    const today = new Date();
    const day = today.getDay();

    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));

    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    let noCap = 0;

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);

      const dateText = date.toISOString().slice(0, 10);

      const snapshot = await get(
        ref(db, `prayerAttendance/${dateText}`)
      );

      const data = snapshot.val() || {};

      Object.values(data).forEach(prayerRecords => {
        Object.values(prayerRecords || {}).forEach(record => {
          if (!record || typeof record !== "object") return;

          if (record.durum === "var") present++;
          if (record.durum === "yok") absent++;
          if (record.durum === "gec") late++;
          if (record.durum === "izinli") excused++;
          if (record.takkesiz === true) noCap++;
        });
      });
    }

    area.textContent =
      `Haftalık: Var: ${present} | Yok: ${absent} | Geç: ${late} | İzinli: ${excused} | Takkesiz: ${noCap}`;
  } catch (error) {
    console.error(error);
    area.textContent = "❌ Haftalık namaz özeti yüklenemedi.";
  }
}
async function loadTodayBedSummary() {
  const area = $("summaryBed");
  if (!area) return;

  const today = new Date().toISOString().slice(0, 10);

  try {
    const snapshot = await get(ref(db, `bedAttendance/${today}`));
    const data = snapshot.val() || {};

    let present = 0;
    let absent = 0;
    let excused = 0;

    Object.values(data).forEach(status => {
      if (status === "present") present++;
      if (status === "absent") absent++;
      if (status === "excused") excused++;
    });

    area.textContent =
      `Yatağında: ${present} | Yatağında Değil: ${absent} | İzinli: ${excused}`;
  } catch (error) {
    console.error(error);
    area.textContent = "❌ Yatak özeti yüklenemedi.";
  }
}
async function loadWeeklyBedSummary() {
  const area = $("summaryWeeklyBed");
  if (!area) return;

  try {
    const today = new Date();
    const day = today.getDay();

    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));

    let present = 0;
    let absent = 0;
    let excused = 0;

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);

      const dateText = date.toISOString().slice(0, 10);

      const snapshot = await get(
        ref(db, `bedAttendance/${dateText}`)
      );

      const data = snapshot.val() || {};

      Object.values(data).forEach(status => {
        if (status === "present") present++;
        if (status === "absent") absent++;
        if (status === "excused") excused++;
      });
    }

    area.textContent =
      `Haftalık: Yatağında: ${present} | Yatağında Değil: ${absent} | İzinli: ${excused}`;
  } catch (error) {
    console.error(error);
    area.textContent = "❌ Haftalık yatak özeti yüklenemedi.";
  }
}
async function loadTodaySchoolReturnSummary() {
  const area = $("summarySchoolReturn");
  if (!area) return;

  const today = new Date().toISOString().slice(0, 10);

  try {
    const snapshot = await get(
      ref(db, `schoolReturnAttendance/${today}`)
    );
    const data = snapshot.val() || {};

    let present = 0;
    let absent = 0;
    let excused = 0;

    Object.values(data).forEach(status => {
      if (status === "present") present++;
      if (status === "absent") absent++;
      if (status === "excused") excused++;
    });

    area.textContent =
      `Geldi: ${present} | Gelmedi: ${absent} | İzinli: ${excused}`;
  } catch (error) {
    console.error(error);
    area.textContent = "❌ Okul dönüşü özeti yüklenemedi.";
  }
}
async function loadWeeklySchoolReturnSummary() {
  const area = $("summaryWeeklySchoolReturn");
  if (!area) return;

  try {
    const today = new Date();
    const day = today.getDay();

    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));

    let present = 0;
    let absent = 0;
    let excused = 0;

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);

      const dateText = date.toISOString().slice(0, 10);

      const snapshot = await get(
        ref(db, `schoolReturnAttendance/${dateText}`)
      );

      const data = snapshot.val() || {};

      Object.values(data).forEach(status => {
        if (status === "present") present++;
        if (status === "absent") absent++;
        if (status === "excused") excused++;
      });
    }

    area.textContent =
      `Haftalık: Geldi: ${present} | Gelmedi: ${absent} | İzinli: ${excused}`;
  } catch (error) {
    console.error(error);
    area.textContent =
      "❌ Haftalık okul dönüşü özeti yüklenemedi.";
  }
}
async function loadTodayLeaveSummary() {
  const area = $("summaryLeave");
  if (!area) return;

  try {
    const snapshot = await get(ref(db, "leaves"));
    const data = snapshot.val() || {};

    let outside = 0;

    Object.values(data).forEach(record => {
      if (record && record.returned === false) {
        outside++;
      }
    });

    area.textContent = `Şu an dışarıda: ${outside}`;
  } catch (error) {
    console.error(error);
    area.textContent = "❌ İzin özeti yüklenemedi.";
  }
}
async function loadWeeklyLeaveSummary() {
  const area = $("summaryWeeklyLeave");
  if (!area) return;

  try {
    const snapshot = await get(ref(db, "leaves"));
    const data = snapshot.val() || {};

    const today = new Date();
    const day = today.getDay();

    const monday = new Date(today);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));

    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);

    let total = 0;

    Object.values(data).forEach(record => {
      if (!record?.start) return;

      const startDate = new Date(record.start);

      if (startDate >= monday && startDate < nextMonday) {
        total++;
      }
    });

    area.textContent = `Haftalık: Bu hafta izin kaydı: ${total}`;
  } catch (error) {
    console.error(error);
    area.textContent = "❌ Haftalık izin özeti yüklenemedi.";
  }
}
async function loadTodayDutySummary() {
  const area = $("summaryDuty");
  if (!area) return;

  const today = getTodayDateStr();

  try {
    const snapshot = await get(ref(db, `dailyDuties/${today}`));
    const list = parseDuties(snapshot.val());
    area.textContent = `Bugünkü görevli: ${list.length}`;
  } catch (error) {
    console.error(error);
    area.textContent = "❌ Görevli özeti yüklenemedi.";
  }
}
async function loadWeeklyDutySummary() {
  const area = $("summaryWeeklyDuty");
  if (!area) return;

  try {
    const today = new Date();
    const day = today.getDay();

    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));

    let total = 0;

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);

      const dateText = getLocalDateStr(date);

      const snapshot = await get(
        ref(db, `dailyDuties/${dateText}`)
      );
      total += parseDuties(snapshot.val()).length;
    }

    area.textContent = `Haftalık: Toplam görevli: ${total}`;
  } catch (error) {
    console.error(error);
    area.textContent = "❌ Haftalık görevli özeti yüklenemedi.";
  }
}
async function loadTestResults() {
  const date = $("testResultDate")?.value;
  const list = $("testResultList");

  if (!date || !list) return;

  list.innerHTML = "Yükleniyor...";

  try {
    const snapshot = await get(ref(db, `testResults/${date}`));
    const data = snapshot.val();

    if (!data) {
      list.innerHTML = "<p>Bu tarihte kayıtlı test neticesi yok.</p>";
      return;
    }

    list.innerHTML = "";

    Object.entries(data).forEach(([studentId, records]) => {
      Object.entries(records).forEach(([recordId, record]) => {
        const item = document.createElement("div");
        item.className = "listItem";

        item.innerHTML = `
          <strong>${record.name || "İsimsiz"}</strong><br>
          Test: ${record.testName || ""}<br>
          Ders: ${record.lesson || ""}<br>
          Doğru: ${record.correct ?? 0} |
          Yanlış: ${record.wrong ?? 0} |
          Boş: ${record.empty ?? 0} |
          Net: ${Number(record.net || 0).toFixed(2)}
        `;
const deleteBtn = document.createElement("button");
deleteBtn.type = "button";
deleteBtn.textContent = "🗑️ Sil";
deleteBtn.className = "danger";

deleteBtn.addEventListener("click", async () => {
  try {
    await set(
      ref(db, `testResults/${date}/${studentId}/${recordId}`),
      null
    );

    await loadTestResults();
  } catch (error) {
    console.error(error);
    $("testResultMsg").textContent =
      "❌ Test neticesi silinirken hata oluştu.";
  }
});

item.appendChild(deleteBtn);
        list.appendChild(item);
      });
    });
  } catch (error) {
    console.error(error);
    list.innerHTML = "<p>❌ Test neticeleri yüklenemedi.</p>";
  }
}
$("testResultDate")?.addEventListener("change", () => {
  loadTestResults();
});
$("supportLessonDate")?.addEventListener("change", () => {
  loadSupportLessons();
});
loadDailyDuties();

// ==============================
// NAMAZ RAPORLARI
// ==============================
// ==============================
// NAMAZ RAPORLARI
// ==============================

const prayerReportDateInput = $("prayerReportDate");

if (prayerReportDateInput && !prayerReportDateInput.value) {
  prayerReportDateInput.value = new Date().toISOString().slice(0, 10);
}
$("showPrayerReportBtn")?.addEventListener("click", async () => {
  const date = $("prayerReportDate")?.value;

  if (!date) {
    $("prayerReportMsg").textContent = "Lütfen tarih seçin.";
    return;
  }

  $("prayerReportMsg").textContent = "Rapor hazırlanıyor...";

  try {
    const snap = await get(
      ref(db, `prayerAttendance/${date}`)
    );

    const reportData = snap.val() || {};

    console.log("Namaz raporu:", reportData);
const reportArea = $("prayerReportArea");
reportArea.innerHTML = "";
    const table = document.createElement("table");

table.innerHTML = `
  <thead>
    <tr>
      <th>Talebe</th>
      <th>Sabah</th>
      <th>Öğle</th>
      <th>İkindi</th>
      <th>Akşam</th>
      <th>Yatsı</th>
    </tr>
  </thead>
  <tbody id="prayerReportBody"></tbody>
`;

reportArea.appendChild(table);
    const reportBody = table.querySelector("tbody");

const prayerNames = ["sabah", "ogle", "ikindi", "aksam", "yatsi"];

Object.entries(students || {}).forEach(([studentId, student]) => {
  const row = document.createElement("tr");

  let cells = `<td><strong>${student.name || "İsimsiz"}</strong></td>`;

  prayerNames.forEach(prayer => {
    const saved = reportData[prayer]?.[studentId];

    let text = "-";

    if (saved && typeof saved === "object") {
      const names = {
        var: "Var",
        yok: "Yok",
        gec: "Geç",
        izinli: "İzinli"
      };

      text = names[saved.durum] || "-";

      if (saved.takkesiz === true) {
        text += " / Takkesiz";
      }
    }

    cells += `<td>${text}</td>`;
  });

  row.innerHTML = cells;
  reportBody.appendChild(row);
});
    $("prayerReportMsg").textContent = "✅ Rapor verileri alındı.";
  } catch (error) {
    console.error(error);
    $("prayerReportMsg").textContent = "❌ Rapor alınırken hata oluştu.";
  }
});

/* ========================================================
   SOL KAYAR PENCERE MENÜSÜ (DRAWER) KONTROLLERİ
   ======================================================== */
function openDrawer() {
  $("sideDrawer")?.classList.add("open");
  const bd = $("drawerBackdrop");
  if (bd) {
    bd.classList.remove("hidden");
    bd.classList.add("open");
  }
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  $("sideDrawer")?.classList.remove("open");
  const bd = $("drawerBackdrop");
  if (bd) {
    bd.classList.remove("open");
    bd.classList.add("hidden");
  }
  document.body.style.overflow = "";
}

// Menü açma / kapama butonları
$("menuToggleBtn")?.addEventListener("click", openDrawer);
$("floatingMenuBtn")?.addEventListener("click", openDrawer);
$("closeDrawerBtn")?.addEventListener("click", closeDrawer);
$("drawerBackdrop")?.addEventListener("click", closeDrawer);

// Menü içindeki Güvenli Çıkış butonu
$("drawerLogoutBtn")?.addEventListener("click", () => {
  closeDrawer();
  handleLogout();
});

// Menü bağlantılarına tıklandığında ilgili karta yumuşakça kaydırma
document.querySelectorAll(".drawerCardItem[href^='#'], .drawerItem[href^='#']").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    const targetId = link.getAttribute("href");
    closeDrawer();
    const targetEl = document.querySelector(targetId);
    if (targetEl) {
      setTimeout(() => {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        targetEl.classList.add("cardHighlight");
        setTimeout(() => targetEl.classList.remove("cardHighlight"), 2000);
      }, 200);
    }
  });
});

/* ========================================================
   1. ÖĞRENCİ YÖNETİMİ & VELİ ŞİFRELERİ (RESİM 2 TASARIMI)
   ======================================================== */
function generateFamilyCode(name = "") {
  const parts = String(name).trim().split(/\s+/);
  const surname = parts.length > 1 ? parts[parts.length - 1] : parts[0] || "TALEBE";
  return surname.toLocaleUpperCase("tr-TR").replace(/[^A-ZÇĞİÖŞÜ0-9]/g, "") + "2026";
}

function renderStudentTable() {
  const tableBody = $("studentTableBody");
  if (!tableBody) return;

  const searchQuery = ($("studentSearch")?.value || "").trim().toLocaleLowerCase("tr-TR");
  const selectedClass = $("classFilter")?.value || "";
  const sortMode = $("studentSort")?.value || "noAsc";

  // Sınıf filtre listesini güncelle
  const classSelect = $("classFilter");
  if (classSelect) {
    const existingClasses = new Set();
    Object.values(students || {}).forEach(s => {
      if (s.className && String(s.className).trim()) existingClasses.add(String(s.className).trim());
    });
    const currentVal = classSelect.value;
    const sortedClasses = Array.from(existingClasses).sort((a,b) => a.localeCompare(b, "tr"));
    classSelect.innerHTML = '<option value="">Tüm Sınıflar</option>' +
      sortedClasses.map(c => `<option value="${esc(c)}" ${c === currentVal ? "selected" : ""}>${esc(c)}</option>`).join("");
  }

  let entries = Object.entries(students || {}).map(([id, s]) => {
    return {
      id,
      ...s,
      studentNo: String(s.studentNo || "").trim(),
      name: String(s.name || "").trim(),
      className: String(s.className || "").trim(),
      teacherName: String(s.teacherName || "YASİN EKİNCİ").trim(),
      roomNo: String(s.roomNo || (s.dormNo ? ("Oda " + s.dormNo) : "Oda 101")).trim(),
      studentPass: String(s.studentPass || "123").trim(),
      familyCode: String(s.familyCode || generateFamilyCode(s.name)).trim(),
      parentPhone: String(s.parentPhone || "-").trim(),
      parentName: String(s.parentName || "-").trim(),
      notes: String(s.notes || "").trim()
    };
  });

  // Filtreleme
  entries = entries.filter(s => {
    if (selectedClass && s.className !== selectedClass) return false;
    if (searchQuery) {
      const haystack = [s.studentNo, s.name, s.className, s.teacherName, s.roomNo, s.familyCode, s.parentPhone]
        .join(" ").toLocaleLowerCase("tr-TR");
      if (!haystack.includes(searchQuery)) return false;
    }
    return true;
  });

  // Sıralama
  entries.sort((a, b) => {
    if (sortMode === "noAsc") return (parseInt(a.studentNo) || 0) - (parseInt(b.studentNo) || 0);
    if (sortMode === "noDesc") return (parseInt(b.studentNo) || 0) - (parseInt(a.studentNo) || 0);
    if (sortMode === "nameAsc") return a.name.localeCompare(b.name, "tr");
    if (sortMode === "roomAsc") return a.roomNo.localeCompare(b.roomNo, "tr");
    return 0;
  });

  if ($("studentCountBadge")) {
    $("studentCountBadge").textContent = `Listelenen: ${entries.length} Talebe`;
  }

  if (!entries.length) {
    tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 26px; color: #94a3b8; font-weight:600;">Eşleşen talebe kaydı bulunamadı.</td></tr>`;
    return;
  }

  tableBody.innerHTML = entries.map(s => `
    <tr>
      <td><strong>${esc(s.studentNo)}</strong></td>
      <td><strong>${esc(s.name)}</strong></td>
      <td><span class="classBadge">${esc(s.className || '-')}</span></td>
      <td><span class="teacherBadge">👨‍🏫 ${esc(s.teacherName)}</span></td>
      <td><span class="roomBadge">${esc(s.roomNo)}</span></td>
      <td><span class="passBadge">${esc(s.studentPass)}</span></td>
      <td><span class="familyCodeBadge">${esc(s.familyCode)}</span></td>
      <td>${esc(s.parentPhone)}</td>
      <td style="text-align: center;">
        <button type="button" class="actionBtn" title="Düzenle" data-edit-student="${s.id}">✏️</button>
        <button type="button" class="actionBtn" title="Sil" data-delete-student="${s.id}">🗑️</button>
      </td>
    </tr>
  `).join("");

  tableBody.querySelectorAll("[data-edit-student]").forEach(btn => {
    btn.onclick = () => openStudentEditModal(btn.dataset.editStudent);
  });
  tableBody.querySelectorAll("[data-delete-student]").forEach(btn => {
    btn.onclick = async () => {
      const s = students[btn.dataset.deleteStudent];
      if (confirm(`"${s?.name || 'Bu talebe'}" kaydını silmek istediğinize emin misiniz?`)) {
        await remove(ref(db, "students/" + btn.dataset.deleteStudent));
      }
    };
  });
}

// Filtre ve Sıralama Olayları
$("studentSearch")?.addEventListener("input", renderStudentTable);
$("classFilter")?.addEventListener("change", renderStudentTable);
$("studentSort")?.addEventListener("change", renderStudentTable);

// Öğrenci Ekle / Düzenle Modal Kontrolleri
function openStudentEditModal(id = null) {
  currentStudentEditingId = id;
  const modal = $("studentEditModal");
  if (!modal) return;

  if (id && students[id]) {
    const s = students[id];
    $("modalStudentTitle").textContent = "✏️ Talebe Bilgilerini Düzenle";
    $("modalName").value = s.name || "";
    $("modalStudentNo").value = s.studentNo || "";
    $("modalClassName").value = s.className || "";
    $("modalTeacherName").value = s.teacherName || "YASİN EKİNCİ";
    $("modalDormNo").value = s.roomNo || (s.dormNo ? ("Oda " + s.dormNo) : "Oda 101");
    $("modalStudentPass").value = s.studentPass || "123";
    $("modalFamilyCode").value = s.familyCode || generateFamilyCode(s.name);
    $("modalParentName").value = s.parentName || "";
    $("modalParentPhone").value = s.parentPhone || "";
    $("modalNotes").value = s.notes || "";
  } else {
    $("modalStudentTitle").textContent = "➕ Yeni Öğrenci Ekle";
    $("modalStudentForm").reset();
    $("modalTeacherName").value = "YASİN EKİNCİ";
    $("modalDormNo").value = "Oda 101";
    $("modalStudentPass").value = "123";
  }
  modal.classList.remove("hidden");
}

function closeStudentEditModal() {
  $("studentEditModal")?.classList.add("hidden");
  currentStudentEditingId = null;
}

$("openAddStudentBtn")?.addEventListener("click", () => openStudentEditModal(null));
$("closeStudentModalBtn")?.addEventListener("click", closeStudentEditModal);
$("modalCancelStudentBtn")?.addEventListener("click", closeStudentEditModal);

$("modalStudentForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const name = $("modalName").value.trim();
  const studentNo = $("modalStudentNo").value.trim();
  const className = $("modalClassName").value.trim();
  const teacherName = $("modalTeacherName").value.trim() || "YASİN EKİNCİ";
  const roomNo = $("modalDormNo").value.trim() || "Oda 101";
  const studentPass = $("modalStudentPass").value.trim() || "123";
  const familyCode = $("modalFamilyCode").value.trim() || generateFamilyCode(name);
  const parentName = $("modalParentName").value.trim();
  const parentPhone = $("modalParentPhone").value.trim();
  const notes = $("modalNotes").value.trim();

  const data = {
    name, studentNo, className, teacherName, roomNo, dormNo: roomNo.replace(/[^0-9]/g, ""),
    studentPass, familyCode, parentName, parentPhone, notes
  };

  try {
    if (currentStudentEditingId) {
      await update(ref(db, "students/" + currentStudentEditingId), data);
    } else {
      await set(push(ref(db, "students")), data);
    }
    closeStudentEditModal();
  } catch (err) {
    console.error(err);
    alert("Kaydedilirken hata oluştu: " + err.message);
  }
});

// CSV Dışa Aktarma
function exportStudentsCSV() {
  let csv = "\uFEFFNo;Giriş Yapılacak İsim;Sınıf;Hoca;Oda;Şifre;Aile Kodu;Veli Adı;Veli Tel;Notlar\r\n";
  Object.values(students || {}).forEach(s => {
    const row = [
      s.studentNo || "",
      s.name || "",
      s.className || "",
      s.teacherName || "YASİN EKİNCİ",
      s.roomNo || (s.dormNo ? ("Oda " + s.dormNo) : "Oda 101"),
      s.studentPass || "123",
      s.familyCode || generateFamilyCode(s.name),
      s.parentName || "",
      s.parentPhone || "",
      s.notes || ""
    ].map(val => `"${String(val).replace(/"/g, '""')}"`);
    csv += row.join(";") + "\r\n";
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `talebe_listesi_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

$("exportCsvBtn")?.addEventListener("click", exportStudentsCSV);
$("btnDownloadCsv")?.addEventListener("click", exportStudentsCSV);

// JSON Tam Sistem Yedeği İndirme
async function exportFullJSON() {
  try {
    const snap = await get(ref(db));
    const fullData = snap.val() || {};
    const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `irfaniye_tam_sistem_yedek_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  } catch (err) {
    console.error(err);
    alert("Yedek indirilirken hata oluştu: " + err.message);
  }
}

$("exportJsonBtn")?.addEventListener("click", exportFullJSON);
$("btnDownloadFullJson")?.addEventListener("click", exportFullJSON);

// JSON Yedekten Geri Yükleme
function triggerJSONUpload() {
  const input = $("jsonFileInput");
  if (!input) return;
  input.value = "";
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    if (!confirm("⚠️ DİKKAT: Yüklediğiniz JSON yedek dosyası mevcut veritabanını güncelleyecektir. Devam edilsin mi?")) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await update(ref(db), parsed);
      alert("✅ Yedek başarıyla geri yüklendi!");
      window.location.reload();
    } catch (e) {
      alert("❌ Geçersiz JSON dosyası: " + e.message);
    }
  };
  input.click();
}

$("importJsonBtn")?.addEventListener("click", triggerJSONUpload);
$("restoreBackupBtn")?.addEventListener("click", triggerJSONUpload);
$("btnUploadFullJson")?.addEventListener("click", triggerJSONUpload);

$("bulkAddBtn")?.addEventListener("click", () => {
  const el = $("excelCard");
  if (el) el.scrollIntoView({ behavior: "smooth" });
});
$("excelModeBtn")?.addEventListener("click", () => {
  const el = $("excelCard");
  if (el) el.scrollIntoView({ behavior: "smooth" });
});

/* ========================================================
   2. PERSONEL & ŞİFRE YÖNETİMİ
   ======================================================== */
function renderStaffTable() {
  const tableBody = $("staffTableBody");
  if (!tableBody) return;

  const entries = Object.entries(staff || {});
  if (!entries.length) {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 22px; color:#94a3b8; font-weight:600;">Henüz kayıtlı personel/hoca yok. "Yeni Personel Ekle" butonuna basarak ekleyebilirsiniz.</td></tr>`;
    return;
  }

  tableBody.innerHTML = entries.map(([id, st], index) => `
    <tr>
      <td>${index + 1}</td>
      <td><strong>👨‍🏫 ${esc(st.name || '')}</strong></td>
      <td><span class="classBadge">${esc(st.role || 'Hoca')}</span></td>
      <td>${esc(st.phone || '-')}</td>
      <td>${esc(st.email || '-')}</td>
      <td><span class="passBadge">${esc(st.password || '123')}</span></td>
      <td><span class="classBadge">${esc(st.access || 'Hoca')}</span></td>
      <td style="text-align: center;">
        <button type="button" class="actionBtn" title="Düzenle" data-edit-staff="${id}">✏️</button>
        <button type="button" class="actionBtn" title="Sil" data-delete-staff="${id}">🗑️</button>
      </td>
    </tr>
  `).join("");

  tableBody.querySelectorAll("[data-edit-staff]").forEach(b => {
    b.onclick = () => openStaffEditModal(b.dataset.editStaff);
  });
  tableBody.querySelectorAll("[data-delete-staff]").forEach(b => {
    b.onclick = async () => {
      const st = staff[b.dataset.deleteStaff];
      if (confirm(`"${st?.name || 'Bu personeli'}" silmek istediğinize emin misiniz?`)) {
        await remove(ref(db, "staff/" + b.dataset.deleteStaff));
      }
    };
  });
}

function openStaffEditModal(id = null) {
  currentStaffEditingId = id;
  const modal = $("staffEditModal");
  if (!modal) return;
  if (id && staff[id]) {
    const st = staff[id];
    $("modalStaffTitle").textContent = "✏️ Personel Düzenle";
    $("modalStaffName").value = st.name || "";
    $("modalStaffRole").value = st.role || "";
    $("modalStaffPhone").value = st.phone || "";
    $("modalStaffEmail").value = st.email || "";
    $("modalStaffPass").value = st.password || "";
    $("modalStaffAccess").value = st.access || "hoca";
  } else {
    $("modalStaffTitle").textContent = "👨‍🏫 Personel / Hoca Ekle";
    $("modalStaffForm").reset();
    $("modalStaffPass").value = "123456";
  }
  modal.classList.remove("hidden");
}

function closeStaffEditModal() {
  $("staffEditModal")?.classList.add("hidden");
  currentStaffEditingId = null;
}

$("openAddStaffBtn")?.addEventListener("click", () => openStaffEditModal(null));
$("closeStaffModalBtn")?.addEventListener("click", closeStaffEditModal);
$("cancelStaffBtn")?.addEventListener("click", closeStaffEditModal);

$("modalStaffForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const data = {
    name: $("modalStaffName").value.trim(),
    role: $("modalStaffRole").value.trim(),
    phone: $("modalStaffPhone").value.trim(),
    email: $("modalStaffEmail").value.trim(),
    password: $("modalStaffPass").value.trim(),
    access: $("modalStaffAccess").value
  };

  try {
    if (currentStaffEditingId) {
      await update(ref(db, "staff/" + currentStaffEditingId), data);
    } else {
      await set(push(ref(db, "staff")), data);
    }
    closeStaffEditModal();
  } catch (err) {
    console.error(err);
    alert("Personel kaydedilirken hata oluştu: " + err.message);
  }
});

/* ========================================================
   3. SİSTEM AYARLARI & E-POSTA
   ======================================================== */
function applySystemSettings() {
  const adminName = systemSettings.adminName || "ÖMER AVNİYEL";
  const adminRole = systemSettings.adminRole || "Kurum Yöneticisi";
  const instName = systemSettings.institutionName || "Ömer Avniyel Akademi";

  if ($("drawerAdminName")) $("drawerAdminName").textContent = adminName;
  if ($("drawerAdminRole")) $("drawerAdminRole").textContent = adminRole;
  if ($("headerManagerBadge")) $("headerManagerBadge").innerHTML = `👑 ${adminRole}`;
  if ($("tvInstitutionTitle")) $("tvInstitutionTitle").textContent = `${instName.toUpperCase()} - CANLI DİJİTAL PANO`;

  if ($("settingInstitutionName")) $("settingInstitutionName").value = instName;
  if ($("settingAdminName")) $("settingAdminName").value = adminName;
  if ($("settingAdminRole")) $("settingAdminRole").value = adminRole;
  if ($("settingAdminEmail")) $("settingAdminEmail").value = systemSettings.adminEmail || "";
  if ($("settingNotifyEmail")) $("settingNotifyEmail").value = systemSettings.notifyEmail || "";
}

$("systemSettingsForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const settings = {
    institutionName: $("settingInstitutionName").value.trim(),
    adminName: $("settingAdminName").value.trim(),
    adminRole: $("settingAdminRole").value.trim(),
    adminEmail: $("settingAdminEmail").value.trim(),
    notifyEmail: $("settingNotifyEmail").value.trim()
  };

  try {
    await set(ref(db, "systemSettings"), settings);
    if ($("settingsMsg")) {
      $("settingsMsg").textContent = "✅ Ayarlar kaydedildi.";
      $("settingsMsg").style.color = "#059669";
      setTimeout(() => $("settingsMsg").textContent = "", 3000);
    }
  } catch (err) {
    console.error(err);
    if ($("settingsMsg")) {
      $("settingsMsg").textContent = "❌ Hata: " + err.message;
      $("settingsMsg").style.color = "#dc2626";
    }
  }
});

/* ========================================================
   4. GÜNÜN GÖREVLİLERİ YÖNETİMİ (YEMEKÇİLER, MÜEZZİN, DUYURU & TV ENTEGRASYONU)
   ======================================================== */
const dutyTitles = {
  yemekhane: "🍲 Yemekhane Nöbetçisi",
  muezzin: "🕌 Müezzin",
  temizlik: "🧹 Temizlik & Kat Nöbetçisi",
  bulasik: "🍽️ Bulaşıkhane",
  cay: "☕ Çay Ocağı",
  nobet: "🛡️ Gece / Yurt Nöbeti"
};

// Evrensel görev ayrıştırma fonksiyonu:
// Hem yeni formatı (cooks[], muezzin{}, announcement)
// hem de eski düz push veya hiyerarşik yapıları destekler
function parseDuties(dutiesObj) {
  if (!dutiesObj || typeof dutiesObj !== "object") return [];
  const list = [];

  // Yeni yapı: Günün yemekçileri dizisi
  if (Array.isArray(dutiesObj.cooks)) {
    dutiesObj.cooks.forEach((c, idx) => {
      if (!c) return;
      const cName = typeof c === "string" ? c : (c.name || "Aşçı");
      const cClass = typeof c === "object" && c.className ? ` (${c.className})` : "";
      list.push({
        id: "cook_" + idx,
        dutyType: "yemekhane",
        personName: cName + cClass,
        personId: typeof c === "object" ? (c.id || "") : "",
        note: "Mutfak / Sofra Görevlisi",
        createdAt: dutiesObj.updatedAt || ""
      });
    });
  }

  // Yeni yapı: Günün müezzini
  if (dutiesObj.muezzin) {
    const m = dutiesObj.muezzin;
    const mName = typeof m === "string" ? m : (m.name || "Müezzin");
    const mClass = typeof m === "object" && m.className ? ` (${m.className})` : "";
    list.push({
      id: "muezzin",
      dutyType: "muezzin",
      personName: mName + mClass,
      personId: typeof m === "object" ? (m.id || "") : "",
      note: "5 Vakit Ezan & Cemaat",
      createdAt: dutiesObj.updatedAt || ""
    });
  }

  for (const [key, val] of Object.entries(dutiesObj)) {
    if (!val) continue;
    if (key === "cooks" || key === "muezzin" || key === "announcement" || key === "updatedAt" || key === "updatedBy") {
      continue;
    }

    // Durum 1: Doğrudan metin değeri
    if (typeof val === "string") {
      list.push({
        id: key,
        dutyType: key,
        personName: val,
        personId: "",
        note: "",
        createdAt: ""
      });
      continue;
    }

    if (typeof val !== "object") continue;

    // Durum 2: Düz push nesnesi
    if (val.dutyType && (val.personName || val.name)) {
      list.push({
        id: key,
        dutyType: val.dutyType,
        personName: val.personName || val.name || "İsimsiz",
        personId: val.personId || "",
        note: val.note || "",
        createdAt: val.createdAt || ""
      });
      continue;
    }

    // Durum 3: Hiyerarşik yapı
    const possibleDutyType = key;
    for (const [subKey, subVal] of Object.entries(val)) {
      if (!subVal) continue;
      if (typeof subVal === "string") {
        list.push({
          id: `${key}/${subKey}`,
          dutyType: possibleDutyType,
          personName: subVal,
          personId: subKey,
          note: "",
          createdAt: ""
        });
      } else if (typeof subVal === "object") {
        list.push({
          id: `${key}/${subKey}`,
          dutyType: subVal.dutyType || possibleDutyType,
          personName: subVal.personName || subVal.name || "İsimsiz",
          personId: subVal.personId || subKey,
          note: subVal.note || "",
          createdAt: subVal.createdAt || ""
        });
      }
    }
  }

  return list;
}

// Talebe seçim kutularını doldurma
function fillDailyDutyStudents() {
  const cookSelect = $("cookStudentSelect");
  const muezzinSelect = $("muezzinStudentSelect");
  const legacySelect = $("dailyDutyStudent");

  let optionsHtml = '';
  optionsHtml += '<optgroup label="👨‍🎓 Talebeler">';
  Object.entries(students || {})
    .sort((a, b) => (a[1].name || '').localeCompare(b[1].name || '', 'tr'))
    .forEach(([id, s]) => {
      const cls = s.className ? ` (${s.className})` : '';
      const no = s.studentNo ? ` • No: ${s.studentNo}` : '';
      optionsHtml += `<option value="student_${id}">${esc(s.name || 'İsimsiz')}${esc(cls)}${esc(no)}</option>`;
    });
  optionsHtml += '</optgroup>';

  if (Object.keys(staff || {}).length) {
    optionsHtml += '<optgroup label="👨‍🏫 Hocalar / Personel">';
    Object.entries(staff || {})
      .sort((a, b) => (a[1].name || '').localeCompare(b[1].name || '', 'tr'))
      .forEach(([id, st]) => {
        optionsHtml += `<option value="staff_${id}">👨‍🏫 ${esc(st.name || '')} (${esc(st.role || 'Hoca')})</option>`;
      });
    optionsHtml += '</optgroup>';
  }

  if (cookSelect) {
    cookSelect.innerHTML = '<option value="">-- Talebe Seçiniz --</option>' + optionsHtml;
  }
  if (muezzinSelect) {
    muezzinSelect.innerHTML = '<option value="">-- MÜEZZİN TALEBEYİ SEÇİNİZ --</option>' + optionsHtml;
  }
  if (legacySelect) {
    legacySelect.innerHTML = '<option value="">Seçin</option>' + optionsHtml;
  }
}

// Görevli Hafıza Durumu (Admin State)
let currentCooks = [];
let currentMuezzin = null;
let currentAnnouncement = "";
let currentDailyDutyUnsub = null;

// Seçimden kişi nesnesi elde etme
function getStudentObjectFromVal(val, selectEl) {
  if (!val) return null;
  let name = "";
  let className = "";

  if (val.startsWith("student_")) {
    const sId = val.replace("student_", "");
    const s = students[sId];
    if (s) {
      name = s.name || "";
      className = s.className || "";
    }
  } else if (val.startsWith("staff_")) {
    const stId = val.replace("staff_", "");
    const st = staff[stId];
    if (st) {
      name = st.name || "";
      className = st.role || "Hoca";
    }
  } else if (students[val]) {
    name = students[val].name || "";
    className = students[val].className || "";
  } else if (staff[val]) {
    name = staff[val].name || "";
    className = staff[val].role || "Hoca";
  }

  if (!name && selectEl && selectEl.selectedOptions?.[0]) {
    const optText = selectEl.selectedOptions[0].textContent || "";
    const cleanText = optText.replace(/^👨‍🏫\s*/, "").trim();
    const match = cleanText.match(/^(.*?)\s*\((.*?)\)/);
    if (match) {
      name = match[1].trim();
      className = match[2].trim();
    } else {
      name = cleanText;
    }
  }

  if (!name) return null;
  return { id: val, name: name.toUpperCase(), className };
}

// 1. Günün Yemekçileri Arayüzünü Çizme
function renderCooksUI() {
  const container = $("cookDutyList");
  const countBadge = $("cookCountBadge");
  const listCountBadge = $("cookListCountBadge");

  if (countBadge) countBadge.textContent = currentCooks.length;
  if (listCountBadge) listCountBadge.textContent = currentCooks.length;
  if (!container) return;

  if (!currentCooks.length) {
    container.innerHTML = '<div class="dutyEmptyNote">Henüz yemekçi atanmadı. Yukarıdan talebe ekleyebilirsiniz.</div>';
    return;
  }

  container.innerHTML = currentCooks.map((c, i) => `
    <div class="cookBadgeItem">
      <div class="cookBadgeLeft">
        <span class="cookBadgeIndex">${i + 1}</span>
        <div>
          <span class="cookBadgeName">${esc(c.name)}</span>
          ${c.className ? `<span class="cookBadgeClass">(${esc(c.className)})</span>` : ''}
        </div>
      </div>
      <button type="button" class="dutyRemoveBtn" data-remove-cook="${i}" title="Görevi Kaldır">✕</button>
    </div>
  `).join("");

  container.querySelectorAll("[data-remove-cook]").forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const idx = parseInt(btn.dataset.removeCook, 10);
      currentCooks.splice(idx, 1);
      renderCooksUI();
    };
  });
}

// 2. Günün Müezzini Arayüzünü Çizme
function renderMuezzinUI() {
  const area = $("muezzinCardArea");
  if (!area) return;

  if (!currentMuezzin || !currentMuezzin.name) {
    area.innerHTML = '<div class="muezzinEmptyCard">Henüz müezzin atanmadı. Yukarıdan seçebilir veya isim yazabilirsiniz.</div>';
    return;
  }

  area.innerHTML = `
    <div class="muezzinActiveCard">
      <div class="muezzinIcon">🕌</div>
      <div class="muezzinTag">GÜNÜN MÜEZZİNİ</div>
      <div class="muezzinName">${esc(currentMuezzin.name)} ${currentMuezzin.className ? `(${esc(currentMuezzin.className)})` : ''}</div>
      <div class="muezzinPill">5 Vakit Ezan & Cemaat Görevi Atandı</div>
      <div style="margin-top: 10px;">
        <button type="button" id="removeMuezzinBtn" class="linkDangerBtn">Görevi Kaldır</button>
      </div>
    </div>
  `;

  const remBtn = $("removeMuezzinBtn");
  if (remBtn) {
    remBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      currentMuezzin = null;
      if ($("muezzinStudentSelect")) $("muezzinStudentSelect").value = "";
      if ($("muezzinManualInput")) $("muezzinManualInput").value = "";
      renderMuezzinUI();
    };
  }
}

// Yemekçi Ekleme (Açılır Listeden)
function addCookFromSelect(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const select = $("cookStudentSelect");
  if (!select || !select.value) {
    alert("Lütfen yemekçi olarak atanacak bir talebe seçin.");
    return;
  }
  const student = getStudentObjectFromVal(select.value, select);
  if (!student) return;

  // Aynı kişiyi mükerrer eklemeyi engelle
  const exists = currentCooks.some(c => c.name.toLowerCase() === student.name.toLowerCase());
  if (exists) {
    alert(`"${student.name}" zaten yemekçi listesine eklenmiş.`);
    return;
  }

  currentCooks.push(student);
  select.value = "";
  renderCooksUI();
}

// Yemekçi Ekleme (Manuel Metin Girişinden)
function addCookFromManual(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const input = $("cookManualInput");
  if (!input) return;
  const val = input.value.trim();
  if (!val) {
    alert("Lütfen eklenecek kişinin adını yazın.");
    return;
  }

  currentCooks.push({
    id: "manual_" + Date.now(),
    name: val.toUpperCase(),
    className: ""
  });
  input.value = "";
  renderCooksUI();
}

// Müezzin Seçme (Açılır Listeden)
function setMuezzinFromSelect(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const select = $("muezzinStudentSelect");
  if (!select || !select.value) {
    alert("Lütfen müezzin olarak atanacak talebeyi seçin.");
    return;
  }
  const student = getStudentObjectFromVal(select.value, select);
  if (!student) return;

  currentMuezzin = student;
  renderMuezzinUI();
}

// Müezzin Seçme (Manuel Metin Girişinden)
function setMuezzinFromManual(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const input = $("muezzinManualInput");
  if (!input) return;
  const val = input.value.trim();
  if (!val) {
    alert("Lütfen müezzin olarak atanacak kişinin adını yazın.");
    return;
  }

  currentMuezzin = {
    id: "manual_" + Date.now(),
    name: val.toUpperCase(),
    className: ""
  };
  input.value = "";
  renderMuezzinUI();
}

// Tarihe ait görevli verisini Firebase'den dinleme
function watchDailyDuties() {
  const dateInput = $("dailyDutyDate");
  if (!dateInput) return;
  if (!dateInput.value) dateInput.value = getTodayDateStr();
  const date = dateInput.value;

  if (currentDailyDutyUnsub) {
    currentDailyDutyUnsub();
    currentDailyDutyUnsub = null;
  }

  currentDailyDutyUnsub = onValue(ref(db, "dailyDuties/" + date), snap => {
    const data = snap.val();
    currentCooks = [];
    currentMuezzin = null;
    currentAnnouncement = "";

    if (data && typeof data === "object") {
      if (Array.isArray(data.cooks)) {
        currentCooks = [...data.cooks];
      }
      if (data.muezzin) {
        currentMuezzin = typeof data.muezzin === "string" ? { name: data.muezzin } : data.muezzin;
      }
      if (data.announcement) {
        currentAnnouncement = data.announcement;
      }

      // Eski format kayıt varsa ayrıştır
      if (!currentCooks.length && !currentMuezzin) {
        const parsed = parseDuties(data);
        parsed.forEach(p => {
          if (p.dutyType === "yemekhane" || p.dutyType === "bulasik" || p.dutyType === "cay") {
            currentCooks.push({ name: p.personName, className: "" });
          } else if (p.dutyType === "muezzin") {
            currentMuezzin = { name: p.personName, className: "" };
          }
        });
      }
    }

    renderCooksUI();
    renderMuezzinUI();

    const announceInput = $("dutyAnnouncementInput");
    if (announceInput && document.activeElement !== announceInput) {
      announceInput.value = currentAnnouncement || "";
    }

    loadTodayDutySummary();
    loadWeeklyDutySummary();
  }, err => {
    console.error("Görevli dinleme hatası:", err);
  });
}

async function loadDailyDuties() {
  watchDailyDuties();
  updateTvUrlDisplays();
}

// Tarih kutusu değiştiğinde o tarihin görevlilerini yükle
$("dailyDutyDate")?.addEventListener("change", watchDailyDuties);

if ($("dailyDutyDate") && !$("dailyDutyDate").value) {
  $("dailyDutyDate").value = getTodayDateStr();
}

// Buton Etkinliklerini Bağlama
$("addCookSelectBtn")?.addEventListener("click", addCookFromSelect);
$("addCookManualBtn")?.addEventListener("click", addCookFromManual);
$("cookManualInput")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addCookFromManual(e);
});

$("setMuezzinSelectBtn")?.addEventListener("click", setMuezzinFromSelect);
$("muezzinStudentSelect")?.addEventListener("change", setMuezzinFromSelect);
$("setMuezzinManualBtn")?.addEventListener("click", setMuezzinFromManual);
$("muezzinManualInput")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") setMuezzinFromManual(e);
});

$("clearCooksBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (!currentCooks.length) return;
  if (confirm("Günün tüm yemekçilerini listeden çıkarmak istediğinize emin misiniz?")) {
    currentCooks = [];
    renderCooksUI();
  }
});

// ANA BUTON: 💾 Görevlileri Kaydet ve TV Panosuna Gönder
$("saveDutyToTvBtn")?.addEventListener("click", async (e) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const dateInput = $("dailyDutyDate");
  const date = dateInput?.value || getTodayDateStr();
  const announcement = $("dutyAnnouncementInput")?.value.trim() || "";
  currentAnnouncement = announcement;

  const msg = $("saveDutyToTvMsg");
  if (msg) {
    msg.innerHTML = '<span style="color: #60a5fa; font-weight: 700;">⏳ Görevliler TV Panosuna ve veritabanına aktarılıyor...</span>';
  }

  const yemekhaneMap = {};
  currentCooks.forEach((c, idx) => {
    yemekhaneMap[`cook_${idx}`] = {
      name: c.name + (c.className ? ` (${c.className})` : ''),
      studentName: c.name,
      className: c.className || '',
      dutyType: 'yemekhane',
      personName: c.name,
      note: 'Mutfak / Sofra'
    };
  });

  const muezzinMap = currentMuezzin ? {
    active: {
      name: currentMuezzin.name + (currentMuezzin.className ? ` (${currentMuezzin.className})` : ''),
      studentName: currentMuezzin.name,
      className: currentMuezzin.className || '',
      dutyType: 'muezzin',
      personName: currentMuezzin.name,
      note: '5 Vakit Ezan & Cemaat'
    }
  } : null;

  const payload = {
    cooks: currentCooks,
    muezzin: currentMuezzin,
    announcement: announcement,
    updatedAt: new Date().toISOString(),
    updatedBy: currentAdminName || "Yönetici",
    // Tüm eski/farklı pano kodları için tam uyumluluk:
    yemekhane: yemekhaneMap,
    muezzinData: currentMuezzin
  };

  try {
    // 1. Birincil Düğüm
    await set(ref(db, "dailyDuties/" + date), payload);

    // 2. Yedek/Uyumluluk Düğümleri (Eski dosyalardan okuyan panolar için)
    try { await set(ref(db, "duties/" + date), payload); } catch (_) {}
    try { await set(ref(db, "gununGorevlileri/" + date), payload); } catch (_) {}

    if (msg) {
      msg.innerHTML = `
        <div style="background: #14532d; color: #bbf7d0; padding: 12px 18px; border-radius: 12px; border: 1px solid #22c55e; margin-top: 10px; text-align: center;">
          <div style="font-size: 15px; font-weight: 800;">✅ GÖREVLİLER BAŞARIYLA KAYDEDİLDİ VE TV PANOSUNA GÖNDERİLDİ!</div>
          <div style="font-size: 13px; margin-top: 4px; color: #86efac;">
            Tarih: <strong>${date}</strong> • Yemekçiler: <strong>${currentCooks.length} Talebe</strong> • Müezzin: <strong>${currentMuezzin ? currentMuezzin.name : 'Atanmadı'}</strong>
          </div>
          <div style="font-size: 12px; margin-top: 4px; color: #fde047;">
            📺 Canlı Pano (pano.html) anlık olarak güncellendi.
          </div>
        </div>
      `;
      setTimeout(() => {
        if (msg.innerHTML.includes("BAŞARIYLA")) msg.innerHTML = "";
      }, 7000);
    }

    loadTodayDutySummary();
    loadWeeklyDutySummary();
    loadTvKioskData();
  } catch (err) {
    console.error("Görevlileri TV panosuna kaydetme hatası:", err);
    if (msg) {
      msg.innerHTML = `<div style="background: #7f1d1d; color: #fca5a5; padding: 10px 16px; border-radius: 10px; margin-top: 10px;">❌ Kaydetme Hatası: ${err.message}</div>`;
    }
  }
});

/* ========================================================
   5. CANLI TV / DİJİTAL PANO (KIOSK MODU)
   ======================================================== */
let tvClockInterval = null;
let tvDutyUnsub = null;
let tvPrayerUnsub = null;
let tvAwardsUnsub = null;
let tvCurrentDate = null;
let tvDateCheckInterval = null;
let tvDateManuallyChanged = false;

function getTvKioskFullUrl() {
  const origin = window.location.origin;
  if (origin && origin !== "null") {
    return `${origin}/pano.html`;
  }
  return "https://irfaniye.vercel.app/pano.html";
}

function updateTvUrlDisplays() {
  const fullUrl = getTvKioskFullUrl();
  const display = $("tvKioskUrlDisplay");
  if (display) {
    display.textContent = fullUrl.replace(/^https?:\/\//, "");
  }
}

$("copyTvUrlBtn")?.addEventListener("click", (e) => {
  if (e) e.preventDefault();
  const url = getTvKioskFullUrl();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      alert("✅ TV Pano Adresi Kopyalandı!\n\nAkıllı TV veya ikinci ekrandaki tarayıcıya bu linki yapıştırabilirsiniz:\n" + url);
    }).catch(() => {
      prompt("TV Pano Adresi (Kopyalayabilirsiniz):", url);
    });
  } else {
    prompt("TV Pano Adresi (Kopyalayabilirsiniz):", url);
  }
});

$("openTvNewTabBtn")?.addEventListener("click", (e) => {
  if (e) e.preventDefault();
  window.open(getTvKioskFullUrl(), "_blank");
});

function updateTvDateBadge() {
  const badge = $("tvActiveDateBadge");
  const today = getTodayDateStr();
  const current = tvCurrentDate || today;

  if (badge) {
    if (current === today) {
      badge.textContent = `(Bugün: ${current})`;
    } else {
      badge.textContent = `(${current})`;
    }
  }

  $("tvTodayBtn")?.classList.toggle("active", current === today);
}

function changeTvDate(offsetDays) {
  tvDateManuallyChanged = true;
  const cur = tvCurrentDate ? new Date(tvCurrentDate + "T12:00:00") : new Date();
  cur.setDate(cur.getDate() + offsetDays);
  tvCurrentDate = getLocalDateStr(cur);
  updateTvDateBadge();
  setupTvKioskListeners();
  loadTvKioskData();
}

function setTvDateToday() {
  tvDateManuallyChanged = false;
  tvCurrentDate = getTodayDateStr();
  updateTvDateBadge();
  setupTvKioskListeners();
  loadTvKioskData();
}

function openTvKiosk(customDate = null) {
  const modal = $("tvKioskModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  closeDrawer();

  updateTvKioskClock();
  if (tvClockInterval) clearInterval(tvClockInterval);
  tvClockInterval = setInterval(updateTvKioskClock, 1000);

  if (customDate && typeof customDate === "string") {
    tvCurrentDate = customDate;
    tvDateManuallyChanged = true;
  } else if (!tvCurrentDate) {
    tvCurrentDate = $("dailyDutyDate")?.value || getTodayDateStr();
  }

  updateTvDateBadge();
  setupTvKioskListeners();
  loadTvKioskData();

  if (tvDateCheckInterval) clearInterval(tvDateCheckInterval);
  tvDateCheckInterval = setInterval(() => {
    const today = getTodayDateStr();
    if (today !== tvCurrentDate && !tvDateManuallyChanged) {
      tvCurrentDate = today;
      updateTvDateBadge();
      setupTvKioskListeners();
    }
  }, 30000);
}

function closeTvKiosk() {
  $("tvKioskModal")?.classList.add("hidden");
  if (tvClockInterval) clearInterval(tvClockInterval);
  if (tvDateCheckInterval) clearInterval(tvDateCheckInterval);
  cleanupTvListeners();
}

function cleanupTvListeners() {
  if (tvDutyUnsub) { tvDutyUnsub(); tvDutyUnsub = null; }
  if (tvPrayerUnsub) { tvPrayerUnsub(); tvPrayerUnsub = null; }
  if (tvAwardsUnsub) { tvAwardsUnsub(); tvAwardsUnsub = null; }
}

function setupTvKioskListeners() {
  cleanupTvListeners();
  const dateToWatch = tvCurrentDate || getTodayDateStr();

  // 1. Günün Görevlileri & Duyuru (Gerçek Zamanlı onValue)
  tvDutyUnsub = onValue(ref(db, "dailyDuties/" + dateToWatch), snap => {
    renderTvDutyList(snap.val());
  }, err => console.error("TV duty realtime error:", err));

  // 2. Namaz Takibi (Gerçek Zamanlı onValue)
  tvPrayerUnsub = onValue(ref(db, "prayerAttendance/" + dateToWatch), snap => {
    renderTvPrayerStats(snap.val());
  }, err => console.error("TV prayer realtime error:", err));

  // 3. Örnek Talebeler (Gerçek Zamanlı onValue)
  tvAwardsUnsub = onValue(ref(db, "studentAwards"), snap => {
    renderTvAwards(snap.val());
  }, err => console.error("TV awards realtime error:", err));
}

function updateTvKioskClock() {
  const now = new Date();
  if ($("tvKioskClock")) {
    $("tvKioskClock").textContent = now.toLocaleTimeString("tr-TR");
  }
  if ($("tvKioskDate")) {
    $("tvKioskDate").textContent = now.toLocaleDateString("tr-TR", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
  }
}

// TV Panosunda Görevlileri ve Duyuruyu Gösterme
function renderTvDutyList(dutiesData) {
  const cooksArea = $("tvCooksArea");
  const muezzinArea = $("tvMuezzinArea");
  const announceBanner = $("tvAnnouncementBanner");
  const announceText = $("tvAnnounceText");
  const legacyDutyList = $("tvDutyList");

  let cooks = [];
  let muezzin = null;
  let announcement = "";

  if (dutiesData && typeof dutiesData === "object") {
    if (Array.isArray(dutiesData.cooks)) {
      cooks = dutiesData.cooks;
    }
    if (dutiesData.muezzin) {
      muezzin = dutiesData.muezzin;
    }
    if (dutiesData.announcement) {
      announcement = dutiesData.announcement;
    }

    // Geriye dönük uyumluluk: eski kayıtlardan dönüştürme
    if (!cooks.length && !muezzin) {
      const parsed = parseDuties(dutiesData);
      parsed.forEach(p => {
        if (p.dutyType === "yemekhane" || p.dutyType === "bulasik" || p.dutyType === "cay") {
          cooks.push({ name: p.personName, className: "" });
        } else if (p.dutyType === "muezzin") {
          muezzin = { name: p.personName, className: "" };
        }
      });
    }
  }

  // 1. Canlı Duyuru Bandı
  if (announceBanner && announceText) {
    if (announcement && announcement.trim()) {
      announceText.textContent = announcement.trim();
      announceBanner.classList.remove("hidden");
    } else {
      announceBanner.classList.add("hidden");
    }
  }

  // 2. Günün Yemekçileri
  if (cooksArea) {
    if (cooks.length > 0) {
      cooksArea.innerHTML = cooks.map((c, idx) => `
        <div class="tvCookItem">
          <div class="tvCookBadgeNum">${idx + 1}</div>
          <div>
            <div class="tvCookName">${esc(c.name || 'Görevli')}</div>
            ${c.className ? `<div class="tvCookClass">${esc(c.className)}</div>` : ''}
          </div>
        </div>
      `).join("");
    } else {
      cooksArea.innerHTML = '<p class="tvEmpty">Bugün için yemekhane nöbetçisi atanmadı.</p>';
    }
  }

  // 3. Günün Müezzini
  if (muezzinArea) {
    if (muezzin && muezzin.name) {
      muezzinArea.innerHTML = `
        <div class="tvMuezzinIcon">🕌</div>
        <div class="tvMuezzinTitle">GÜNÜN MÜEZZİNİ</div>
        <div class="tvMuezzinName">${esc(muezzin.name)} ${muezzin.className ? `(${esc(muezzin.className)})` : ''}</div>
        <div class="tvMuezzinSub">5 Vakit Ezan & Cemaat Görevi</div>
      `;
    } else {
      muezzinArea.innerHTML = '<p class="tvEmpty">Bugün için müezzin atanmadı.</p>';
    }
  }

  // 4. Eski konteyner varsa (uyumluluk)
  if (legacyDutyList) {
    const all = parseDuties(dutiesData);
    if (!all.length) {
      legacyDutyList.innerHTML = '<p class="tvEmpty">Bugün için görevli atanmadı.</p>';
    } else {
      legacyDutyList.innerHTML = all.map(d => `
        <div style="background:#1e293b; padding:12px 16px; border-radius:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="font-size:15px; color:#fff;">${esc(d.personName)}</strong>
            ${d.note ? `<div style="font-size:11.5px; color:#94a3b8; margin-top:2px;">📝 ${esc(d.note)}</div>` : ''}
          </div>
          <span class="classBadge" style="background:#334155; color:#38bdf8; font-size:12px; font-weight:700;">${esc(dutyTitles[d.dutyType] || d.dutyType)}</span>
        </div>
      `).join("");
    }
  }
}

function renderTvPrayerStats(dayData) {
  const prayers = ["sabah", "ogle", "ikindi", "aksam", "yatsi"];
  const pData = dayData || {};

  prayers.forEach(p => {
    const records = pData[p] || {};
    let varCount = 0;
    Object.values(records).forEach(r => {
      if (r && typeof r === "object" && r.durum === "var") varCount++;
    });
    const el = $(`tv${p.charAt(0).toUpperCase() + p.slice(1)}Count`);
    if (el) el.textContent = varCount ? `${varCount} Var` : "-";
  });
}

function renderTvAwards(awardsData) {
  const tvAwardList = $("tvAwardList");
  if (!tvAwardList) return;

  const data = awardsData || {};
  const entries = [];
  Object.entries(data).forEach(([type, records]) => {
    Object.values(records || {}).forEach(r => {
      if (r && typeof r === "object") {
        entries.push({
          type: r.type || type,
          name: r.name || r.studentName || "Talebe",
          note: r.note || "",
          createdAt: r.createdAt || ""
        });
      }
    });
  });

  entries.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const topAwards = entries.slice(0, 3);

  if (!topAwards.length) {
    tvAwardList.innerHTML = '<p class="tvEmpty">Kayıtlı talebe ödülü bulunmuyor.</p>';
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  tvAwardList.innerHTML = topAwards.map((a, i) => `
    <div style="background:#1e293b; padding:16px; border-radius:12px; text-align:center;">
      <div style="font-size:32px;">${medals[i] || '🎖️'}</div>
      <strong style="display:block; font-size:16px; color:#fff; margin:6px 0;">${esc(a.name)}</strong>
      <span style="color:#38bdf8; font-size:12px; font-weight:700;">${esc(a.type === 'ay' ? '🏆 Ayın Talebesi' : '🏆 Haftanın Talebesi')}</span>
      ${a.note ? `<div style="color:#94a3b8; font-size:11px; margin-top:4px;">${esc(a.note)}</div>` : ''}
    </div>
  `).join("");
}

async function loadTvKioskData() {
  const today = tvCurrentDate || getTodayDateStr();
  try {
    const snapDuty = await get(ref(db, "dailyDuties/" + today));
    renderTvDutyList(snapDuty.val());
  } catch (err) {
    console.error("TV kiosk görevli verisi hatası:", err);
  }
  try {
    const snapPrayer = await get(ref(db, "prayerAttendance/" + today));
    renderTvPrayerStats(snapPrayer.val());
  } catch (err) {
    console.error("TV kiosk namaz verisi hatası:", err);
  }
  try {
    const snapAwards = await get(ref(db, "studentAwards"));
    renderTvAwards(snapAwards.val());
  } catch (err) {
    console.error("TV kiosk ödül verisi hatası:", err);
  }
}

// Canlı TV Kiosk Açma / Kapatma Olayları
$("headerTvBtn")?.addEventListener("click", () => openTvKiosk());
$("openTvFromDutiesBtn")?.addEventListener("click", () => {
  const selDate = $("dailyDutyDate")?.value;
  openTvKiosk(selDate);
});
$("drawerTvKioskLink")?.addEventListener("click", () => openTvKiosk());
$("closeTvKioskBtn")?.addEventListener("click", closeTvKiosk);
$("loginTvBtn")?.addEventListener("click", () => openTvKiosk());

$("tvPrevDayBtn")?.addEventListener("click", () => changeTvDate(-1));
$("tvTodayBtn")?.addEventListener("click", setTvDateToday);
$("tvNextDayBtn")?.addEventListener("click", () => changeTvDate(1));

// Escape tuşu ile panodan çıkış
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("tvKioskModal")?.classList.contains("hidden")) {
    closeTvKiosk();
  }
});

// URL Hash veya Parametre ile (#tv veya ?tv=1) Panoyu Otomatik Açma
function checkTvHash() {
  const hash = (window.location.hash || "").toLowerCase();
  const search = (window.location.search || "").toLowerCase();
  if (hash === "#tv" || hash === "#pano" || hash === "#kiosk" || search.includes("tv=1") || search.includes("kiosk=1")) {
    openTvKiosk();
  }
}
window.addEventListener("hashchange", checkTvHash);
checkTvHash();

/* ========================================================
   6. ÖNBELLEK YENİLEME BUTONLARI
   ======================================================== */
function reloadAppWithFreshCache() {
  window.location.reload(true);
}

$("headerRefreshBtn")?.addEventListener("click", reloadAppWithFreshCache);
$("refreshAppBtn")?.addEventListener("click", reloadAppWithFreshCache);
$("floatingClearCacheBtn")?.addEventListener("click", reloadAppWithFreshCache);
