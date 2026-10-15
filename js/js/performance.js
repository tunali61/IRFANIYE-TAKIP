/**
 * performance.js - Akademi & Performans Takip Modülü
 * - Alt Başlık 1: Takviye Ders Performansı (Çizelge / Matris Görünümü: Solda Öğrenciler, Üstte 5 Ders, Sağda Öğrenci Ortalaması, Altta Sınıf Ders Ortalamaları)
 *   Renk Kuralı: 85 altı kırmızı, 85'ten 100'e doğru yeşile geçiş, 100 tam yeşil.
 * - Alt Başlık 2: Genel Gelişim & Karne (Kriter yıldızları, rozetler ve öğretmen görüşleri)
 */

window.AkademiModule = {
  currentSubCategory: 'takviye', // 'takviye' | 'genel'
  currentDate: new Date().toISOString().split('T')[0],
  selectedGrade: 'ALL',          // 'ALL' | '5' | '6' | '7' | '8'
  selectedEtut: 'ALL',           // 'ALL' | '5-A|YASİN EKİNCİ' vb.
  selectedClasses: [],           // Geriye dönük uyumluluk
  searchQuery: '',
  sortBy: 'score_desc',          // 'score_desc': Aldığı Nota / Ortalamaya Göre Sırala | 'name': İsim Sıralı
  saveTimers: {},
  selectedBadges: new Set(),
  shareStudentId: null,

  subCategories: [
    { id: 'takviye', label: 'Takviye Ders Performansı', icon: '📚', short: 'Takviye Çizelgesi' },
    { id: 'genel', label: 'Genel Gelişim & Karne', icon: '⭐', short: 'Genel Karne' }
  ],

  // 5 Ana Takviye Dersi (Tabloda soldan sağa sütunlar)
  subjects: [
    { key: 'Türkçe', name: 'Türkçe', icon: '🇹🇷', short: 'TR' },
    { key: 'Matematik', name: 'Matematik', icon: '📐', short: 'MAT' },
    { key: 'Fen Bilimleri', name: 'Fen Bilimleri', icon: '🔬', short: 'FEN' },
    { key: 'Sosyal Bilgiler', name: 'Sosyal Bilgiler', icon: '🌍', short: 'SOS' },
    { key: 'İngilizce', name: 'İngilizce', icon: '🇬🇧', short: 'İNG' }
  ],

  AVAILABLE_BADGES: [
    { name: 'Haftanın Yıldızı', icon: '⭐', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    { name: 'Ezberini Tam Verdi', icon: '📖', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { name: 'Namazlarını Eksiksiz Kıldı', icon: '🕌', color: 'bg-teal-100 text-teal-800 border-teal-300' },
    { name: 'Kılık Kıyafete Özen Gösterdi', icon: '✨', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    { name: 'Derste Çok Aktif', icon: '🎯', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { name: 'Ödevini Yaptı', icon: '📝', color: 'bg-sky-100 text-sky-800 border-sky-300' },
    { name: 'Gelişim Gösteriyor', icon: '📈', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    { name: 'Daha Fazla Gayret Etmeli', icon: '⚠️', color: 'bg-rose-100 text-rose-800 border-rose-300' },
    { name: 'Tekrar Yapmalı', icon: '🔄', color: 'bg-orange-100 text-orange-800 border-orange-300' }
  ],

  init() {
    this.renderView();
  },

  setSubCategory(sub) {
    this.currentSubCategory = sub;
    this.renderView();
  },

  setDate(date) {
    this.currentDate = date;
    this.renderView();
  },

  getDayName(dateStr) {
    if (!dateStr) return '';
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3) return '';
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return days[d.getDay()] || '';
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
    // Sınıf değiştiğinde seçili etüt şubesi bu sınıfa ait değilse sıfırla
    if (this.selectedEtut !== 'ALL') {
      const etut = this.getEtutSubeleri().find(e => e.id === this.selectedEtut);
      if (etut && this.selectedGrade !== 'ALL' && etut.grade !== this.selectedGrade) {
        this.selectedEtut = 'ALL';
      }
    }
    this.updateClassFilterButtons();
    this.renderMatrixTableBody();
  },

  setEtutFilter(etutId) {
    this.selectedEtut = etutId;
    if (etutId !== 'ALL') {
      const etut = this.getEtutSubeleri().find(e => e.id === etutId);
      if (etut) {
        this.selectedGrade = etut.grade;
      }
    }
    this.updateClassFilterButtons();
    this.renderMatrixTableBody();
  },

  toggleAll() {
    this.selectedGrade = 'ALL';
    this.selectedEtut = 'ALL';
    this.selectedClasses = [];
    this.updateClassFilterButtons();
    this.renderMatrixTableBody();
  },

  toggleAllClasses() {
    this.toggleAll();
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
          <button type="button" onclick="window.AkademiModule.toggleAll()"
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
              <button type="button" onclick="window.AkademiModule.selectGrade('${g}')"
                class="px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer ${
                  isGActive 
                    ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-400' 
                    : 'text-slate-700 hover:bg-white hover:text-blue-900'
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
          <select onchange="window.AkademiModule.setEtutFilter(this.value)"
            class="px-2.5 py-1 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer">
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
          <div class="inline-flex items-center gap-1.5 bg-blue-50/70 p-0.5 px-1.5 rounded-xl border border-blue-200">
            <span class="text-[10px] font-black text-blue-900">${this.selectedGrade}. Sınıf Etütleri:</span>
            ${etutList.filter(e => e.grade === this.selectedGrade).map(e => {
              const isActive = this.selectedEtut === e.id;
              return `
                <button type="button" onclick="window.AkademiModule.setEtutFilter('${e.id}')"
                  class="px-2 py-0.5 rounded-lg text-[11px] font-bold transition border cursor-pointer ${
                    isActive 
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-1 ring-blue-400' 
                      : 'bg-white text-blue-900 border-blue-200 hover:bg-blue-600 hover:text-white'
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

  updateClassFilterButtons() {
    const el = document.getElementById('matrix-class-buttons-container');
    if (el) {
      el.innerHTML = this.renderClassFilterButtonsHtml();
    }
    const label = document.getElementById('matrix-header-class-label');
    if (label) {
      label.textContent = this.getFilterHeaderLabel();
    }
    if (window.App && typeof window.App.renderHeader === 'function') {
      window.App.renderHeader();
    }
  },

  toggleSort() {
    this.sortBy = this.sortBy === 'score_desc' ? 'name' : 'score_desc';
    const btn = document.getElementById('btn-matrix-sort');
    if (btn) {
      btn.innerHTML = `<span>${this.sortBy === 'score_desc' ? '🏆 Not Sıralı (1. ➔ Son)' : '🔤 İsim Sıralı'}</span>`;
      btn.className = `px-2.5 py-1 rounded-xl text-[11px] font-black transition flex items-center gap-1 border shadow-2xs ${
        this.sortBy === 'score_desc' 
          ? 'bg-amber-400 text-slate-950 border-amber-500 ring-2 ring-amber-300/40' 
          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
      }`;
    }
    const thTalebe = document.getElementById('th-matrix-talebe');
    if (thTalebe) {
      thTalebe.innerHTML = `Talebe ${this.sortBy === 'score_desc' ? '(Derece)' : ''}`;
    }
    this.renderMatrixTableBody();
  },

  setSearchQuery(query) {
    this.searchQuery = (query || '').toLowerCase().trim();
    this.renderMatrixTableBody();
  },

  // --- ÖZEL RENK KURALI (85 Altı Kırmızı, 85-100 Arası Yeşile Dönüşüm, 100 Tam Yeşil) ---
  getColorStyle(score) {
    if (score === null || score === undefined || score === '' || isNaN(score)) {
      return {
        bg: '#ffffff',
        text: '#94a3b8',
        border: '#cbd5e1',
        badge: 'bg-slate-100 text-slate-400 border-slate-200 font-bold',
        label: '-'
      };
    }
    const val = Number(score);
    if (val < 85) {
      // 85 altı: Kırmızı
      return {
        bg: '#fee2e2',       // açık kırmızı arka plan
        text: '#b91c1c',     // koyu kırmızı yazı
        border: '#f87171',   // kırmızı kenarlık
        badge: 'bg-rose-100 text-rose-800 border-rose-300 font-black',
        label: '85 Altı'
      };
    } else if (val >= 100) {
      // 100 tam: Canlı Yeşil
      return {
        bg: '#10b981',       // zümrüt yeşili
        text: '#ffffff',     // beyaz yazı
        border: '#059669',   // koyu yeşil kenarlık
        badge: 'bg-emerald-600 text-white border-emerald-700 font-black shadow-xs',
        label: '100'
      };
    } else if (val >= 95) {
      // 95-99: Zümrüt Yeşili
      return {
        bg: '#d1fae5',
        text: '#065f46',
        border: '#6ee7b7',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black',
        label: '95+'
      };
    } else if (val >= 90) {
      // 90-94: Fıstık Yeşili
      return {
        bg: '#ecfccb',
        text: '#3f6212',
        border: '#bef264',
        badge: 'bg-lime-100 text-lime-800 border-lime-300 font-black',
        label: '90+'
      };
    } else {
      // 85-89: Sarı/Amberden yeşile geçiş
      return {
        bg: '#fef3c7',
        text: '#92400e',
        border: '#fcd34d',
        badge: 'bg-amber-100 text-amber-800 border-amber-300 font-black',
        label: '85+'
      };
    }
  },

  getFilteredStudents() {
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
      students = students.filter(s => 
        s.firstName.toLowerCase().includes(this.searchQuery) ||
        s.lastName.toLowerCase().includes(this.searchQuery) ||
        (s.className && s.className.toLowerCase().includes(this.searchQuery)) ||
        (s.studentNo && s.studentNo.toString().includes(this.searchQuery)) ||
        (s.etutHocasi && s.etutHocasi.toLowerCase().includes(this.searchQuery))
      );
    }

    // Skorları haritalayarak sıralamayı optimize et
    const scores = window.Store.getAcademicScores();
    const studentScoreInfo = {};
    scores.forEach(s => {
      if (s.date === this.currentDate) {
        if (!studentScoreInfo[s.studentId]) {
          studentScoreInfo[s.studentId] = [];
        }
        if (s.score !== null && s.score !== undefined && !isNaN(s.score) && s.score !== '') {
          studentScoreInfo[s.studentId].push(Number(s.score));
        }
      }
    });

    if (this.sortBy === 'score_desc') {
      students.sort((a, b) => {
        const scoresA = studentScoreInfo[a.id] || [];
        const scoresB = studentScoreInfo[b.id] || [];
        const hasA = scoresA.length > 0;
        const hasB = scoresB.length > 0;

        // Notu girilen öğrenciler her zaman üstte
        if (hasA && !hasB) return -1;
        if (!hasA && hasB) return 1;

        if (hasA && hasB) {
          const avgA = scoresA.reduce((sum, v) => sum + v, 0) / scoresA.length;
          const avgB = scoresB.reduce((sum, v) => sum + v, 0) / scoresB.length;
          // 1. Kriter: Ortalama Puan (En yüksek puan ilk)
          if (avgB !== avgA) return avgB - avgA;
          // 2. Kriter: Değerlendirilen ders sayısı (Daha çok ders girilen üstte)
          if (scoresB.length !== scoresA.length) return scoresB.length - scoresA.length;
        }

        // 3. Kriter: İsim Alfabetik Sıra
        return (a.firstName || '').localeCompare(b.firstName || '', 'tr');
      });
    } else {
      // İsim Alfabetik Sıra
      students.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || '', 'tr'));
    }

    return students;
  },

  renderView() {
    const container = document.getElementById('performance-container') || document.getElementById('akademi-container');
    if (!container) return;

    if (this.currentSubCategory === 'genel') {
      this.renderGenelKarneView(container);
    } else {
      this.renderTakviyeMatrixView(container);
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // --- TAKVİYE DERS PERFORMANSI (ÇİZELGE / MATRİS TABLO GÖRÜNÜMÜ) ---
  renderTakviyeMatrixView(container) {
    const classes = window.Store.getClasses();
    const dayName = this.getDayName(this.currentDate);

    container.innerHTML = `
      <div class="space-y-3 sm:space-y-4 animate-fade-in max-w-7xl mx-auto pb-8 px-1 sm:px-2">
        <!-- Kontrol Kartı: Tarih, Gün Adı, Çoklu Sınıf Filtresi, Sıralama & Renk Kılavuzu -->
        <div class="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200 p-3 sm:p-5 space-y-3 sm:space-y-4 no-print">
          <div class="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
            <!-- Tarih ve Gün Adı -->
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-[11px] sm:text-xs font-black text-slate-800 uppercase tracking-wide">
                TARİH:
              </span>
              <input type="date" value="${this.currentDate}" 
                class="px-2.5 py-1.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none transition shadow-2xs"
                onchange="window.AkademiModule.setDate(this.value)">

              <div class="px-2.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-2xs">
                <span>📅</span>
                <span>${dayName}</span>
              </div>
            </div>

            <!-- Çıktı Alma, Resim İndirme & Canlı Kayıt Göstergesi -->
            <div class="flex flex-wrap items-center gap-2 sm:gap-3">
              <div id="matrix-save-indicator" class="h-6 flex items-center"></div>

              <div class="flex items-center gap-1.5">
                <!-- Veli Görseli / Çizelge Resmi İndir -->
                <button type="button" onclick="window.AkademiModule.downloadTableImage()" id="btn-download-matrix-img"
                  class="px-2.5 sm:px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[11px] sm:text-xs font-black shadow-xs flex items-center gap-1 transition cursor-pointer"
                  title="Tüm sınıf not çizelgesini velilere göndermek için tek tıkla yüksek kaliteli resim (PNG) olarak indir">
                  <span>📸</span>
                  <span>Resim İndir</span>
                </button>

                <!-- Yazdır (A4) -->
                <button type="button" onclick="window.AkademiModule.printMatrixTable()"
                  class="px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] sm:text-xs font-black shadow-xs flex items-center gap-1 transition cursor-pointer"
                  title="Tüm sınıf not çizelgesini A4 formatında yazdır">
                  <span>🖨️</span>
                  <span class="hidden xs:inline">Yazdır (A4)</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Renk Skalası Kılavuzu (Legend) -->
          <div class="flex flex-wrap items-center justify-between gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span class="font-black text-slate-700 text-[10px] sm:text-[11px] uppercase tracking-wide flex items-center gap-1">
              <span>🎨</span> Kural:
            </span>
            <div class="flex flex-wrap items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px]">
              <span class="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 font-black">
                &lt; 85: Kırmızı
              </span>
              <span class="text-slate-300 font-bold">→</span>
              <span class="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                85-89: Sarı
              </span>
              <span class="text-slate-300 font-bold">→</span>
              <span class="px-1.5 py-0.5 rounded-md bg-lime-100 text-lime-800 border border-lime-300 font-bold">
                90-94: Fıstık
              </span>
              <span class="text-slate-300 font-bold">→</span>
              <span class="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                95-99: Zümrüt
              </span>
              <span class="text-slate-300 font-bold">→</span>
              <span class="px-2 py-0.5 rounded-md bg-emerald-600 text-white border border-emerald-700 font-black shadow-2xs">
                100: Canlı Yeşil
              </span>
            </div>
          </div>

          <!-- Çoklu Sınıf Filtresi, Sıralama Butonu & Öğrenci Arama -->
          <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div id="matrix-class-buttons-container" class="flex flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar">
              ${this.renderClassFilterButtonsHtml()}
            </div>

            <!-- ALDIĞI NOTA GÖRE SIRALA BUTONU -->
            <button type="button" id="btn-matrix-sort" onclick="window.AkademiModule.toggleSort()"
              title="Öğrencileri ders ortalamalarına göre sıralar (1. en üstte)"
              class="px-2.5 py-1 rounded-xl text-[11px] font-black transition flex items-center gap-1 border shadow-2xs ${
                this.sortBy === 'score_desc' 
                  ? 'bg-amber-400 text-slate-950 border-amber-500 ring-2 ring-amber-300/40' 
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }">
              <span>${this.sortBy === 'score_desc' ? '🏆 Not Sıralı (1. ➔ Son)' : '🔤 İsim Sıralı'}</span>
            </button>
          </div>

          <!-- Arama -->
          <div class="w-full sm:w-56 relative ml-auto">
            <input type="text" placeholder="İsme göre öğrenci ara..." value="${this.escapeHtml(this.searchQuery)}"
              class="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              oninput="window.AkademiModule.setSearchQuery(this.value)">
            <span class="absolute left-2.5 top-1.5 text-slate-400 text-xs">🔍</span>
          </div>
        </div>
      </div>

      <!-- 3. MATRİS TABLO (SIFIR YATAY KAYDIRMA, MOBİL VE EKRAN GÖRÜNTÜSÜ UYUMLU) -->
      <div id="takviye-matrix-table-container" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-0">
        
        <!-- KURUMSAL YAZDIRMA & RESİM ÜST BAŞLIĞI -->
        <div class="p-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between border-b border-slate-700">
          <div class="truncate">
            <div class="text-xs sm:text-sm font-black text-amber-300 truncate">
              ${window.Store.getSettings().institutionName || 'Ömer Avniyel Akademi'}
            </div>
            <div class="text-[10px] text-slate-300 font-bold truncate">
              Takviye Dersleri Not Çizelgesi • 5 Ana Ders
            </div>
          </div>
          <div class="text-right flex-shrink-0 pl-2">
            <div class="text-[10px] text-emerald-300 font-bold font-mono">${this.currentDate} (${dayName})</div>
            <div id="matrix-header-class-label" class="text-[9px] text-slate-400 font-medium truncate">Sınıf: ${this.selectedClasses.length > 0 ? this.selectedClasses.join(', ') : 'Tüm Sınıflar'}</div>
          </div>
        </div>

          <!-- SIFIR YATAY KAYDIRMA MOBİL & EKRAN GÖRÜNTÜSÜ TABLOSU (12-15 Kişi Tek Ekrana Sığar) -->
          <div class="w-full overflow-hidden">
            <table class="w-full text-left border-collapse table-fixed text-xs">
              <!-- Üst Başlıklar (Soldan Sağa: Öğrenci, 5 Ders, Öğrenci Ortalaması, Veli Paylaşım) -->
              <thead>
                <tr class="bg-slate-100 text-[10px] sm:text-[11px] font-black uppercase text-slate-600 border-b border-slate-200 h-8">
                  <th id="th-matrix-talebe" class="py-1 pl-2.5 pr-1 text-slate-700 truncate">
                    Talebe ${this.sortBy === 'score_desc' ? '(Derece)' : ''}
                  </th>
                  ${this.subjects.map(s => `
                    <th class="w-9 sm:w-11 py-1 px-0.5 text-center border-l border-slate-200">
                      <div class="text-[11px] leading-tight">${s.icon}</div>
                      <div class="text-[9px] font-black text-slate-600 leading-tight">${s.short}</div>
                    </th>
                  `).join('')}
                  <th class="w-11 sm:w-13 py-1 px-0.5 text-center border-l border-slate-200 bg-amber-50/70 text-amber-900">
                    <div class="text-[11px] leading-tight">⭐</div>
                    <div class="text-[9px] font-black leading-tight">ORT.</div>
                  </th>
                  <th class="w-8 sm:w-10 py-1 px-0.5 text-center border-l border-slate-200 text-emerald-700 no-print">
                    📱
                  </th>
                </tr>
              </thead>

              <!-- Tablo Gövdesi: Her Satırda Bir Öğrenci -->
              <tbody id="takviye-matrix-tbody" class="divide-y divide-slate-100 text-xs">
                <!-- renderMatrixTableBody ile doldurulacak -->
              </tbody>

              <!-- EN ALT TABLO ÖZET SATIRI (DERS SINIF ORTALAMALARI VE GENEL ORTALAMA) -->
              <tfoot class="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white font-black text-[10px] sm:text-[11px] border-t-2 border-amber-400">
                <tr class="h-9 sm:h-10">
                  <td class="py-1.5 pl-2.5 pr-1 truncate">
                    <div class="text-amber-300 font-black text-[10px] sm:text-[11px] flex items-center gap-1">
                      <span>📊</span>
                      <span>ORTALAMA</span>
                    </div>
                    <div id="footer-eval-count" class="text-[9px] text-slate-300 font-normal truncate">
                      0 Talebe Notlandırıldı
                    </div>
                  </td>
                  ${this.subjects.map(s => `
                    <td class="py-1 px-0.5 text-center border-l border-slate-800">
                      <div id="col-avg-${s.key}" class="text-[11px] font-black text-white">
                        -
                      </div>
                    </td>
                  `).join('')}
                  <td class="py-1 px-0.5 text-center border-l border-slate-800 bg-amber-500/20">
                    <div id="overall-avg" class="text-[11px] font-black text-amber-300">
                      -
                    </div>
                  </td>
                  <td class="py-1 px-0.5 text-center border-l border-slate-800 no-print"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- KURUMSAL YAZDIRMA İMZA VE MÜHÜR ALANI (Sadece Çıktıda Görünür) -->
          <div class="print-only mt-8 pt-4 border-t border-slate-300 pb-4">
            <div class="flex justify-between items-end px-12 text-xs font-bold text-slate-800">
              <div class="text-center">
                <div>Ders Öğretmeni</div>
                <div class="mt-14 font-normal text-slate-500">İmza</div>
              </div>
              <div class="text-center">
                <div>Mühür & İmza</div>
                <div class="mt-14 font-normal text-slate-500">Kurum Kaşe / Onay</div>
              </div>
            </div>
          </div>
        </div>

        <!-- VELİ İLE PAYLAŞIM VE GÖRÜNTÜ ALMA MODALI -->
        ${this.renderShareModalHtml()}
      </div>
    `;

    this.renderMatrixTableBody();
  },

  renderMatrixTableBody() {
    const tbody = document.getElementById('takviye-matrix-tbody');
    if (!tbody) return;

    const students = this.getFilteredStudents();
    const scores = window.Store.getAcademicScores();
    // Hızlı erişim için map: { `${studentId}_${subject}`: score }
    const scoreMap = {};
    scores.forEach(s => {
      if (s.date === this.currentDate) {
        scoreMap[`${s.studentId}_${s.subject}`] = s.score;
      }
    });

    if (students.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${this.subjects.length + 3}" class="py-8 text-center text-slate-400 font-bold text-xs">
            Seçilen kriterlere uygun öğrenci bulunamadı.
          </td>
        </tr>
      `;
      // Ortalamaları sıfırla
      this.subjects.forEach(s => {
        const el = document.getElementById(`col-avg-${s.key}`);
        if (el) el.innerHTML = `<span class="text-slate-400 font-bold">-</span>`;
      });
      const overall = document.getElementById('overall-avg');
      if (overall) overall.innerHTML = `<span class="text-slate-400 font-bold">-</span>`;
      const fCount = document.getElementById('footer-eval-count');
      if (fCount) fCount.textContent = '0 Talebe Notlandırıldı';
      return;
    }

    tbody.innerHTML = students.map((st, idx) => {
      // Öğrencinin girilmiş ders notlarının ortalamasını hesapla
      const studentScores = [];
      this.subjects.forEach(subj => {
        const val = scoreMap[`${st.id}_${subj.name}`];
        if (val !== undefined && val !== null && !isNaN(val) && val !== '') {
          studentScores.push(Number(val));
        }
      });

      const hasScores = studentScores.length > 0;
      const rowAvg = hasScores 
        ? Math.round((studentScores.reduce((a, b) => a + b, 0) / studentScores.length) * 10) / 10 
        : null;

      const avgStyle = this.getColorStyle(rowAvg);

      // Sıralama Madalyası / Sıra Numarası (Nota göre sıralıyken)
      let rankBadge = '';
      if (this.sortBy === 'score_desc') {
        if (hasScores) {
          if (idx === 0) rankBadge = '<span class="text-xs">🥇</span>';
          else if (idx === 1) rankBadge = '<span class="text-xs">🥈</span>';
          else if (idx === 2) rankBadge = '<span class="text-xs">🥉</span>';
          else rankBadge = `<span class="text-slate-500 font-mono text-[9px] font-bold">#${idx + 1}</span>`;
        } else {
          rankBadge = '<span class="text-slate-300 font-mono text-[9px]">-</span>';
        }
      } else {
        rankBadge = `<span class="text-slate-400 font-mono text-[9px]">${idx + 1}</span>`;
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

          <!-- 2. 5 Takviye Dersi Giriş Hücreleri -->
          ${this.subjects.map(subj => {
            const rawScore = scoreMap[`${st.id}_${subj.name}`];
            const currentScore = (rawScore !== undefined && rawScore !== null) ? rawScore : '';
            const color = this.getColorStyle(currentScore);

            return `
              <td class="py-0.5 px-0.5 text-center border-l border-slate-100">
                <input type="number" min="0" max="100" 
                  id="cell-${st.id}-${subj.key}"
                  placeholder="-"
                  value="${currentScore}"
                  style="background-color: ${color.bg}; color: ${color.text}; border-color: ${color.border};"
                  class="w-8 sm:w-10 h-7 text-center font-black rounded-lg border text-xs p-0 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  oninput="window.AkademiModule.handleMatrixInput('${st.id}', '${subj.key}', this.value)"
                  onblur="window.AkademiModule.handleMatrixBlur('${st.id}', '${subj.key}', this.value)">
              </td>
            `;
          }).join('')}

          <!-- 3. Sağdaki Öğrenci Ortalaması Rozeti -->
          <td class="py-0.5 px-0.5 text-center border-l border-slate-100 bg-slate-50/50">
            <div id="row-avg-${st.id}">
              ${rowAvg === null ? `
                <span class="text-slate-300 font-bold text-xs">-</span>
              ` : `
                <span class="inline-block px-1.5 py-0.5 rounded-md font-black text-[11px] sm:text-xs border shadow-2xs ${avgStyle.badge}"
                  style="background-color: ${avgStyle.bg}; color: ${avgStyle.text}; border-color: ${avgStyle.border};">
                  ${rowAvg.toFixed(1)}
                </span>
              `}
            </div>
          </td>

          <!-- 4. Veli İle Paylaş Butonu (Görüntü Alma & WhatsApp) -->
          <td class="py-0.5 px-0.5 text-center border-l border-slate-100 no-print">
            <button type="button" onclick="window.AkademiModule.openShareModal('${st.id}')"
              title="Veli Karnesi / WhatsApp"
              class="w-6 h-6 rounded-md bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white inline-flex items-center justify-center text-xs border border-emerald-200 transition shadow-2xs group cursor-pointer">
              📱
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Alt satırdaki ders sınıf ortalamalarını ve genel ortalamayı hesapla
    this.recalculateAllColumnAverages(students);
  },

  // --- HÜCREYE NOT YAZILDIĞINDA ANINDA CANLI HESAPLAMA & KAYIT ---
  handleMatrixInput(studentId, subjectKey, value) {
    const cleanVal = (value || '').toString().trim();
    const num = (cleanVal === '' || isNaN(cleanVal)) ? null : Math.min(100, Math.max(0, parseInt(cleanVal, 10)));

    // 1. Hücrenin renk ve stilini anında güncelle (85 altı kırmızı, 85-100 yeşile geçiş, 100 tam yeşil)
    const cell = document.getElementById(`cell-${studentId}-${subjectKey}`);
    const colorStyle = this.getColorStyle(num);
    if (cell) {
      cell.style.backgroundColor = colorStyle.bg;
      cell.style.color = colorStyle.text;
      cell.style.borderColor = colorStyle.border;
    }

    // 2. Öğrencinin satır ortalamasını anında güncelle
    this.updateStudentRowAverage(studentId);

    // 3. İlgili dersin sınıf ortalamasını anında güncelle
    this.updateSubjectColumnAverage(subjectKey);

    // 4. Genel sınıf ortalamasını anında güncelle
    this.updateOverallAverage();

    // 5. Veritabanına Anında Otomatik Kayıt
    const key = `${studentId}_${subjectKey}`;
    if (this.saveTimers[key]) clearTimeout(this.saveTimers[key]);

    const indicator = document.getElementById('matrix-save-indicator');
    if (indicator) {
      indicator.innerHTML = `<span class="text-amber-500 font-bold text-xs animate-pulse">💾 Kaydediliyor...</span>`;
    }

    this.saveTimers[key] = setTimeout(() => {
      window.Store.saveSingleAcademicScore(
        studentId,
        this.currentDate,
        subjectKey,
        num
      );
      if (indicator) {
        indicator.innerHTML = `<span class="text-emerald-600 font-black text-xs">✓ Otomatik Kaydedildi</span>`;
        setTimeout(() => {
          if (indicator) indicator.innerHTML = '';
        }, 1800);
      }
    }, 350);
  },

  handleMatrixBlur(studentId, subjectKey, value) {
    const cleanVal = (value || '').toString().trim();
    const num = (cleanVal === '' || isNaN(cleanVal)) ? null : Math.min(100, Math.max(0, parseInt(cleanVal, 10)));
    window.Store.saveSingleAcademicScore(
      studentId,
      this.currentDate,
      subjectKey,
      num
    );
    const cell = document.getElementById(`cell-${studentId}-${subjectKey}`);
    if (cell && num !== null) {
      cell.value = num;
    }

    // Eğer puana göre sıralıysa ve kullanıcı başka bir input kutusuna odaklanmadıysa listeyi yeniden sırala
    if (this.sortBy === 'score_desc') {
      setTimeout(() => {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT')) {
          this.renderMatrixTableBody();
        }
      }, 300);
    }
  },

  // --- CANLI ORTALAMA HESAPLAMA METODLARI ---
  calculateStudentAverage(studentId) {
    const scores = [];
    this.subjects.forEach(subj => {
      const inputEl = document.getElementById(`cell-${studentId}-${subj.key}`);
      if (inputEl && inputEl.value !== '') {
        const v = parseFloat(inputEl.value);
        if (!isNaN(v)) scores.push(v);
      }
    });
    if (scores.length === 0) return null;
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  },

  updateStudentRowAverage(studentId) {
    const avg = this.calculateStudentAverage(studentId);
    const container = document.getElementById(`row-avg-${studentId}`);
    if (!container) return;

    if (avg === null) {
      container.innerHTML = `<span class="text-slate-300 font-bold text-xs">-</span>`;
      return;
    }

    const rounded = Math.round(avg * 10) / 10;
    const st = this.getColorStyle(rounded);
    container.innerHTML = `
      <span class="inline-block px-1.5 py-0.5 rounded-md font-black text-[11px] sm:text-xs border shadow-2xs ${st.badge}"
        style="background-color: ${st.bg}; color: ${st.text}; border-color: ${st.border};">
        ${rounded.toFixed(1)}
      </span>
    `;
  },

  calculateSubjectAverage(subjectKey, students) {
    const scores = [];
    const stList = students || this.getFilteredStudents();
    stList.forEach(st => {
      const inputEl = document.getElementById(`cell-${st.id}-${subjectKey}`);
      if (inputEl && inputEl.value !== '') {
        const v = parseFloat(inputEl.value);
        if (!isNaN(v)) scores.push(v);
      }
    });
    if (scores.length === 0) return null;
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  },

  updateSubjectColumnAverage(subjectKey, students) {
    const avg = this.calculateSubjectAverage(subjectKey, students);
    const container = document.getElementById(`col-avg-${subjectKey}`);
    if (!container) return;

    if (avg === null) {
      container.innerHTML = `<span class="text-slate-400 font-bold text-xs">-</span>`;
      return;
    }

    const rounded = Math.round(avg * 10) / 10;
    container.innerHTML = `<span class="text-[11px] font-black text-white">${rounded.toFixed(1)}</span>`;
  },

  updateOverallAverage(students) {
    const stList = students || this.getFilteredStudents();
    const allScores = [];
    let evaluatedCount = 0;

    stList.forEach(st => {
      let hasAny = false;
      this.subjects.forEach(subj => {
        const inputEl = document.getElementById(`cell-${st.id}-${subj.key}`);
        if (inputEl && inputEl.value !== '') {
          const v = parseFloat(inputEl.value);
          if (!isNaN(v)) {
            allScores.push(v);
            hasAny = true;
          }
        }
      });
      if (hasAny) evaluatedCount++;
    });

    const fCount = document.getElementById('footer-eval-count');
    if (fCount) {
      fCount.textContent = `${evaluatedCount} Talebe Notlandırıldı`;
    }

    const container = document.getElementById('overall-avg');
    if (!container) return;

    if (allScores.length === 0) {
      container.innerHTML = `<span class="text-slate-400 font-bold text-xs">-</span>`;
      return;
    }

    const overall = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    const rounded = Math.round(overall * 10) / 10;
    container.innerHTML = `<span class="text-[11px] font-black text-amber-300">${rounded.toFixed(1)}</span>`;
  },

  recalculateAllColumnAverages(students) {
    const stList = students || this.getFilteredStudents();
    this.subjects.forEach(s => {
      this.updateSubjectColumnAverage(s.key, stList);
    });
    this.updateOverallAverage(stList);
  },

  // --- VELİ İLE PAYLAŞIM, GÖRÜNTÜ ALMA (SNAPSHOT) VE ÇIKTI METODLARI ---
  generateShareCardHtml(studentId) {
    const student = window.Store.getStudentById(studentId);
    if (!student) return '<div class="p-6 text-center text-slate-400">Öğrenci bulunamadı.</div>';

    const scores = window.Store.getAcademicScores();
    const scoreMap = {};
    scores.forEach(s => {
      if (s.studentId === studentId && s.date === this.currentDate) {
        scoreMap[s.subject] = s.score;
      }
    });

    const dayName = this.getDayName(this.currentDate);
    const dateFormatted = this.currentDate ? this.currentDate.split('-').reverse().join('.') : '';

    const studentScores = [];
    this.subjects.forEach(subj => {
      const val = scoreMap[subj.name];
      if (val !== undefined && val !== null && !isNaN(val)) {
        studentScores.push(Number(val));
      }
    });

    const avg = studentScores.length > 0 
      ? Math.round((studentScores.reduce((a, b) => a + b, 0) / studentScores.length) * 10) / 10 
      : null;

    const avgStyle = this.getColorStyle(avg);

    // Başarı Durumu İbaresi
    let statusText = 'Değerlendirme Aşamasında';
    let statusBadge = 'bg-slate-100 text-slate-700 border-slate-200';
    if (avg !== null) {
      if (avg >= 95) {
        statusText = '🌟 Üstün Başarı & Tebrik';
        statusBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
      } else if (avg >= 85) {
        statusText = '👍 Başarılı & Gayretli';
        statusBadge = 'bg-lime-100 text-lime-800 border-lime-300';
      } else {
        statusText = '🎯 Takviye & Tekrar Yapılmalı';
        statusBadge = 'bg-amber-100 text-amber-800 border-amber-300';
      }
    }

    return `
      <!-- KART ÜST BAŞLIĞI -->
      <div class="border-b-2 border-slate-800 pb-3.5 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl shadow-sm">
            🎓
          </div>
          <div>
            <div class="text-[10px] font-black tracking-widest text-slate-500 uppercase">T.C. MİLLİ EĞİTİM BAKANLIĞI</div>
            <div class="text-base font-black text-slate-900 tracking-tight leading-tight">ÖMER AVNİYEL AKADEMİ</div>
            <div class="text-[11px] font-bold text-blue-700">TAKVİYE DERS GELİŞİM VE NOT KARNESİ</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs font-black text-slate-900 flex items-center justify-end gap-1">
            <span>📅</span>
            <span>${dateFormatted}</span>
          </div>
          <div class="text-[11px] font-bold text-slate-500">${dayName}</div>
        </div>
      </div>

      <!-- ÖĞRENCİ KÜNYESİ -->
      <div class="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl">
            👤
          </div>
          <div>
            <div class="text-[10px] text-slate-300 font-bold uppercase tracking-wide">Öğrenci Adı Soyadı</div>
            <div class="text-base sm:text-lg font-black tracking-tight text-amber-300">
              ${student.firstName} ${student.lastName}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-4 text-xs">
          <div class="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
            <span class="text-[10px] text-slate-400 block font-bold">SINIFI</span>
            <span class="font-black text-white text-sm">${student.className || '-'}</span>
          </div>
          <div class="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
            <span class="text-[10px] text-slate-400 block font-bold">OKUL NO</span>
            <span class="font-mono font-black text-white text-sm">${student.studentNo || '-'}</span>
          </div>
        </div>
      </div>

      <!-- DERS NOTLARI IZGARASI (5 TAKVİYE DERSİ) -->
      <div class="space-y-2">
        <div class="text-[11px] font-black text-slate-600 uppercase tracking-wide flex items-center justify-between">
          <span>📚 DERS PERFORMANS NOTLARI</span>
          <span class="text-[10px] text-slate-400 font-normal">Tam Not: 100</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          ${this.subjects.map(subj => {
            const rawScore = scoreMap[subj.name];
            const hasScore = (rawScore !== undefined && rawScore !== null && !isNaN(rawScore));
            const scoreNum = hasScore ? Number(rawScore) : null;
            const style = this.getColorStyle(scoreNum);

            return `
              <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2 shadow-2xs">
                <div class="flex items-center gap-2">
                  <span class="text-xl">${subj.icon}</span>
                  <div>
                    <div class="text-xs font-black text-slate-800">${subj.name}</div>
                    <div class="text-[10px] text-slate-400 font-bold">${subj.short} Dersi</div>
                  </div>
                </div>
                <div>
                  ${hasScore ? `
                    <span class="px-2.5 py-1 rounded-xl text-xs font-black border inline-block ${style.badge}"
                      style="background-color: ${style.bg}; color: ${style.text}; border-color: ${style.border};">
                      ${scoreNum}
                    </span>
                  ` : `
                    <span class="px-2 py-0.5 rounded-lg text-xs font-bold text-slate-400 bg-white border border-slate-200">
                      -
                    </span>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- GENEL ORTALAMA VE BAŞARI DURUMU -->
      <div class="p-3.5 rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50/70 via-white to-slate-50 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div>
          <div class="text-[10px] font-black text-slate-500 uppercase tracking-wide">DERSLER GENEL ORTALAMASI</div>
          <div class="text-xs text-slate-600 mt-0.5">5 Takviye dersinin güncel aritmetik ortalaması</div>
        </div>
        <div class="flex items-center gap-2.5">
          <span class="px-3 py-1 rounded-xl text-xs font-black border ${statusBadge}">
            ${statusText}
          </span>
          <div class="px-3.5 py-1.5 rounded-xl text-base font-black border shadow-sm ${avgStyle.badge}"
            style="background-color: ${avgStyle.bg}; color: ${avgStyle.text}; border-color: ${avgStyle.border};">
            ${avg !== null ? avg.toFixed(1) : '-'}
          </div>
        </div>
      </div>

      <!-- VELİ BİLGİLENDİRME VE TEBRİK NOTU -->
      <div class="text-[11px] text-slate-600 bg-blue-50/60 border border-blue-200 rounded-xl p-3 leading-relaxed">
        <span class="font-black text-blue-900">Sayın Velimiz;</span> Talebemizin takviye ders gayreti ve not değerlendirmesi yukarıda bilgilerinize sunulmuştur. Göstermiş olduğu azim ve çalışkanlıktan ötürü talebemizi tebrik eder, başarılarının daim olmasını temenni ederiz.
      </div>

      <!-- MÜHÜR VE EĞİTMEN ALANI -->
      <div class="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-bold">
        <div>
          <span>Ömer Avniyel Akademi Kurs Yönetimi</span>
        </div>
        <div class="text-right">
          <span>Mühür & İmza: </span>
          <span class="text-slate-800 font-black">Onaylandı ✓</span>
        </div>
      </div>
    `;
  },

  openShareModal(studentId) {
    this.shareStudentId = studentId;
    const cardEl = document.getElementById('takviye-share-card');
    if (cardEl) {
      cardEl.innerHTML = this.generateShareCardHtml(studentId);
    }
    const modal = document.getElementById('takviye-share-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  },

  closeShareModal() {
    this.shareStudentId = null;
    const modal = document.getElementById('takviye-share-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  },

  downloadCardImage() {
    const card = document.getElementById('takviye-share-card');
    if (!card) return;

    if (typeof html2canvas === 'undefined') {
      window.App.showToast('Görüntü alma kütüphanesi henüz hazır değil. Lütfen sayfayı yenileyiniz.', 'error');
      return;
    }

    const student = this.shareStudentId ? window.Store.getStudentById(this.shareStudentId) : null;
    const studentName = student ? `${student.firstName}_${student.lastName}`.replace(/\s+/g, '_') : 'Ogrenci';

    const btn = document.getElementById('btn-download-card-img');
    const oldText = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '⏳ Hazırlanıyor...';

    html2canvas(card, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = `${studentName}_Takviye_Not_Karnesi_${this.currentDate}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      if (btn) btn.innerHTML = oldText;
      window.App.showToast('Karne yüksek çözünürlüklü resim (PNG) olarak indirildi!', 'success');
    }).catch(err => {
      console.error(err);
      if (btn) btn.innerHTML = oldText;
      window.App.showToast('Resim oluşturulurken bir hata meydana geldi.', 'error');
    });
  },

  copyCardImage() {
    const card = document.getElementById('takviye-share-card');
    if (!card) return;

    if (typeof html2canvas === 'undefined') {
      window.App.showToast('Görüntü alma kütüphanesi henüz hazır değil. Lütfen sayfayı yenileyiniz.', 'error');
      return;
    }

    const student = this.shareStudentId ? window.Store.getStudentById(this.shareStudentId) : null;
    const studentName = student ? `${student.firstName}_${student.lastName}`.replace(/\s+/g, '_') : 'Ogrenci';

    const btn = document.getElementById('btn-copy-card-img');
    const oldText = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '⏳ Kopyalanıyor...';

    html2canvas(card, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    }).then(canvas => {
      canvas.toBlob(blob => {
        if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
          navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]).then(() => {
            if (btn) btn.innerHTML = oldText;
            window.App.showToast('📋 Karne resmi panoya kopyalandı! WhatsApp Web veya mesaja yapıştırabilirsiniz (Ctrl+V).', 'success');
          }).catch(e => {
            // Fallback: download
            const link = document.createElement('a');
            link.download = `${studentName}_Takviye_Not_Karnesi_${this.currentDate}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            if (btn) btn.innerHTML = oldText;
            window.App.showToast('Resim indirildi (Tarayıcınız panoya doğrudan kopyalamayı desteklemedi).', 'info');
          });
        } else {
          const link = document.createElement('a');
          link.download = `${studentName}_Takviye_Not_Karnesi_${this.currentDate}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          if (btn) btn.innerHTML = oldText;
          window.App.showToast('Resim cihazınıza indirildi.', 'info');
        }
      }, 'image/png');
    }).catch(err => {
      console.error(err);
      if (btn) btn.innerHTML = oldText;
      window.App.showToast('Resim oluşturulamadı.', 'error');
    });
  },

  shareViaWhatsApp(targetStudentId) {
    const studentId = targetStudentId || this.shareStudentId;
    if (!studentId) return;

    const student = window.Store.getStudentById(studentId);
    if (!student) return;

    const scores = window.Store.getAcademicScores().filter(s => s.studentId === studentId && s.date === this.currentDate);
    const scoreMap = {};
    scores.forEach(s => scoreMap[s.subject] = s.score);

    let subjectLines = this.subjects.map(subj => {
      const val = scoreMap[subj.name];
      const displayVal = (val !== undefined && val !== null && !isNaN(val)) ? `${val} / 100` : '-';
      return `${subj.icon} *${subj.name}:* ${displayVal}`;
    }).join('\n');

    const avg = this.calculateStudentAverage(studentId);
    const avgText = avg !== null ? `${avg.toFixed(1)} / 100` : '-';
    const dayName = this.getDayName(this.currentDate);
    const dateFormatted = this.currentDate ? this.currentDate.split('-').reverse().join('.') : '';

    let phone = student.fatherPhone || student.motherPhone || student.phone || '';
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '90' + cleanPhone.substring(1);
    } else if (cleanPhone && !cleanPhone.startsWith('90')) {
      cleanPhone = '90' + cleanPhone;
    }

    const message = `🎓 *ÖMER AVNİYEL AKADEMİ*
*TAKVİYE DERS GELİŞİM VE NOT RAPORU*

Sayın Velimiz,
Öğrencimiz *${student.firstName} ${student.lastName}* (${student.className || '-'}, No: ${student.studentNo}) takviye ders değerlendirme sonuçları:

📅 *Tarih:* ${dateFormatted} (${dayName})

${subjectLines}

⭐ *GENEL ORTALAMA:* ${avgText}

Talebemizin azim ve gayretinin daim olmasını temenni eder, başarılar dileriz.`;

    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
  },

  printSingleCard() {
    document.body.classList.add('print-single-card-mode');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('print-single-card-mode');
    }, 1000);
  },

  printMatrixTable() {
    document.body.classList.remove('print-single-card-mode');
    window.print();
  },

  downloadTableImage() {
    const tableContainer = document.getElementById('takviye-matrix-table-container');
    if (!tableContainer) return;

    if (typeof html2canvas === 'undefined') {
      window.App.showToast('Görüntü alma kütüphanesi henüz hazır değil. Lütfen sayfayı yenileyiniz.', 'error');
      return;
    }

    const btn = document.getElementById('btn-download-matrix-img');
    const oldText = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '⏳ Hazırlanıyor...';

    html2canvas(tableContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = `Takviye_Ders_Not_Cizelgesi_${this.currentDate}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      if (btn) btn.innerHTML = oldText;
      window.App.showToast('Not çizelgesi resim olarak indirildi!', 'success');
    }).catch(err => {
      console.error(err);
      if (btn) btn.innerHTML = oldText;
      window.App.showToast('Çizelge resmi oluşturulurken hata oluştu.', 'error');
    });
  },

  renderShareModalHtml() {
    return `
      <!-- TAKVİYE NOTLARI VELİ PAYLAŞIM VE GÖRÜNTÜ ALMA MODALI -->
      <div id="takviye-share-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm hidden p-3 sm:p-6 overflow-y-auto no-print">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto animate-fade-in">
          <!-- Modal Üst Başlık Çubuğu -->
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <div class="flex items-center gap-2">
              <span class="text-xl">📸</span>
              <div>
                <h3 class="text-sm font-black text-slate-800">Veli İle Paylaşım & Görüntü Alma</h3>
                <p class="text-[10px] text-slate-400">Yüksek çözünürlüklü karne kartı, WhatsApp ile anında paylaşım veya çıktı alma</p>
              </div>
            </div>
            <button type="button" onclick="window.AkademiModule.closeShareModal()"
              class="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold shadow-2xs hover:bg-slate-100 transition cursor-pointer">
              ✕
            </button>
          </div>

          <!-- Modal İçeriği / Kart Önizleme -->
          <div class="p-4 sm:p-6 max-h-[75vh] overflow-y-auto bg-slate-100/60 flex flex-col items-center">
            <!-- FOTOĞRAF ALINACAK KART BAŞLANGICI -->
            <div id="takviye-share-card" class="w-full bg-white rounded-2xl shadow-md border border-slate-200 p-5 sm:p-6 space-y-4 text-slate-800">
              <!-- Dinamik doldurulur -->
            </div>
            <!-- FOTOĞRAF ALINACAK KART BİTİŞİ -->
          </div>

          <!-- Modal Alt Butonları -->
          <div class="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            <button type="button" onclick="window.AkademiModule.closeShareModal()"
              class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition cursor-pointer">
              Kapat
            </button>

            <div class="flex flex-wrap items-center gap-2">
              <!-- 1. Tek Yazdır -->
              <button type="button" onclick="window.AkademiModule.printSingleCard()"
                class="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition cursor-pointer">
                <span>🖨️</span>
                <span>Yazdır</span>
              </button>

              <!-- 2. Panoya Kopyala -->
              <button type="button" onclick="window.AkademiModule.copyCardImage()" id="btn-copy-card-img"
                class="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Görüntüyü kopyalayıp WhatsApp Web'e yapıştırabilirsiniz">
                <span>📋</span>
                <span>Resmi Kopyala</span>
              </button>

              <!-- 3. Resmi İndir (PNG) -->
              <button type="button" onclick="window.AkademiModule.downloadCardImage()" id="btn-download-card-img"
                class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition cursor-pointer">
                <span>📸</span>
                <span>Resmi İndir (PNG)</span>
              </button>

              <!-- 4. WhatsApp ile Paylaş -->
              <button type="button" onclick="window.AkademiModule.shareViaWhatsApp()"
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition cursor-pointer">
                <span>💬</span>
                <span>WhatsApp İle Gönder</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // --- 2. GENEL GELİŞİM & KARNE GÖRÜNÜMÜ ---
  renderGenelKarneView(container) {
    const students = window.Store.getStudents();
    const today = new Date().toISOString().split('T')[0];

    container.innerHTML = `
      <div class="space-y-4 animate-fade-in max-w-5xl mx-auto">
        <!-- 1. AKADEMİ ALT BAŞLIKLARI (Hap Butonlar) -->
        <div class="flex items-center gap-2 p-1.5 bg-slate-200/90 rounded-2xl max-w-md mx-auto shadow-inner">
          ${this.subCategories.map(sub => {
            const isActive = this.currentSubCategory === sub.id;
            return `
              <button type="button" onclick="window.AkademiModule.setSubCategory('${sub.id}')"
                class="flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  isActive 
                    ? 'bg-white text-slate-900 shadow-md scale-102 ring-2 ring-emerald-500/30' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }">
                <span>${sub.icon}</span>
                <span>${sub.label}</span>
              </button>
            `;
          }).join('')}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Sol Panel: Yeni Performans Girişi Formu -->
          <div class="lg:col-span-5 bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-6">
            <div class="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-4">
              <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black text-lg">
                ⭐
              </div>
              <div>
                <h3 class="font-black text-slate-900 text-sm sm:text-base">Genel Gelişim & Karne Girişi</h3>
                <p class="text-[11px] text-slate-400">Yıldız kriterleri, rozetler ve öğretmen görüşleri</p>
              </div>
            </div>

            <form id="perf-form" onsubmit="window.AkademiModule.savePerformanceEntry(event)" class="space-y-4">
              <div>
                <label class="block text-[11px] font-black text-slate-600 mb-1">ÖĞRENCİ SEÇİNİZ *</label>
                <select id="perf-student-id" required
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none">
                  <option value="">-- Öğrenci Seçin --</option>
                  ${students.map(s => `<option value="${s.id}">${s.studentNo} - ${s.firstName} ${s.lastName} (${s.className})</option>`).join('')}
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-black text-slate-600 mb-1">DERS / ALAN *</label>
                  <select id="perf-subject" required
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none">
                    <option value="Kuran-ı Kerim & Ezber">Kuran-ı Kerim & Ezber</option>
                    <option value="Tecvid & Mahreç">Tecvid & Mahreç</option>
                    <option value="Ahlak & İlmihal">Ahlak & İlmihal</option>
                    <option value="Siyer-i Nebi">Siyer-i Nebi</option>
                    <option value="Ders & Etüt Takibi">Ders & Etüt Takibi</option>
                    <option value="Genel Düzen & Ahlak">Genel Düzen & Ahlak</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-black text-slate-600 mb-1">TARİH</label>
                  <input type="date" id="perf-date" value="${today}"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none">
                </div>
              </div>

              <!-- Kriterler -->
              <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                <div class="text-[11px] font-black text-slate-700 uppercase tracking-wide">Kriter Puanlaması (1 - 5)</div>
                
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-600 font-bold">Ders Katılımı:</span>
                  <select id="perf-part" class="px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 text-xs">
                    <option value="5">⭐⭐⭐⭐⭐ (5 - Pekiyi)</option>
                    <option value="4">⭐⭐⭐⭐ (4 - İyi)</option>
                    <option value="3">⭐⭐⭐ (3 - Orta)</option>
                    <option value="2">⭐⭐ (2 - Geçer)</option>
                    <option value="1">⭐ (1 - Zayıf)</option>
                  </select>
                </div>

                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-600 font-bold">Ödev & Ezber:</span>
                  <select id="perf-hw" class="px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 text-xs">
                    <option value="5">⭐⭐⭐⭐⭐ (5 - Tam)</option>
                    <option value="4">⭐⭐⭐⭐ (4 - İyi)</option>
                    <option value="3">⭐⭐⭐ (3 - Kısmi)</option>
                    <option value="2">⭐⭐ (2 - Eksik)</option>
                    <option value="1">⭐ (1 - Yapılmadı)</option>
                  </select>
                </div>

                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-600 font-bold">Namaz & Uyum:</span>
                  <select id="perf-beh" class="px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 text-xs">
                    <option value="5">⭐⭐⭐⭐⭐ (5 - Mükemmel)</option>
                    <option value="4">⭐⭐⭐⭐ (4 - İyi)</option>
                    <option value="3">⭐⭐⭐ (3 - Uyarılı)</option>
                    <option value="2">⭐⭐ (2 - Gelişmeli)</option>
                    <option value="1">⭐ (1 - Kurallara Uymadı)</option>
                  </select>
                </div>

                <div class="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                  <span class="text-slate-800 font-black">Genel Kanaat Puanı (100):</span>
                  <input type="number" id="perf-score" min="0" max="100" value="95" 
                    class="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg font-black text-center text-slate-800 text-xs">
                </div>
              </div>

              <!-- Rozetler -->
              <div>
                <label class="block text-[11px] font-black text-slate-600 mb-1.5">ÖĞRENCİYE BAŞARI ROZETİ EKLE</label>
                <div id="perf-badges-container" class="flex flex-wrap gap-1.5">
                  <!-- renderBadgesPicker ile doldurulacak -->
                </div>
              </div>

              <!-- Öğretmen Notu -->
              <div>
                <label class="block text-[11px] font-black text-slate-600 mb-1">ÖĞRETMEN GÖRÜŞÜ (Velinin Göreceği Not)</label>
                <textarea id="perf-note" rows="2" placeholder="Öğrencinin haftalık/aylık gayreti, tebrik veya tavsiyeler..." 
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"></textarea>
              </div>

              <!-- Değerlendiren Hoca -->
              <div>
                <label class="block text-[11px] font-black text-slate-600 mb-1">DEĞERLENDİREN EĞİTMEN</label>
                <input type="text" id="perf-teacher" placeholder="Örn: Ders Hocası" 
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none">
              </div>

              <button type="submit" 
                class="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow transition flex items-center justify-center gap-2">
                <span>✓ Değerlendirmeyi Kaydet</span>
              </button>
            </form>
          </div>

          <!-- Sağ Panel: Kayıtlı Değerlendirmeler -->
          <div class="lg:col-span-7 bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-6">
            <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 class="font-black text-slate-900 text-sm sm:text-base">Kayıtlı Gelişim Değerlendirmeleri</h3>
                <p class="text-[11px] text-slate-400">Velilerin görüntüleyebildiği karne notları</p>
              </div>
              <div>
                <input type="text" placeholder="Öğrenci veya ders ara..." 
                  class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-700 focus:ring-1 focus:ring-amber-500 focus:outline-none w-44"
                  oninput="window.AkademiModule.searchQuery = this.value.toLowerCase().trim(); window.AkademiModule.renderHistory();">
              </div>
            </div>

            <div id="perf-history-list" class="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              <!-- renderHistory ile doldurulacak -->
            </div>
          </div>
        </div>
      </div>
    `;

    this.renderBadgesPicker();
    this.renderHistory();
  },

  toggleBadge(badgeName) {
    if (this.selectedBadges.has(badgeName)) {
      this.selectedBadges.delete(badgeName);
    } else {
      this.selectedBadges.add(badgeName);
    }
    this.renderBadgesPicker();
  },

  renderBadgesPicker() {
    const container = document.getElementById('perf-badges-container');
    if (!container) return;

    container.innerHTML = this.AVAILABLE_BADGES.map(b => {
      const isSelected = this.selectedBadges.has(b.name);
      return `
        <button type="button" 
          onclick="window.AkademiModule.toggleBadge('${b.name}')"
          class="px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 transition-all ${
            isSelected 
              ? `${b.color} ring-2 ring-amber-500 scale-105 shadow-sm` 
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }">
          <span>${b.icon}</span>
          <span>${b.name}</span>
          ${isSelected ? '<span class="text-amber-700 font-black">✓</span>' : ''}
        </button>
      `;
    }).join('');
  },

  savePerformanceEntry(event) {
    if (event) event.preventDefault();

    const studentSelect = document.getElementById('perf-student-id');
    const subjectInput = document.getElementById('perf-subject');
    const dateInput = document.getElementById('perf-date');
    const scoreInput = document.getElementById('perf-score');
    const participation = document.getElementById('perf-part').value;
    const homework = document.getElementById('perf-hw').value;
    const behavior = document.getElementById('perf-beh').value;
    const note = document.getElementById('perf-note').value;
    const teacherName = document.getElementById('perf-teacher').value || 'Ders Öğretmeni';

    if (!studentSelect || !studentSelect.value) {
      window.App.showToast('Lütfen değerlendirilecek bir öğrenci seçiniz.', 'warning');
      return;
    }

    const newRecord = {
      studentId: studentSelect.value,
      date: dateInput.value || new Date().toISOString().split('T')[0],
      subject: subjectInput.value.trim() || 'Genel Değerlendirme',
      criteria: {
        participation: parseInt(participation) || 5,
        homework: parseInt(homework) || 5,
        behavior: parseInt(behavior) || 5,
        score: parseInt(scoreInput.value) || 100
      },
      badges: Array.from(this.selectedBadges),
      teacherNote: note.trim(),
      teacherName: teacherName.trim()
    };

    window.Store.addPerformance(newRecord);
    window.App.showToast('Öğrenci performans değerlendirmesi kaydedildi!', 'success');

    this.selectedBadges.clear();
    document.getElementById('perf-form').reset();
    document.getElementById('perf-date').value = new Date().toISOString().split('T')[0];
    this.renderBadgesPicker();
    this.renderHistory();
  },

  deleteEntry(id) {
    if (confirm('Bu değerlendirme kaydını silmek istediğinizden emin misiniz?')) {
      window.Store.deletePerformance(id);
      window.App.showToast('Değerlendirme kaydı silindi.', 'info');
      this.renderHistory();
    }
  },

  renderHistory() {
    const container = document.getElementById('perf-history-list');
    if (!container) return;

    let perfs = window.Store.getPerformances();

    if (this.searchQuery) {
      perfs = perfs.filter(p => {
        const student = window.Store.getStudentById(p.studentId);
        const name = student ? `${student.firstName} ${student.lastName}`.toLowerCase() : '';
        return name.includes(this.searchQuery) || (p.subject && p.subject.toLowerCase().includes(this.searchQuery));
      });
    }

    if (perfs.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-slate-400 text-xs">
          Henüz kayıtlı genel karne değerlendirmesi bulunmuyor.
        </div>
      `;
      return;
    }

    container.innerHTML = perfs.map(p => {
      const student = window.Store.getStudentById(p.studentId);
      const studentName = student ? `${student.firstName} ${student.lastName}` : 'Silinmiş Öğrenci';
      const studentClass = student ? student.className : '-';
      const studentNo = student ? student.studentNo : '-';

      return `
        <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition shadow-2xs">
          <div class="flex items-start justify-between gap-3 mb-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-black text-slate-900 text-xs sm:text-sm">${studentName}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">No: ${studentNo} (${studentClass})</span>
              </div>
              <div class="text-xs text-amber-800 font-bold mt-0.5">${p.subject}</div>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 font-black text-xs border border-amber-200">
                ${p.criteria?.score || 0} Puan
              </span>
              <button onclick="window.AkademiModule.deleteEntry('${p.id}')" 
                class="text-slate-400 hover:text-rose-600 p-1 transition" title="Sil">
                ✕
              </button>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 text-[10px] bg-white p-2 rounded-xl border border-slate-100 text-slate-600 mb-2">
            <div>Katılım: <span class="font-bold text-amber-500">${'★'.repeat(p.criteria?.participation || 5)}</span></div>
            <div>Ödev/Ezber: <span class="font-bold text-amber-500">${'★'.repeat(p.criteria?.homework || 5)}</span></div>
            <div>Uyum/Namaz: <span class="font-bold text-amber-500">${'★'.repeat(p.criteria?.behavior || 5)}</span></div>
          </div>

          ${p.badges && p.badges.length > 0 ? `
            <div class="flex flex-wrap gap-1 mb-2">
              ${p.badges.map(b => `<span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">${b}</span>`).join('')}
            </div>
          ` : ''}

          ${p.teacherNote ? `
            <div class="text-xs text-slate-700 bg-amber-50/60 border-l-2 border-amber-500 p-2 rounded-r mb-2">
              <span class="font-bold text-amber-950">Öğretmen Görüşü:</span> ${p.teacherNote}
            </div>
          ` : ''}

          <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
            <span>Tarih: ${p.date}</span>
            <span>Eğitmen: <strong class="text-slate-600">${p.teacherName || 'Öğretmen'}</strong></span>
          </div>
        </div>
      `;
    }).join('');
  }
};

// Geriye dönük tam uyumluluk referansı
window.PerformanceModule = window.AkademiModule;
