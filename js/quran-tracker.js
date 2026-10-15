/**
 * quran-tracker.js - Kur'an-ı Kerim Hatim ve Tilavet Takip Modülü (İrfaniye Akademi)
 * - Dini ders gruplarına (Dahili Hoca), Seviyelere ve Sınıflara göre gruplama
 * - Kaldığı sayfayı girince anında otomatik hesaplama:
 *    * Kaç sayfa okudu (ve toplam ömür boyu sayfa)
 *    * Kaç sayfa kaldı (604 sayfa üzerinden)
 *    * Yüzde kaç okudu (%)
 *    * Yüzde kaç kaldı (%)
 *    * Kaçıncı Cüzde olduğu
 *    * Tamamlanan Hatim sayısı
 * - Canlı TV Panosunda ve Podyumda en çok okuyanları sergileme
 * - Veliye tek tıkla WhatsApp Hatim Durumu Gönderme
 */

window.QuranTrackerModule = {
  selectedGroup: 'ALL',
  selectedLevel: 'ALL',
  selectedClass: 'ALL',
  selectedClasses: [], // Çoklu şube seçimi (5-A, 5-B vb.)
  searchQuery: '',
  viewMode: 'cards', // 'cards' | 'table' | 'groups'
  sortMode: 'rank', // 'rank' (Liderlik) | 'class' (Sınıf & No) | 'name' (İsim A-Z)
  orderedStudentIds: null, // Sabit liste sıralama hafızası: Yazma ve kaydetme sırasında liste kaymasını %100 önler
  _forceReorder: false,
  editingStudentId: null,
  tempPage: 1,
  tempHatim: 0,
  tempNote: '',
  pendingChanges: {}, // { [studentId]: { page: number, hatim: number } }

  init() {
    this.bindEvents();
    this.renderView();
  },

  hasPendingChanges() {
    return Object.keys(this.pendingChanges || {}).length > 0;
  },

  getPendingCount() {
    return Object.keys(this.pendingChanges || {}).length;
  },

  bindEvents() {
    if (!this._boundListener) {
      this._boundListener = () => {
        const container = document.getElementById('quran-tracker-container');
        if (!container) return;

        // 1. KULLANICI ŞU ANDA BİR INPUT İÇİNDE YAZIYOR VEYA SİLİYORSA:
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') && container.contains(active)) {
          // Kesinlikle renderView çalıştırma! Kullanıcının odağını ve sildiği/yazdığı değeri yok etme!
          return;
        }

        // 2. EĞER KAYDEDİLMEMİŞ DEĞİŞİKLİKLER (pendingChanges) VARSA:
        if (this.hasPendingChanges && this.hasPendingChanges()) {
          // Kullanıcının üzerinde çalıştığı taslakları ezmemek için arka plan senkronizasyonunda arayüzü sıfırlama!
          return;
        }

        this.renderView(true);
      };
      window.addEventListener('quran-tracker-updated', this._boundListener);
      window.addEventListener('cloud-sync-done', this._boundListener);

      window.addEventListener('beforeunload', (e) => {
        if (this.hasPendingChanges && this.hasPendingChanges()) {
          e.preventDefault();
          e.returnValue = 'Kaydedilmemiş Kur\'an takip değişiklikleriniz var!';
          return e.returnValue;
        }
      });
    }
  },

  setGroup(grp) {
    this.selectedGroup = grp;
    this.orderedStudentIds = null;
    this.renderView();
  },

  setLevel(lvl) {
    this.selectedLevel = lvl;
    this.orderedStudentIds = null;
    this.renderView();
  },

  setClass(cls) {
    this.selectedClass = cls;
    this.selectedClasses = [];
    this.orderedStudentIds = null;
    this.renderView();
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
    this.selectedClass = 'ALL';
    this.orderedStudentIds = null;
    this.renderView();
  },

  clearClasses() {
    this.selectedClasses = [];
    this.selectedClass = 'ALL';
    this.orderedStudentIds = null;
    this.renderView();
  },

  setViewMode(mode) {
    this.viewMode = mode;
    this.renderView();
  },

  setSortMode(mode) {
    this.sortMode = mode;
    this.orderedStudentIds = null;
    this._forceReorder = true;
    this.renderView();
  },

  reorderList() {
    this.orderedStudentIds = null;
    this._forceReorder = true;
    this.renderView();
    if (window.App && typeof window.App.showToast === 'function') {
      window.App.showToast('Liste sıralaması güncel sayfalara göre yenilendi.', 'info');
    }
  },

  // CANLI INPUT DİNLEYİCİSİ: Her tuş basımında / silmede (backspace, delete) çalışır.
  // DOM elementini (input) ASLA yok etmez, odağı kaybettirmez, silinen sayıyı zorla geri getirmez!
  onPageInput(inputEl, studentId) {
    if (!inputEl) return;
    const rawVal = inputEl.value;
    const rec = window.Store.getQuranRecord(studentId);
    const savedPage = rec.currentPage || 1;
    const savedHatim = rec.hatimCount || 0;

    let isPending = false;
    let pageNum = 0;
    let displayVal = rawVal;

    if (rawVal === '') {
      // Kullanıcı tüm rakamları sildi (backspace / delete).
      // Sayfa boş taslak olarak saklanır, ASLA eski haline geri dönmez!
      this.pendingChanges[studentId] = {
        page: '',
        hatim: savedHatim
      };
      isPending = true;
      pageNum = 0;
      displayVal = '';
    } else {
      let parsed = parseInt(rawVal, 10);
      if (isNaN(parsed) || parsed < 0) parsed = 0;
      if (parsed > 604) {
        parsed = 604;
        inputEl.value = '604';
      }
      pageNum = parsed;
      displayVal = parsed;

      if (parsed === savedPage) {
        delete this.pendingChanges[studentId];
        isPending = false;
      } else {
        this.pendingChanges[studentId] = {
          page: parsed,
          hatim: savedHatim
        };
        isPending = true;
      }
    }

    // Arayüzü INPUT'u YOK ETMEDEN anında güncelle
    this.updateStudentRowOrCardUI(studentId, isPending, pageNum, savedPage, displayVal);
    this.updatePendingBars();
  },

  onPageBlur(inputEl, studentId) {
    if (!inputEl) return;
    const val = inputEl.value.trim();
    if (val === '') {
      const rec = window.Store.getQuranRecord(studentId);
      this.pendingChanges[studentId] = {
        page: '',
        hatim: rec.hatimCount || 0
      };
      this.updateStudentRowOrCardUI(studentId, true, 0, rec.currentPage || 1, '');
      this.updatePendingBars();
    }
  },

  // DOM içerisindeki ilgili kart veya satırı kesintisiz güncelleme motoru
  updateStudentRowOrCardUI(studentId, isPending, pageNum, savedPage, displayVal) {
    const stats = window.Store.calculateQuranStats(pageNum, 0);

    // 1. KART GÖRÜNÜMÜ GÜNCELLEMESİ
    const cardEl = document.getElementById(`quran-card-${studentId}`);
    if (cardEl) {
      if (isPending) {
        cardEl.className = 'bg-white rounded-3xl border-2 border-amber-400 bg-amber-50/15 ring-2 ring-amber-300/40 shadow-md p-4 sm:p-5 transition space-y-3.5 relative overflow-hidden';
      } else {
        cardEl.className = 'bg-white rounded-3xl border border-slate-200 hover:border-emerald-300 p-4 sm:p-5 shadow-xs hover:shadow-md transition space-y-3.5 relative overflow-hidden';
      }

      const inputEl = document.getElementById(`quran-page-input-${studentId}`);
      if (inputEl) {
        if (isPending) {
          inputEl.className = 'w-16 px-1.5 py-0.5 text-center bg-white border-2 border-amber-500 text-amber-950 ring-2 ring-amber-300 font-black rounded-xl text-sm focus:border-emerald-500 focus:outline-none transition shadow-2xs font-mono';
        } else {
          inputEl.className = 'w-16 px-1.5 py-0.5 text-center bg-white border-2 border-slate-300 text-emerald-800 font-black rounded-xl text-sm focus:border-emerald-500 focus:outline-none transition shadow-2xs font-mono';
        }
      }

      const badgeContainer = document.getElementById(`quran-card-badge-${studentId}`);
      if (badgeContainer) {
        if (isPending) {
          badgeContainer.innerHTML = `
            <div class="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-[10px] px-3 py-1 flex items-center justify-between shadow-xs z-10 animate-fade-in">
              <span class="flex items-center gap-1.5 truncate">
                <span class="w-2 h-2 rounded-full bg-slate-950 animate-ping inline-block flex-shrink-0"></span>
                <span class="truncate">🟡 DEĞİŞİKLİK (${savedPage} ➔ ${displayVal !== '' ? displayVal : '0'}. sf)</span>
              </span>
              <div class="flex items-center gap-1 flex-shrink-0">
                <button type="button" onclick="window.QuranTrackerModule.discardStudent('${studentId}')"
                  class="px-2 py-0.5 bg-amber-100 hover:bg-white text-slate-900 rounded font-bold text-[9px] transition cursor-pointer">
                  ✕ İptal
                </button>
                <button type="button" onclick="window.QuranTrackerModule.saveStudent('${studentId}')"
                  class="px-2.5 py-0.5 bg-slate-950 hover:bg-slate-900 text-white rounded font-black text-[9px] shadow transition cursor-pointer">
                  💾 Kaydet
                </button>
              </div>
            </div>
          `;
        } else {
          badgeContainer.innerHTML = '';
        }
      }

      const pctEl = document.getElementById(`quran-card-pct-${studentId}`);
      if (pctEl) pctEl.textContent = `%${stats.percentRead} Okundu`;

      const barEl = document.getElementById(`quran-card-bar-${studentId}`);
      if (barEl) barEl.style.width = `${stats.percentRead}%`;

      const infoEl = document.getElementById(`quran-card-info-${studentId}`);
      if (infoEl) {
        infoEl.innerHTML = `
          <span>Kalan: <strong class="text-amber-800 font-bold">${stats.pagesLeftInHatim} sf</strong> (%${stats.percentLeft})</span>
          <span>Cüz: <strong class="text-indigo-800 font-bold">${stats.cuzNo}. Cüz</strong></span>
        `;
      }

      const actionsEl = document.getElementById(`quran-card-actions-${studentId}`);
      if (actionsEl) {
        actionsEl.innerHTML = `
          <button type="button" onclick="window.QuranTrackerModule.openEditModal('${studentId}')"
            class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs rounded-xl transition flex items-center gap-1 cursor-pointer">
            <span>✍️ Düzenle</span>
          </button>
          ${isPending ? `
            <button type="button" onclick="window.QuranTrackerModule.saveStudent('${studentId}')"
              class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-1 cursor-pointer animate-pulse"
              title="Bu talebeyi kaydet">
              <span>💾 Kaydet</span>
            </button>
            <button type="button" onclick="window.QuranTrackerModule.discardStudent('${studentId}')"
              class="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              title="Vazgeç">
              ✕
            </button>
          ` : ''}
        `;
      }
    }

    // 2. TABLO GÖRÜNÜMÜ GÜNCELLEMESİ
    const rowEl = document.getElementById(`quran-row-${studentId}`);
    if (rowEl) {
      if (isPending) {
        rowEl.className = 'bg-amber-50/80 hover:bg-amber-100/80 border-l-4 border-amber-500 transition cursor-pointer';
      } else {
        rowEl.className = 'hover:bg-slate-50 transition cursor-pointer';
      }

      const inputEl = document.getElementById(`quran-page-input-${studentId}`);
      if (inputEl) {
        if (isPending) {
          inputEl.className = 'w-16 px-1.5 py-1 text-center bg-white border-2 border-amber-500 bg-amber-50 text-amber-950 font-black ring-2 ring-amber-300 rounded-lg text-xs focus:bg-white focus:border-emerald-500 focus:outline-none';
        } else {
          inputEl.className = 'w-16 px-1.5 py-1 text-center bg-white border-2 border-slate-300 text-slate-900 font-black rounded-lg text-xs focus:bg-white focus:border-emerald-500 focus:outline-none';
        }
      }

      const rowSaveBadge = document.getElementById(`quran-row-badge-${studentId}`);
      if (rowSaveBadge) {
        if (isPending) {
          rowSaveBadge.innerHTML = `
            <button type="button" onclick="window.QuranTrackerModule.saveStudent('${studentId}')"
              class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer animate-pulse"
              title="Bu Talebeyi Kaydet">
              <span>💾</span> <span>Kaydet</span>
            </button>
            <button type="button" onclick="window.QuranTrackerModule.discardStudent('${studentId}')"
              class="px-1.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] rounded-lg transition cursor-pointer"
              title="Vazgeç">
              ✕
            </button>
          `;
        } else {
          rowSaveBadge.innerHTML = '';
        }
      }

      const rowPendingText = document.getElementById(`quran-row-pending-text-${studentId}`);
      if (rowPendingText) {
        if (isPending) {
          rowPendingText.innerHTML = `🟡 Kaydedilmedi (${savedPage} ➔ ${displayVal !== '' ? displayVal : '0'})`;
        } else {
          rowPendingText.innerHTML = '';
        }
      }

      const rowReadPages = document.getElementById(`quran-row-read-${studentId}`);
      if (rowReadPages) {
        rowReadPages.innerHTML = `
          <span class="text-emerald-700 font-black">${stats.pagesReadInHatim} sf</span> / 
          <span class="text-amber-800 font-bold">${stats.pagesLeftInHatim} sf kaldı</span>
        `;
      }

      const rowBar = document.getElementById(`quran-row-bar-${studentId}`);
      if (rowBar) rowBar.style.width = `${stats.percentRead}%`;

      const rowPct = document.getElementById(`quran-row-pct-${studentId}`);
      if (rowPct) rowPct.textContent = `%${stats.percentRead}`;

      const rowCuz = document.getElementById(`quran-row-cuz-${studentId}`);
      if (rowCuz) rowCuz.textContent = `${stats.cuzNo}. Cüz`;
    }
  },

  // Üst ve alt toplu kaydetme uyarı panellerini güncelleme
  updatePendingBars() {
    const pendingCount = this.getPendingCount();
    const hasPending = pendingCount > 0;

    const topBannerContainer = document.getElementById('quran-top-pending-banner-container');
    if (topBannerContainer) {
      if (hasPending) {
        topBannerContainer.innerHTML = `
          <div class="p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 rounded-3xl shadow-lg border-2 border-amber-300 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
            <div class="flex items-center gap-3">
              <span class="text-3xl">⚠️</span>
              <div>
                <h3 class="font-black text-sm sm:text-base leading-tight">Kaydedilmemiş Kur'an Sayfası Değişiklikleri Var! (${pendingCount} Talebe)</h3>
                <p class="text-xs font-bold text-amber-950 mt-0.5">
                  Girdiğiniz veya + butonlarıyla artırdığınız sayfalar henüz veritabanına işlenmedi. Geçerli olması için lütfen <strong>"Tüm Değişiklikleri Kaydet"</strong> butonuna basınız.
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" onclick="window.QuranTrackerModule.discardAllPending()"
                class="px-3.5 py-2 bg-amber-100/90 hover:bg-white text-slate-900 font-bold text-xs rounded-xl transition cursor-pointer shadow-xs">
                ✕ Vazgeç
              </button>
              <button type="button" onclick="window.QuranTrackerModule.saveAllPending()"
                class="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer active:scale-95">
                <span>💾</span> <span>Tüm Değişiklikleri Kaydet (${pendingCount})</span>
              </button>
            </div>
          </div>
        `;
      } else {
        topBannerContainer.innerHTML = '';
      }
    }

    const bottomBarContainer = document.getElementById('quran-bottom-pending-bar-container');
    if (bottomBarContainer) {
      if (hasPending) {
        bottomBarContainer.innerHTML = `
          <div class="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-950/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border-2 border-amber-400 flex items-center gap-4 animate-fade-in no-print">
            <div class="flex items-center gap-2 text-xs font-bold text-amber-300">
              <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping inline-block"></span>
              <span><strong>${pendingCount}</strong> talebede kaydedilmemiş sayfa var!</span>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" onclick="window.QuranTrackerModule.discardAllPending()"
                class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer">
                ✕ Vazgeç
              </button>
              <button type="button" onclick="window.QuranTrackerModule.saveAllPending()"
                class="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer active:scale-95">
                <span>💾</span> <span>Tümünü Kaydet (${pendingCount})</span>
              </button>
            </div>
          </div>
        `;
      } else {
        bottomBarContainer.innerHTML = '';
      }
    }

    const headerSaveBtnContainer = document.getElementById('quran-header-pending-actions');
    if (headerSaveBtnContainer) {
      if (hasPending) {
        headerSaveBtnContainer.innerHTML = `
          <button type="button" onclick="window.QuranTrackerModule.saveAllPending()"
            class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md animate-pulse cursor-pointer">
            <span>💾</span> <span>Değişiklikleri Kaydet (${pendingCount})</span>
          </button>
          <button type="button" onclick="window.QuranTrackerModule.discardAllPending()"
            class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer">
            ✕ Vazgeç
          </button>
        `;
      } else {
        headerSaveBtnContainer.innerHTML = '';
      }
    }
  },

  // Kullanıcı sayfayı değiştirdiğinde OTOMATİK KAYIT YAPMAZ, taslağa (pendingChanges) alır
  handlePageInput(studentId, newPageVal) {
    const rawStr = String(newPageVal !== undefined && newPageVal !== null ? newPageVal : '').trim();
    const rec = window.Store.getQuranRecord(studentId);
    const savedPage = rec.currentPage || 1;
    const savedHatim = rec.hatimCount || 0;

    if (rawStr === '') {
      this.pendingChanges[studentId] = {
        page: '',
        hatim: savedHatim
      };
    } else {
      let pageNum = parseInt(rawStr, 10);
      if (isNaN(pageNum) || pageNum < 0) pageNum = 0;
      pageNum = Math.min(604, pageNum);

      if (pageNum === savedPage) {
        delete this.pendingChanges[studentId];
      } else {
        this.pendingChanges[studentId] = {
          page: pageNum,
          hatim: savedHatim
        };
      }
    }
    this.renderView(true);
  },

  // Geriye dönük uyumluluk için alias
  handleQuickPageInput(studentId, newPageVal) {
    this.handlePageInput(studentId, newPageVal);
  },

  // Butonla sayfa artırma (+1, +5, +10, +20): Otomatik kaydetmez, taslağa ekler
  addPages(studentId, count) {
    const rec = window.Store.getQuranRecord(studentId);
    const pending = this.pendingChanges[studentId];
    let curVal = (pending && pending.page !== undefined && pending.page !== '')
      ? parseInt(pending.page, 10)
      : (rec.currentPage || 1);
    if (isNaN(curVal)) curVal = 0;
    const newPage = Math.min(604, Math.max(0, curVal + count));

    const inputEl = document.getElementById(`quran-page-input-${studentId}`);
    if (inputEl) {
      inputEl.value = newPage;
      this.onPageInput(inputEl, studentId);
    } else {
      this.handlePageInput(studentId, newPage);
    }
  },

  // Tek bir talebenin bekleyen sayfa değişikliğini kaydetme butonu
  saveStudent(studentId) {
    const pending = this.pendingChanges[studentId];
    if (!pending) return;

    const rec = window.Store.getQuranRecord(studentId);
    let targetPage = pending.page;
    if (targetPage === '' || targetPage === undefined || targetPage === null || isNaN(targetPage)) {
      targetPage = 0;
    }
    targetPage = Math.min(604, Math.max(0, parseInt(targetPage, 10) || 0));
    const targetHatim = pending.hatim !== undefined ? pending.hatim : (rec.hatimCount || 0);

    const res = window.Store.saveQuranRecord(studentId, targetPage, targetHatim, rec.note, rec.diniGrup);
    delete this.pendingChanges[studentId];

    if (res.success) {
      const student = window.Store.getStudentById(studentId);
      const studentName = student ? `${student.firstName} ${student.lastName}` : 'Talebe';

      if (res.stats.isHatimComplete) {
        this.openHatimCompleteModal(studentId);
      } else {
        if (window.App && typeof window.App.showToast === 'function') {
          window.App.showToast(`💾 ${studentName}: ${res.stats.currentPage}. Sayfa kaydedildi (%${res.stats.percentRead})`, 'success');
        }
        this.renderView(true);
      }
    }
  },

  // Tek bir talebenin bekleyen sayfa değişikliğini iptal etme (Vazgeç)
  discardStudent(studentId) {
    if (this.pendingChanges[studentId]) {
      delete this.pendingChanges[studentId];
      const rec = window.Store.getQuranRecord(studentId);
      const inputEl = document.getElementById(`quran-page-input-${studentId}`);
      if (inputEl) {
        inputEl.value = rec.currentPage || 1;
      }
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast('Değişiklik geri alındı.', 'info');
      }
      this.renderView(true);
    }
  },

  // Tüm bekleyen değişiklikleri tek tıkla topluca kaydetme
  saveAllPending() {
    const ids = Object.keys(this.pendingChanges || {});
    if (ids.length === 0) return;

    let savedCount = 0;
    let completedHatimStudentId = null;

    ids.forEach(studentId => {
      const pending = this.pendingChanges[studentId];
      if (!pending) return;
      const rec = window.Store.getQuranRecord(studentId);
      let targetPage = pending.page;
      if (targetPage === '' || targetPage === undefined || targetPage === null || isNaN(targetPage)) {
        targetPage = 0;
      }
      targetPage = Math.min(604, Math.max(0, parseInt(targetPage, 10) || 0));
      const targetHatim = pending.hatim !== undefined ? pending.hatim : (rec.hatimCount || 0);
      const res = window.Store.saveQuranRecord(studentId, targetPage, targetHatim, rec.note, rec.diniGrup);
      if (res.success) {
        savedCount++;
        if (res.stats.isHatimComplete) {
          completedHatimStudentId = studentId;
        }
      }
    });

    this.pendingChanges = {};

    // Kullanıcının "yazma kaydetme bitmeden liste sıralaması değismesin" talebi doğrultusunda:
    // Tüm kayıt işlemi tamamlandığında sıralamayı yeni kaydedilen sayfalara göre güncelleriz:
    this.orderedStudentIds = null;
    this._forceReorder = true;

    if (window.App && typeof window.App.showToast === 'function') {
      window.App.showToast(`💾 ${savedCount} talebenin Kur'an sayfası kaydedildi ve liste yeni sıralamaya göre güncellendi!`, 'success');
    }

    if (completedHatimStudentId) {
      this.openHatimCompleteModal(completedHatimStudentId);
    } else {
      this.renderView(true);
    }
  },

  // Tüm bekleyen değişiklikleri iptal etme
  discardAllPending() {
    const count = Object.keys(this.pendingChanges || {}).length;
    if (count === 0) return;

    if (!confirm(`Kaydedilmemiş ${count} talebe değişikliğinden vazgeçmek istediğinize emin misiniz?`)) {
      return;
    }

    this.pendingChanges = {};
    if (window.App && typeof window.App.showToast === 'function') {
      window.App.showToast('Tüm sayfa değişiklikleri geri alındı.', 'info');
    }
    this.renderView(true);
  },

  // Düzenleme Modalı Aç
  openEditModal(studentId) {
    const rec = window.Store.getQuranRecord(studentId);
    this.editingStudentId = studentId;
    this.tempPage = rec.currentPage || 1;
    this.tempHatim = rec.hatimCount || 0;
    this.tempNote = rec.note || '';
    this.renderModal();
  },

  closeEditModal() {
    this.editingStudentId = null;
    const modal = document.getElementById('quran-edit-modal-wrapper');
    if (modal) modal.remove();
  },

  // Modal içinden canlı sayfa hesaplama ve önizleme
  onModalPageChange(val) {
    this.tempPage = Math.min(604, Math.max(0, parseInt(val, 10) || 0));
    this.updateModalCalculations();
  },

  onModalHatimChange(val) {
    this.tempHatim = Math.max(0, parseInt(val, 10) || 0);
    this.updateModalCalculations();
  },

  modalAddPages(count) {
    this.tempPage = Math.min(604, Math.max(0, this.tempPage + count));
    const input = document.getElementById('quran-modal-page-input');
    if (input) input.value = this.tempPage;
    this.updateModalCalculations();
  },

  updateModalCalculations() {
    const stats = window.Store.calculateQuranStats(this.tempPage, this.tempHatim);
    const calcContainer = document.getElementById('quran-modal-calc-preview');
    if (!calcContainer) return;

    calcContainer.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        <div class="p-2.5 bg-emerald-50 rounded-2xl border border-emerald-200">
          <div class="text-[10px] font-black text-emerald-800 uppercase">Okunan Sayfa</div>
          <div class="text-base font-black text-emerald-900 mt-0.5">${stats.pagesReadInHatim} / 604</div>
          <div class="text-[10px] text-emerald-700 font-bold mt-0.5">%${stats.percentRead} Tamam</div>
        </div>

        <div class="p-2.5 bg-amber-50 rounded-2xl border border-amber-200">
          <div class="text-[10px] font-black text-amber-800 uppercase">Kalan Sayfa</div>
          <div class="text-base font-black text-amber-900 mt-0.5">${stats.pagesLeftInHatim} Sayfa</div>
          <div class="text-[10px] text-amber-700 font-bold mt-0.5">%${stats.percentLeft} Kaldı</div>
        </div>

        <div class="p-2.5 bg-indigo-50 rounded-2xl border border-indigo-200">
          <div class="text-[10px] font-black text-indigo-800 uppercase">Bulunduğu Cüz</div>
          <div class="text-base font-black text-indigo-900 mt-0.5">${stats.cuzNo}. Cüz</div>
          <div class="text-[10px] text-indigo-600 font-medium mt-0.5">${stats.cuzPageRange}. sf</div>
        </div>

        <div class="p-2.5 bg-purple-50 rounded-2xl border border-purple-200">
          <div class="text-[10px] font-black text-purple-800 uppercase">Tamamlanan Hatim</div>
          <div class="text-base font-black text-purple-900 mt-0.5">${stats.hatimCount} Hatim</div>
          <div class="text-[10px] text-purple-600 font-bold mt-0.5">${stats.totalLifetimePages} Toplam sf</div>
        </div>
      </div>

      <!-- İlerleme Çubuğu -->
      <div class="space-y-1">
        <div class="flex items-center justify-between text-[11px] font-bold text-slate-500">
          <span>Hatim İlerleme Oranı</span>
          <span class="font-black text-emerald-700">%${stats.percentRead}</span>
        </div>
        <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
          <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300 shadow-xs"
            style="width: ${stats.percentRead}%"></div>
        </div>
      </div>
    `;
  },

  saveModalData() {
    if (!this.editingStudentId) return;
    const noteInput = document.getElementById('quran-modal-note-input');
    const note = noteInput ? noteInput.value.trim() : this.tempNote;
    const groupSelect = document.getElementById('quran-modal-group-select');
    const selectedGroup = groupSelect ? groupSelect.value : null;

    const res = window.Store.saveQuranRecord(this.editingStudentId, this.tempPage, this.tempHatim, note, selectedGroup);
    if (res.success) {
      if (res.stats.isHatimComplete) {
        this.closeEditModal();
        this.openHatimCompleteModal(this.editingStudentId);
      } else {
        if (window.App && typeof window.App.showToast === 'function') {
          window.App.showToast('Kur\'an-ı Kerim ilerlemesi ve dini ders grubu başarıyla kaydedildi!', 'success');
        }
        this.closeEditModal();
        this.renderView();
      }
    }
  },

  // Hatim Tamamlama Tebrik Modalı
  openHatimCompleteModal(studentId) {
    const student = window.Store.getStudentById(studentId);
    if (!student) return;
    const rec = window.Store.getQuranRecord(studentId);
    const nextHatimNo = (rec.hatimCount || 0) + 1;

    let existingWrapper = document.getElementById('quran-hatim-complete-modal');
    if (!existingWrapper) {
      existingWrapper = document.createElement('div');
      existingWrapper.id = 'quran-hatim-complete-modal';
      document.body.appendChild(existingWrapper);
    }

    existingWrapper.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in no-print">
        <div class="bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/40 text-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border-2 border-amber-400 shadow-2xl text-center space-y-5 relative overflow-hidden">
          <div class="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl"></div>
          <div class="absolute -bottom-12 -right-12 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl"></div>

          <div class="text-6xl animate-bounce">🎉</div>
          
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider">
            <span>📖 HATİM TEBRİK VE KUTLAMASI</span>
          </div>

          <div>
            <h3 class="text-xl sm:text-2xl font-black text-amber-300">
              ${student.firstName} ${student.lastName}
            </h3>
            <p class="text-xs text-slate-300 mt-1">
              ${student.className} • No: ${student.studentNo || student.id} • ${rec.diniGrup || student.dahiliHoca || '-'}
            </p>
          </div>

          <div class="p-4 bg-slate-800/80 rounded-2xl border border-amber-500/30 text-xs text-amber-200 leading-relaxed font-medium">
            Talebemiz 604 sayfalık Kur'an-ı Kerim tilavetini tamamlayarak <strong>${nextHatimNo}. Hatm-i Şerifini</strong> bitirmiştir. Talebemizi ve emeği geçen hocalarımızı tebrik ederiz!
          </div>

          <div class="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <button type="button" onclick="window.QuranTrackerModule.confirmCompleteHatim('${student.id}');"
              class="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/30 hover:scale-105 transition flex items-center justify-center gap-2 cursor-pointer">
              <span>🌟 Hatmi Onayla & Yeni Hatme Başla</span>
            </button>
            <button type="button" onclick="document.getElementById('quran-hatim-complete-modal').remove(); window.QuranTrackerModule.renderView();"
              class="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer">
              Kapat
            </button>
          </div>
        </div>
      </div>
    `;
  },

  confirmCompleteHatim(studentId) {
    const res = window.Store.completeHatim(studentId);
    const modal = document.getElementById('quran-hatim-complete-modal');
    if (modal) modal.remove();
    if (res.success) {
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast('Tebrikler! Yeni hatim başlatıldı ve hatim sayısı güncellendi! 🎉', 'success');
      }
      this.renderView();
    }
  },

  renderModal() {
    let modalWrapper = document.getElementById('quran-edit-modal-wrapper');
    if (!modalWrapper) {
      modalWrapper = document.createElement('div');
      modalWrapper.id = 'quran-edit-modal-wrapper';
      document.body.appendChild(modalWrapper);
    }

    const student = window.Store.getStudentById(this.editingStudentId);
    if (!student) return;
    const rec = window.Store.getQuranRecord(this.editingStudentId);

    modalWrapper.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fade-in no-print"
        onclick="if(event.target === this) window.QuranTrackerModule.closeEditModal()">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 space-y-4 max-h-[95vh] overflow-y-auto">
          <!-- Başlık ve Kapatma -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-2xl flex items-center justify-center shadow-inner">
                📖
              </div>
              <div>
                <h3 class="font-black text-base text-slate-900">${student.firstName} ${student.lastName}</h3>
                <p class="text-xs text-slate-500">${student.className} • ${rec.diniGrup || student.dahiliHoca || 'Dini Ders Grubu'}</p>
              </div>
            </div>
            <button onclick="window.QuranTrackerModule.closeEditModal()" 
              class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-black transition flex items-center justify-center cursor-pointer">
              ✕
            </button>
          </div>

          <!-- Canlı Otomatik Hesaplama Önizleme Kutusu -->
          <div id="quran-modal-calc-preview" class="space-y-3"></div>

          <!-- Sayfa ve Hatim Giriş Alanları -->
          <div class="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label class="block text-xs font-black uppercase text-slate-700 mb-1">
                Kaldığı Sayfa (1 - 604):
              </label>
              <div class="flex items-center gap-2">
                <input type="number" id="quran-modal-page-input" min="0" max="604" value="${this.tempPage}"
                  class="flex-1 px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-base font-black text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition shadow-2xs font-mono"
                  oninput="window.QuranTrackerModule.onModalPageChange(this.value)">

                <!-- Hızlı Ekleme Butonları -->
                <div class="flex items-center gap-1">
                  <button type="button" onclick="window.QuranTrackerModule.modalAddPages(1)"
                    class="px-2.5 py-2 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-black text-xs rounded-xl border border-slate-200 transition cursor-pointer">
                    +1
                  </button>
                  <button type="button" onclick="window.QuranTrackerModule.modalAddPages(5)"
                    class="px-2.5 py-2 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-black text-xs rounded-xl border border-slate-200 transition cursor-pointer">
                    +5
                  </button>
                  <button type="button" onclick="window.QuranTrackerModule.modalAddPages(10)"
                    class="px-2.5 py-2 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-black text-xs rounded-xl border border-slate-200 transition cursor-pointer">
                    +10
                  </button>
                  <button type="button" onclick="window.QuranTrackerModule.modalAddPages(20)"
                    class="px-2.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-black text-xs rounded-xl border border-emerald-300 transition cursor-pointer"
                    title="1 Cüz Ekle (20 Sayfa)">
                    +1 Cüz
                  </button>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-black uppercase text-slate-700 mb-1">
                  Tamamlanan Hatim Sayısı:
                </label>
                <input type="number" min="0" value="${this.tempHatim}"
                  class="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition shadow-2xs font-mono"
                  oninput="window.QuranTrackerModule.onModalHatimChange(this.value)">
              </div>

              <div>
                <label class="block text-xs font-black uppercase text-slate-700 mb-1 flex items-center justify-between">
                  <span>Dini Ders Grubu / Hocası:</span>
                  <span class="text-[10px] text-emerald-600 font-bold lowercase">değiştirilebilir</span>
                </label>
                <select id="quran-modal-group-select"
                  class="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition shadow-2xs">
                  ${(window.Store && typeof window.Store.getDahiliHocalari === 'function' ? window.Store.getDahiliHocalari() : [
                    'YASİN EKİNCİ',
                    'AHMED MUBARİZ',
                    'ABDUSSAMED TAV',
                    'EMİR TALHA TARIM',
                    'BURAK BODUR',
                    'TUNAHAN TAŞKIN',
                    'SELİM BOZKURT',
                    'YAVUZ SELİM SEVEN'
                  ]).map(h => {
                    const currentGroup = (rec.diniGrup || student.dahiliHoca || '').trim();
                    const isSelected = currentGroup === h;
                    return `<option value="${h}" ${isSelected ? 'selected' : ''}>${h}</option>`;
                  }).join('')}
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-black uppercase text-slate-700 mb-1">
                Öğretmen Notu / Açıklama (İsteğe Bağlı):
              </label>
              <input type="text" id="quran-modal-note-input" placeholder="Örn: Tecvid gayreti çok iyi, 5. cüze geçti..." value="${this.tempNote}"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none transition">
            </div>
          </div>

          <!-- Alt Butonlar -->
          <div class="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <button type="button" onclick="window.Store.sendWhatsAppQuranReport('${student.id}');"
              class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer">
              <span>📲</span> <span>Veliye WhatsApp Gönder</span>
            </button>

            <div class="flex items-center gap-2">
              <button type="button" onclick="window.QuranTrackerModule.closeEditModal()"
                class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer">
                Vazgeç
              </button>
              <button type="button" onclick="window.QuranTrackerModule.saveModalData()"
                class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition shadow cursor-pointer">
                Kaydet
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.updateModalCalculations();
  },

  renderView(preserveScroll = true) {
    const scrollY = preserveScroll ? window.scrollY : 0;
    const container = document.getElementById('quran-tracker-container');
    if (!container) return;

    const allStudents = window.Store.getStudents(false); // Aktif öğrenciler
    const allRecords = window.Store.getAllQuranRecords();
    const groupSummaries = window.Store.getQuranGroupSummary();
    const classes = window.Store.getClasses();

    // Benzersiz Dini Ders Grupları (Dahili Hoca veya custom)
    const groups = Array.from(new Set(allStudents.map(s => {
      const rec = allRecords[s.id];
      const curG = (rec && rec.diniGrup) ? rec.diniGrup.trim() : '';
      const hoca = (s.dahiliHoca || '').trim();
      return (curG && curG !== 'Genel' && !curG.startsWith('Seviye')) ? curG : (hoca || 'Genel');
    }))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr'));

    // Filtreleme (Taslak / Kaydedilmemiş değişiklikleri anında yansıtır)
    const pendingChanges = this.pendingChanges || {};
    let filtered = allStudents.map(s => {
      const rec = allRecords[s.id] || { currentPage: 1, hatimCount: 0, diniGrup: s.dahiliHoca || 'Genel' };
      const pending = pendingChanges[s.id];
      const isPending = !!pending;

      let effectivePageNum = rec.currentPage || 1;
      let displayPage = effectivePageNum;

      if (isPending) {
        if (pending.page === '') {
          displayPage = '';
          effectivePageNum = 0;
        } else {
          effectivePageNum = Math.min(604, Math.max(0, parseInt(pending.page, 10) || 0));
          displayPage = pending.page;
        }
      }

      const effectiveHatim = (isPending && pending.hatim !== undefined) ? pending.hatim : (rec.hatimCount || 0);

      const stats = window.Store.calculateQuranStats(effectivePageNum, effectiveHatim);
      const savedStats = window.Store.calculateQuranStats(rec.currentPage || 1, rec.hatimCount || 0);
      const curG = (rec && rec.diniGrup) ? rec.diniGrup.trim() : '';
      const hoca = (s.dahiliHoca || '').trim();
      const resolvedG = (curG && curG !== 'Genel' && !curG.startsWith('Seviye')) ? curG : (hoca || 'Genel');
      return {
        student: s,
        record: rec,
        stats,
        savedStats,
        diniGrup: resolvedG,
        isPending,
        displayPage,
        effectivePage: effectivePageNum,
        savedPage: rec.currentPage || 1
      };
    });

    // Grup filtresi
    if (this.selectedGroup !== 'ALL') {
      filtered = filtered.filter(item => item.diniGrup === this.selectedGroup);
    }

    // Seviye filtresi
    if (this.selectedLevel !== 'ALL') {
      filtered = filtered.filter(item => item.student.seviye === this.selectedLevel);
    }

    // Sınıf filtresi (Çoklu şube desteği)
    if (this.selectedClasses && this.selectedClasses.length > 0) {
      const selUpper = this.selectedClasses.map(c => c.trim().toUpperCase());
      filtered = filtered.filter(item => selUpper.includes((item.student.className || '').trim().toUpperCase()));
    } else if (this.selectedClass !== 'ALL') {
      filtered = filtered.filter(item => item.student.className === this.selectedClass);
    }

    // Arama
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => {
        const s = item.student;
        return (
          (s.firstName && s.firstName.toLowerCase().includes(q)) ||
          (s.lastName && s.lastName.toLowerCase().includes(q)) ||
          (s.studentNo && String(s.studentNo).includes(q)) ||
          (s.className && s.className.toLowerCase().includes(q)) ||
          (s.yatakhane && s.yatakhane.toLowerCase().includes(q)) ||
          (item.diniGrup && item.diniGrup.toLowerCase().includes(q))
        );
      });
    }

    // Sıralama Yönetimi (Kullanıcı Talebi: Yazma ve kaydetme bitmeden liste sırası ASLA değişmez)
    // Sıralama daima kaydedilmiş verilere (savedStats) göre belirlenir ve yazma sürecinde sabit tutulur.
    const shouldRecalculateOrder = !this.orderedStudentIds || this._forceReorder;
    if (shouldRecalculateOrder) {
      filtered.sort((a, b) => {
        if (this.sortMode === 'name') {
          return (a.student.firstName || '').localeCompare(b.student.firstName || '', 'tr');
        }
        if (this.sortMode === 'class') {
          const cA = a.student.className || '';
          const cB = b.student.className || '';
          if (cA !== cB) return cA.localeCompare(cB, 'tr', { numeric: true });
          const noA = parseInt(a.student.studentNo, 10) || 0;
          const noB = parseInt(b.student.studentNo, 10) || 0;
          if (noA !== noB) return noA - noB;
          return (a.student.firstName || '').localeCompare(b.student.firstName || '', 'tr');
        }
        // Varsayılan: Liderlik Sırası (Kayıtlı sayfaya göre en çok okuyan en üstte)
        if (b.savedStats.totalLifetimePages !== a.savedStats.totalLifetimePages) {
          return b.savedStats.totalLifetimePages - a.savedStats.totalLifetimePages;
        }
        return (a.student.firstName || '').localeCompare(b.student.firstName || '', 'tr');
      });
      // Sabit liste sıralama hafızasını kaydet
      this.orderedStudentIds = filtered.map(item => item.student.id);
      this._forceReorder = false;
    } else {
      // Yazma ve kaydetme sırasında sıralama %100 SABİTTİR. Hiçbir talebe yer değiştirmez!
      const orderMap = new Map();
      this.orderedStudentIds.forEach((id, idx) => orderMap.set(id, idx));
      filtered.sort((a, b) => {
        const idxA = orderMap.has(a.student.id) ? orderMap.get(a.student.id) : 999999;
        const idxB = orderMap.has(b.student.id) ? orderMap.get(b.student.id) : 999999;
        return idxA - idxB;
      });
    }

    // İstatistikler
    const totalStudentsInView = filtered.length;
    let totalLifetimePagesInView = 0;
    let totalCompletedHatimsInView = 0;
    let totalCurrentPagesInView = 0;

    filtered.forEach(item => {
      totalLifetimePagesInView += item.stats.totalLifetimePages;
      totalCompletedHatimsInView += item.stats.hatimCount;
      totalCurrentPagesInView += item.stats.currentPage;
    });

    const avgPercentInView = totalStudentsInView > 0 
      ? Math.min(100, parseFloat(((totalCurrentPagesInView / (totalStudentsInView * 604)) * 100).toFixed(1))) 
      : 0;

    const topStudent = filtered[0] || null;
    const pendingCount = this.getPendingCount();
    const hasPending = pendingCount > 0;

    container.innerHTML = `
      <div class="space-y-5 animate-fade-in max-w-7xl mx-auto">
        <!-- 1. ÜST BAŞLIK & KONTROL PANELİ -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div class="flex flex-wrap items-center gap-3 mb-1">
                <h2 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>📖 Kur'an-ı Kerim Hatim ve Tilavet Takibi</span>
                </h2>
                <!-- GÖRÜNÜM MODU SEÇİCİ -->
                <div class="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 gap-1 shadow-inner">
                  <button type="button" onclick="window.QuranTrackerModule.setViewMode('cards')"
                    class="py-1 px-3 rounded-xl text-xs font-black transition cursor-pointer ${
                      this.viewMode === 'cards' 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }">
                    🗂️ Kartlar
                  </button>
                  <button type="button" onclick="window.QuranTrackerModule.setViewMode('table')"
                    class="py-1 px-3 rounded-xl text-xs font-black transition cursor-pointer ${
                      this.viewMode === 'table' 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }">
                    📋 Tablo
                  </button>
                  <button type="button" onclick="window.QuranTrackerModule.setViewMode('groups')"
                    class="py-1 px-3 rounded-xl text-xs font-black transition cursor-pointer ${
                      this.viewMode === 'groups' 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }">
                    👥 Dini Ders Grupları
                  </button>
                </div>

                <!-- SIRALAMA MODU SEÇİCİ -->
                <div class="inline-flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
                  <span class="text-[10px] font-black text-slate-500 uppercase px-1.5">Sırala:</span>
                  <select onchange="window.QuranTrackerModule.setSortMode(this.value)"
                    class="py-1 px-2.5 rounded-xl text-xs font-black bg-white border border-slate-200 text-slate-800 focus:outline-none cursor-pointer">
                    <option value="rank" ${this.sortMode === 'rank' ? 'selected' : ''}>🏆 Liderlik (En Çok Okuyan)</option>
                    <option value="class" ${this.sortMode === 'class' ? 'selected' : ''}>🏫 Sınıf ve No Sırası</option>
                    <option value="name" ${this.sortMode === 'name' ? 'selected' : ''}>🔤 İsim Sırası (A-Z)</option>
                  </select>
                  <button type="button" onclick="window.QuranTrackerModule.reorderList()"
                    class="p-1 px-2 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1"
                    title="Listeyi son kayıtlara göre yeniden sırala">
                    <span>🔄</span> <span class="hidden sm:inline text-[10px]">Sıralamayı Güncelle</span>
                  </button>
                </div>
              </div>
              <p class="text-xs text-slate-500">
                Talebelerimizin kaldığı sayfayı silip yazabilir veya + butonlarını kullanabilirsiniz. Yazma ve kaydetme işlemi tamamlanana kadar liste sıralaması sabit kalır, talebelerin yeri kaymaz.
              </p>
            </div>

            <div class="flex items-center gap-2">
              <span id="quran-header-pending-actions" class="flex items-center gap-2">
                ${hasPending ? `
                  <button type="button" onclick="window.QuranTrackerModule.saveAllPending()"
                    class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md animate-pulse cursor-pointer">
                    <span>💾</span> <span>Değişiklikleri Kaydet (${pendingCount})</span>
                  </button>
                  <button type="button" onclick="window.QuranTrackerModule.discardAllPending()"
                    class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer">
                    ✕ Vazgeç
                  </button>
                ` : ''}
              </span>
              <button type="button" onclick="window.QuranTrackerModule.openRecoveryModal()"
                class="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Hafızadaki Kur'an verilerini kurtar, yedekle veya toplu düzenle">
                <span>🛡️</span> <span>Verileri Kurtar & Yedekle</span>
              </button>
              <a href="pano.html" target="_blank"
                class="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-2xs">
                <span>📺 Canlı Pano Vitrini</span>
              </a>
              <button onclick="window.print()" 
                class="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer">
                <span>🖨️ Yazdır / PDF</span>
              </button>
            </div>
          </div>

          <!-- 2. KPI CANLI SAYAÇ KARTLARI -->
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            <!-- 1. Toplam Talebe -->
            <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <div class="text-[10px] font-black text-slate-500 uppercase tracking-wider">İncelenen Talebe</div>
              <div class="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">${totalStudentsInView}</div>
              <div class="text-[10px] text-slate-400 font-semibold mt-0.5">Kayıtlı Öğrenci</div>
            </div>

            <!-- 2. Toplam Okunan Sayfa -->
            <div class="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-center">
              <div class="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Toplam Okunan</div>
              <div class="text-xl sm:text-2xl font-black text-emerald-900 mt-0.5">${totalLifetimePagesInView.toLocaleString('tr-TR')}</div>
              <div class="text-[10px] text-emerald-600 font-semibold mt-0.5">Mushaf Sayfası</div>
            </div>

            <!-- 3. Tamamlanan Hatim -->
            <div class="p-3 bg-amber-50/80 rounded-2xl border border-amber-300 text-center">
              <div class="text-[10px] font-black text-amber-800 uppercase tracking-wider">Tamamlanan Hatim</div>
              <div class="text-xl sm:text-2xl font-black text-amber-900 mt-0.5">${totalCompletedHatimsInView} Hatim</div>
              <div class="text-[10px] text-amber-700 font-semibold mt-0.5">Biten Hatm-i Şerif</div>
            </div>

            <!-- 4. Ortalama İlerleme -->
            <div class="p-3 bg-indigo-50/80 rounded-2xl border border-indigo-200 text-center">
              <div class="text-[10px] font-black text-indigo-800 uppercase tracking-wider">Ortalama Hatim</div>
              <div class="text-xl sm:text-2xl font-black text-indigo-900 mt-0.5">%${avgPercentInView}</div>
              <div class="text-[10px] text-indigo-600 font-semibold mt-0.5">Kurs Tamamlama</div>
            </div>

            <!-- 5. En Çok Okuyan / Lider -->
            <div class="p-3 bg-gradient-to-br from-amber-50 to-yellow-100 rounded-2xl border border-amber-300 text-center col-span-2 sm:col-span-1">
              <div class="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center justify-center gap-1">
                <span>👑 Hatim Lideri</span>
              </div>
              <div class="text-xs sm:text-sm font-black text-slate-900 mt-1 truncate" title="${topStudent ? `${topStudent.student.firstName} ${topStudent.student.lastName}` : '-'}">
                ${topStudent ? `${topStudent.student.firstName} ${topStudent.student.lastName}` : '-'}
              </div>
              <div class="text-[10px] text-amber-800 font-bold mt-0.5">
                ${topStudent ? `${topStudent.stats.currentPage}. sf (${topStudent.stats.hatimCount} Hatim)` : '0 sf'}
              </div>
            </div>
          </div>

          <!-- 3. FİLTRELER: Dini Ders Grubu, Seviye, Sınıf ve Arama -->
          <div class="space-y-3 pt-2 border-t border-slate-100">
            <!-- Dini Ders Grubu (Dahili Hoca) Butonları -->
            <div>
              <div class="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>DİNİ DERS GRUBU / DAHİLİ HOCA:</span>
                ${this.selectedGroup !== 'ALL' ? `
                  <button type="button" onclick="window.QuranTrackerModule.setGroup('ALL')" class="text-emerald-700 font-bold hover:underline cursor-pointer">
                    Grubu Sıfırla
                  </button>
                ` : ''}
              </div>
              <div class="flex flex-wrap items-center gap-1.5">
                <button type="button" onclick="window.QuranTrackerModule.setGroup('ALL')"
                  class="px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                    this.selectedGroup === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }">
                  Tüm Gruplar (${allStudents.length})
                </button>
                ${groups.map(grp => {
                  const isSel = this.selectedGroup === grp;
                  const count = allStudents.filter(s => {
                    const rec = allRecords[s.id];
                    const curG = (rec && rec.diniGrup) ? rec.diniGrup.trim() : '';
                    const hoca = (s.dahiliHoca || '').trim();
                    const rG = (curG && curG !== 'Genel' && !curG.startsWith('Seviye')) ? curG : (hoca || 'Genel');
                    return rG === grp;
                  }).length;
                  return `
                    <button type="button" onclick="window.QuranTrackerModule.setGroup('${grp}')"
                      class="px-2.5 py-1.5 rounded-xl text-xs font-black transition border flex items-center gap-1 cursor-pointer ${
                        isSel 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }">
                      <span>${isSel ? '✓' : '🕌'}</span>
                      <span>${grp}</span>
                      <span class="text-[10px] opacity-80">(${count})</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Alt Filtre Satırı: Seviye, Sınıf ve Arama Kutusu -->
            <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div class="flex flex-wrap items-center gap-2">
                <!-- Seviye Filtresi -->
                <div class="flex items-center gap-1">
                  <span class="text-[10px] font-black text-slate-400 uppercase">SEVİYE:</span>
                  <select onchange="window.QuranTrackerModule.setLevel(this.value)"
                    class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none">
                    <option value="ALL" ${this.selectedLevel === 'ALL' ? 'selected' : ''}>Tüm Seviyeler</option>
                    <option value="Seviye 1" ${this.selectedLevel === 'Seviye 1' ? 'selected' : ''}>Seviye 1</option>
                    <option value="Seviye 2" ${this.selectedLevel === 'Seviye 2' ? 'selected' : ''}>Seviye 2</option>
                    <option value="Seviye 3" ${this.selectedLevel === 'Seviye 3' ? 'selected' : ''}>Seviye 3</option>
                  </select>
                </div>

                <!-- Sınıf / Şube Filtresi (Çoklu Seçilebilir) -->
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-[10px] font-black text-slate-400 uppercase">ŞUBELER:</span>
                  <div class="flex flex-wrap items-center gap-1">
                    <button type="button" onclick="window.QuranTrackerModule.clearClasses()"
                      class="px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                        (!this.selectedClasses || this.selectedClasses.length === 0) && this.selectedClass === 'ALL'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }">
                      Tümü
                    </button>
                    ${classes.map(c => {
                      const isSel = (this.selectedClasses || []).some(sc => sc.toUpperCase() === c.toUpperCase()) || (this.selectedClass === c);
                      return `
                        <button type="button" onclick="window.QuranTrackerModule.toggleClass('${c}')"
                          class="px-2 py-1 rounded-lg text-[10px] font-black transition border flex items-center gap-1 cursor-pointer ${
                            isSel 
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }"
                          title="${c} şubesini seç / kaldır">
                          <span>${isSel ? '✓' : ''}</span>
                          <span>${c}</span>
                        </button>
                      `;
                    }).join('')}
                  </div>
                </div>
              </div>

              <!-- Arama Kutusu -->
              <div class="w-full sm:w-64 relative">
                <input type="text" placeholder="Talebe adı, hoca, no ara..." value="${this.searchQuery}"
                  class="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  oninput="window.QuranTrackerModule.searchQuery = this.value.toLowerCase().trim(); window.QuranTrackerModule.orderedStudentIds = null; window.QuranTrackerModule.renderView();">
                <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3.5. KAYDEDİLMEMİŞ DEĞİŞİKLİKLER UYARI VE TOPLU KAYDET BARI -->
        <div id="quran-top-pending-banner-container">
          ${hasPending ? `
            <div class="p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 rounded-3xl shadow-lg border-2 border-amber-300 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
              <div class="flex items-center gap-3">
                <span class="text-3xl">⚠️</span>
                <div>
                  <h3 class="font-black text-sm sm:text-base leading-tight">Kaydedilmemiş Kur'an Sayfası Değişiklikleri Var! (${pendingCount} Talebe)</h3>
                  <p class="text-xs font-bold text-amber-950 mt-0.5">
                    Girdiğiniz veya + butonlarıyla artırdığınız sayfalar henüz veritabanına işlenmedi. Geçerli olması için lütfen <strong>"Tüm Değişiklikleri Kaydet"</strong> butonuna basınız.
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button type="button" onclick="window.QuranTrackerModule.discardAllPending()"
                  class="px-3.5 py-2 bg-amber-100/90 hover:bg-white text-slate-900 font-bold text-xs rounded-xl transition cursor-pointer shadow-xs">
                  ✕ Vazgeç
                </button>
                <button type="button" onclick="window.QuranTrackerModule.saveAllPending()"
                  class="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer active:scale-95">
                  <span>💾</span> <span>Tüm Değişiklikleri Kaydet (${pendingCount})</span>
                </button>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- 4. GÖRÜNÜM İÇERİĞİ -->
        ${this.renderViewContent(filtered, groupSummaries)}

        <!-- 5. SABİT ALT KAYDETME BARI (Kaydırıldığında Ekranın Altında Kalır) -->
        <div id="quran-bottom-pending-bar-container">
          ${hasPending ? `
            <div class="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-950/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border-2 border-amber-400 flex items-center gap-4 animate-fade-in no-print">
              <div class="flex items-center gap-2 text-xs font-bold text-amber-300">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping inline-block"></span>
                <span><strong>${pendingCount}</strong> talebede kaydedilmemiş sayfa var!</span>
              </div>
              <div class="flex items-center gap-2">
                <button type="button" onclick="window.QuranTrackerModule.discardAllPending()"
                  class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer">
                  ✕ Vazgeç
                </button>
                <button type="button" onclick="window.QuranTrackerModule.saveAllPending()"
                  class="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer active:scale-95">
                  <span>💾</span> <span>Tümünü Kaydet (${pendingCount})</span>
                </button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    if (preserveScroll && scrollY > 0) {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    }
  },

  renderViewContent(filtered, groupSummaries) {
    if (this.viewMode === 'groups') {
      return this.renderGroupsView(groupSummaries);
    }
    if (this.viewMode === 'table') {
      return this.renderTableView(filtered);
    }
    return this.renderCardsView(filtered);
  },

  // --- KARTLAR GÖRÜNÜMÜ ---
  renderCardsView(filtered) {
    if (filtered.length === 0) {
      return `
        <div class="bg-white rounded-3xl p-12 text-center text-slate-400 font-semibold border border-slate-200">
          Seçilen grup ve kriterlere uygun talebe bulunamadı.
        </div>
      `;
    }

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        ${filtered.map((item, idx) => {
          const s = item.student;
          const st = item.stats;
          const rec = item.record;
          const rank = idx + 1;
          const isTop3 = (this.sortMode === 'rank') && (rank <= 3);
          const medal = (this.sortMode === 'rank') ? (rank === 1 ? '🥇' : (rank === 2 ? '🥈' : (rank === 3 ? '🥉' : ''))) : '';
          const isPending = !!item.isPending;
          const savedPage = item.savedPage || 1;
          const displayPage = item.displayPage !== undefined ? item.displayPage : '';

          return `
            <div id="quran-card-${s.id}" class="bg-white rounded-3xl border ${isPending ? 'border-2 border-amber-400 bg-amber-50/15 ring-2 ring-amber-300/40 shadow-md' : 'border-slate-200 hover:border-emerald-300'} p-4 sm:p-5 shadow-xs hover:shadow-md transition space-y-3.5 relative overflow-hidden">
              <!-- Kaydedilmemiş Değişiklik Şeridi Kapsayıcısı -->
              <div id="quran-card-badge-${s.id}">
                ${isPending ? `
                  <div class="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-[10px] px-3 py-1 flex items-center justify-between shadow-xs z-10 animate-fade-in">
                    <span class="flex items-center gap-1.5 truncate">
                      <span class="w-2 h-2 rounded-full bg-slate-950 animate-ping inline-block flex-shrink-0"></span>
                      <span class="truncate">🟡 DEĞİŞİKLİK (${savedPage} ➔ ${displayPage !== '' ? displayPage : '0'}. sf)</span>
                    </span>
                    <div class="flex items-center gap-1 flex-shrink-0">
                      <button type="button" onclick="window.QuranTrackerModule.discardStudent('${s.id}')"
                        class="px-2 py-0.5 bg-amber-100 hover:bg-white text-slate-900 rounded font-bold text-[9px] transition cursor-pointer">
                        ✕ İptal
                      </button>
                      <button type="button" onclick="window.QuranTrackerModule.saveStudent('${s.id}')"
                        class="px-2.5 py-0.5 bg-slate-950 hover:bg-slate-900 text-white rounded font-black text-[9px] shadow transition cursor-pointer">
                        💾 Kaydet
                      </button>
                    </div>
                  </div>
                ` : ''}
              </div>

              ${isTop3 ? `
                <div class="absolute ${isPending ? 'top-6' : 'top-0'} right-0 bg-gradient-to-l from-amber-400 to-amber-200 text-slate-950 font-black text-[10px] px-3 py-1 rounded-bl-2xl shadow-xs flex items-center gap-1">
                  <span>${medal}</span> <span>${rank}. Sırada</span>
                </div>
              ` : `
                <div class="absolute ${isPending ? 'top-7' : 'top-2.5'} right-3 text-[11px] font-black text-slate-300 font-mono">
                  #${rank}
                </div>
              `}

              <!-- Talebe Başlık Bilgisi -->
              <div class="flex items-center gap-3 pr-8 ${isPending ? 'pt-4' : ''}">
                <div class="w-11 h-11 rounded-2xl ${isTop3 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-50 text-emerald-800'} font-black text-lg flex items-center justify-center shadow-inner flex-shrink-0">
                  📖
                </div>
                <div class="overflow-hidden">
                  <h4 class="font-black text-sm text-slate-900 truncate">
                    ${s.firstName} ${s.lastName}
                  </h4>
                  <p class="text-[11px] text-slate-400 truncate">
                    ${s.className} • ${item.diniGrup || s.dahiliHoca || '-'} • ${s.seviye || ''}
                  </p>
                </div>
              </div>

              <!-- İlerleme Çubuğu ve Otomatik İstatistikler -->
              <div class="space-y-1.5 p-3 bg-slate-50/80 rounded-2xl border ${isPending ? 'border-amber-300 bg-amber-50/50' : 'border-slate-100'}">
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-1.5">
                    <span class="font-black text-slate-800">Kaldığı Sayfa:</span>
                    <input type="number" id="quran-page-input-${s.id}" min="0" max="604" value="${displayPage}"
                      class="w-16 px-1.5 py-0.5 text-center bg-white border-2 ${isPending ? 'border-amber-500 text-amber-950 ring-2 ring-amber-300 font-black' : 'border-slate-300 text-emerald-800 font-black'} rounded-xl text-sm focus:border-emerald-500 focus:outline-none transition shadow-2xs font-mono"
                      oninput="window.QuranTrackerModule.onPageInput(this, '${s.id}')"
                      onblur="window.QuranTrackerModule.onPageBlur(this, '${s.id}')"
                      onkeydown="if(event.key === 'Enter') { event.preventDefault(); window.QuranTrackerModule.onPageInput(this, '${s.id}'); window.QuranTrackerModule.saveStudent('${s.id}'); }"
                      title="Sayfayı silip değiştirebilir, Enter'a basabilir veya Kaydet butonuna tıklayabilirsiniz">
                    <span class="text-xs text-slate-400 font-mono">/ 604</span>
                  </div>
                  <span id="quran-card-pct-${s.id}" class="font-black text-emerald-700 font-mono">
                    %${st.percentRead} Okundu
                  </span>
                </div>

                <div class="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div id="quran-card-bar-${s.id}" class="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 rounded-full transition-all duration-300 shadow-2xs"
                    style="width: ${st.percentRead}%"></div>
                </div>

                <div id="quran-card-info-${s.id}" class="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>Kalan: <strong class="text-amber-800 font-bold">${st.pagesLeftInHatim} sf</strong> (%${st.percentLeft})</span>
                  <span>Cüz: <strong class="text-indigo-800 font-bold">${st.cuzNo}. Cüz</strong></span>
                  ${st.hatimCount > 0 ? `<span class="text-purple-700 font-black">🌟 ${st.hatimCount} Hatim</span>` : ''}
                </div>
              </div>

              <!-- Hızlı Sayfa Girişi & Butonlar -->
              <div class="space-y-2 pt-1">
                <div class="flex items-center justify-between gap-1.5">
                  <span class="text-[10px] font-bold text-slate-400 uppercase">Hızlı Sayfa Ekle:</span>
                  <div class="flex items-center gap-1">
                    <button type="button" onclick="window.QuranTrackerModule.addPages('${s.id}', 1)"
                      class="px-2 py-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 text-slate-700 text-[11px] font-black rounded-lg transition cursor-pointer">
                      +1
                    </button>
                    <button type="button" onclick="window.QuranTrackerModule.addPages('${s.id}', 5)"
                      class="px-2 py-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 text-slate-700 text-[11px] font-black rounded-lg transition cursor-pointer">
                      +5
                    </button>
                    <button type="button" onclick="window.QuranTrackerModule.addPages('${s.id}', 10)"
                      class="px-2 py-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 text-slate-700 text-[11px] font-black rounded-lg transition cursor-pointer">
                      +10
                    </button>
                    <button type="button" onclick="window.QuranTrackerModule.addPages('${s.id}', 20)"
                      class="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[11px] font-black rounded-lg transition cursor-pointer"
                      title="1 Cüz Ekle (20 Sayfa)">
                      +20
                    </button>
                  </div>
                </div>

                <!-- Kart Alt Eylem Butonları -->
                <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <div id="quran-card-actions-${s.id}" class="flex items-center gap-1.5">
                    <button type="button" onclick="window.QuranTrackerModule.openEditModal('${s.id}')"
                      class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs rounded-xl transition flex items-center gap-1 cursor-pointer">
                      <span>✍️ Düzenle</span>
                    </button>
                    ${isPending ? `
                      <button type="button" onclick="window.QuranTrackerModule.saveStudent('${s.id}')"
                        class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-1 cursor-pointer animate-pulse"
                        title="Bu talebeyi kaydet">
                        <span>💾 Kaydet</span>
                      </button>
                      <button type="button" onclick="window.QuranTrackerModule.discardStudent('${s.id}')"
                        class="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                        title="Vazgeç">
                        ✕
                      </button>
                    ` : ''}
                  </div>

                  <div class="flex items-center gap-1.5">
                    ${st.isHatimComplete ? `
                      <button type="button" onclick="window.QuranTrackerModule.openHatimCompleteModal('${s.id}')"
                        class="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer animate-pulse">
                        <span>🎉 Hatim Tamam</span>
                      </button>
                    ` : ''}

                    <button type="button" onclick="window.Store.sendWhatsAppQuranReport('${s.id}')"
                      class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                      title="Veliye WhatsApp ile Hatim Bilgisi Gönder">
                      <span>📲 WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  // --- TABLO GÖRÜNÜMÜ ---
  renderTableView(filtered) {
    return `
      <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-black">
                <th class="py-3 px-3 w-10 text-center">#</th>
                <th class="py-3 px-3">Talebe Adı Soyadı</th>
                <th class="py-3 px-3 text-center w-16">Sınıf</th>
                <th class="py-3 px-3">Dini Ders Grubu / Hocası</th>
                <th class="py-3 px-3 text-center">Kaldığı Sayfa</th>
                <th class="py-3 px-3 text-center">Okunan / Kalan</th>
                <th class="py-3 px-3 text-center">İlerleme (%)</th>
                <th class="py-3 px-3 text-center">Cüz</th>
                <th class="py-3 px-3 text-center">Hatim</th>
                <th class="py-3 px-3 text-center w-36">İşlemler</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium text-slate-800">
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="10" class="py-12 text-center text-slate-400 font-semibold">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ` : filtered.map((item, idx) => {
                const s = item.student;
                const st = item.stats;
                const rank = idx + 1;
                const isTop3 = (this.sortMode === 'rank') && (rank <= 3);
                const medal = (this.sortMode === 'rank') ? (rank === 1 ? '🥇' : (rank === 2 ? '🥈' : (rank === 3 ? '🥉' : rank))) : rank;
                const isPending = !!item.isPending;
                const savedPage = item.savedPage || 1;
                const displayPage = item.displayPage !== undefined ? item.displayPage : '';

                return `
                  <tr id="quran-row-${s.id}" class="${isPending ? 'bg-amber-50/80 hover:bg-amber-100/80 border-l-4 border-amber-500' : 'hover:bg-slate-50'} transition cursor-pointer" onclick="window.QuranTrackerModule.openEditModal('${s.id}')">
                    <td class="py-3 px-3 text-center font-bold ${isTop3 ? 'text-amber-600 font-black' : 'text-slate-400'}">
                      ${medal}
                    </td>
                    <td class="py-3 px-3 font-black text-slate-900">
                      <div>${s.firstName} ${s.lastName}</div>
                      <div class="text-[10px] text-slate-400 font-mono">No: ${s.studentNo || s.id}</div>
                    </td>
                    <td class="py-3 px-3 text-center">
                      <span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[10px]">${s.className}</span>
                    </td>
                    <td class="py-3 px-3 text-slate-700 font-semibold">
                      ${item.diniGrup || s.dahiliHoca || '-'}
                    </td>
                    <td class="py-3 px-3 text-center" onclick="event.stopPropagation()">
                      <div class="flex items-center justify-center gap-1.5">
                        <input type="number" id="quran-page-input-${s.id}" min="0" max="604" value="${displayPage}"
                          class="w-16 px-1.5 py-1 text-center bg-white border-2 ${isPending ? 'border-amber-500 bg-amber-50 text-amber-950 font-black ring-2 ring-amber-300' : 'border-slate-300 text-slate-900 font-black'} rounded-lg text-xs focus:bg-white focus:border-emerald-500 focus:outline-none font-mono"
                          oninput="window.QuranTrackerModule.onPageInput(this, '${s.id}')"
                          onblur="window.QuranTrackerModule.onPageBlur(this, '${s.id}')"
                          onkeydown="if(event.key === 'Enter') { event.preventDefault(); window.QuranTrackerModule.onPageInput(this, '${s.id}'); window.QuranTrackerModule.saveStudent('${s.id}'); }"
                          title="Sayfayı silip değiştirebilir, Enter'a basabilir veya Kaydet butonuna tıklayabilirsiniz">
                        <span id="quran-row-badge-${s.id}" class="flex items-center gap-1">
                          ${isPending ? `
                            <button type="button" onclick="window.QuranTrackerModule.saveStudent('${s.id}')"
                              class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer animate-pulse"
                              title="Bu Talebeyi Kaydet">
                              <span>💾</span> <span>Kaydet</span>
                            </button>
                            <button type="button" onclick="window.QuranTrackerModule.discardStudent('${s.id}')"
                              class="px-1.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] rounded-lg transition cursor-pointer"
                              title="Vazgeç">
                              ✕
                            </button>
                          ` : ''}
                        </span>
                      </div>
                      <div id="quran-row-pending-text-${s.id}" class="text-[10px] text-amber-800 font-bold mt-0.5 whitespace-nowrap">
                        ${isPending ? `🟡 Kaydedilmedi (${savedPage} ➔ ${displayPage !== '' ? displayPage : '0'})` : ''}
                      </div>
                    </td>
                    <td id="quran-row-read-${s.id}" class="py-3 px-3 text-center text-[11px]">
                      <span class="text-emerald-700 font-black">${stats.pagesReadInHatim} sf</span> / 
                      <span class="text-amber-800 font-bold">${stats.pagesLeftInHatim} sf kaldı</span>
                    </td>
                    <td class="py-3 px-3 text-center">
                      <div class="flex items-center justify-center gap-1.5">
                        <div class="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div id="quran-row-bar-${s.id}" class="h-full bg-emerald-600 rounded-full" style="width: ${st.percentRead}%"></div>
                        </div>
                        <span id="quran-row-pct-${s.id}" class="font-mono font-black text-xs text-emerald-800">%${st.percentRead}</span>
                      </div>
                    </td>
                    <td id="quran-row-cuz-${s.id}" class="py-3 px-3 text-center font-bold text-indigo-900">
                      ${st.cuzNo}. Cüz
                    </td>
                    <td class="py-3 px-3 text-center font-black ${st.hatimCount > 0 ? 'text-amber-700' : 'text-slate-400'}">
                      ${st.hatimCount > 0 ? `🌟 ${st.hatimCount}` : '0'}
                    </td>
                    <td class="py-3 px-3 text-center" onclick="event.stopPropagation()">
                      <div class="flex items-center justify-center gap-1">
                        <button type="button" onclick="window.QuranTrackerModule.addPages('${s.id}', 1)"
                          class="px-1.5 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-700 font-bold rounded-lg text-[10px] cursor-pointer" title="+1 Sayfa">+1</button>
                        <button type="button" onclick="window.QuranTrackerModule.addPages('${s.id}', 5)"
                          class="px-1.5 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-700 font-bold rounded-lg text-[10px] cursor-pointer" title="+5 Sayfa">+5</button>
                        ${isPending ? `
                          <button type="button" onclick="window.QuranTrackerModule.saveStudent('${s.id}')"
                            class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] rounded-lg shadow-xs flex items-center gap-0.5 cursor-pointer" title="Kaydet">
                            💾
                          </button>
                        ` : ''}
                        <button type="button" onclick="window.QuranTrackerModule.openEditModal('${s.id}')"
                          class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black rounded-lg text-[10px] cursor-pointer" title="Düzenle">✍️</button>
                        <button type="button" onclick="window.Store.sendWhatsAppQuranReport('${s.id}')"
                          class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-[10px] cursor-pointer" title="WhatsApp">📲</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // --- DİNİ DERS GRUPLARI LİDERLİĞİ VE KARŞILAŞTIRMA ---
  renderGroupsView(groupSummaries) {
    if (!groupSummaries || groupSummaries.length === 0) {
      return `
        <div class="bg-white rounded-3xl p-12 text-center text-slate-400 font-semibold border border-slate-200">
          Kayıtlı grup bulunamadı.
        </div>
      `;
    }

    return `
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${groupSummaries.map((g, idx) => {
            const rank = idx + 1;
            const topStudent = g.topReader ? g.topReader.student : null;
            const topStats = g.topReader ? g.topReader.stats : null;

            return `
              <div class="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-xs relative overflow-hidden">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div class="flex items-center gap-2.5">
                    <span class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-900 font-black text-lg flex items-center justify-center">
                      🕌
                    </span>
                    <div>
                      <h4 class="font-black text-sm text-slate-900">${g.groupName}</h4>
                      <p class="text-[11px] text-slate-400">${g.studentCount} Talebe</p>
                    </div>
                  </div>
                  <span class="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 font-black text-xs font-mono">
                    #${rank}. Grup
                  </span>
                </div>

                <!-- Grup İstatistikleri -->
                <div class="grid grid-cols-3 gap-2 text-center text-xs">
                  <div class="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div class="text-[10px] font-black text-emerald-800 uppercase">Toplam Sayfa</div>
                    <div class="text-sm font-black text-emerald-900 mt-0.5">${g.totalLifetimePages.toLocaleString('tr-TR')}</div>
                  </div>
                  <div class="p-2.5 bg-amber-50 rounded-xl border border-amber-100">
                    <div class="text-[10px] font-black text-amber-800 uppercase">Biten Hatim</div>
                    <div class="text-sm font-black text-amber-900 mt-0.5">${g.totalCompletedHatims} Hatim</div>
                  </div>
                  <div class="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div class="text-[10px] font-black text-indigo-800 uppercase">Grup İlerleme</div>
                    <div class="text-sm font-black text-indigo-900 mt-0.5">%${g.avgPercent}</div>
                  </div>
                </div>

                <!-- Grup Lideri Talebe -->
                ${topStudent ? `
                  <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-center justify-between gap-2">
                    <div>
                      <div class="text-[10px] font-black text-slate-400 uppercase">Grup Birincisi:</div>
                      <div class="font-black text-slate-900 mt-0.5">${topStudent.firstName} ${topStudent.lastName}</div>
                      <div class="text-[10px] text-slate-500">${topStudent.className}</div>
                    </div>
                    <div class="text-right">
                      <div class="font-black text-emerald-700 font-mono text-sm">${topStats.currentPage}. sf</div>
                      <div class="text-[10px] text-amber-700 font-bold">${topStats.hatimCount} Hatim (%${topStats.percentRead})</div>
                    </div>
                  </div>
                ` : ''}

                <button type="button" onclick="window.QuranTrackerModule.setGroup('${g.groupName}'); window.QuranTrackerModule.setViewMode('cards');"
                  class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs rounded-xl transition text-center cursor-pointer">
                  Bu Grubu Filtrele & Talebeleri İncele ➔
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  // ========================================================
  // --- KUR'AN VERİLERİNİ KURTARMA, YEDEKLEME & TOPLU GİRİŞ ---
  // ========================================================
  openRecoveryModal() {
    let wrapper = document.getElementById('quran-recovery-modal-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'quran-recovery-modal-wrapper';
      document.body.appendChild(wrapper);
    }

    const allStudents = window.Store.getStudents(false);
    const allRecords = window.Store.getAllQuranRecords();

    wrapper.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 animate-fade-in no-print"
        onclick="if(event.target === this) window.QuranTrackerModule.closeRecoveryModal()">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full p-5 sm:p-6 space-y-5 max-h-[95vh] overflow-y-auto">
          
          <!-- Başlık -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 font-black text-2xl flex items-center justify-center shadow-inner">
                🛡️
              </div>
              <div>
                <h3 class="font-black text-base sm:text-lg text-slate-900">Kur'an-ı Kerim Veri Kurtarma & Yedekleme Merkezi</h3>
                <p class="text-xs text-slate-500">Kayıp sayfaları kurtarma, cihazlar arası eşitlik sağlama ve hızlı toplu giriş</p>
              </div>
            </div>
            <button onclick="window.QuranTrackerModule.closeRecoveryModal()" 
              class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-black transition flex items-center justify-center cursor-pointer">
              ✕
            </button>
          </div>

          <!-- 1. OTOMATİK KURTARMA BUTONU & BİLGİ KUTUSU -->
          <div class="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
            <div class="flex items-start gap-3">
              <span class="text-2xl">🔍</span>
              <div>
                <h4 class="font-black text-xs sm:text-sm text-emerald-950">1. Yerel Hafızadan & Geçmişten Otomatik Kurtarma</h4>
                <p class="text-xs text-emerald-800 leading-relaxed mt-0.5">
                  Tarayıcınızın geçmiş kayıtlarını ve yerel yedeklerini tarar. 1 yazan talebelerin daha önce girilmiş gerçek sayfaları varsa anında kurtarır ve buluta işler.
                </p>
              </div>
            </div>
            <button type="button" onclick="window.QuranTrackerModule.runAutoRecovery()"
              class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer">
              <span>🚀</span> <span>Geçmiş Hafızayı Tara ve Sayfaları Kurtar</span>
            </button>
          </div>

          <!-- 2. BAŞKA CİHAZDA GİRİLDİYSE KURTARMA REHBERİ -->
          <div class="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-2">
            <div class="flex items-center gap-2 font-black text-amber-900">
              <span>📱</span> <span>Sayfaları Başka Bir Telefonda veya Bilgisayarda mı Girdiniz?</span>
            </div>
            <p class="leading-relaxed text-amber-900">
              Eğer Kur'an sayfalarını <strong>telefonunuzdan, evdeki bilgisayardan veya başka bir tarayıcıdan</strong> yazdıysanız endişe etmeyiniz! 
              Yeni <strong>v5.9 Koruma Kalkanı</strong> sayesinde o cihazda bu takip ekranını bir kez açtığınız anda, sistem o cihazdaki gerçek sayfaları algılayacak ve buluta otomatik olarak geri yükleyecektir.
            </p>
          </div>

          <!-- 3. YEDEK İNDİR / YÜKLE -->
          <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-black text-xs uppercase text-slate-800">2. Yedek Dosyası İndir / Yükle</span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" onclick="window.QuranTrackerModule.downloadQuranBackup()"
                class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer">
                <span>📥</span> <span>Kur'an Verilerini İndir (Yedek Al)</span>
              </button>
              <label class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer">
                <span>📤</span> <span>Yedek Dosyası Yükle</span>
                <input type="file" accept=".json" class="hidden" onchange="window.QuranTrackerModule.importQuranBackupFile(event)">
              </label>
            </div>
          </div>

          <!-- 4. HIZLI TOPLU SAYFA DÜZENLEME TABLOSU -->
          <div class="space-y-2 pt-2 border-t border-slate-100">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-black text-xs uppercase text-slate-800">3. Hızlı Toplu Sayfa Düzenleyici (Excel Usulü)</h4>
                <p class="text-[11px] text-slate-500">Tüm talebelerin sayfalarını tek ekranda topluca inceleyip saniyeler içinde güncelleyebilirsiniz.</p>
              </div>
            </div>

            <form id="quran-batch-form" onsubmit="window.QuranTrackerModule.saveBatchPages(event)" class="space-y-3">
              <div class="max-h-64 overflow-y-auto border border-slate-200 rounded-2xl">
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-slate-900 text-white sticky top-0 uppercase text-[10px]">
                    <tr>
                      <th class="p-2.5 w-10 text-center">#</th>
                      <th class="p-2.5">Talebe</th>
                      <th class="p-2.5 text-center w-16">Sınıf</th>
                      <th class="p-2.5">Dini Grup</th>
                      <th class="p-2.5 text-center w-24">Kaldığı Sayfa</th>
                      <th class="p-2.5 text-center w-20">Hatim</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${allStudents.map((s, idx) => {
                      const rec = allRecords[s.id] || { currentPage: 1, hatimCount: 0 };
                      return `
                        <tr class="hover:bg-slate-50">
                          <td class="p-2 text-center text-slate-400 font-bold">${idx + 1}</td>
                          <td class="p-2 font-black text-slate-900">
                            ${s.firstName} ${s.lastName}
                            <span class="text-[10px] text-slate-400 font-mono ml-1">#${s.studentNo || s.id}</span>
                          </td>
                          <td class="p-2 text-center font-bold text-slate-600">${s.className}</td>
                          <td class="p-2 text-slate-700 text-[11px] font-medium">${rec.diniGrup || s.dahiliHoca || '-'}</td>
                          <td class="p-2 text-center">
                            <input type="number" min="0" max="604" name="page_${s.id}" value="${rec.currentPage || 1}"
                              class="w-20 px-2 py-1 text-center bg-slate-50 border-2 border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none font-mono">
                          </td>
                          <td class="p-2 text-center">
                            <input type="number" min="0" name="hatim_${s.id}" value="${rec.hatimCount || 0}"
                              class="w-16 px-2 py-1 text-center bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none font-mono">
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>

              <div class="flex items-center justify-between pt-2">
                <span class="text-[11px] text-slate-500">Düzenlemeyi bitirdikten sonra aşağıdaki butona basınız:</span>
                <button type="submit"
                  class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow transition cursor-pointer flex items-center gap-1.5">
                  <span>💾</span> <span>Tüm Sayfaları Toplu Kaydet & Buluta Yükle</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  },

  closeRecoveryModal() {
    const wrapper = document.getElementById('quran-recovery-modal-wrapper');
    if (wrapper) wrapper.remove();
  },

  runAutoRecovery() {
    const res = window.Store.recoverQuranRecordsFromStorage();
    if (res.success && res.recoveredCount > 0) {
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast(`🎉 ${res.recoveredCount} talebenin Kur'an sayfası hafızadan kurtarıldı ve buluta işlendi!`, 'success');
      }
      this.closeRecoveryModal();
      this.renderView();
    } else {
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast('Bu tarayıcının yerel hafızasında eski kayıt bulunamadı. Sayfaları girdiğiniz diğer cihazı (telefon/tablet) açtığınızda sistem otomatik kurtaracaktır.', 'info');
      }
    }
  },

  downloadQuranBackup() {
    try {
      const records = window.Store.getAllQuranRecords();
      const payload = {
        type: 'IRFANIYE_QURAN_TRACKER_BACKUP',
        version: '5.9',
        exportedAt: new Date().toISOString(),
        quranTracker: records
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kuran_hatim_takip_yedek_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast('Kur\'an takip verileri başarıyla bilgisayarınıza indirildi.', 'success');
      }
    } catch (e) {
      console.error('downloadQuranBackup error:', e);
    }
  },

  importQuranBackupFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const data = parsed.quranTracker || parsed;
        if (data && typeof data === 'object') {
          const key = (window.Store && window.Store.STORAGE_KEYS && window.Store.STORAGE_KEYS.quranTracker) || 'irfaniye_quran_tracker_v1';
          localStorage.setItem(key, JSON.stringify(data));
          try { localStorage.setItem(key + '_backup', JSON.stringify(data)); } catch (err) {}
          if (window.Store && window.Store.isCloudEnabled()) {
            window.Store.syncToCloud('irfaniye_data/quranTracker', data);
          }
          window.dispatchEvent(new CustomEvent('quran-tracker-updated', { detail: data }));
          if (window.App && typeof window.App.showToast === 'function') {
            window.App.showToast('Yedek dosyasındaki Kur\'an verileri başarıyla yüklendi ve buluta aktarıldı!', 'success');
          }
          this.closeRecoveryModal();
          this.renderView();
        } else {
          alert('Geçersiz yedek dosyası formatı.');
        }
      } catch (err) {
        alert('Yedek dosyası okunamadı: ' + err.message);
      }
    };
    reader.readAsText(file);
  },

  saveBatchPages(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const allStudents = window.Store.getStudents(false);
    const allRecords = window.Store.getAllQuranRecords();
    const nowIso = new Date().toISOString();
    let updatedCount = 0;

    allStudents.forEach(s => {
      const pageVal = formData.get(`page_${s.id}`);
      const hatimVal = formData.get(`hatim_${s.id}`);
      if (pageVal !== null) {
        const page = Math.min(604, Math.max(0, parseInt(pageVal, 10) || 0));
        const hatim = Math.max(0, parseInt(hatimVal, 10) || 0);
        const cur = allRecords[s.id] || {};
        if (cur.currentPage !== page || cur.hatimCount !== hatim) {
          allRecords[s.id] = {
            ...cur,
            studentId: s.id,
            currentPage: page,
            hatimCount: hatim,
            diniGrup: cur.diniGrup || s.dahiliHoca || 'Genel',
            updatedAt: nowIso
          };
          updatedCount++;
        }
      }
    });

    if (updatedCount > 0) {
      const key = (window.Store && window.Store.STORAGE_KEYS && window.Store.STORAGE_KEYS.quranTracker) || 'irfaniye_quran_tracker_v1';
      localStorage.setItem(key, JSON.stringify(allRecords));
      try { localStorage.setItem(key + '_backup', JSON.stringify(allRecords)); } catch (e) {}
      if (window.Store && window.Store.isCloudEnabled()) {
        window.Store.syncToCloud('irfaniye_data/quranTracker', allRecords);
      }
      window.dispatchEvent(new CustomEvent('quran-tracker-updated', { detail: allRecords }));
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast(`✅ ${updatedCount} talebenin sayfası kaydedildi ve buluta eşitlendi!`, 'success');
      }
    } else {
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast('Herhangi bir değişiklik yapılmadı.', 'info');
      }
    }

    this.closeRecoveryModal();
    this.renderView();
  }
};
