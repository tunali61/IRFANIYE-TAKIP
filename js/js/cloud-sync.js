/**
 * firebase-sync.js - Canlı Bulut Senkronizasyonu (Google Firebase Firestore)
 */

window.CloudSync = {
  db: null,
  isCloudActive: false,
  listeners: [],

  init() {
    const configStr = localStorage.getItem('yoklama_firebase_config');
    if (!configStr) {
      this.isCloudActive = false;
      return;
    }

    try {
      const config = JSON.parse(configStr);
      if (config.apiKey && config.projectId) {
        if (!firebase.apps.length) {
          firebase.initializeApp(config);
        }
        this.db = firebase.firestore();
        this.isCloudActive = true;
        console.log("Firebase Cloud bağlantısı başarılı!");
      }
    } catch (e) {
      console.warn("Firebase başlatılamadı:", e);
      this.isCloudActive = false;
    }
  },

  saveConfig(configObj) {
    localStorage.setItem('yoklama_firebase_config', JSON.stringify(configObj));
    this.init();
  },

  clearConfig() {
    localStorage.removeItem('yoklama_firebase_config');
    this.isCloudActive = false;
    this.db = null;
  },

  // Bulut Veritabanına Öğrenci Kaydet
  async syncStudent(student) {
    if (!this.isCloudActive || !this.db) return;
    try {
      await this.db.collection('students').doc(student.id).set(student);
    } catch (e) {
      console.error("Öğrenci buluta yüklenemedi:", e);
    }
  },

  async deleteStudent(studentId) {
    if (!this.isCloudActive || !this.db) return;
    try {
      await this.db.collection('students').doc(studentId).delete();
    } catch (e) {
      console.error("Öğrenci buluttan silinemedi:", e);
    }
  },

  // Bulut Veritabanına Yoklama Kaydet
  async syncAttendance(record) {
    if (!this.isCloudActive || !this.db) return;
    try {
      await this.db.collection('attendance').doc(record.id).set(record);
    } catch (e) {
      console.error("Yoklama buluta yüklenemedi:", e);
    }
  },

  // Bulut Veritabanına Performans Notu Kaydet
  async syncPerformance(perf) {
    if (!this.isCloudActive || !this.db) return;
    try {
      await this.db.collection('performance').doc(perf.id).set(perf);
    } catch (e) {
      console.error("Performans buluta yüklenemedi:", e);
    }
  },

  // Tüm Verileri Buluttan İndir ve Yerel Hafızayla Eşitle
  async pullAllFromCloud() {
    if (!this.isCloudActive || !this.db) return false;
    try {
      // Öğrenciler
      const stdSnap = await this.db.collection('students').get();
      if (!stdSnap.empty) {
        const students = [];
        stdSnap.forEach(doc => students.push(doc.data()));
        window.Store.saveStudents(students);
      }

      // Yoklama
      const attSnap = await this.db.collection('attendance').get();
      if (!attSnap.empty) {
        const records = [];
        attSnap.forEach(doc => records.push(doc.data()));
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
      }

      // Performans
      const perfSnap = await this.db.collection('performance').get();
      if (!perfSnap.empty) {
        const perfs = [];
        perfSnap.forEach(doc => perfs.push(doc.data()));
        localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify(perfs));
      }

      return true;
    } catch (e) {
      console.error("Buluttan veri çekme hatası:", e);
      return false;
    }
  },

  // Mevcut Tüm Yerel Verileri Buluta Gönder (İlk Kurulum)
  async pushAllToCloud() {
    if (!this.isCloudActive || !this.db) return false;
    try {
      const batch = this.db.batch();

      const students = window.Store.getStudents();
      students.forEach(s => {
        const ref = this.db.collection('students').doc(s.id);
        batch.set(ref, s);
      });

      const att = window.Store.getAttendance();
      att.forEach(a => {
        const ref = this.db.collection('attendance').doc(a.id);
        batch.set(ref, a);
      });

      const perf = window.Store.getPerformances();
      perf.forEach(p => {
        const ref = this.db.collection('performance').doc(p.id);
        batch.set(ref, p);
      });

      await batch.commit();
      return true;
    } catch (e) {
      console.error("Buluta yükleme hatası:", e);
      return false;
    }
  }
};
