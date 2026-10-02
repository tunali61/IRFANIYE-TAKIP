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
let students = {}, editingId = null, unsubscribe = null;

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("loginMsg").textContent = "Giriş yapılıyor...";
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
    $("loginMsg").textContent = "";
  } catch (err) {
    console.error(err);
    $("loginMsg").textContent = "Giriş başarısız. E-posta veya şifreyi kontrol edin.";
    $("loginMsg").className = "error";
  }
});

$("logoutBtn").onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  $("loginCard").classList.toggle("hidden", !!user);
  $("appArea").classList.toggle("hidden", !user);
  $("logoutBtn").classList.toggle("hidden", !user);
  if (unsubscribe) unsubscribe();
  if (user) {
    unsubscribe = onValue(ref(db, "students"), snap => {
      students = snap.val() || {};
      render();
    });
  } else {
    students = {};
  }
});

$("studentForm").addEventListener("submit", async e => {
  e.preventDefault();
  const data = {
    name: $("name").value.trim(),
    studentNo: $("studentNo").value.trim(),
    parentName: $("parentName").value.trim(),
    parentPhone: $("parentPhone").value.trim(),
    className: $("className").value.trim(),
    dormNo: $("dormNo").value.trim(),
    notes: $("notes").value.trim()
  };
  if (editingId) await set(ref(db, "students/" + editingId), data);
  else await set(push(ref(db, "students")), data);
  resetForm();
});

$("cancelBtn").onclick = resetForm;
$("search").addEventListener("input", render);

$("importExcelBtn").addEventListener("click", async () => {
  const file = $("excelFile").files[0];
  const msg = $("importMsg");
  if (!file) {
    msg.textContent = "Önce Excel dosyasını seçin.";
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
  $("studentForm").reset();
  $("saveBtn").textContent = "Talebeyi Kaydet";
  $("cancelBtn").classList.add("hidden");
}

function esc(v="") {
  return String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function render() {
  const q = $("search").value.trim().toLocaleLowerCase("tr-TR");
  const rows = Object.entries(students).filter(([id,s]) =>
    [s.name,s.studentNo,s.className,s.dormNo].join(" ").toLocaleLowerCase("tr-TR").includes(q)
  );
  if (!rows.length) {
    $("studentList").innerHTML = '<div class="empty">Henüz kayıt bulunmuyor.</div>';
    return;
  }
  $("studentList").innerHTML = rows.map(([id,s]) => `
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
  const s = students[id];
  if (!s) return;
  editingId = id;
  $("name").value=s.name||""; $("studentNo").value=s.studentNo||"";
  $("parentName").value=s.parentName||""; $("parentPhone").value=s.parentPhone||"";
  $("className").value=s.className||""; $("dormNo").value=s.dormNo||"";
  $("notes").value=s.notes||"";
  $("saveBtn").textContent="Değişiklikleri Kaydet";
  $("cancelBtn").classList.remove("hidden");
  window.scrollTo({top:0,behavior:"smooth"});
}
// ===== GÜNLÜK YOKLAMA =====

const attendanceDate = $("attendanceDate");
const attendanceList = $("attendanceList");
const attendanceMsg = $("attendanceMsg");

attendanceDate.value = new Date().toISOString().slice(0, 10);

$("loadAttendanceBtn").addEventListener("click", loadAttendance);
$("saveAttendanceBtn").addEventListener("click", saveAttendance);

async function loadAttendance() {
  const date = attendanceDate.value;

  if (!date) {
    attendanceMsg.textContent = "Lütfen tarih seçin.";
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

        <select class="attendanceStatus" data-id="${id}">
          <option value="geldi" ${status === "geldi" ? "selected" : ""}>
            Geldi
          </option>

          <option value="gelmedi" ${status === "gelmedi" ? "selected" : ""}>
            Gelmedi
          </option>

          <option value="izinli" ${status === "izinli" ? "selected" : ""}>
            İzinli
          </option>
        </select>
      </div>
    `;
  }).join("");

  attendanceMsg.textContent = "Yoklama açıldı.";
}

async function saveAttendance() {
  const date = attendanceDate.value;

  if (!date) {
    attendanceMsg.textContent = "Lütfen tarih seçin.";
    return;
  }

  const records = {};

  document.querySelectorAll(".attendanceStatus").forEach(select => {
    const id = select.dataset.id;

    records[id] = {
      status: select.value,
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
// ===== GÜNLÜK YOKLAMA =====

const attendanceDate = $("attendanceDate");
const attendanceList = $("attendanceList");
const attendanceMsg = $("attendanceMsg");

attendanceDate.value = new Date().toISOString().slice(0, 10);

$("loadAttendanceBtn").addEventListener("click", loadAttendance);
$("saveAttendanceBtn").addEventListener("click", saveAttendance);

async function loadAttendance() {
  const date = attendanceDate.value;

  if (!date) {
    attendanceMsg.textContent = "Lütfen tarih seçin.";
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

        <select class="attendanceStatus" data-id="${id}">
          <option value="geldi" ${status === "geldi" ? "selected" : ""}>
            Geldi
          </option>

          <option value="gelmedi" ${status === "gelmedi" ? "selected" : ""}>
            Gelmedi
          </option>

          <option value="izinli" ${status === "izinli" ? "selected" : ""}>
            İzinli
          </option>
        </select>
      </div>
    `;
  }).join("");

  attendanceMsg.textContent = "Yoklama açıldı.";
}

async function saveAttendance() {
  const date = attendanceDate.value;

  if (!date) {
    attendanceMsg.textContent = "Lütfen tarih seçin.";
    return;
  }

  const records = {};

  document.querySelectorAll(".attendanceStatus").forEach(select => {
    const id = select.dataset.id;

    records[id] = {
      status: select.value,
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
