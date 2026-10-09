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
  sortBy: 'name',         // Varsayılan: İsim Sırası (Giriş yaparken sıçrama ve yer değiştirmeleri %100 önler)
  
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
  existingAllScores: {},

  // Filtreler
  selectedGrade: 'ALL',          // 'ALL' | '5' | '6' | '7' | '8'
  selectedEtut: 'ALL',           // 'ALL' | '5-A|YASİN EKİNCİ' vb.
  selectedClass: 'ALL',          // Geriye dönük uyumluluk
  selectedClasses: [],           // Çoklu seçim desteği (5-A, 5-B vb.)
  searchQuery: '',

  // Geçmiş Arşiv Görünüm & Gruplama Durumları (Yönetici & Eğitmen)
  historyGroupBy: 'hoca',        // 'hoca' | 'class' | 'list'
  historyFilterHoca: 'ALL',      // 'ALL' | Hoca Adı
  historyFilterClass: 'ALL',     // 'ALL' | '5-A' vb.
  historyFilterSubject: 'ALL',   // 'ALL' | 'Matematik' vb.
  historySearchQuery: '',
  historyCollapsed: {},          // { [groupKey]: boolean }

  TEACHER_DEFINITIONS: [
    { name: 'YASİN EKİNCİ', title: 'Yasin Ekinci', classes: ['5-A'], grade: '5', color: 'emerald', icon: '👔' },
    { name: 'AHMED MUBARİZ', title: 'Ahmed Mubariz', classes: ['5-B'], grade: '5', color: 'teal', icon: '👔' },
    { name: 'ABDUSSAMED TAV', title: 'Abdussamed Tav', classes: ['6-A', '6-B'], grade: '6', color: 'blue', icon: '👔' },
    { name: 'EMİR TALHA TARIM', title: 'Emir Talha Tarım', classes: ['7-A'], grade: '7', color: 'indigo', icon: '👔' },
    { name: 'BURAK BODUR', title: 'Burak Bodur', classes: ['7-B'], grade: '7', color: 'purple', icon: '👔' },
    { name: 'YAVUZ SELİM SEVEN', title: 'Yavuz Selim Seven', classes: ['8-A'], grade: '8', color: 'amber', icon: '👔' },
    { name: 'TUNAHAN TAŞKIN', title: 'Tunahan Taşkın', classes: ['8-B'], grade: '8', color: 'rose', icon: '👔' }
  ],

  CLASS_TEACHER_MAP: {
    '5-A': 'YASİN EKİNCİ',
    '5-B': 'AHMED MUBARİZ',
    '6-A': 'ABDUSSAMED TAV',
    '6-B': 'ABDUSSAMED TAV',
    '7-A': 'EMİR TALHA TARIM',
    '7-B': 'BURAK BODUR',
    '8-A': 'YAVUZ SELİM SEVEN',
    '8-B': 'TUNAHAN TAŞKIN'
  },

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
    const students = (window.Store && typeof window.Store.getStudentsForActiveUser === 'function')
      ? window.Store.getStudentsForActiveUser()
      : window.Store.getStudents();
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
    const scrollY = window.scrollY;
    this.sortBy = this.sortBy === 'score_desc' ? 'name' : 'score_desc';
    this.render();
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  },

  applySort() {
    const scrollY = window.scrollY;
    this.sortBy = 'score_desc';
    this.render();
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  },

  getCurrentlyDisplayedStudents() {
    let students = (window.Store && typeof window.Store.getStudentsForActiveUser === 'function')
      ? window.Store.getStudentsForActiveUser()
      : window.Store.getStudents();

    // 1. Çoklu Şube / Sınıf Filtresi (5-A, 5-B vb.)
    if (this.selectedClasses && this.selectedClasses.length > 0) {
      const selUpper = this.selectedClasses.map(c => c.trim().toUpperCase());
      students = students.filter(s => {
        const cls = (s.className || '').trim().toUpperCase();
        return selUpper.includes(cls);
      });
    } else if (this.selectedGrade && this.selectedGrade !== 'ALL') {
      students = students.filter(s => {
        const cls = (s.className || '').trim();
        return cls === `${this.selectedGrade}. Sınıf` ||
               cls.startsWith(`${this.selectedGrade}-`) ||
               cls.startsWith(`${this.selectedGrade} `) ||
               cls === this.selectedGrade;
      });
    }

    // 2. Etüt Şubesi Filtresi
    if ((!this.selectedClasses || this.selectedClasses.length === 0) && this.selectedEtut && this.selectedEtut !== 'ALL') {
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
      // SABİT LİSTE SIRASI: Sınıf -> Okul No -> İsim (Hoca sırala demediği sürece asla yer değiştirmez)
      students.sort((a, b) => {
        const clsComp = (a.className || '').localeCompare(b.className || '', 'tr', { numeric: true });
        if (clsComp !== 0) return clsComp;
        const noA = parseInt(a.studentNo, 10) || 0;
        const noB = parseInt(b.studentNo, 10) || 0;
        if (noA !== 0 && noB !== 0 && noA !== noB) return noA - noB;
        return (a.firstName || '').localeCompare(b.firstName || '', 'tr');
      });
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

    // Input değerini sadece odaklanılmamış kutuda ve sınır aşımı varsa düzelt (yazarken imleci ASLA bozma)
    const activeEl = document.activeElement;
    const cInput = document.getElementById(`input-c-${studentId}`);
    if (cInput && cInput !== activeEl && cInput.value !== '' && parseInt(cInput.value, 10) !== updated.correct) {
      cInput.value = updated.correct;
    }
    const wInput = document.getElementById(`input-w-${studentId}`);
    if (wInput && wInput !== activeEl && wInput.value !== '' && parseInt(wInput.value, 10) !== updated.wrong) {
      wInput.value = updated.wrong;
    }

    this.updateSummaryCounters();
  },

  // Giriş tamamlanıp kutudan çıkıldığında (blur)
  handleInputBlur(studentId) {
    if (studentId) {
      const updated = this.calculateRow(studentId);
      const cInput = document.getElementById(`input-c-${studentId}`);
      if (cInput && cInput.value !== '') {
        cInput.value = updated.correct;
      }
      const wInput = document.getElementById(`input-w-${studentId}`);
      if (wInput && wInput.value !== '') {
        wInput.value = updated.wrong;
      }
    }
    this.updateSummaryCounters();
    // NOT: Kullanıcı kutudan çıktığında sayfayı ASLA yeniden çizme!
    // Sayfa yeniden çizilirse sayfa başa zıplar ve mobil klavye kapanır.
  },

  // Klavye ile hücreler arası hızlı geçiş (Enter: Yanlış kutusuna veya alt öğrenciye geçer)
  handleKeyDown(e, studentId, field, rowIdx) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'correct') {
        const wInput = document.getElementById(`input-w-${studentId}`);
        if (wInput) {
          wInput.focus();
          wInput.select();
        }
      } else {
        const nextInput = document.querySelector(`input[data-row-idx="${rowIdx + 1}"][data-field="correct"]`);
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.querySelector(`input[data-row-idx="${rowIdx + 1}"][data-field="${field}"]`);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.querySelector(`input[data-row-idx="${rowIdx - 1}"][data-field="${field}"]`);
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
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

  // ========================================================
  // 0. AKADEMİ & DERSLER ÜST NAVİGASYON ÇUBUĞU
  // ========================================================
  renderTopTabsHtml(active = 'testler') {
    return `
      <!-- AKADEMİ & DERSLER HIZLI GEÇİŞ SEKMELERİ -->
      <div class="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-2 overflow-x-auto no-scrollbar no-print mb-1">
        <div class="flex items-center gap-1.5 flex-1 min-w-max">
          <button type="button" onclick="window.App.navigateFromDrawer('akademi', 'takviye')"
            class="px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${active === 'takviye' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
            <span>📚</span>
            <span>Takviye Ders Notları</span>
          </button>

          <button type="button" onclick="window.TestResultsModule.activeView='editor'; window.TestResultsModule.render();"
            class="px-3 py-1.5 rounded-xl font-black text-xs transition flex items-center gap-1.5 cursor-pointer ${active === 'testler' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
            <span>📝</span>
            <span>Test Neticeleri & Etüt</span>
          </button>

          <button type="button" onclick="window.App.navigateFromDrawer('denemeler')"
            class="px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${active === 'denemeler' ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
            <span>🎯</span>
            <span>Deneme Sınavları (LGS 500P)</span>
          </button>
        </div>
      </div>
    `;
  },

  // 1. TEST GİRİŞ & DÜZENLEME EKRANI (MOBİL & NOT SIRALAMALI)
  renderEditorView(container) {
    const classes = window.Store.getClasses();
    const students = this.getCurrentlyDisplayedStudents();

    container.innerHTML = `
      <div class="space-y-3 sm:space-y-4 max-w-7xl mx-auto animate-fade-in pb-8 px-1 sm:px-2">
        
        <!-- Akademi Üst Sekmeleri -->
        ${this.renderTopTabsHtml('testler')}

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

            <!-- 📷 CANLI OPTİK OKU -->
            <button type="button" onclick="window.OMRScanner.openCameraScanner()"
              title="Telefon veya bilgisayar kamerasıyla QR kodlu optik formları canlı tara"
              class="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] sm:text-xs flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer">
              <span>📷</span>
              <span>Optik Oku</span>
            </button>

            <!-- 🔑 CEVAP ANAHTARI (A/B) -->
            <button type="button" onclick="window.OMRScanner.openAnswerKeyModal()"
              title="A ve B kitapçığı cevap anahtarlarını tanımla"
              class="px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] sm:text-xs flex items-center gap-1 transition cursor-pointer">
              <span>🔑</span>
              <span class="hidden md:inline">Cevap Anahtarı</span>
            </button>

            <!-- 🖨️ QR'LI OPTİK FORM YAZDIR (A4) -->
            <button type="button" onclick="window.OMRScanner.openPrintModal()"
              title="Talebelerin QR kodlu optik cevap formlarını A4 olarak yazdır"
              class="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] sm:text-xs flex items-center gap-1 transition cursor-pointer">
              <span>🖨️</span>
              <span class="hidden md:inline">Optik Yazdır</span>
            </button>

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

            <!-- 🎯 Deneme Sınavları (500P) Geçiş Butonu -->
            <button type="button" onclick="window.App.navigateFromDrawer('denemeler')"
              title="LGS 500 Puanlı ve MEB Kazanımlı Deneme Sınavları Modülüne Geç"
              class="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-black text-[11px] sm:text-xs flex items-center gap-1 transition cursor-pointer">
              <span>🎯</span>
              <span class="hidden md:inline">Deneme Sınavı</span>
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
              <span>${this.sortBy === 'score_desc' ? '🏆 Not Sıralı (1. ➔ Son)' : '📋 Sabit Liste Sırası'}</span>
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
                          data-row-idx="${idx}"
                          data-field="correct"
                          data-student-id="${st.id}"
                          value="${sc.correct}"
                          oninput="window.TestResultsModule.handleInputChange('${st.id}', 'correct', this.value)"
                          onblur="window.TestResultsModule.handleInputBlur('${st.id}')"
                          onkeydown="window.TestResultsModule.handleKeyDown(event, '${st.id}', 'correct', ${idx})"
                          class="w-8 sm:w-10 h-7 text-center font-black text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 p-0">
                      </td>

                      <!-- 3. Yanlış (Y) Girişi -->
                      <td class="py-0.5 px-0.5 text-center bg-rose-50/20">
                        <input type="number" id="input-w-${st.id}" min="0" max="${this.testMeta.totalQuestions}" 
                          data-row-idx="${idx}"
                          data-field="wrong"
                          data-student-id="${st.id}"
                          value="${sc.wrong}"
                          oninput="window.TestResultsModule.handleInputChange('${st.id}', 'wrong', this.value)"
                          onblur="window.TestResultsModule.handleInputBlur('${st.id}')"
                          onkeydown="window.TestResultsModule.handleKeyDown(event, '${st.id}', 'wrong', ${idx})"
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

  // --- Kategori & Bilgi Çözümleyici Yardımcı Metodlar ---
  getTestCategorizationInfo(t) {
    const classes = new Set();
    const hocalar = new Set();

    if (Array.isArray(t.targetClasses)) {
      t.targetClasses.forEach(c => { if (c) classes.add(c.trim().toUpperCase()); });
    }
    if (Array.isArray(t.etutHocalari)) {
      t.etutHocalari.forEach(h => { if (h) hocalar.add(h.trim().toUpperCase()); });
    }

    const scoresObj = t.scores || {};
    const scoreKeys = Object.keys(scoresObj);
    let totalEvaluated = 0;
    let sumScore = 0;
    let sumNet = 0;

    const evaluatedStudentIds = [];
    scoreKeys.forEach(stId => {
      const s = scoresObj[stId];
      const hasAttempt = s && (s.correct > 0 || s.wrong > 0 || (s.score !== undefined && s.score > 0));
      if (hasAttempt) {
        totalEvaluated++;
        sumScore += (s.score || 0);
        sumNet += (s.net || 0);
        evaluatedStudentIds.push(stId);
      }
    });

    if (evaluatedStudentIds.length > 0) {
      evaluatedStudentIds.forEach(stId => {
        const st = window.Store.getStudentById(stId);
        if (st) {
          if (st.className) classes.add(st.className.trim().toUpperCase());
          if (st.etutHocasi) hocalar.add(st.etutHocasi.trim().toUpperCase());
        }
      });
    } else {
      scoreKeys.forEach(stId => {
        const st = window.Store.getStudentById(stId);
        if (st) {
          if (st.className) classes.add(st.className.trim().toUpperCase());
          if (st.etutHocasi) hocalar.add(st.etutHocasi.trim().toUpperCase());
        }
      });
    }

    if (t.author) {
      const authNorm = t.author.trim().toUpperCase();
      this.TEACHER_DEFINITIONS.forEach(td => {
        if (authNorm.includes(td.name) || td.name.includes(authNorm)) {
          hocalar.add(td.name);
          td.classes.forEach(c => classes.add(c));
        }
      });
    }

    // Sınıf -> Hoca eşlemesi
    classes.forEach(cls => {
      const matchedHoca = this.CLASS_TEACHER_MAP[cls];
      if (matchedHoca) hocalar.add(matchedHoca);
    });

    // Hoca -> Sınıf eşlemesi
    hocalar.forEach(h => {
      const td = this.TEACHER_DEFINITIONS.find(tDef => tDef.name === h);
      if (td && td.classes) {
        td.classes.forEach(c => classes.add(c));
      }
    });

    const avgScore = totalEvaluated > 0 ? Math.round(sumScore / totalEvaluated) : 0;
    const avgNet = totalEvaluated > 0 ? (sumNet / totalEvaluated).toFixed(1) : '0.0';

    return {
      classes: Array.from(classes).sort(),
      hocalar: Array.from(hocalar).sort(),
      evaluatedCount: totalEvaluated,
      totalStudents: scoreKeys.length,
      avgScore,
      avgNet
    };
  },

  getSubjectBadgeClass(subject) {
    const s = (subject || '').toLowerCase();
    if (s.includes('matematik')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s.includes('türkçe') || s.includes('turkce')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (s.includes('fen')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s.includes('sosyal') || s.includes('inkılap') || s.includes('tarih')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s.includes('ingilizce')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (s.includes('din')) return 'bg-teal-50 text-teal-700 border-teal-200';
    if (s.includes('arapça') || s.includes('arapca')) return 'bg-lime-50 text-lime-700 border-lime-200';
    return 'bg-purple-50 text-purple-700 border-purple-200';
  },

  getSubjectIcon(subject) {
    const s = (subject || '').toLowerCase();
    if (s.includes('matematik')) return '📐';
    if (s.includes('türkçe') || s.includes('turkce')) return '📖';
    if (s.includes('fen')) return '🔬';
    if (s.includes('sosyal') || s.includes('tarih') || s.includes('inkılap')) return '🌍';
    if (s.includes('ingilizce')) return '🇬🇧';
    if (s.includes('din')) return '🕌';
    if (s.includes('arapça') || s.includes('arapca')) return '📜';
    return '📝';
  },

  setHistoryGroupBy(mode) {
    this.historyGroupBy = mode;
    this.render();
  },

  setHistoryFilterHoca(h) {
    this.historyFilterHoca = h;
    this.render();
  },

  setHistoryFilterClass(c) {
    this.historyFilterClass = c;
    this.render();
  },

  setHistoryFilterSubject(s) {
    this.historyFilterSubject = s;
    this.render();
  },

  setHistorySearchQuery(q) {
    this.historySearchQuery = q;
    this.render();
    const searchInput = document.getElementById('history-search-input');
    if (searchInput) {
      searchInput.focus();
      const val = searchInput.value;
      searchInput.setSelectionRange(val.length, val.length);
    }
  },

  toggleHistoryCollapse(key) {
    if (!this.historyCollapsed) this.historyCollapsed = {};
    this.historyCollapsed[key] = !this.historyCollapsed[key];
    this.render();
  },

  resetHistoryFilters() {
    this.historyFilterHoca = 'ALL';
    this.historyFilterClass = 'ALL';
    this.historyFilterSubject = 'ALL';
    this.historySearchQuery = '';
    this.render();
  },

  renderHistoryTestCardHtml(t, info, canDelete) {
    const badgeClass = this.getSubjectBadgeClass(t.subject);
    const subIcon = this.getSubjectIcon(t.subject);
    const classesBadge = info.classes.length > 0 ? info.classes.join(', ') : 'Genel';
    const hocalarBadge = info.hocalar.length > 0 ? info.hocalar.map(h => {
      const parts = h.split(' ');
      return parts[0] + (parts[1] ? ' ' + parts[1][0] + '.' : '');
    }).join(', ') : '';

    return `
      <div class="bg-white rounded-2xl shadow-xs border border-slate-200/90 hover:border-emerald-400 hover:shadow-md transition-all p-4 flex flex-col justify-between space-y-3 group">
        <div>
          <!-- Üst Rozetler: Ders ve Tarih -->
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border flex items-center gap-1 ${badgeClass}">
              <span>${subIcon}</span>
              <span>${this.escapeHtml(t.subject || 'Genel')}</span>
            </span>
            <span class="text-[11px] font-bold text-slate-400 font-mono flex items-center gap-1">
              <span>📅</span>
              <span>${t.date || '-'}</span>
            </span>
          </div>

          <!-- Başlık & Ünite/Konu -->
          <h4 class="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1" title="${this.escapeHtml(t.title || 'Etüt Testi')}">
            ${this.escapeHtml(t.title || 'Etüt Testi')}
          </h4>
          ${(t.unit || t.topic) ? `
            <div class="text-[11px] text-slate-500 mt-0.5 line-clamp-1" title="${this.escapeHtml((t.unit || '') + (t.topic ? ' • ' + t.topic : ''))}">
              ${this.escapeHtml(t.unit || '')} ${t.topic ? '• ' + this.escapeHtml(t.topic) : ''}
            </div>
          ` : ''}

          <!-- Şube & Hoca Etiketi -->
          <div class="flex flex-wrap items-center gap-1 mt-2.5">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
              <span>🏫</span> ${classesBadge}
            </span>
            ${hocalarBadge ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span>👔</span> ${hocalarBadge}
              </span>
            ` : ''}
          </div>

          <!-- Metrik Kutusu: Soru, Katılım, Ort. Net, Ort. Not -->
          <div class="grid grid-cols-4 gap-1 bg-slate-50 p-2 rounded-xl border border-slate-100 text-center mt-3">
            <div>
              <div class="text-[9px] text-slate-400 font-bold uppercase">Soru</div>
              <div class="text-xs font-black text-slate-800">${t.totalQuestions || 20}</div>
            </div>
            <div>
              <div class="text-[9px] text-slate-400 font-bold uppercase">Katılım</div>
              <div class="text-xs font-black text-blue-700">${info.evaluatedCount} <span class="text-[9px] font-normal text-slate-400">Talebe</span></div>
            </div>
            <div>
              <div class="text-[9px] text-slate-400 font-bold uppercase">Ort. Net</div>
              <div class="text-xs font-black text-emerald-700">${info.avgNet}</div>
            </div>
            <div>
              <div class="text-[9px] text-slate-400 font-bold uppercase">Ort. Not</div>
              <div class="text-xs font-black text-purple-700">${info.avgScore}</div>
            </div>
          </div>
        </div>

        <!-- Alt Aksiyon Butonları -->
        <div class="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button type="button" onclick="window.TestResultsModule.loadTestForEdit('${t.id}')"
            class="flex-1 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white rounded-xl font-black text-xs transition text-center shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer">
            <span>✏️</span> Düzenle / Gör
          </button>
          ${canDelete ? `
            <button type="button" onclick="window.TestResultsModule.deleteTest('${t.id}')"
              class="py-1.5 px-2.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-xl font-black text-xs transition shadow-2xs cursor-pointer"
              title="Testi Sil">
              🗑️
            </button>
          ` : ''}
        </div>
      </div>
    `;
  },

  // 2. GEÇMİŞ TEST ARŞİVİ (YÖNETİCİ & EĞİTMEN İÇİN HOCA VE SINIFLARA GÖRE KATEGORİZE)
  renderHistoryView(container) {
    let allTests = window.Store.getTestResults();
    const isAdmin = !(window.Store && typeof window.Store.isCurrentUserAdmin === 'function') || window.Store.isCurrentUserAdmin();
    let myStudentIdSet = null;

    if (!isAdmin) {
      const myStudents = window.Store.getStudentsForActiveUser();
      myStudentIdSet = new Set(myStudents.map(s => s.id));
      allTests = allTests.filter(t => {
        if (window.App && window.App.currentSession && t.author === window.App.currentSession.name) return true;
        if (!t.scores) return false;
        return Object.keys(t.scores).some(id => myStudentIdSet.has(id));
      });
    }

    const allItems = allTests.map(t => ({
      test: t,
      info: this.getTestCategorizationInfo(t)
    }));

    // Genel Kurs İstatistikleri (KPI)
    const totalTestsCount = allItems.length;
    let totalEvaluatedExams = 0;
    let totalNetSum = 0;
    let totalScoreSum = 0;
    let evalExamCount = 0;

    allItems.forEach(item => {
      totalEvaluatedExams += item.info.evaluatedCount;
      if (item.info.evaluatedCount > 0) {
        totalNetSum += parseFloat(item.info.avgNet) * item.info.evaluatedCount;
        totalScoreSum += item.info.avgScore * item.info.evaluatedCount;
        evalExamCount += item.info.evaluatedCount;
      }
    });

    const overallAvgNet = evalExamCount > 0 ? (totalNetSum / evalExamCount).toFixed(1) : '0.0';
    const overallAvgScore = evalExamCount > 0 ? Math.round(totalScoreSum / evalExamCount) : 0;

    // Filtreleme Mantığı
    const q = (this.historySearchQuery || '').trim().toLowerCase();
    let filtered = allItems;

    if (q) {
      filtered = filtered.filter(({ test: t, info }) => {
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchTopic = (t.topic || '').toLowerCase().includes(q);
        const matchUnit = (t.unit || '').toLowerCase().includes(q);
        const matchSubject = (t.subject || '').toLowerCase().includes(q);
        const matchClass = info.classes.some(c => c.toLowerCase().includes(q));
        const matchHoca = info.hocalar.some(h => h.toLowerCase().includes(q));
        return matchTitle || matchTopic || matchUnit || matchSubject || matchClass || matchHoca;
      });
    }

    if (this.historyFilterSubject && this.historyFilterSubject !== 'ALL') {
      filtered = filtered.filter(({ test: t }) => (t.subject || '').toLowerCase() === this.historyFilterSubject.toLowerCase());
    }

    if (this.historyFilterHoca && this.historyFilterHoca !== 'ALL') {
      filtered = filtered.filter(({ info }) => info.hocalar.includes(this.historyFilterHoca.toUpperCase()));
    }

    if (this.historyFilterClass && this.historyFilterClass !== 'ALL') {
      filtered = filtered.filter(({ info }) => info.classes.includes(this.historyFilterClass.toUpperCase()));
    }

    const hasActiveFilters = !!(q || (this.historyFilterSubject && this.historyFilterSubject !== 'ALL') || (this.historyFilterHoca && this.historyFilterHoca !== 'ALL') || (this.historyFilterClass && this.historyFilterClass !== 'ALL'));

    // Gruplama İçeriği Oluşturma
    let groupsContentHtml = '';

    if (filtered.length === 0) {
      groupsContentHtml = `
        <div class="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
          <div class="text-4xl">📭</div>
          <h3 class="text-sm font-black text-slate-800">
            ${hasActiveFilters ? 'Arama Kriterlerine Uygun Test Bulunamadı' : 'Henüz Kaydedilmiş Test Bulunmuyor'}
          </h3>
          <p class="text-xs text-slate-500 max-w-md mx-auto">
            ${hasActiveFilters 
              ? 'Seçtiğiniz filtreleri veya arama kelimesini değiştirerek tekrar deneyebilirsiniz.' 
              : 'Yeni bir test girişi yaparak öğrencilerinize ait sonuçları ve netleri buradan inceleyebilirsiniz.'}
          </p>
          ${hasActiveFilters ? `
            <button type="button" onclick="window.TestResultsModule.resetHistoryFilters()"
              class="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black shadow-xs hover:bg-slate-800 transition cursor-pointer">
              🔄 Filtreleri Sıfırla
            </button>
          ` : ''}
        </div>
      `;
    } else if (this.historyGroupBy === 'hoca') {
      // 👔 ETÜT HOCALARINA GÖRE GRUPLA
      const assignedTestIds = new Set();
      let renderedTeacherCards = '';

      this.TEACHER_DEFINITIONS.forEach(teacher => {
        if (this.historyFilterHoca && this.historyFilterHoca !== 'ALL' && this.historyFilterHoca !== teacher.name) {
          return;
        }

        const teacherItems = filtered.filter(({ info }) => {
          return info.hocalar.includes(teacher.name) ||
            (teacher.classes && teacher.classes.some(c => info.classes.includes(c)));
        });

        teacherItems.forEach(it => assignedTestIds.add(it.test.id));

        const tCount = teacherItems.length;
        let tNetSum = 0;
        let tScoreSum = 0;
        let tEvalCount = 0;
        teacherItems.forEach(it => {
          if (it.info.evaluatedCount > 0) {
            tNetSum += parseFloat(it.info.avgNet) * it.info.evaluatedCount;
            tScoreSum += it.info.avgScore * it.info.evaluatedCount;
            tEvalCount += it.info.evaluatedCount;
          }
        });

        const tAvgNet = tEvalCount > 0 ? (tNetSum / tEvalCount).toFixed(1) : '0.0';
        const tAvgScore = tEvalCount > 0 ? Math.round(tScoreSum / tEvalCount) : 0;
        const isCollapsed = !!this.historyCollapsed['hoca_' + teacher.name];

        renderedTeacherCards += `
          <div class="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
            <!-- Hoca Başlık Çubuğu (Accordion) -->
            <div class="p-4 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-100/70 transition"
              onclick="window.TestResultsModule.toggleHistoryCollapse('hoca_${teacher.name}')">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center text-lg font-black shadow-2xs">
                  ${teacher.icon || '👔'}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="text-sm font-black text-slate-900">${teacher.title}</h3>
                    <span class="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-600 text-white shadow-2xs">
                      ${teacher.classes.join(', ')} Şubesi
                    </span>
                  </div>
                  <div class="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>${teacher.grade}. Sınıf Etüt Grubu</span>
                    <span>•</span>
                    <span class="font-bold text-slate-700">${tCount} Test</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-3">
                ${tCount > 0 ? `
                  <div class="flex items-center gap-2 text-xs">
                    <span class="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                      Ort. Net: <strong>${tAvgNet}</strong>
                    </span>
                    <span class="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 font-bold">
                      Ort. Not: <strong>${tAvgScore}</strong>
                    </span>
                  </div>
                ` : `
                  <span class="text-[11px] text-slate-400 italic">Henüz test girilmedi</span>
                `}
                <span class="p-1 text-slate-400 hover:text-slate-700 transition text-xs font-black">
                  ${isCollapsed ? '▼' : '▲'}
                </span>
              </div>
            </div>

            <!-- Hoca Test Kartları -->
            ${!isCollapsed ? `
              <div class="p-4 bg-white">
                ${tCount === 0 ? `
                  <div class="p-6 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    Bu etüt hocasının sorumlu olduğu sınıfa ait henüz test kaydı bulunmuyor.
                  </div>
                ` : `
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    ${teacherItems.map(({ test: t, info }) => {
                      const canDelete = isAdmin || (window.App && window.App.currentSession && t.author === window.App.currentSession.name);
                      return this.renderHistoryTestCardHtml(t, info, canDelete);
                    }).join('')}
                  </div>
                `}
              </div>
            ` : ''}
          </div>
        `;
      });

      // Kurum Geneli & Diğer Testler
      const otherItems = filtered.filter(it => !assignedTestIds.has(it.test.id));
      if (otherItems.length > 0 && (!this.historyFilterHoca || this.historyFilterHoca === 'ALL')) {
        const isOtherCollapsed = !!this.historyCollapsed['hoca_other'];
        renderedTeacherCards += `
          <div class="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
            <div class="p-4 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-100/70 transition"
              onclick="window.TestResultsModule.toggleHistoryCollapse('hoca_other')">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center text-lg font-black shadow-2xs">
                  🏢
                </div>
                <div>
                  <h3 class="text-sm font-black text-slate-900">Kurum Geneli & Diğer Testler</h3>
                  <div class="text-[11px] text-slate-500 mt-0.5">
                    Belirli bir etüt hocasına atanmamış veya ortak testler (<strong>${otherItems.length}</strong> Test)
                  </div>
                </div>
              </div>
              <span class="p-1 text-slate-400 hover:text-slate-700 transition text-xs font-black">
                ${isOtherCollapsed ? '▼' : '▲'}
              </span>
            </div>
            ${!isOtherCollapsed ? `
              <div class="p-4 bg-white">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  ${otherItems.map(({ test: t, info }) => {
                    const canDelete = isAdmin || (window.App && window.App.currentSession && t.author === window.App.currentSession.name);
                    return this.renderHistoryTestCardHtml(t, info, canDelete);
                  }).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        `;
      }

      groupsContentHtml = `<div class="space-y-4">${renderedTeacherCards}</div>`;

    } else if (this.historyGroupBy === 'class') {
      // 🏫 SINIF VE ŞUBELERE GÖRE GRUPLA
      const classList = ['5-A', '5-B', '6-A', '6-B', '7-A', '7-B', '8-A', '8-B'];
      const assignedClassTestIds = new Set();
      let renderedClassCards = '';

      classList.forEach(cls => {
        if (this.historyFilterClass && this.historyFilterClass !== 'ALL' && this.historyFilterClass !== cls) {
          return;
        }

        const classItems = filtered.filter(({ info }) => info.classes.includes(cls));
        classItems.forEach(it => assignedClassTestIds.add(it.test.id));

        const cCount = classItems.length;
        let cNetSum = 0;
        let cScoreSum = 0;
        let cEvalCount = 0;
        classItems.forEach(it => {
          if (it.info.evaluatedCount > 0) {
            cNetSum += parseFloat(it.info.avgNet) * it.info.evaluatedCount;
            cScoreSum += it.info.avgScore * it.info.evaluatedCount;
            cEvalCount += it.info.evaluatedCount;
          }
        });

        const cAvgNet = cEvalCount > 0 ? (cNetSum / cEvalCount).toFixed(1) : '0.0';
        const cAvgScore = cEvalCount > 0 ? Math.round(cScoreSum / cEvalCount) : 0;
        const isCollapsed = !!this.historyCollapsed['class_' + cls];
        const hocaName = this.CLASS_TEACHER_MAP[cls] || 'Atanmadı';

        renderedClassCards += `
          <div class="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
            <div class="p-4 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-100/70 transition"
              onclick="window.TestResultsModule.toggleHistoryCollapse('class_${cls}')">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 border border-blue-200 flex items-center justify-center text-sm font-black shadow-2xs">
                  ${cls}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="text-sm font-black text-slate-900">${cls} Şubesi</h3>
                    <span class="px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-50 text-blue-800 border border-blue-200">
                      👔 Etüt Hocası: ${hocaName}
                    </span>
                  </div>
                  <div class="text-[11px] text-slate-500 mt-0.5">
                    <strong>${cCount}</strong> Kayıtlı Test
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-3">
                ${cCount > 0 ? `
                  <div class="flex items-center gap-2 text-xs">
                    <span class="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                      Ort. Net: <strong>${cAvgNet}</strong>
                    </span>
                    <span class="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 font-bold">
                      Ort. Not: <strong>${cAvgScore}</strong>
                    </span>
                  </div>
                ` : `
                  <span class="text-[11px] text-slate-400 italic">Henüz test girilmedi</span>
                `}
                <span class="p-1 text-slate-400 hover:text-slate-700 transition text-xs font-black">
                  ${isCollapsed ? '▼' : '▲'}
                </span>
              </div>
            </div>

            ${!isCollapsed ? `
              <div class="p-4 bg-white">
                ${cCount === 0 ? `
                  <div class="p-6 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    Bu şubeye ait henüz test kaydı bulunmuyor.
                  </div>
                ` : `
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    ${classItems.map(({ test: t, info }) => {
                      const canDelete = isAdmin || (window.App && window.App.currentSession && t.author === window.App.currentSession.name);
                      return this.renderHistoryTestCardHtml(t, info, canDelete);
                    }).join('')}
                  </div>
                `}
              </div>
            ` : ''}
          </div>
        `;
      });

      // Çoklu Şube & Genel Testler
      const generalClassItems = filtered.filter(it => !assignedClassTestIds.has(it.test.id));
      if (generalClassItems.length > 0 && (!this.historyFilterClass || this.historyFilterClass === 'ALL')) {
        const isGenCollapsed = !!this.historyCollapsed['class_general'];
        renderedClassCards += `
          <div class="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
            <div class="p-4 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-100/70 transition"
              onclick="window.TestResultsModule.toggleHistoryCollapse('class_general')">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center text-lg font-black shadow-2xs">
                  🏫
                </div>
                <div>
                  <h3 class="text-sm font-black text-slate-900">Çoklu Şube & Genel Testler</h3>
                  <div class="text-[11px] text-slate-500 mt-0.5">
                    Tüm seviye veya çoklu şube içeren testler (<strong>${generalClassItems.length}</strong> Test)
                  </div>
                </div>
              </div>
              <span class="p-1 text-slate-400 hover:text-slate-700 transition text-xs font-black">
                ${isGenCollapsed ? '▼' : '▲'}
              </span>
            </div>
            ${!isGenCollapsed ? `
              <div class="p-4 bg-white">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  ${generalClassItems.map(({ test: t, info }) => {
                    const canDelete = isAdmin || (window.App && window.App.currentSession && t.author === window.App.currentSession.name);
                    return this.renderHistoryTestCardHtml(t, info, canDelete);
                  }).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        `;
      }

      groupsContentHtml = `<div class="space-y-4">${renderedClassCards}</div>`;

    } else {
      // 📋 TÜM TESTLER (LİSTE GÖRÜNÜMÜ)
      groupsContentHtml = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          ${filtered.map(({ test: t, info }) => {
            const canDelete = isAdmin || (window.App && window.App.currentSession && t.author === window.App.currentSession.name);
            return this.renderHistoryTestCardHtml(t, info, canDelete);
          }).join('')}
        </div>
      `;
    }

    container.innerHTML = `
      <div class="space-y-4 max-w-7xl mx-auto animate-fade-in pb-8 px-1 sm:px-2">
        
        <!-- Akademi Üst Sekmeleri -->
        ${this.renderTopTabsHtml('testler')}

        <!-- 1. Üst Başlık & Yeni Test Butonu -->
        <div class="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div>
            <h2 class="text-base font-black text-slate-900 flex items-center gap-2">
              <span>📚</span> Geçmiş Test ve Etüt Arşivi
            </h2>
            <p class="text-[11px] text-slate-500 mt-0.5">
              Etüt hocalarına ve şubelere göre kategorize edilmiş sınav ve test kayıtları.
            </p>
          </div>

          <button type="button" onclick="window.TestResultsModule.activeView='editor'; window.TestResultsModule.render();"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer">
            <span>➕</span> Yeni Test Girişi
          </button>
        </div>

        <!-- 2. KPI / Özet İstatistik Kartları -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Toplam Test</div>
            <div class="text-xl font-black text-slate-900 mt-0.5">${totalTestsCount} <span class="text-xs font-normal text-slate-400">Kayıt</span></div>
          </div>
          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Talebe Sınavı</div>
            <div class="text-xl font-black text-blue-700 mt-0.5">${totalEvaluatedExams} <span class="text-xs font-normal text-slate-400">Katılım</span></div>
          </div>
          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kurum Ort. Net</div>
            <div class="text-xl font-black text-emerald-700 mt-0.5">${overallAvgNet} <span class="text-xs font-normal text-slate-400">Net</span></div>
          </div>
          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kurum Başarısı</div>
            <div class="text-xl font-black text-purple-700 mt-0.5">%${overallAvgScore} <span class="text-xs font-normal text-slate-400">/ 100</span></div>
          </div>
        </div>

        <!-- 3. Kontrol Paneli: Gruplama Modu ve Arama / Filtreler -->
        <div class="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          
          <!-- Üst Satır: Gruplama Butonları -->
          <div class="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
            <div class="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <span>🎯</span>
              <span>Görünüm Düzeni:</span>
            </div>

            <div class="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 shadow-2xs">
              <button type="button" onclick="window.TestResultsModule.setHistoryGroupBy('hoca')"
                class="px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  this.historyGroupBy === 'hoca' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white'
                }">
                <span>👔</span>
                <span>Etüt Hocalarına Göre</span>
              </button>
              <button type="button" onclick="window.TestResultsModule.setHistoryGroupBy('class')"
                class="px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  this.historyGroupBy === 'class' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white'
                }">
                <span>🏫</span>
                <span>Sınıflara Göre</span>
              </button>
              <button type="button" onclick="window.TestResultsModule.setHistoryGroupBy('list')"
                class="px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  this.historyGroupBy === 'list' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white'
                }">
                <span>📋</span>
                <span>Tüm Liste</span>
              </button>
            </div>
          </div>

          <!-- Alt Satır: Arama & Filtre Seçimleri -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            
            <!-- Arama Kutusu -->
            <div class="relative">
              <input type="text" id="history-search-input" value="${this.escapeHtml(this.historySearchQuery)}"
                oninput="window.TestResultsModule.setHistorySearchQuery(this.value)"
                placeholder="🔍 Test, konu, hoca veya sınıf ara..."
                class="w-full px-3 py-2 pl-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <span class="absolute left-2.5 top-2.5 text-xs text-slate-400 pointer-events-none">🔍</span>
            </div>

            <!-- Ders Filtresi -->
            <div>
              <select onchange="window.TestResultsModule.setHistoryFilterSubject(this.value)"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="ALL">📚 Tüm Dersler</option>
                ${this.SUBJECT_OPTIONS.map(s => `
                  <option value="${s}" ${this.historyFilterSubject === s ? 'selected' : ''}>${s}</option>
                `).join('')}
              </select>
            </div>

            <!-- Hoca Filtresi (Yönetici) -->
            ${isAdmin ? `
              <div>
                <select onchange="window.TestResultsModule.setHistoryFilterHoca(this.value)"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="ALL">👔 Tüm Etüt Hocaları</option>
                  ${this.TEACHER_DEFINITIONS.map(td => `
                    <option value="${td.name}" ${this.historyFilterHoca === td.name ? 'selected' : ''}>${td.title} (${td.classes.join(', ')})</option>
                  `).join('')}
                </select>
              </div>
            ` : '<div></div>'}

            <!-- Şube Filtresi -->
            <div class="flex items-center gap-1.5">
              <select onchange="window.TestResultsModule.setHistoryFilterClass(this.value)"
                class="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="ALL">🏫 Tüm Şubeler</option>
                ${['5-A', '5-B', '6-A', '6-B', '7-A', '7-B', '8-A', '8-B'].map(c => `
                  <option value="${c}" ${this.historyFilterClass === c ? 'selected' : ''}>${c} Şubesi</option>
                `).join('')}
              </select>

              ${hasActiveFilters ? `
                <button type="button" onclick="window.TestResultsModule.resetHistoryFilters()"
                  class="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black transition cursor-pointer"
                  title="Filtreleri Temizle">
                  ✕
                </button>
              ` : ''}
            </div>

          </div>

          ${hasActiveFilters ? `
            <div class="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center justify-between">
              <span>🔍 Filtrelenen Sonuç: <strong>${filtered.length}</strong> test listeleniyor.</span>
              <button type="button" onclick="window.TestResultsModule.resetHistoryFilters()" class="underline hover:text-emerald-950 font-black cursor-pointer">
                Tüm Filtreleri Temizle
              </button>
            </div>
          ` : ''}

        </div>

        <!-- 4. Kategorize Edilmiş Test Kartları Bölümü -->
        ${groupsContentHtml}

      </div>
    `;
  },

  getEtutSubeleri() {
    const list = [
      { id: '5-A|YASİN EKİNCİ', label: '5-A • Yasin Ekinci', grade: '5', branch: '5-A', hoca: 'YASİN EKİNCİ' },
      { id: '5-B|AHMED MUBARİZ', label: '5-B • Ahmed Mubariz', grade: '5', branch: '5-B', hoca: 'AHMED MUBARİZ' },
      { id: '6-A|ABDUSSAMED TAV', label: '6-A • Abdussamed Tav (Oda 201)', grade: '6', branch: '6-A', hoca: 'ABDUSSAMED TAV' },
      { id: '6-B|ABDUSSAMED TAV', label: '6-B • Abdussamed Tav (Oda 202)', grade: '6', branch: '6-B', hoca: 'ABDUSSAMED TAV' },
      { id: '7-A|EMİR TALHA TARIM', label: '7-A • Emir Talha Tarım', grade: '7', branch: '7-A', hoca: 'EMİR TALHA TARIM' },
      { id: '7-B|BURAK BODUR', label: '7-B • Burak Bodur', grade: '7', branch: '7-B', hoca: 'BURAK BODUR' },
      { id: '8-A|YAVUZ SELİM SEVEN', label: '8-A • Yavuz Selim Seven', grade: '8', branch: '8-A', hoca: 'YAVUZ SELİM SEVEN' },
      { id: '8-B|TUNAHAN TAŞKIN', label: '8-B • Tunahan Taşkın', grade: '8', branch: '8-B', hoca: 'TUNAHAN TAŞKIN' }
    ];

    if (window.Store && typeof window.Store.isCurrentUserAdmin === 'function' && !window.Store.isCurrentUserAdmin()) {
      const myStudents = window.Store.getStudentsForActiveUser();
      const myClasses = new Set(myStudents.map(s => (s.className || '').trim().toUpperCase()));
      return list.filter(e => myClasses.has(e.branch.toUpperCase()));
    }
    return list;
  },

  toggleClass(className) {
    if (!this.selectedClasses) this.selectedClasses = [];
    const upper = (className || '').trim().toUpperCase();
    const idx = this.selectedClasses.findIndex(c => c.toUpperCase() === upper);
    if (idx !== -1) {
      this.selectedClasses.splice(idx, 1);
    } else {
      this.selectedClasses.push(className.trim());
    }
    this.selectedGrade = 'ALL';
    this.selectedEtut = 'ALL';
    this.render();
    if (window.App && typeof window.App.renderHeader === 'function') {
      window.App.renderHeader();
    }
  },

  toggleGrade(gradeNum) {
    if (!this.selectedClasses) this.selectedClasses = [];
    const etutList = this.getEtutSubeleri();
    const gradeBranches = etutList.filter(e => e.grade === gradeNum).map(e => e.branch.toUpperCase());
    const selUpper = this.selectedClasses.map(c => c.toUpperCase());
    const allSelected = gradeBranches.length > 0 && gradeBranches.every(b => selUpper.includes(b));

    if (allSelected) {
      this.selectedClasses = this.selectedClasses.filter(c => !gradeBranches.includes(c.toUpperCase()));
    } else {
      gradeBranches.forEach(b => {
        if (!selUpper.includes(b)) {
          this.selectedClasses.push(b);
        }
      });
    }
    this.selectedGrade = 'ALL';
    this.selectedEtut = 'ALL';
    this.render();
    if (window.App && typeof window.App.renderHeader === 'function') {
      window.App.renderHeader();
    }
  },

  selectGrade(gradeNum) {
    this.toggleGrade(gradeNum);
  },

  setEtutFilter(etutId) {
    if (etutId === 'ALL') {
      this.toggleAll();
      return;
    }
    const etut = this.getEtutSubeleri().find(e => e.id === etutId);
    if (etut) {
      this.toggleClass(etut.branch);
    }
  },

  toggleAll() {
    this.selectedGrade = 'ALL';
    this.selectedEtut = 'ALL';
    this.selectedClass = 'ALL';
    this.selectedClasses = [];
    this.render();
    if (window.App && typeof window.App.renderHeader === 'function') {
      window.App.renderHeader();
    }
  },

  getFilterHeaderLabel() {
    if (this.selectedClasses && this.selectedClasses.length > 0) {
      return `Şube: ${this.selectedClasses.join(', ')}`;
    }
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

    // ETÜT HOCALARI İÇİN: Sadece kendi şubelerini ve talebelerini gösteren sade ve net görünüm
    if (window.Store && typeof window.Store.isCurrentUserAdmin === 'function' && !window.Store.isCurrentUserAdmin()) {
      const myCount = this.getCurrentlyDisplayedStudents().length;
      return `
        <div class="flex flex-wrap items-center gap-2">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 font-bold text-xs shadow-2xs">
            <span>📚</span>
            <span><strong>Şubeniz:</strong> ${etutList.map(e => e.label).join(' & ')}</span>
            <span class="bg-emerald-200 text-emerald-900 text-[10px] px-2 py-0.5 rounded-full font-black">Sadece Kendi Talebeleriniz (${myCount} Talebe)</span>
          </div>
          ${etutList.length > 1 ? `
            <div class="inline-flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200 shadow-2xs">
              <button type="button" onclick="window.TestResultsModule.toggleAll()"
                class="px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer ${
                  (!this.selectedClasses || this.selectedClasses.length === 0) ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white'
                }">
                Tümü
              </button>
              ${etutList.map(e => {
                const isSel = (this.selectedClasses || []).some(c => c.toUpperCase() === e.branch.toUpperCase());
                return `
                  <button type="button" onclick="window.TestResultsModule.toggleClass('${e.branch}')"
                    class="px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer ${
                      isSel ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white'
                    }">
                    ${e.branch}
                  </button>
                `;
              }).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }

    // KURUM YÖNETİCİSİ İÇİN: Çoklu seçim yapabilen tam kontrol
    const isAll = (!this.selectedClasses || this.selectedClasses.length === 0) &&
                  (!this.selectedGrade || this.selectedGrade === 'ALL') && 
                  (!this.selectedEtut || this.selectedEtut === 'ALL');

    let html = `
      <div class="space-y-2">
        <!-- 1. Üst Kontrol Satırı: Tümü, Hızlı Sınıf Seviyeleri (5, 6, 7, 8) & Temizle -->
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase flex items-center gap-1">
            <span>🏫</span>
            <span>Şube Seçimi (Çoklu):</span>
          </span>

          <button type="button" onclick="window.TestResultsModule.toggleAll()"
            class="px-2.5 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
              isAll 
                ? 'bg-slate-900 text-white shadow-xs ring-1 ring-slate-700' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }">
            Tüm Sınıflar
          </button>

          <!-- Seviye Bazlı Toplu Seçim Butonları -->
          <div class="inline-flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200">
            ${['5', '6', '7', '8'].map(g => {
              const gradeBranches = etutList.filter(e => e.grade === g).map(e => e.branch.toUpperCase());
              const selUpper = (this.selectedClasses || []).map(c => c.toUpperCase());
              const isGradeAll = gradeBranches.length > 0 && gradeBranches.every(b => selUpper.includes(b));
              const isGradePartial = !isGradeAll && gradeBranches.some(b => selUpper.includes(b));
              return `
                <button type="button" onclick="window.TestResultsModule.toggleGrade('${g}')"
                  class="px-2 py-0.5 rounded-lg text-[11px] font-black transition cursor-pointer ${
                    isGradeAll 
                      ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-400' 
                      : (isGradePartial ? 'bg-emerald-100 text-emerald-900 font-black' : 'text-slate-700 hover:bg-white')
                  }"
                  title="${g}. Sınıfın tüm şubelerini aç/kapat">
                  ${g}. Sınıf
                </button>
              `;
            }).join('')}
          </div>

          ${this.selectedClasses && this.selectedClasses.length > 0 ? `
            <button type="button" onclick="window.TestResultsModule.toggleAll()"
              class="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 underline cursor-pointer ml-1">
              Temizle (${this.selectedClasses.length} Şube Seçili)
            </button>
          ` : ''}
        </div>

        <!-- 2. Şube Butonları (5-A, 5-B, 6-A, 6-B, 7-A, 7-B, 8-A, 8-B) - ÇOKLU SEÇİLEBİLİR -->
        <div class="flex flex-wrap items-center gap-1.5">
          ${etutList.map(e => {
            const isChecked = (this.selectedClasses || []).some(c => c.toUpperCase() === e.branch.toUpperCase());
            const shortHoca = e.hoca ? e.hoca.split(' ')[0] : '';
            return `
              <button type="button" onclick="window.TestResultsModule.toggleClass('${e.branch}')"
                class="px-2.5 py-1 rounded-xl text-xs font-black transition border flex items-center gap-1.5 cursor-pointer ${
                  isChecked 
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300/60' 
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-emerald-50/50 hover:border-slate-300'
                }"
                title="${e.label} (Dokunarak çoklu seçebilirsiniz)">
                <span class="text-[11px]">${isChecked ? '✓' : '+'}</span>
                <span>${e.branch}</span>
                <span class="text-[10px] ${isChecked ? 'text-emerald-100' : 'text-slate-400'} font-normal">(${shortHoca})</span>
              </button>
            `;
          }).join('')}
        </div>
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
    this.existingAllScores = {};
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
    this.existingAllScores = test.scores ? { ...test.scores } : {};
    this.testMeta = {
      title: test.title || 'Etüt Testi',
      subject: test.subject || 'Matematik',
      unit: test.unit || '',
      topic: test.topic || '',
      date: test.date || new Date().toISOString().split('T')[0],
      totalQuestions: test.totalQuestions || 20,
      wrongPenalty: test.wrongPenalty !== undefined ? test.wrongPenalty : 3,
      answerKeyA: test.answerKeyA || {},
      answerKeyB: test.answerKeyB || {}
    };

    this.scores = {};
    const students = (window.Store && typeof window.Store.getStudentsForActiveUser === 'function')
      ? window.Store.getStudentsForActiveUser()
      : window.Store.getStudents();
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

  saveCurrentTest(silent = false) {
    const session = window.App.currentSession;
    const author = session ? (session.name || 'Öğretmen') : 'Eğitmen';

    if (!this.testMeta.title || !this.testMeta.title.trim()) {
      if (!silent) alert('⚠️ Lütfen bir test başlığı giriniz.');
      return null;
    }

    const mergedScores = {
      ...(this.existingAllScores || {}),
      ...this.scores
    };

    // İlgili şubeleri ve etüt hocalarını otomatik tespit et
    const detectedClasses = new Set();
    const detectedHocalar = new Set();

    if (this.selectedClasses && this.selectedClasses.length > 0) {
      this.selectedClasses.forEach(c => detectedClasses.add(c.trim().toUpperCase()));
    }

    Object.keys(mergedScores).forEach(stId => {
      const sc = mergedScores[stId];
      if (sc && (sc.correct > 0 || sc.wrong > 0)) {
        const st = window.Store.getStudentById(stId);
        if (st) {
          if (st.className) detectedClasses.add(st.className.trim().toUpperCase());
          if (st.etutHocasi) detectedHocalar.add(st.etutHocasi.trim().toUpperCase());
        }
      }
    });

    detectedClasses.forEach(cls => {
      const h = this.CLASS_TEACHER_MAP[cls];
      if (h) detectedHocalar.add(h);
    });

    const testRecord = {
      id: this.currentTestId,
      title: this.testMeta.title.trim(),
      subject: this.testMeta.subject.trim(),
      unit: this.testMeta.unit.trim(),
      topic: this.testMeta.topic.trim(),
      date: this.testMeta.date,
      totalQuestions: parseInt(this.testMeta.totalQuestions, 10) || 20,
      wrongPenalty: parseFloat(this.testMeta.wrongPenalty) || 0,
      answerKeyA: this.testMeta.answerKeyA || {},
      answerKeyB: this.testMeta.answerKeyB || {},
      scores: mergedScores,
      author: author,
      targetClasses: Array.from(detectedClasses),
      etutHocalari: Array.from(detectedHocalar)
    };

    const saved = window.Store.saveTestResult(testRecord);
    this.currentTestId = saved.id;
    this.existingAllScores = mergedScores;

    if (!silent) {
      alert(`✅ "${saved.title}" başlıklı test sonuçları başarıyla kaydedildi!`);
    }
    return saved;
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
