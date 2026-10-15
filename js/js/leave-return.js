/**
 * leave-return.js - Haftalık İzin Dönüşü Takip Modülü
 * - 5 ve 6. Sınıflar: Resmi dönüş Pazartesi sabahı (08:00). Pazar günü saat kaçta gelirlerse gelsinler ERKEN sayılır (0 dk telafi).
 * - 7 ve 8. Sınıflar: Resmi dönüş Pazar akşamı (varsayılan 18:00).
 * - Standart Pazar ve Pazartesi saatleri arayüzden kolayca değiştirilebilir.
 * - "⚡ Şimdi Geldi" ve "🏷️ İzinli" mazeret butonları (Yarın Sabah, 30 dk, 1 saat, 1.5 saat, 2 saat).
 * - İzinli olanlar: 0 Puan alır, 0 Telafi süresi alır.
 * - Geç kalanlara dakika başına 3 katı (3x) izne ek telafi süresi.
 */

window.LeaveReturnModule = {
  viewMode: 'daily', // 'daily' | 'monthly'
  currentMonth: new Date().toISOString().substring(0, 7), // '2026-09'
  currentDate: new Date().toISOString().split('T')[0],
  expectedSundayTime: localStorage.getItem('yoklama_expected_sunday_time') || localStorage.getItem('yoklama_expected_return_time') || '18:00',
  expectedMondayTime: localStorage.getItem('yoklama_expected_monday_time') || '08:00',
  expectedReturnTime: localStorage.getItem('yoklama_expected_sunday_time') || localStorage.getItem('yoklama_expected_return_time') || '18:00',
  selectedClasses: [],
  statusFilter: 'ALL', // 'ALL' | 'GEC' | 'GELMEDI' | 'IZINLI' | 'ERKEN' | 'VAKTINDE'
  monthlyStatusFilter: 'ALL', // 'ALL' | 'GEC' | 'IZINLI' | 'VAKTINDE'
  searchQuery: '',
  activeExcuseStudentId: null,
  monthlyModalStudentId: null,

  init() {
    this.refreshSettings();
    this.renderView();
  },

  refreshSettings() {
    if (window.Store) {
      const s = window.Store.getSettings();
      if (s.expectedSundayTime) {
        this.expectedSundayTime = s.expectedSundayTime;
        this.expectedReturnTime = s.expectedSundayTime;
      }
      if (s.expectedMondayTime) {
        this.expectedMondayTime = s.expectedMondayTime;
      }
      if (s.leaveReturnDate) {
        this.currentDate = s.leaveReturnDate;
      }
    }
  },

  // 0: Pazar, 1: Pazartesi, 2: Salı, ...
  getDayOfWeek(dateStr) {
    if (!dateStr) return -1;
    const d = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T12:00:00');
    return isNaN(d) ? -1 : d.getDay();
  },

  getDayName(dateStr) {
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const idx = this.getDayOfWeek(dateStr);
    return idx >= 0 ? days[idx] : '';
  },

  getPreviousDayString(dateStr) {
    const d = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  },

  getNextDayString(dateStr) {
    const d = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  },

  setDate(dateStr) {
    if (!dateStr) return;
    this.currentDate = dateStr;
    if (window.Store) {
      window.Store.saveSettings({ leaveReturnDate: dateStr });
    }
    this.renderView();
  },

  setToday() {
    this.setDate(new Date().toISOString().split('T')[0]);
  },

  prevDay() {
    this.setDate(this.getPreviousDayString(this.currentDate));
  },

  nextDay() {
    this.setDate(this.getNextDayString(this.currentDate));
  },

  // --- Aylık Görünüm ve Navigasyon Metodları ---
  setViewMode(mode) {
    this.viewMode = mode;
    this.renderView();
  },

  setMonth(monthStr) {
    if (!monthStr) return;
    this.currentMonth = monthStr;
    this.renderView();
  },

  prevMonth() {
    const parts = this.currentMonth.split('-').map(Number);
    let y = parts[0];
    let m = parts[1] - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    this.setMonth(`${y}-${String(m).padStart(2, '0')}`);
  },

  nextMonth() {
    const parts = this.currentMonth.split('-').map(Number);
    let y = parts[0];
    let m = parts[1] + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    this.setMonth(`${y}-${String(m).padStart(2, '0')}`);
  },

  setThisMonth() {
    this.setMonth(new Date().toISOString().substring(0, 7));
  },

  setMonthlyStatusFilter(filter) {
    this.monthlyStatusFilter = filter;
    this.renderView();
  },

  openStudentMonthlyModal(studentId) {
    this.monthlyModalStudentId = studentId;
    this.renderView();
  },

  closeStudentMonthlyModal() {
    this.monthlyModalStudentId = null;
    this.renderView();
  },

  getMonthNameTurkish(yearMonthStr) {
    if (!yearMonthStr) return '';
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const parts = yearMonthStr.split('-').map(Number);
    const m = parts[1];
    const y = parts[0];
    return `${months[m - 1] || ''} ${y}`;
  },

  // 5 veya 6. Sınıf kontrolü
  isJuniorStudent(student) {
    if (!student) return false;
    const cName = (typeof student === 'string' ? student : (student.className || '')).trim();
    if (/^[56]|^5\b|^6\b|5\.\s*sınıf|6\.\s*sınıf/i.test(cName)) return true;
    const no = String(student.studentNo || '');
    if (/^[56]\d{2}/.test(no)) return true;
    return false;
  },

  // Talebenin ilgili gündeki beklenen dönüş saati
  getExpectedTimeForStudent(student, dateStr = this.currentDate) {
    const day = this.getDayOfWeek(dateStr);
    const isJunior = this.isJuniorStudent(student);
    if (day === 1 && isJunior) {
      return this.expectedMondayTime || '08:00';
    }
    return this.expectedSundayTime || '18:00';
  },

  setExpectedSundayTime(timeStr) {
    if (!timeStr) return;
    this.expectedSundayTime = timeStr;
    this.expectedReturnTime = timeStr;
    localStorage.setItem('yoklama_expected_sunday_time', timeStr);
    localStorage.setItem('yoklama_expected_return_time', timeStr);
    if (window.Store) {
      window.Store.saveSettings({ 
        expectedSundayTime: timeStr,
        expectedReturnTime: timeStr 
      });
    }
    this.recalculateCurrentDayReturns();
    this.renderView();
    if (window.App && window.App.showToast) {
      window.App.showToast(`Pazar akşamı dönüş saati ${timeStr} olarak güncellendi ve tüm cihazlara eşitlendi.`, 'info');
    }
  },

  setExpectedMondayTime(timeStr) {
    if (!timeStr) return;
    this.expectedMondayTime = timeStr;
    localStorage.setItem('yoklama_expected_monday_time', timeStr);
    if (window.Store) {
      window.Store.saveSettings({ expectedMondayTime: timeStr });
    }
    this.recalculateCurrentDayReturns();
    this.renderView();
    if (window.App && window.App.showToast) {
      window.App.showToast(`Pazartesi sabahı dönüş saati ${timeStr} olarak güncellendi ve tüm cihazlara eşitlendi.`, 'info');
    }
  },

  setExpectedReturnTime(timeStr) {
    this.setExpectedSundayTime(timeStr);
  },

  recalculateCurrentDayReturns() {
    const dayReturns = window.Store.getLeaveReturnsByDate(this.currentDate);
    Object.keys(dayReturns).forEach(studentId => {
      const rec = dayReturns[studentId];
      if (rec && rec.status !== 'IZINLI' && rec.arrivalTime) {
        const student = window.Store.getStudentById(studentId);
        const expectedTime = this.getExpectedTimeForStudent(student, this.currentDate);
        const excuse = rec.excuseType ? { type: rec.excuseType, minutes: rec.excuseMinutes || 0 } : null;
        const calc = this.calculateDifference(student, rec.arrivalTime, expectedTime, excuse);
        window.Store.saveLeaveReturn(this.currentDate, studentId, {
          ...rec,
          expectedTime,
          ...calc
        });
      }
    });
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

  setStatusFilter(status) {
    this.statusFilter = status;
    this.renderView();
  },

  setSearchQuery(q) {
    this.searchQuery = (q || '').toLowerCase().trim();
    this.renderStudentRows();
  },

  // Zaman farkı, 3x ceza ve mazeret hesaplayıcı
  calculateDifference(student, arrivalTime, expectedTime, excuse = null) {
    const dayOfWeek = this.getDayOfWeek(this.currentDate);
    const isJunior = this.isJuniorStudent(student);

    // 1. İzinli ve henüz varış saati girilmemişse
    if (!arrivalTime && excuse) {
      return {
        status: 'IZINLI',
        lateMinutes: 0,
        earlyMinutes: 0,
        penaltyMinutes: 0,
        statusLabel: `İzinli (${excuse.type})`,
        penaltyLabel: 'Telafi Yok (İzinli)'
      };
    }

    // 2. 5 ve 6. Sınıflar Pazar günü saat kaçta gelirse gelsin Erken sayılır! (Resmi dönüş Pazartesi sabah 08:00)
    if (dayOfWeek === 0 && isJunior && arrivalTime) {
      return {
        status: 'ERKEN',
        lateMinutes: 0,
        earlyMinutes: 0,
        penaltyMinutes: 0,
        statusLabel: `Pazar Geldi (Erken • ${arrivalTime})`,
        penaltyLabel: 'Telafi Yok (Erken)'
      };
    }

    // 3. Normal veya İzinli Karşılaştırma
    if (!arrivalTime) {
      return {
        status: 'GELMEDI',
        lateMinutes: 0,
        earlyMinutes: 0,
        penaltyMinutes: 0,
        statusLabel: 'Yolda / Gelmedi',
        penaltyLabel: '-'
      };
    }

    const [arrH, arrM] = arrivalTime.split(':').map(Number);
    const [expH, expM] = (expectedTime || '18:00').split(':').map(Number);
    const arrTotal = arrH * 60 + arrM;
    let expTotal = expH * 60 + expM;

    // Ek izin dakikası varsa (örn: +30 dk, +60 dk, +90 dk, +120 dk)
    if (excuse && excuse.minutes > 0) {
      expTotal += excuse.minutes;
    }

    const diff = arrTotal - expTotal;

    if (diff > 0) {
      // Geç kaldı: 1 dk gecikme = 3 katı (3x) ek telafi süresi
      const penaltyMinutes = diff * 3;
      const note = excuse && excuse.minutes > 0 ? ` (${excuse.type} Aşımı)` : '';
      return {
        status: 'GEC',
        lateMinutes: diff,
        earlyMinutes: 0,
        penaltyMinutes: penaltyMinutes,
        statusLabel: `${diff} dk Geç Kaldı${note}`,
        penaltyLabel: `+${penaltyMinutes} dk Telafi (3x)`
      };
    } else if (excuse && excuse.type) {
      // İzinliydi ve izin süresi dolmadan geldi -> İzinli (0 Telafi, 0 Puan)
      return {
        status: 'IZINLI',
        lateMinutes: 0,
        earlyMinutes: Math.abs(diff),
        penaltyMinutes: 0,
        statusLabel: `İzinli Geldi (${arrivalTime})`,
        penaltyLabel: 'Telafi Yok (İzinli)'
      };
    } else if (diff < 0) {
      // Erken geldi
      const early = Math.abs(diff);
      return {
        status: 'ERKEN',
        lateMinutes: 0,
        earlyMinutes: early,
        penaltyMinutes: 0,
        statusLabel: `${early} dk Erken`,
        penaltyLabel: 'Telafi Yok'
      };
    } else {
      // Tam vaktinde
      return {
        status: 'VAKTINDE',
        lateMinutes: 0,
        earlyMinutes: 0,
        penaltyMinutes: 0,
        statusLabel: 'Tam Vaktinde',
        penaltyLabel: 'Telafi Yok'
      };
    }
  },

  // "⚡ Şimdi Geldi" Tek Tık Hızlı Kayıt
  recordNow(studentId) {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const arrivalTime = `${h}:${m}`;
    this.recordArrivalTime(studentId, arrivalTime);
  },

  recordArrivalTime(studentId, arrivalTime) {
    if (!arrivalTime) return;
    const student = window.Store.getStudentById(studentId);
    const expectedTime = this.getExpectedTimeForStudent(student, this.currentDate);
    const dayReturns = window.Store.getLeaveReturnsByDate(this.currentDate);
    const existing = dayReturns[studentId] || {};

    const excuse = existing.excuseType ? {
      type: existing.excuseType,
      minutes: existing.excuseMinutes || 0
    } : null;

    const calc = this.calculateDifference(student, arrivalTime, expectedTime, excuse);

    window.Store.saveLeaveReturn(this.currentDate, studentId, {
      ...existing,
      arrivalTime,
      expectedTime,
      ...calc
    });

    this.renderView();
    if (window.App && window.App.showToast) {
      const name = student ? `${student.firstName} ${student.lastName}` : 'Öğrenci';
      if (calc.status === 'GEC') {
        window.App.showToast(`⚠️ ${name}: ${calc.statusLabel} (+${calc.penaltyMinutes} dk ek telafi süresi işlendi)`, 'warning');
      } else if (calc.status === 'IZINLI') {
        window.App.showToast(`✅ ${name} izin dahilinde geldi: ${arrivalTime}`, 'success');
      } else {
        window.App.showToast(`✅ ${name} kaydedildi: ${arrivalTime} (${calc.statusLabel})`, 'success');
      }
    }
  },

  // Mazeret / İzin Verme İşlemleri
  openExcuseModal(studentId) {
    this.activeExcuseStudentId = studentId;
    this.renderExcuseModal();
  },

  closeExcuseModal() {
    this.activeExcuseStudentId = null;
    const container = document.getElementById('leave-return-excuse-modal-container');
    if (container) container.innerHTML = '';
  },

  setStudentExcuse(excuseType, minutes) {
    const studentId = this.activeExcuseStudentId;
    if (!studentId) return;
    const student = window.Store.getStudentById(studentId);
    const expectedTime = this.getExpectedTimeForStudent(student, this.currentDate);
    const dayReturns = window.Store.getLeaveReturnsByDate(this.currentDate);
    const existing = dayReturns[studentId] || {};

    const excuse = {
      type: excuseType,
      minutes: minutes
    };

    const calc = this.calculateDifference(student, existing.arrivalTime || null, expectedTime, excuse);

    window.Store.saveLeaveReturn(this.currentDate, studentId, {
      ...existing,
      expectedTime,
      excuseType,
      excuseMinutes: minutes,
      status: 'IZINLI',
      lateMinutes: 0,
      earlyMinutes: calc.earlyMinutes || 0,
      penaltyMinutes: 0,
      statusLabel: `İzinli (${excuseType})`,
      penaltyLabel: 'Telafi Yok (İzinli)'
    });

    this.closeExcuseModal();
    this.renderView();

    if (window.App && window.App.showToast) {
      const name = student ? `${student.firstName} ${student.lastName}` : 'Öğrenci';
      window.App.showToast(`🏷️ ${name}: İzin kaydedildi [${excuseType}] (0 Telafi, 0 Puan)`, 'info');
    }
  },

  clearRecord(studentId) {
    window.Store.deleteLeaveReturn(this.currentDate, studentId);
    this.renderView();
    if (window.App && window.App.showToast) {
      window.App.showToast('Giriş/İzin kaydı silindi (Henüz Gelmedi durumuna alındı).', 'info');
    }
  },

  sendWhatsAppForStudent(studentId) {
    const student = window.Store.getStudentById(studentId);
    if (!student) return;

    let phone = student.parentPhone || student.phone || student.fatherPhone || '';
    if (!phone) {
      const input = prompt(`"${student.firstName} ${student.lastName}" adlı talebenin veli telefonu kayıtlı değil.\nMesaj göndermek için veli telefon numarasını giriniz (Örn: 05xx...):`);
      if (!input || !input.trim()) return;
      phone = input.trim();
      window.Store.updateStudent(studentId, { parentPhone: phone });
    }

    const dayReturns = window.Store.getLeaveReturnsByDate(this.currentDate);
    const rec = dayReturns[studentId];
    const expectedTime = this.getExpectedTimeForStudent(student, this.currentDate);
    const dayName = this.getDayName(this.currentDate);

    let msg = '';
    if (rec && rec.status === 'GEC') {
      msg = `Sayın Velimiz, Ömer Avniyel Akademi'den bildiriyoruz: Talebeniz ${student.firstName} ${student.lastName}, ${this.currentDate} (${dayName}) tarihli hafta sonu izin dönüşüne ${rec.lateMinutes} dakika geç kalmıştır (Giriş Saati: ${rec.arrivalTime}, Beklenen: ${expectedTime}). Kurallar gereği dakika başına 3 katı (+${rec.penaltyMinutes} dk) hafta sonu iznine ek telafi süresi uygulanmıştır. Bilgilerinize sunarız.`;
    } else if (rec && rec.status === 'IZINLI') {
      msg = `Sayın Velimiz, Talebeniz ${student.firstName} ${student.lastName} için ${this.currentDate} (${dayName}) tarihinde '${rec.excuseType || 'Mazeretli'}' izin kaydı oluşturulmuştur. Bilgilerinize sunarız. — Ömer Avniyel Akademi`;
    } else if (rec && (rec.status === 'VAKTINDE' || rec.status === 'ERKEN')) {
      msg = `Sayın Velimiz, Talebeniz ${student.firstName} ${student.lastName}, ${this.currentDate} (${dayName}) tarihli izin dönüşünde saat ${rec.arrivalTime}'de vaktinde yurda giriş yapmıştır. Gösterdiğiniz hassasiyet için teşekkür eder, hayırlı günler dileriz. — Ömer Avniyel Akademi`;
    } else {
      // Henüz gelmedi
      msg = `Sayın Velimiz, Ömer Avniyel Akademi'den bildiriyoruz: Talebeniz ${student.firstName} ${student.lastName}, ${this.currentDate} (${dayName}) tarihli hafta sonu izin dönüş saatine (${expectedTime}) henüz yurda giriş yapmamıştır. Talebenizin durumu ve varış vakti hakkında bilgi vermenizi rica ederiz.`;
    }

    window.Store.sendWhatsAppMessage(phone, msg);
  },

  sendWhatsAppMonthlyReport(studentId) {
    const student = window.Store.getStudentById(studentId);
    if (!student) return;

    let phone = student.parentPhone || student.phone || student.fatherPhone || '';
    if (!phone) {
      const input = prompt(`"${student.firstName} ${student.lastName}" adlı talebenin veli telefonu kayıtlı değil.\nMesaj göndermek için veli telefon numarasını giriniz (Örn: 05xx...):`);
      if (!input || !input.trim()) return;
      phone = input.trim();
      window.Store.updateStudent(studentId, { parentPhone: phone });
    }

    const rep = window.Store.getMonthlyLeaveReturnReportForStudent(studentId, this.currentMonth);
    const monthLabel = this.getMonthLabel(this.currentMonth);

    let msg = `Sayın Velimiz, Ömer Avniyel Akademi'den bildiriyoruz:\n\nTalebeniz ${student.firstName} ${student.lastName}'nin ${monthLabel} Ayı İzin Dönüş İntizam Karnesi:\n` +
      `• Kayıtlı İzin Dönüşü: ${rep.totalReturns} Hafta\n` +
      `• Vaktinde Geliş: ${rep.onTimeCount} Kez\n` +
      `• İzinli / Mazeretli: ${rep.excusedCount || 0} Kez\n` +
      `• Geç Kalma: ${rep.lateCount} Kez (${rep.totalLateMinutes} Dakika)\n` +
      `• Uygulanan İzne Ek Telafi Süresi: ${rep.totalPenaltyMinutes > 0 ? `+${rep.totalPenaltyMinutes} Dakika (3x)` : 'Telafi Yok (0 dk)'}\n\n` +
      `Bilgilerinize sunar, hayırlı günler dileriz. — Ömer Avniyel Akademi`;

    window.Store.sendWhatsAppMessage(phone, msg);
  },

  getFilteredStudents() {
    let students = window.Store.getStudents();
    const dayReturns = window.Store.getLeaveReturnsByDate(this.currentDate);

    // Sınıf filtresi
    if (this.selectedClasses && this.selectedClasses.length > 0) {
      students = students.filter(s => this.selectedClasses.includes(s.className));
    }

    // Durum filtresi (Tümü, İzinliler, Geç Kalanlar, Gelmeyenler, Erken, Vaktinde)
    if (this.statusFilter !== 'ALL') {
      students = students.filter(s => {
        const rec = dayReturns[s.id];
        if (this.statusFilter === 'GELMEDI') {
          return !rec || (!rec.arrivalTime && rec.status !== 'IZINLI');
        }
        if (this.statusFilter === 'IZINLI') {
          return rec && rec.status === 'IZINLI';
        }
        if (!rec || !rec.arrivalTime) return false;
        return rec.status === this.statusFilter;
      });
    }

    // Arama filtresi
    if (this.searchQuery) {
      students = students.filter(s =>
        (s.firstName && s.firstName.toLowerCase().includes(this.searchQuery)) ||
        (s.lastName && s.lastName.toLowerCase().includes(this.searchQuery)) ||
        (s.studentNo && String(s.studentNo).includes(this.searchQuery)) ||
        (s.className && s.className.toLowerCase().includes(this.searchQuery)) ||
        (s.yatakhane && s.yatakhane.toLowerCase().includes(this.searchQuery))
      );
    }

    return students;
  },

  renderView() {
    this.refreshSettings();
    const container = document.getElementById('leave-return-container');
    if (!container) return;

    // Aylık Rapor Görünümü
    if (this.viewMode === 'monthly') {
      this.renderMonthlyView(container);
      return;
    }

    const allStudents = window.Store.getStudents();
    const dayReturns = window.Store.getLeaveReturnsByDate(this.currentDate);
    const classes = window.Store.getClasses();
    const dayName = this.getDayName(this.currentDate);
    const dayOfWeek = this.getDayOfWeek(this.currentDate);

    // Pazartesi günü için Pazar günü giriş yapmış öğrencileri de kontrol et
    const prevDayStr = this.getPreviousDayString(this.currentDate);
    const sundayReturns = dayOfWeek === 1 ? window.Store.getLeaveReturnsByDate(prevDayStr) : {};

    // KPI İstatistikleri
    let arrivedCount = 0;
    let excusedCount = 0;
    let lateCount = 0;
    let earlyCount = 0;
    let onTimeCount = 0;
    let totalPenaltyMins = 0;
    let pendingCount = 0;

    allStudents.forEach(s => {
      const rec = dayReturns[s.id];
      const isJunior = this.isJuniorStudent(s);
      const arrivedOnSunday = dayOfWeek === 1 && isJunior && sundayReturns[s.id] && sundayReturns[s.id].arrivalTime;

      if (rec && rec.status === 'IZINLI') {
        excusedCount++;
        if (rec.arrivalTime) {
          arrivedCount++;
        }
      } else if (rec && rec.arrivalTime) {
        arrivedCount++;
        if (rec.status === 'GEC') {
          lateCount++;
          totalPenaltyMins += (rec.penaltyMinutes || 0);
        } else if (rec.status === 'ERKEN') {
          earlyCount++;
        } else if (rec.status === 'VAKTINDE') {
          onTimeCount++;
        }
      } else if (arrivedOnSunday) {
        arrivedCount++;
        earlyCount++;
      } else {
        pendingCount++;
      }
    });

    container.innerHTML = `
      <div class="space-y-4 animate-fade-in max-w-7xl mx-auto">
        <!-- 1. ÜST BAŞLIK & KONTROL PANELİ -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div class="flex flex-wrap items-center gap-3 mb-1.5">
                <h2 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>🧳 İzin Dönüşü Takip & Kontrol Sistemi</span>
                </h2>
                <!-- MOD SEÇİCİ: GÜNLÜK / AYLIK -->
                <div class="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 gap-1 shadow-inner">
                  <button type="button" onclick="window.LeaveReturnModule.setViewMode('daily')"
                    class="py-1 px-3 rounded-xl text-xs font-black transition cursor-pointer ${
                      this.viewMode === 'daily' 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }">
                    📅 Günlük Takip
                  </button>
                  <button type="button" onclick="window.LeaveReturnModule.setViewMode('monthly')"
                    class="py-1 px-3 rounded-xl text-xs font-black transition cursor-pointer ${
                      this.viewMode === 'monthly' 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }">
                    🗓️ Aylık Rapor & Kontrol
                  </button>
                </div>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">
                5 ve 6. Sınıflar <strong class="text-indigo-600">Pazartesi sabah 08:00</strong>, 7 ve 8. Sınıflar <strong class="text-indigo-600">Pazar akşamı</strong> döner. İzinli olanlara telafi süresi ve puan verilmez. Geç kalanlara <strong class="text-rose-700">dakika başına 3 katı (3x)</strong> izne ek telafi süresi uygulanır.
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button onclick="window.print()" 
                class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs">
                <span>🖨️ Çizelgeyi Yazdır / PDF</span>
              </button>
            </div>
          </div>

          <!-- Tarih & Standart Dönüş Saatleri Ayarı -->
          <div class="flex flex-wrap items-center justify-between gap-3">
            <!-- Tarih Seçici -->
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-black text-slate-700 uppercase">DÖNÜŞ TARİHİ:</span>
              <button onclick="window.LeaveReturnModule.prevDay()" 
                class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition">◀</button>
              
              <input type="date" value="${this.currentDate}" 
                class="px-3 py-1.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                onchange="window.LeaveReturnModule.setDate(this.value)">

              <div class="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-2xs">
                📅 ${dayName}
              </div>

              <button onclick="window.LeaveReturnModule.nextDay()" 
                class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition">▶</button>

              <button onclick="window.LeaveReturnModule.setToday()" 
                class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition">
                Bugün
              </button>
            </div>

            <!-- Beklenen Standart Dönüş Saatleri (Pazar 7-8 & Pazartesi 5-6) -->
            <div class="flex flex-wrap items-center gap-3 bg-indigo-50/80 border border-indigo-200 p-2 sm:px-3 sm:py-1.5 rounded-2xl">
              <!-- Pazar Akşamı (7 & 8. Sınıf) -->
              <div class="flex items-center gap-2">
                <span class="text-base">⏰</span>
                <div>
                  <div class="text-[10px] font-black text-indigo-900 uppercase">PAZAR AKŞAMI (7 & 8):</div>
                  <div class="flex items-center gap-1">
                    <input type="time" value="${this.expectedSundayTime}" 
                      class="bg-white border border-indigo-300 font-mono font-black text-xs text-indigo-950 px-2 py-0.5 rounded-lg focus:outline-none"
                      onchange="window.LeaveReturnModule.setExpectedSundayTime(this.value)">
                  </div>
                </div>
              </div>

              <div class="hidden sm:block h-6 w-px bg-indigo-200"></div>

              <!-- Pazartesi Sabahı (5 & 6. Sınıf) -->
              <div class="flex items-center gap-2">
                <span class="text-base">⏰</span>
                <div>
                  <div class="text-[10px] font-black text-indigo-900 uppercase">PAZARTESİ SABAHI (5 & 6):</div>
                  <div class="flex items-center gap-1">
                    <input type="time" value="${this.expectedMondayTime}" 
                      class="bg-white border border-indigo-300 font-mono font-black text-xs text-indigo-950 px-2 py-0.5 rounded-lg focus:outline-none"
                      onchange="window.LeaveReturnModule.setExpectedMondayTime(this.value)">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Sınıf Filtresi -->
          <div class="pt-2 border-t border-slate-100">
            <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>SINIF FİLTRESİ:</span>
              ${this.selectedClasses.length > 0 ? `
                <span class="text-indigo-600 font-semibold cursor-pointer hover:underline" onclick="window.LeaveReturnModule.toggleAllClasses()">
                  Filtreyi Temizle
                </span>
              ` : ''}
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <button type="button" onclick="window.LeaveReturnModule.toggleAllClasses()"
                class="px-3 py-1.5 rounded-xl text-xs font-black transition ${
                  this.selectedClasses.length === 0 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }">
                Tüm Sınıflar (${allStudents.length})
              </button>
              ${classes.map(c => {
                const isChecked = this.selectedClasses.includes(c);
                return `
                  <button type="button" onclick="window.LeaveReturnModule.toggleClass('${c}')"
                    class="px-3 py-1.5 rounded-xl text-xs font-black transition border flex items-center gap-1.5 ${
                      isChecked 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }">
                    <span>${isChecked ? '✓' : '+'}</span>
                    <span>${c}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- 2. KPI CANLI SAYAÇ KARTLARI -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 sm:gap-3">
          <!-- Toplam -->
          <div onclick="window.LeaveReturnModule.setStatusFilter('ALL')"
            class="cursor-pointer bg-white p-3 rounded-2xl border transition-all ${
              this.statusFilter === 'ALL' ? 'ring-2 ring-slate-900 shadow-md border-slate-900' : 'border-slate-200 hover:border-slate-300'
            }">
            <div class="text-[10px] font-bold text-slate-500 uppercase">TÜM TALEBELER</div>
            <div class="text-2xl font-black text-slate-800 mt-1">${allStudents.length}</div>
            <div class="text-[10px] text-slate-400">Beklenen mevcud</div>
          </div>

          <!-- Gelenler -->
          <div class="bg-white p-3 rounded-2xl border border-slate-200">
            <div class="text-[10px] font-bold text-emerald-600 uppercase">GELENLER</div>
            <div class="text-2xl font-black text-emerald-700 mt-1">${arrivedCount} / ${allStudents.length}</div>
            <div class="text-[10px] text-emerald-600 font-bold">%${allStudents.length ? Math.round((arrivedCount / allStudents.length) * 100) : 0} Dönüş Oranı</div>
          </div>

          <!-- Henüz Gelmedi (Yolda) -->
          <div onclick="window.LeaveReturnModule.setStatusFilter('GELMEDI')"
            class="cursor-pointer bg-white p-3 rounded-2xl border transition-all ${
              this.statusFilter === 'GELMEDI' ? 'ring-2 ring-amber-500 shadow-md border-amber-500' : 'border-amber-200 hover:border-amber-300'
            }">
            <div class="text-[10px] font-black text-amber-800 uppercase flex items-center gap-1">
              <span>⏳ YOLDA / BEKLENEN</span>
            </div>
            <div class="text-2xl font-black text-amber-700 mt-1">${pendingCount}</div>
            <div class="text-[10px] text-amber-600 font-medium">Giriş bekleniyor</div>
          </div>

          <!-- İzinliler (Mazeretliler) -->
          <div onclick="window.LeaveReturnModule.setStatusFilter('IZINLI')"
            class="cursor-pointer bg-amber-50/70 p-3 rounded-2xl border transition-all ${
              this.statusFilter === 'IZINLI' ? 'ring-2 ring-amber-500 shadow-md border-amber-400' : 'border-amber-200 hover:border-amber-300'
            }">
            <div class="text-[10px] font-black text-amber-900 uppercase flex items-center gap-1">
              <span>🏷️ İZİNLİLER</span>
            </div>
            <div class="text-2xl font-black text-amber-700 mt-1">${excusedCount}</div>
            <div class="text-[10px] text-amber-700 font-bold">0 Telafi • 0 Puan</div>
          </div>

          <!-- Geç Kalanlar (3x Telafi Uygulananlar) -->
          <div onclick="window.LeaveReturnModule.setStatusFilter('GEC')"
            class="cursor-pointer bg-rose-50/70 p-3 rounded-2xl border transition-all ${
              this.statusFilter === 'GEC' ? 'ring-2 ring-rose-600 shadow-md border-rose-600' : 'border-rose-200 hover:border-rose-300'
            }">
            <div class="text-[10px] font-black text-rose-800 uppercase flex items-center gap-1">
              <span>🔴 GEÇ KALANLAR</span>
            </div>
            <div class="text-2xl font-black text-rose-700 mt-1">${lateCount}</div>
            <div class="text-[10px] text-rose-600 font-black">+${totalPenaltyMins} dk 3x Telafi</div>
          </div>

          <!-- Erken Gelenler -->
          <div onclick="window.LeaveReturnModule.setStatusFilter('ERKEN')"
            class="cursor-pointer bg-white p-3 rounded-2xl border transition-all ${
              this.statusFilter === 'ERKEN' ? 'ring-2 ring-emerald-600 shadow-md border-emerald-600' : 'border-emerald-200 hover:border-emerald-300'
            }">
            <div class="text-[10px] font-bold text-emerald-800 uppercase">🟢 ERKEN GELEN</div>
            <div class="text-2xl font-black text-emerald-700 mt-1">${earlyCount}</div>
            <div class="text-[10px] text-emerald-600">Saatinden önce gelen</div>
          </div>

          <!-- Vaktinde Gelenler -->
          <div onclick="window.LeaveReturnModule.setStatusFilter('VAKTINDE')"
            class="cursor-pointer bg-white p-3 rounded-2xl border transition-all ${
              this.statusFilter === 'VAKTINDE' ? 'ring-2 ring-blue-600 shadow-md border-blue-600' : 'border-blue-200 hover:border-blue-300'
            }">
            <div class="text-[10px] font-bold text-blue-800 uppercase">🔵 TAM VAKTİNDE</div>
            <div class="text-2xl font-black text-blue-700 mt-1">${onTimeCount}</div>
            <div class="text-[10px] text-blue-600">Saatinde gelen</div>
          </div>
        </div>

        <!-- 3. ARAMA VE LİSTE KARTI -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="text-xs font-black text-slate-800 uppercase">TALEBE LİSTESİ & VARIS SAATLERİ</span>
              ${this.statusFilter !== 'ALL' ? `
                <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-300">
                  Filtre: ${
                    this.statusFilter === 'GEC' ? '🔴 Sadece Geç Kalanlar' : 
                    (this.statusFilter === 'GELMEDI' ? '⏳ Sadece Gelmeyenler' : 
                    (this.statusFilter === 'IZINLI' ? '🏷️ Sadece İzinliler' : 
                    (this.statusFilter === 'ERKEN' ? '🟢 Erken Gelenler' : '🔵 Vaktinde Gelenler')))
                  }
                  <button onclick="window.LeaveReturnModule.setStatusFilter('ALL')" class="ml-1 text-indigo-700 hover:text-black">×</button>
                </span>
              ` : ''}
            </div>

            <div class="w-full sm:w-64 relative">
              <input type="text" placeholder="İsim, No veya Oda ara..." 
                value="${this.searchQuery}"
                oninput="window.LeaveReturnModule.setSearchQuery(this.value)"
                class="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs">
              <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
            </div>
          </div>

          <!-- Tablo Alanı -->
          <div id="leave-return-table-container" class="overflow-x-auto">
            <!-- renderStudentRows() ile doldurulacak -->
          </div>
        </div>
      </div>

      <!-- Mazeret / İzin Modalı Konteyneri -->
      <div id="leave-return-excuse-modal-container"></div>
    `;

    this.renderStudentRows();
  },

  renderStudentRows() {
    const tableContainer = document.getElementById('leave-return-table-container');
    if (!tableContainer) return;

    const students = this.getFilteredStudents();
    const dayReturns = window.Store.getLeaveReturnsByDate(this.currentDate);
    const dayOfWeek = this.getDayOfWeek(this.currentDate);
    const prevDayStr = this.getPreviousDayString(this.currentDate);
    const sundayReturns = dayOfWeek === 1 ? window.Store.getLeaveReturnsByDate(prevDayStr) : {};

    if (students.length === 0) {
      tableContainer.innerHTML = `
        <div class="text-center py-12 text-slate-400">
          <span class="text-3xl block mb-2">🔍</span>
          <div class="text-sm font-bold text-slate-600">Kriterlere uygun talebe bulunamadı.</div>
          <div class="text-xs text-slate-400 mt-1">Filtrelerinizi temizleyip tekrar deneyiniz.</div>
        </div>
      `;
      return;
    }

    tableContainer.innerHTML = `
      <table class="w-full text-left border-collapse text-xs">
        <thead>
          <tr class="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
            <th class="py-3 px-4 w-12 text-center">#</th>
            <th class="py-3 px-4">Talebe Bilgisi</th>
            <th class="py-3 px-4">Sınıf / Oda</th>
            <th class="py-3 px-4 min-w-[220px]">Varış Saati & İzin</th>
            <th class="py-3 px-4">Durum</th>
            <th class="py-3 px-4">İzne Ek Telafi Süresi</th>
            <th class="py-3 px-4 text-center w-24 no-print">İşlem</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${students.map((s, idx) => {
            const rec = dayReturns[s.id];
            const hasRecord = rec && (rec.arrivalTime || rec.status === 'IZINLI');
            const isJunior = this.isJuniorStudent(s);
            const arrivedOnSunday = dayOfWeek === 1 && isJunior && sundayReturns[s.id] && sundayReturns[s.id].arrivalTime;
            const sundayRec = arrivedOnSunday ? sundayReturns[s.id] : null;

            let statusBadge = '';
            let penaltyBadge = '';

            if (rec && rec.status === 'IZINLI') {
              // İzinli
              statusBadge = `
                <span class="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-black border border-amber-300 flex items-center gap-1 w-max shadow-2xs">
                  <span>🏷️</span> <span>${rec.statusLabel || `İzinli (${rec.excuseType || ''})`}</span>
                </span>
              `;
              penaltyBadge = `
                <span class="text-amber-700 font-bold text-[11px] flex items-center gap-1">
                  <span>✓</span> <span>Telafi Yok (İzinli)</span>
                </span>
              `;
            } else if (hasRecord && rec.arrivalTime) {
              if (rec.status === 'GEC') {
                statusBadge = `
                  <span class="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 font-black border border-rose-300 flex items-center gap-1 w-max shadow-2xs">
                    <span>🔴</span> <span>${rec.statusLabel || `${rec.lateMinutes} dk Geç`}</span>
                  </span>
                `;
                penaltyBadge = `
                  <span class="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center gap-1 w-max shadow-xs animate-pulse">
                    <span>⚡</span> <span>+${rec.penaltyMinutes} dk Telafi (3x)</span>
                  </span>
                `;
              } else if (rec.status === 'ERKEN') {
                statusBadge = `
                  <span class="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-black border border-emerald-300 flex items-center gap-1 w-max">
                    <span>🟢</span> <span>${rec.statusLabel || `${rec.earlyMinutes} dk Erken`}</span>
                  </span>
                `;
                penaltyBadge = `<span class="text-emerald-700 font-bold text-[11px]">✓ Telafi Yok</span>`;
              } else {
                statusBadge = `
                  <span class="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 font-black border border-blue-300 flex items-center gap-1 w-max">
                    <span>🔵</span> <span>Tam Vaktinde</span>
                  </span>
                `;
                penaltyBadge = `<span class="text-emerald-700 font-bold text-[11px]">✓ Telafi Yok</span>`;
              }
            } else if (arrivedOnSunday) {
              // Pazartesi günü bakılıyor ama 5 veya 6. sınıf Pazar akşamı zaten gelmiş
              statusBadge = `
                <span class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-300 flex items-center gap-1 w-max">
                  <span>✓</span> <span>Pazar Geldi (${sundayRec.arrivalTime})</span>
                </span>
              `;
              penaltyBadge = `<span class="text-emerald-700 font-bold text-[11px]">✓ Dün Geldi (Telafi Yok)</span>`;
            } else if (dayOfWeek === 0 && isJunior) {
              // Pazar günü ve 5-6. sınıf henüz gelmemiş (resmi dönüş Pazartesi sabahı)
              statusBadge = `
                <span class="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 font-bold border border-indigo-200 flex items-center gap-1 w-max">
                  <span>📅</span> <span>Pzt 08:00 Bekleniyor</span>
                </span>
              `;
              penaltyBadge = `<span class="text-slate-400 font-medium text-[11px]">Pazartesi bekleniyor</span>`;
            } else {
              // Diğer sınıflar için henuz gelmedi
              statusBadge = `
                <span class="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200 flex items-center gap-1 w-max">
                  <span>⏳</span> <span>Yolda / Gelmedi</span>
                </span>
              `;
              penaltyBadge = `<span class="text-slate-400 font-medium">-</span>`;
            }

            return `
              <tr class="hover:bg-slate-50/80 transition ${hasRecord && rec.status === 'GEC' ? 'bg-rose-50/30' : ''}">
                <td class="py-3 px-4 text-center font-bold text-slate-400">${idx + 1}</td>
                
                <!-- İsim ve Numara -->
                <td class="py-3 px-4">
                  <div class="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                    <span>${s.firstName} ${s.lastName}</span>
                  </div>
                  <div class="text-[10px] text-slate-400 font-mono">No: ${s.studentNo || s.id}</div>
                </td>

                <!-- Sınıf & Yatakhane -->
                <td class="py-3 px-4">
                  <div class="font-bold text-slate-700 text-xs flex items-center gap-1">
                    <span>${s.className}</span>
                    ${isJunior ? '<span class="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded text-[9px] font-black">Pzt 08:00</span>' : '<span class="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-bold">Pazar</span>'}
                  </div>
                  <div class="text-[10px] text-slate-500">${s.yatakhane || '-'}</div>
                </td>

                <!-- Varış Saati & Butonlar -->
                <td class="py-3 px-4">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    ${hasRecord ? `
                      <input type="time" value="${rec.arrivalTime || ''}" 
                        class="px-2.5 py-1 bg-white border border-slate-300 font-mono font-black text-xs text-slate-900 rounded-xl focus:border-indigo-500 focus:outline-none shadow-2xs"
                        onchange="window.LeaveReturnModule.recordArrivalTime('${s.id}', this.value)">

                      <button type="button" onclick="window.LeaveReturnModule.openExcuseModal('${s.id}')"
                        class="px-2 py-1 rounded-xl text-xs font-black transition border shadow-2xs ${
                          rec.status === 'IZINLI' 
                            ? 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200' 
                            : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-800'
                        }"
                        title="İzin detayını görüntüle veya değiştir">
                        <span>🏷️</span>
                        <span>${rec.status === 'IZINLI' ? (rec.excuseType || 'İzinli') : 'İzin'}</span>
                      </button>
                    ` : `
                      <!-- Henüz kayıt yok -->
                      <button type="button" onclick="window.LeaveReturnModule.recordNow('${s.id}')"
                        class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs rounded-xl transition flex items-center gap-1 shadow-xs">
                        <span>⚡</span>
                        <span>Şimdi Geldi</span>
                      </button>

                      <button type="button" onclick="window.LeaveReturnModule.openExcuseModal('${s.id}')"
                        class="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-black text-xs rounded-xl transition flex items-center gap-1 shadow-xs"
                        title="Öğrenciye izin ver (0 Ceza, 0 Puan)">
                        <span>🏷️</span>
                        <span>İzinli</span>
                      </button>

                      <input type="time" 
                        placeholder="--:--"
                        class="px-2 py-1 bg-slate-50 border border-slate-200 font-mono text-xs text-slate-600 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none w-20"
                        onchange="window.LeaveReturnModule.recordArrivalTime('${s.id}', this.value)">
                    `}
                  </div>
                </td>

                <!-- Durum -->
                <td class="py-3 px-4">
                  ${statusBadge}
                </td>

                <!-- İzne Geç Çıkış Cezası (3x) -->
                <td class="py-3 px-4">
                  ${penaltyBadge}
                </td>

                <!-- İşlemler (WhatsApp & Sıfırla / Sil) -->
                <td class="py-3 px-4 text-center no-print">
                  <div class="flex items-center justify-center gap-1">
                    <button type="button" onclick="window.LeaveReturnModule.sendWhatsAppForStudent('${s.id}')"
                      title="Veliye WhatsApp'tan izin dönüşü bildirimi gönder"
                      class="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 transition text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer">
                      <span>📲</span>
                      <span class="text-[10px] hidden sm:inline">WhatsApp</span>
                    </button>
                    ${hasRecord ? `
                      <button type="button" onclick="window.LeaveReturnModule.clearRecord('${s.id}')"
                        title="Giriş / İzin kaydını sil"
                        class="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition text-xs cursor-pointer">
                        🗑️
                      </button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  },

  // Mazeret & İzin Seçim Penceresi (Modal)
  renderExcuseModal() {
    const container = document.getElementById('leave-return-excuse-modal-container');
    if (!container || !this.activeExcuseStudentId) return;

    const student = window.Store.getStudentById(this.activeExcuseStudentId);
    if (!student) return;

    const dayReturns = window.Store.getLeaveReturnsByDate(this.currentDate);
    const existing = dayReturns[this.activeExcuseStudentId];
    const hasExistingRecord = existing && (existing.arrivalTime || existing.status === 'IZINLI');

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fade-in no-print">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 space-y-4">
          <!-- Başlık ve Kapatma -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 font-black text-lg flex items-center justify-center shadow-inner">
                🏷️
              </div>
              <div>
                <h3 class="font-black text-sm sm:text-base text-slate-900">${student.firstName} ${student.lastName}</h3>
                <p class="text-xs text-slate-500">${student.className} • No: ${student.studentNo || student.id} • ${student.yatakhane || '-'}</p>
              </div>
            </div>
            <button onclick="window.LeaveReturnModule.closeExcuseModal()"
              class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-black transition flex items-center justify-center">
              ✕
            </button>
          </div>

          <!-- Kural Bilgilendirmesi -->
          <div class="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
            <div class="font-black flex items-center gap-1.5">
              <span>ℹ️</span> <span>İzinli Talebe Kuralı:</span>
            </div>
            <p class="text-[11px] text-amber-800 leading-relaxed">
              İzinli olarak işaretlenen talebeler <strong>puan alamaz (0 Puan)</strong>, ancak kendilerine <strong>ek telafi süresi de uygulanmaz (0 Telafi)</strong>.
            </p>
          </div>

          <!-- 5 Seçenekli İzin Menüsü -->
          <div class="space-y-2">
            <div class="text-[11px] font-black uppercase text-slate-400 tracking-wider">İzin / Mazeret Süresi Seçiniz:</div>
            
            <!-- 1. Yarın Sabah -->
            <button type="button" onclick="window.LeaveReturnModule.setStudentExcuse('Yarın Sabah', 0)"
              class="w-full text-left p-3 rounded-2xl border-2 border-slate-100 hover:border-amber-400 hover:bg-amber-50/50 transition flex items-center justify-between group">
              <div class="flex items-center gap-3">
                <span class="text-xl group-hover:scale-110 transition">🌅</span>
                <div>
                  <div class="font-black text-xs text-slate-900">Yarın Sabah</div>
                  <div class="text-[10px] text-slate-500">Bu akşam gelmeyecek, yarın sabah dönecek.</div>
                </div>
              </div>
              <span class="text-xs font-black text-amber-600 bg-amber-50 group-hover:bg-amber-100 px-2.5 py-1 rounded-xl">Seç ➔</span>
            </button>

            <!-- 2. Yarım Saat -->
            <button type="button" onclick="window.LeaveReturnModule.setStudentExcuse('Yarım Saat (+30 dk)', 30)"
              class="w-full text-left p-3 rounded-2xl border-2 border-slate-100 hover:border-amber-400 hover:bg-amber-50/50 transition flex items-center justify-between group">
              <div class="flex items-center gap-3">
                <span class="text-xl group-hover:scale-110 transition">⏱️</span>
                <div>
                  <div class="font-black text-xs text-slate-900">Yarım Saat (+30 dk)</div>
                  <div class="text-[10px] text-slate-500">30 dakika ek izin süresi tanınır.</div>
                </div>
              </div>
              <span class="text-xs font-black text-amber-600 bg-amber-50 group-hover:bg-amber-100 px-2.5 py-1 rounded-xl">Seç ➔</span>
            </button>

            <!-- 3. 1 Saat -->
            <button type="button" onclick="window.LeaveReturnModule.setStudentExcuse('1 Saat (+60 dk)', 60)"
              class="w-full text-left p-3 rounded-2xl border-2 border-slate-100 hover:border-amber-400 hover:bg-amber-50/50 transition flex items-center justify-between group">
              <div class="flex items-center gap-3">
                <span class="text-xl group-hover:scale-110 transition">⏱️</span>
                <div>
                  <div class="font-black text-xs text-slate-900">1 Saat (+60 dk)</div>
                  <div class="text-[10px] text-slate-500">1 saat (60 dakika) ek izin süresi tanınır.</div>
                </div>
              </div>
              <span class="text-xs font-black text-amber-600 bg-amber-50 group-hover:bg-amber-100 px-2.5 py-1 rounded-xl">Seç ➔</span>
            </button>

            <!-- 4. 1.5 Saat -->
            <button type="button" onclick="window.LeaveReturnModule.setStudentExcuse('1.5 Saat (+90 dk)', 90)"
              class="w-full text-left p-3 rounded-2xl border-2 border-slate-100 hover:border-amber-400 hover:bg-amber-50/50 transition flex items-center justify-between group">
              <div class="flex items-center gap-3">
                <span class="text-xl group-hover:scale-110 transition">⏱️</span>
                <div>
                  <div class="font-black text-xs text-slate-900">1.5 Saat (+90 dk)</div>
                  <div class="text-[10px] text-slate-500">1.5 saat (90 dakika) ek izin süresi tanınır.</div>
                </div>
              </div>
              <span class="text-xs font-black text-amber-600 bg-amber-50 group-hover:bg-amber-100 px-2.5 py-1 rounded-xl">Seç ➔</span>
            </button>

            <!-- 5. 2 Saat -->
            <button type="button" onclick="window.LeaveReturnModule.setStudentExcuse('2 Saat (+120 dk)', 120)"
              class="w-full text-left p-3 rounded-2xl border-2 border-slate-100 hover:border-amber-400 hover:bg-amber-50/50 transition flex items-center justify-between group">
              <div class="flex items-center gap-3">
                <span class="text-xl group-hover:scale-110 transition">⏱️</span>
                <div>
                  <div class="font-black text-xs text-slate-900">2 Saat (+120 dk)</div>
                  <div class="text-[10px] text-slate-500">2 saat (120 dakika) ek izin süresi tanınır.</div>
                </div>
              </div>
              <span class="text-xs font-black text-amber-600 bg-amber-50 group-hover:bg-amber-100 px-2.5 py-1 rounded-xl">Seç ➔</span>
            </button>
          </div>

          <!-- Alt Butonlar -->
          <div class="flex items-center justify-between pt-3 border-t border-slate-100">
            ${hasExistingRecord ? `
              <button type="button" onclick="window.LeaveReturnModule.clearRecord('${student.id}'); window.LeaveReturnModule.closeExcuseModal();"
                class="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs rounded-xl transition flex items-center gap-1.5">
                <span>🗑️</span> <span>İzni Kaldır / Sıfırla</span>
              </button>
            ` : `<div></div>`}

            <button type="button" onclick="window.LeaveReturnModule.closeExcuseModal()"
              class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition cursor-pointer">
              Kapat
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // --- 2. AYLIK İZİN DÖNÜŞÜ KONTROL VE RAPORLAMA GÖRÜNÜMÜ ---
  renderMonthlyView(container) {
    this.refreshSettings();
    const allStudents = window.Store.getStudents();
    const classes = window.Store.getClasses();
    const monthName = this.getMonthNameTurkish(this.currentMonth);

    // Store'dan aylık verileri çek
    const batch = window.Store.getMonthlyLeaveReturnBatch(allStudents, this.currentMonth);

    // Filtreleme
    let reports = batch.reports;

    // Sınıf Filtresi
    if (this.selectedClasses && this.selectedClasses.length > 0) {
      reports = reports.filter(r => this.selectedClasses.includes(r.student.className));
    }

    // Durum Filtresi (Tümü, Sadece Geç Kalanlar, Sadece İzinliler, Vaktinde Dönenler)
    if (this.monthlyStatusFilter === 'GEC') {
      reports = reports.filter(r => r.report.lateCount > 0);
    } else if (this.monthlyStatusFilter === 'IZINLI') {
      reports = reports.filter(r => r.report.excusedCount > 0);
    } else if (this.monthlyStatusFilter === 'VAKTINDE') {
      reports = reports.filter(r => r.report.lateCount === 0 && r.report.totalReturns > 0);
    }

    // Arama Filtresi
    if (this.searchQuery) {
      const q = this.searchQuery;
      reports = reports.filter(r => {
        const s = r.student;
        return (
          (s.firstName && s.firstName.toLowerCase().includes(q)) ||
          (s.lastName && s.lastName.toLowerCase().includes(q)) ||
          (s.studentNo && String(s.studentNo).includes(q)) ||
          (s.className && s.className.toLowerCase().includes(q)) ||
          (s.yatakhane && s.yatakhane.toLowerCase().includes(q))
        );
      });
    }

    // Sıralama: En yüksek cezası olan en üstte
    reports.sort((a, b) => {
      if (b.report.totalPenaltyMinutes !== a.report.totalPenaltyMinutes) {
        return b.report.totalPenaltyMinutes - a.report.totalPenaltyMinutes;
      }
      return (a.student.firstName || '').localeCompare(b.student.firstName || '', 'tr');
    });

    // İstatistikler
    const totalStudentsInView = reports.length;
    let lateStudentsCount = 0;
    let penaltyMinutesInView = 0;
    let returnsInView = 0;
    let onTimeInView = 0;
    let excusedInView = 0;

    reports.forEach(r => {
      if (r.report.lateCount > 0) lateStudentsCount++;
      penaltyMinutesInView += r.report.totalPenaltyMinutes;
      returnsInView += r.report.totalReturns;
      onTimeInView += r.report.onTimeCount;
      excusedInView += r.report.excusedCount;
    });

    const totalPenaltyFormatted = window.Store.formatPenaltyDuration(penaltyMinutesInView);

    container.innerHTML = `
      <div class="space-y-4 animate-fade-in max-w-7xl mx-auto">
        <!-- 1. ÜST KONTROL PANELİ & AY SEÇİCİ -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div class="flex flex-wrap items-center gap-3 mb-1.5">
                <h2 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>🧳 İzin Dönüşü Takip & Kontrol Sistemi</span>
                </h2>
                <!-- MOD SEÇİCİ -->
                <div class="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 gap-1 shadow-inner">
                  <button type="button" onclick="window.LeaveReturnModule.setViewMode('daily')"
                    class="py-1 px-3 rounded-xl text-xs font-black transition cursor-pointer ${
                      this.viewMode === 'daily' 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }">
                    📅 Günlük Takip
                  </button>
                  <button type="button" onclick="window.LeaveReturnModule.setViewMode('monthly')"
                    class="py-1 px-3 rounded-xl text-xs font-black transition cursor-pointer ${
                      this.viewMode === 'monthly' 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }">
                    🗓️ Aylık Rapor & Kontrol
                  </button>
                </div>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">
                Aylık toplu dönüş raporu: Ay içerisindeki tüm hafta sonu dönüşleri, geç kalma süreleri ve <strong class="text-rose-700">3x izne ek telafi süreleri</strong> burada listelenir.
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button onclick="window.print()" 
                class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer">
                <span>🖨️ Aylık Çizelgeyi Yazdır / PDF</span>
              </button>
            </div>
          </div>

          <!-- Ay Seçici & Hızlı Ay Gezintisi -->
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-black text-slate-700 uppercase">RAPOR AYI:</span>
              <button onclick="window.LeaveReturnModule.prevMonth()" 
                class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition cursor-pointer">◀</button>
              
              <input type="month" value="${this.currentMonth}" 
                class="px-3 py-1.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                onchange="window.LeaveReturnModule.setMonth(this.value)">

              <div class="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-2xs flex items-center gap-1.5">
                <span>🗓️</span> <span>${monthName}</span>
              </div>

              <button onclick="window.LeaveReturnModule.nextMonth()" 
                class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition cursor-pointer">▶</button>

              <button onclick="window.LeaveReturnModule.setThisMonth()" 
                class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer">
                Bu Ay
              </button>
            </div>

            <div class="text-xs text-slate-500 font-medium">
              💡 Bir talebeye tıklayarak o ayki tüm haftalık varış saatlerini ayrıntılı inceleyebilirsiniz.
            </div>
          </div>

          <!-- 2. KPI İSTATİSTİK KARTLARI -->
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 pt-2 border-t border-slate-100">
            <!-- 1. İncelenen Talebe -->
            <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <div class="text-[10px] font-black text-slate-500 uppercase tracking-wider">İncelenen Talebe</div>
              <div class="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">${totalStudentsInView}</div>
              <div class="text-[10px] text-slate-400 font-semibold mt-0.5">Kayıtlı Öğrenci</div>
            </div>

            <!-- 2. Toplam Dönüş Kaydı -->
            <div class="p-3 bg-indigo-50/80 rounded-2xl border border-indigo-200 text-center">
              <div class="text-[10px] font-black text-indigo-700 uppercase tracking-wider">Dönüş Kaydı</div>
              <div class="text-xl sm:text-2xl font-black text-indigo-900 mt-0.5">${returnsInView}</div>
              <div class="text-[10px] text-indigo-600 font-semibold mt-0.5">Haftalık Giriş</div>
            </div>

            <!-- 3. Vaktinde / Erken -->
            <div class="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-center">
              <div class="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Vaktinde / Erken</div>
              <div class="text-xl sm:text-2xl font-black text-emerald-800 mt-0.5">${onTimeInView}</div>
              <div class="text-[10px] text-emerald-600 font-semibold mt-0.5">Kusursuz Varış</div>
            </div>

            <!-- 4. Geç Kalan Talebe -->
            <div class="p-3 ${lateStudentsCount > 0 ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'} rounded-2xl border text-center">
              <div class="text-[10px] font-black ${lateStudentsCount > 0 ? 'text-amber-800' : 'text-slate-500'} uppercase tracking-wider">Geç Kalan Talebe</div>
              <div class="text-xl sm:text-2xl font-black ${lateStudentsCount > 0 ? 'text-amber-900' : 'text-slate-900'} mt-0.5">${lateStudentsCount}</div>
              <div class="text-[10px] ${lateStudentsCount > 0 ? 'text-amber-700' : 'text-slate-400'} font-semibold mt-0.5">En Az 1 Kez Geç</div>
            </div>

            <!-- 5. Toplam 3x Telafi Süresi -->
            <div class="p-3 ${penaltyMinutesInView > 0 ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-200' : 'bg-slate-50 border-slate-200'} rounded-2xl border text-center">
              <div class="text-[10px] font-black ${penaltyMinutesInView > 0 ? 'text-rose-800' : 'text-slate-500'} uppercase tracking-wider">Toplam Telafi (3x)</div>
              <div class="text-base sm:text-lg font-black ${penaltyMinutesInView > 0 ? 'text-rose-700' : 'text-slate-900'} mt-1 truncate" title="${totalPenaltyFormatted}">
                ${penaltyMinutesInView > 0 ? totalPenaltyFormatted : '0 dk'}
              </div>
              <div class="text-[10px] ${penaltyMinutesInView > 0 ? 'text-rose-600' : 'text-slate-400'} font-semibold mt-0.5">İzne Ek Süre</div>
            </div>

            <!-- 6. İzinli / Mazeretli -->
            <div class="p-3 bg-teal-50/80 rounded-2xl border border-teal-200 text-center">
              <div class="text-[10px] font-black text-teal-800 uppercase tracking-wider">İzinli / Mazeret</div>
              <div class="text-xl sm:text-2xl font-black text-teal-900 mt-0.5">${excusedInView}</div>
              <div class="text-[10px] text-teal-700 font-semibold mt-0.5">0 Telafi • 0 Puan</div>
            </div>
          </div>

          <!-- 3. FİLTRELER: Sınıf & Durum & Arama -->
          <div class="space-y-3 pt-2 border-t border-slate-100">
            <!-- Sınıf Butonları -->
            <div>
              <div class="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>SINIF FİLTRESİ:</span>
                ${this.selectedClasses.length > 0 ? `
                  <button type="button" onclick="window.LeaveReturnModule.toggleAllClasses()" class="text-indigo-600 font-bold hover:underline cursor-pointer">
                    Filtreyi Temizle
                  </button>
                ` : ''}
              </div>
              <div class="flex flex-wrap items-center gap-1.5">
                <button type="button" onclick="window.LeaveReturnModule.toggleAllClasses()"
                  class="px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                    this.selectedClasses.length === 0 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }">
                  Tüm Sınıflar (${allStudents.length})
                </button>
                ${classes.map(c => {
                  const isChecked = this.selectedClasses.includes(c);
                  return `
                    <button type="button" onclick="window.LeaveReturnModule.toggleClass('${c}')"
                      class="px-2.5 py-1.5 rounded-xl text-xs font-black transition border flex items-center gap-1 cursor-pointer ${
                        isChecked 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }">
                      <span>${isChecked ? '✓' : '+'}</span>
                      <span>${c}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Hızlı Durum Filtreleri & Arama Kutusu -->
            <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div class="flex flex-wrap items-center gap-1.5">
                <button type="button" onclick="window.LeaveReturnModule.setMonthlyStatusFilter('ALL')"
                  class="px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                    this.monthlyStatusFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }">
                  Tümü (${reports.length})
                </button>
                <button type="button" onclick="window.LeaveReturnModule.setMonthlyStatusFilter('GEC')"
                  class="px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                    this.monthlyStatusFilter === 'GEC'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                  }">
                  <span>🚨 Sadece Geç Kalanlar (Telafililer)</span>
                  ${lateStudentsCount > 0 ? `<span class="bg-rose-700 text-white px-1.5 py-0.2 rounded-full text-[10px] font-black">${lateStudentsCount}</span>` : ''}
                </button>
                <button type="button" onclick="window.LeaveReturnModule.setMonthlyStatusFilter('IZINLI')"
                  class="px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                    this.monthlyStatusFilter === 'IZINLI'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200'
                  }">
                  <span>🏷️ Sadece İzinliler</span>
                </button>
                <button type="button" onclick="window.LeaveReturnModule.setMonthlyStatusFilter('VAKTINDE')"
                  class="px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                    this.monthlyStatusFilter === 'VAKTINDE'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }">
                  <span>🟢 Sadece Vaktinde Dönenler</span>
                </button>
              </div>

              <!-- Arama Kutusu -->
              <div class="w-full sm:w-64 relative">
                <input type="text" placeholder="Talebe adı, oda, no ara..." value="${this.searchQuery}"
                  class="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  oninput="window.LeaveReturnModule.searchQuery = this.value.toLowerCase().trim(); window.LeaveReturnModule.renderView();">
                <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. TALEBE AYLIK DÖKÜM TABLOSU -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-black">
                  <th class="py-3 px-3 w-10 text-center">#</th>
                  <th class="py-3 px-3">Talebe Adı Soyadı</th>
                  <th class="py-3 px-3 w-20 text-center">Sınıf</th>
                  <th class="py-3 px-3">Yatakhane / Hoca</th>
                  <th class="py-3 px-3 text-center">Kayıtlı Dönüş</th>
                  <th class="py-3 px-3 text-center">Vaktinde</th>
                  <th class="py-3 px-3 text-center">Geç Kalma</th>
                  <th class="py-3 px-3 text-center">Toplam Gecikme</th>
                  <th class="py-3 px-3 text-center">İzne Ek Telafi Süresi (3x)</th>
                  <th class="py-3 px-3 text-center">İzinli</th>
                  <th class="py-3 px-3 text-center">Haftalık Döküm</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium text-slate-800">
                ${reports.length === 0 ? `
                  <tr>
                    <td colspan="11" class="py-12 text-center text-slate-400 font-semibold">
                      Seçilen filtre ve kriterlere uygun talep/kayıt bulunamadı.
                    </td>
                  </tr>
                ` : reports.map((item, idx) => {
                  const s = item.student;
                  const r = item.report;
                  const hasPenalty = r.totalPenaltyMinutes > 0;
                  const rowClass = hasPenalty ? 'bg-rose-50/40 hover:bg-rose-50' : 'hover:bg-slate-50/80';

                  return `
                    <tr class="${rowClass} transition cursor-pointer" onclick="window.LeaveReturnModule.openStudentMonthlyModal('${s.id}')">
                      <td class="py-3 px-3 text-center font-bold text-slate-400">${idx + 1}</td>
                      <td class="py-3 px-3 font-black text-slate-900 text-sm">
                        <div class="flex items-center gap-1.5">
                          <span>${s.firstName} ${s.lastName}</span>
                          ${hasPenalty ? `<span class="px-1.5 py-0.2 rounded bg-rose-600 text-white font-black text-[9px] uppercase">TELAFİLİ</span>` : ''}
                        </div>
                        <div class="text-[10px] text-slate-400 font-mono">No: ${s.studentNo || s.id}</div>
                      </td>
                      <td class="py-3 px-3 text-center">
                        <span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[10px]">${s.className}</span>
                      </td>
                      <td class="py-3 px-3 text-slate-600">
                        ${s.yatakhane ? `<span class="inline-flex items-center gap-0.5 text-indigo-900 font-bold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 text-[10px]">🛏️ ${s.yatakhane}</span>` : ''}
                        ${(s.etutHocasi || s.dahiliHoca) ? `<div class="text-[10px] text-slate-400 mt-0.5">👨‍🏫 ${s.etutHocasi || s.dahiliHoca}</div>` : ''}
                      </td>
                      <td class="py-3 px-3 text-center font-bold">${r.totalReturns} Hafta</td>
                      <td class="py-3 px-3 text-center font-bold text-emerald-700">
                        ${r.onTimeCount > 0 ? `🟢 ${r.onTimeCount}` : '-'}
                      </td>
                      <td class="py-3 px-3 text-center font-black ${r.lateCount > 0 ? 'text-rose-700' : 'text-slate-400'}">
                        ${r.lateCount > 0 ? `⚠️ ${r.lateCount} Kez` : '0'}
                      </td>
                      <td class="py-3 px-3 text-center font-bold ${r.totalLateMinutes > 0 ? 'text-amber-800' : 'text-slate-400'}">
                        ${r.totalLateMinutes > 0 ? `${r.totalLateMinutes} dk` : '-'}
                      </td>
                      <td class="py-3 px-3 text-center">
                        ${hasPenalty ? `
                          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-600 text-white font-mono font-black text-xs shadow-2xs">
                            <span>+${r.totalPenaltyMinutes} dk</span>
                            <span class="text-[10px] font-normal opacity-90">(${r.totalPenaltyFormatted})</span>
                          </span>
                        ` : `
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                            <span>✓</span> <span>0 dk (Telafi Yok)</span>
                          </span>
                        `}
                      </td>
                      <td class="py-3 px-3 text-center font-bold text-teal-800">
                        ${r.excusedCount > 0 ? `🏷️ ${r.excusedCount}` : '-'}
                      </td>
                      <td class="py-3 px-3 text-center">
                        <button type="button" onclick="event.stopPropagation(); window.LeaveReturnModule.openStudentMonthlyModal('${s.id}')"
                          class="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition border border-indigo-200 cursor-pointer shadow-2xs">
                          <span>İncele ↗</span>
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 5. TALEBE AYLIK DETAY MODALI -->
        <div id="leave-return-monthly-student-modal"></div>
      </div>
    `;

    // Eğer talebe modalı açıksa render et
    if (this.monthlyModalStudentId) {
      this.renderStudentMonthlyDetailModal();
    }
  },

  // --- 3. TALEBEYE ÖZEL AYLIK HAFTALIK DÖKÜM MODALI ---
  renderStudentMonthlyDetailModal() {
    const modalContainer = document.getElementById('leave-return-monthly-student-modal');
    if (!modalContainer || !this.monthlyModalStudentId) return;

    const student = window.Store.getStudentById(this.monthlyModalStudentId);
    if (!student) return;

    const report = window.Store.getMonthlyLeaveReturnReportForStudent(student.id, this.currentMonth);
    const monthName = this.getMonthNameTurkish(this.currentMonth);

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fade-in no-print"
        onclick="if(event.target === this) window.LeaveReturnModule.closeStudentMonthlyModal()">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-5 sm:p-6 space-y-4 max-h-[90vh] flex flex-col">
          <!-- Başlık & Kapatma -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-800 font-black text-xl flex items-center justify-center shadow-inner">
                🧳
              </div>
              <div>
                <h3 class="font-black text-base sm:text-lg text-slate-900">${student.firstName} ${student.lastName}</h3>
                <p class="text-xs text-slate-500 font-medium">
                  ${student.className} • No: ${student.studentNo || student.id} • ${student.yatakhane ? '🛏️ ' + student.yatakhane : ''}
                </p>
              </div>
            </div>
            <button onclick="window.LeaveReturnModule.closeStudentMonthlyModal()"
              class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-black transition flex items-center justify-center cursor-pointer">
              ✕
            </button>
          </div>

          <!-- Aylık Özet Şeridi -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span class="text-[10px] text-slate-500 font-black uppercase">İncelenen Ay</span>
              <div class="font-black text-slate-900 text-sm mt-0.5">${monthName}</div>
            </div>
            <div class="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200">
              <span class="text-[10px] text-indigo-700 font-black uppercase">Dönüş Sayısı</span>
              <div class="font-black text-indigo-900 text-sm mt-0.5">${report.totalReturns} Hafta</div>
            </div>
            <div class="p-2.5 ${report.lateCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'} rounded-xl border">
              <span class="text-[10px] ${report.lateCount > 0 ? 'text-amber-800' : 'text-emerald-700'} font-black uppercase">Geç Kalma</span>
              <div class="font-black ${report.lateCount > 0 ? 'text-amber-900' : 'text-emerald-800'} text-sm mt-0.5">
                ${report.lateCount > 0 ? `${report.lateCount} Kez (${report.totalLateMinutes} dk)` : '0 (Yok)'}
              </div>
            </div>
            <div class="p-2.5 ${report.totalPenaltyMinutes > 0 ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'} rounded-xl border">
              <span class="text-[10px] ${report.totalPenaltyMinutes > 0 ? 'text-rose-800' : 'text-slate-500'} font-black uppercase">Toplam Telafi (3x)</span>
              <div class="font-black ${report.totalPenaltyMinutes > 0 ? 'text-rose-700' : 'text-slate-700'} text-sm mt-0.5">
                ${report.totalPenaltyMinutes > 0 ? `+${report.totalPenaltyMinutes} dk` : '0 dk'}
              </div>
            </div>
          </div>

          <!-- Haftalık Kayıt Dökümü Tablosu -->
          <div class="flex-1 overflow-y-auto border border-slate-200 rounded-2xl">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-100 text-slate-700 uppercase text-[10px] font-black border-b border-slate-200">
                  <th class="py-2.5 px-3">Tarih & Gün</th>
                  <th class="py-2.5 px-3 text-center">Beklenen Saat</th>
                  <th class="py-2.5 px-3 text-center">Varış Saati</th>
                  <th class="py-2.5 px-3 text-center">Durum / Fark</th>
                  <th class="py-2.5 px-3 text-center">Ek Telafi Süresi</th>
                  <th class="py-2.5 px-3">Mazeret / Not</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${report.records.length === 0 ? `
                  <tr>
                    <td colspan="6" class="py-8 text-center text-slate-400 font-semibold">
                      Bu ay için henüz kayıtlı bir izin dönüşü bulunamadı.
                    </td>
                  </tr>
                ` : report.records.map(rec => {
                  const dayName = window.LeaveReturnModule.getDayName(rec.date);
                  const isLate = rec.status === 'GEC';
                  const isExcused = rec.status === 'IZINLI';
                  return `
                    <tr class="${isLate ? 'bg-rose-50/50' : 'hover:bg-slate-50'}">
                      <td class="py-2.5 px-3 font-bold text-slate-800">
                        ${rec.date} <span class="text-slate-500 font-normal">(${dayName})</span>
                      </td>
                      <td class="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                        ${rec.expectedTime || '-'}
                      </td>
                      <td class="py-2.5 px-3 text-center font-mono font-black text-slate-900">
                        ${rec.arrivalTime || (isExcused ? 'İzinli' : '-')}
                      </td>
                      <td class="py-2.5 px-3 text-center">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black ${
                          isLate 
                            ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                            : (isExcused ? 'bg-teal-100 text-teal-800' : 'bg-emerald-100 text-emerald-800')
                        }">
                          ${rec.statusLabel || (isLate ? `${rec.lateMinutes} dk Geç` : 'Vaktinde')}
                        </span>
                      </td>
                      <td class="py-2.5 px-3 text-center font-mono font-black ${rec.penaltyMinutes > 0 ? 'text-rose-700' : 'text-slate-400'}">
                        ${rec.penaltyMinutes > 0 ? `+${rec.penaltyMinutes} dk (3x)` : '0 dk'}
                      </td>
                      <td class="py-2.5 px-3 text-slate-500 text-[11px]">
                        ${rec.excuseType ? `<span class="font-bold text-amber-900">🏷️ ${rec.excuseType}</span>` : '-'}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Alt Butonlar -->
          <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div class="flex items-center gap-2">
              <button type="button" onclick="window.LeaveReturnModule.sendWhatsAppMonthlyReport('${student.id}')"
                class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer">
                <span>📲</span> <span>Veliye WhatsApp Raporu Gönder</span>
              </button>
              ${student.parentPhone || student.fatherPhone ? `
                <a href="tel:${student.parentPhone || student.fatherPhone}" class="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold hover:underline">
                  <span>📞</span> <span>Veli Ara</span>
                </a>
              ` : ''}
            </div>

            <button type="button" onclick="window.LeaveReturnModule.closeStudentMonthlyModal()"
              class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition cursor-pointer">
              Tamam, Kapat
            </button>
          </div>
        </div>
      </div>
    `;
  }
};
