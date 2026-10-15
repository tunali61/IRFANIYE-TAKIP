/**
 * test-results.js - Test Neticeleri & Etüt Soru Takip Modülü (Mobil & Otomatik Not Sıralamalı)
 * - Aldığı nota göre otomatik başarı sıralaması (1. 2. 3. madalyaları ve #sıra numaraları)
 * - Mobilde sıfır yatay kaydırma (sağa-sola kaydırmasız tam ekran uyumu)
 * - Tek ekranda en az 12-15 öğrenciyi sığdıran kompakt satır yüksekliği
 * - Tablonun en altında canlı Doğru, Yanlış, Boş, Net ve 100 Puan Sınıf Ortalamaları
 * - Tek tıkla veli paylaşım kartı görseli indirme (html2canvas) & WhatsApp gönderimi
 */

window.TestResultsModule = {
  activeView: 'editor', // 'editor' | 'history'
  currentTestId: null,
  showTestDetails: false, // Mobilde ekranı kaplamasın diye varsayılan daraltılmış
  sortBy: 'score_desc',   // 'score_desc': Notu En Yüksek İlk (1. -> Son) | 'name': İsim Sırası
  
  // Test Üst Bilgileri
  testMeta: {
    title: 'Haftalık Etüt Tarama Testi',
    subject: 'Matematik',
    unit: '1. Ünite',
    topic: 'EBOB - EKOK',
    date: new Date().toISOString().split('T')[0],
    totalQuestions: 20,
    wrongPenalty: 3 // 3: LGS (3Y 1D), 0: Yanlış götürmez, 4: YKS (4Y 1D)
  },

  // Öğrenci puanları: { [studentId]: { correct: 0, wrong: 0, empty: 20, net: 0, score: 0, note: '' } }
  scores: {},

  // Filtreler
  selectedGrade: 'ALL',          // 'ALL' | '5' | '6' | '7' | '8'
  selectedEtut: 'ALL',           // 'ALL' | '5-A|YASİN EKİNCİ' vb.
  selectedClass: 'ALL',          // Geriye dönük uyumluluk
  searchQuery: '',

  SUBJECT_OPTIONS: [
    'Matematik',
    'Türkçe',
    'Fen Bilimleri',
    'Sosyal Bilgiler',
    'İngilizce',
    'Din Kültürü',
    'İnkılap Tarihi',
    'Arapça',
    'Genel Tarama Denemesi'
  ],

  init() {
    this.ensureStudentScores();
    this.render();
  },

  ensureStudentScores() {
    const students = window.Store.getStudents();
    const total = parseInt(this.testMeta.totalQuestions, 10) || 20;
    
    students.forEach(st => {
      if (!this.scores[st.id]) {
        this.scores[st.id] = {
          correct: 0,
          wrong: 0,
          empty: total,
          net: 0,
          score: 0,
          note: ''
        };
      }
    });
  },

  toggleTestDetails() {
    this.showTestDetails = !this.showTestDetails;
    this.render();
  },

  toggleSort() {
    this.sortBy = this.sortBy === 'score_desc' ? 'name' : 'score_desc';
    this.render();
  },

  applySort() {
    this.sortBy = 'score_desc';
    this.render();
  },

  getCurrentlyDisplayedStudents() {
    let students = window.Store.getStudents();

    // 1. Sınıf Filtresi (5, 6, 7, 8)
    if (this.selectedGrade && this.selectedGrade !== 'ALL') {
      students = students.filter(s => {
        const cls = (s.className || '').trim();
        return cls === `${this.selectedGrade}. Sınıf` ||
               cls.startsWith(`${this.selectedGrade}-`) ||
               cls.startsWith(`${this.selectedGrade} `) ||
               cls === this.selectedGrade;
      });
    }

    // 2. Etüt Şubesi Filtresi
    if (this.selectedEtut && this.selectedEtut !== 'ALL') {
      const parts = this.selectedEtut.split('|');
      const branchCode = parts[0]; // Örn: "5-A"
      const hocaName = parts[1] ? parts[1].trim().toUpperCase() : ''; // Örn: "YASİN EKİNCİ"

      students = students.filter(s => {
        const sCls = (s.className || '').trim();
        const sHoca = (s.etutHocasi || '').trim().toUpperCase();
        const sDahili = (s.dahiliHoca || '').trim().toUpperCase();

        if (branchCode && sCls === branchCode) return true;
        if (hocaName && (sHoca === hocaName || sDahili === hocaName)) {
          if (branchCode && branchCode.charAt(0) === sCls.charAt(0)) return true;
          if (!branchCode) return true;
        }
        return false;
      });
    }

    // 3. Arama Filtresi
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase().trim();
      students = students.filter(s =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        (s.studentNo && s.studentNo.toString().includes(q)) ||
        (s.className && s.className.toLowerCase().includes(q)) ||
        (s.etutHocasi && s.etutHocasi.toLowerCase().includes(q))
      );
    }

    // --- ALDIĞI NOTA GÖRE OTOMATİK SIRALAMA ---
    if (this.sortBy === 'score_desc') {
      students.sort((a, b) => {
        const scA = this.scores[a.id] || { score: 0, net: 0, correct: 0, wrong: 0 };
        const scB = this.scores[b.id] || { score: 0, net: 0, correct: 0, wrong: 0 };
        const hasA = (scA.correct > 0 || scA.wrong > 0);
        const hasB = (scB.correct > 0 || scB.wrong > 0);

        // Notu girilmiş öğrenciler her zaman üstte
        if (hasA && !hasB) return -1;
        if (!hasA && hasB) return 1;

        // 1. Kriter: 100 Üzerinden Puan (En yüksek ilk)
        if (scB.score !== scA.score) return scB.score - scA.score;
        // 2. Kriter: Net Sayısı
        if (scB.net !== scA.net) return scB.net - scA.net;
        // 3. Kriter: Doğru Sayısı
        if (scB.correct !== scA.correct) return scB.correct - scA.correct;
        // 4. Kriter: Daha Az Yanlış
        if (scA.wrong !== scB.wrong) return scA.wrong - scB.wrong;
        // 5. Kriter: İsim Alfabetik
        return (a.firstName || '').localeCompare(b.firstName || '', 'tr');
      });
    } else {
      // İsim Sırası
      students.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || '', 'tr'));
    }

    return students;
  },

  // --- Canlı Hesaplama Motoru ---
  calculateRow(studentId) {
    const row = this.scores[studentId] || { correct: 0, wrong: 0, empty: 0, net: 0, score: 0, note: '' };
    const total = Math.max(1, parseInt(this.testMeta.totalQuestions, 10) || 20);
    const penalty = parseFloat(this.testMeta.wrongPenalty) || 0;

    let c = parseInt(row.correct, 10);
    if (isNaN(c) || c < 0) c = 0;
    if (c > total) c = total;

    let w = parseInt(row.wrong, 10);
    if (isNaN(w) || w < 0) w = 0;
    if (c + w > total) {
      w = total - c;
    }

    const empty = Math.max(0, total - (c + w));

    // Net Hesaplama (LGS Standardı: D - Y / 3)
    let net = 0;
    if (penalty > 0) {
      net = c - (w / penalty);
    } else {
      net = c;
    }
    net = Math.max(0, Math.round(net * 100) / 100);

    // 100 Üzerinden Başarı Notu
    let score = Math.round((net / total) * 100);
    score = Math.max(0, Math.min(100, score));

    row.correct = c;
    row.wrong = w;
    row.empty = empty;
    row.net = net;
    row.score = score;
    this.scores[studentId] = row;

    return row;
  },

  // Input değiştikçe doğrudan DOM'u günceller (klavye odağı kaybolmaz)
  handleInputChange(studentId, field, rawValue) {
    const val = parseInt(rawValue, 10) || 0;
    if (!this.scores[studentId]) {
      this.calculateRow(studentId);
    }
    this.scores[studentId][field] = val;

    const updated = this.calculateRow(studentId);

    // DOM elemanlarını anında güncelle
    const emptyEl = document.getElementById(`empty-badge-${studentId}`);
    if (emptyEl) emptyEl.textContent = updated.empty;

    const netEl = document.getElementById(`net-badge-${studentId}`);
    if (netEl) netEl.textContent = updated.net.toFixed(1);

    const scoreEl = document.getElementById(`score-badge-${studentId}`);
    if (scoreEl) {
      scoreEl.textContent = updated.score;
      scoreEl.className = `inline-block px-1.5 py-0.5 rounded-md font-black text-[11px] sm:text-xs border shadow-2xs transition-all ${this.getScoreBadgeClass(updated.score)}`;
    }

    // Input değerini clamp edilmiş haliyle düzelt
    const cInput = document.getElementById(`input-c-${studentId}`);
    if (cInput && parseInt(cInput.value, 10) !== updated.correct) {
      cInput.value = updated.correct;
    }
    const wInput = document.getElementById(`input-w-${studentId}`);
    if (wInput && parseInt(wInput.value, 10) !== updated.wrong) {
      wInput.value = updated.wrong;
    }

    this.updateSummaryCounters();
  },

  // Giriş tamamlanıp kutudan çıkıldığında (blur) listeyi puana göre yeniden dizer
  handleInputBlur() {
    if (this.sortBy === 'score_desc') {
      // Hafif bir gecikmeyle başka bir kutuya tıklandıysa odağı bozmamak için
      setTimeout(() => {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT')) {
          this.render();
        }
      }, 300);
    }
  },

  getScoreBadgeClass(score) {
    if (score >= 85) {
      return 'bg-emerald-600 text-white border-emerald-700';
    } else if (score >= 70) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    } else if (score >= 50) {
      return 'bg-amber-100 text-amber-900 border-amber-300';
    } else {
      return 'bg-rose-100 text-rose-800 border-rose-300';
    }
  },

  getGradeLabel(score) {
    if (score >= 85) return 'Pekiyi 🌟';
    if (score >= 70) return 'İyi 👍';
    if (score >= 50) return 'Orta ⚖️';
    return 'Gayret Etmeli ⚠️';
  },

  // Hem üst sayaçları hem de en alt ortalama satırını günceller
  updateSummaryCounters() {
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalEmpty = 0;
    let totalNet = 0;
    let totalScore = 0;
    let count = 0;

    const students = this.getCurrentlyDisplayedStudents();

    students.forEach(st => {
      const row = this.scores[st.id];
      if (row && (row.correct > 0 || row.wrong > 0)) {
        totalCorrect += (row.correct || 0);
        totalWrong += (row.wrong || 0);
        totalEmpty += (row.empty || 0);
        totalNet += (row.net || 0);
        totalScore += (row.score || 0);
        count++;
      }
    });

    const avgCorrect = count > 0 ? (totalCorrect / count).toFixed(1) : '0.0';
    const avgWrong = count > 0 ? (totalWrong / count).toFixed(1) : '0.0';
    const avgEmpty = count > 0 ? (totalEmpty / count).toFixed(1) : '0.0';
    const avgNet = count > 0 ? (totalNet / count).toFixed(2) : '0.00';
    const avgScore = count > 0 ? Math.round(totalScore / count) : 0;

    // 1. Üst Sayaçlar
    const avgNetEl = document.getElementById('stat-avg-net');
    if (avgNetEl) avgNetEl.textContent = avgNet;

    const avgScoreEl = document.getElementById('stat-avg-score');
    if (avgScoreEl) avgScoreEl.textContent = avgScore;

    const evalCountEl = document.getElementById('stat-evaluated-count');
    if (evalCountEl) evalCountEl.textContent = count;

    // 2. EN ALT TABLO ÖZET SATIRI (Footer)
    const fCount = document.getElementById('footer-count');
    if (fCount) fCount.textContent = `${count} Talebe Değerlendirildi`;

    const fCorrect = document.getElementById('footer-avg-correct');
    if (fCorrect) fCorrect.textContent = avgCorrect;

    const fWrong = document.getElementById('footer-avg-wrong');
    if (fWrong) fWrong.textContent = avgWrong;

    const fEmpty = document.getElementById('footer-avg-empty');
    if (fEmpty) fEmpty.textContent = avgEmpty;

    const fNet = document.getElementById('footer-avg-net');
    if (fNet) fNet.textContent = avgNet;

    const fScore = document.getElementById('footer-avg-score');
    if (fScore) fScore.textContent = `${avgScore} Puan`;
  },

  recalculateAll() {
    Object.keys(this.scores).forEach(stId => {
      this.calculateRow(stId);
    });
    this.render();
  },

  render() {
    const container = document.getElementById('test-results-container');
    if (!container) return;

    if (this.activeView === 'history') {
      this.renderHistoryView(container);
    } else {
      this.renderEditorView(container);
    }
  },

  // 1. TEST GİRİŞ & DÜZENLEME EKRANI (MOBİL & NOT SIRALAMALI)
  renderEditorView(container) {
    const classes = window.Store.getClasses();
    const students = this.getCurrentlyDisplayedStudents();

    container.innerHTML = `
      <div class="space-y-3 sm:space-y-4 max-w-7xl mx-auto animate-fade-in pb-8 px-1 sm:px-2">
        
        <!-- 1. Üst Hızlı Kontrol Barı -->
        <div class="bg-white p-3 sm:p-4 rounded-2xl shadow-xs border border-slate-200 flex items-center justify-between gap-2 no-print">
          <div class="flex items-center gap-2 truncate">
            <span class="text-xl sm:text-2xl">📝</span>
            <div class="truncate">
              <h2 class="text-xs sm:text-base font-black text-slate-900 truncate">
                ${this.currentTestId ? 'Testi Düzenle' : 'Test & Etüt Neticeleri'}
              </h2>
              <div class="text-[10px] text-slate-400 font-bold truncate">
                ${this.testMeta.subject} • ${this.testMeta.title}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-1.5 flex-shrink-0">
            <!-- Veli Görseli İndir -->
            <button type="button" onclick="window.TestResultsModule.downloadTableImage()"
              title="Velilere göndermek için tek tıkla liste resmi indir"
              class="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-[11px] sm:text-xs flex items-center gap-1 shadow-xs transition">
              <span>📸</span>
              <span class="hidden xs:inline">Resim İndir</span>
            </button>

            <!-- Arşiv Butonu -->
            <button type="button" onclick="window.TestResultsModule.activeView='history'; window.TestResultsModule.render();"
              class="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] sm:text-xs flex items-center gap-1 transition">
              <span>📚</span>
              <span class="hidden sm:inline">Arşiv</span>
              <span class="bg-slate-300 text-slate-800 text-[9px] px-1.5 py-0.2 rounded-full font-black">
                ${window.Store.getTestResults().length}
              </span>
            </button>

            <!-- Test Ayarlarını Aç/Kapat -->
            <button type="button" onclick="window.TestResultsModule.toggleTestDetails()"
              class="px-2.5 py-1.5 rounded-xl ${this.showTestDetails ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'} font-bold text-[11px] sm:text-xs flex items-center gap-1 transition">
              <span>⚙️</span>
              <span class="hidden sm:inline">${this.showTestDetails ? 'Gizle' : 'Ayarlar'}</span>
            </button>
          </div>
        </div>

        <!-- 2. Test Detayları Kartı (Açılır/Kapanır) -->
        ${this.showTestDetails ? `
          <div class="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-xs border-2 border-emerald-200/90 p-4 space-y-3 no-print animate-fade-in">
            <div class="flex items-center justify-between border-b border-emerald-100 pb-2">
              <span class="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                <span>⚙️</span> Test Tanımlama ve Ayarları
              </span>
              <span class="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                LGS Kuralı: 3Y = 1D
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div>
                <label class="block text-[10px] font-black text-slate-600 uppercase mb-0.5">BAŞLIK *</label>
                <input type="text" value="${this.escapeHtml(this.testMeta.title)}"
                  onchange="window.TestResultsModule.testMeta.title = this.value"
                  class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500">
              </div>

              <div>
                <label class="block text-[10px] font-black text-slate-600 uppercase mb-0.5">DERS *</label>
                <input type="text" list="subject-list" value="${this.escapeHtml(this.testMeta.subject)}"
                  onchange="window.TestResultsModule.testMeta.subject = this.value"
                  class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500">
                <datalist id="subject-list">
                  ${this.SUBJECT_OPTIONS.map(opt => `<option value="${opt}"></option>`).join('')}
                </datalist>
              </div>

              <div>
                <label class="block text-[10px] font-black text-slate-600 uppercase mb-0.5">ÜNİTE / KONU</label>
                <div class="grid grid-cols-2 gap-1.5">
                  <input type="text" placeholder="Ünite" value="${this.escapeHtml(this.testMeta.unit)}"
                    onchange="window.TestResultsModule.testMeta.unit = this.value"
                    class="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500">
                  <input type="text" placeholder="Konu" value="${this.escapeHtml(this.testMeta.topic)}"
                    onchange="window.TestResultsModule.testMeta.topic = this.value"
                    class="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500">
                </div>
              </div>

              <div>
                <label class="block text-[10px] font-black text-slate-600 uppercase mb-0.5">SORU SAYISI & TARİH</label>
                <div class="grid grid-cols-2 gap-1.5">
                  <input type="number" min="1" max="200" value="${this.testMeta.totalQuestions}"
                    onchange="window.TestResultsModule.testMeta.totalQuestions = parseInt(this.value, 10) || 20; window.TestResultsModule.recalculateAll();"
                    class="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:border-emerald-500 text-center">
                  <input type="date" value="${this.testMeta.date}"
                    onchange="window.TestResultsModule.testMeta.date = this.value"
                    class="w-full px-1.5 py-1.5 bg-white border border-slate-300 rounded-xl text-[11px] font-bold text-slate-800 focus:outline-none focus:border-emerald-500">
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- 3. Hızlı Sınıf Filtresi, Sıralama Butonu & Kaydet -->
        <div class="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-2xl shadow-xs border border-slate-200 no-print">
          <div class="flex flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar">
            ${this.renderClassFilterButtonsHtml()}

            <!-- ALDIĞI NOTA GÖRE SIRALA BUTONU -->
            <button type="button" onclick="window.TestResultsModule.toggleSort()"
              title="Öğrencileri aldıkları nota göre sıralar (1. en üstte)"
              class="px-2.5 py-1 rounded-xl text-[11px] font-black transition flex items-center gap-1 border shadow-2xs ${
                this.sortBy === 'score_desc' 
                  ? 'bg-amber-400 text-slate-950 border-amber-500 ring-2 ring-amber-300/40' 
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }">
              <span>${this.sortBy === 'score_desc' ? '🏆 Not Sıralı (1. ➔ Son)' : '🔤 İsim Sıralı'}</span>
            </button>
          </div>

          <div class="flex items-center gap-1.5 ml-auto">
            <input type="text" placeholder="Talebe ara..." value="${this.escapeHtml(this.searchQuery)}"
              oninput="window.TestResultsModule.searchQuery = this.value; window.TestResultsModule.render();"
              class="w-24 sm:w-32 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500">
            
            <button type="button" onclick="window.TestResultsModule.saveCurrentTest();"
              class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1">
              <span>💾</span>
              <span>Kaydet</span>
            </button>
          </div>
        </div>

        <!-- 4. EKRAN GÖRÜNTÜSÜ VE VELİ PAYLAŞIM ALANI (TAM GENİŞLİK, SIFIR SAĞA-SOLA KAYDIRMA) -->
        <div id="test-capture-card" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          <!-- Görsel Üst Başlığı -->
          <div class="p-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between border-b border-slate-700">
            <div class="truncate">
              <div class="text-xs sm:text-sm font-black text-amber-300 truncate">
                ${window.Store.getSettings().institutionName || 'Ömer Avniyel Akademi'}
              </div>
              <div class="text-[10px] text-slate-300 font-bold truncate">
                ${this.testMeta.subject} • ${this.testMeta.title} (${this.testMeta.totalQuestions} Soru)
              </div>
            </div>
            <div class="text-right flex-shrink-0 pl-2">
              <div class="text-[10px] text-emerald-300 font-bold font-mono">${this.testMeta.date}</div>
              <div class="text-[9px] text-slate-400 font-medium">${this.testMeta.unit || ''} ${this.testMeta.topic ? '• ' + this.testMeta.topic : ''}</div>
            </div>
          </div>

          <!-- MOBİL VE EKRAN GÖRÜNTÜSÜ TABLOSU (Sıfır Yatay Kaydırma, 12-15 Kişi Tek Ekrana Sığar) -->
          <div class="w-full overflow-hidden">
            <table class="w-full text-left border-collapse table-fixed text-xs">
              <thead>
                <tr class="bg-slate-100 text-[10px] sm:text-[11px] font-black uppercase text-slate-600 border-b border-slate-200 h-8">
                  <!-- Sıra & Öğrenci Adı -->
                  <th class="py-1 pl-2.5 pr-1 text-slate-700">Talebe ${this.sortBy === 'score_desc' ? '(Derece)' : ''}</th>
                  <!-- Doğru (D) -->
                  <th class="w-10 sm:w-12 py-1 px-0.5 text-center text-emerald-700 bg-emerald-50/70">✅ D</th>
                  <!-- Yanlış (Y) -->
                  <th class="w-10 sm:w-12 py-1 px-0.5 text-center text-rose-700 bg-rose-50/70">❌ Y</th>
                  <!-- Boş (B) -->
                  <th class="w-7 sm:w-9 py-1 px-0.5 text-center text-slate-500">⚪ B</th>
                  <!-- Net -->
                  <th class="w-11 sm:w-14 py-1 px-0.5 text-center text-blue-700 bg-blue-50/50">🎯 Net</th>
                  <!-- 100 Üzerinden Not -->
                  <th class="w-11 sm:w-14 py-1 px-0.5 text-center text-purple-700">⭐ Not</th>
                  <!-- Veli WhatsApp İkonu -->
                  <th class="w-8 sm:w-10 py-1 px-0.5 text-center text-emerald-700 no-print">📱</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-xs">
                ${students.length === 0 ? `
                  <tr>
                    <td colspan="7" class="py-8 text-center text-slate-400 font-bold text-xs">
                      Filtreye uygun öğrenci bulunamadı.
                    </td>
                  </tr>
                ` : students.map((st, idx) => {
                  const sc = this.scores[st.id] || this.calculateRow(st.id);
                  const badgeCls = this.getScoreBadgeClass(sc.score);
                  const isEvaluated = (sc.correct > 0 || sc.wrong > 0);

                  // Sıralama Madalyası / Sıra Numarası (Sadece nota göre sıralıyken)
                  let rankBadge = '';
                  if (this.sortBy === 'score_desc') {
                    if (isEvaluated) {
                      if (idx === 0) rankBadge = '<span class="text-xs">🥇</span>';
                      else if (idx === 1) rankBadge = '<span class="text-xs">🥈</span>';
                      else if (idx === 2) rankBadge = '<span class="text-xs">🥉</span>';
                      else rankBadge = `<span class="text-slate-500 font-mono text-[9px] font-bold">#${idx + 1}</span>`;
                    } else {
                      rankBadge = '<span class="text-slate-300 font-mono text-[9px]">-</span>';
                    }
                  }

                  return `
                    <tr class="hover:bg-slate-50/80 transition-colors h-8 sm:h-9">
                      <!-- 1. Derece, Talebe Adı & Sınıfı -->
                      <td class="py-1 pl-2 pr-1 truncate">
                        <div class="flex items-center gap-1 truncate">
                          ${rankBadge ? `<div class="w-4 text-center flex-shrink-0 leading-none">${rankBadge}</div>` : ''}
                          <div class="truncate">
                            <div class="font-bold text-slate-900 text-[11px] sm:text-xs truncate">
                              ${st.firstName} ${st.lastName}
                            </div>
                            <div class="text-[9px] text-slate-400 font-medium truncate leading-none mt-0.5">
                              ${st.className || ''} ${st.studentNo ? '• No: ' + st.studentNo : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      <!-- 2. Doğru (D) Girişi -->
                      <td class="py-0.5 px-0.5 text-center bg-emerald-50/20">
                        <input type="number" id="input-c-${st.id}" min="0" max="${this.testMeta.totalQuestions}" 
                          value="${sc.correct}"
                          oninput="window.TestResultsModule.handleInputChange('${st.id}', 'correct', this.value)"
                          onblur="window.TestResultsModule.handleInputBlur()"
                          class="w-8 sm:w-10 h-7 text-center font-black text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 p-0">
                      </td>

                      <!-- 3. Yanlış (Y) Girişi -->
                      <td class="py-0.5 px-0.5 text-center bg-rose-50/20">
                        <input type="number" id="input-w-${st.id}" min="0" max="${this.testMeta.totalQuestions}" 
                          value="${sc.wrong}"
                          oninput="window.TestResultsModule.handleInputChange('${st.id}', 'wrong', this.value)"
                          onblur="window.TestResultsModule.handleInputBlur()"
                          class="w-8 sm:w-10 h-7 text-center font-black text-rose-800 bg-rose-50 border border-rose-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 p-0">
                      </td>

                      <!-- 4. Otomatik Boş (B) -->
                      <td class="py-0.5 px-0.5 text-center font-mono text-[11px] text-slate-400 font-bold">
                        <span id="empty-badge-${st.id}">${sc.empty}</span>
                      </td>

                      <!-- 5. Otomatik Net -->
                      <td class="py-0.5 px-0.5 text-center font-mono font-black text-blue-700 text-[11px] sm:text-xs bg-blue-50/20">
                        <span id="net-badge-${st.id}">${sc.net.toFixed(1)}</span>
                      </td>

                      <!-- 6. 100 Notu -->
                      <td class="py-0.5 px-0.5 text-center">
                        <span id="score-badge-${st.id}" class="inline-block px-1.5 py-0.5 rounded-md font-black text-[11px] sm:text-xs border shadow-2xs ${badgeCls}">
                          ${sc.score}
                        </span>
                      </td>

                      <!-- 7. Veli WhatsApp Paylaşım -->
                      <td class="py-0.5 px-0.5 text-center no-print">
                        <button type="button" onclick="window.TestResultsModule.shareStudentViaWhatsApp('${st.id}')"
                          title="Veliye WhatsApp Karnesi Gönder"
                          class="w-6 h-6 rounded-md bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white inline-flex items-center justify-center text-xs border border-emerald-200 transition shadow-2xs">
                          📱
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>

              <!-- 5. EN ALT TABLO ÖZET SATIRI (DOĞRU, YANLIŞ, BOŞ, NET VE PUAN ORTALAMALARI) -->
              <tfoot class="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white font-black text-[10px] sm:text-[11px] border-t-2 border-amber-400">
                <tr class="h-10">
                  <td class="py-2 pl-2.5 pr-1 truncate">
                    <div class="text-amber-300 font-black text-[11px] flex items-center gap-1">
                      <span>📊</span>
                      <span>ORTALAMA</span>
                    </div>
                    <div id="footer-count" class="text-[9px] text-slate-300 font-normal truncate">
                      0 Talebe Değerlendirildi
                    </div>
                  </td>

                  <!-- Doğru Ortalaması -->
                  <td class="text-center py-2 px-0.5 bg-emerald-950/50 text-emerald-300 font-mono font-black" id="footer-avg-correct">
                    0.0
                  </td>

                  <!-- Yanlış Ortalaması -->
                  <td class="text-center py-2 px-0.5 bg-rose-950/50 text-rose-300 font-mono font-black" id="footer-avg-wrong">
                    0.0
                  </td>

                  <!-- Boş Ortalaması -->
                  <td class="text-center py-2 px-0.5 text-slate-300 font-mono font-bold" id="footer-avg-empty">
                    0.0
                  </td>

                  <!-- Net Ortalaması -->
                  <td class="text-center py-2 px-0.5 bg-blue-950/50 text-sky-300 font-mono font-black" id="footer-avg-net">
                    0.00
                  </td>

                  <!-- Puan Ortalaması (100 Üzerinden) -->
                  <td class="text-center py-2 px-0.5 bg-purple-950/50 text-yellow-300 font-black text-xs" id="footer-avg-score">
                    0
                  </td>

                  <!-- İkon -->
                  <td class="text-center py-2 px-0.5 text-amber-400 text-xs no-print">
                    ⭐
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>

        <!-- 6. Alt Bilgilendirme ve Sıralama İpucu -->
        <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 no-print">
          <div class="flex items-center gap-2">
            <span>💡</span>
            <span>Öğrenciler aldıkları nota göre <strong>1. den sona doğru otomatik sıralanır</strong> (🥇, 🥈, 🥉 madalyalarıyla görünür).</span>
          </div>

          <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button type="button" onclick="window.TestResultsModule.applySort();"
              class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1">
              <span>🏆</span>
              <span>Notları Hemen Sırala</span>
            </button>

            <button type="button" onclick="window.TestResultsModule.saveCurrentTest();"
              class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5">
              <span>💾</span>
              <span>Kaydet</span>
            </button>
          </div>
        </div>

      </div>
    `;

    this.updateSummaryCounters();
  },

  // 2. GEÇMİŞ TEST ARŞİVİ
  renderHistoryView(container) {
    const list = window.Store.getTestResults();

    container.innerHTML = `
      <div class="space-y-4 max-w-7xl mx-auto animate-fade-in pb-8 px-1 sm:px-2">
        <div class="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div>
            <h2 class="text-base font-black text-slate-900 flex items-center gap-2">
              <span>📚</span> Geçmiş Test ve Etüt Arşivi
            </h2>
            <p class="text-[11px] text-slate-500 mt-0.5">Daha önce kaydedilmiş tüm etüt testleri ve sınıf ortalamaları.</p>
          </div>

          <button type="button" onclick="window.TestResultsModule.activeView='editor'; window.TestResultsModule.render();"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5">
            <span>➕</span> Yeni Test Girişi
          </button>
        </div>

        ${list.length === 0 ? `
          <div class="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
            <div class="text-3xl">📭</div>
            <h3 class="text-sm font-black text-slate-700">Henüz Kaydedilmiş Test Bulunmuyor</h3>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            ${list.map(t => {
              const scoreKeys = Object.keys(t.scores || {});
              let sumScore = 0;
              let sumNet = 0;
              let evalCount = 0;

              scoreKeys.forEach(k => {
                const s = t.scores[k];
                if (s && (s.correct > 0 || s.wrong > 0)) {
                  sumScore += (s.score || 0);
                  sumNet += (s.net || 0);
                  evalCount++;
                }
              });

              const avgScore = evalCount > 0 ? Math.round(sumScore / evalCount) : 0;
              const avgNet = evalCount > 0 ? (sumNet / evalCount).toFixed(1) : '0.0';

              return `
                <div class="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center justify-between gap-2 mb-1.5">
                      <span class="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-blue-50 text-blue-800 border border-blue-200">
                        ${t.subject || 'Genel'}
                      </span>
                      <span class="text-[11px] font-bold text-slate-400 font-mono">📅 ${t.date || '-'}</span>
                    </div>

                    <h4 class="text-sm font-black text-slate-900 line-clamp-1">${t.title || 'Etüt Testi'}</h4>
                    ${t.unit || t.topic ? `<div class="text-[11px] text-slate-500 mt-0.5">${t.unit || ''} ${t.topic ? '• ' + t.topic : ''}</div>` : ''}

                    <div class="grid grid-cols-3 gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-100 text-center mt-2.5">
                      <div>
                        <div class="text-[9px] text-slate-400 font-bold uppercase">Soru</div>
                        <div class="text-xs font-black text-slate-800">${t.totalQuestions || 20}</div>
                      </div>
                      <div>
                        <div class="text-[9px] text-slate-400 font-bold uppercase">Ort. Net</div>
                        <div class="text-xs font-black text-emerald-700">${avgNet}</div>
                      </div>
                      <div>
                        <div class="text-[9px] text-slate-400 font-bold uppercase">Ort. Not</div>
                        <div class="text-xs font-black text-purple-700">${avgScore}</div>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button type="button" onclick="window.TestResultsModule.loadTestForEdit('${t.id}')"
                      class="flex-1 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white rounded-xl font-bold text-xs transition text-center shadow-2xs">
                      ✏️ Düzenle / Gör
                    </button>
                    <button type="button" onclick="window.TestResultsModule.deleteTest('${t.id}')"
                      class="py-1.5 px-2.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-xl font-bold text-xs transition shadow-2xs"
                      title="Testi Sil">
                      🗑️
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  },

  getEtutSubeleri() {
    return [
      { id: '5-A|YASİN EKİNCİ', label: '5-A • Yasin Ekinci', grade: '5', branch: '5-A', hoca: 'YASİN EKİNCİ' },
      { id: '5-B|AHMED MUBARİZ', label: '5-B • Ahmed Mubariz', grade: '5', branch: '5-B', hoca: 'AHMED MUBARİZ' },
      { id: '6-A|ABDUSSAMED TAV', label: '6-A • Abdussamed Tav (Oda 201)', grade: '6', branch: '6-A', hoca: 'ABDUSSAMED TAV' },
      { id: '6-B|ABDUSSAMED TAV', label: '6-B • Abdussamed Tav (Oda 202)', grade: '6', branch: '6-B', hoca: 'ABDUSSAMED TAV' },
      { id: '7-A|EMİR TALHA TARIM', label: '7-A • Emir Talha Tarım', grade: '7', branch: '7-A', hoca: 'EMİR TALHA TARIM' },
      { id: '7-B|BURAK BODUR', label: '7-B • Burak Bodur', grade: '7', branch: '7-B', hoca: 'BURAK BODUR' },
      { id: '8-A|TUNAHAN TAŞKIN', label: '8-A • Tunahan Taşkın', grade: '8', branch: '8-A', hoca: 'TUNAHAN TAŞKIN' },
      { id: '8-B|YAVUZ SELİM SEVEN', label: '8-B • Yavuz Selim Seven', grade: '8', branch: '8-B', hoca: 'YAVUZ SELİM SEVEN' }
    ];
  },

  selectGrade(gradeNum) {
    if (this.selectedGrade === gradeNum) {
      this.selectedGrade = 'ALL';
    } else {
      this.selectedGrade = gradeNum;
    }
    if (this.selectedEtut !== 'ALL') {
      const etut = this.getEtutSubeleri().find(e => e.id === this.selectedEtut);
      if (etut && this.selectedGrade !== 'ALL' && etut.grade !== this.selectedGrade) {
        this.selectedEtut = 'ALL';
      }
    }
    this.render();
    if (window.App && typeof window.App.renderHeader === 'function') {
      window.App.renderHeader();
    }
  },

  setEtutFilter(etutId) {
    this.selectedEtut = etutId;
    if (etutId !== 'ALL') {
      const etut = this.getEtutSubeleri().find(e => e.id === etutId);
      if (etut) {
        this.selectedGrade = etut.grade;
      }
    }
    this.render();
    if (window.App && typeof window.App.renderHeader === 'function') {
      window.App.renderHeader();
    }
  },

  toggleAll() {
    this.selectedGrade = 'ALL';
    this.selectedEtut = 'ALL';
    this.selectedClass = 'ALL';
    this.render();
    if (window.App && typeof window.App.renderHeader === 'function') {
      window.App.renderHeader();
    }
  },

  getFilterHeaderLabel() {
    if (this.selectedEtut && this.selectedEtut !== 'ALL') {
      const etut = this.getEtutSubeleri().find(e => e.id === this.selectedEtut);
      return etut ? `Etüt Şubesi: ${etut.label}` : 'Etüt Şubesi';
    }
    if (this.selectedGrade && this.selectedGrade !== 'ALL') {
      return `Sınıf: ${this.selectedGrade}. Sınıf (Tüm Şubeler)`;
    }
    return 'Tüm Sınıflar & Etütler';
  },

  renderClassFilterButtonsHtml() {
    const etutList = this.getEtutSubeleri();
    const isAll = (!this.selectedGrade || this.selectedGrade === 'ALL') && 
                  (!this.selectedEtut || this.selectedEtut === 'ALL');

    let html = `
      <div class="flex flex-wrap items-center gap-2">
        <!-- 1. Sınıf Seviyesi Seçimi -->
        <div class="inline-flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200 shadow-2xs">
          <button type="button" onclick="window.TestResultsModule.toggleAll()"
            class="px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer ${
              isAll 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-700 hover:bg-white hover:text-slate-900'
            }">
            Tümü
          </button>
          ${['5', '6', '7', '8'].map(g => {
            const isGActive = this.selectedGrade === g && (this.selectedEtut === 'ALL' || !this.selectedEtut);
            return `
              <button type="button" onclick="window.TestResultsModule.selectGrade('${g}')"
                class="px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer ${
                  isGActive 
                    ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-400' 
                    : 'text-slate-700 hover:bg-white hover:text-emerald-900'
                }">
                ${g}. Sınıf
              </button>
            `;
          }).join('')}
        </div>

        <!-- 2. Etüt Şubesi Açılır Seçimi -->
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase flex items-center gap-1">
            <span>📖</span>
            <span>Etüt Şubesi:</span>
          </span>
          <select onchange="window.TestResultsModule.setEtutFilter(this.value)"
            class="px-2.5 py-1 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer">
            <option value="ALL" ${(!this.selectedEtut || this.selectedEtut === 'ALL') ? 'selected' : ''}>
              Tüm Etüt Şubeleri
            </option>
            ${['5', '6', '7', '8'].map(g => {
              const subeler = etutList.filter(e => e.grade === g);
              return `
                <optgroup label="${g}. Sınıf Etüt Şubeleri">
                  ${subeler.map(e => `
                    <option value="${e.id}" ${this.selectedEtut === e.id ? 'selected' : ''}>
                      ${e.label}
                    </option>
                  `).join('')}
                </optgroup>
              `;
            }).join('')}
          </select>
        </div>

        <!-- 3. Seçili Sınıfın Hızlı Etüt Butonları -->
        ${this.selectedGrade && this.selectedGrade !== 'ALL' ? `
          <div class="inline-flex items-center gap-1.5 bg-emerald-50/70 p-0.5 px-1.5 rounded-xl border border-emerald-200">
            <span class="text-[10px] font-black text-emerald-900">${this.selectedGrade}. Sınıf Etütleri:</span>
            ${etutList.filter(e => e.grade === this.selectedGrade).map(e => {
              const isActive = this.selectedEtut === e.id;
              return `
                <button type="button" onclick="window.TestResultsModule.setEtutFilter('${e.id}')"
                  class="px-2 py-0.5 rounded-lg text-[11px] font-bold transition border cursor-pointer ${
                    isActive 
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-1 ring-emerald-400' 
                      : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-600 hover:text-white'
                  }">
                  ${e.label}
                </button>
              `;
            }).join('')}
          </div>
        ` : ''}
      </div>
    `;

    return html;
  },

  filterClass(cls) {
    if (cls === 'ALL') {
      this.toggleAll();
    } else {
      this.selectGrade(cls.replace('GRADE_', ''));
    }
  },

  resetForm() {
    this.currentTestId = null;
    this.testMeta = {
      title: 'Haftalık Etüt Tarama Testi',
      subject: 'Matematik',
      unit: '',
      topic: '',
      date: new Date().toISOString().split('T')[0],
      totalQuestions: 20,
      wrongPenalty: 3
    };
    this.scores = {};
    this.ensureStudentScores();
    this.render();
  },

  loadTestForEdit(testId) {
    const test = window.Store.getTestResultById(testId);
    if (!test) return;

    this.currentTestId = test.id;
    this.testMeta = {
      title: test.title || 'Etüt Testi',
      subject: test.subject || 'Matematik',
      unit: test.unit || '',
      topic: test.topic || '',
      date: test.date || new Date().toISOString().split('T')[0],
      totalQuestions: test.totalQuestions || 20,
      wrongPenalty: test.wrongPenalty !== undefined ? test.wrongPenalty : 3
    };

    this.scores = {};
    const students = window.Store.getStudents();
    students.forEach(st => {
      if (test.scores && test.scores[st.id]) {
        this.scores[st.id] = { ...test.scores[st.id] };
      } else {
        this.scores[st.id] = {
          correct: 0,
          wrong: 0,
          empty: this.testMeta.totalQuestions,
          net: 0,
          score: 0,
          note: ''
        };
      }
    });

    this.activeView = 'editor';
    this.render();
  },

  saveCurrentTest() {
    const session = window.App.currentSession;
    const author = session ? (session.name || 'Öğretmen') : 'Eğitmen';

    if (!this.testMeta.title || !this.testMeta.title.trim()) {
      alert('⚠️ Lütfen bir test başlığı giriniz.');
      return;
    }

    const testRecord = {
      id: this.currentTestId,
      title: this.testMeta.title.trim(),
      subject: this.testMeta.subject.trim(),
      unit: this.testMeta.unit.trim(),
      topic: this.testMeta.topic.trim(),
      date: this.testMeta.date,
      totalQuestions: parseInt(this.testMeta.totalQuestions, 10) || 20,
      wrongPenalty: parseFloat(this.testMeta.wrongPenalty) || 0,
      scores: this.scores,
      author: author
    };

    const saved = window.Store.saveTestResult(testRecord);
    this.currentTestId = saved.id;

    alert(`✅ "${saved.title}" başlıklı test sonuçları başarıyla kaydedildi!`);
  },

  deleteTest(testId) {
    if (!confirm('Bu test kaydını ve sonuçlarını silmek istediğinize emin misiniz?')) {
      return;
    }
    window.Store.deleteTestResult(testId);
    this.render();
  },

  shareStudentViaWhatsApp(studentId) {
    const students = window.Store.getStudents();
    const st = students.find(s => s.id === studentId);
    if (!st) return;

    const sc = this.scores[studentId] || this.calculateRow(studentId);
    const settings = window.Store.getSettings();
    const instName = settings.institutionName || 'Ömer Avniyel Akademi';
    const grade = this.getGradeLabel(sc.score);

    let msg = `*${instName}*\n`;
    msg += `📋 *ETÜT TEST VE SORU TAKİP RAPORU*\n\n`;
    msg += `👤 *Öğrenci:* ${st.firstName} ${st.lastName} (${st.className || ''})\n`;
    msg += `📅 *Tarih:* ${this.testMeta.date}\n`;
    msg += `📝 *Test Başlığı:* ${this.testMeta.title}\n`;
    msg += `📚 *Ders:* ${this.testMeta.subject}\n`;
    if (this.testMeta.unit) msg += `📖 *Ünite:* ${this.testMeta.unit}\n`;
    if (this.testMeta.topic) msg += `🎯 *Konu:* ${this.testMeta.topic}\n`;
    msg += `\n`;
    msg += `📊 *Toplam Soru:* ${this.testMeta.totalQuestions}\n`;
    msg += `✅ *Doğru (D):* ${sc.correct}\n`;
    msg += `❌ *Yanlış (Y):* ${sc.wrong}\n`;
    msg += `⚪ *Boş (B):* ${sc.empty}\n`;
    msg += `🎯 *Net:* ${sc.net.toFixed(2)}\n`;
    msg += `⭐ *100 Üzerinden Not:* ${sc.score} / 100 (${grade})\n\n`;
    msg += `Talebemizi gayretinden dolayı tebrik eder, başarılarının devamını dileriz.`;

    const encoded = encodeURIComponent(msg);
    const phone = (st.parentPhone || '').replace(/\D/g, '');
    let url = `https://api.whatsapp.com/send?text=${encoded}`;
    if (phone && phone.length >= 10) {
      const fullPhone = phone.startsWith('90') ? phone : ('90' + phone.replace(/^0/, ''));
      url = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encoded}`;
    }

    window.open(url, '_blank');
  },

  // Tek tıkla veli listesi görselini indir (html2canvas)
  downloadTableImage() {
    const el = document.getElementById('test-capture-card');
    if (!el) return;

    if (typeof html2canvas === 'undefined') {
      alert('Görüntü oluşturma aracı yükleniyor, lütfen birkaç saniye sonra tekrar deneyiniz.');
      return;
    }

    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 z-50 px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs shadow-xl animate-fade-in flex items-center gap-2';
    toast.innerHTML = '<span>📸</span> <span>Veli listesi görseli hazırlanıyor...</span>';
    document.body.appendChild(toast);

    html2canvas(el, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: '#ffffff'
    }).then(canvas => {
      toast.remove();
      const link = document.createElement('a');
      const cleanSub = (this.testMeta.subject || 'Ders').replace(/\s+/g, '_');
      const cleanTitle = (this.testMeta.title || 'Test').replace(/\s+/g, '_');
      link.download = `${cleanSub}_${cleanTitle}_Net_Listesi.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }).catch(err => {
      toast.remove();
      alert('Görsel oluşturulamadı: ' + err.message);
    });
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};
