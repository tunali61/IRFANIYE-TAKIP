const STORAGE_KEY = "irfaniye_students";
let students = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

const form = document.getElementById("studentForm");
const list = document.getElementById("studentList");
const search = document.getElementById("search");

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
}

function render() {
  const q = search.value.trim().toLowerCase();
  const filtered = students.filter(s =>
    [s.name,s.studentNo,s.className,s.dormNo].join(" ").toLowerCase().includes(q)
  );

  if (!filtered.length) {
    list.innerHTML = '<div class="empty">Henüz kayıt bulunmuyor.</div>';
    return;
  }

  list.innerHTML = filtered.map(s => `
    <div class="student">
      <strong>${escapeHtml(s.name)}</strong>
      <div class="meta">
        Öğrenci No: ${escapeHtml(s.studentNo)}<br>
        Veli: ${escapeHtml(s.parentName || "-")} | Tel: ${escapeHtml(s.parentPhone || "-")}<br>
        Sınıf: ${escapeHtml(s.className || "-")} | Yatakhane No: ${escapeHtml(s.dormNo || "-")}<br>
        Notlar: ${escapeHtml(s.notes || "-")}
      </div>
      <div class="actions">
        <button onclick="editStudent('${s.id}')">Düzenle</button>
        <button class="delete" onclick="deleteStudent('${s.id}')">Sil</button>
      </div>
    </div>
  `).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

form.addEventListener("submit", e => {
  e.preventDefault();
  const id = document.getElementById("studentForm").dataset.editing;

  const student = {
    id: id || crypto.randomUUID(),
    name: document.getElementById("name").value.trim(),
    studentNo: document.getElementById("studentNo").value.trim(),
    parentName: document.getElementById("parentName").value.trim(),
    parentPhone: document.getElementById("parentPhone").value.trim(),
    className: document.getElementById("className").value.trim(),
    dormNo: document.getElementById("dormNo").value.trim(),
    notes: document.getElementById("notes").value.trim()
  };

  if (id) students = students.map(s => s.id === id ? student : s);
  else students.push(student);

  save();
  form.reset();
  delete form.dataset.editing;
  form.querySelector("button").textContent = "Talebeyi Kaydet";
  render();
});

window.editStudent = id => {
  const s = students.find(x => x.id === id);
  if (!s) return;
  document.getElementById("name").value = s.name;
  document.getElementById("studentNo").value = s.studentNo;
  document.getElementById("parentName").value = s.parentName;
  document.getElementById("parentPhone").value = s.parentPhone;
  document.getElementById("className").value = s.className;
  document.getElementById("dormNo").value = s.dormNo;
  document.getElementById("notes").value = s.notes;
  form.dataset.editing = id;
  form.querySelector("button").textContent = "Değişiklikleri Kaydet";
  window.scrollTo({top:0,behavior:"smooth"});
};

window.deleteStudent = id => {
  if (!confirm("Bu talebe kaydı silinsin mi?")) return;
  students = students.filter(s => s.id !== id);
  save();
  render();
};

search.addEventListener("input", render);
render();
