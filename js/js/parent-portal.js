/**
 * parent-portal.js - Kardeş Destekli Veli Portalı (Salt Okunur)
 * - Haftalık & Aylık Namaz Yoklama Raporu (5 Vakit İnceleme)
 * - Günlük Yoklama Geçmişi
 * - Takviye Ders Notları (100 Üzerinden)
 * - Genel Gelişim & Öğretmen Görüşleri
 */

window.ParentPortal = {
  activeStudentId: null,
  prayerReportPeriod: 'haftalik', // 'haftalik' | 'aylik'
  prayerReportDate: new Date().toISOString().split('T')[0],

  init() {
    const session = window.App.currentSession;
    if (!session || session.role !== 'parent') {
      this.renderLoginNotice();
      return;
    }

    if (session.students && session.students.length > 0) {
      if (!this.activeStudentId || !session.students.find(s => s.id === this.activeStudentId)) {
        this.activeStudentId = session.students[0].id;
      }
      this.renderPortalDashboard();
    } else {
      this.renderLoginNotice();
    }
  },

  renderLoginNotice() {
    const container = document.getElementById('parent-portal-container');
    if (!container) return;
    container.innerHTML = `
      <div class="max-w-md mx-auto py-12 text-center">
        <div class="p-6 bg-white rounded-3xl shadow border border-slate-200">
          <p class="text-sm text-slate-600 mb-4">Veli portalına erişebilmek için lütfen Aile Kodunuz veya Öğrenci Adı Soyadı ile giriş yapınız.</p>
          <button onclick="window.App.logout()" class="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs">Giriş Ekranına Dön</button>
        </div>
      </div>
    `;
  },

  selectStudent(studentId) {
    this.activeStudentId = studentId;
    this.renderPortalDashboard();
  },

  isPasswordModalOpen: false,

  openPasswordModal() {
    this.isPasswordModalOpen = true;
    this.renderPortalDashboard();
  },

  closePasswordModal() {
    this.isPasswordModalOpen = false;
    this.renderPortalDashboard();
  },

  handlePasswordChange(event) {
    if (event) event.preventDefault();
    const newPassInput = document.getElementById('parent-new-password');
    const newPassConfirm = document.getElementById('parent-confirm-password');
    if (!newPassInput || !newPassConfirm) return;

    const p1 = newPassInput.value.trim();
    const p2 = newPassConfirm.value.trim();

    if (!p1 || p1.length < 3) {
      if (window.App && window.App.showToast) {
        window.App.showToast('Yeni şifre en az 3 karakter olmalıdır.', 'warning');
      }
      return;
    }

    if (p1 !== p2) {
      if (window.App && window.App.showToast) {
        window.App.showToast('Girdiğiniz şifreler birbiriyle uyuşmuyor!', 'error');
      }
      return;
    }

    const session = window.App.currentSession;
    const currentStudent = (session.students || []).find(s => s.id === this.activeStudentId) || (session.students && session.students[0]);

    if (!currentStudent) return;

    const res = window.Store.updateStudentPassword(currentStudent.id, p1);

    if (res.success) {
      currentStudent.password = p1;
      if (session.students) {
        session.students.forEach(s => {
          if (s.id === currentStudent.id || s.familyCode === currentStudent.familyCode) {
            s.password = p1;
          }
        });
        sessionStorage.setItem('yoklama_active_session', JSON.stringify(session));
        localStorage.setItem('yoklama_active_session', JSON.stringify(session));
      }

      this.isPasswordModalOpen = false;
      this.renderPortalDashboard();

      if (window.App && window.App.showToast) {
        window.App.showToast(`Şifreniz başarıyla değiştirildi! Yeni şifreniz: ${p1}`, 'success');
      }
    }
  },

  setPrayerReportPeriod(period) {
    this.prayerReportPeriod = period;
    this.renderPortalDashboard();
  },

  setPrayerReportDate(date) {
    this.prayerReportDate = date;
    this.renderPortalDashboard();
  },

  getDayName(dateStr) {
    if (!dateStr) return '';
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3) return '';
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return days[d.getDay()] || '';
  },

  getRateColor(rate) {
    if (rate >= 90) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (rate >= 75) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-rose-100 text-rose-800 border-rose-300';
  },

  renderPortalDashboard() {
    const container = document.getElementById('parent-portal-container');
    if (!container) return;

    const session = window.App.currentSession;
    const students = session.students || [];
    const currentStudent = students.find(s => s.id === this.activeStudentId) || students[0];

    if (!currentStudent) {
      this.renderLoginNotice();
      return;
    }

    const stats = window.Store.getStudentStats(currentStudent.id);
    const attendanceRecords = window.Store.getAttendanceForStudent(currentStudent.id);
    const academicScores = window.Store.getAcademicScoresForStudent ? window.Store.getAcademicScoresForStudent(currentStudent.id) : [];
    const testResults = window.Store.getStudentTestResults ? window.Store.getStudentTestResults(currentStudent.id) : [];
    const acadAvg = academicScores.length > 0
      ? Math.round(academicScores.reduce((sum, a) => sum + (Number(a.score) || 0), 0) / academicScores.length)
      : 0;

    // Çocuğun Haftalık / Aylık Namaz Raporunu Hesapla
    const isWeekly = this.prayerReportPeriod === 'haftalik';
    const reportRange = isWeekly 
      ? window.Store.getWeekRange(this.prayerReportDate)
      : window.Store.getMonthRange(this.prayerReportDate.substring(0, 7));

    const prayerRep = window.Store.getPrayerReportForStudent 
      ? window.Store.getPrayerReportForStudent(currentStudent.id, reportRange.dates)
      : null;

    // Hafta Sonu İzin Çıkış Raporu Hesabı (Bu Hafta)
    const thisWeekRange = window.Store.getWeekRange(new Date().toISOString().split('T')[0]);
    const baseExitTime = localStorage.getItem('yoklama_base_exit_time') || '13:00';
    const leaveRep = window.Store.getLeaveReportForStudent
      ? window.Store.getLeaveReportForStudent(currentStudent.id, thisWeekRange.dates, baseExitTime)
      : null;

    // Haftalık Puan ve Liderlik Sıralaması
    const classLeaderboard = window.Store.getLeaderboard 
      ? window.Store.getLeaderboard('haftalik', new Date().toISOString().split('T')[0], currentStudent.className) 
      : null;
    const studentRankItem = classLeaderboard 
      ? classLeaderboard.ranking.find(r => r.student.id === currentStudent.id) 
      : null;

    const prayers = ['Sabah', 'Öğle', 'İkindi', 'Akşam', 'Yatsı'];
    const periodLabel = isWeekly 
      ? `Haftalık (${reportRange.startDate} – ${reportRange.endDate})`
      : `Aylık (${reportRange.startDate} – ${reportRange.endDate})`;
    const settings = window.Store.getSettings ? window.Store.getSettings() : {};

    container.innerHTML = `
      <div class="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <!-- Veli Başlığı & Kardeş Sekmeleri -->
        <div class="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-4">
              ${settings.institutionLogo ? `
                <div class="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0 bg-white shadow-md p-1 border border-white/30">
                  <img src="${settings.institutionLogo}" alt="Logo" class="max-w-full max-h-full object-contain"
                    onerror="if (window.App) { window.App.handleLogoError(this); } else { this.parentElement.style.display='none'; }">
                </div>
              ` : ''}
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold">
                    AİLE KODU: ${session.familyCode}
                  </span>
                  <span class="text-xs text-indigo-200">| ${settings.institutionName || 'Veli Bilgilendirme Portalı'}</span>
                </div>
                <h2 class="text-2xl font-black tracking-tight">Öğrenci Bilgilendirme Portalı</h2>
                <p class="text-xs text-indigo-200 mt-1">
                  Bu alanda yalnızca çocuğunuza ait namaz raporu, devam durumu ve takviye ders notlarını salt okunur olarak inceleyebilirsiniz.
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 no-print">
              <button onclick="window.ParentPortal.openPasswordModal()" 
                class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5">
                <span>🔑 Şifremi Değiştir</span>
              </button>
              <button onclick="window.print()" 
                class="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 flex items-center gap-2 transition">
                <span>🖨️ Rapor Yazdır</span>
              </button>
              <button onclick="window.App.logout()" 
                class="px-4 py-2 bg-rose-500/80 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition">
                Çıkış Yap
              </button>
            </div>
          </div>

          <!-- KARDEŞ SEKMELERİ -->
          ${students.length > 1 ? `
            <div class="mt-6 pt-5 border-t border-white/15 no-print">
              <div class="text-xs font-bold uppercase tracking-wider text-indigo-200 mb-2 flex items-center gap-1.5">
                <span>👨‍👧‍👦 AİLEDEKİ ÇOCUKLARINIZ (${students.length} Kardeş):</span>
                <span class="text-[10px] text-indigo-300 font-normal">(Görüntülemek istediğiniz çocuğunuzu seçiniz)</span>
              </div>
              <div class="flex flex-wrap gap-2.5">
                ${students.map(s => {
                  const isCurrent = s.id === currentStudent.id;
                  return `
                    <button onclick="window.ParentPortal.selectStudent('${s.id}')"
                      class="px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                        isCurrent 
                          ? 'bg-white text-indigo-900 shadow-md scale-105' 
                          : 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
                      }">
                      <span class="w-2.5 h-2.5 rounded-full ${isCurrent ? 'bg-indigo-600' : 'bg-white/60'}"></span>
                      <span>${s.firstName} ${s.lastName}</span>
                      <span class="text-[11px] opacity-75">(${s.className} - No: ${s.studentNo})</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Öğrenci Künyesi -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-6">
          <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-indigo-700 font-black text-xl flex items-center justify-center">
                ${currentStudent.firstName[0]}${currentStudent.lastName[0]}
              </div>
              <div>
                <h3 class="text-xl font-black text-slate-900">${currentStudent.firstName} ${currentStudent.lastName}</h3>
                <div class="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 font-medium mt-1">
                  <span>No: <strong class="text-slate-800">${currentStudent.studentNo}</strong></span>
                  <span>•</span>
                  <span>Sınıfı: <strong class="text-slate-800">${currentStudent.className}</strong></span>
                  <span>•</span>
                  <span>Etüt Hocası: <strong class="text-slate-800">${currentStudent.etutHocasi || '-'}</strong></span>
                  <span>•</span>
                  <span>Dahili Hoca: <strong class="text-slate-800">${currentStudent.dahiliHoca || '-'}</strong></span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <div class="px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <div class="text-[10px] font-bold text-emerald-700 uppercase">Toplam Devam</div>
                <div class="text-xl font-black text-emerald-800">%${stats.attendanceRate}</div>
              </div>
              <div class="px-4 py-2 rounded-2xl bg-blue-50 border border-blue-200 text-center">
                <div class="text-[10px] font-bold text-blue-700 uppercase">Akademi Ortalaması</div>
                <div class="text-xl font-black text-blue-800">${acadAvg > 0 ? acadAvg + ' Puan' : 'Girilmedi'}</div>
              </div>
            </div>
          </div>

          <!-- 5 Yoklama Durumu İstatistiği -->
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-4">
            ${['VAR', 'YOK', 'GEC', 'TAKKESIZ', 'IZINLI'].map(code => {
              const cfg = window.STATUS_CONFIG[code] || window.STATUS_CONFIG['VAR'];
              const count = stats.counts[code] || 0;
              return `
                <div class="p-2.5 rounded-2xl border flex flex-col items-center justify-center text-center" 
                  style="background-color: ${cfg.bg}10; border-color: ${cfg.border}30;">
                  <span class="px-2.5 py-0.5 rounded-lg text-white font-black text-xs flex items-center justify-center mb-1" 
                    style="background-color: ${cfg.bg};">
                    ${cfg.label}
                  </span>
                  <span class="text-sm font-black text-slate-900">${count} Vakit</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 🏆 HAFTALIK BAŞARI VE YARIŞMA DERECESİ KARTI -->
        ${studentRankItem ? `
          <div class="rounded-3xl p-5 sm:p-6 border shadow-sm ${
            studentRankItem.rank === 1 
              ? 'bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-yellow-500/10 border-amber-300' 
              : (studentRankItem.rank <= 3 ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200')
          }">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${
                  studentRankItem.rank === 1 
                    ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-white shadow-amber-200' 
                    : (studentRankItem.rank === 2 ? 'bg-slate-300 text-slate-800' : (studentRankItem.rank === 3 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-700'))
                }">
                  ${studentRankItem.rank === 1 ? '🏆' : (studentRankItem.rank === 2 ? '🥈' : (studentRankItem.rank === 3 ? '🥉' : '⭐'))}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-black uppercase tracking-wider ${
                      studentRankItem.rank === 1 ? 'text-amber-800' : 'text-slate-700'
                    }">
                      HAFTANIN TALEBESİ SIRALAMASI (${thisWeekRange.startDate} – ${thisWeekRange.endDate})
                    </span>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                      studentRankItem.rank === 1 
                        ? 'bg-amber-400 text-amber-950 animate-pulse' 
                        : (studentRankItem.rank <= 3 ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-800')
                    }">
                      ${studentRankItem.rank === 1 ? '🌟 1. SIRA (ŞAMPİYON)' : `${studentRankItem.rank}. Sırada`}
                    </span>
                  </div>
                  <h3 class="text-base sm:text-lg font-black text-slate-900 mt-1">
                    ${studentRankItem.rank === 1 
                      ? `Tebrikler! Çocuğunuz bu hafta ${currentStudent.className} 1. sırada yer alarak Haftanın Talebesi seçilmiştir! 🏆` 
                      : (studentRankItem.rank <= 3 
                        ? `Tebrikler! Çocuğunuz bu hafta sınıfında ${studentRankItem.rank}. sırada yer alarak dereceye girmiştir!` 
                        : `Çocuğunuz bu hafta toplam ${studentRankItem.totalScore} başarı puanı toplamıştır.`)}
                  </h3>
                  <div class="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                    <span>🕌 Namaz: <strong>${studentRankItem.namaz.points} Puan</strong></span>
                    <span>•</span>
                    <span>🛏️ Yatak: <strong>${studentRankItem.yatak.points} Puan</strong></span>
                    <span>•</span>
                    <span>🎒 Okul: <strong>${studentRankItem.okul.points} Puan</strong></span>
                    <span>•</span>
                    <span>📚 Akademi: <strong>${studentRankItem.akademi.points} Puan</strong></span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <div class="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-center shadow-2xs">
                  <div class="text-[9px] font-black text-slate-400 uppercase">HAFTALIK PUAN</div>
                  <div class="text-xl font-black text-amber-600">${studentRankItem.totalScore}</div>
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- 🚪 HAFTA SONU İZİN VE ÇIKIŞ SAATİ BİLGİLENDİRMESİ -->
        ${leaveRep ? `
          <div class="rounded-3xl p-5 sm:p-6 border shadow-sm ${
            leaveRep.totalInfractions === 0 
              ? 'bg-emerald-50/80 border-emerald-200' 
              : 'bg-rose-50/70 border-rose-200'
          }">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${
                  leaveRep.totalInfractions === 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                }">
                  🚪
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-black uppercase tracking-wider ${
                      leaveRep.totalInfractions === 0 ? 'text-emerald-800' : 'text-rose-800'
                    }">
                      HAFTA SONU İZNE ÇIKIŞ BİLGİSİ (${thisWeekRange.startDate} – ${thisWeekRange.endDate})
                    </span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${
                      leaveRep.totalInfractions === 0 ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                    }">
                      ${leaveRep.totalInfractions === 0 ? 'Tam Zamanında' : `+${leaveRep.penaltyFormatted} Gecikmeli`}
                    </span>
                  </div>
                  <h3 class="text-xl font-black text-slate-900 mt-1">
                    İzin Çıkış Saati: <span class="${leaveRep.totalInfractions === 0 ? 'text-emerald-700' : 'text-rose-700'}">${leaveRep.calculatedExitTime}</span>
                  </h3>
                  <p class="text-xs text-slate-600 mt-1 max-w-2xl">
                    ${leaveRep.totalInfractions === 0 
                      ? `Tebrikler! Çocuğunuz hafta boyunca tüm namaz, yatak ve okul dönüşü yoklamalarına eksiksiz uyduğu için hafta sonu iznine standart saat olan <strong>${baseExitTime}</strong>'da gecikme olmaksızın çıkabilecektir.`
                      : `Bilgilendirme: Çocuğunuzun bu hafta <strong>${leaveRep.totalInfractions} adet yoklama kusuru</strong> (Namaz: ${leaveRep.namazInfractionsCount}, Yatak: ${leaveRep.yatakInfractionsCount}, Okul Dönüşü: ${leaveRep.okulInfractionsCount}) bulunmaktadır. Kurum kuralları gereği işaret başı 30 dakika geç çıkış kuralı uygulanarak standart saat olan ${baseExitTime} yerine <strong>${leaveRep.calculatedExitTime}'da</strong> izne ayrılacaktır.`
                    }
                  </p>
                </div>
              </div>

              <!-- İstatistik Kutucukları -->
              <div class="flex items-center gap-2">
                <div class="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-center shadow-2xs">
                  <div class="text-[9px] font-black text-slate-400 uppercase">KUSUR SAYISI</div>
                  <div class="text-base font-black ${leaveRep.totalInfractions === 0 ? 'text-emerald-700' : 'text-rose-700'}">
                    ${leaveRep.totalInfractions} Adet
                  </div>
                </div>
                <div class="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-center shadow-2xs">
                  <div class="text-[9px] font-black text-slate-400 uppercase">GECİKME</div>
                  <div class="text-base font-black ${leaveRep.totalInfractions === 0 ? 'text-emerald-700' : 'text-rose-700'}">
                    +${leaveRep.penaltyMinutes} dk
                  </div>
                </div>
              </div>
            </div>

            <!-- Varsa Kusurların Dökümü -->
            ${leaveRep.infractions.length > 0 ? `
              <div class="mt-4 pt-4 border-t border-rose-200/60">
                <div class="text-[11px] font-black uppercase tracking-wider text-rose-800 mb-2">
                  GECİKME SEBEBİ OLAN YOKLAMA KAYITLARI:
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  ${leaveRep.infractions.map(inf => `
                    <div class="p-2.5 bg-white rounded-xl border border-rose-200/80 text-xs flex items-center justify-between shadow-2xs">
                      <div>
                        <div class="font-bold text-slate-800">${inf.categoryLabel}</div>
                        <div class="text-[10px] text-slate-400">${inf.date} • ${inf.subLabel}</div>
                      </div>
                      <span class="px-2 py-0.5 rounded-lg text-white font-black text-[10px]" style="background-color: ${inf.statusBg};">
                        ${inf.statusLabel} (+30 dk)
                      </span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- 🕌 1. ÇOCUĞUNUZUN HAFTALIK & AYLIK NAMAZ RAPORU (5 VAKİT DETAYI) -->
        ${prayerRep ? `
          <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-5">
            <!-- Başlık ve Periyot Seçimi -->
            <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center shadow-sm">
                  🕌
                </div>
                <div>
                  <h3 class="font-black text-base text-slate-900">Namaz Devam ve Katılım Raporu</h3>
                  <p class="text-xs text-slate-400 mt-0.5">Çocuğunuzun 5 vakit namaz devam durumu (${periodLabel})</p>
                </div>
              </div>

              <!-- Hafta / Ay Toggle & Tarih -->
              <div class="flex flex-wrap items-center gap-2">
                <div class="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 gap-1 shadow-inner">
                  <button type="button" onclick="window.ParentPortal.setPrayerReportPeriod('haftalik')"
                    class="py-1 px-3 rounded-lg text-xs font-black transition ${
                      isWeekly 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }">
                    📅 Bu Hafta
                  </button>
                  <button type="button" onclick="window.ParentPortal.setPrayerReportPeriod('aylik')"
                    class="py-1 px-3 rounded-lg text-xs font-black transition ${
                      !isWeekly 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }">
                    🗓️ Bu Ay
                  </button>
                </div>

                <input type="date" value="${this.prayerReportDate}"
                  class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                  onchange="window.ParentPortal.setPrayerReportDate(this.value)">
              </div>
            </div>

            <!-- Vakit Bazlı Kartlar & Yüzdeler -->
            <div class="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <!-- Toplam Başarı -->
              <div class="col-span-2 sm:col-span-1 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-4 text-white flex flex-col justify-between shadow-sm">
                <span class="text-[10px] font-bold uppercase text-emerald-100">DEVAM ORANI</span>
                <div class="text-3xl font-black mt-1">%${prayerRep.attendanceRate}</div>
                <span class="text-[10px] text-emerald-100 mt-1">${prayerRep.attendedCount} / ${prayerRep.totalSlots} Vakit</span>
              </div>

              <!-- 5 Vakit Dağılımı -->
              ${prayers.map(p => {
                const pData = prayerRep.prayerStats[p];
                const attended = pData.VAR + pData.TAKKESIZ + pData.GEC;
                const totalDay = reportRange.dates.length - pData.IZINLI;
                const pRate = totalDay > 0 ? Math.round((attended / totalDay) * 100) : 100;
                const icon = p === 'Sabah' ? '🌅' : (p === 'Öğle' ? '☀️' : (p === 'İkindi' ? '🌤️' : (p === 'Akşam' ? '🌇' : '🌙')));
                return `
                  <div class="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center flex flex-col justify-between">
                    <div>
                      <div class="text-base">${icon}</div>
                      <div class="text-[11px] font-black text-slate-700 mt-0.5">${p}</div>
                    </div>
                    <div class="mt-2">
                      <div class="text-sm font-black text-emerald-700">%${pRate}</div>
                      <div class="text-[10px] text-slate-400 font-bold">${attended} / ${totalDay} Vakit</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Gün Gün 5 Vakit Namaz Durumu Çizelgesi -->
            <div class="rounded-2xl border border-slate-200 overflow-hidden">
              <div class="p-3 bg-slate-50 border-b border-slate-200 font-black text-xs text-slate-700 flex items-center justify-between">
                <span>🗓️ Günlük 5 Vakit Namaz Katılım Detayı</span>
                <span class="text-[11px] text-slate-400 font-normal">Yeşil: Kılındı • Mor: Takkesiz • Kırmızı: Yok</span>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs min-w-[500px]">
                  <thead>
                    <tr class="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <th class="p-2.5 font-black">TARİH & GÜN</th>
                      ${prayers.map(p => `<th class="p-2.5 text-center font-black">${p}</th>`).join('')}
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${reportRange.dates.map(dStr => {
                      const dayName = this.getDayName(dStr);
                      return `
                        <tr class="hover:bg-slate-50/60">
                          <td class="p-2.5 font-bold text-slate-800">
                            <div>${dStr}</div>
                            <div class="text-[10px] text-slate-400 font-medium">${dayName}</div>
                          </td>
                          ${prayers.map(p => {
                            const stCode = prayerRep.grid[dStr] ? prayerRep.grid[dStr][p] : 'VAR';
                            const cfg = window.STATUS_CONFIG[stCode] || window.STATUS_CONFIG['VAR'];
                            return `
                              <td class="p-2 text-center">
                                <span class="px-2 py-1 rounded-lg text-white font-black text-[10px] inline-block shadow-2xs"
                                  style="background-color: ${cfg.bg};">
                                  ${cfg.label}
                                </span>
                              </td>
                            `;
                          }).join('')}
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Detaylar: Takviye Ders Notları (Akademi) -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-6">
          <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 text-lg font-black flex items-center justify-center shadow-xs">
                📚
              </div>
              <div>
                <h4 class="font-black text-slate-900 text-sm">Takviye Ders Notları (100 Üzerinden)</h4>
                <p class="text-[11px] text-slate-400">Öğrencinin branş dersleri ve takviye sınav başarı durumu</p>
              </div>
            </div>
            <span class="text-xs font-black bg-blue-100 text-blue-900 border border-blue-200 px-3 py-1 rounded-full">
              Akademi
            </span>
          </div>
          
          ${academicScores.length === 0 ? `
            <div class="py-8 text-center text-slate-400 text-xs">
              Henüz takviye ders puanı girilmemiştir.
            </div>
          ` : `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              ${academicScores.map(a => {
                let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                let label = 'Pekiyi 🌟';
                if (a.score < 85) { 
                  badgeClass = 'bg-rose-100 text-rose-800 border-rose-300 font-black'; 
                  label = '85 Altı ⚠️'; 
                } else if (a.score >= 100) { 
                  badgeClass = 'bg-emerald-600 text-white border-emerald-700 font-black shadow-xs'; 
                  label = '100 Tam 🌟'; 
                } else if (a.score >= 95) { 
                  badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'; 
                  label = 'Pekiyi 🌟'; 
                } else if (a.score >= 90) { 
                  badgeClass = 'bg-lime-100 text-lime-800 border-lime-300 font-bold'; 
                  label = 'Çok İyi 👍'; 
                } else { 
                  badgeClass = 'bg-amber-100 text-amber-800 border-amber-300 font-bold'; 
                  label = 'İyi ⚡'; 
                }
                return `
                  <div class="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-xs transition flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2.5">
                      <span class="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 font-bold text-sm flex items-center justify-center">
                        ${a.subject === 'Türkçe' ? '🇹🇷' : (a.subject === 'Matematik' ? '📐' : (a.subject === 'Fen Bilimleri' ? '🔬' : (a.subject === 'Sosyal Bilgiler' ? '🌍' : '🇬🇧')))}
                      </span>
                      <div>
                        <div class="font-bold text-xs text-slate-800">${a.subject}</div>
                        <div class="text-[10px] text-slate-400 font-medium">${a.date}</div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] px-2 py-0.5 rounded-full font-bold border ${badgeClass}">${label}</span>
                      <span class="px-2.5 py-1 rounded-xl bg-slate-900 text-white font-black text-xs">
                        ${a.score} / 100
                      </span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Detaylar: Etüt Test Neticeleri & Soru Takibi -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-6">
          <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 text-lg font-black flex items-center justify-center shadow-xs">
                📝
              </div>
              <div>
                <h4 class="font-black text-slate-900 text-sm">Etüt Test Neticeleri & Soru Takibi</h4>
                <p class="text-[11px] text-slate-400">Çözülen testlerin doğru, yanlış, net ve 100 üzerinden başarı notları</p>
              </div>
            </div>
            <span class="text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-200 px-3 py-1 rounded-full">
              ${testResults.length} Test
            </span>
          </div>

          ${testResults.length === 0 ? `
            <div class="text-center py-6 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Henüz girilmiş bir test veya soru çözümü neticesi bulunmuyor.
            </div>
          ` : `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${testResults.map(t => {
                let badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
                let label = 'Gayret Etmeli';
                if (t.score >= 85) {
                  badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                  label = 'Pekiyi';
                } else if (t.score >= 70) {
                  badgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
                  label = 'İyi';
                } else if (t.score >= 50) {
                  badgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
                  label = 'Orta';
                }

                return `
                  <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-xs transition space-y-2.5">
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 font-black text-[10px] uppercase">
                          ${t.subject}
                        </span>
                        <span class="font-black text-xs text-slate-900 line-clamp-1">${t.title}</span>
                      </div>
                      <span class="text-[10px] text-slate-400 font-bold font-mono">${t.date}</span>
                    </div>

                    ${t.unit || t.topic ? `
                      <div class="text-[11px] text-slate-500">
                        ${t.unit ? `<span class="font-bold text-slate-700">${t.unit}</span>` : ''}
                        ${t.topic ? ` • <span>${t.topic}</span>` : ''}
                      </div>
                    ` : ''}

                    <div class="grid grid-cols-4 gap-1.5 bg-white p-2 rounded-xl border border-slate-100 text-center text-xs">
                      <div>
                        <div class="text-[9px] text-slate-400 font-bold">TOPLAM</div>
                        <div class="font-black text-slate-700">${t.totalQuestions}</div>
                      </div>
                      <div>
                        <div class="text-[9px] text-emerald-600 font-bold">DOĞRU</div>
                        <div class="font-black text-emerald-700">${t.correct}</div>
                      </div>
                      <div>
                        <div class="text-[9px] text-rose-600 font-bold">YANLIŞ</div>
                        <div class="font-black text-rose-700">${t.wrong}</div>
                      </div>
                      <div>
                        <div class="text-[9px] text-blue-600 font-bold">NET</div>
                        <div class="font-black text-blue-700 font-mono">${Number(t.net || 0).toFixed(1)}</div>
                      </div>
                    </div>

                    <div class="flex items-center justify-between pt-1 text-xs">
                      <span class="text-[10px] px-2 py-0.5 rounded-full font-bold border ${badgeClass}">
                        ${label}
                      </span>
                      <span class="px-2.5 py-1 rounded-xl bg-slate-900 text-white font-black text-xs">
                        ${t.score} / 100 Puan
                      </span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- VELİ ŞİFRE DEĞİŞTİRME MODALI -->
        ${this.isPasswordModalOpen ? `
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-fade-in no-print">
            <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-slate-800">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 text-xl font-black flex items-center justify-center shadow-inner">
                    🔑
                  </div>
                  <div>
                    <h3 class="font-black text-base text-slate-900">Veli Giriş Şifresi Değiştir</h3>
                    <p class="text-xs text-slate-400">Aile Kodu: <strong>${session.familyCode}</strong></p>
                  </div>
                </div>
                <button onclick="window.ParentPortal.closePasswordModal()" 
                  class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-black transition flex items-center justify-center">
                  ✕
                </button>
              </div>

              <div class="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-100 text-xs text-indigo-900 flex items-center justify-between">
                <span>Mevcut Şifreniz:</span>
                <strong class="font-mono bg-white px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-950">${currentStudent.password || '123'}</strong>
              </div>

              <form onsubmit="window.ParentPortal.handlePasswordChange(event)" class="space-y-3.5">
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">YENİ ŞİFRE</label>
                  <input type="text" id="parent-new-password" required placeholder="Yeni şifrenizi giriniz (en az 3 karakter)"
                    class="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600">
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">YENİ ŞİFRE (TEKRAR)</label>
                  <input type="text" id="parent-confirm-password" required placeholder="Yeni şifrenizi tekrar giriniz"
                    class="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600">
                </div>

                <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500">
                  ℹ️ Not: Şifrenizi değiştirdiğinizde varsa kardeşleriniz için de yeni şifre geçerli olacaktır.
                </div>

                <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button type="button" onclick="window.ParentPortal.closePasswordModal()" 
                    class="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
                    Vazgeç
                  </button>
                  <button type="submit" 
                    class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition">
                    Şifremi Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
};
