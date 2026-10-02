import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getDatabase, ref, push, set, remove, onValue, update } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

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

    for (const row of rows) {
      const studentNo = String(row["Öğrenci No"] ?? row["Ogrenci No"] ?? "").trim();
      const name = String(row["Ad-Soyad"] ?? row["Ad Soyad"] ?? "").trim();

      if (!name || !studentNo || existingNos.has(studentNo)) {
        skipped++;
        continue;
      }

      const newRef = push(ref(db, "students"));
      changes["students/" + newRef.key] = {
        name,
        studentNo,
        parentName: String(row["Veli Adı"] ?? row["Veli Adi"] ?? "").trim(),
        parentPhone: String(row["Veli Tel"] ?? "").trim(),
        className: String(row["Sınıf"] ?? row["Sinif"] ?? "").trim(),
        dormNo: String(row["Yatak No"] ?? row["Yatakhane No"] ?? "").trim(),
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
