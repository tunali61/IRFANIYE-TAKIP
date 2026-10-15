/**
 * leave-tracker.js - Hafta Sonu İzine Çıkış ve Geç Çıkış Takip Modülü
 * - Namaz Yoklaması: VAR ve İZİNLİ hariç (YOK, TAKKESİZ, GEÇ) -> Her işaret +30 dk (yarım saat)
 * - Yatak Yoklaması: ORTA ve KÖTÜ -> Her işaret +30 dk (yarım saat)
 * - Okul Dönüşü: GEÇ ve GELMEDİ -> Her işaret +30 dk (yarım saat)
 * - Standart İzin Çıkış Saati (Varsayılan 13:00) üzerine eklenerek yeni çıkış saati hesaplanır.
 * - Kapı / Nöbetçi Çıkış Kontrolü (Çıktı / Bekliyor) ve A4 Liste Yazdırma desteği.
 */

window.LeaveTrackerModule = {
  currentDate: new Date().toISOString().split('T')[0],
  baseExitTime: localStorage.getItem('irfaniye_base_exit_time') || '13:00',
  selectedClasses: [], // Boş ise tüm sınıflar
  selectedHoca: 'ALL',
  filterOnlyDelayed: false,
  searchQuery: '',
  modalStudentId: null,
  partialWaiverStudentId: null,

  init() {
    this.renderView();
  },

  getWeekInfo() {
    return window.Store.getWeekRange(this.currentDate);
  },

  setThisWeek() {
    this.currentDate = new Date().toISOString().split('T')[0];
    this.renderView();
  },

  prevWeek() {
    const d = new Date(this.currentDate);
    d.setDate(d.getDate() - 7);
    this.currentDate = d.toISOString().split('T')[0];
    this.renderView();
  },

  nextWeek() {
    const d = new Date(this.currentDate);
    d.setDate(d.getDate() + 7);
    this.currentDate = d.toISOString().split('T')[0];
    this.renderView();
  },

  setDate(dateStr) {
    if (!dateStr) return;
    this.currentDate = dateStr;
    this.renderView();
  },

  setBaseExitTime(timeStr) {
    if (!timeStr) return;
    this.baseExitTime = timeStr;
    localStorage.setItem('irfaniye_base_exit_time', timeStr);
    this.renderView();
    if (window.App && window.App.showToast) {
      window.App.showToast(`Standart izin çıkış saati ${timeStr} olarak güncellendi.`, 'info');
    }
  },

  toggleClass(className) {
    if (this.selectedClasses.includes(className)) {
      this.selectedClasses = this.selectedClasses.filter(c => c !== className);
    } else {
      this.selectedClasses.push(className);
    }
    this.renderView();
  },

  toggleAllClasses() {
    this.selectedClasses = [];
    this.renderView();
  },

  setHocaFilter(hoca) {
    this.selectedHoca = hoca;
    this.renderView();
  },

  toggleFilterOnlyDelayed() {
    this.filterOnlyDelayed = !this.filterOnlyDelayed;
    this.renderView();
  },

  setSearchQuery(q) {
    this.searchQuery = (q || '').toLowerCase().trim();
    this.renderView();
  },

  toggleGateCheckout(studentId) {
    const weekInfo = this.getWeekInfo();
    const weekKey = `week_${weekInfo.startDate}`;
    const newState = window.Store.toggleGateCheckout(weekKey, studentId);
    this.renderView();
    if (window.App && window.App.showToast) {
      const st = window.Store.getStudentById(studentId);
      const name = st ? `${st.firstName} ${st.lastName}` : 'Öğrenci';
      if (newState) {
        window.App.showToast(`✅ ${name} izne çıktı olarak işaretlendi.`, 'success');
      } else {
        window.App.showToast(`⏳ ${name} çıkış durumu geri alındı.`, 'info');
      }
    }
  },

  togglePenaltyCleared(studentId) {
    const weekInfo = this.getWeekInfo();
    const weekKey = `week_${weekInfo.startDate}`;
    const newState = window.Store.togglePenaltyCleared(weekKey, studentId);
    this.renderView();
    if (window.App && window.App.showToast) {
      const st = window.Store.getStudentById(studentId);
      const name = st ? `${st.firstName} ${st.lastName}` : 'Talebe';
      if (newState) {
        window.App.showToast(`✓ ${name} için tam telafi affı uygulandı ve TV panosundan düşürüldü.`, 'success');
      } else {
        window.App.showToast(`🔄 ${name} için telafi affı kaldırıldı (asıl telafi TV'de gösterilecek).`, 'info');
      }
    }
  },

  openPartialWaiverModal(studentId) {
    this.partialWaiverStudentId = studentId;
    this.renderView();
  },

  closePartialWaiverModal() {
    this.partialWaiverStudentId = null;
    this.renderView();
  },

  applyPartialWaiver(studentId, minutes, note = '') {
    const weekInfo = this.getWeekInfo();
    const weekKey = `week_${weekInfo.startDate}`;
    const mins = Math.max(0, parseInt(minutes, 10) || 0);
    window.Store.setPartialPenaltyWaiver(weekKey, studentId, mins, note);
    this.closePartialWaiverModal();
    this.renderView();
    if (window.App && window.App.showToast) {
      const st = window.Store.getStudentById(studentId);
      const name = st ? `${st.firstName} ${st.lastName}` : 'Talebe';
      window.App.showToast(`✂️ ${name} için ${mins} dk telafi affı kaydedildi.`, 'success');
    }
  },

  cancelPenaltyWaiver(studentId) {
    const weekInfo = this.getWeekInfo();
    const weekKey = `week_${weekInfo.startDate}`;
    window.Store.cancelPenaltyWaiver(weekKey, studentId);
    this.closePartialWaiverModal();
    this.renderView();
    if (window.App && window.App.showToast) {
      const st = window.Store.getStudentById(studentId);
      const name = st ? `${st.firstName} ${st.lastName}` : 'Talebe';
      window.App.showToast(`🔄 ${name} için telafi affı kaldırıldı (asıl telafi aktif).`, 'info');
    }
  },

  submitCustomWaiver(studentId) {
    const inputEl = document.getElementById('partial-waiver-custom-mins');
    const noteEl = document.getElementById('partial-waiver-custom-note');
    const mins = parseInt(inputEl ? inputEl.value : 0, 10) || 0;
    const note = noteEl ? noteEl.value.trim() : '';
    if (mins <= 0) {
      if (window.App && window.App.showToast) {
        window.App.showToast('Lütfen affedilecek dakika miktarını giriniz (0\'dan büyük olmalı).', 'warning');
      }
      return;
    }
    this.applyPartialWaiver(studentId, mins, note);
  },

  sendWhatsAppExitNotice(studentId) {
    const st = window.Store.getStudentById(studentId);
    if (!st) return;

    let phone = st.parentPhone || st.phone || st.fatherPhone || '';
    if (!phone) {
      const input = prompt(`"${st.firstName} ${st.lastName}" adlı talebenin veli telefonu kayıtlı değil.\nMesaj göndermek için veli telefon numarasını giriniz (Örn: 05xx...):`);
      if (!input || !input.trim()) return;
      phone = input.trim();
      window.Store.updateStudent(studentId, { parentPhone: phone });
    }

    const weekInfo = this.getWeekInfo();
    const rep = window.Store.getLeaveReportForStudent(studentId, weekInfo.dates, this.baseExitTime);
    
    let msg = '';
    if (rep.penaltyMinutes > 0) {
      let reasons = [];
      const intizamCount = rep.totalInfractions - (rep.takviyeInfractionsCount || 0);
      if (intizamCount > 0) {
        reasons.push('intizam kusurları');
      }
      if (rep.takviyeInfractionsCount > 0) {
        reasons.push(`takviye dersi (< 85) telafisi (${rep.takviyeInfractionsCount} ders, +${rep.takviyePenaltyMinutes} dk)`);
      }
      const reasonText = reasons.length > 0 ? reasons.join(' ve ') : 'oluşan telafiler';
      const partialNote = (rep.isPartiallyCleared && rep.waivedMinutes > 0)
        ? ` (${rep.waivedMinutes} dakikalık telafisi affedilmiş olup kalan ${rep.penaltyMinutes} dk ek süre uygulanmaktadır)`
        : '';
      msg = `Sayın Velimiz, İrfaniye Akademi'den bildiriyoruz: Talebeniz ${st.firstName} ${st.lastName}, bu hafta ${reasonText} sebebiyle (+${rep.penaltyFormatted} gecikme${partialNote}) hafta sonu iznine saat ${rep.calculatedExitTime}'de çıkabilecektir (Standart çıkış: ${this.baseExitTime}). Bilgilerinize sunarız.`;
    } else {
      const clearedNote = (rep.isFullyCleared && rep.rawPenaltyMinutes > 0)
        ? ` (Oluşan ${rep.rawPenaltyFormatted} telafisi tamamlanmış ve affedilmiştir)`
        : '';
      msg = `Sayın Velimiz, İrfaniye Akademi'den bildiriyoruz: Talebeniz ${st.firstName} ${st.lastName}, bu haftayı tam intizam ve kusursuz olarak tamamlamış olup${clearedNote} hafta sonu iznine vaktinde (Saat: ${this.baseExitTime}) çıkacaktır. Gayretlerinden ötürü tebrik eder, hayırlı günler dileriz.`;
    }

    window.Store.sendWhatsAppMessage(phone, msg);
  },

  openDetailModal(studentId) {
    this.modalStudentId = studentId;
    this.renderView();
  },

  closeDetailModal() {
    this.modalStudentId = null;
    this.renderView();
  },

  getFilteredStudents() {
    let students = window.Store.getStudents();

    // Sınıf Filtresi
    if (this.selectedClasses.length > 0) {
      students = students.filter(s => this.selectedClasses.includes(s.className));
    }

    // Hoca Filtresi
    if (this.selectedHoca !== 'ALL') {
      students = students.filter(s => 
        (s.dahiliHoca && s.dahiliHoca.trim() === this.selectedHoca) ||
        (s.etutHocasi && s.etutHocasi.trim() === this.selectedHoca)
      );
    }

    // İsim Arama Filtresi
    if (this.searchQuery) {
      students = students.filter(s => {
        const full = `${s.firstName} ${s.lastName} ${s.studentNo} ${s.className}`.toLowerCase();
        return full.includes(this.searchQuery);
      });
    }

    return students;
  },

  renderView() {
    const container = document.getElementById('leave-tracker-container');
    if (!container) return;

    const weekInfo = this.getWeekInfo();
    const weekKey = `week_${weekInfo.startDate}`;
    const allStudents = this.getFilteredStudents();
    const classes = window.Store.getClasses();
    const allHocalar = window.Store.getAllHocalar();
    const gateStatus = window.Store.getGateCheckoutStatus(weekKey);

    // Toplu Ceza & Çıkış Hesabı
    const batch = window.Store.getLeaveReportBatch(allStudents, weekInfo.dates, this.baseExitTime);

    let clearedCount = 0;
    let partiallyClearedCount = 0;
    let activePenalizedCount = 0;

    batch.reports.forEach(r => {
      const rep = r.report;
      if (rep.rawPenaltyMinutes > 0) {
        if (rep.isFullyCleared) {
          clearedCount++;
        } else if (rep.isPartiallyCleared) {
          partiallyClearedCount++;
          activePenalizedCount++;
        } else {
          activePenalizedCount++;
        }
      }
    });

    // Yalnızca gecikecekler filtresi aktifse (ek süresi olan veya kısmi/tam af almış cezalılar)
    let displayedReports = batch.reports;
    if (this.filterOnlyDelayed) {
      displayedReports = displayedReports.filter(r => r.report.rawPenaltyMinutes > 0 || r.report.hasActivePenalty);
    }

    // Sıralama: Önce en çok kalan telafisi olanlar, sonra ham telafi, sonra numara
    displayedReports.sort((a, b) => {
      if ((b.report.penaltyMinutes || 0) !== (a.report.penaltyMinutes || 0)) {
        return (b.report.penaltyMinutes || 0) - (a.report.penaltyMinutes || 0);
      }
      if ((b.report.rawPenaltyMinutes || 0) !== (a.report.rawPenaltyMinutes || 0)) {
        return (b.report.rawPenaltyMinutes || 0) - (a.report.rawPenaltyMinutes || 0);
      }
      return (a.student.studentNo || '').localeCompare(b.student.studentNo || '', undefined, { numeric: true });
    });

    const isAllClasses = this.selectedClasses.length === 0;

    container.innerHTML = `
      <div class="space-y-6 animate-fade-in max-w-7xl mx-auto">
        <!-- 1. ÜST PANEL: HAFTA VE STANDART ÇIKIŞ SAATİ KONTROLÜ -->
        <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-indigo-400/30 flex items-center gap-1.5">
                  <span>🚪</span>
                  <span>Hafta Sonu İzin Sistemi</span>
                </span>
                <span class="text-xs text-slate-400">| İlk 3 Kusur Affedilir • 3'ü Aşan Her Kusur +30 Dk Telafi</span>
              </div>
              <h2 class="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Hafta Sonu İzin & Geç Çıkış Takibi</span>
              </h2>
              <p class="text-xs text-slate-300">
                Namaz, Yatak ve Okul Dönüşü kusurlarında 3 kusur affı uygulanır. 3'ü aşan kusurlar kapı çıkış saatine ek telafi süresi olarak eklenir.
              </p>
            </div>

            <!-- Sağ Butonlar: Hafta Seçimi & Standart Saat -->
            <div class="flex flex-wrap items-center gap-3 no-print">
              <!-- Standart Çıkış Saati Kutusu -->
              <div class="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20 flex items-center gap-2.5">
                <div class="text-left">
                  <div class="text-[10px] font-black uppercase text-indigo-200">STANDART ÇIKIŞ SAATİ</div>
                  <div class="text-[11px] text-slate-300">Kusursuz öğrencilerin çıkış vakti</div>
                </div>
                <input type="time" value="${this.baseExitTime}" 
                  onchange="window.LeaveTrackerModule.setBaseExitTime(this.value)"
                  class="bg-white text-slate-900 font-black text-sm px-2.5 py-1.5 rounded-xl shadow-sm border border-slate-300 focus:outline-none cursor-pointer">
              </div>

              <!-- Yazdır Butonu -->
              <button type="button" onclick="window.print()" 
                class="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs shadow-md transition flex items-center gap-2">
                <span>🖨️</span>
                <span>Nöbetçi İzin Listesi Yazdır</span>
              </button>
            </div>
          </div>

          <!-- Hafta Navigasyonu & Tarih Seçici -->
          <div class="mt-6 pt-5 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 no-print">
            <div class="flex items-center gap-2">
              <button type="button" onclick="window.LeaveTrackerModule.prevWeek()"
                class="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 border border-white/15">
                <span>←</span>
                <span>Önceki Hafta</span>
              </button>
              <button type="button" onclick="window.LeaveTrackerModule.setThisWeek()"
                class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition border border-indigo-400/40">
                📅 Bu Hafta
              </button>
              <button type="button" onclick="window.LeaveTrackerModule.nextWeek()"
                class="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 border border-white/15">
                <span>Sonraki Hafta</span>
                <span>→</span>
              </button>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-xs text-indigo-200 font-medium">Hafta Aralığı:</span>
              <span class="px-3 py-1 bg-white/15 rounded-xl text-xs font-black text-white border border-white/20">
                ${weekInfo.startDate} Pazartesi &nbsp;➔&nbsp; ${weekInfo.endDate} Pazar
              </span>
              <input type="date" value="${this.currentDate}"
                onchange="window.LeaveTrackerModule.setDate(this.value)"
                class="bg-white/10 text-white text-xs font-bold px-3 py-1 rounded-xl border border-white/20 focus:outline-none cursor-pointer">
            </div>
          </div>
        </div>

        <!-- 2. KPI ÖZET KARTLARI -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Toplam Talebe -->
          <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div class="text-[11px] font-bold uppercase text-slate-400 tracking-wider">TOPLAM TALEBE</div>
              <div class="text-2xl font-black text-slate-800 mt-1">${batch.totalStudents} Talebe</div>
              <div class="text-[11px] text-slate-400 mt-0.5">Seçili sınıflarda</div>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 text-xl font-bold flex items-center justify-center">
              👥
            </div>
          </div>

          <!-- Zamanında Çıkacaklar (3 Kusura Kadar) -->
          <div class="bg-white rounded-3xl p-5 border border-emerald-200 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div class="absolute -right-2 -bottom-2 w-20 h-20 bg-emerald-50 rounded-full opacity-60 pointer-events-none"></div>
            <div>
              <div class="text-[11px] font-bold uppercase text-emerald-700 tracking-wider">ZAMANINDA ÇIKACAKLAR</div>
              <div class="text-2xl font-black text-emerald-700 mt-1">${batch.onTimeCount} Talebe</div>
              <div class="text-[11px] text-emerald-600 font-bold mt-0.5">3 Kusura Kadar Affedildi • Saat: ${this.baseExitTime}</div>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 text-xl font-bold flex items-center justify-center">
              🟢
            </div>
          </div>

          <!-- Gecikmeli Çıkacaklar (3'ten Fazla Kusuru Olanlar) -->
          <div class="bg-white rounded-3xl p-5 border border-rose-200 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div class="absolute -right-2 -bottom-2 w-20 h-20 bg-rose-50 rounded-full opacity-60 pointer-events-none"></div>
            <div>
              <div class="text-[11px] font-bold uppercase text-rose-700 tracking-wider">EK SÜRELİ ÇIKACAKLAR</div>
              <div class="text-2xl font-black text-rose-700 mt-1">${activePenalizedCount} Talebe</div>
              <div class="text-[11px] font-bold mt-1 flex flex-col gap-0.5">
                ${clearedCount > 0 ? `<span class="text-emerald-700">✓ ${clearedCount} Talebe Tam Affedildi (TV'den Düşürüldü)</span>` : ''}
                ${partiallyClearedCount > 0 ? `<span class="text-indigo-600">✂️ ${partiallyClearedCount} Talebeye Kısmi Af Uygulandı</span>` : ''}
                ${activePenalizedCount > 0 
                  ? `<span class="text-rose-600">⚠️ ${activePenalizedCount} Talebe TV'de Gösteriliyor</span>` 
                  : `<span class="text-emerald-600">🎉 TV Panosu Temiz (Telafili Yok)</span>`}
              </div>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 text-xl font-bold flex items-center justify-center">
              🔴
            </div>
          </div>

          <!-- Toplam Ceza Süresi -->
          <div class="bg-white rounded-3xl p-5 border border-amber-200 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div class="absolute -right-2 -bottom-2 w-20 h-20 bg-amber-50 rounded-full opacity-60 pointer-events-none"></div>
            <div>
              <div class="text-[11px] font-bold uppercase text-amber-800 tracking-wider">TOPLAM GECİKME SÜRESİ</div>
              <div class="text-2xl font-black text-amber-900 mt-1">${batch.totalPenaltyFormatted}</div>
              <div class="text-[11px] text-amber-700 font-bold mt-0.5">${batch.totalInfractionsAll} Adet Kusur (×30 Dk)</div>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 text-xl font-bold flex items-center justify-center">
              ⏱️
            </div>
          </div>
        </div>

        <!-- 3. FİLTRELER VE KONTROLLER (HAP BUTONLAR, ARAMA, CEZALI FİLTRESİ) -->
        <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4 no-print">
          <!-- Çoklu Sınıf Seçimi -->
          <div>
            <div class="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span class="uppercase tracking-wider text-slate-500 font-black text-[10px]">SINIF SEÇİMİ (Çoklu Seçilebilir):</span>
              <span class="text-[11px] text-slate-400">
                ${isAllClasses ? 'Şu an: Tüm Sınıflar' : `Seçili: ${this.selectedClasses.join(', ')}`}
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" onclick="window.LeaveTrackerModule.toggleAllClasses()"
                class="px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  isAllClasses 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }">
                Tüm Sınıflar (${classes.length})
              </button>

              ${classes.map(cls => {
                const isSelected = this.selectedClasses.includes(cls);
                return `
                  <button type="button" onclick="window.LeaveTrackerModule.toggleClass('${cls}')"
                    class="px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      isSelected 
                        ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }">
                    <span>${cls}</span>
                    ${isSelected ? '<span class="text-[10px]">✓</span>' : ''}
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Alt Filtreler: Hoca, Arama, Sadece Cezalılar -->
          <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-3 flex-1">
              <!-- Hoca Filtresi -->
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-600">Hoca:</span>
                <select onchange="window.LeaveTrackerModule.setHocaFilter(this.value)"
                  class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500">
                  <option value="ALL" ${this.selectedHoca === 'ALL' ? 'selected' : ''}>Tüm Hocalar</option>
                  ${allHocalar.map(h => `
                    <option value="${h}" ${this.selectedHoca === h ? 'selected' : ''}>${h}</option>
                  `).join('')}
                </select>
              </div>

              <!-- İsim Arama -->
              <div class="relative min-w-[200px] flex-1 max-w-sm">
                <input type="text" placeholder="Öğrenci adı, soyadı veya no ara..."
                  value="${this.searchQuery}"
                  oninput="window.LeaveTrackerModule.setSearchQuery(this.value)"
                  class="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500">
                <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
              </div>
            </div>

            <!-- Sadece Telafililer Butonu -->
            <div>
              <button type="button" onclick="window.LeaveTrackerModule.toggleFilterOnlyDelayed()"
                class="px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-2 border ${
                  this.filterOnlyDelayed 
                    ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-sm ring-2 ring-rose-200' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }">
                <span>${this.filterOnlyDelayed ? '🔴 Sadece Telafililer Gösteriliyor' : '⚪ Tümünü Göster'}</span>
                <span class="px-1.5 py-0.5 rounded-md text-[10px] ${this.filterOnlyDelayed ? 'bg-rose-200 text-rose-800' : 'bg-slate-200 text-slate-700'}">
                  ${batch.delayedCount}
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- 4. ÖĞRENCİ İZİN VE ÇIKIŞ SAATLERİ TABLOSU -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="font-black text-sm text-slate-900 flex items-center gap-2">
                <span>📋 Talebe İzin Çıkış Çizelgesi</span>
                <span class="text-xs font-normal text-slate-500">(${displayedReports.length} Talebe Listeleniyor)</span>
              </h3>
              <p class="text-[11px] text-slate-400 mt-0.5">
                Kusur Başı = <strong>+30 Dk</strong> • İzin Dönüşü = <strong>Dakika Başı 3x Dk</strong> • Takviye (&lt; 85) = <strong>+60 Dk</strong> • Standart Çıkış Saati: <strong>${this.baseExitTime}</strong>
              </p>
            </div>

            <!-- Bilgilendirme Rozetleri -->
            <div class="flex items-center gap-2 text-xs">
              <span class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                🟢 0 Kusur: Zamanında (${this.baseExitTime})
              </span>
              <span class="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 font-bold border border-rose-200">
                🔴 Telafili: Ek Süreli Çıkış
              </span>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs min-w-[900px]">
              <thead>
                <tr class="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th class="p-3 font-black text-center w-12">SIRA</th>
                  <th class="p-3 font-black">ÖĞRENCİ BİLGİSİ</th>
                  <th class="p-3 font-black text-center">🕌 NAMAZ KUSURLARI</th>
                  <th class="p-3 font-black text-center">🛏️ YATAK</th>
                  <th class="p-3 font-black text-center">🎒 OKUL DÖNÜŞÜ</th>
                  <th class="p-3 font-black text-center">🧳 İZİN DÖNÜŞÜ (3x)</th>
                  <th class="p-3 font-black text-center">📚 TAKVİYE (&lt; 85)</th>
                  <th class="p-3 font-black text-center">TOPLAM KUSUR</th>
                  <th class="p-3 font-black text-center">TELAFİ SÜRESİ</th>
                  <th class="p-3 font-black text-center">İZİN ÇIKIŞ SAATİ</th>
                  <th class="p-3 font-black text-center no-print min-w-[140px]">TELAFİ DURUMU (TV)</th>
                  <th class="p-3 font-black text-center no-print">KAPI KONTROL</th>
                  <th class="p-3 font-black text-center no-print">İŞLEM</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${displayedReports.length === 0 ? `
                  <tr>
                    <td colspan="13" class="p-8 text-center text-slate-400">
                      Seçilen kriterlere uygun öğrenci bulunamadı.
                    </td>
                  </tr>
                ` : displayedReports.map((item, idx) => {
                  const s = item.student;
                  const rep = item.report;
                  const isCheckedOut = !!gateStatus[s.id];
                  const hasPenalty = rep.rawPenaltyMinutes > 0;
                  const isCleared = rep.isFullyCleared;
                  const isPartiallyCleared = rep.isPartiallyCleared;

                  return `
                    <tr class="hover:bg-slate-50/70 transition-colors ${isCheckedOut ? 'bg-slate-50/40 opacity-70' : ''} ${isCleared ? 'bg-emerald-50/20' : (isPartiallyCleared ? 'bg-indigo-50/20' : '')}">
                      <!-- Sıra & No -->
                      <td class="p-3 text-center font-bold text-slate-400">
                        ${idx + 1}
                      </td>

                      <!-- Öğrenci Adı Soyadı & Dahili Hoca -->
                      <td class="p-3">
                        <div class="flex items-center gap-2.5">
                          <div class="w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shadow-2xs ${
                            hasPenalty 
                              ? (isCleared ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : (isPartiallyCleared ? 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300' : 'bg-rose-100 text-rose-800')) 
                              : 'bg-emerald-100 text-emerald-800'
                          }">
                            ${s.studentNo}
                          </div>
                          <div>
                            <div class="font-black text-slate-900 text-xs flex items-center gap-1.5">
                              <span>${s.firstName} ${s.lastName}</span>
                              ${isCleared ? '<span class="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[9px] font-black">✓ Tam Af</span>' : ''}
                              ${isPartiallyCleared ? `<span class="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 border border-indigo-300 rounded text-[9px] font-black">✂️ -${rep.waivedMinutes} dk Af</span>` : ''}
                            </div>
                            <div class="text-[10px] text-slate-500 font-medium">
                              ${s.className} • ${s.dahiliHoca || '-'} • ${s.yatakhane || '-'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <!-- Namaz Kusurları (Yok, Takkesiz, Geç) -->
                      <td class="p-3 text-center">
                        ${rep.namazInfractionsCount > 0 ? `
                          <span class="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-black inline-block">
                            ${rep.namazInfractionsCount} Kusur
                          </span>
                        ` : `
                          <span class="text-slate-300 font-bold">-</span>
                        `}
                      </td>

                      <!-- Yatak Kusurları (Orta, Kötü) -->
                      <td class="p-3 text-center">
                        ${rep.yatakInfractionsCount > 0 ? `
                          <span class="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-black inline-block">
                            ${rep.yatakInfractionsCount} Kusur
                          </span>
                        ` : `
                          <span class="text-slate-300 font-bold">-</span>
                        `}
                      </td>

                      <!-- Okul Dönüş Kusurları (Geç, Gelmedi) -->
                      <td class="p-3 text-center">
                        ${rep.okulInfractionsCount > 0 ? `
                          <span class="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-black inline-block">
                            ${rep.okulInfractionsCount} Kusur
                          </span>
                        ` : `
                          <span class="text-slate-300 font-bold">-</span>
                        `}
                      </td>

                      <!-- İzin Dönüşü Gecikmeleri (3x Telafi) -->
                      <td class="p-3 text-center">
                        ${(rep.leaveReturnInfractionsCount || 0) > 0 ? `
                          <span class="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 border border-rose-300 font-black inline-block shadow-2xs">
                            +${rep.leaveReturnPenaltyMinutes} dk (3x)
                          </span>
                        ` : `
                          <span class="text-slate-300 font-bold">-</span>
                        `}
                      </td>

                      <!-- Takviye Dersi (< 85) -->
                      <td class="p-3 text-center">
                        ${(rep.takviyeInfractionsCount || 0) > 0 ? `
                          <span class="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 border border-rose-300 font-black inline-block shadow-2xs">
                            +${rep.takviyePenaltyMinutes} dk (${rep.takviyeInfractionsCount} Ders)
                          </span>
                        ` : `
                          <span class="text-slate-300 font-bold">-</span>
                        `}
                      </td>

                      <!-- Toplam Kusur Sayısı -->
                      <td class="p-3 text-center">
                        <div class="inline-flex flex-col items-center">
                          <span class="px-2.5 py-1 rounded-xl font-black text-xs inline-block ${
                            hasPenalty ? (isCleared ? 'bg-emerald-600 text-white shadow-2xs' : (isPartiallyCleared ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-rose-600 text-white shadow-2xs')) : (rep.totalInfractions > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold' : 'bg-slate-100 text-slate-500 font-bold')
                          }">
                            ${rep.totalInfractions} Adet
                          </span>
                          ${rep.totalInfractions > 0 ? `
                            <span class="text-[9px] text-emerald-600 font-bold mt-0.5">
                              ${Math.min(3, rep.totalInfractions)} Kusur Affı
                            </span>
                          ` : ''}
                        </div>
                      </td>

                      <!-- Telafi Süresi -->
                      <td class="p-3 text-center">
                        ${isCleared ? `
                          <div class="inline-flex flex-col items-center">
                            <span class="line-through text-slate-400 text-[10px]">+${rep.rawPenaltyFormatted}</span>
                            <span class="font-black text-xs text-emerald-700">0 Dk (Tam Af)</span>
                          </div>
                        ` : (isPartiallyCleared ? `
                          <div class="inline-flex flex-col items-center">
                            <span class="line-through text-slate-400 text-[10px]">+${rep.rawPenaltyFormatted}</span>
                            <span class="font-black text-xs text-indigo-700">+${rep.penaltyFormatted}</span>
                            <span class="text-[9px] text-indigo-600 font-bold">(-${rep.waivedMinutes} dk af)</span>
                          </div>
                        ` : (hasPenalty ? `
                          <span class="font-black text-xs text-rose-700">+${rep.penaltyFormatted}</span>
                        ` : `
                          <span class="text-emerald-700 font-bold text-xs">Telafi Yok</span>
                        `))}
                      </td>

                      <!-- İzin Çıkış Saati -->
                      <td class="p-3 text-center">
                        <div class="inline-block px-3 py-1.5 rounded-xl font-black text-xs shadow-2xs border ${
                          isCleared 
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                            : (isPartiallyCleared
                                ? 'bg-indigo-50 text-indigo-900 border-indigo-300 ring-1 ring-indigo-200'
                                : (rep.hasActivePenalty
                                    ? 'bg-rose-100 text-rose-900 border-rose-300 ring-1 ring-rose-200'
                                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'))
                        }">
                          <div class="text-sm leading-tight">${rep.calculatedExitTime}</div>
                          <div class="text-[9px] font-bold opacity-80 mt-0.5">
                            ${isCleared 
                              ? '✓ Tam Af (Standart Çıkış)' 
                              : (isPartiallyCleared 
                                  ? `✂️ ${rep.waivedMinutes} dk Af (Kalan +${rep.penaltyMinutes} dk)` 
                                  : (rep.hasActivePenalty 
                                      ? `(+${rep.penaltyMinutes} dk ek süre)` 
                                      : (rep.totalInfractions > 0 ? '✓ 3 Kusur Affı' : 'Tam Vaktinde')))}
                          </div>
                        </div>
                      </td>

                      <!-- Telafi Durumu & TV Panosu Onayı -->
                      <td class="p-3 text-center no-print">
                        ${hasPenalty ? `
                          ${isCleared ? `
                            <div class="inline-flex flex-col items-center gap-1">
                              <span class="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-black text-[11px] shadow-xs flex items-center justify-center gap-1">
                                <span>✓</span> <span>Tam Af</span>
                              </span>
                              <div class="flex items-center gap-1 mt-0.5">
                                <button type="button" onclick="window.LeaveTrackerModule.openPartialWaiverModal('${s.id}')"
                                  class="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold transition cursor-pointer"
                                  title="Affı düzenle">
                                  ✏️ Düzenle
                                </button>
                                <button type="button" onclick="window.LeaveTrackerModule.cancelPenaltyWaiver('${s.id}')"
                                  class="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 border border-slate-200 text-[10px] font-bold transition cursor-pointer"
                                  title="Affı tamamen kaldır">
                                  🔄 Geri Al
                                </button>
                              </div>
                              <div class="text-[9px] text-emerald-700 font-bold">TV'den Düşürüldü</div>
                            </div>
                          ` : (isPartiallyCleared ? `
                            <div class="inline-flex flex-col items-center gap-1">
                              <span class="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-900 border border-indigo-300 font-black text-[10px]">
                                ✂️ -${rep.waivedMinutes} dk Af • Kalan: ${rep.penaltyMinutes} dk
                              </span>
                              <div class="flex items-center gap-1 mt-0.5">
                                <button type="button" onclick="window.LeaveTrackerModule.openPartialWaiverModal('${s.id}')"
                                  class="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold transition shadow-2xs cursor-pointer"
                                  title="Affı düzenle">
                                  ✂️ Düzenle
                                </button>
                                <button type="button" onclick="window.LeaveTrackerModule.applyPartialWaiver('${s.id}', ${rep.rawPenaltyMinutes}, 'Tam Af')"
                                  class="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition shadow-2xs cursor-pointer"
                                  title="Kalan telafinin tamamını affet">
                                  ✓ Tam Af
                                </button>
                                <button type="button" onclick="window.LeaveTrackerModule.cancelPenaltyWaiver('${s.id}')"
                                  class="px-1.5 py-0.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 text-[10px] font-bold transition cursor-pointer"
                                  title="Affı kaldır">
                                  ✕
                                </button>
                              </div>
                              <div class="text-[9px] text-rose-600 font-bold">TV'de Kalan ${rep.penaltyMinutes} dk Yayında</div>
                            </div>
                          ` : `
                            <div class="inline-flex flex-col items-center gap-1">
                              <div class="flex items-center gap-1">
                                <button type="button" onclick="window.LeaveTrackerModule.applyPartialWaiver('${s.id}', ${rep.rawPenaltyMinutes}, 'Tam Af')"
                                  class="px-2 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] transition shadow-2xs flex items-center gap-1 cursor-pointer"
                                  title="Talebenin tüm telafisini affet ve TV'den düşür">
                                  <span>✓</span> <span>Tam Af</span>
                                </button>
                                <button type="button" onclick="window.LeaveTrackerModule.openPartialWaiverModal('${s.id}')"
                                  class="px-2 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] transition shadow-2xs flex items-center gap-1 cursor-pointer"
                                  title="Telafinin bir kısmını affet (30 dk, 60 dk vb.)">
                                  <span>✂️</span> <span>Kısmi Af</span>
                                </button>
                              </div>
                              <div class="text-[9px] text-rose-600 font-bold">TV'de Yayında</div>
                            </div>
                          `)}
                        ` : `
                          <span class="text-emerald-700 font-bold text-[11px]">${rep.totalInfractions > 0 ? '✓ Zamanında (Affedildi)' : '✓ Kusursuz'}</span>
                        `}
                      </td>

                      <!-- Kapı Kontrol Butonu (Nöbetçi Hoca / Güvenlik İçin) -->
                      <td class="p-3 text-center no-print">
                        <button type="button" onclick="window.LeaveTrackerModule.toggleGateCheckout('${s.id}')"
                          class="px-3 py-1.5 rounded-xl font-black text-[11px] transition shadow-2xs flex items-center justify-center gap-1.5 mx-auto ${
                            isCheckedOut 
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-300' 
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          }">
                          <span>${isCheckedOut ? '✓ Çıktı' : '⏳ Bekliyor'}</span>
                        </button>
                      </td>

                      <!-- WhatsApp & Detay İşlemleri -->
                      <td class="p-3 text-center no-print">
                        <div class="flex items-center justify-center gap-1">
                          <button type="button" onclick="window.LeaveTrackerModule.sendWhatsAppExitNotice('${s.id}')"
                            class="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="Veliye WhatsApp'tan çıkış saati bildirimi gönder">
                            <span>📲</span>
                            <span class="text-[10px] hidden sm:inline">WhatsApp</span>
                          </button>
                          <button type="button" onclick="window.LeaveTrackerModule.openDetailModal('${s.id}')"
                            class="p-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 font-bold transition shadow-2xs cursor-pointer"
                            title="Kusur dökümü detayını gör">
                            👁️
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 5. ÖĞRENCİ KUSUR DETAY MODALI -->
        ${this.renderStudentDetailModal()}

        <!-- 6. KISMİ / TAM TELAFİ AFFI DÜZENLEME MODALI -->
        ${this.renderPartialWaiverModal()}
      </div>
    `;
  },

  renderStudentDetailModal() {
    if (!this.modalStudentId) return '';
    const student = window.Store.getStudentById(this.modalStudentId);
    if (!student) return '';

    const weekInfo = this.getWeekInfo();
    const rep = window.Store.getLeaveReportForStudent(student.id, weekInfo.dates, this.baseExitTime);

    return `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-fade-in no-print">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-5">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 font-black text-lg flex items-center justify-center shadow-inner">
                ${student.studentNo}
              </div>
              <div>
                <h3 class="font-black text-base text-slate-900">${student.firstName} ${student.lastName}</h3>
                <p class="text-xs text-slate-400">${student.className} • ${student.dahiliHoca || '-'}</p>
              </div>
            </div>
            <button onclick="window.LeaveTrackerModule.closeDetailModal()"
              class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-black transition flex items-center justify-center cursor-pointer">
              ✕
            </button>
          </div>

          <!-- Telafi & Çıkış Kartı (Kısmi Af Uyumlu 4'lü Özet) -->
          <div class="grid grid-cols-4 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <div>
              <div class="text-[9px] font-bold text-slate-400 uppercase">TOPLAM KUSUR</div>
              <div class="text-base font-black text-slate-800 mt-0.5">${rep.totalInfractions} Adet</div>
            </div>
            <div>
              <div class="text-[9px] font-bold text-slate-400 uppercase">HAM TELAFİ</div>
              <div class="text-base font-black text-rose-700 mt-0.5">+${rep.rawPenaltyFormatted}</div>
            </div>
            <div>
              <div class="text-[9px] font-bold text-slate-400 uppercase">AFFEDİLEN</div>
              <div class="text-base font-black text-emerald-700 mt-0.5">-${rep.waivedFormatted}</div>
            </div>
            <div>
              <div class="text-[9px] font-bold text-slate-400 uppercase">KALAN / ÇIKIŞ</div>
              <div class="text-base font-black ${rep.penaltyMinutes > 0 ? 'text-rose-700' : 'text-emerald-700'} mt-0.5">
                ${rep.penaltyMinutes > 0 ? `+${rep.penaltyFormatted}` : '0 Dk'}
              </div>
              <div class="text-[10px] font-bold text-slate-700 mt-0.5">Saat: ${rep.calculatedExitTime}</div>
            </div>
          </div>

          <!-- Kusur Dökümü Listesi -->
          <div>
            <div class="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
              BU HAFTAKİ YOKLAMA KUSURLARI (${rep.infractions.length} Kayıt):
            </div>

            ${rep.infractions.length === 0 ? `
              <div class="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center text-emerald-800 font-bold text-xs">
                🎉 Tebrikler! Bu hafta hiçbir yoklama kusuru bulunmamaktadır. Öğrenci tam vaktinde (${this.baseExitTime}) çıkabilir.
              </div>
            ` : `
              <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
                ${rep.infractions.map(inf => `
                  <div class="p-3 rounded-2xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2.5">
                      <span class="text-lg">${inf.category === 'namaz' ? '🕌' : (inf.category === 'yatak' ? '🛏️' : (inf.category === 'izin_donusu' ? '🧳' : (inf.category === 'takviye_dersi' ? '📚' : '🎒')))}</span>
                      <div>
                        <div class="font-bold text-xs text-slate-800">${inf.subLabel}</div>
                        <div class="text-[10px] text-slate-400">${inf.desc || `${inf.date} • ${inf.dayName}`}</div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded-lg text-white font-black text-[10px]" style="background-color: ${inf.statusBg};">
                        ${inf.statusLabel}
                      </span>
                      <span class="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 font-black text-[10px]">
                        +${inf.penaltyMinutes || 30} Dk
                      </span>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Alt İşlem & Kapat Butonları -->
          <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              ${rep.rawPenaltyMinutes > 0 ? `
                <button type="button" onclick="window.LeaveTrackerModule.applyPartialWaiver('${student.id}', ${rep.rawPenaltyMinutes}, 'Tam Af'); window.LeaveTrackerModule.renderView();"
                  class="px-3 py-2 rounded-xl font-black text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer ${
                    rep.isFullyCleared
                      ? 'bg-slate-200 text-slate-700 hover:bg-rose-100 hover:text-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }">
                  <span>${rep.isFullyCleared ? '✓ Tam Af Uygulandı' : '✓ Tam Af Uygula'}</span>
                </button>
                <button type="button" onclick="window.LeaveTrackerModule.openPartialWaiverModal('${student.id}')"
                  class="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer">
                  <span>✂️</span>
                  <span>Kısmi Af Düzenle</span>
                </button>
              ` : ''}
              <button type="button" onclick="window.LeaveTrackerModule.sendWhatsAppExitNotice('${student.id}')"
                class="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200 font-black text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer">
                <span>📲</span>
                <span>Veliye WhatsApp</span>
              </button>
            </div>
            <button type="button" onclick="window.LeaveTrackerModule.closeDetailModal()"
              class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer">
              Kapat
            </button>
          </div>
        </div>
      </div>
    `;
  },

  renderPartialWaiverModal() {
    if (!this.partialWaiverStudentId) return '';
    const student = window.Store.getStudentById(this.partialWaiverStudentId);
    if (!student) return '';

    const weekInfo = this.getWeekInfo();
    const rep = window.Store.getLeaveReportForStudent(student.id, weekInfo.dates, this.baseExitTime);
    const rawPenalty = rep.rawPenaltyMinutes || 0;
    const waivedMins = rep.waivedMinutes || 0;
    const remainingMins = rep.penaltyMinutes || 0;

    return `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs animate-fade-in no-print">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5">
          <!-- Başlık -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 font-black text-xl flex items-center justify-center shadow-inner">
                ✂️
              </div>
              <div>
                <h3 class="font-black text-base text-slate-900 flex items-center gap-2">
                  <span>Telafi Affı Düzenle</span>
                  ${rep.isPartiallyCleared ? '<span class="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 text-[10px] font-black">Kısmi Af Aktif</span>' : (rep.isFullyCleared ? '<span class="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-black">Tam Af Aktif</span>' : '')}
                </h3>
                <p class="text-xs text-slate-500 font-bold">${student.studentNo} • ${student.firstName} ${student.lastName} (${student.className})</p>
              </div>
            </div>
            <button onclick="window.LeaveTrackerModule.closePartialWaiverModal()"
              class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-black transition flex items-center justify-center cursor-pointer">
              ✕
            </button>
          </div>

          <!-- Mevcut Durum Kartları -->
          <div class="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <div>
              <div class="text-[9px] font-black text-slate-400 uppercase">HAM TELAFİ</div>
              <div class="text-base font-black text-rose-700 mt-0.5">+${rep.rawPenaltyFormatted}</div>
              <div class="text-[9px] text-slate-400">Toplam kusurdan</div>
            </div>
            <div>
              <div class="text-[9px] font-black text-slate-400 uppercase">ŞU AN AFFEDİLEN</div>
              <div class="text-base font-black ${waivedMins > 0 ? 'text-indigo-700' : 'text-slate-400'} mt-0.5">-${rep.waivedFormatted}</div>
              <div class="text-[9px] ${waivedMins > 0 ? 'text-indigo-600 font-bold' : 'text-slate-400'}">${waivedMins > 0 ? 'İndirilen süre' : 'Henüz af yok'}</div>
            </div>
            <div>
              <div class="text-[9px] font-black text-slate-400 uppercase">KALAN / ÇIKIŞ</div>
              <div class="text-base font-black ${remainingMins > 0 ? 'text-rose-700' : 'text-emerald-700'} mt-0.5">
                ${remainingMins > 0 ? `+${rep.penaltyFormatted}` : '0 Dk'}
              </div>
              <div class="text-[10px] font-bold ${remainingMins > 0 ? 'text-slate-700' : 'text-emerald-700'}">Saat: ${rep.calculatedExitTime}</div>
            </div>
          </div>

          <!-- Hızlı Seçenek Butonları -->
          <div class="space-y-2">
            <div class="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>HIZLI AF SEÇENEKLERİ:</span>
              <span class="text-[10px] font-bold text-slate-400">Tek tıkla uygula</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button type="button" onclick="window.LeaveTrackerModule.applyPartialWaiver('${student.id}', 30, '30 dk telafi affı')"
                class="px-3 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-black text-xs transition border border-indigo-200 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer group">
                <span>✂️</span> <span>-30 Dk Af</span>
              </button>

              <button type="button" onclick="window.LeaveTrackerModule.applyPartialWaiver('${student.id}', 60, '1 saat (60 dk) telafi affı')"
                class="px-3 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-black text-xs transition border border-indigo-200 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer group">
                <span>✂️</span> <span>-60 Dk Af (1 Sa)</span>
              </button>

              ${rawPenalty >= 90 ? `
                <button type="button" onclick="window.LeaveTrackerModule.applyPartialWaiver('${student.id}', 90, '90 dk telafi affı')"
                  class="px-3 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-black text-xs transition border border-indigo-200 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer group">
                  <span>✂️</span> <span>-90 Dk Af (1.5 Sa)</span>
                </button>
              ` : `
                <button type="button" onclick="window.LeaveTrackerModule.applyPartialWaiver('${student.id}', 45, '45 dk telafi affı')"
                  class="px-3 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-black text-xs transition border border-indigo-200 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer group">
                  <span>✂️</span> <span>-45 Dk Af</span>
                </button>
              `}

              <!-- Tam Af Butonu -->
              <button type="button" onclick="window.LeaveTrackerModule.applyPartialWaiver('${student.id}', ${rawPenalty}, 'Tüm telafisi affedildi')"
                class="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer">
                <span>✓</span> <span>Tam Af (${rawPenalty} Dk)</span>
              </button>

              <!-- Affı Sıfırla / Kaldır Butonu -->
              <button type="button" onclick="window.LeaveTrackerModule.cancelPenaltyWaiver('${student.id}')"
                class="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 border border-slate-200 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer sm:col-span-2">
                <span>🔄</span> <span>Affı İptal Et (Sıfırla)</span>
              </button>
            </div>
          </div>

          <!-- Özel Dakika Girme Alanı -->
          <div class="space-y-2 pt-2 border-t border-slate-100">
            <div class="text-[11px] font-black uppercase tracking-wider text-slate-500">
              VEYA İSTEDİĞİNİZ DAKİKAYI YAZIN:
            </div>
            <div class="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <div class="relative w-36">
                <input type="number" id="partial-waiver-custom-mins" min="5" max="${Math.max(rawPenalty, 600)}" step="5"
                  value="${waivedMins > 0 ? waivedMins : 30}"
                  placeholder="Dakika"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-black text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <span class="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">Dk</span>
              </div>
              <input type="text" id="partial-waiver-custom-note" 
                value="${rep.clearedNote || ''}"
                placeholder="İsteğe bağlı açıklama / af sebebi..."
                class="flex-1 min-w-[160px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <button type="button" onclick="window.LeaveTrackerModule.submitCustomWaiver('${student.id}')"
                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition shadow cursor-pointer shrink-0">
                Kaydet
              </button>
            </div>
            <p class="text-[10px] text-slate-400 leading-tight">
              💡 Girilen dakika toplam telafiden düşülür. Kalan süre TV Panosunda güncel çıkış saati ile yayınlanmaya devam eder. Tamamı affedilirse öğrenci TV panosundan kendiliğinden düşer.
            </p>
          </div>

          <!-- Kapat Butonu -->
          <div class="pt-3 border-t border-slate-100 flex justify-end">
            <button type="button" onclick="window.LeaveTrackerModule.closePartialWaiverModal()"
              class="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer">
              Kapat
            </button>
          </div>
        </div>
      </div>
    `;
  }
};
