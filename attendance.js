/**
 * attendance.js - Yoklama & Namaz Raporlama Modülü
 * 1. Namaz Yoklaması (5 Vakit: Sabah, Öğle, İkindi, Akşam, Yatsı / Butonlar: Var, Yok, Geç, Takkesiz, İzinli)
 * 2. Namaz Raporları (Haftalık & Aylık Vakit İstatistikleri, Tüm Talebelerin Devam Çizelgesi ve Günlük Detay)
 * 3. Yatak Yoklaması (İyi, Orta, Kötü)
 * 4. Okul Dönüşü Yoklaması (Geldi, Geç, Gelmedi)
 */

window.AttendanceModule = {
  currentCategory: 'namaz', // 'namaz', 'namaz_rapor', 'yatak', 'okul_donusu'
  currentDate: new Date().toISOString().split('T')[0],
  currentPrayer: 'Sabah',
  selectedClasses: [], // Boş ise 'Tüm Sınıflar'
  currentHoca: 'ALL',
  searchQuery: '',
  statusFilter: 'ALL', // 'ALL' | 'YOK' | 'VAR' | 'GEC' | 'TAKKESIZ' | 'IZINLI'
  reportAbsentOnly: false, // Namaz raporlarında sadece eksiği/yoku olanları filtreleme
  draftAttendance: {},

  // Rapor Parametreleri
  reportPeriod: 'haftalik', // 'haftalik' | 'aylik'
  reportDate: new Date().toISOString().split('T')[0],
  reportModalStudentId: null,

  categories: [
    { id: 'namaz', label: 'Namaz Yoklaması', icon: '🕌', short: 'Namaz' },
    { id: 'namaz_rapor', label: 'Namaz Raporları', icon: '📊', short: 'Raporlar' },
    { id: 'yatak', label: 'Yatak Yoklaması', icon: '🛏️', short: 'Yatak' },
    { id: 'okul_donusu', label: 'Okul Dönüşü', icon: '🎒', short: 'Okul Dönüşü' }
  ],

  prayerTimes: [
    { name: 'Sabah', icon: '🌅', label: 'Sabah Namazı' },
    { name: 'Öğle', icon: '☀️', label: 'Öğle Namazı' },
    { name: 'İkindi', icon: '🌤️', label: 'İkindi Namazı' },
    { name: 'Akşam', icon: '🌇', label: 'Akşam Namazı' },
    { name: 'Yatsı', icon: '🌙', label: 'Yatsı Namazı' }
  ],

  // Kategoriye Göre Yoklama Durum Kodları ve Renkleri
  statusConfigs: {
    namaz: [
      { code: 'VAR', label: 'Var', bg: '#10b981', border: '#059669', activeClass: 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300' },
      { code: 'YOK', label: 'Yok', bg: '#ef4444', border: '#dc2626', activeClass: 'bg-rose-600 text-white shadow-md ring-2 ring-rose-300' },
      { code: 'GEC', label: 'Geç', bg: '#f59e0b', border: '#d97706', activeClass: 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300' },
      { code: 'TAKKESIZ', label: 'Takkesiz', bg: '#9333ea', border: '#7e22ce', activeClass: 'bg-purple-700 text-white shadow-md ring-2 ring-purple-300' },
      { code: 'IZINLI', label: 'İzinli', bg: '#0d9488', border: '#0f766e', activeClass: 'bg-teal-600 text-white shadow-md ring-2 ring-teal-300' },
      { code: 'OKULDA', label: 'Okulda', bg: '#0284c7', border: '#0369a1', activeClass: 'bg-sky-600 text-white shadow-md ring-2 ring-sky-300' }
    ],
    yatak: [
      { code: 'IYI', label: 'İyi', bg: '#10b981', border: '#059669', activeClass: 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300' },
      { code: 'ORTA', label: 'Orta', bg: '#f59e0b', border: '#d97706', activeClass: 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300' },
      { code: 'KOTU', label: 'Kötü', bg: '#ef4444', border: '#dc2626', activeClass: 'bg-rose-600 text-white shadow-md ring-2 ring-rose-300' }
    ],
    okul_donusu: [
      { code: 'GELDI', label: 'Geldi', bg: '#10b981', border: '#059669', activeClass: 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300' },
      { code: 'GEC', label: 'Geç', bg: '#f59e0b', border: '#d97706', activeClass: 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300' },
      { code: 'GELMEDI', label: 'Gelmedi', bg: '#ef4444', border: '#dc2626', activeClass: 'bg-rose-600 text-white shadow-md ring-2 ring-rose-300' }
    ]
  },

  init() {
    const hour = new Date().getHours();
    if (hour < 11) this.currentPrayer = 'Sabah';
    else if (hour < 15) this.currentPrayer = 'Öğle';
    else if (hour < 18) this.currentPrayer = 'İkindi';
    else if (hour < 21) this.currentPrayer = 'Akşam';
    else this.currentPrayer = 'Yatsı';

    this.renderView();
  },

  setCategory(category) {
    this.currentCategory = category;
    if (category !== 'namaz_rapor') {
      this.loadDailyDraft();
    }
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

  setPrayer(prayerName) {
    this.currentPrayer = prayerName;
    this.loadDailyDraft();
    this.renderView();
    if (window.App && window.App.showToast) {
      window.App.showToast(`${this.currentPrayer} Namazı yoklaması seçildi.`, 'info');
    }
  },

  setDate(date) {
    this.currentDate = date;
    this.loadDailyDraft();
    this.renderView();
  },

  setReportPeriod(period) {
    this.reportPeriod = period;
    this.renderView();
  },

  setReportDate(date) {
    this.reportDate = date;
    this.renderView();
  },

  openStudentDetailModal(studentId) {
    this.reportModalStudentId = studentId;
    this.renderView();
  },

  closeStudentDetailModal() {
    this.reportModalStudentId = null;
    this.renderView();
  },

  getReportRange() {
    if (this.reportPeriod === 'haftalik') {
      return window.Store.getWeekRange(this.reportDate);
    } else {
      const ym = this.reportDate.substring(0, 7);
      return window.Store.getMonthRange(ym);
    }
  },

  getRateColor(rate) {
    if (rate >= 90) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (rate >= 75) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-rose-100 text-rose-800 border-rose-300';
  },

  // Çoklu Sınıf Seçimi
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

  setHocaFilter(hocaName) {
    this.currentHoca = hocaName;
    if (this.currentCategory === 'namaz_rapor') {
      this.renderView();
    } else {
      this.renderStudentRows();
      this.renderSummary();
    }
  },

  setSearchQuery(query) {
    this.searchQuery = query.toLowerCase().trim();
    if (this.currentCategory === 'namaz_rapor') {
      this.renderView();
    } else {
      this.renderStudentRows();
      this.renderSummary();
    }
  },

  getDefaultStatus(student = null) {
    if (this.currentCategory === 'namaz') {
      if (student && window.Store && typeof window.Store.isStudentAtSchoolSlot === 'function') {
        if (window.Store.isStudentAtSchoolSlot(student, this.currentDate, this.currentPrayer)) {
          return 'OKULDA';
        }
      }
      return 'VAR';
    }
    if (this.currentCategory === 'yatak') return 'IYI';
    if (this.currentCategory === 'okul_donusu') return 'GELDI';
    return 'VAR';
  },

  loadDailyDraft() {
    this.draftAttendance = {};
    const subKey = this.currentCategory === 'namaz' ? this.currentPrayer : this.currentCategory;
    const existing = window.Store.getAttendanceByCategory 
      ? window.Store.getAttendanceByCategory(this.currentDate, this.currentCategory, subKey)
      : window.Store.getAttendanceByDateAndPrayer(this.currentDate, this.currentPrayer);

    existing.forEach(rec => {
      let normalized = window.Store.normalizeStatusCode ? window.Store.normalizeStatusCode(rec.status) : rec.status;
      if (this.currentCategory === 'namaz' && (this.currentPrayer === 'Öğle' || this.currentPrayer === 'İkindi') && window.Store && typeof window.Store.isStudentAtSchoolSlot === 'function') {
        if (window.Store.isStudentAtSchoolSlot(rec.studentId, this.currentDate, this.currentPrayer) && normalized !== 'VAR') {
          normalized = 'OKULDA';
        }
      }
      this.draftAttendance[rec.studentId] = {
        status: normalized
      };
    });

    // Hafta içi Öğle veya İkindi vakitlerinde okulda olan sınıfların öğrencilerine otomatik 'OKULDA' ata
    if (this.currentCategory === 'namaz' && (this.currentPrayer === 'Öğle' || this.currentPrayer === 'İkindi') && window.Store && typeof window.Store.isStudentAtSchoolSlot === 'function') {
      const allStudents = window.Store.getStudents ? window.Store.getStudents() : [];
      allStudents.forEach(s => {
        if (window.Store.isStudentAtSchoolSlot(s, this.currentDate, this.currentPrayer)) {
          const cur = this.draftAttendance[s.id] ? this.draftAttendance[s.id].status : null;
          if (!cur || cur !== 'VAR') {
            this.draftAttendance[s.id] = { status: 'OKULDA' };
          }
        }
      });
    }
  },

  // Butona dokunulduğunda ANINDA OTOMATİK KAYIT
  setStatus(studentId, statusCode) {
    if (!this.draftAttendance[studentId]) {
      const student = window.Store.getStudentById ? window.Store.getStudentById(studentId) : null;
      this.draftAttendance[studentId] = { status: this.getDefaultStatus(student) };
    }

    let finalStatusCode = statusCode;

    // Namaz yoklamasında "Geç" ve "Takkesiz" aynı anda seçilebilir
    if (this.currentCategory === 'namaz') {
      const current = window.Store.normalizeStatusCode(this.draftAttendance[studentId].status || 'VAR');

      if (statusCode === 'GEC') {
        if (current === 'TAKKESIZ') {
          finalStatusCode = 'GEC_TAKKESIZ'; // Takkesiz vardı, geç de eklendi -> Her ikisi aktif!
        } else if (current === 'GEC_TAKKESIZ') {
          finalStatusCode = 'TAKKESIZ'; // Geç kaldırıldı, sadece takkesiz kaldı
        } else if (current === 'GEC') {
          finalStatusCode = 'VAR'; // Tekrar basıldığında normale döner
        } else {
          finalStatusCode = 'GEC';
        }
      } else if (statusCode === 'TAKKESIZ') {
        if (current === 'GEC') {
          finalStatusCode = 'GEC_TAKKESIZ'; // Geç vardı, takkesiz de eklendi -> Her ikisi aktif!
        } else if (current === 'GEC_TAKKESIZ') {
          finalStatusCode = 'GEC'; // Takkesiz kaldırıldı, sadece geç kaldı
        } else if (current === 'TAKKESIZ') {
          finalStatusCode = 'VAR'; // Tekrar basıldığında normale döner
        } else {
          finalStatusCode = 'TAKKESIZ';
        }
      } else {
        // 'VAR', 'YOK', 'IZINLI' basıldığında direkt o durum atanır
        finalStatusCode = statusCode;
      }
    }

    this.draftAttendance[studentId].status = finalStatusCode;

    const subKey = this.currentCategory === 'namaz' ? this.currentPrayer : this.currentCategory;
    const activeUser = window.Store.getCurrentUserName();

    window.Store.saveSingleAttendance(
      studentId,
      this.currentDate,
      subKey,
      finalStatusCode,
      this.currentCategory,
      activeUser
    );

    const scrollY = window.scrollY;
    this.renderStudentRows();
    this.renderSummary();
    if (typeof this.renderPrayerAuditPanel === 'function') {
      this.renderPrayerAuditPanel();
    }
    if (scrollY > 0) {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    }
  },

  saveAllCurrentView() {
    const allStudents = this.getAllStudentsForCurrentView();
    if (!allStudents || allStudents.length === 0) return;

    const subKey = this.currentCategory === 'namaz' ? this.currentPrayer : this.currentCategory;
    const activeUser = window.Store.getCurrentUserName();

    const records = allStudents.map(s => {
      const defaultStatus = this.getDefaultStatus(s);
      const draft = this.draftAttendance[s.id];
      let status = draft ? draft.status : defaultStatus;
      if (this.currentCategory === 'namaz' && window.Store && typeof window.Store.isStudentAtSchoolSlot === 'function' && window.Store.isStudentAtSchoolSlot(s, this.currentDate, this.currentPrayer)) {
        if (status !== 'VAR') status = 'OKULDA';
      }
      this.draftAttendance[s.id] = { status };
      return {
        studentId: s.id,
        date: this.currentDate,
        subKey: subKey,
        status: status,
        category: this.currentCategory,
        recordedBy: activeUser
      };
    });

    window.Store.saveAttendanceBatch(records, activeUser);
    this.renderView();

    const label = this.currentCategory === 'namaz' ? `${this.currentPrayer} Namazı` : (this.currentCategory === 'yatak' ? 'Yatak Yoklaması' : 'Okul Dönüşü');
    if (window.App && typeof window.App.showToast === 'function') {
      window.App.showToast(`✅ ${label} başarıyla tamamlandı ve kaydedildi! (${records.length} Talebe • Alan: ${activeUser})`, 'success');
    }
  },

  markAllAsDefault() {
    const allStudents = this.getAllStudentsForCurrentView();
    if (!allStudents || allStudents.length === 0) return;

    const subKey = this.currentCategory === 'namaz' ? this.currentPrayer : this.currentCategory;
    const activeUser = window.Store.getCurrentUserName();

    const records = allStudents.map(s => {
      const defaultStatus = this.getDefaultStatus(s);
      this.draftAttendance[s.id] = { status: defaultStatus };
      return {
        studentId: s.id,
        date: this.currentDate,
        subKey: subKey,
        status: defaultStatus,
        category: this.currentCategory,
        recordedBy: activeUser
      };
    });

    window.Store.saveAttendanceBatch(records, activeUser);
    this.renderView();

    const statusLabel = defaultStatus === 'VAR' ? 'Var' : (defaultStatus === 'IYI' ? 'İyi' : 'Geldi');
    if (window.App && typeof window.App.showToast === 'function') {
      window.App.showToast(`✅ Tüm talebeler "${statusLabel}" olarak kaydedildi! (${records.length} Talebe • Alan: ${activeUser})`, 'success');
    }
  },

  // WhatsApp ile Veliye Anlık Yoklama Bildirimi Gönderme
  sendWhatsAppNotice(studentId) {
    const student = window.Store.getStudentById(studentId);
    if (!student) return;

    let phone = student.parentPhone || student.phone || student.fatherPhone || '';
    if (!phone) {
      const input = prompt(`"${student.firstName} ${student.lastName}" adlı talebenin veli telefonu kayıtlı değil.\nMesaj göndermek için veli telefon numarasını giriniz (Örn: 05xx...):`);
      if (!input || !input.trim()) return;
      phone = input.trim();
      window.Store.updateStudent(studentId, { parentPhone: phone });
    }

    const draft = this.draftAttendance[studentId] || { status: this.getDefaultStatus() };
    const stCode = draft.status || this.getDefaultStatus();
    const dayName = this.getDayName(this.currentDate);

    let msg = '';
    if (this.currentCategory === 'namaz') {
      if (stCode === 'YOK') {
        msg = `Sayın Velimiz, Ömer Avniyel Akademi'den bildiriyoruz: Talebeniz ${student.firstName} ${student.lastName}, ${this.currentDate} (${dayName}) tarihinde ${this.currentPrayer} namazı cemaatine mazeretsiz olarak katılmamıştır. Bilgilerinize sunarız.`;
      } else if (stCode === 'GEC_TAKKESIZ') {
        msg = `Sayın Velimiz, Ömer Avniyel Akademi'den bildiriyoruz: Talebeniz ${student.firstName} ${student.lastName}, ${this.currentDate} (${dayName}) tarihinde ${this.currentPrayer} namazına hem geç kalmış hem de takkesiz olarak katılmıştır. Bilgilerinize sunarız.`;
      } else if (stCode === 'TAKKESIZ') {
        msg = `Sayın Velimiz, Ömer Avniyel Akademi'den bildiriyoruz: Talebeniz ${student.firstName} ${student.lastName}, ${this.currentDate} (${dayName}) tarihinde ${this.currentPrayer} namazına takkesiz olarak katılmıştır. Bilgilerinize sunarız.`;
      } else if (stCode === 'GEC') {
        msg = `Sayın Velimiz, Ömer Avniyel Akademi'den bildiriyoruz: Talebeniz ${student.firstName} ${student.lastName}, ${this.currentDate} (${dayName}) tarihinde ${this.currentPrayer} namazına geç kalmıştır. Bilgilerinize sunarız.`;
      } else if (stCode === 'IZINLI') {
        msg = `Sayın Velimiz, Talebeniz ${student.firstName} ${student.lastName} için ${this.currentDate} (${dayName}) ${this.currentPrayer} namazında izinli kaydı yapılmıştır. Bilgilerinize sunarız. — Ömer Avniyel Akademi`;
      } else {
        msg = `Sayın Velimiz, Talebeniz ${student.firstName} ${student.lastName}, ${this.currentDate} (${dayName}) ${this.currentPrayer} namazına cemaatle eksiksiz katılmıştır. Bilgilerinize sunarız. — Ömer Avniyel Akademi`;
      }
    } else if (this.currentCategory === 'yatak') {
      if (stCode === 'KOTU') {
        msg = `Sayın Velimiz, Ömer Avniyel Akademi'den bildiriyoruz: Talebeniz ${student.firstName} ${student.lastName}, ${this.currentDate} (${dayName}) tarihli sabah oda ve yatak kontrolünde yatağını nizami toplamamış ve dağınık bırakmıştır. İntizam kusuru kaydı işlenmiştir. Bilgilerinize sunarız.`;
      } else if (stCode === 'ORTA') {
        msg = `Sayın Velimiz, Ömer Avniyel Akademi'den bildiriyoruz: Talebeniz ${student.firstName} ${student.lastName}, ${this.currentDate} (${dayName}) sabah oda ve yatak kontrolünde kısmi intizam eksiği tespit edilmiştir. Bilgilerinize sunarız.`;
      } else {
        msg = `Sayın Velimiz, Talebeniz ${student.firstName} ${student.lastName}, ${this.currentDate} (${dayName}) sabah yatak ve dolap kontrolünde tertemiz ve nizami intizam sergilemiştir. Tebrik ederiz. — Ömer Avniyel Akademi`;
      }
    } else if (this.currentCategory === 'okul_donusu') {
      if (stCode === 'GELMEDI') {
        msg = `Sayın Velimiz, Ömer Avniyel Akademi'den bildiriyoruz: Talebeniz ${student.firstName} ${student.lastName}, ${this.currentDate} (${dayName}) tarihli okul dönüşünde yurda henüz gelmemiştir. Durumu hakkında hocalarına bilgi vermenizi rica ederiz.`;
      } else if (stCode === 'GEC') {
        msg = `Sayın Velimiz, Ömer Avniyel Akademi'den bildiriyoruz: Talebeniz ${student.firstName} ${student.lastName}, ${this.currentDate} (${dayName}) tarihli okul dönüş saatine geç kalmıştır. Bilgilerinize sunarız.`;
      } else {
        msg = `Sayın Velimiz, Talebeniz ${student.firstName} ${student.lastName}, ${this.currentDate} (${dayName}) okuldan vaktinde yurda giriş yapmıştır. Hayırlı günler dileriz. — Ömer Avniyel Akademi`;
      }
    }

    window.Store.sendWhatsAppMessage(phone, msg);
  },

  // WhatsApp ile Veliye Haftalık / Aylık Namaz Karne Raporu Gönderme
  sendWhatsAppAttendanceReport(studentId) {
    const student = window.Store.getStudentById(studentId);
    if (!student) return;

    let phone = student.parentPhone || student.phone || student.fatherPhone || '';
    if (!phone) {
      const input = prompt(`"${student.firstName} ${student.lastName}" adlı talebenin veli telefonu kayıtlı değil.\nMesaj göndermek için veli telefon numarasını giriniz (Örn: 05xx...):`);
      if (!input || !input.trim()) return;
      phone = input.trim();
      window.Store.updateStudent(studentId, { parentPhone: phone });
    }

    const range = this.getReportRange();
    const rep = window.Store.getPrayerReportForStudent(studentId, range.dates);
    const periodLabel = this.reportPeriod === 'haftalik' ? 'Haftalık' : 'Aylık';

    let msg = `Sayın Velimiz, Ömer Avniyel Akademi'den bildiriyoruz:\n\nTalebeniz ${student.firstName} ${student.lastName}'nin ${periodLabel} 5 Vakit Namaz Devam Raporu:\n` +
      `• Namaz Devam Başarısı: %${rep.attendanceRate}\n` +
      `• Cemaatle Kılınan: ${rep.overallCounts.VAR || 0} Vakit\n` +
      `• Takkesiz Katılım: ${rep.overallCounts.TAKKESIZ || 0}\n` +
      `• Geç Kalınan: ${rep.overallCounts.GEC || 0}\n` +
      `• Katılmadığı (Yok): ${rep.overallCounts.YOK || 0}\n` +
      `• İzinli / Raporlu: ${rep.overallCounts.IZINLI || 0}\n\n` +
      `Bilgilerinize sunar, hayırlı günler dileriz. — Ömer Avniyel Akademi`;

    window.Store.sendWhatsAppMessage(phone, msg);
  },

  getAllStudentsForCurrentView() {
    let students = window.Store.getStudents();

    if (this.selectedClasses && this.selectedClasses.length > 0) {
      students = students.filter(s => this.selectedClasses.includes(s.className));
    }

    if (this.currentHoca !== 'ALL') {
      students = students.filter(s => s.etutHocasi === this.currentHoca || s.dahiliHoca === this.currentHoca);
    }

    if (this.searchQuery) {
      students = students.filter(s => 
        s.firstName.toLowerCase().includes(this.searchQuery) ||
        s.lastName.toLowerCase().includes(this.searchQuery) ||
        (s.className && s.className.toLowerCase().includes(this.searchQuery)) ||
        (s.yatakhane && s.yatakhane.toLowerCase().includes(this.searchQuery))
      );
    }

    return students;
  },

  getFilteredStudents() {
    let students = this.getAllStudentsForCurrentView();

    if (this.statusFilter && this.statusFilter !== 'ALL') {
      students = students.filter(s => {
        const defaultStatus = this.getDefaultStatus(s);
        const draft = this.draftAttendance[s.id];
        const status = draft ? draft.status : defaultStatus;
        if (this.statusFilter === 'YOK') {
          return status === 'YOK';
        }
        if (this.statusFilter === 'VAR') {
          return status === 'VAR';
        }
        if (this.statusFilter === 'GEC') {
          return status === 'GEC' || status === 'GEC_TAKKESIZ';
        }
        if (this.statusFilter === 'TAKKESIZ') {
          return status === 'TAKKESIZ' || status === 'GEC_TAKKESIZ';
        }
        if (this.statusFilter === 'IZINLI') {
          return status === 'IZINLI';
        }
        if (this.statusFilter === 'OKULDA') {
          return status === 'OKULDA';
        }
        if (this.statusFilter === 'GEC_TAKKESIZ') {
          return status === 'GEC_TAKKESIZ';
        }
        return status === this.statusFilter;
      });
    }

    return students;
  },

  setStatusFilter(statusCode) {
    if (this.statusFilter === statusCode) {
      this.statusFilter = 'ALL';
    } else {
      this.statusFilter = statusCode;
    }
    this.renderSummary();
    this.renderStudentRows();

    if (window.App && typeof window.App.showToast === 'function') {
      if (this.statusFilter === 'YOK') {
        window.App.showToast('🔴 Sadece Namazda Olmayan (Yok) talebeler filtrelendi.', 'info');
      } else if (this.statusFilter === 'ALL') {
        window.App.showToast('Tüm talebeler gösteriliyor.', 'info');
      } else {
        window.App.showToast(`Durum filtresi: ${this.statusFilter}`, 'info');
      }
    }
  },

  toggleReportAbsentOnly() {
    this.reportAbsentOnly = !this.reportAbsentOnly;
    this.renderView();
    if (window.App && typeof window.App.showToast === 'function') {
      window.App.showToast(this.reportAbsentOnly ? 'Sadece namazda eksiği (Yok) olan talebeler filtrelendi.' : 'Tüm talebeler gösteriliyor.', 'info');
    }
  },

  renderView() {
    const container = document.getElementById('attendance-container');
    if (!container) return;

    // 1. Durum: Namaz Raporları Ekranı (Haftalık & Aylık)
    if (this.currentCategory === 'namaz_rapor') {
      this.renderReportView(container);
      return;
    }

    // 2. Durum: Günlük Yoklama Alma Ekranı (Namaz, Yatak, Okul Dönüşü)
    this.renderDailyYoklamaView(container);
  },

  // --- 1. HAFTALIK & AYLIK NAMAZ RAPORLARI GÖRÜNÜMÜ (HOCALAR & YÖNETİCİ) ---
  renderReportView(container) {
    const range = this.getReportRange();
    const students = this.getFilteredStudents();
    const classes = window.Store.getClasses();
    const batch = window.Store.getPrayerReportBatch(students, range.dates);
    const prayers = ['Sabah', 'Öğle', 'İkindi', 'Akşam', 'Yatsı'];

    // Toplam kılınan, takkesiz, yok sayıları
    let totalAttended = 0;
    let totalTakkesiz = 0;
    let totalYok = 0;
    let totalIzinli = 0;
    let totalSlots = 0;

    batch.reports.forEach(r => {
      totalAttended += r.attendedCount;
      totalTakkesiz += r.overallCounts.TAKKESIZ;
      totalYok += r.overallCounts.YOK;
      totalIzinli += r.overallCounts.IZINLI;
      totalSlots += r.totalSlots;
    });

    const isWeekly = this.reportPeriod === 'haftalik';
    const periodLabel = isWeekly 
      ? `Haftalık Rapor (${range.startDate} – ${range.endDate} • 7 Gün)` 
      : `Aylık Rapor (${range.startDate} – ${range.endDate} • ${range.dates.length} Gün)`;

    container.innerHTML = `
      <div class="space-y-5 animate-fade-in max-w-7xl mx-auto">
        <!-- 2. FİLTRE & PERİYOT KONTROL PANELİ -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <!-- Periyot Seçimi: Haftalık / Aylık & Tarih -->
            <div class="flex flex-wrap items-center gap-2.5">
              <span class="text-xs font-black text-slate-800 uppercase tracking-wide">RAPOR PERİYODU:</span>
              
              <div class="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 gap-1 shadow-inner">
                <button type="button" onclick="window.AttendanceModule.setReportPeriod('haftalik')"
                  class="py-1 px-3 rounded-lg text-xs font-black transition ${
                    isWeekly 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }">
                  📅 Haftalık Rapor
                </button>
                <button type="button" onclick="window.AttendanceModule.setReportPeriod('aylik')"
                  class="py-1 px-3 rounded-lg text-xs font-black transition ${
                    !isWeekly 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }">
                  🗓️ Aylık Rapor
                </button>
              </div>

              <!-- Tarih Seçici -->
              <div class="flex items-center gap-1.5">
                <input type="date" value="${this.reportDate}"
                  class="px-3 py-1.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition shadow-2xs"
                  onchange="window.AttendanceModule.setReportDate(this.value)">
                <span class="px-2.5 py-1.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200">
                  ${periodLabel}
                </span>
              </div>
            </div>

            <!-- Yazdır Butonu -->
            <div class="flex items-center gap-2">
              <button onclick="window.print()"
                class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm">
                <span>🖨️ Raporu Yazdır / PDF</span>
              </button>
            </div>
          </div>

          <!-- Sınıf ve Arama Filtresi -->
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-[11px] font-black text-slate-500 uppercase mr-1">SINIF FİLTRESİ:</span>
              <button type="button" onclick="window.AttendanceModule.toggleAllClasses()"
                class="px-3 py-1 rounded-xl text-xs font-black transition ${
                  this.selectedClasses.length === 0 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }">
                Tüm Sınıflar (${students.length})
              </button>
              ${classes.map(c => {
                const isChecked = this.selectedClasses.includes(c);
                return `
                  <button type="button" onclick="window.AttendanceModule.toggleClass('${c}')"
                    class="px-2.5 py-1 rounded-xl text-xs font-black transition border flex items-center gap-1 ${
                      isChecked 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }">
                    <span>${isChecked ? '✓' : '+'}</span>
                    <span>${c}</span>
                  </button>
                `;
              }).join('')}
            </div>

            <div class="w-full sm:w-56 relative">
              <input type="text" placeholder="Talebe ara..." 
                class="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                oninput="window.AttendanceModule.setSearchQuery(this.value)">
              <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
            </div>
          </div>
        </div>

        <!-- 3. ÖZET İSTATİSTİK KARTLARI (KPI & VAKİT DAĞILIMI) -->
        <div class="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
          <!-- Genel Başarı Oranı -->
          <div class="col-span-2 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-5 text-white shadow-md flex items-center justify-between">
            <div>
              <span class="text-xs font-bold text-emerald-100 uppercase tracking-wider">GENEL NAMAZ DEVAMI</span>
              <div class="text-3xl sm:text-4xl font-black mt-1">
                %${batch.classAverageRate}
              </div>
              <div class="text-[11px] text-emerald-100 mt-1">
                ${students.length} talebenin ${periodLabel.toLowerCase()}
              </div>
            </div>
            <div class="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-2xl font-black shadow-inner">
              🕌
            </div>
          </div>

          <!-- 5 Vakit Katılım Oranları -->
          <div class="col-span-2 lg:col-span-4 bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div class="text-xs font-black text-slate-700 uppercase tracking-wide mb-3 flex items-center justify-between">
              <span>Vakit Vakit Katılım Oranları</span>
              <span class="text-[10px] text-slate-400 font-normal">Kılınan / Toplam Vakitler</span>
            </div>
            <div class="grid grid-cols-5 gap-2 text-center">
              ${prayers.map(p => {
                const rate = batch.prayerRates[p] || 100;
                const icon = p === 'Sabah' ? '🌅' : (p === 'Öğle' ? '☀️' : (p === 'İkindi' ? '🌤️' : (p === 'Akşam' ? '🌇' : '🌙')));
                return `
                  <div class="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition">
                    <div class="text-base">${icon}</div>
                    <div class="text-[11px] font-black text-slate-700 mt-0.5">${p}</div>
                    <div class="text-xs sm:text-sm font-black text-emerald-700 mt-1">%${rate}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Sayaç Şeridi (Takkesiz, Yok, İzinli) -->
        <div class="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
          <div class="flex items-center gap-2">
            <span class="font-black text-slate-700 uppercase">Toplu Durum Sayaçları:</span>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <span class="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 font-black">
              ✓ Kılınan: ${totalAttended} Vakit
            </span>
            <span class="px-2.5 py-1 rounded-xl bg-purple-100 text-purple-800 border border-purple-300 font-black">
              🟣 Takkesiz: ${totalTakkesiz}
            </span>
            <span class="px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 border border-rose-300 font-black">
              🔴 Namazda Yok: ${totalYok}
            </span>
            <span class="px-2.5 py-1 rounded-xl bg-teal-100 text-teal-800 border border-teal-300 font-bold">
              İzinli: ${totalIzinli}
            </span>
          </div>
        </div>

        <!-- 4. TÜM TALEBELERİN RAPOR TABLOSU -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div class="font-black text-xs sm:text-sm text-slate-800 flex items-center gap-2">
              <span>📋</span>
              <span>Tüm Talebelerin Namaz Devam Çizelgesi (${students.length} Talebe)</span>
            </div>
            <div class="text-xs text-slate-500 font-medium hidden sm:block">
              Detaylı gün gün durum için talebenin yanındaki <strong>"👁️ Detay"</strong> butonuna tıklayınız.
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr class="bg-slate-900 text-white text-xs border-b border-slate-800">
                  <th class="p-3.5 font-black w-48 sm:w-56 sticky left-0 bg-slate-900 z-10 shadow-r">
                    TALEBE BİLGİSİ
                  </th>
                  ${prayers.map(p => `
                    <th class="p-3 text-center font-black w-24 border-l border-slate-800">
                      ${p}
                    </th>
                  `).join('')}
                  <th class="p-3 text-center font-black w-36 border-l border-slate-800">
                    DURUM DAĞILIMI
                  </th>
                  <th class="p-3 text-center font-black w-28 border-l border-slate-800 bg-slate-950 text-emerald-400">
                    DEVAM %
                  </th>
                  <th class="p-3 text-center font-black w-28 border-l border-slate-800">
                    GÜNLÜK DETAY
                  </th>
                </tr>
              </thead>

              <tbody class="divide-y divide-slate-100 text-xs">
                ${students.length === 0 ? `
                  <tr>
                    <td colspan="9" class="p-10 text-center text-slate-400">
                      Seçilen kriterlere uygun talebe bulunamadı.
                    </td>
                  </tr>
                ` : students.map((st, idx) => {
                  const rep = window.Store.getPrayerReportForStudent(st.id, range.dates);
                  const rateColor = this.getRateColor(rep.attendanceRate);

                  return `
                    <tr class="hover:bg-slate-50/80 transition">
                      <!-- Talebe -->
                      <td class="p-3 sm:p-3.5 sticky left-0 bg-white hover:bg-slate-50 z-10 shadow-r">
                        <div class="flex items-center gap-2.5">
                          <span class="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-black text-[10px] flex items-center justify-center shrink-0">
                            ${idx + 1}
                          </span>
                          <div class="truncate">
                            <div class="font-black text-slate-900 text-xs sm:text-sm truncate">
                              ${st.firstName} ${st.lastName}
                            </div>
                            <div class="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              <span class="font-bold text-slate-500">${st.className || '-'}</span>
                              <span>•</span>
                              <span class="font-mono">No: ${st.studentNo}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <!-- 5 Vakit Sayıları (Katılım / Toplam) -->
                      ${prayers.map(p => {
                        const pData = rep.prayerStats[p];
                        const attended = pData.VAR + pData.TAKKESIZ + pData.GEC;
                        const totalDay = range.dates.length - pData.IZINLI;
                        const pRate = totalDay > 0 ? Math.round((attended / totalDay) * 100) : 100;
                        const col = pRate >= 90 ? 'text-emerald-700' : (pRate >= 75 ? 'text-amber-700' : 'text-rose-700');

                        return `
                          <td class="p-2.5 text-center border-l border-slate-100">
                            <div class="font-black ${col}">${attended} / ${totalDay}</div>
                            <div class="text-[10px] text-slate-400 font-bold">%${pRate}</div>
                          </td>
                        `;
                      }).join('')}

                      <!-- Durum Dağılımı -->
                      <td class="p-2.5 text-center border-l border-slate-100">
                        <div class="flex items-center justify-center gap-1 text-[11px]">
                          <span class="text-emerald-700 font-black" title="Var">${rep.overallCounts.VAR}V</span>
                          <span class="text-purple-700 font-black" title="Takkesiz">${rep.overallCounts.TAKKESIZ}T</span>
                          <span class="text-amber-600 font-black" title="Geç">${rep.overallCounts.GEC}G</span>
                          <span class="text-rose-600 font-black" title="Yok">${rep.overallCounts.YOK}Y</span>
                        </div>
                      </td>

                      <!-- Devam Yüzdesi -->
                      <td class="p-2.5 text-center border-l border-slate-100 bg-slate-50/50">
                        <span class="px-2.5 py-1 rounded-xl font-black text-xs border ${rateColor} shadow-2xs">
                          %${rep.attendanceRate}
                        </span>
                      </td>

                      <!-- Günlük Detay Butonu -->
                      <td class="p-2.5 text-center border-l border-slate-100">
                        <button type="button" onclick="window.AttendanceModule.openStudentDetailModal('${st.id}')"
                          class="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] rounded-xl transition shadow-2xs">
                          👁️ Detay
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 5. ÖĞRENCİ GÜNLÜK 5 VAKİT DETAY MODALI -->
      ${this.renderStudentDetailModal(range)}
    `;
  },

  // Modal: Seçilen Öğrencinin Gün Gün 5 Vakit Namaz Durumu
  renderStudentDetailModal(range) {
    if (!this.reportModalStudentId) return '';

    const st = window.Store.getStudentById(this.reportModalStudentId);
    if (!st) return '';

    const rep = window.Store.getPrayerReportForStudent(st.id, range.dates);
    const prayers = ['Sabah', 'Öğle', 'İkindi', 'Akşam', 'Yatsı'];

    return `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
          <!-- Modal Başlığı -->
          <div class="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black flex items-center justify-center text-lg shadow-sm">
                🕌
              </div>
              <div>
                <h3 class="font-black text-base text-white leading-tight">
                  ${st.firstName} ${st.lastName}
                </h3>
                <p class="text-xs text-slate-300 mt-0.5">
                  ${st.className} • No: ${st.studentNo} • ${this.reportPeriod === 'haftalik' ? 'Haftalık 5 Vakit Detayı' : 'Aylık 5 Vakit Detayı'}
                </p>
              </div>
            </div>
            <button onclick="window.AttendanceModule.closeStudentDetailModal()" 
              class="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-base font-bold transition">
              ✕
            </button>
          </div>

          <!-- Modal İstatistik Özeti -->
          <div class="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-600">Devam Başarısı:</span>
              <span class="px-2.5 py-0.5 rounded-lg font-black text-xs border ${this.getRateColor(rep.attendanceRate)}">
                %${rep.attendanceRate}
              </span>
            </div>
            <div class="flex items-center gap-2 text-[11px]">
              <span class="text-emerald-700 font-bold">${rep.overallCounts.VAR} Var</span> •
              <span class="text-purple-700 font-bold">${rep.overallCounts.TAKKESIZ} Takkesiz</span> •
              <span class="text-amber-600 font-bold">${rep.overallCounts.GEC} Geç</span> •
              <span class="text-rose-600 font-bold">${rep.overallCounts.YOK} Yok</span>
            </div>
          </div>

          <!-- Gün Gün 5 Vakit Tablosu -->
          <div class="flex-1 overflow-y-auto p-4 space-y-2">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                    <th class="p-2.5">TARİH & GÜN</th>
                    ${prayers.map(p => `<th class="p-2.5 text-center">${p}</th>`).join('')}
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${range.dates.map(dStr => {
                    const dayName = this.getDayName(dStr);
                    return `
                      <tr class="hover:bg-slate-50">
                        <td class="p-2.5 font-bold text-slate-800">
                          <div>${dStr}</div>
                          <div class="text-[10px] text-slate-400">${dayName}</div>
                        </td>
                        ${prayers.map(p => {
                          const stCode = rep.grid[dStr] ? rep.grid[dStr][p] : 'VAR';
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

          <!-- Modal Alt Kapat & WhatsApp Butonları -->
          <div class="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
            <button type="button" onclick="window.AttendanceModule.sendWhatsAppAttendanceReport('${st.id}')"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer">
              <span>📲</span>
              <span>Veliye WhatsApp Karnesi Gönder</span>
            </button>
            <button onclick="window.AttendanceModule.closeStudentDetailModal()" 
              class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition cursor-pointer">
              Kapat
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // --- Yönetici Canlı Vakit Denetim Şeridi HTML Oluşturucu (5 Vakit ve Yoklamayı Alan Hesap) ---
  renderPrayerAuditPanelHtml(prayerSummary, dayName) {
    if (this.currentCategory !== 'namaz' || !prayerSummary) return '';

    return `
      <div class="p-3 sm:p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-2.5 animate-fade-in">
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div class="flex items-center gap-2">
            <span class="text-sm">🕌</span>
            <span class="font-black text-slate-800 uppercase tracking-wide">Yönetici Vakit Denetim Paneli:</span>
            <span class="text-[11px] text-slate-500 font-bold">(${dayName}, ${this.currentDate})</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
              prayerSummary.isFullyCompleted
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : (prayerSummary.totalTakenCount > 0 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-rose-100 text-rose-800 border-rose-300')
            }">
              ${prayerSummary.totalTakenCount} / 5 Vakit Alındı ${prayerSummary.isFullyCompleted ? '🎉' : ''}
            </span>
          </div>
        </div>

        <!-- 5 Vakit Durum Kartları (Tıklanabilir Hızlı Geçiş & Alan Hesap Rozeti) -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          ${this.prayerTimes.map(p => {
            const pData = prayerSummary.summary[p.name];
            const isTaken = pData && pData.isTaken;
            const isCurrent = this.currentPrayer === p.name;
            const timeStr = pData && pData.lastRecordedAt ? new Date(pData.lastRecordedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
            const recUser = (pData && pData.recordedBy) ? pData.recordedBy : '';
            
            return `
              <div onclick="window.AttendanceModule.setPrayer('${p.name}')" 
                class="p-2.5 rounded-xl border transition cursor-pointer select-none flex flex-col justify-between ${
                  isCurrent 
                    ? 'ring-2 ring-emerald-500 bg-white shadow-xs' 
                    : 'bg-white hover:bg-slate-100/70 border-slate-200'
                }"
                title="${p.name} Namazı yoklamasına geç${recUser ? ` • Alan: ${recUser}` : ''}">
                <div>
                  <div class="flex items-center justify-between">
                    <span class="font-black text-slate-800 flex items-center gap-1">
                      <span>${p.icon}</span> <span>${p.name}</span>
                    </span>
                    ${isTaken ? `
                      <span class="w-4 h-4 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shadow-2xs">✓</span>
                    ` : `
                      <span class="w-4 h-4 rounded-full bg-slate-200 text-slate-500 font-bold text-[10px] flex items-center justify-center">⏳</span>
                    `}
                  </div>

                  <div class="mt-1.5">
                    ${isTaken ? `
                      <div class="font-black text-emerald-700 text-[11px] flex items-center gap-1">
                        <span>Alındı</span>
                        <span class="text-slate-400 font-normal">(${pData.totalRecorded} T.)</span>
                      </div>
                      <div class="text-[10px] text-slate-500 mt-0.5 font-medium truncate">
                        ${pData.counts.VAR} Var${pData.counts.YOK > 0 ? `, <strong class="text-rose-600">${pData.counts.YOK} Yok</strong>` : ''}${timeStr ? ` • ${timeStr}` : ''}
                      </div>
                    ` : `
                      <div class="font-bold text-amber-700 text-[11px]">Alınmadı</div>
                      <div class="text-[10px] text-slate-400 mt-0.5">Henüz girilmedi</div>
                    `}
                  </div>
                </div>

                ${isTaken ? `
                  <div class="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1 text-[10px] ${recUser ? 'text-indigo-700 bg-indigo-50/80 border border-indigo-100' : 'text-slate-500 bg-slate-50 border border-slate-100'} px-1.5 py-0.5 rounded-lg truncate" title="Yoklamayı Alan Yetkili: ${recUser || 'Sistem Kaydı'}">
                    <span class="shrink-0">${recUser ? '👤' : '📝'}</span>
                    <span class="truncate font-bold">${recUser || 'Sistem Kaydı'}</span>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  renderPrayerAuditPanel() {
    const container = document.getElementById('prayer-audit-panel-container');
    if (!container || this.currentCategory !== 'namaz') return;
    const dayName = this.getDayName(this.currentDate);
    const prayerSummary = (window.Store && typeof window.Store.getDailyPrayerAttendanceSummary === 'function')
      ? window.Store.getDailyPrayerAttendanceSummary(this.currentDate)
      : null;
    container.innerHTML = this.renderPrayerAuditPanelHtml(prayerSummary, dayName);
  },

  // --- 2. GÜNLÜK YOKLAMA ALMA GÖRÜNÜMÜ ---
  renderDailyYoklamaView(container) {
    const classes = window.Store.getClasses();
    const dayName = this.getDayName(this.currentDate);
    const prayerSummary = (this.currentCategory === 'namaz' && window.Store && typeof window.Store.getDailyPrayerAttendanceSummary === 'function')
      ? window.Store.getDailyPrayerAttendanceSummary(this.currentDate)
      : null;
    this.loadDailyDraft();

    container.innerHTML = `
      <div class="space-y-4 animate-fade-in max-w-4xl mx-auto">
        <!-- 2. Filtre & Kontrol Kartı -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
          <!-- Üst Satır: Tarih & Gün Adı & 5 Vakit Namaz Butonları -->
          <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div class="space-y-1.5 w-full">
              <div class="flex items-center gap-2">
                <span class="text-xs font-black text-slate-800 uppercase tracking-wide">
                  ${this.currentCategory === 'namaz' ? 'YOKLAMA TARİHİ & NAMAZ VAKTİ:' : (this.currentCategory === 'yatak' ? 'YATAK YOKLAMA TARİHİ:' : 'OKUL DÖNÜŞÜ TARİHİ:')}
                </span>
                ${this.currentCategory === 'namaz' ? `
                  <span class="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                    ${this.currentPrayer} Namazı
                  </span>
                ` : ''}
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <input type="date" id="att-date-picker" value="${this.currentDate}" 
                  class="px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition shadow-2xs"
                  onchange="window.AttendanceModule.setDate(this.value)">

                <div class="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs">
                  <span>📅</span>
                  <span>${dayName}</span>
                </div>

                ${this.currentCategory === 'namaz' ? `
                  <div class="inline-flex flex-wrap p-1 bg-slate-100 rounded-2xl border border-slate-200 gap-1 shadow-inner">
                    ${this.prayerTimes.map(p => {
                      const isSelected = this.currentPrayer === p.name;
                      const pData = prayerSummary ? prayerSummary.summary[p.name] : null;
                      const isTaken = pData && pData.isTaken;
                      const count = pData ? pData.totalRecorded : 0;
                      const recUser = (pData && pData.recordedBy) ? pData.recordedBy : '';
                      return `
                        <button type="button" onclick="window.AttendanceModule.setPrayer('${p.name}')"
                          class="py-1.5 px-2.5 sm:px-3 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected 
                              ? 'bg-emerald-600 text-white shadow-md scale-102 ring-2 ring-emerald-400' 
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                          }"
                          title="${p.name} Namazı • ${isTaken ? `Alındı (${count} Talebe)${recUser ? ` • Alan: ${recUser}` : ''}` : 'Henüz Alınmadı'}">
                          <span>${p.icon}</span>
                          <span>${p.name}</span>
                          <span class="text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            isSelected 
                              ? 'bg-white/25 text-white' 
                              : (isTaken ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200/80 text-slate-500 border border-slate-300/60')
                          }">
                            ${isTaken ? `✓ ${count}` : '⏳'}
                          </span>
                        </button>
                      `;
                    }).join('')}
                  </div>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Yönetici Canlı Vakit Denetim Şeridi (Günün 5 Vakit Özeti & Durum Kartları) -->
          <div id="prayer-audit-panel-container">
            ${this.renderPrayerAuditPanelHtml(prayerSummary, dayName)}
          </div>

          ${this.currentCategory === 'yatak' ? `
            <div class="p-3 bg-slate-50/90 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs animate-fade-in">
              <div class="flex items-center gap-2">
                <span>🛏️</span>
                <span class="font-black text-slate-800">Günün Yatak & Oda Kontrolü Durumu:</span>
                <span class="text-slate-500 font-bold">(${dayName}, ${this.currentDate})</span>
              </div>
              ${(() => {
                const yRecs = window.Store.getAttendanceByCategory(this.currentDate, 'yatak', 'yatak');
                const isTaken = yRecs && yRecs.length > 0;
                const recUsers = isTaken ? Array.from(new Set(yRecs.map(r => r.recordedBy).filter(Boolean))).join(', ') : null;
                return isTaken ? `
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-black flex items-center gap-1">
                      <span>✓</span> <span>Bugünün Yatak Yoklaması Alındı (${yRecs.length} Talebe)</span>
                    </span>
                    ${recUsers ? `
                      <span class="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center gap-1 shadow-2xs" title="Yoklamayı Alan Yetkili">
                        <span>👤</span> <span>${recUsers}</span>
                      </span>
                    ` : ''}
                  </div>
                ` : `
                  <span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-black flex items-center gap-1">
                    <span>⏳</span> <span>Henüz Yatak Yoklaması Girilmedi</span>
                  </span>
                `;
              })()}
            </div>
          ` : ''}

          ${this.currentCategory === 'okul_donusu' ? `
            <div class="p-3 bg-slate-50/90 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs animate-fade-in">
              <div class="flex items-center gap-2">
                <span>🎒</span>
                <span class="font-black text-slate-800">Günün Okul Dönüşü Yoklama Durumu:</span>
                <span class="text-slate-500 font-bold">(${dayName}, ${this.currentDate})</span>
              </div>
              ${(() => {
                const oRecs = window.Store.getAttendanceByCategory(this.currentDate, 'okul_donusu', 'okul_donusu');
                const isTaken = oRecs && oRecs.length > 0;
                const recUsers = isTaken ? Array.from(new Set(oRecs.map(r => r.recordedBy).filter(Boolean))).join(', ') : null;
                return isTaken ? `
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-black flex items-center gap-1">
                      <span>✓</span> <span>Bugünün Okul Dönüşü Yoklaması Alındı (${oRecs.length} Talebe)</span>
                    </span>
                    ${recUsers ? `
                      <span class="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center gap-1 shadow-2xs" title="Yoklamayı Alan Yetkili">
                        <span>👤</span> <span>${recUsers}</span>
                      </span>
                    ` : ''}
                  </div>
                ` : `
                  <span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-black flex items-center gap-1">
                    <span>⏳</span> <span>Henüz Okul Dönüşü Yoklaması Girilmedi</span>
                  </span>
                `;
              })()}
            </div>
          ` : ''}

          <!-- Alt Satır: Çoklu Sınıf Filtresi & Arama -->
          <div class="space-y-3 pt-1">
            <div>
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>SINIF FİLTRESİ (1'den Fazla Seçebilirsiniz):</span>
                ${this.selectedClasses.length > 0 ? `
                  <span class="text-emerald-600 font-semibold cursor-pointer hover:underline" onclick="window.AttendanceModule.toggleAllClasses()">
                    Filtreyi Temizle
                  </span>
                ` : ''}
              </div>
              <div class="flex flex-wrap items-center gap-1.5">
                <button type="button" onclick="window.AttendanceModule.toggleAllClasses()"
                  class="px-3 py-1.5 rounded-xl text-xs font-black transition ${
                    this.selectedClasses.length === 0 
                      ? 'bg-slate-900 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }">
                  Tüm Sınıflar
                </button>
                ${classes.map(c => {
                  const isChecked = this.selectedClasses.includes(c);
                  return `
                    <button type="button" onclick="window.AttendanceModule.toggleClass('${c}')"
                      class="px-3 py-1.5 rounded-xl text-xs font-black transition border flex items-center gap-1.5 ${
                        isChecked 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }">
                      <span>${isChecked ? '✓' : '+'}</span>
                      <span>${c}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div>
                <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ÖĞRENCİ ARA</label>
                <input type="text" placeholder="${this.currentCategory === 'yatak' ? 'İsim veya Oda ara...' : 'Öğrenci adı ara...'}" 
                  value="${this.searchQuery}"
                  class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:border-emerald-500 focus:outline-none w-48 sm:w-64 shadow-2xs"
                  oninput="window.AttendanceModule.setSearchQuery(this.value)">
              </div>

              <div class="flex items-center gap-2 flex-wrap">
                <button type="button" onclick="window.AttendanceModule.saveAllCurrentView()"
                  class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition cursor-pointer hover:scale-102 active:scale-95"
                  title="Bu yoklamayı tüm talebeler için kesinleştirir ve puanları günceller">
                  <span>✓</span>
                  <span>Yoklamayı Tamamla (Tümünü Kaydet)</span>
                </button>
                <button type="button" onclick="window.AttendanceModule.markAllAsDefault()"
                  class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300/80 transition cursor-pointer hover:scale-102 active:scale-95"
                  title="Tüm talebeleri tek tıkla varsayılan yapar">
                  <span>⚡ Tümünü ${this.currentCategory === 'namaz' ? 'Var Yap' : (this.currentCategory === 'yatak' ? 'İyi Yap' : 'Geldi Yap')}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Aktif Kategori İstatistik Özeti -->
          <div id="attendance-summary-bar" class="pt-2 border-t border-slate-100"></div>
        </div>

        <!-- 3. Öğrenci Yoklama Listesi -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span class="text-xs font-black text-slate-700 uppercase tracking-wider">
              ${this.currentCategory === 'yatak' ? 'Öğrenci & Oda Bilgisi' : 'Öğrenci Adı Soyadı'}
            </span>
            <span class="text-xs font-black text-slate-700 uppercase tracking-wider">
              ${this.currentCategory === 'namaz' ? 'Namaz Durumu' : (this.currentCategory === 'yatak' ? 'Yatak Durumu' : 'Dönüş Durumu')}
            </span>
          </div>

          <div id="attendance-students-container" class="divide-y divide-slate-100 text-sm"></div>
        </div>
      </div>
    `;

    this.renderSummary();
    this.renderStudentRows();
  },

  renderSummary() {
    const summaryContainer = document.getElementById('attendance-summary-bar');
    if (!summaryContainer) return;

    const allStudents = this.getAllStudentsForCurrentView();
    const currentStatuses = this.statusConfigs[this.currentCategory] || this.statusConfigs.namaz;
    const counts = {};
    currentStatuses.forEach(st => { counts[st.code] = 0; });
    let gecTakkesizCount = 0;

    allStudents.forEach(s => {
      const def = this.getDefaultStatus(s);
      const draft = this.draftAttendance[s.id];
      const status = draft ? draft.status : def;
      if (status === 'GEC_TAKKESIZ') {
        gecTakkesizCount++;
        counts['GEC'] = (counts['GEC'] || 0) + 1;
        counts['TAKKESIZ'] = (counts['TAKKESIZ'] || 0) + 1;
      } else if (counts[status] !== undefined) {
        counts[status]++;
      } else {
        counts[def] = (counts[def] || 0) + 1;
      }
    });

    const yokCount = counts['YOK'] || 0;
    const isNamaz = this.currentCategory === 'namaz';

    summaryContainer.innerHTML = `
      <div class="space-y-2.5">
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="font-black text-slate-600 mr-1 uppercase text-[11px]">DURUM FİLTRESİ:</span>
          
          <!-- Tümü Butonu -->
          <button type="button" onclick="window.AttendanceModule.setStatusFilter('ALL')"
            class="px-3 py-1.5 rounded-xl font-black text-xs transition border cursor-pointer ${
              this.statusFilter === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }">
            Tümü (${allStudents.length})
          </button>

          <!-- Durum Butonları (Her biri tıklanabilir filtre) -->
          ${currentStatuses.map(st => {
            const isActive = this.statusFilter === st.code;
            const isYokBtn = st.code === 'YOK';
            const count = counts[st.code] || 0;
            return `
              <button type="button" onclick="window.AttendanceModule.setStatusFilter('${st.code}')"
                class="px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                  isActive 
                    ? 'ring-2 ring-offset-1 shadow-md scale-105 font-black' 
                    : 'hover:opacity-85'
                } ${isYokBtn && count > 0 && !isActive ? 'ring-2 ring-rose-300 animate-pulse' : ''}"
                style="background-color: ${isActive ? st.bg : st.bg + '18'}; color: ${isActive ? '#ffffff' : st.bg}; border-color: ${st.border}${isActive ? 'ff' : '40'};"
                title="${st.label} durumundaki talebeleri filtrele">
                <span>${isYokBtn ? '🔴' : (st.code === 'VAR' ? '🟢' : (st.code === 'GEC' ? '🟡' : (st.code === 'TAKKESIZ' ? '🟣' : '🔵')))}</span>
                <span>${st.label}:</span>
                <span class="font-black">${count}</span>
              </button>
            `;
          }).join('')}

          ${isNamaz && gecTakkesizCount > 0 ? `
            <button type="button" onclick="window.AttendanceModule.setStatusFilter('GEC_TAKKESIZ')"
              class="px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border border-fuchsia-300 transition cursor-pointer ${
                this.statusFilter === 'GEC_TAKKESIZ'
                  ? 'bg-fuchsia-600 text-white shadow-md ring-2 ring-fuchsia-300'
                  : 'bg-fuchsia-50 text-fuchsia-900 hover:bg-fuchsia-100'
              }">
              <span>⚡ Geç + Takkesiz:</span>
              <span class="font-black">${gecTakkesizCount}</span>
            </button>
          ` : ''}

          <!-- OLMAYANLARI LİSTELE VE İNCELE BUTONU -->
          ${(isNamaz && yokCount > 0) ? `
            <button type="button" onclick="window.AttendanceModule.openAbsentListModal()"
              class="ml-auto px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition cursor-pointer hover:scale-105 active:scale-95"
              title="Namazda olmayan talebelerin oda ve hoca listesini aç">
              <span>🚨</span>
              <span>Olmayanları İncele (${yokCount}) ↗</span>
            </button>
          ` : (isNamaz ? `
            <span class="ml-auto text-emerald-700 font-bold text-[11px] flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
              <span>✓</span> <span>Tüm Talebeler Namazda Mevcut</span>
            </span>
          ` : '')}
        </div>

        ${this.statusFilter !== 'ALL' ? `
          <div class="flex items-center justify-between p-2 rounded-xl bg-slate-900 text-white text-xs font-bold animate-fade-in">
            <span class="flex items-center gap-2">
              <span>🔍 Aktif Filtre:</span>
              <span class="px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-black">
                ${this.statusFilter === 'YOK' ? '🔴 SADECE NAMAZDA OLMAYANLAR (YOK)' : this.statusFilter}
              </span>
              <span class="text-[11px] text-slate-300 font-normal">(${this.getFilteredStudents().length} Talebe Listeleniyor)</span>
            </span>
            <button type="button" onclick="window.AttendanceModule.setStatusFilter('ALL')" 
              class="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-black transition cursor-pointer">
              ✕ Filtreyi Kaldır (Tümünü Göster)
            </button>
          </div>
        ` : ''}
      </div>
    `;
  },

  renderStudentRows() {
    const container = document.getElementById('attendance-students-container');
    if (!container) return;

    const students = this.getFilteredStudents();
    const currentStatuses = this.statusConfigs[this.currentCategory] || this.statusConfigs.namaz;
    const defaultStatus = this.getDefaultStatus();

    if (students.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-slate-400 text-sm font-semibold space-y-2">
          <div>Seçilen kriter ve duruma uygun öğrenci bulunamadı.</div>
          ${this.statusFilter !== 'ALL' ? `
            <button type="button" onclick="window.AttendanceModule.setStatusFilter('ALL')"
              class="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition cursor-pointer">
              Tüm Talebeleri Göster
            </button>
          ` : ''}
        </div>
      `;
      return;
    }

    container.innerHTML = students.map(s => {
      const defaultStatus = this.getDefaultStatus(s);
      const draft = this.draftAttendance[s.id] || { status: defaultStatus };
      const currentStatus = draft.status || defaultStatus;
      const isYok = (currentStatus === 'YOK');
      const isOkulYok = (this.currentCategory === 'okul_donusu' && currentStatus === 'GELMEDI');
      const isHighlightedAbsent = isYok || isOkulYok;

      return `
        <div class="p-3 sm:px-5 hover:bg-slate-50/90 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 ${
          isHighlightedAbsent ? 'bg-rose-50/60 border-l-4 border-rose-500' : ''
        }">
          <!-- 1. Öğrenci Bilgisi (Tıklanabilir) -->
          <div class="min-w-0 cursor-pointer group" onclick="window.AttendanceModule.openStudentQuickModal('${s.id}')" title="Talebe detayları ve hızlı durum için tıkla">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-black text-slate-900 text-sm sm:text-base leading-tight truncate group-hover:text-emerald-700 transition">
                ${s.firstName} ${s.lastName}
              </span>
              <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] shrink-0">
                ${s.className}
              </span>
              ${this.currentCategory === 'namaz' && currentStatus === 'OKULDA' ? `
                <span class="px-2 py-0.5 rounded-md bg-sky-100 text-sky-900 border border-sky-300 font-black text-[10px] shrink-0 flex items-center gap-1 shadow-2xs">
                  <span>🎒</span> <span>OKULDA</span>
                </span>
              ` : ''}
              ${this.currentCategory === 'namaz' && isYok ? `
                <span class="px-2 py-0.5 rounded-md bg-rose-600 text-white font-black text-[10px] shrink-0 flex items-center gap-1 shadow-2xs animate-pulse">
                  <span>🔴</span> <span>NAMAZDA YOK</span>
                </span>
              ` : ''}
              ${this.currentCategory === 'okul_donusu' && isOkulYok ? `
                <span class="px-2 py-0.5 rounded-md bg-rose-600 text-white font-black text-[10px] shrink-0 flex items-center gap-1 shadow-2xs animate-pulse">
                  <span>🎒</span> <span>GELMEDİ</span>
                </span>
              ` : ''}
              ${this.currentCategory === 'namaz' && currentStatus === 'GEC_TAKKESIZ' ? `
                <span class="px-2 py-0.5 rounded-md bg-fuchsia-100 text-fuchsia-900 border border-fuchsia-300 font-black text-[10px] shrink-0 flex items-center gap-1 shadow-2xs">
                  <span>⚡</span> <span>Geç + Takkesiz</span>
                </span>
              ` : ''}
            </div>
            
            <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5">
              ${s.yatakhane ? `
                <span class="text-indigo-800 font-bold inline-flex items-center gap-0.5 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                  🛏️ ${s.yatakhane}
                </span>
              ` : ''}
              ${s.etutHocasi || s.dahiliHoca ? `
                <span class="text-slate-500">
                  👨‍🏫 ${s.etutHocasi || s.dahiliHoca}
                </span>
              ` : ''}
              ${s.parentPhone || s.fatherPhone ? `
                <span class="text-emerald-700 font-medium">
                  📞 ${s.parentPhone || s.fatherPhone}
                </span>
              ` : ''}
            </div>
          </div>

          <!-- 2. Kategoriye Özel Kelimeli Butonlar & WhatsApp -->
          <div class="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0">
            ${currentStatuses.map(st => {
              let isSelected = false;
              if (this.currentCategory === 'namaz') {
                if (st.code === 'GEC') {
                  isSelected = (currentStatus === 'GEC' || currentStatus === 'GEC_TAKKESIZ');
                } else if (st.code === 'TAKKESIZ') {
                  isSelected = (currentStatus === 'TAKKESIZ' || currentStatus === 'GEC_TAKKESIZ');
                } else {
                  isSelected = (currentStatus === st.code);
                }
              } else {
                isSelected = (currentStatus === st.code);
              }

              return `
                <button type="button" 
                  onclick="window.AttendanceModule.setStatus('${s.id}', '${st.code}')"
                  class="flex-1 sm:flex-none py-2 px-2.5 sm:px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    isSelected 
                      ? st.activeClass + ' scale-105' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/80'
                  }">
                  ${st.label}
                </button>
              `;
            }).join('')}

            <!-- WhatsApp Veli Bildirim Butonu -->
            <button type="button" 
              onclick="event.stopPropagation(); window.AttendanceModule.sendWhatsAppNotice('${s.id}')"
              class="p-2 sm:px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 transition text-xs font-bold flex items-center justify-center gap-1 shadow-2xs cursor-pointer shrink-0"
              title="Bu talebenin velisine WhatsApp bildirimi gönder">
              <span>📲</span>
              <span class="text-[10px] hidden md:inline">WhatsApp</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  // --- NAMAZDA OLMAYANLAR (ABSENT) MODALI ---
  openAbsentListModal() {
    const allStudents = this.getAllStudentsForCurrentView();
    const defaultStatus = this.getDefaultStatus();
    const absentStudents = allStudents.filter(s => {
      const draft = this.draftAttendance[s.id];
      const status = draft ? draft.status : defaultStatus;
      return status === 'YOK';
    });

    if (absentStudents.length === 0) {
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast('Harika! Bu namaz vaktinde kayıtlı tüm talebeler mevcuttur (Yok olan talebe bulunmuyor).', 'success');
      }
      return;
    }

    let modal = document.getElementById('absent-list-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'absent-list-modal';
      document.body.appendChild(modal);
    }

    this.renderAbsentModalContent(modal, absentStudents);
  },

  closeAbsentListModal() {
    const modal = document.getElementById('absent-list-modal');
    if (modal) {
      modal.innerHTML = '';
    }
  },

  renderAbsentModalContent(modalEl, absentStudents) {
    const dayName = this.getDayName(this.currentDate);
    const prayerLabel = this.currentCategory === 'namaz' ? `${this.currentPrayer} Namazı` : 'Yoklama';

    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl border border-rose-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
          
          <!-- Modal Başlığı -->
          <div class="p-4 sm:p-5 bg-gradient-to-r from-rose-700 via-rose-800 to-slate-900 text-white flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-2xl font-black shadow-inner border border-white/20 shrink-0">
                🚨
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-black text-base sm:text-lg text-white leading-tight">
                    Namazda Olmayan Talebeler (${absentStudents.length})
                  </h3>
                  <span class="px-2 py-0.5 rounded-md bg-rose-500 text-white font-black text-[10px] uppercase">YOK</span>
                </div>
                <p class="text-xs text-rose-100/90 mt-0.5 font-medium">
                  ${this.currentDate} ${dayName} • <strong>${prayerLabel}</strong>
                </p>
              </div>
            </div>
            <button type="button" onclick="window.AttendanceModule.closeAbsentListModal()" 
              class="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition cursor-pointer">
              ✕
            </button>
          </div>

          <!-- Bilgilendirme Çubuğu -->
          <div class="px-5 py-2.5 bg-rose-50 border-b border-rose-100 flex flex-wrap items-center justify-between gap-2 text-xs text-rose-900">
            <span class="font-bold flex items-center gap-1.5">
              <span>ℹ️</span>
              <span>Odalara gidilip talebe bulunduğunda tek tıkla durumu güncelleyebilirsiniz:</span>
            </span>
            <span class="font-black bg-white px-2 py-0.5 rounded-md border border-rose-200">
              Toplam: ${absentStudents.length} Talebe
            </span>
          </div>

          <!-- Olmayan Talebeler Kart Listesi -->
          <div class="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2.5 divide-y divide-slate-100">
            ${absentStudents.map((st, idx) => `
              <div class="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl hover:bg-slate-50 border border-slate-100 transition">
                <div class="flex items-start gap-3">
                  <span class="w-6 h-6 rounded-lg bg-rose-100 text-rose-800 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    ${idx + 1}
                  </span>
                  <div>
                    <div class="font-black text-slate-900 text-sm flex items-center gap-2">
                      <span>${st.firstName} ${st.lastName}</span>
                      <span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">${st.className}</span>
                      <span class="text-[10px] font-mono text-slate-400">No: ${st.studentNo}</span>
                    </div>

                    <div class="flex flex-wrap items-center gap-2 text-xs mt-1 text-slate-600">
                      ${st.yatakhane ? `
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-bold text-[11px] border border-indigo-100">
                          <span>🛏️</span>
                          <span>${st.yatakhane}</span>
                        </span>
                      ` : ''}
                      ${st.etutHocasi || st.dahiliHoca ? `
                        <span class="text-[11px] text-slate-500 font-medium">
                          👨‍🏫 Hoca: <strong>${st.etutHocasi || st.dahiliHoca}</strong>
                        </span>
                      ` : ''}
                      ${st.parentPhone || st.fatherPhone ? `
                        <a href="tel:${st.parentPhone || st.fatherPhone}" class="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:underline font-bold">
                          <span>📞</span>
                          <span>${st.parentPhone || st.fatherPhone}</span>
                        </a>
                      ` : ''}
                    </div>
                  </div>
                </div>

                <!-- Hızlı Durum Değiştirme Butonları -->
                <div class="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <button type="button" 
                    onclick="window.AttendanceModule.quickChangeStatus('${st.id}', 'VAR')"
                    class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                    title="Mescide geldi / Var yap">
                    <span>✓</span>
                    <span>Var</span>
                  </button>
                  <button type="button" 
                    onclick="window.AttendanceModule.quickChangeStatus('${st.id}', 'GEC')"
                    class="px-2 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                    title="Geç kaldı olarak işaretle">
                    <span>Geç</span>
                  </button>
                  <button type="button" 
                    onclick="window.AttendanceModule.quickChangeStatus('${st.id}', 'TAKKESIZ')"
                    class="px-2 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                    title="Takkesiz olarak işaretle">
                    <span>Takkesiz</span>
                  </button>
                  <button type="button" 
                    onclick="window.AttendanceModule.quickChangeStatus('${st.id}', 'IZINLI')"
                    class="px-2 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                    title="İzinli / Raporlu yap">
                    <span>İzinli</span>
                  </button>
                  <button type="button" 
                    onclick="window.AttendanceModule.sendWhatsAppNotice('${st.id}')"
                    class="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                    title="Bu talebenin velisine WhatsApp bildirimi gönder">
                    <span>📲</span>
                    <span>Veliye İlet</span>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Alt Çubuk: Kopyala, WhatsApp & Kapat -->
          <div class="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" onclick="window.AttendanceModule.copyAbsentList()"
                class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer">
                <span>📋</span>
                <span>Listeyi Kopyala</span>
              </button>
              <button type="button" onclick="window.AttendanceModule.shareAbsentListWhatsApp()"
                class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer">
                <span>💬</span>
                <span>WhatsApp'ta Paylaş</span>
              </button>
            </div>

            <button type="button" onclick="window.AttendanceModule.closeAbsentListModal()" 
              class="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-200/60 rounded-xl text-xs font-bold transition cursor-pointer">
              Kapat
            </button>
          </div>

        </div>
      </div>
    `;
  },

  quickChangeStatus(studentId, newStatusCode) {
    this.setStatus(studentId, newStatusCode);
    const modal = document.getElementById('absent-list-modal');
    if (modal) {
      const allStudents = this.getAllStudentsForCurrentView();
      const defaultStatus = this.getDefaultStatus();
      const absentStudents = allStudents.filter(s => {
        const draft = this.draftAttendance[s.id];
        const status = draft ? draft.status : defaultStatus;
        return status === 'YOK';
      });

      if (absentStudents.length === 0) {
        modal.innerHTML = `
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
            <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-4">
              <div class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl font-black mx-auto">
                ✓
              </div>
              <h3 class="font-black text-slate-900 text-lg">Tüm Talebeler Tamamlandı!</h3>
              <p class="text-xs text-slate-500">Namazda olmayan tüm talebeler mevcuda alındı. Listede yoklama eksiği kalmadı.</p>
              <button type="button" onclick="window.AttendanceModule.closeAbsentListModal()" 
                class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow transition cursor-pointer">
                Harika, Kapat
              </button>
            </div>
          </div>
        `;
      } else {
        this.renderAbsentModalContent(modal, absentStudents);
      }
    }
  },

  getFormattedAbsentText() {
    const allStudents = this.getAllStudentsForCurrentView();
    const defaultStatus = this.getDefaultStatus();
    const absentStudents = allStudents.filter(s => {
      const draft = this.draftAttendance[s.id];
      const status = draft ? draft.status : defaultStatus;
      return status === 'YOK';
    });

    const dayName = this.getDayName(this.currentDate);
    const prayerLabel = this.currentCategory === 'namaz' ? `${this.currentPrayer} Namazı` : 'Yoklama';

    let text = `🕌 Ömer Avniyel Akademi\n`;
    text += `📅 ${this.currentDate} ${dayName} • ${prayerLabel} Yoklaması\n`;
    text += `🚨 Namazda Olmayan Talebeler (${absentStudents.length} Talebe):\n\n`;

    absentStudents.forEach((st, idx) => {
      const room = st.yatakhane ? ` • Oda: ${st.yatakhane}` : '';
      const hoca = (st.etutHocasi || st.dahiliHoca) ? ` • Hoca: ${st.etutHocasi || st.dahiliHoca}` : '';
      text += `${idx + 1}. ${st.firstName} ${st.lastName} (${st.className || '-'}${room}${hoca})\n`;
    });

    text += `\nToplam: ${absentStudents.length} Talebe Yok.`;
    return text;
  },

  copyAbsentList() {
    const text = this.getFormattedAbsentText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        if (window.App && typeof window.App.showToast === 'function') {
          window.App.showToast('Namazda olmayanlar listesi kopyalandı! WhatsApp grubuna yapıştırabilirsiniz.', 'success');
        }
      }).catch(() => {
        if (window.App && typeof window.App.showToast === 'function') {
          window.App.showToast('Liste kopyalandı.', 'info');
        }
      });
    } else {
      alert(text);
    }
  },

  shareAbsentListWhatsApp() {
    const text = this.getFormattedAbsentText();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  },

  // --- TALEBEYE ÖZEL HIZLI BİLGİ VE DURUM DEĞİŞTİRME PENCERESİ ---
  openStudentQuickModal(studentId) {
    const st = window.Store.getStudentById(studentId);
    if (!st) return;

    const defaultStatus = this.getDefaultStatus();
    const draft = this.draftAttendance[st.id] || { status: defaultStatus };
    const currentStatus = draft.status || defaultStatus;
    const currentCfg = window.STATUS_CONFIG[currentStatus] || window.STATUS_CONFIG['VAR'];

    let modal = document.getElementById('student-quick-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'student-quick-modal';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4 animate-scale-up">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner text-white"
                style="background-color: ${currentCfg.bg};">
                ${currentStatus === 'YOK' ? '🔴' : (currentStatus === 'VAR' ? '🟢' : '🕌')}
              </div>
              <div>
                <h3 class="font-black text-slate-900 text-base leading-tight">${st.firstName} ${st.lastName}</h3>
                <p class="text-xs text-slate-500">${st.className} • No: ${st.studentNo}</p>
              </div>
            </div>
            <button type="button" onclick="document.getElementById('student-quick-modal').innerHTML=''" 
              class="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition font-bold text-sm cursor-pointer">✕</button>
          </div>

          <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-slate-500 font-bold">Mevcut Durumu:</span>
              <span class="px-2.5 py-1 rounded-lg text-white font-black text-xs" style="background-color: ${currentCfg.bg};">
                ${currentCfg.label}
              </span>
            </div>
            ${st.yatakhane ? `
              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-bold">Yatakhane / Oda:</span>
                <span class="font-black text-indigo-950">🛏️ ${st.yatakhane}</span>
              </div>
            ` : ''}
            ${st.etutHocasi || st.dahiliHoca ? `
              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-bold">Etüt & Dahili Hoca:</span>
                <span class="font-bold text-slate-800">${st.etutHocasi || st.dahiliHoca}</span>
              </div>
            ` : ''}
            ${st.parentPhone || st.fatherPhone ? `
              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-bold">Veli Telefonu:</span>
                <a href="tel:${st.parentPhone || st.fatherPhone}" class="font-mono font-bold text-emerald-700 hover:underline">
                  📞 ${st.parentPhone || st.fatherPhone}
                </a>
              </div>
            ` : ''}
          </div>

          <!-- Durumu Değiştir Butonları -->
          <div class="space-y-1.5">
            <label class="block text-[11px] font-black uppercase text-slate-500">Yoklama Durumunu Değiştir:</label>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" onclick="window.AttendanceModule.setStatus('${st.id}', 'VAR'); document.getElementById('student-quick-modal').innerHTML='';"
                class="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow transition flex items-center justify-center gap-1.5 cursor-pointer">
                <span>✓</span> <span>Var (Kıldı)</span>
              </button>
              <button type="button" onclick="window.AttendanceModule.setStatus('${st.id}', 'YOK'); document.getElementById('student-quick-modal').innerHTML='';"
                class="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow transition flex items-center justify-center gap-1.5 cursor-pointer">
                <span>✕</span> <span>Yok (Katılmadı)</span>
              </button>
              <button type="button" onclick="window.AttendanceModule.setStatus('${st.id}', 'GEC'); document.getElementById('student-quick-modal').innerHTML='';"
                class="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow transition flex items-center justify-center gap-1.5 cursor-pointer">
                <span>⏳</span> <span>Geç Kaldı</span>
              </button>
              <button type="button" onclick="window.AttendanceModule.setStatus('${st.id}', 'TAKKESIZ'); document.getElementById('student-quick-modal').innerHTML='';"
                class="py-2 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black shadow transition flex items-center justify-center gap-1.5 cursor-pointer">
                <span>🟣</span> <span>Takkesiz</span>
              </button>
              <button type="button" onclick="window.AttendanceModule.setStatus('${st.id}', 'IZINLI'); document.getElementById('student-quick-modal').innerHTML='';"
                class="col-span-2 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow transition flex items-center justify-center gap-1.5 cursor-pointer">
                <span>📋</span> <span>İzinli / Raporlu</span>
              </button>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-100 flex justify-end">
            <button type="button" onclick="document.getElementById('student-quick-modal').innerHTML=''"
              class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer">
              Kapat
            </button>
          </div>
        </div>
      </div>
    `;
  }
};
