/**
 * leaderboard.js - Haftanın ve Ayın Talebesi & Puanlama Liderlik Modülü
 * - 5 Vakit Namaz, Yatak Düzeni, Okul Dönüşü, İzin Dönüşü, Takviye Ders Notları ve Hoca Takdir Puanlarını birleştirir.
 * - Altın, Gümüş ve Bronz Şampiyonlar Podyumu (1., 2. ve 3. Sıra)
 * - Genel ve Sınıf Bazlı (5, 6, 7, 8. Sınıf) Şampiyonluk Filtresi
 * - Şeffaf Puan Detay Modalı (Nereden kaç puan kazandı)
 * - Hoca Takdir / Ekstra Bonus Puan Verme Modalı
 * - Tek Tıkla Yazdırılabilir Resmi "Haftanın / Ayın Talebesi Başarı ve Onur Belgesi"
 */

window.LeaderboardModule = {
  period: 'haftalik', // 'haftalik' | 'aylik'
  targetDate: new Date().toISOString().split('T')[0],
  classFilter: 'ALL', // 'ALL' | '5. Sınıf' | '6. Sınıf' | '7. Sınıf' | '8. Sınıf'
  searchQuery: '',
  detailStudentId: null,
  bonusModalStudentId: null,
  certModalData: null, // { student, rank, periodLabel, totalScore }

  classes: ['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'],

  init() {
    this.renderView();
  },

  setPeriod(period) {
    this.period = period;
    this.renderView();
  },

  setTargetDate(dateStr) {
    if (!dateStr) return;
    this.targetDate = dateStr;
    this.renderView();
  },

  setToday() {
    this.targetDate = new Date().toISOString().split('T')[0];
    this.renderView();
  },

  prevPeriod() {
    const d = new Date(this.targetDate);
    if (this.period === 'haftalik') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    this.targetDate = d.toISOString().split('T')[0];
    this.renderView();
  },

  nextPeriod() {
    const d = new Date(this.targetDate);
    if (this.period === 'haftalik') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    this.targetDate = d.toISOString().split('T')[0];
    this.renderView();
  },

  setClassFilter(className) {
    this.classFilter = className;
    this.renderView();
  },

  setSearchQuery(q) {
    this.searchQuery = (q || '').toLowerCase().trim();
    this.renderLeaderboardTable();
  },

  openDetail(studentId) {
    this.detailStudentId = studentId;
    this.renderView();
  },

  closeDetail() {
    this.detailStudentId = null;
    this.renderView();
  },

  openBonusModal(studentId) {
    this.bonusModalStudentId = studentId;
    this.renderView();
  },

  closeBonusModal() {
    this.bonusModalStudentId = null;
    this.renderView();
  },

  saveBonusPoint(e) {
    e.preventDefault();
    if (!this.bonusModalStudentId) return;

    const points = parseInt(document.getElementById('bonus-pts-input').value, 10) || 10;
    const reason = document.getElementById('bonus-reason-input').value.trim() || 'Örnek Gayret & Ahlak';
    const hocaName = window.App?.currentSession?.user?.fullName || 'Eğitmen';
    const date = this.targetDate;

    window.Store.addBonusPoint(this.bonusModalStudentId, points, reason, hocaName, date);

    if (window.App && window.App.showToast) {
      window.App.showToast(`+${points} takdir puanı başarıyla eklendi!`, 'success');
    }

    this.closeBonusModal();
  },

  deleteBonus(id) {
    if (!confirm('Bu takdir puanını silmek istediğinize emin misiniz?')) return;
    window.Store.deleteBonusPoint(id);
    if (window.App && window.App.showToast) {
      window.App.showToast('Takdir puanı silindi.', 'info');
    }
    this.renderView();
  },

  openCertificate(studentId, rank) {
    const students = window.Store.getStudents();
    const st = students.find(s => s.id === studentId);
    if (!st) return;

    const data = window.Store.getLeaderboard(this.period, this.targetDate, this.classFilter);
    const item = data.ranking.find(r => r.student.id === studentId);
    const periodTitle = this.period === 'haftalik'
      ? `Haftalık Dönem (${data.startDate} – ${data.endDate})`
      : `Aylık Dönem (${data.startDate} – ${data.endDate})`;

    this.certModalData = {
      student: st,
      rank: rank || item?.rank || 1,
      periodLabel: periodTitle,
      periodType: this.period === 'haftalik' ? 'HAFTANIN TALEBESİ' : 'AYIN TALEBESİ',
      totalScore: item?.totalScore || 0,
      className: st.className,
      dateStr: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    };
    this.renderView();
  },

  closeCertificate() {
    this.certModalData = null;
    this.renderView();
  },

  printCertificate() {
    let style = document.getElementById('cert-print-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'cert-print-style';
      document.head.appendChild(style);
    }
    style.innerHTML = `@page { size: A4 landscape !important; margin: 8mm !important; }`;
    document.body.classList.add('print-certificate-mode');

    window.print();

    setTimeout(() => {
      document.body.classList.remove('print-certificate-mode');
      if (style) style.innerHTML = '';
    }, 1500);
  },

  downloadCertificateImage() {
    const certArea = document.getElementById('certificate-print-area');
    if (!certArea) return;

    if (typeof html2canvas === 'undefined') {
      window.App.showToast('Görüntü alma kütüphanesi hazır değil. Lütfen sayfayı yenileyiniz.', 'error');
      return;
    }

    const st = this.certModalData?.student;
    const name = st ? `${st.firstName}_${st.lastName}`.replace(/\s+/g, '_') : 'Talebe';
    const btn = document.getElementById('btn-download-cert-img');
    const oldText = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '⏳ Hazırlanıyor...';

    html2canvas(certArea, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = `${name}_Basari_ve_Onur_Belgesi.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      if (btn) btn.innerHTML = oldText;
      window.App.showToast('Başarı Belgesi yüksek çözünürlüklü resim (PNG) olarak indirildi!', 'success');
    }).catch(err => {
      console.error(err);
      if (btn) btn.innerHTML = oldText;
      window.App.showToast('Resim oluşturulurken bir hata oluştu.', 'error');
    });
  },

  renderView() {
    const container = document.getElementById('main-content');
    if (!container) return;

    const data = window.Store.getLeaderboard(this.period, this.targetDate, this.classFilter);
    const isWeekly = this.period === 'haftalik';
    const periodTitle = isWeekly ? 'HAFTANIN TALEBESİ' : 'AYIN TALEBESİ';
    const dateRangeLabel = `${data.startDate} – ${data.endDate}`;

    // Podyum için ilk 3 öğrenci
    const top1 = data.ranking[0] || null;
    const top2 = data.ranking[1] || null;
    const top3 = data.ranking[2] || null;

    container.innerHTML = `
      <div class="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
        
        <!-- ÜST KONTROL & FİLTRE PANOSU -->
        <div class="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4 no-print">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <!-- Başlık & İkon -->
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white font-black text-2xl flex items-center justify-center shadow-md">
                🏆
              </div>
              <div>
                <h2 class="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                  <span>${periodTitle} Sıralaması</span>
                  <span class="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    Liderlik Podyumu
                  </span>
                </h2>
                <p class="text-xs text-slate-400 mt-0.5">
                  Talebelerin namaz devamı, yatak intizamı, okul/izin dönüşü dakikliği ve ders başarı puanları
                </p>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
                    📅 ${isWeekly ? `Haftalık Dönem: ${data.startDate} (Pazar) – ${data.endDate} (Cumartesi)` : `Aylık Dönem: ${data.startDate} – ${data.endDate}`}
                  </span>
                  ${isWeekly ? '<span class="text-[10px] text-slate-400 font-bold">• Pazar sabahı sıfırlanır</span>' : ''}
                </div>
              </div>
            </div>

            <!-- Hafta / Ay Toggle Butonları -->
            <div class="flex flex-wrap items-center gap-2.5">
              <div class="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 gap-1 shadow-inner">
                <button onclick="window.LeaderboardModule.setPeriod('haftalik')"
                  class="py-1.5 px-4 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                    isWeekly 
                      ? 'bg-amber-500 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }">
                  <span>📅</span>
                  <span>Haftanın Talebesi</span>
                </button>
                <button onclick="window.LeaderboardModule.setPeriod('aylik')"
                  class="py-1.5 px-4 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                    !isWeekly 
                      ? 'bg-amber-500 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }">
                  <span>🗓️</span>
                  <span>Ayın Talebesi</span>
                </button>
              </div>

              <!-- Tarih Navigasyonu -->
              <div class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-2xl p-1">
                <button onclick="window.LeaderboardModule.prevPeriod()" 
                  class="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-600 font-bold border border-slate-200 text-xs flex items-center justify-center transition">
                  ‹
                </button>
                <input type="date" value="${this.targetDate}"
                  class="px-2.5 py-1 bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                  onchange="window.LeaderboardModule.setTargetDate(this.value)">
                <button onclick="window.LeaderboardModule.nextPeriod()" 
                  class="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-600 font-bold border border-slate-200 text-xs flex items-center justify-center transition">
                  ›
                </button>
                <button onclick="window.LeaderboardModule.setToday()" 
                  class="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 ml-1 transition">
                  Bugün
                </button>
              </div>
            </div>
          </div>

          <!-- Sınıf Filtre Butonları -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-xs font-bold text-slate-400 mr-1 uppercase">Sıralama:</span>
              <button onclick="window.LeaderboardModule.setClassFilter('ALL')"
                class="px-3.5 py-1.5 rounded-xl text-xs font-black transition ${
                  this.classFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }">
                Tüm Kurs (Genel)
              </button>
              ${this.classes.map(c => `
                <button onclick="window.LeaderboardModule.setClassFilter('${c}')"
                  class="px-3.5 py-1.5 rounded-xl text-xs font-black transition ${
                    this.classFilter === c
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }">
                  ${c} Şampiyonu
                </button>
              `).join('')}
            </div>

            <div class="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2">
              <span>📅 Geçerli Dönem:</span>
              <strong class="text-slate-800">${dateRangeLabel}</strong>
            </div>
          </div>
        </div>

        <!-- 🏆 ŞAMPİYONLAR PODYUMU (PODIUM - 1., 2., 3. SIRA) -->
        <div class="no-print">
          ${data.ranking.length === 0 ? `
            <div class="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200">
              Bu dönemde kayıtlı öğrenci bulunamadı.
            </div>
          ` : `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4 pb-2">
              
              <!-- 🥈 2. SIRA (GÜMÜŞ MADALYA) -->
              <div class="order-2 md:order-1">
                ${top2 ? `
                  <div class="bg-white rounded-3xl border-2 border-slate-300 shadow-md p-5 text-center relative overflow-hidden flex flex-col justify-between hover:shadow-lg transition">
                    <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-slate-300 via-slate-400 to-slate-300"></div>
                    <div>
                      <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100 border border-slate-300 text-2xl shadow-inner mb-2">
                        🥈
                      </div>
                      <div class="text-[10px] font-black uppercase tracking-wider text-slate-400">2. Sıra • Gümüş Madalya</div>
                      <h3 class="text-base font-black text-slate-900 mt-1 truncate">
                        ${top2.student.firstName} ${top2.student.lastName}
                      </h3>
                      <div class="text-xs text-slate-500 font-bold">${top2.student.className} • No: ${top2.student.studentNo}</div>
                    </div>

                    <div class="my-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <div class="text-[10px] font-bold text-slate-400 uppercase">TOPLAM PUAN</div>
                      <div class="text-2xl font-black text-slate-800">${top2.totalScore}</div>
                      <div class="text-[10px] text-slate-500 mt-0.5">
                        🕌 ${top2.namaz.points} • 🛏️ ${top2.yatak.points} • 📚 ${top2.akademi.points}
                      </div>
                    </div>

                    <div class="flex items-center gap-1.5 justify-center">
                      <button onclick="window.LeaderboardModule.openDetail('${top2.student.id}')"
                        class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1">
                        🔍 Puan Detayı
                      </button>
                      <button onclick="window.LeaderboardModule.openCertificate('${top2.student.id}', 2)"
                        class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs">
                        🖨️ Belge
                      </button>
                    </div>
                  </div>
                ` : `
                  <div class="h-48 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-xs font-bold">
                    2. Talebe Bekleniyor
                  </div>
                `}
              </div>

              <!-- 🥇 1. SIRA (ALTIN KUPA - ŞAMPİYON) -->
              <div class="order-1 md:order-2">
                ${top1 ? `
                  <div class="bg-gradient-to-b from-amber-50/90 via-white to-amber-50/50 rounded-3xl border-3 border-amber-400 shadow-xl p-6 text-center relative overflow-hidden flex flex-col justify-between transform md:-translate-y-4 hover:shadow-2xl transition">
                    <div class="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500"></div>
                    
                    <div>
                      <div class="relative inline-block mb-1">
                        <div class="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-white font-black text-3xl flex items-center justify-center shadow-lg mx-auto">
                          🏆
                        </div>
                        <span class="absolute -top-2 -right-2 text-xl animate-bounce">👑</span>
                      </div>
                      
                      <div class="inline-block px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-black text-xs uppercase tracking-wider mt-1">
                        🌟 ${periodTitle} 🌟
                      </div>
                      
                      <h3 class="text-lg sm:text-xl font-black text-slate-900 mt-2 truncate">
                        ${top1.student.firstName} ${top1.student.lastName}
                      </h3>
                      <div class="text-xs font-bold text-slate-600">${top1.student.className} • No: ${top1.student.studentNo}</div>
                    </div>

                    <div class="my-4 p-4 bg-white/90 rounded-2xl border-2 border-amber-300 shadow-sm">
                      <div class="text-[11px] font-black text-amber-800 uppercase tracking-wider">ŞAMPİYONLUK PUANI</div>
                      <div class="text-4xl font-black text-amber-600 my-0.5">${top1.totalScore}</div>
                      <div class="text-[11px] text-slate-600 font-medium">
                        🕌 Namaz: ${top1.namaz.points} • 🛏️ Yatak: ${top1.yatak.points} • 📚 Akademi: ${top1.akademi.points}
                      </div>
                      ${top1.namaz.fullBonusCount > 0 ? `
                        <div class="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-1.5 border border-emerald-200">
                          ⭐ ${top1.namaz.fullBonusCount} Gün Tam İbadet Bonusu (+${top1.namaz.fullBonusPoints} Puan)
                        </div>
                      ` : ''}
                    </div>

                    <div class="flex items-center gap-2 justify-center">
                      <button onclick="window.LeaderboardModule.openDetail('${top1.student.id}')"
                        class="px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-black transition flex items-center gap-1.5">
                        🔍 Puan Detayı
                      </button>
                      <button onclick="window.LeaderboardModule.openCertificate('${top1.student.id}', 1)"
                        class="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md">
                        🖨️ Başarı Belgesi Yazdır
                      </button>
                    </div>
                  </div>
                ` : `
                  <div class="h-60 rounded-3xl border-2 border-dashed border-amber-300 flex items-center justify-center text-amber-400 text-xs font-bold">
                    1. Talebe Bekleniyor
                  </div>
                `}
              </div>

              <!-- 🥉 3. SIRA (BRONZ MADALYA) -->
              <div class="order-3 md:order-3">
                ${top3 ? `
                  <div class="bg-white rounded-3xl border-2 border-amber-700/40 shadow-md p-5 text-center relative overflow-hidden flex flex-col justify-between hover:shadow-lg transition">
                    <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700"></div>
                    <div>
                      <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-50 border border-amber-600/30 text-2xl shadow-inner mb-2">
                        🥉
                      </div>
                      <div class="text-[10px] font-black uppercase tracking-wider text-amber-800">3. Sıra • Bronz Madalya</div>
                      <h3 class="text-base font-black text-slate-900 mt-1 truncate">
                        ${top3.student.firstName} ${top3.student.lastName}
                      </h3>
                      <div class="text-xs text-slate-500 font-bold">${top3.student.className} • No: ${top3.student.studentNo}</div>
                    </div>

                    <div class="my-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <div class="text-[10px] font-bold text-slate-400 uppercase">TOPLAM PUAN</div>
                      <div class="text-2xl font-black text-slate-800">${top3.totalScore}</div>
                      <div class="text-[10px] text-slate-500 mt-0.5">
                        🕌 ${top3.namaz.points} • 🛏️ ${top3.yatak.points} • 📚 ${top3.akademi.points}
                      </div>
                    </div>

                    <div class="flex items-center gap-1.5 justify-center">
                      <button onclick="window.LeaderboardModule.openDetail('${top3.student.id}')"
                        class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1">
                        🔍 Puan Detayı
                      </button>
                      <button onclick="window.LeaderboardModule.openCertificate('${top3.student.id}', 3)"
                        class="px-3 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs">
                        🖨️ Belge
                      </button>
                    </div>
                  </div>
                ` : `
                  <div class="h-44 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-xs font-bold">
                    3. Talebe Bekleniyor
                  </div>
                `}
              </div>

            </div>
          `}
        </div>

        <!-- 📋 TÜM TALEBELERİN LİDERLİK TABLOSU (SIRALAMA LİSTESİ) -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden no-print">
          <div class="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 class="font-black text-base text-slate-900 flex items-center gap-2">
                <span>📊</span>
                <span>Genel Sıralama ve Puan Döküm Tablosu</span>
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  ${data.totalStudents} Talebe
                </span>
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">Tüm öğrencilerin kategorilere göre kazandığı puanlar</p>
            </div>

            <div class="w-full sm:w-64">
              <input type="text" placeholder="Talebe ara..." 
                class="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-400 transition"
                oninput="window.LeaderboardModule.setSearchQuery(this.value)">
            </div>
          </div>

          <div id="leaderboard-table-body" class="overflow-x-auto">
            <!-- JavaScript ile render edilir -->
          </div>
        </div>

      </div>

      <!-- MODALLAR -->
      ${this.renderDetailModal()}
      ${this.renderBonusModal()}
      ${this.renderCertificateModalHtml()}
    `;

    this.renderLeaderboardTable();
  },

  renderLeaderboardTable() {
    const tableContainer = document.getElementById('leaderboard-table-body');
    if (!tableContainer) return;

    const data = window.Store.getLeaderboard(this.period, this.targetDate, this.classFilter);
    let items = data.ranking;

    if (this.searchQuery) {
      items = items.filter(i => 
        (i.student.firstName + ' ' + i.student.lastName).toLowerCase().includes(this.searchQuery) ||
        (i.student.studentNo || '').includes(this.searchQuery) ||
        (i.student.className || '').toLowerCase().includes(this.searchQuery)
      );
    }

    if (items.length === 0) {
      tableContainer.innerHTML = `
        <div class="py-12 text-center text-slate-400 text-xs">
          Arama kriterine uygun öğrenci bulunamadı.
        </div>
      `;
      return;
    }

    tableContainer.innerHTML = `
      <table class="w-full text-left border-collapse min-w-[850px]">
        <thead>
          <tr class="bg-slate-50 text-[11px] font-black uppercase text-slate-500 border-b border-slate-200">
            <th class="p-3 text-center w-16">SIRA</th>
            <th class="p-3">TALEBE BİLGİSİ</th>
            <th class="p-3 text-center">🕌 NAMAZ</th>
            <th class="p-3 text-center">🛏️ YATAK</th>
            <th class="p-3 text-center">🎒 OKUL</th>
            <th class="p-3 text-center">🚪 İZİN</th>
            <th class="p-3 text-center">📚 AKADEMİ</th>
            <th class="p-3 text-center">🌟 TAKDİR</th>
            <th class="p-3 text-center">TOPLAM PUAN</th>
            <th class="p-3 text-right">İŞLEMLER</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 text-xs">
          ${items.map(item => {
            let rankBadge = `<span class="font-black text-slate-600 text-sm">#${item.rank}</span>`;
            let rowBg = 'hover:bg-slate-50/80';
            if (item.rank === 1) {
              rankBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-black text-sm shadow-xs">🥇 1</span>`;
              rowBg = 'bg-amber-50/40 hover:bg-amber-50/80';
            } else if (item.rank === 2) {
              rankBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-200 text-slate-800 border border-slate-300 font-black text-sm shadow-xs">🥈 2</span>`;
              rowBg = 'bg-slate-50/40 hover:bg-slate-50/80';
            } else if (item.rank === 3) {
              rankBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-100/70 text-amber-950 border border-amber-700/30 font-black text-sm shadow-xs">🥉 3</span>`;
              rowBg = 'bg-amber-50/20 hover:bg-amber-50/60';
            }

            return `
              <tr class="${rowBg} transition">
                <td class="p-3 text-center">${rankBadge}</td>
                <td class="p-3 font-bold text-slate-900">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-xs flex items-center justify-center">
                      ${item.student.firstName[0]}${item.student.lastName[0]}
                    </div>
                    <div>
                      <div class="font-bold text-slate-900">${item.student.firstName} ${item.student.lastName}</div>
                      <div class="text-[10px] text-slate-400 font-normal">
                        ${item.student.className} • No: ${item.student.studentNo}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="p-3 text-center">
                  <span class="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                    +${item.namaz.points}
                  </span>
                </td>
                <td class="p-3 text-center">
                  <span class="px-2 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 font-bold text-[11px]">
                    +${item.yatak.points}
                  </span>
                </td>
                <td class="p-3 text-center">
                  <span class="px-2 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-bold text-[11px]">
                    +${item.okul.points}
                  </span>
                </td>
                <td class="p-3 text-center">
                  <span class="px-2 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 font-bold text-[11px]">
                    +${item.izinDonus.points}
                  </span>
                </td>
                <td class="p-3 text-center">
                  <span class="px-2 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 font-bold text-[11px]">
                    +${item.akademi.points}
                  </span>
                </td>
                <td class="p-3 text-center">
                  <span class="px-2 py-1 rounded-lg ${item.bonus.points > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black' : 'bg-slate-100 text-slate-500'} font-bold text-[11px]">
                    +${item.bonus.points}
                  </span>
                </td>
                <td class="p-3 text-center">
                  <span class="px-3 py-1 rounded-xl bg-slate-900 text-white font-black text-sm shadow-xs">
                    ${item.totalScore}
                  </span>
                </td>
                <td class="p-3 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <button onclick="window.LeaderboardModule.openDetail('${item.student.id}')"
                      title="Puanlama Ayrıntılarını İncele"
                      class="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition flex items-center gap-1">
                      <span>🔍</span>
                      <span class="hidden sm:inline">Detay</span>
                    </button>
                    <button onclick="window.LeaderboardModule.openBonusModal('${item.student.id}')"
                      title="Öğrenciye Hoca Takdir / Bonus Puanı Ekle"
                      class="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[11px] transition flex items-center gap-1">
                      <span>🌟</span>
                      <span class="hidden sm:inline">+Puan</span>
                    </button>
                    <button onclick="window.LeaderboardModule.openCertificate('${item.student.id}', ${item.rank})"
                      title="Başarı Belgesi Yazdır"
                      class="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] transition flex items-center gap-1">
                      <span>🖨️</span>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  },

  renderDetailModal() {
    if (!this.detailStudentId) return '';

    const data = window.Store.getLeaderboard(this.period, this.targetDate, this.classFilter);
    const item = data.ranking.find(r => r.student.id === this.detailStudentId);
    if (!item) return '';

    const st = item.student;
    const isWeekly = this.period === 'haftalik';

    return `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-fade-in no-print">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
          
          <!-- Modal Başlığı -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-900 text-2xl font-black flex items-center justify-center shadow-xs">
                #${item.rank}
              </div>
              <div>
                <h3 class="font-black text-lg text-slate-900">${st.firstName} ${st.lastName}</h3>
                <p class="text-xs text-slate-400">
                  ${st.className} • No: ${st.studentNo} • ${isWeekly ? 'Haftalık' : 'Aylık'} Puan Karnesi
                </p>
              </div>
            </div>
            <button onclick="window.LeaderboardModule.closeDetail()" 
              class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-black transition flex items-center justify-center">
              ✕
            </button>
          </div>

          <!-- Toplam Puan Özeti -->
          <div class="p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white flex items-center justify-between shadow-md">
            <div>
              <div class="text-[10px] font-bold uppercase tracking-wider text-amber-100">DÖNEMLİK TOPLAM BAŞARI PUANI</div>
              <div class="text-3xl font-black">${item.totalScore} Puan</div>
            </div>
            <div class="text-right">
              <span class="px-3 py-1 rounded-full bg-white/20 text-white font-black text-xs">
                ${data.startDate} – ${data.endDate}
              </span>
            </div>
          </div>

          <!-- Puan Kaynakları Detay Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            
            <!-- 1. Namaz -->
            <div class="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-1.5">
              <div class="flex items-center justify-between font-bold text-emerald-950">
                <span class="flex items-center gap-1.5"><span>🕌</span> 5 Vakit Namaz</span>
                <span class="font-black text-emerald-700 text-sm">+${item.namaz.points} Puan</span>
              </div>
              <div class="text-[11px] text-slate-600 space-y-0.5">
                <div>• Vaktinde & Takkeli: <strong>${item.namaz.varCount} vakit</strong> (+${item.namaz.varCount * 10} puan)</div>
                <div>• Geç Kaldı: <strong>${item.namaz.gecCount} vakit</strong> (+${item.namaz.gecCount * 5} puan)</div>
                <div>• Takkesiz Katıldı: <strong>${item.namaz.takkesizCount} vakit</strong> (+${item.namaz.takkesizCount * 5} puan)</div>
                <div>• Geç + Takkesiz: <strong>${item.namaz.gecTakkesizCount} vakit</strong> (+${item.namaz.gecTakkesizCount * 2} puan)</div>
                ${item.namaz.fullBonusCount > 0 ? `
                  <div class="font-black text-emerald-800 pt-1 border-t border-emerald-200">
                    ⭐ ${item.namaz.fullBonusCount} gün 5 vakit tam ibadet bonusu: <strong>+${item.namaz.fullBonusPoints} puan</strong>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- 2. Yatak Düzeni -->
            <div class="p-3.5 rounded-2xl border border-teal-200 bg-teal-50/40 space-y-1.5">
              <div class="flex items-center justify-between font-bold text-teal-950">
                <span class="flex items-center gap-1.5"><span>🛏️</span> Yatak ve Oda Düzeni</span>
                <span class="font-black text-teal-700 text-sm">+${item.yatak.points} Puan</span>
              </div>
              <div class="text-[11px] text-slate-600 space-y-0.5">
                <div>• İyi (Düzenli & Temiz): <strong>${item.yatak.iyiCount} gün</strong> (+${item.yatak.iyiCount * 15} puan)</div>
                <div>• Orta Düzen: <strong>${item.yatak.ortaCount} gün</strong> (+${item.yatak.ortaCount * 5} puan)</div>
                <div>• Kötü Düzen: <strong>${item.yatak.kotuCount} gün</strong> (0 puan)</div>
              </div>
            </div>

            <!-- 3. Okul Dönüşü -->
            <div class="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-1.5">
              <div class="flex items-center justify-between font-bold text-blue-950">
                <span class="flex items-center gap-1.5"><span>🎒</span> Okul Dönüşü Dakikliği</span>
                <span class="font-black text-blue-700 text-sm">+${item.okul.points} Puan</span>
              </div>
              <div class="text-[11px] text-slate-600 space-y-0.5">
                <div>• Vaktinde Geldi: <strong>${item.okul.geldiCount} gün</strong> (+${item.okul.geldiCount * 10} puan)</div>
                <div>• Geç Geldi: <strong>${item.okul.gecCount} gün</strong> (+${item.okul.gecCount * 3} puan)</div>
              </div>
            </div>

            <!-- 4. İzin Dönüşü -->
            <div class="p-3.5 rounded-2xl border border-purple-200 bg-purple-50/40 space-y-1.5">
              <div class="flex items-center justify-between font-bold text-purple-950">
                <span class="flex items-center gap-1.5"><span>🚪</span> Hafta Sonu İzin Dönüşü</span>
                <span class="font-black text-purple-700 text-sm">+${item.izinDonus.points} Puan</span>
              </div>
              <div class="text-[11px] text-slate-600 space-y-0.5">
                <div>• Vaktinde / Erken Dönüş: <strong>${item.izinDonus.onTimeCount} kez</strong></div>
                <div>• Geç Dönüş Sayısı: <strong>${item.izinDonus.lateCount} kez</strong></div>
              </div>
            </div>

            <!-- 5. Akademi / Takviye Ders Notları -->
            <div class="p-3.5 rounded-2xl border border-sky-200 bg-sky-50/40 space-y-1.5 sm:col-span-2">
              <div class="flex items-center justify-between font-bold text-sky-950">
                <span class="flex items-center gap-1.5"><span>📚</span> Takviye Ders Başarısı (Akademi)</span>
                <span class="font-black text-sky-700 text-sm">+${item.akademi.points} Puan</span>
              </div>
              ${item.akademi.scores.length === 0 ? `
                <div class="text-[11px] text-slate-400">Bu dönemde girilen sınav notu bulunmuyor.</div>
              ` : `
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                  ${item.akademi.scores.map(s => `
                    <div class="p-2 bg-white rounded-xl border border-sky-100 flex items-center justify-between">
                      <span class="font-bold text-slate-800">${s.subject}:</span>
                      <span class="px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 font-black">${s.score} / 100</span>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>

            <!-- 6. Hoca Takdir Puanları -->
            ${item.bonus.items.length > 0 ? `
              <div class="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-1.5 sm:col-span-2">
                <div class="flex items-center justify-between font-bold text-amber-950">
                  <span class="flex items-center gap-1.5"><span>🌟</span> Hoca Takdir & Özel Başarı Puanları</span>
                  <span class="font-black text-amber-800 text-sm">+${item.bonus.points} Puan</span>
                </div>
                <div class="space-y-1.5 pt-1">
                  ${item.bonus.items.map(b => `
                    <div class="p-2 bg-white rounded-xl border border-amber-100 flex items-center justify-between">
                      <div>
                        <div class="font-bold text-slate-800">${b.reason}</div>
                        <div class="text-[10px] text-slate-400">${b.date} • Veren: ${b.hocaName}</div>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-black">+${b.points} Puan</span>
                        <button onclick="window.LeaderboardModule.deleteBonus('${b.id}')"
                          title="Sil" class="text-rose-500 hover:text-rose-700 font-bold px-1 text-xs">✕</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

          </div>

          <!-- Kapat Butonu -->
          <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button onclick="window.LeaderboardModule.openBonusModal('${st.id}')"
              class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition">
              🌟 Takdir Puanı Ekle
            </button>
            <button onclick="window.LeaderboardModule.closeDetail()" 
              class="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition">
              Kapat
            </button>
          </div>

        </div>
      </div>
    `;
  },

  renderBonusModal() {
    if (!this.bonusModalStudentId) return '';

    const students = window.Store.getStudents();
    const st = students.find(s => s.id === this.bonusModalStudentId);
    if (!st) return '';

    return `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-fade-in no-print">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 text-xl font-black flex items-center justify-center shadow-xs">
                🌟
              </div>
              <div>
                <h3 class="font-black text-base text-slate-900">Takdir / Bonus Puan Ekle</h3>
                <p class="text-xs text-slate-400">${st.firstName} ${st.lastName} (${st.className})</p>
              </div>
            </div>
            <button onclick="window.LeaderboardModule.closeBonusModal()" 
              class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-black transition flex items-center justify-center">
              ✕
            </button>
          </div>

          <form onsubmit="window.LeaderboardModule.saveBonusPoint(event)" class="space-y-3.5">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 uppercase">PUAN MİKTARI *</label>
              <div class="grid grid-cols-4 gap-2 mb-2">
                <button type="button" onclick="document.getElementById('bonus-pts-input').value = '10'"
                  class="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-100 text-xs font-bold text-slate-800 transition">
                  +10 Puan
                </button>
                <button type="button" onclick="document.getElementById('bonus-pts-input').value = '20'"
                  class="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-100 text-xs font-bold text-slate-800 transition">
                  +20 Puan
                </button>
                <button type="button" onclick="document.getElementById('bonus-pts-input').value = '30'"
                  class="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-100 text-xs font-bold text-slate-800 transition">
                  +30 Puan
                </button>
                <button type="button" onclick="document.getElementById('bonus-pts-input').value = '50'"
                  class="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-100 text-xs font-bold text-slate-800 transition">
                  +50 Puan
                </button>
              </div>
              <input type="number" id="bonus-pts-input" value="10" required min="1" max="100"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 uppercase">TAKDİR SEBEBİ / AÇIKLAMA *</label>
              <div class="grid grid-cols-2 gap-1.5 mb-2">
                <button type="button" onclick="document.getElementById('bonus-reason-input').value = 'Örnek Ahlak & Saygı'"
                  class="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-medium text-slate-700 text-left transition">
                  ✨ Örnek Ahlak & Saygı
                </button>
                <button type="button" onclick="document.getElementById('bonus-reason-input').value = 'Kuran-ı Kerim Ezber Gayreti'"
                  class="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-medium text-slate-700 text-left transition">
                  📖 Kuran Ezber Gayreti
                </button>
                <button type="button" onclick="document.getElementById('bonus-reason-input').value = 'Cemaate & Mescide Yardım'"
                  class="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-medium text-slate-700 text-left transition">
                  🕌 Mescide Hizmet
                </button>
                <button type="button" onclick="document.getElementById('bonus-reason-input').value = 'Oda & Yatak Sorumluluğu'"
                  class="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-medium text-slate-700 text-left transition">
                  🛏️ Oda Tertip Düzeni
                </button>
              </div>
              <input type="text" id="bonus-reason-input" value="Örnek Ahlak & Gayret" required
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500">
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="window.LeaderboardModule.closeBonusModal()"
                class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition">
                Vazgeç
              </button>
              <button type="submit" 
                class="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow transition">
                Puanı Kaydet
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  renderCertificateModalHtml() {
    if (!this.certModalData) return '';

    const { student, rank, periodLabel, periodType, totalScore, className, dateStr } = this.certModalData;
    const settings = window.Store.getSettings ? window.Store.getSettings() : {};
    const instName = settings.institutionName || 'Ömer Avniyel Akademi';
    const logoUrl = settings.institutionLogo || 'kurs_logo.jpg';

    return `
      <div id="certificate-modal-overlay" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-6 animate-fade-in overflow-y-auto">
        <div id="certificate-modal-container" class="bg-white rounded-3xl shadow-2xl max-w-5xl w-full p-4 sm:p-6 space-y-4">
          
          <!-- Modal Toolbar (Yazdırma ve Kapatma) -->
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 no-print">
            <div class="text-xs font-bold text-slate-500 flex items-center gap-2">
              <span class="text-base">📄</span>
              <span class="font-black text-slate-800 text-sm">A4 Yatay Başarı ve Onur Belgesi</span>
              <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">Yatay Format</span>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="window.LeaderboardModule.printCertificate()"
                class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
                title="A4 Yatay formatında doğrudan yazdırın veya PDF olarak kaydedin">
                <span>🖨️</span>
                <span>Yatay A4 Yazdır / PDF</span>
              </button>
              <button onclick="window.LeaderboardModule.downloadCertificateImage()" id="btn-download-cert-img"
                class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
                title="Belgeyi yüksek çözünürlüklü resim (PNG) olarak indirin">
                <span>📸</span>
                <span>Resim İndir</span>
              </button>
              <button onclick="window.LeaderboardModule.closeCertificate()"
                class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer">
                Kapat
              </button>
            </div>
          </div>

          <!-- YAZDIRILABİLİR SERTİFİKA ALANI (YATAY A4 TASARIMI) -->
          <div id="certificate-print-area" class="bg-gradient-to-br from-amber-50/40 via-white to-amber-50/30 border-8 border-double border-amber-600/70 rounded-3xl p-6 sm:p-10 text-center relative overflow-hidden shadow-inner flex flex-col justify-between" style="min-height: 520px;">
            
            <!-- Köşe Süslemeleri (Gold Ornaments) -->
            <div class="absolute top-3 left-4 text-amber-500/50 text-3xl font-black select-none">✦</div>
            <div class="absolute top-3 right-4 text-amber-500/50 text-3xl font-black select-none">✦</div>
            <div class="absolute bottom-3 left-4 text-amber-500/50 text-3xl font-black select-none">✦</div>
            <div class="absolute bottom-3 right-4 text-amber-500/50 text-3xl font-black select-none">✦</div>

            <!-- 1. ÜST BÖLÜM: Kurum Başlığı ve Logo -->
            <div class="flex items-center justify-between gap-4 border-b border-amber-200/80 pb-4">
              <!-- Sol: Kurum Logosu -->
              <div class="w-20 sm:w-24 text-left">
                ${logoUrl ? `
                  <div class="w-16 h-16 rounded-2xl overflow-hidden border border-amber-200 shadow-sm p-1 bg-white inline-block">
                    <img src="${logoUrl}" alt="Logo" class="w-full h-full object-contain"
                      onerror="this.style.display='none'">
                  </div>
                ` : '<div class="text-3xl">🎓</div>'}
              </div>

              <!-- Orta: Resmi Kurum Anteti -->
              <div class="flex-1 text-center">
                <div class="text-xs sm:text-sm font-black tracking-widest uppercase text-amber-900/80">T.C. MİLLİ EĞİTİM BAKANLIĞI</div>
                <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 mt-0.5 uppercase">
                  ${instName}
                </h1>
                <div class="inline-block mt-2 px-5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-black text-xs sm:text-sm uppercase tracking-widest shadow-xs">
                  🏆 ÜSTÜN BAŞARI VE ONUR BELGESİ 🏆
                </div>
              </div>

              <!-- Sağ: Seri No / Dengeleyici -->
              <div class="w-20 sm:w-24 text-right">
                <div class="text-[10px] font-bold text-slate-400 font-mono">SERİ NO: OA-${Date.now().toString().slice(-6)}</div>
              </div>
            </div>

            <!-- 2. ORTA BÖLÜM: Ana Tebrik, Öğrenci Adı ve Derece -->
            <div class="my-4 sm:my-6 space-y-3 sm:space-y-4 max-w-3xl mx-auto">
              <p class="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                Kurumumuz bünyesinde gösterdiği fevkalade gayret, 5 vakit namaz cemaatine devamlılığı, oda/yatak tertip düzeni ve derslerindeki üstün başarısıyla;
              </p>

              <!-- Öğrenci Adı Soyadı -->
              <div class="py-1">
                <div class="text-3xl sm:text-5xl font-black text-indigo-950 tracking-tight underline decoration-amber-400 decoration-wavy decoration-2">
                  ${student.firstName} ${student.lastName}
                </div>
                <div class="text-xs sm:text-sm font-bold text-slate-600 mt-1">
                  ${className} Sınıfı • Okul / Kurs No: <strong class="font-mono text-slate-900">${student.studentNo}</strong>
                </div>
              </div>

              <!-- Derece ve Puan Kutusu -->
              <div class="p-3.5 bg-gradient-to-r from-amber-100/70 via-amber-50/90 to-amber-100/70 rounded-2xl border border-amber-300 inline-block text-xs sm:text-sm text-amber-950 font-bold shadow-xs">
                ${periodLabel} döneminde toplam <strong class="text-amber-900 text-base font-black">${totalScore} Puan</strong> toplayarak kendi kategorisinde 
                <span class="text-amber-900 font-black">${rank === 1 ? 'BİRİNCİ' : rank + '. DERECE'}</span> olmuş ve 
                <strong class="text-amber-950 uppercase underline decoration-amber-500 decoration-2">${periodType}</strong> seçilmiştir.
              </div>

              <p class="text-xs text-slate-500 italic mt-1">
                "Talebemizi azim ve ahlaki faziletlerinden ötürü tebrik eder, muvaffakiyetlerinin ömür boyu daim olmasını temenni ederiz."
              </p>
            </div>

            <!-- 3. ALT BÖLÜM: Mühür & İmza -->
            <div class="pt-4 border-t border-amber-200/80 flex items-center justify-between text-xs px-6 sm:px-10">
              <div class="text-left">
                <div class="text-[11px] text-slate-400 font-bold">Düzenlenme Tarihi:</div>
                <div class="font-bold text-slate-700">${dateStr}</div>
              </div>
              <div class="text-center min-w-[180px]">
                <div class="h-10"></div>
                <div class="text-xs font-black text-slate-800 uppercase tracking-widest border-t-2 border-slate-300 pt-1">
                  Mühür & İmza
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    `;
  }
};
