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
let currentAdminName = "Sistem Kaydı";
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
let staff = {}, systemSettings = {}, currentStudentEditingId = null, currentStaffEditingId = null;

onAuthStateChanged(auth, user => {
  $("loginCard").classList.toggle("hidden", !!user);
  $("appArea").classList.toggle("hidden", !user);
  $("logoutBtn").classList.toggle("hidden", !user);
  $("menuToggleBtn")?.classList.toggle("hidden", !user);
  $("floatingMenuBtn")?.classList.toggle("hidden", !user);
  $("headerManagerBadge")?.classList.toggle("hidden", !user);
  $("headerStudentBadge")?.classList.toggle("hidden", !user);
  $("headerRefreshBtn")?.classList.toggle("hidden", !user);
  $("floatingClearCacheBtn")?.classList.toggle("hidden", !user);

  if (!user) {
    closeDrawer();
  }
  if (unsubscribe) unsubscribe();
  if (user) {
    currentAdminName = user.email || "Sistem Kaydı";
    unsubscribe = onValue(ref(db, "students"), snap => {
      students = snap.val() || {};
      renderStudentTable();
      render();
      fillLeaveStudents();
      renderPrayerStudents();
      renderBedStudents();
      renderSchoolReturnStudents();
      fillDailyDutyStudents();
      fillSupportLessonStudents();
      fillTestResultStudents();
      fillQuranStudents();
      fillAwardStudents();
      loadTodayAttendanceSummary();
      loadWeeklyAttendanceSummary();
      loadTodayPrayerSummary();
      loadWeeklyPrayerSummary();
      loadTodayBedSummary();
      loadWeeklyBedSummary();
      loadTodaySchoolReturnSummary();
      loadWeeklySchoolReturnSummary();
      loadTodayLeaveSummary();
      loadWeeklyLeaveSummary();
      loadTodayDutySummary();
      loadWeeklyDutySummary();
      setTimeout(() => {
        loadBedAttendance();
        loadSchoolReturnAttendance();
      }, 300);
      updateDashboard();
    });

    onValue(ref(db, "staff"), snap => {
      staff = snap.val() || {};
      renderStaffTable();
      fillDailyDutyStudents();
    });

    onValue(ref(db, "systemSettings"), snap => {
      systemSettings = snap.val() || {};
      applySystemSettings();
    });

    loadDailyDuties();
  } else {
    students = {};
    staff = {};
    systemSettings = {};
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

reportMonth.value = new Date().toISOString().slice(0, 7);

$("loadReportBtn").addEventListener("click", loadMonthlyReport);

async function loadMonthlyReport() {
  const month = reportMonth.value;

  if (!month) {
    reportSummary.textContent = "Lütfen bir ay seçin.";
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

studyDate.value = new Date().toISOString().slice(0, 10);

$("loadStudyBtn").addEventListener("click", loadStudy);
$("saveStudyBtn").addEventListener("click", saveStudy);

async function loadStudy() {
  const date = studyDate.value;
  const session = studySession.value;

  if (!date) {
    studyMsg.textContent = "Lütfen tarih seçin.";
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

studyReportMonth.value = new Date().toISOString().slice(0, 7);

$("loadStudyReportBtn").addEventListener("click", loadStudyReport);

async function loadStudyReport() {
  const month = studyReportMonth.value;

  if (!month) {
    studyReportSummary.textContent = "Lütfen bir ay seçin.";
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

$("saveLeaveBtn").addEventListener("click", saveLeave);

async function saveLeave() {
  const studentId = leaveStudent.value;

  if (!studentId) {
    leaveMsg.textContent = "Lütfen talebe seçin.";
    return;
  }

  if (!leaveStart.value) {
    leaveMsg.textContent = "Lütfen çıkış tarihini ve saatini seçin.";
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

  $("dashTotal").textContent = total;
  $("dashPresent").textContent = geldi;
  $("dashAbsent").textContent = gelmedi;
  $("dashExcused").textContent = izinli;
  $("dashOutside").textContent = disarida;

  $("dashboardDate").textContent =
    "Son güncelleme: " + new Date().toLocaleString("tr-TR");
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
  studentModalTitle.textContent = title;
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

  studentModal.classList.remove("hidden");
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
// GÜNÜN GÖREVLİLERİ
// ==============================

function fillDailyDutyStudents() {
  const select = $("dailyDutyStudent");
  if (!select) return;

  select.innerHTML = `<option value="">Talebe Seçin</option>`;

  Object.entries(students || {}).forEach(([id, student]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = student.name || "İsimsiz";
    select.appendChild(option);
  });
}
const dailyDutyDateInput = $("dailyDutyDate");

if (dailyDutyDateInput && !dailyDutyDateInput.value) {
  dailyDutyDateInput.value = new Date().toISOString().slice(0, 10);
}
$("addDailyDutyBtn")?.addEventListener("click", async () => {
  const studentId = $("dailyDutyStudent")?.value;
  const dutyType = $("dailyDutyType")?.value;

  if (!studentId || !dutyType) {
    $("dailyDutyMsg").textContent =
      "Lütfen görev ve talebe seçin.";
    return;
  }
const student = students[studentId];
const date = $("dailyDutyDate")?.value;

if (!date) {
  $("dailyDutyMsg").textContent = "Lütfen tarih seçin.";
  return;
}

try {
  await set(
    ref(db, `dailyDuties/${date}/${dutyType}/${studentId}`),
    {
      name: student.name || "İsimsiz"
    }
  );

  $("dailyDutyMsg").textContent =
    `✅ ${student.name} göreve kaydedildi.`;
await loadDailyDuties();
} catch (error) {
  console.error(error);
  $("dailyDutyMsg").textContent =
    "❌ Görevli kaydedilirken hata oluştu.";
}
});
async function loadDailyDuties() {
  const date = $("dailyDutyDate")?.value;
  const list = $("dailyDutyList");

  if (!date || !list) return;

  try {
    const snap = await get(ref(db, `dailyDuties/${date}`));
    const data = snap.val() || {};

    list.innerHTML = "";

    const dutyNames = {
      yemekhane: "Yemekhane",
      temizlik: "Temizlik",
      bulasik: "Bulaşık",
      cay: "Çay",
      nobet: "Nöbet"
    };

    Object.entries(data).forEach(([dutyType, dutyStudents]) => {
      Object.entries(dutyStudents || {}).forEach(([studentId, student]) => {
        const item = document.createElement("p");

        item.innerHTML = `
  <strong>${dutyNames[dutyType] || dutyType}:</strong>
  ${student.name}
  <button
  type="button"
  data-duty-delete="${studentId}"
  data-duty-type="${dutyType}">
  🗑️ Sil
</button>
`;

        list.appendChild(item);
      });
    });

    } catch (error) {
    console.error(error);
    list.innerHTML = "<p>❌ Ders notları yüklenemedi.</p>";
  }
}

$("dailyDutyList")?.addEventListener("click", async (e) => {
  const button = e.target.closest("[data-duty-delete]");
  if (!button) return;

  const studentId = button.dataset.dutyDelete;
  const dutyType = button.dataset.dutyType;
  const date = $("dailyDutyDate")?.value;

  if (!date) return;

  try {
    await set(
      ref(db, `dailyDuties/${date}/${dutyType}/${studentId}`),
      null
    );

    await loadDailyDuties();

    $("dailyDutyMsg").textContent = "✅ Görevli silindi.";
  } catch (error) {
    console.error(error);
    $("dailyDutyMsg").textContent =
      "❌ Görevli silinirken hata oluştu.";
  }
});
$("dailyDutyDate")?.addEventListener("change", () => {
  loadDailyDuties();
});
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

  const today = new Date().toISOString().slice(0, 10);

  try {
    const snapshot = await get(ref(db, `dailyDuties/${today}`));
    const data = snapshot.val() || {};

    let total = 0;

    Object.values(data).forEach(dutyRecords => {
      total += Object.keys(dutyRecords || {}).length;
    });

    area.textContent = `Bugünkü görevli: ${total}`;
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

      const dateText = date.toISOString().slice(0, 10);

      const snapshot = await get(
        ref(db, `dailyDuties/${dateText}`)
      );

      const data = snapshot.val() || {};

      Object.values(data).forEach(dutyRecords => {
        total += Object.keys(dutyRecords || {}).length;
      });
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
  $("drawerBackdrop")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  $("sideDrawer")?.classList.remove("open");
  $("drawerBackdrop")?.classList.remove("open");
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
  signOut(auth);
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
   4. GÜNÜN GÖREVLİLERİ YÖNETİMİ (MÜEZZİN, YEMEKHANE VB.)
   ======================================================== */
const dutyTitles = {
  yemekhane: "🍲 Yemekhane Nöbetçisi",
  muezzin: "🕌 Müezzin",
  temizlik: "🧹 Temizlik & Kat Nöbetçisi",
  bulasik: "🍽️ Bulaşıkhane",
  cay: "☕ Çay Ocağı",
  nobet: "🛡️ Gece / Yurt Nöbeti"
};

function fillDailyDutyOptions() {
  const select = $("dailyDutyStudent");
  if (!select) return;

  let html = '<option value="">Seçin</option>';
  html += '<optgroup label="👨‍🎓 Talebeler">';
  Object.entries(students || {}).sort((a,b) => (a[1].name||'').localeCompare(b[1].name||'', 'tr')).forEach(([id, s]) => {
    html += `<option value="student_${id}">${esc(s.name || 'İsimsiz')} (${esc(s.className || '-')})</option>`;
  });
  html += '</optgroup>';

  if (Object.keys(staff || {}).length) {
    html += '<optgroup label="👨‍🏫 Hocalar / Personel">';
    Object.entries(staff || {}).forEach(([id, st]) => {
      html += `<option value="staff_${id}">👨‍🏫 ${esc(st.name || '')} (${esc(st.role || 'Hoca')})</option>`;
    });
    html += '</optgroup>';
  }

  select.innerHTML = html;
}

// override fillDailyDutyStudents
const originalFillDailyDutyStudents = fillDailyDutyStudents;
fillDailyDutyStudents = function() {
  fillDailyDutyOptions();
};

async function loadDailyDuties() {
  const dateInput = $("dailyDutyDate");
  if (!dateInput) return;
  if (!dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
  const date = dateInput.value;

  const listEl = $("dailyDutyList");
  if (!listEl) return;

  try {
    const snap = await get(ref(db, "dailyDuties/" + date));
    const duties = snap.val() || {};
    const entries = Object.entries(duties);

    if (!entries.length) {
      listEl.innerHTML = '<div class="empty">Bu tarihte atanmış görevli bulunmuyor.</div>';
      return;
    }

    listEl.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px;">
        ${entries.map(([id, d]) => `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 12px; font-weight: 700; color: #2563eb; margin-bottom: 2px;">
                ${esc(dutyTitles[d.dutyType] || d.dutyType)}
              </div>
              <strong style="font-size: 15px; color: #1e293b;">${esc(d.personName)}</strong>
              ${d.note ? `<div style="font-size: 12px; color: #64748b; margin-top: 3px;">📝 ${esc(d.note)}</div>` : ''}
            </div>
            <button type="button" class="actionBtn" title="Sil" data-delete-duty="${id}">🗑️</button>
          </div>
        `).join("")}
      </div>
    `;

    listEl.querySelectorAll("[data-delete-duty]").forEach(b => {
      b.onclick = async () => {
        await remove(ref(db, `dailyDuties/${date}/${b.dataset.deleteDuty}`));
        loadDailyDuties();
      };
    });
  } catch (err) {
    console.error(err);
  }
}

$("dailyDutyDate")?.addEventListener("change", loadDailyDuties);

$("addDailyDutyBtn")?.addEventListener("click", async () => {
  const date = $("dailyDutyDate")?.value;
  const dutyType = $("dailyDutyType")?.value;
  const personVal = $("dailyDutyStudent")?.value;
  const note = $("dailyDutyNote")?.value.trim() || "";
  const msg = $("dailyDutyMsg");

  if (!date || !dutyType || !personVal) {
    if (msg) msg.textContent = "Lütfen tarih, görev ve kişi seçin.";
    return;
  }

  let personName = "Belirtilmedi";
  if (personVal.startsWith("student_")) {
    const sId = personVal.replace("student_", "");
    personName = students[sId]?.name || "Talebe";
  } else if (personVal.startsWith("staff_")) {
    const stId = personVal.replace("staff_", "");
    personName = staff[stId]?.name || "Personel";
  }

  try {
    await push(ref(db, "dailyDuties/" + date), {
      dutyType,
      personName,
      personId: personVal,
      note,
      createdAt: new Date().toISOString()
    });
    $("dailyDutyNote").value = "";
    if (msg) {
      msg.textContent = "✅ Görevli başarıyla atandı.";
      setTimeout(() => msg.textContent = "", 2500);
    }
    loadDailyDuties();
  } catch (err) {
    console.error(err);
    if (msg) msg.textContent = "❌ Hata oluştu: " + err.message;
  }
});

/* ========================================================
   5. CANLI TV / DİJİTAL PANO (KIOSK MODU)
   ======================================================== */
let tvClockInterval = null;

function openTvKiosk() {
  const modal = $("tvKioskModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  closeDrawer();

  updateTvKioskClock();
  if (tvClockInterval) clearInterval(tvClockInterval);
  tvClockInterval = setInterval(updateTvKioskClock, 1000);

  loadTvKioskData();
}

function closeTvKiosk() {
  $("tvKioskModal")?.classList.add("hidden");
  if (tvClockInterval) clearInterval(tvClockInterval);
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

async function loadTvKioskData() {
  const today = new Date().toISOString().slice(0, 10);

  // Günün Görevlileri
  const tvDutyList = $("tvDutyList");
  if (tvDutyList) {
    try {
      const snap = await get(ref(db, "dailyDuties/" + today));
      const duties = snap.val() || {};
      const entries = Object.values(duties);
      if (!entries.length) {
        tvDutyList.innerHTML = '<p class="tvEmpty">Bugün için görevli atanmadı.</p>';
      } else {
        tvDutyList.innerHTML = entries.map(d => `
          <div style="background:#1e293b; padding:12px 16px; border-radius:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong style="font-size:15px; color:#fff;">${esc(d.personName)}</strong>
              ${d.note ? `<div style="font-size:11.5px; color:#94a3b8;">${esc(d.note)}</div>` : ''}
            </div>
            <span class="classBadge" style="background:#334155; color:#38bdf8;">${esc(dutyTitles[d.dutyType] || d.dutyType)}</span>
          </div>
        `).join("");
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Namaz Durumu
  try {
    const snap = await get(ref(db, "prayers/" + today));
    const pData = snap.val() || {};
    const prayers = ["sabah", "ogle", "ikindi", "aksam", "yatsi"];
    prayers.forEach(p => {
      const records = pData[p] || {};
      let varCount = 0;
      Object.values(records).forEach(r => {
        if (r && r.durum === "var") varCount++;
      });
      const el = $(`tv${p.charAt(0).toUpperCase() + p.slice(1)}Count`);
      if (el) el.textContent = varCount ? `${varCount} Var` : "-";
    });
  } catch (err) {
    console.error(err);
  }

  // Örnek Talebeler
  const tvAwardList = $("tvAwardList");
  if (tvAwardList) {
    try {
      const snap = await get(ref(db, "awards"));
      const awards = snap.val() || {};
      const entries = Object.values(awards).slice(-3).reverse();
      if (!entries.length) {
        tvAwardList.innerHTML = '<p class="tvEmpty">Kayıtlı talebe ödülü bulunmuyor.</p>';
      } else {
        tvAwardList.innerHTML = entries.map((a, i) => `
          <div style="background:#1e293b; padding:16px; border-radius:12px; text-align:center;">
            <div style="font-size:32px;">${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
            <strong style="display:block; font-size:16px; color:#fff; margin:6px 0;">${esc(a.studentName || a.name || 'Talebe')}</strong>
            <span style="color:#94a3b8; font-size:12px;">${esc(a.type === 'hafta' ? 'Haftanın Talebesi' : 'Ayın Talebesi')}</span>
          </div>
        `).join("");
      }
    } catch (err) {
      console.error(err);
    }
  }
}

$("drawerTvKioskLink")?.addEventListener("click", openTvKiosk);
$("closeTvKioskBtn")?.addEventListener("click", closeTvKiosk);

/* ========================================================
   6. ÖNBELLEK YENİLEME BUTONLARI
   ======================================================== */
function reloadAppWithFreshCache() {
  window.location.reload(true);
}

$("headerRefreshBtn")?.addEventListener("click", reloadAppWithFreshCache);
$("refreshAppBtn")?.addEventListener("click", reloadAppWithFreshCache);
$("floatingClearCacheBtn")?.addEventListener("click", reloadAppWithFreshCache);
