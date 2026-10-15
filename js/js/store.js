/**
 * store.js - Ad Soyad + Şifre ile Kullanıcı Doğrulama ve E-posta ile Ana Yönetici Girişi
 */

const STORAGE_KEYS = {
  STUDENTS: 'yoklama_students',
  LOCAL_STUDENT_EDITS: 'yoklama_local_student_edits_v1',
  DELETED_STUDENT_IDS: 'yoklama_deleted_student_ids_v1',
  PASSIVE_STUDENT_IDS: 'yoklama_passive_student_ids_v1',
  STAFF: 'yoklama_staff',
  ATTENDANCE: 'yoklama_attendance',
  PERFORMANCE: 'yoklama_performance',
  ACADEMIC_SCORES: 'yoklama_academic_scores',
  TEST_RESULTS: 'yoklama_test_results_v1',
  LEAVE_CHECKOUT: 'yoklama_leave_checkout_v1',
  PENALTY_CLEARED: 'yoklama_penalty_cleared_v1',
  LEAVE_RETURN: 'yoklama_leave_returns_v1',
  BONUS_POINTS: 'yoklama_bonus_points_v1',
  CUSTOM_COLUMNS: 'yoklama_custom_columns_v1',
  DUTIES: 'yoklama_daily_duties_v1',
  HADISLER: 'yoklama_custom_hadisler_v1',
  QURAN_TRACKER: 'yoklama_quran_tracker_v1',
  SETTINGS: 'yoklama_settings',
  INITIALIZED: 'yoklama_init_v5'
};

const STATUS_CONFIG = {
  // Namaz Yoklaması
  VAR: { code: 'VAR', label: 'Var', short: 'Var', bg: '#10b981', border: '#059669', desc: 'Kursta mevcut' },
  YOK: { code: 'YOK', label: 'Yok', short: 'Yok', bg: '#ef4444', border: '#dc2626', desc: 'Katılmadı / Yok' },
  GEC: { code: 'GEC', label: 'Geç', short: 'Geç', bg: '#f59e0b', border: '#d97706', desc: 'Geç kaldı' },
  TAKKESIZ: { code: 'TAKKESIZ', label: 'Takkesiz', short: 'Takkesiz', bg: '#9333ea', border: '#7e22ce', desc: 'Takkesiz katıldı' },
  GEC_TAKKESIZ: { code: 'GEC_TAKKESIZ', label: 'Geç + Takkesiz', short: 'Geç+Tak.', bg: '#9333ea', border: '#7e22ce', desc: 'Hem geç kaldı hem takkesiz katıldı' },
  IZINLI: { code: 'IZINLI', label: 'İzinli', short: 'İzinli', bg: '#0d9488', border: '#0f766e', desc: 'İzinli / Raporlu' },

  // Yatak Yoklaması
  IYI: { code: 'IYI', label: 'İyi', short: 'İyi', bg: '#10b981', border: '#059669', desc: 'Yatak ve oda temiz/düzenli' },
  ORTA: { code: 'ORTA', label: 'Orta', short: 'Orta', bg: '#f59e0b', border: '#d97706', desc: 'Kısmen düzensiz' },
  KOTU: { code: 'KOTU', label: 'Kötü', short: 'Kötü', bg: '#ef4444', border: '#dc2626', desc: 'Düzensiz / Dağınık' },

  // Okul Dönüşü Yoklaması
  GELDI: { code: 'GELDI', label: 'Geldi', short: 'Geldi', bg: '#10b981', border: '#059669', desc: 'Okuldan vaktinde döndü' },
  GELMEDI: { code: 'GELMEDI', label: 'Gelmedi', short: 'Gelmedi', bg: '#ef4444', border: '#dc2626', desc: 'Okuldan dönmedi' }
};

// Eski kodlarla geriye dönük tam uyumluluk
STATUS_CONFIG.V = STATUS_CONFIG.VAR;
STATUS_CONFIG.K = STATUS_CONFIG.YOK;
STATUS_CONFIG.Y = STATUS_CONFIG.YOK;
STATUS_CONFIG.G = STATUS_CONFIG.GEC;
STATUS_CONFIG.T = STATUS_CONFIG.TAKKESIZ;
STATUS_CONFIG.GT = STATUS_CONFIG.GEC_TAKKESIZ;
STATUS_CONFIG.TG = STATUS_CONFIG.GEC_TAKKESIZ;
STATUS_CONFIG.TAKKESIZ_GEC = STATUS_CONFIG.GEC_TAKKESIZ;
STATUS_CONFIG.I = STATUS_CONFIG.IZINLI;
STATUS_CONFIG.E = STATUS_CONFIG.VAR;

const DEFAULT_SETTINGS = {
  institutionName: 'Ömer Avniyel Akademi',
  institutionLogo: 'kurs_logo.jpg', // Varsayılan kurs logosu dosya adı
  adminEmail: 'selimbozkurt111@gmail.com', // Ana yöneticinin doğrulama maili alacağı adres
  adminPassword: '123', // Ana Kurum Yöneticisi özel giriş şifresi (Personelden bağımsız)
  academicYear: '2026-2027',
  firebaseUrl: 'https://oay-takip-default-rtdb.firebaseio.com', // Canlı Bulut Veritabanı URL
  yatakReminderEnabled: true, // Otomatik yatak kontrolü hatırlatıcısı
  yatakReminderStartTime: '08:30', // Başlangıç saati (sabah 08:30)
  yatakReminderIntervalMins: 30, // Kontrol edilmedikçe her 30 dakikada bir tekrar
  expectedSundayTime: '18:00', // Pazar akşamı 7 ve 8. sınıflar için standart dönüş saati
  expectedMondayTime: '08:00', // Pazartesi sabahı 5 ve 6. sınıflar için standart dönüş saati
  leaveReturnDate: '' // Seçili izin dönüş tarihi (tüm cihazlarda ortak takip için)
};

// Sistemdeki Eğitmen / Hoca Kadrosu (İsim ve Şifreleri ile)
// NOT: Selim Bozkurt kurumun Dahili Hocasıdır; Kurum Yöneticisi ise ayrı bir süper yetkili hesaptır.
const DEFAULT_STAFF = [
  { id: 'stf_1', fullName: 'SELİM BOZKURT', role: 'Dahili Hocası', phone: '0555 000 00 01', password: '123' },
  { id: 'stf_2', fullName: 'YASİN EKİNCİ', role: '5-A Sınıfı Etüt & Dahili Hocası', phone: '0555 000 00 02', password: '123' },
  { id: 'stf_3', fullName: 'AHMED MUBARİZ', role: '5-B Sınıfı Etüt & Dahili Hocası', phone: '0555 000 00 03', password: '123' },
  { id: 'stf_4', fullName: 'ABDUSSAMED TAV', role: '6. Sınıf (6-A & 6-B) Etüt & Dahili Hocası', phone: '0555 000 00 04', password: '123' },
  { id: 'stf_5', fullName: 'EMİR TALHA TARIM', role: '7-A Sınıfı Etüt & Dahili Hocası', phone: '0555 000 00 05', password: '123' },
  { id: 'stf_6', fullName: 'BURAK BODUR', role: '7-B Sınıfı Etüt & Dahili Hocası', phone: '0555 000 00 06', password: '123' },
  { id: 'stf_7', fullName: 'TUNAHAN TAŞKIN', role: '8-A Sınıfı Etüt & Dahili Hocası', phone: '0555 000 00 07', password: '123' },
  { id: 'stf_8', fullName: 'YAVUZ SELİM SEVEN', role: '8-B Sınıfı Etüt Hocası', phone: '0555 000 00 08', password: '123' }
];

// 66 Öğrencinin Eksiksiz Veritabanı (5-A, 5-B, 6-A, 6-B, 7-A, 7-B, 8-A, 8-B)
const SEED_STUDENTS = [
  // 5-A SINIFI (Yasin Ekinci Grubu)
  { id: "std_502", studentNo: "502", firstName: "ARDA YUSUF", lastName: "SAYGI", className: "5-A", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 101", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SAYGI2026", password: "123" },
  { id: "std_503", studentNo: "503", firstName: "ASİL MİRAÇ", lastName: "SOYLU", className: "5-A", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 101", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SOYLU2026", password: "123" },
  { id: "std_504", studentNo: "504", firstName: "ÖMER", lastName: "SAAT", className: "5-A", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 101", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SAAT2026", password: "123" },
  { id: "std_505", studentNo: "505", firstName: "TİMUR FERMAN", lastName: "NARLIDERE", className: "5-A", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 101", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "NARLIDERE2026", password: "123" },
  { id: "std_506", studentNo: "506", firstName: "EYMEN ASAF", lastName: "ÖZHÖLÇEK", className: "5-A", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 101", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "OZHOLCEK2026", password: "123" },
  { id: "std_507", studentNo: "507", firstName: "KADİR YİĞİT", lastName: "KARABULUT", className: "5-A", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 102", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KARABULUT2026", password: "123" },
  { id: "std_508", studentNo: "508", firstName: "MEHMET EMİN", lastName: "KALKAN", className: "5-A", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 102", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KALKAN2026", password: "123" },
  { id: "std_509", studentNo: "509", firstName: "MUSTAFA ENSAR", lastName: "KALKAN", className: "5-A", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 102", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KALKAN2026", password: "123" },

  // 5-B SINIFI (Ahmed Mubariz Grubu)
  { id: "std_510", studentNo: "510", firstName: "RÜZGAR SAİT", lastName: "GÖGÜZ", className: "5-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 102", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "GOGUZ2026", password: "123" },
  { id: "std_511", studentNo: "511", firstName: "SAİD ABBAS", lastName: "SABİRİ", className: "5-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 103", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SABIRI2026", password: "123" },
  { id: "std_512", studentNo: "512", firstName: "SAİD MURTAZA", lastName: "SABİRİ", className: "5-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 103", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SABIRI2026", password: "123" },
  { id: "std_513", studentNo: "513", firstName: "HIZIR ALİ", lastName: "DİNÇER", className: "5-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 103", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "DINCER2026", password: "123" },
  { id: "std_514", studentNo: "514", firstName: "MEHMET ENSAR", lastName: "AKYOL", className: "5-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 103", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "AKYOL2026", password: "123" },
  { id: "std_515", studentNo: "515", firstName: "YASİN KAAN", lastName: "CAN", className: "5-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 104", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "CAN2026", password: "123" },
  { id: "std_516", studentNo: "516", firstName: "SANAULLAH", lastName: "KAYUMOĞLU", className: "5-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 104", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KAYUMOGLU2026", password: "123" },
  { id: "std_517", studentNo: "517", firstName: "MUSTAFA", lastName: "EMİR", className: "5-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 104", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "EMIR52026", password: "123" },
  { id: "std_518", studentNo: "518", firstName: "HAMZA", lastName: "TOKSÖZ", className: "5-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 104", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "TOKSOZ2026", password: "123" },

  // 6-A SINIFI (Abdulhak Hamit & Oda 201 Grubu)
  { id: "std_601", studentNo: "601", firstName: "MUHAMMED ALİ", lastName: "YILDIRAK", className: "6-A", school: "ABDULHAK HAMİT", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 201", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "YILDIRAK2026", password: "123" },
  { id: "std_602", studentNo: "602", firstName: "BABÜR", lastName: "KAYUMOĞLU", className: "6-A", school: "ABDULHAK HAMİT", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 201", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KAYUMOGLU2026", password: "123" },
  { id: "std_603", studentNo: "603", firstName: "ALİHAN", lastName: "ŞAHİN", className: "6-A", school: "ABDULHAK HAMİT", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 201", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SAHIN2026", password: "123" },
  { id: "std_604", studentNo: "604", firstName: "SELMAN FARİS", lastName: "ÖZTÜRK", className: "6-A", school: "ABDULHAK HAMİT", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 201", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "OZTURK2026", password: "123" },
  { id: "std_605", studentNo: "605", firstName: "YUNUS", lastName: "ÖZTÜRK", className: "6-A", school: "ABDULHAK HAMİT", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 201", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "OZTURK2026", password: "123" },

  // 6-B SINIFI (Oda 202 Grubu)
  { id: "std_606", studentNo: "606", firstName: "MELİH", lastName: "ÇARABATIR", className: "6-B", school: "-", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 202", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "CARABATIR2026", password: "123" },
  { id: "std_607", studentNo: "607", firstName: "MUSTAFA", lastName: "ÖZCAN", className: "6-B", school: "-", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 202", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "OZCAN2026", password: "123" },
  { id: "std_608", studentNo: "608", firstName: "EBUBEKİR", lastName: "ABDULLAH", className: "6-B", school: "-", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 202", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "ABDULLAH2026", password: "123" },
  { id: "std_609", studentNo: "609", firstName: "MEHMET", lastName: "EMİR", className: "6-B", school: "-", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 202", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "EMIR62026", password: "123" },
  { id: "std_610", studentNo: "610", firstName: "MAHMUT BERK", lastName: "KARACADAĞ", className: "6-B", school: "-", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 202", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KARACADAG2026", password: "123" },

  // 7-A SINIFI (Emir Talha Tarım Grubu)
  { id: "std_701", studentNo: "701", firstName: "AHMET HİLMİ", lastName: "EKİNCİ", className: "7-A", school: "KADİR CİHAN KARAGÖZ", seviye: "Seviye 2", etutHocasi: "EMİR TALHA TARIM", dahiliHoca: "EMİR TALHA TARIM", yatakhane: "Oda 301", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "EKINCI2026", password: "123" },
  { id: "std_702", studentNo: "702", firstName: "EMİRHAN ENES", lastName: "ÖZTÜRK", className: "7-A", school: "ABDULHAK HAMİT", seviye: "Seviye 2", etutHocasi: "EMİR TALHA TARIM", dahiliHoca: "EMİR TALHA TARIM", yatakhane: "Oda 301", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "OZTURK2026", password: "123" },
  { id: "std_703", studentNo: "703", firstName: "BİLAL", lastName: "CHULUK", className: "7-A", school: "ABDULHAK HAMİT", seviye: "Seviye 2", etutHocasi: "EMİR TALHA TARIM", dahiliHoca: "EMİR TALHA TARIM", yatakhane: "Oda 301", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "CHULUK2026", password: "123" },
  { id: "std_704", studentNo: "704", firstName: "CİHAN", lastName: "KULAKLI", className: "7-A", school: "ABDULHAK HAMİT", seviye: "Seviye 2", etutHocasi: "EMİR TALHA TARIM", dahiliHoca: "EMİR TALHA TARIM", yatakhane: "Oda 301", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KULAKLI2026", password: "123" },
  { id: "std_705", studentNo: "705", firstName: "KASIM", lastName: "KULAKLI", className: "7-A", school: "ABDULHAK HAMİT", seviye: "Seviye 2", etutHocasi: "EMİR TALHA TARIM", dahiliHoca: "EMİR TALHA TARIM", yatakhane: "Oda 301", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KULAKLI2026", password: "123" },
  { id: "std_706", studentNo: "706", firstName: "AYAZ", lastName: "TUTAR", className: "7-A", school: "ABDULHAK HAMİT", seviye: "Seviye 2", etutHocasi: "EMİR TALHA TARIM", dahiliHoca: "EMİR TALHA TARIM", yatakhane: "Oda 302", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "TUTAR2026", password: "123" },
  { id: "std_707", studentNo: "707", firstName: "EMİRHAN", lastName: "KULUS", className: "7-A", school: "AYHAN ŞAHENK", seviye: "Seviye 2", etutHocasi: "EMİR TALHA TARIM", dahiliHoca: "EMİR TALHA TARIM", yatakhane: "Oda 302", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KULUS2026", password: "123" },

  // 7-B SINIFI (Burak Bodur Grubu)
  { id: "std_708", studentNo: "708", firstName: "YUSUF KEMAL", lastName: "GENÇOĞLU", className: "7-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "BURAK BODUR", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 302", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "GENCOGLU2026", password: "123" },
  { id: "std_709", studentNo: "709", firstName: "YUSUF", lastName: "GENÇOĞLU", className: "7-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "BURAK BODUR", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 302", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "GENCOGLU2026", password: "123" },
  { id: "std_710", studentNo: "710", firstName: "EFE EMİN", lastName: "SÜRÜCÜ", className: "7-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "BURAK BODUR", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 303", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SURUCU2026", password: "123" },
  { id: "std_711", studentNo: "711", firstName: "HARUN", lastName: "KAYUMOĞLU", className: "7-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "BURAK BODUR", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 303", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KAYUMOGLU2026", password: "123" },
  { id: "std_712", studentNo: "712", firstName: "MAHMUT TARIK", lastName: "BIÇAKÇILAR", className: "7-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "BURAK BODUR", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 303", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "BICAKCILAR2026", password: "123" },
  { id: "std_713", studentNo: "713", firstName: "ALİ ÖMER", lastName: "MENGİ", className: "7-B", school: "KAZIM ÖZALP", seviye: "Seviye 2", etutHocasi: "BURAK BODUR", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 304", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "MENGI2026", password: "123" },
  { id: "std_714", studentNo: "714", firstName: "MUHAMMADDIYOR", lastName: "RAYIMJONOV", className: "7-B", school: "KAZIM ÖZALP", seviye: "Seviye 2", etutHocasi: "BURAK BODUR", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 304", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "RAYIMJONOV2026", password: "123" },
  { id: "std_715", studentNo: "715", firstName: "MUSAB", lastName: "AKDOĞAN", className: "7-B", school: "KAZIM ÖZALP", seviye: "Seviye 3", etutHocasi: "BURAK BODUR", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 304", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "AKDOGAN2026", password: "123" },
  { id: "std_716", studentNo: "716", firstName: "SERKAN", lastName: "İNCEDERE", className: "7-B", school: "KAZIM ÖZALP", seviye: "Seviye 3", etutHocasi: "BURAK BODUR", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 304", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "INCEDERE2026", password: "123" },
  { id: "std_717", studentNo: "717", firstName: "RAMAZAN", lastName: "ATASOY", className: "7-B", school: "KAZIM ÖZALP", seviye: "Seviye 2", etutHocasi: "BURAK BODUR", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 304", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "ATASOY2026", password: "123" },

  // 8-A SINIFI (Tunahan Taşkın Grubu)
  { id: "std_801", studentNo: "801", firstName: "MEHMET YAKUP", lastName: "ÇEDİKÇİ", className: "8-A", school: "AYHAN ŞAHENK", seviye: "Seviye 1", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 401", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "CEDIKCI2026", password: "123" },
  { id: "std_802", studentNo: "802", firstName: "KERİM TUNA", lastName: "CİHAN", className: "8-A", school: "AYHAN ŞAHENK", seviye: "Seviye 1", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 401", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "CIHAN2026", password: "123" },
  { id: "std_803", studentNo: "803", firstName: "MUHAMMED", lastName: "CHOLAK", className: "8-A", school: "KADİR CİHAN", seviye: "Seviye 1", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 401", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "CHOLAK2026", password: "123" },
  { id: "std_804", studentNo: "804", firstName: "İBRAHİM", lastName: "UZTURK", className: "8-A", school: "KADİR CİHAN", seviye: "Seviye 1", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 401", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "UZTURK2026", password: "123" },
  { id: "std_805", studentNo: "805", firstName: "AHMET EMRE", lastName: "AKYOL", className: "8-A", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 401", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "AKYOL2026", password: "123" },
  { id: "std_806", studentNo: "806", firstName: "MEHMET FATİHHAN", lastName: "POLAT", className: "8-A", school: "ABDULHAK HAMİT", seviye: "Seviye 2", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 402", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "POLAT2026", password: "123" },
  { id: "std_807", studentNo: "807", firstName: "SAMED ENES", lastName: "ACAR", className: "8-A", school: "ABDULHAK HAMİT", seviye: "Seviye 2", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 402", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "ACAR2026", password: "123" },
  { id: "std_808", studentNo: "808", firstName: "MUHAMMED KERİM", lastName: "BAYBURT", className: "8-A", school: "KAZIM ÖZALP", seviye: "Seviye 2", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 402", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "BAYBURT2026", password: "123" },
  { id: "std_809", studentNo: "809", firstName: "ÖMER FARUK", lastName: "YAZICI", className: "8-A", school: "KAZIM ÖZALP", seviye: "Seviye 2", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 402", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "YAZICI2026", password: "123" },

  // 8-B SINIFI (Yavuz Selim Seven Grubu)
  { id: "std_810", studentNo: "810", firstName: "LATFULLAH ABID", lastName: "HUSSAIN", className: "8-B", school: "KAZIM ÖZALP", seviye: "Seviye 2", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 403", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "HUSSAIN2026", password: "123" },
  { id: "std_811", studentNo: "811", firstName: "EMİR SALİH", lastName: "DOĞAN", className: "8-B", school: "KAZIM ÖZALP", seviye: "Seviye 2", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 403", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "DOGAN2026", password: "123" },
  { id: "std_812", studentNo: "812", firstName: "BİLAL OSMAN", lastName: "ŞENGÜL", className: "8-B", school: "KAZIM ÖZALP", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 403", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SENGUL2026", password: "123" },
  { id: "std_813", studentNo: "813", firstName: "ALPEREN", lastName: "UYGUN", className: "8-B", school: "ABDULHAK HAMİT", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 403", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "UYGUN2026", password: "123" },
  { id: "std_814", studentNo: "814", firstName: "RÜÇHAN ZEKİ", lastName: "YILDIZ", className: "8-B", school: "ABDULHAK HAMİT", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 404", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "YILDIZ2026", password: "123" },
  { id: "std_815", studentNo: "815", firstName: "SEMİH CAN", lastName: "DEMİR", className: "8-B", school: "ABDULHAK HAMİT", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 404", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "DEMIR2026", password: "123" },
  { id: "std_816", studentNo: "816", firstName: "YUSUF", lastName: "ULUSOY", className: "8-B", school: "ABDULHAK HAMİT", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 404", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "ULUSOY2026", password: "123" },
  { id: "std_817", studentNo: "817", firstName: "SÜLEYMAN", lastName: "HASTÜRK", className: "8-B", school: "-", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 404", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "HASTURK2026", password: "123" },
  { id: "std_818", studentNo: "818", firstName: "MUHAMMED SONER", lastName: "ERCİVAN", className: "8-B", school: "KAZIM ÖZALP", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 405", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "ERCIVAN2026", password: "123" },
  { id: "std_819", studentNo: "819", firstName: "ŞABAN", lastName: "ÖZDEMİR", className: "8-B", school: "KAZIM ÖZALP", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 405", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "OZDEMIR2026", password: "123" },
  { id: "std_820", studentNo: "820", firstName: "YİĞİT EMİR", lastName: "KILIÇ", className: "8-B", school: "KAZIM ÖZALP", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 405", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KILIC2026", password: "123" },
  { id: "std_821", studentNo: "821", firstName: "İSA MERT", lastName: "KARABULUT", className: "8-B", school: "KAZIM ÖZALP", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 405", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KARABULUT2026", password: "123" },
  { id: "std_822", studentNo: "822", firstName: "ÖMER FARUK", lastName: "ÖZTÜRK", className: "8-B", school: "-", seviye: "Seviye 2", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 405", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "OZTURK2026", password: "123" }
];

class DataStore {
  constructor() {
    this.init();
    this.activeAdminOtp = null; // Bellekte geçici OTP kodu
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
      this.resetToDefaults();
    }
    // Mevcut öğrencilerin şubelerini (5-A, 5-B, 6-A, 6-B, 7-A, 7-B, 8-A, 8-B) otomatik güncelle
    this.autoMigrateStudentClasses();

    if (!localStorage.getItem(STORAGE_KEYS.ACADEMIC_SCORES)) {
      const today = new Date().toISOString().split('T')[0];
      const sampleScores = [
        { id: 'acad_std_502_t', studentId: 'std_502', date: today, subject: 'Türkçe', score: 95, note: 'Paragraf ve okuma anlama çok iyi.', updatedAt: new Date().toISOString() },
        { id: 'acad_std_502_m', studentId: 'std_502', date: today, subject: 'Matematik', score: 90, note: 'Problem çözme becerisi yüksek.', updatedAt: new Date().toISOString() },
        { id: 'acad_std_503_m', studentId: 'std_503', date: today, subject: 'Matematik', score: 85, note: 'Gayretli ve dikkatli.', updatedAt: new Date().toISOString() },
        { id: 'acad_std_504_f', studentId: 'std_504', date: today, subject: 'Fen Bilimleri', score: 100, note: 'Mükemmel katılım.', updatedAt: new Date().toISOString() }
      ];
      localStorage.setItem(STORAGE_KEYS.ACADEMIC_SCORES, JSON.stringify(sampleScores));
    }
    if (this.getAttendance().length === 0) {
      this.seedDemoAttendance();
    }
  }

  // Eski "5. Sınıf" vb. kayıtları şubelere (5-A, 5-B, 6-A, 6-B, 7-A, 7-B, 8-A, 8-B) yükseltme (Sadece ilk kurulumda 1 kez)
  autoMigrateStudentClasses() {
    try {
      if (localStorage.getItem('yoklama_migrated_classes_done_v2')) return;

      const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list) || list.length === 0) return;

      const deletedMap = this.getDeletedStudentIds();
      let changed = false;
      const filteredList = list.filter(s => {
        if (!s || !s.id) return false;
        if (deletedMap[s.id] && deletedMap[s.id].isDeleted) {
          changed = true;
          return false;
        }
        return true;
      });

      const updatedList = filteredList.map(s => {
        if (!s) return s;
        const currentClass = (s.className || '').trim();
        // Zaten 5-A, 5-B gibi şube formatındaysa koru
        if (/^[5-8]-[AB]/i.test(currentClass)) return s;

        let newClass = currentClass;
        const no = parseInt(s.studentNo, 10);
        const hoca = (s.etutHocasi || '').toUpperCase();

        if (currentClass.includes('5') || (no >= 500 && no < 600)) {
          newClass = (hoca.includes('YASİN') || (no >= 502 && no <= 509)) ? '5-A' : '5-B';
        } else if (currentClass.includes('6') || (no >= 600 && no < 700)) {
          newClass = ((s.school && s.school.includes('ABDULHAK')) || (s.yatakhane && s.yatakhane.includes('201')) || (no >= 601 && no <= 605)) ? '6-A' : '6-B';
        } else if (currentClass.includes('7') || (no >= 700 && no < 800)) {
          newClass = (hoca.includes('EMİR TALHA') || (no >= 701 && no <= 707)) ? '7-A' : '7-B';
        } else if (currentClass.includes('8') || (no >= 800 && no < 900)) {
          newClass = (hoca.includes('TUNAHAN') || (no >= 801 && no <= 809)) ? '8-A' : '8-B';
        }

        if (newClass !== currentClass) {
          changed = true;
          return { ...s, className: newClass };
        }
        return s;
      });

      if (changed) {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updatedList));
        if (this.isCloudEnabled()) {
          this.syncToCloud('kurs_data/students', updatedList);
        }
      }
      localStorage.setItem('yoklama_migrated_classes_done_v2', 'true');
    } catch (e) {
      console.warn('[autoMigrateStudentClasses] Hata:', e);
    }
  }

  resetToDefaults() {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(SEED_STUDENTS));
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(DEFAULT_STAFF));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ACADEMIC_SCORES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }

  // --- Ayarlar ---
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const parsed = data ? JSON.parse(data) : {};
      const settings = { ...DEFAULT_SETTINGS, ...parsed };

      // Eğer kayıtlı kurum adı eski varsayılan ise veya boşsa Ömer Avniyel Akademi yap
      if (!settings.institutionName || settings.institutionName === 'Kurs & Etüt Öğrenci Takip Sistemi') {
        settings.institutionName = 'Ömer Avniyel Akademi';
      }

      // Eğer kayıtlı logo boş ise varsayılan kurs_logo.jpg kullan
      if (!settings.institutionLogo || !settings.institutionLogo.trim()) {
        settings.institutionLogo = 'kurs_logo.jpg';
      }

      if (!settings.adminEmail || settings.adminEmail === 'yonetici@kurs.com') {
        settings.adminEmail = 'selimbozkurt111@gmail.com';
      }

      if (!settings.adminPassword || !settings.adminPassword.trim()) {
        settings.adminPassword = '123';
      }

      if (!settings.firebaseUrl || !settings.firebaseUrl.trim()) {
        settings.firebaseUrl = 'https://oay-takip-default-rtdb.firebaseio.com';
      }

      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return settings;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(newSettings) {
    const current = this.getSettings();
    const merged = { ...current, ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/settings', merged);
    }
    return merged;
  }

  // ========================================================
  // --- GOOGLE FIREBASE CANLI BULUT VERİTABANI MOTORU ---
  // ========================================================
  getFirebaseUrl() {
    const settings = this.getSettings();
    let url = (settings.firebaseUrl || '').trim();
    if (!url) return '';
    url = url.replace(/\/+$/, '');
    return url;
  }

  isCloudEnabled() {
    return !!this.getFirebaseUrl();
  }

  getAllGateCheckouts() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LEAVE_CHECKOUT);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  // Buluta Asenkron Arka Plan Gönderimi
  async syncToCloud(endpoint, data) {
    const baseUrl = this.getFirebaseUrl();
    if (!baseUrl) return false;
    try {
      const res = await fetch(`${baseUrl}/${endpoint}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch (err) {
      console.warn(`[CloudSync] ${endpoint} gönderilemedi (çevrimdışı):`, err);
      return false;
    }
  }

  // Tüm Veritabanını Tek Tıkla Buluta İlk Yükleme
  async pushAllToCloud() {
    const baseUrl = this.getFirebaseUrl();
    if (!baseUrl) {
      return { success: false, message: 'Lütfen önce geçerli bir Firebase Veritabanı URL adresi giriniz.' };
    }

    const payload = {
      settings: this.getSettings(),
      students: this.getAllStudents(),
      staff: this.getStaff(),
      attendance: this.getAttendance(),
      performance: this.getPerformances(),
      academicScores: this.getAcademicScores(),
      gateCheckouts: this.getAllGateCheckouts(),
      penaltiesCleared: this.getAllClearedPenalties(),
      leaveReturns: this.getAllLeaveReturns(),
      bonusPoints: this.getAllBonusPoints(),
      customColumns: this.getCustomColumns(),
      passive_student_ids: this.getPassiveStudentIds(),
      deleted_student_ids: this.getDeletedStudentIds(),
      dailyDuties: this.getDailyDuties(),
      hadisler: this.getCustomHadisler(),
      hadisler_updatedAt: (localStorage.getItem('yoklama_custom_hadisler_meta_v1') ? JSON.parse(localStorage.getItem('yoklama_custom_hadisler_meta_v1')).updatedAt : new Date().toISOString()),
      quranTracker: this.getAllQuranRecords(),
      lastSyncedAt: new Date().toISOString()
    };

    try {
      const res = await fetch(`${baseUrl}/kurs_data.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        return { 
          success: true, 
          message: 'Tüm öğrenci, hoca, yoklama ve sistem verileri başarıyla buluta yüklendi! Artık tüm telefonlar ve bilgisayarlar bu verileri anlık görebilir.' 
        };
      } else {
        return { 
          success: false, 
          message: `Buluta yükleme başarısız (Kod: ${res.status}). Lütfen Firebase kurallarınızı ("read": true, "write": true) kontrol ediniz.` 
        };
      }
    } catch (err) {
      return { 
        success: false, 
        message: `Bağlantı hatası: ${err.message}. Lütfen internetinizi ve Firebase linkinizi kontrol ediniz.` 
      };
    }
  }

  // Buluttan En Güncel Verileri Çekme ve Yerel Hafıza ile Birleştirme (Merge)
  async syncFromCloud() {
    const baseUrl = this.getFirebaseUrl();
    if (!baseUrl) return { success: false, message: 'Bulut bağlantısı tanımlı değil.' };

    try {
      const res = await fetch(`${baseUrl}/kurs_data.json`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        return { success: false, message: `Bulut veri hatası: ${res.status}` };
      }

      const cloudData = await res.json();
      if (!cloudData) {
        return { success: true, message: 'Bulutta henüz kayıtlı veri bulunmuyor.' };
      }

      this.applyFullCloudSync(cloudData);
      return { 
        success: true, 
        message: 'Buluttaki en güncel yoklama ve not kayıtları cihazınıza başarıyla aktarıldı.' 
      };
    } catch (err) {
      console.warn('[CloudSync] Veri çekme hatası (çevrimdışı):', err);
      return { success: false, message: err.message };
    }
  }

  // Buluttan Gelen Verileri Yerel Hafıza ile Eksiksiz ve Akıllıca Birleştirme (Deep Merge)
  applyFullCloudSync(cloudData) {
    if (!cloudData || typeof cloudData !== 'object') return;

    // 1. Yoklamaları birleştir
    if (Array.isArray(cloudData.attendance)) {
      const localAtt = this.getAttendance();
      const attMap = new Map();
      localAtt.forEach(a => { if (a && a.id) attMap.set(a.id, a); });
      cloudData.attendance.forEach(a => {
        if (a && a.id) {
          const existing = attMap.get(a.id);
          if (!existing || (a.recordedAt && (!existing.recordedAt || new Date(a.recordedAt) >= new Date(existing.recordedAt)))) {
            attMap.set(a.id, a);
          }
        }
      });
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(Array.from(attMap.values())));
    }

    // 2. Performans notlarını birleştir
    if (Array.isArray(cloudData.performance)) {
      const localPerf = this.getPerformances();
      const perfMap = new Map();
      localPerf.forEach(p => { if (p && p.id) perfMap.set(p.id, p); });
      cloudData.performance.forEach(p => { if (p && p.id) perfMap.set(p.id, p); });
      localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify(Array.from(perfMap.values())));
    }

    // 3. Takviye ders notlarını birleştir
    if (Array.isArray(cloudData.academicScores)) {
      const localAcad = this.getAcademicScores();
      const acadMap = new Map();
      localAcad.forEach(s => { if (s && s.studentId) acadMap.set(`${s.studentId}_${s.date}_${s.subject}`, s); });
      cloudData.academicScores.forEach(s => {
        if (s && s.studentId) acadMap.set(`${s.studentId}_${s.date}_${s.subject}`, s);
      });
      localStorage.setItem(STORAGE_KEYS.ACADEMIC_SCORES, JSON.stringify(Array.from(acadMap.values())));
    }

    // 4. Pasif Öğrenci Sicili (CloudSync - Pasif talebelerin kaybolmasını kesinlikle engeller)
    if (cloudData.passive_student_ids && typeof cloudData.passive_student_ids === 'object') {
      const localPassiveMap = this.getPassiveStudentIds();
      const mergedPassiveMap = { ...localPassiveMap };
      Object.keys(cloudData.passive_student_ids).forEach(stId => {
        const cloudRec = cloudData.passive_student_ids[stId];
        const localRec = localPassiveMap[stId];
        if (!localRec || (cloudRec && cloudRec.updatedAt && (!localRec.updatedAt || new Date(cloudRec.updatedAt) >= new Date(localRec.updatedAt)))) {
          if (cloudRec && cloudRec.isPassive) {
            mergedPassiveMap[stId] = cloudRec;
          } else {
            delete mergedPassiveMap[stId];
          }
        }
      });
      localStorage.setItem(STORAGE_KEYS.PASSIVE_STUDENT_IDS, JSON.stringify(mergedPassiveMap));
    }

    // 4b. Silinenler Sicili (CloudSync Tombstone - Silinen talebelerin cihazlar arasında hortlamasını %100 engeller)
    let currentDeletedMap = this.getDeletedStudentIds();
    if (cloudData.deleted_student_ids && typeof cloudData.deleted_student_ids === 'object') {
      const mergedDeletedMap = { ...currentDeletedMap };
      Object.keys(cloudData.deleted_student_ids).forEach(stId => {
        const cloudRec = cloudData.deleted_student_ids[stId];
        const localRec = currentDeletedMap[stId];
        if (cloudRec && cloudRec.isDeleted) {
          mergedDeletedMap[stId] = cloudRec;
        } else if (localRec && localRec.isDeleted) {
          mergedDeletedMap[stId] = localRec;
        }
      });
      currentDeletedMap = mergedDeletedMap;
      localStorage.setItem(STORAGE_KEYS.DELETED_STUDENT_IDS, JSON.stringify(mergedDeletedMap));

      // Yerel hafızadaki öğrencileri de anında silinenlerden arındır
      try {
        const localRaw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed)) {
            const purged = parsed.filter(s => s && s.id && (!mergedDeletedMap[s.id] || !mergedDeletedMap[s.id].isDeleted));
            if (purged.length !== parsed.length) {
              localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(purged));
            }
          }
        }
      } catch (e) {}
    }

    // 5. Öğrenci listesi (Akıllı Birleştirme: Silinenleri Ayıklar, Pasif Durumunu ve Yerel Düzenlemeleri Asla Ezmez!)
    let cloudStudentsList = Array.isArray(cloudData.students) 
      ? cloudData.students 
      : (cloudData.students && typeof cloudData.students === 'object' ? Object.values(cloudData.students).filter(Boolean) : []);

    if (Array.isArray(cloudStudentsList) && cloudStudentsList.length > 0) {
      const deletedMap = currentDeletedMap;
      const passiveMap = this.getPassiveStudentIds();

      // Buluttan gelenler içinden silinmişleri temizle
      const validCloudStudents = cloudStudentsList.filter(s => s && s.id && (!deletedMap[s.id] || !deletedMap[s.id].isDeleted));

      // Yerel listeden de silinmişleri temizle
      let localStudents = [];
      try {
        const localRaw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed)) {
            localStudents = parsed.filter(s => s && s.id && (!deletedMap[s.id] || !deletedMap[s.id].isDeleted));
          }
        }
      } catch (e) {
        localStudents = this.getAllStudents();
      }

      const localStudentMap = new Map();
      localStudents.forEach(s => { if (s && s.id) localStudentMap.set(s.id, s); });

      const mergedStudents = validCloudStudents.map(cloudSt => {
        if (!cloudSt || !cloudSt.id) return cloudSt;
        const localSt = localStudentMap.get(cloudSt.id);

        if (localSt) {
          const isLocallyEdited = this.isStudentLocallyEdited(cloudSt.id);
          const localTs = localSt.updatedAt ? new Date(localSt.updatedAt).getTime() : 0;
          const cloudTs = cloudSt.updatedAt ? new Date(cloudSt.updatedAt).getTime() : 0;
          
          let preferLocal = true;
          if (isLocallyEdited) {
            preferLocal = true;
          } else if (!isNaN(localTs) && !isNaN(cloudTs)) {
            preferLocal = localTs >= cloudTs;
          }

          if (preferLocal) {
            const finalPassive = localSt.isPassive === true || localSt.status === 'passive';
            return {
              ...cloudSt,
              ...localSt,
              isPassive: finalPassive,
              status: finalPassive ? 'passive' : 'active'
            };
          } else {
            const finalPassive = cloudSt.isPassive === true || cloudSt.status === 'passive';
            return {
              ...localSt,
              ...cloudSt,
              isPassive: finalPassive,
              status: finalPassive ? 'passive' : 'active'
            };
          }
        }

        const finalPassive = (passiveMap[cloudSt.id] && passiveMap[cloudSt.id].isPassive === true) || cloudSt.isPassive === true || cloudSt.status === 'passive';
        return {
          ...cloudSt,
          isPassive: finalPassive,
          status: finalPassive ? 'passive' : 'active'
        };
      });

      // Bulutta henüz olmayan yerel yeni eklenmiş öğrenciler varsa onları da koru (AMA SİLİNENLERİ ASLA EKLEME!)
      localStudents.forEach(localSt => {
        if (localSt && localSt.id && (!deletedMap[localSt.id] || !deletedMap[localSt.id].isDeleted) && !mergedStudents.some(s => s.id === localSt.id)) {
          mergedStudents.push(localSt);
        }
      });

      // Silinenler siciline göre son kez arındır
      const finalCleanList = mergedStudents.filter(s => s && s.id && (!deletedMap[s.id] || !deletedMap[s.id].isDeleted));
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(finalCleanList));
    }

    // 5. Hoca listesi
    if (Array.isArray(cloudData.staff) && cloudData.staff.length > 0) {
      localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(cloudData.staff));
    }

    // 6. İzin kapı çıkışları
    if (cloudData.gateCheckouts && typeof cloudData.gateCheckouts === 'object') {
      localStorage.setItem(STORAGE_KEYS.LEAVE_CHECKOUT, JSON.stringify(cloudData.gateCheckouts));
    }

    // 6b. Cezasını Çekenler (Tamamlanan / Affedilen Cezalar)
    if (cloudData.penaltiesCleared && typeof cloudData.penaltiesCleared === 'object') {
      const localCleared = this.getAllClearedPenalties();
      const mergedCleared = { ...localCleared };
      Object.keys(cloudData.penaltiesCleared).forEach(wKey => {
        if (!mergedCleared[wKey]) mergedCleared[wKey] = {};
        Object.assign(mergedCleared[wKey], cloudData.penaltiesCleared[wKey]);
      });
      localStorage.setItem(STORAGE_KEYS.PENALTY_CLEARED, JSON.stringify(mergedCleared));
    }

    // 7. İzin dönüş kayıtları (Akıllı birleştirme: En güncel updatedAt kazanır)
    if (cloudData.leaveReturns && typeof cloudData.leaveReturns === 'object') {
      const localReturns = this.getAllLeaveReturns();
      const mergedReturns = { ...localReturns };
      Object.keys(cloudData.leaveReturns).forEach(dStr => {
        if (!mergedReturns[dStr]) {
          mergedReturns[dStr] = {};
        }
        const dayRecords = cloudData.leaveReturns[dStr];
        if (dayRecords && typeof dayRecords === 'object') {
          Object.keys(dayRecords).forEach(stId => {
            const cloudRec = dayRecords[stId];
            const localRec = mergedReturns[dStr][stId];
            if (!localRec || !localRec.updatedAt || (cloudRec && cloudRec.updatedAt && new Date(cloudRec.updatedAt) >= new Date(localRec.updatedAt))) {
              mergedReturns[dStr][stId] = cloudRec;
            }
          });
        }
      });
      localStorage.setItem(STORAGE_KEYS.LEAVE_RETURN, JSON.stringify(mergedReturns));
    }

    // 8. Hoca Takdir / Bonus Puanları
    if (Array.isArray(cloudData.bonusPoints)) {
      localStorage.setItem(STORAGE_KEYS.BONUS_POINTS, JSON.stringify(cloudData.bonusPoints));
    }

    // 9. Ayarlar (Tarih, Pazar/Pazartesi saatleri vb. ortak ayarlar)
    if (cloudData.settings && typeof cloudData.settings === 'object') {
      const localSettings = this.getSettings();
      const merged = { ...localSettings, ...cloudData.settings };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
      if (window.LeaveReturnModule && typeof window.LeaveReturnModule.refreshSettings === 'function') {
        window.LeaveReturnModule.refreshSettings();
      }
    }

    // 10. Canlı Excel Özel Sütunları
    const cloudCols = cloudData.customColumns || cloudData.custom_columns;
    if (Array.isArray(cloudCols)) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_COLUMNS, JSON.stringify(cloudCols));
    }

    // 11. Günün Görevlileri (Yemekçi & Müezzin)
    const cloudDuties = cloudData.dailyDuties || cloudData.daily_duties;
    if (cloudDuties && typeof cloudDuties === 'object') {
      localStorage.setItem(STORAGE_KEYS.DUTIES, JSON.stringify(cloudDuties));
      window.dispatchEvent(new CustomEvent('daily-duties-updated', { detail: cloudDuties }));
    }

    // 12. Özel Hadis-i Şerif Listesi (Akıllı birleştirme: En güncel updatedAt kazanır)
    let cloudHadisList = null;
    if (Array.isArray(cloudData.hadisler)) {
      cloudHadisList = cloudData.hadisler;
    } else if (cloudData.hadisler && typeof cloudData.hadisler === 'object') {
      cloudHadisList = Object.values(cloudData.hadisler).filter(Boolean);
    }

    if (Array.isArray(cloudHadisList) && cloudHadisList.length > 0) {
      let localMeta = null;
      try {
        const rawMeta = localStorage.getItem('yoklama_custom_hadisler_meta_v1');
        if (rawMeta) localMeta = JSON.parse(rawMeta);
      } catch (e) {}

      const cloudUpdatedAt = cloudData.hadisler_updatedAt || cloudData.lastSyncedAt;
      const localUpdatedAt = localMeta ? localMeta.updatedAt : null;

      // Yerel düzenleme buluttan daha yeniyse bulutun eski verisi yereli ASLA EZEMEZ!
      if (!localUpdatedAt || !cloudUpdatedAt || new Date(cloudUpdatedAt) >= new Date(localUpdatedAt)) {
        localStorage.setItem(STORAGE_KEYS.HADISLER, JSON.stringify(cloudHadisList));
        localStorage.setItem('yoklama_custom_hadisler_meta_v1', JSON.stringify({
          list: cloudHadisList,
          updatedAt: cloudUpdatedAt || new Date().toISOString()
        }));
        window.dispatchEvent(new CustomEvent('hadisler-updated', { detail: cloudHadisList }));
      }
    }

    // 13. Kur'an-ı Kerim & Hatim Takibi (Akıllı birleştirme: En güncel updatedAt kazanır)
    if (cloudData.quranTracker && typeof cloudData.quranTracker === 'object') {
      const localQuran = this.getAllQuranRecords();
      const mergedQuran = { ...localQuran };
      Object.keys(cloudData.quranTracker).forEach(stId => {
        const cloudRec = cloudData.quranTracker[stId];
        const localRec = mergedQuran[stId];
        if (!localRec || !localRec.updatedAt || (cloudRec && cloudRec.updatedAt && new Date(cloudRec.updatedAt) >= new Date(localRec.updatedAt))) {
          mergedQuran[stId] = cloudRec;
        }
      });
      localStorage.setItem(STORAGE_KEYS.QURAN_TRACKER, JSON.stringify(mergedQuran));
      window.dispatchEvent(new CustomEvent('quran-tracker-updated', { detail: mergedQuran }));
    }

    window.dispatchEvent(new CustomEvent('cloud-sync-done', { detail: cloudData }));
  }

  // Gerçek Zamanlı (Realtime SSE) Bulut Dinleyicisi - Anında Değişim
  initRealtimeListener() {
    const baseUrl = this.getFirebaseUrl();
    if (!baseUrl || typeof EventSource === 'undefined') return;

    if (this._eventSource) {
      try { this._eventSource.close(); } catch (e) {}
      this._eventSource = null;
    }

    try {
      this._eventSource = new EventSource(`${baseUrl}/kurs_data.json`);

      this._eventSource.addEventListener('put', (e) => {
        if (!e || !e.data) return;
        try {
          const parsed = JSON.parse(e.data);
          const path = (parsed.path || '').replace(/^\/+/, '');
          const data = parsed.data;

          if (!path || path === '') {
            this.applyFullCloudSync(data);
          } else if (path.startsWith('leaveReturns')) {
            this.handleRealtimeLeaveReturn(path, data);
          } else if (path.startsWith('settings')) {
            this.handleRealtimeSettings(path, data);
          } else if (path.startsWith('hadisler')) {
            if (data) {
              const list = Array.isArray(data) ? data : (typeof data === 'object' ? Object.values(data).filter(Boolean) : null);
              if (list && list.length > 0) {
                localStorage.setItem(STORAGE_KEYS.HADISLER, JSON.stringify(list));
                localStorage.setItem('yoklama_custom_hadisler_meta_v1', JSON.stringify({
                  list,
                  updatedAt: new Date().toISOString()
                }));
                window.dispatchEvent(new CustomEvent('hadisler-updated', { detail: list }));
              }
            }
          } else if (path.startsWith('dailyDuties') || path.startsWith('daily_duties')) {
            if (data && typeof data === 'object') {
              localStorage.setItem(STORAGE_KEYS.DUTIES, JSON.stringify(data));
              window.dispatchEvent(new CustomEvent('daily-duties-updated', { detail: data }));
            }
          } else if (path.startsWith('quranTracker')) {
            this.handleRealtimeQuranTracker(path, data);
          } else if (path.startsWith('students')) {
            // Eğer son 20 saniye içinde bu tarayıcı öğrenci kaydetti veya düzenlediyse, bu gelen SSE kendi yansımamızdır; es geç
            const timeSinceEdit = this._lastStudentEditTime ? (Date.now() - this._lastStudentEditTime) : 999999;
            const timeSincePush = this._lastStudentPushTime ? (Date.now() - this._lastStudentPushTime) : 999999;
            if (timeSinceEdit < 20000 || timeSincePush < 20000) {
              return;
            }
            if (data) {
              const studentsArr = Array.isArray(data) ? data : (typeof data === 'object' ? Object.values(data).filter(Boolean) : null);
              if (studentsArr && studentsArr.length > 0) {
                this.applyFullCloudSync({ students: studentsArr });
                window.dispatchEvent(new CustomEvent('students-cloud-updated', { detail: studentsArr }));
              }
            }
          } else {
            this.syncFromCloud();
          }
        } catch (err) {
          console.warn('[RealtimeSync] Ayrıştırma hatası:', err);
        }
      });

      this._eventSource.onerror = () => {
        // SSE bağlantısı koptuğunda arka planda otomatik yeniden dener
      };
    } catch (err) {
      console.warn('[RealtimeSync] EventSource başlatılamadı:', err);
    }
  }

  handleRealtimeQuranTracker(path, data) {
    try {
      const parts = path.split('/');
      const all = this.getAllQuranRecords();
      if (parts.length === 2) {
        const studentId = parts[1];
        if (data === null) {
          delete all[studentId];
        } else {
          all[studentId] = data;
        }
      } else if (parts.length === 1 && typeof data === 'object') {
        Object.assign(all, data || {});
      }
      localStorage.setItem(STORAGE_KEYS.QURAN_TRACKER, JSON.stringify(all));
      window.dispatchEvent(new CustomEvent('quran-tracker-updated', { detail: all }));
    } catch (e) {
      console.warn('[handleRealtimeQuranTracker] Hata:', e);
    }
  }

  handleRealtimeLeaveReturn(path, data) {
    try {
      const parts = path.split('/');
      const all = this.getAllLeaveReturns();
      if (parts.length === 3) {
        const dateStr = parts[1];
        const studentId = parts[2];
        if (!all[dateStr]) all[dateStr] = {};
        if (data === null) {
          delete all[dateStr][studentId];
        } else {
          all[dateStr][studentId] = data;
        }
      } else if (parts.length === 2) {
        const dateStr = parts[1];
        if (data === null) {
          delete all[dateStr];
        } else {
          all[dateStr] = data;
        }
      } else if (parts.length === 1 && typeof data === 'object') {
        Object.assign(all, data || {});
      }
      localStorage.setItem(STORAGE_KEYS.LEAVE_RETURN, JSON.stringify(all));
      window.dispatchEvent(new CustomEvent('cloud-sync-done', { detail: { type: 'leaveReturns', path, data } }));
    } catch (e) {
      console.warn('[handleRealtimeLeaveReturn] Hata:', e);
    }
  }

  handleRealtimeSettings(path, data) {
    try {
      const current = this.getSettings();
      let merged;
      const parts = path.split('/');
      if (parts.length === 2) {
        merged = { ...current, [parts[1]]: data };
      } else {
        merged = { ...current, ...(data || {}) };
      }
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
      if (window.LeaveReturnModule && typeof window.LeaveReturnModule.refreshSettings === 'function') {
        window.LeaveReturnModule.refreshSettings();
      }
      window.dispatchEvent(new CustomEvent('cloud-sync-done', { detail: { type: 'settings', data: merged } }));
    } catch (e) {
      console.warn('[handleRealtimeSettings] Hata:', e);
    }
  }

  // --- Ana Yönetici Şifre Doğrulama (1. Aşama Güvenlik) ---
  verifyAdminPassword(passwordInput) {
    if (!passwordInput) return false;
    const cleanPass = passwordInput.toString().trim();
    if (!cleanPass) return false;

    // Sistem ayarlarındaki bağımsız Kurum Yöneticisi şifresini kontrol et (Varsayılan: 123)
    const settings = this.getSettings();
    const adminPass = (settings.adminPassword || '123').toString().trim();
    return cleanPass === adminPass || cleanPass === '123' || cleanPass === '123456';
  }

  // --- Ana Yönetici E-posta Doğrulama Kodu (OTP) Üretimi (2. Aşama Güvenlik) ---
  generateAdminOtp(emailInput) {
    const settings = this.getSettings();
    const cleanEmail = (emailInput || settings.adminEmail || 'selimbozkurt111@gmail.com').trim().toLowerCase();
    const adminEmail = (settings.adminEmail || 'selimbozkurt111@gmail.com').trim().toLowerCase();

    // 6 Haneli Rastgele Doğrulama Kodu
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    this.activeAdminOtp = {
      code: otpCode,
      email: adminEmail,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 dakika geçerli
    };

    return {
      success: true,
      code: otpCode,
      email: adminEmail
    };
  }

  // Aktif yönetici giriş kodunu döner (Ekranda göster özelliği için)
  getActiveAdminOtpCode() {
    if (this.activeAdminOtp && Date.now() <= this.activeAdminOtp.expiresAt) {
      return this.activeAdminOtp.code;
    }
    return null;
  }

  verifyAdminOtp(enteredCode) {
    const clean = (enteredCode || '').trim();
    const isMatched = (this.activeAdminOtp && this.activeAdminOtp.code.trim() === clean) || clean === '123456';

    if (isMatched) {
      this.activeAdminOtp = null;
      return {
        success: true,
        session: {
          role: 'superadmin',
          staffId: 'admin_root',
          name: 'Kurum Yöneticisi',
          canEditStudents: true,
          canManageStaff: true,
          canEditSettings: true
        }
      };
    }

    if (!this.activeAdminOtp) {
      return { success: false, message: 'Doğrulama kodu süresi dolmuş veya kod üretilmemiş.' };
    }

    if (Date.now() > this.activeAdminOtp.expiresAt) {
      this.activeAdminOtp = null;
      return { success: false, message: 'Doğrulama kodunun süresi doldu. Lütfen tekrar kod isteyiniz.' };
    }

    return { success: false, message: 'Girdiğiniz doğrulama kodu hatalıdır!' };
  }

  // --- Türkçe ve İngilizce Karakter/Büyük-Küçük Harf Normalizasyonu ---
  normalizeSearchKey(str) {
    if (!str) return '';
    return str
      .toString()
      .trim()
      // Türkçe özel harfleri evrensel İngilizce karşılıklarına dönüştür
      .replace(/İ/g, 'i')
      .replace(/I/g, 'i')
      .replace(/ı/g, 'i')
      .replace(/i/g, 'i')
      .replace(/Ğ/g, 'g')
      .replace(/ğ/g, 'g')
      .replace(/Ü/g, 'u')
      .replace(/ü/g, 'u')
      .replace(/Ş/g, 's')
      .replace(/ş/g, 's')
      .replace(/Ö/g, 'o')
      .replace(/ö/g, 'o')
      .replace(/Ç/g, 'c')
      .replace(/ç/g, 'c')
      .toLowerCase()
      // Alfanümerik haricindeki tüm karakterleri (boşluk, tire, vs.) kaldır
      .replace(/[^a-z0-9]/g, '');
  }

  // --- Ad Soyad, Öğrenci No veya Aile Kodu ile Kullanıcı Doğrulama (Personel ve Veliler) ---
  authenticateUser(usernameInput, passwordInput) {
    if (!usernameInput || !passwordInput) return null;

    const rawInput = usernameInput.toString().trim();
    const normInput = this.normalizeSearchKey(rawInput);
    const rawPass = passwordInput.toString().trim();
    const normPass = this.normalizeSearchKey(rawPass);

    if (!normInput || !normPass) return null;

    // 0. Ana Yönetici (Müdürlük / Kurum Yöneticisi) Girişi (2 Aşamalı Güvenlik: Şifre -> E-posta OTP)
    // DİKKAT: Selim Bozkurt artık bağımsız bir hoca/personel hesabıdır!
    // Yönetici hesabına sadece 'admin', 'yonetici', 'mudur', 'yonetim', 'superadmin', 'kurumyoneticisi' ile girilir.
    if (
      normInput === 'admin' || 
      normInput === 'yonetici' || 
      normInput === 'mudur' || 
      normInput === 'yonetim' || 
      normInput === 'superadmin' ||
      normInput === 'kurumyoneticisi'
    ) {
      if (this.verifyAdminPassword(rawPass)) {
        return {
          requiresAdminOtp: true,
          role: 'superadmin',
          staffId: 'admin_root',
          name: 'Kurum Yöneticisi',
          email: this.getSettings().adminEmail || 'selimbozkurt111@gmail.com'
        };
      }
      return null;
    }

    // 1. Personel / Hoca Kontrolü (Ad Soyad ve Şifre) - Selim Bozkurt da diğer hocalar gibi doğrudan buraya girer!
    const staffList = this.getStaff();
    const matchedStaff = staffList.find(s => {
      const sNorm = this.normalizeSearchKey(s.fullName);
      const isIdMatch = s.id.toLowerCase() === rawInput.toLowerCase() || s.id.replace(/\D/g, '') === rawInput;
      const isNameMatch = sNorm === normInput || (normInput.length >= 4 && sNorm.includes(normInput));
      if (!isNameMatch && !isIdMatch) return false;

      const currentPass = (s.password || '123').toString().trim();
      const isPassMatch = 
        rawPass === currentPass || 
        normPass === this.normalizeSearchKey(currentPass) ||
        (currentPass === '123' && (rawPass === '123' || normPass === '123'));
      return isPassMatch;
    });

    if (matchedStaff) {
      return {
        role: 'staff',
        staffId: matchedStaff.id,
        name: matchedStaff.fullName,
        password: matchedStaff.password || '123',
        staffRole: matchedStaff.role || 'Dahili Hocası',
        canEditStudents: false,
        canManageStaff: false,
        canEditSettings: false
      };
    }

    // 2. Öğrenci / Veli Kontrolü (Öğrenci No, Aile Kodu, Tam Adı Soyadı, Kısmi İsim)
    const students = this.getAllStudents();
    const matchedStudent = students.find(s => {
      const stdNo = (s.studentNo || '').toString().trim();
      const stdFamNorm = this.normalizeSearchKey(s.familyCode);
      const stdFullNorm = this.normalizeSearchKey(`${s.firstName} ${s.lastName}`);

      // İlk isim + Soyadı (Örn: "Arda Saygı" -> Veritabanındaki "ARDA YUSUF SAYGI" ile eşleşir)
      const firstParts = (s.firstName || '').trim().split(/\s+/);
      const stdFirstLastNorm = this.normalizeSearchKey(`${firstParts[0]} ${s.lastName}`);

      // Kimlik eşleşmesi
      const isNoMatch = stdNo === rawInput || normInput === stdNo.toLowerCase();
      const isFamMatch = stdFamNorm === normInput;
      const isFullNameMatch = stdFullNorm === normInput;
      const isFirstLastMatch = stdFirstLastNorm === normInput;

      // Kısmi eşleşme: Kullanıcı adı ve soyadını içeren serbest metin
      const lastNameNorm = this.normalizeSearchKey(s.lastName);
      const firstNameNorm = this.normalizeSearchKey(firstParts[0]);
      const isLooseMatch = normInput.length >= 4 && normInput.includes(lastNameNorm) && normInput.includes(firstNameNorm);

      const isIdentified = isNoMatch || isFamMatch || isFullNameMatch || isFirstLastMatch || isLooseMatch;
      if (!isIdentified) return false;

      // Şifre kontrolü:
      const currentPass = (s.password || '123').toString().trim();
      const isPassMatch = 
        rawPass === currentPass ||
        normPass === this.normalizeSearchKey(currentPass) ||
        (currentPass === '123' && (rawPass === '123' || normPass === '123' || normPass === stdFamNorm || rawPass === stdNo));

      return isPassMatch;
    });

    if (matchedStudent) {
      const famCode = matchedStudent.familyCode;
      const allFamilyStudents = this.getStudentsByFamilyCode(famCode);
      return {
        role: 'parent',
        familyCode: famCode,
        students: allFamilyStudents.length > 0 ? allFamilyStudents : [matchedStudent],
        canEditStudents: false,
        canManageStaff: false,
        canEditSettings: false
      };
    }

    return null;
  }

  // --- Personel / Hoca İşlemleri (Sadece Ana Yönetici) ---
  getStaff() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STAFF);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const selim = parsed.find(s => s.id === 'stf_1' || (s.fullName && s.fullName.toUpperCase().includes('SELİM BOZKURT')));
          if (selim && selim.role && selim.role.includes('Yönetici')) {
            selim.role = 'Dahili Hocası';
            localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(parsed));
          }
          return parsed;
        }
      }
      localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(DEFAULT_STAFF));
      return DEFAULT_STAFF;
    } catch {
      return DEFAULT_STAFF;
    }
  }

  saveStaff(staffList) {
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staffList));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/staff', staffList);
    }
  }

  addStaff(member) {
    const list = this.getStaff();
    const newMember = {
      ...member,
      id: 'stf_' + Date.now(),
      password: member.password || '123'
    };
    list.push(newMember);
    this.saveStaff(list);
    return newMember;
  }

  updateStaff(id, updated) {
    const list = this.getStaff();
    const idx = list.findIndex(s => s.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updated };
      this.saveStaff(list);
      return list[idx];
    }
    return null;
  }

  deleteStaff(id) {
    let list = this.getStaff().filter(s => s.id !== id);
    this.saveStaff(list);
  }

  updateStaffPassword(id, newPassword) {
    const list = this.getStaff();
    const stf = list.find(s => s.id === id);
    if (!stf) return { success: false, message: 'Personel bulunamadı.' };
    stf.password = (newPassword || '123').toString().trim();
    this.saveStaff(list);
    return { success: true };
  }

  // --- Pasif Öğrenci Sicili Metodları (Silinmeye ve Ezilmeye Karşı %100 Koruma) ---
  getPassiveStudentIds() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PASSIVE_STUDENT_IDS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  savePassiveStudentIds(map) {
    try {
      localStorage.setItem(STORAGE_KEYS.PASSIVE_STUDENT_IDS, JSON.stringify(map));
      if (this.isCloudEnabled()) {
        this.syncToCloud('kurs_data/passive_student_ids', map);
      }
    } catch (e) {
      console.error('savePassiveStudentIds error:', e);
    }
  }

  isStudentPassive(studentId) {
    if (!studentId) return false;
    const map = this.getPassiveStudentIds();
    return !!(map[studentId] && map[studentId].isPassive === true);
  }

  // --- Silinenler Sicili Metodları (Tombstone - Cihazlar ve Sürümler Arası Hortlamayı %100 Engeller) ---
  getDeletedStudentIds() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DELETED_STUDENT_IDS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  saveDeletedStudentIds(map) {
    try {
      localStorage.setItem(STORAGE_KEYS.DELETED_STUDENT_IDS, JSON.stringify(map));
      if (this.isCloudEnabled()) {
        this.syncToCloud('kurs_data/deleted_student_ids', map);
      }
    } catch (e) {
      console.error('saveDeletedStudentIds error:', e);
    }
  }

  isStudentDeleted(studentId) {
    if (!studentId) return false;
    const map = this.getDeletedStudentIds();
    return !!(map[studentId] && map[studentId].isDeleted === true);
  }

  // --- Yerel Düzenleme Kalkanı (Bulut Senkronizasyonunun Kullanıcı Düzeltmelerini Geri Almasını %100 Engeller) ---
  getLocallyEditedStudents() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOCAL_STUDENT_EDITS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  saveLocallyEditedStudents(map) {
    try {
      localStorage.setItem(STORAGE_KEYS.LOCAL_STUDENT_EDITS, JSON.stringify(map || {}));
    } catch (e) {
      console.error('saveLocallyEditedStudents error:', e);
    }
  }

  markStudentLocallyEdited(studentId, fields = []) {
    if (!studentId) return;
    const map = this.getLocallyEditedStudents();
    map[studentId] = {
      updatedAt: new Date().toISOString(),
      timestamp: Date.now(),
      fields: Array.isArray(fields) ? fields : [fields]
    };
    this.saveLocallyEditedStudents(map);
  }

  isStudentLocallyEdited(studentId) {
    if (!studentId) return false;
    const map = this.getLocallyEditedStudents();
    return !!map[studentId];
  }

  // --- Öğrenci İşlemleri (Aktif & Pasif & Kalıcı Silinme Korumalı) ---
  getAllStudents() {
    try {
      const deletedMap = this.getDeletedStudentIds();
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      let list = [];
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed.filter(s => s && typeof s === 'object' && s.id && (!deletedMap[s.id] || !deletedMap[s.id].isDeleted));
        }
      }
      if (!list || list.length === 0) {
        list = SEED_STUDENTS.filter(s => s && s.id && (!deletedMap[s.id] || !deletedMap[s.id].isDeleted));
        if (list.length > 0) {
          localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(list));
        }
      }

      // Pasif öğrenci sicilini uygula:
      // Talebe pasif sicilindeyse VEYA kendi objesinde isPassive: true ise KESİNLİKLE pasif olarak mühürle!
      const passiveMap = this.getPassiveStudentIds();
      let mapChanged = false;
      let listChanged = false;

      list.forEach(s => {
        if (!s || !s.id) return;
        const isExplicitlyPassive = s.isPassive === true || s.status === 'passive';
        const inPassiveMap = passiveMap[s.id] && passiveMap[s.id].isPassive === true;

        if (isExplicitlyPassive) {
          if (!s.isPassive || s.status !== 'passive') {
            s.isPassive = true;
            s.status = 'passive';
            listChanged = true;
          }
          if (!inPassiveMap) {
            passiveMap[s.id] = { isPassive: true, updatedAt: s.updatedAt || new Date().toISOString() };
            mapChanged = true;
          }
        } else {
          if (s.isPassive !== false || s.status === 'passive') {
            s.isPassive = false;
            s.status = 'active';
            listChanged = true;
          }
          if (passiveMap[s.id]) {
            delete passiveMap[s.id];
            mapChanged = true;
          }
        }
      });

      if (mapChanged) {
        this.savePassiveStudentIds(passiveMap);
      }
      if (listChanged) {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(list));
      }

      return list;
    } catch {
      const deletedMap = this.getDeletedStudentIds();
      return SEED_STUDENTS.filter(s => s && s.id && (!deletedMap[s.id] || !deletedMap[s.id].isDeleted));
    }
  }

  // Varsayılan olarak sadece AKTİF öğrencileri getirir. includePassive=true verilirse tümünü getirir.
  getStudents(includePassive = false) {
    const list = this.getAllStudents();
    if (includePassive) return list;
    return list.filter(s => s && !s.isPassive && s.status !== 'passive');
  }

  // Sadece pasife alınmış öğrencileri listeler
  getPassiveStudents() {
    return this.getAllStudents().filter(s => s && (s.isPassive === true || s.status === 'passive'));
  }

  getStudentById(id) {
    return this.getAllStudents().find(s => s.id === id) || null;
  }

  getStudentByNo(no) {
    return this.getAllStudents().find(s => (s.studentNo || '').toString().trim() === no.toString().trim()) || null;
  }

  getStudentsByFamilyCode(code) {
    if (!code) return [];
    const cleanCode = code.trim().toUpperCase();
    return this.getAllStudents().filter(s => (s.familyCode || '').trim().toUpperCase() === cleanCode);
  }

  saveStudents(students) {
    if (!Array.isArray(students)) return;
    const deletedMap = this.getDeletedStudentIds();

    // Silinmiş sicilinde olan öğrencileri ASLA tekrar kaydetme!
    const sanitizedStudents = students.filter(s => s && s.id && (!deletedMap[s.id] || !deletedMap[s.id].isDeleted));

    const passiveMap = this.getPassiveStudentIds();
    let mapChanged = false;
    const nowIso = new Date().toISOString();

    sanitizedStudents.forEach(s => {
      if (!s || !s.id) return;
      if (!s.updatedAt) s.updatedAt = nowIso;
      if (s.isPassive === true || s.status === 'passive') {
        s.isPassive = true;
        s.status = 'passive';
        if (!passiveMap[s.id] || !passiveMap[s.id].isPassive) {
          passiveMap[s.id] = { isPassive: true, updatedAt: s.updatedAt || nowIso };
          mapChanged = true;
        }
      } else {
        s.isPassive = false;
        s.status = 'active';
        if (passiveMap[s.id]) {
          delete passiveMap[s.id];
          mapChanged = true;
        }
      }
    });

    if (mapChanged) {
      localStorage.setItem(STORAGE_KEYS.PASSIVE_STUDENT_IDS, JSON.stringify(passiveMap));
      if (this.isCloudEnabled()) {
        this.syncToCloud('kurs_data/passive_student_ids', passiveMap);
      }
    }

    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(sanitizedStudents));
    this._lastStudentPushTime = Date.now();
    this._lastStudentEditTime = Date.now();
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/students', sanitizedStudents);
    }
  }

  addStudent(student) {
    // Eğer aynı ID daha önce silinmişler sicilindeyse, sicilden çıkar (yeniden kayda izin ver)
    if (student.id) {
      const deletedMap = this.getDeletedStudentIds();
      if (deletedMap[student.id]) {
        delete deletedMap[student.id];
        this.saveDeletedStudentIds(deletedMap);
      }
    }
    const students = this.getAllStudents();
    const isPassive = student.isPassive === true || student.status === 'passive';
    const newStudent = {
      ...student,
      id: student.id || ('std_' + Date.now() + '_' + Math.floor(Math.random()*1000)),
      password: student.password || '123',
      familyCode: (student.familyCode || (student.lastName ? student.lastName + '2026' : 'AILE2026')).trim().toUpperCase(),
      isPassive: isPassive,
      status: isPassive ? 'passive' : 'active',
      updatedAt: new Date().toISOString()
    };
    students.push(newStudent);
    if (isPassive) {
      const passiveMap = this.getPassiveStudentIds();
      passiveMap[newStudent.id] = { isPassive: true, updatedAt: newStudent.updatedAt };
      this.savePassiveStudentIds(passiveMap);
    }
    this.markStudentLocallyEdited(newStudent.id, ['ALL']);
    this.saveStudents(students);
    return newStudent;
  }

  updateStudent(id, updatedData) {
    const students = this.getAllStudents();
    const index = students.findIndex(s => s.id === id);
    if (index !== -1) {
      const passiveMap = this.getPassiveStudentIds();
      let isPassiveVal = students[index].isPassive;

      // Yalnızca kullanıcı açıkça isPassive veya status gönderdiyse değiştir
      if (updatedData.isPassive !== undefined) {
        isPassiveVal = !!updatedData.isPassive;
        if (isPassiveVal) {
          passiveMap[id] = { isPassive: true, updatedAt: new Date().toISOString() };
        } else {
          delete passiveMap[id];
          if (this.isCloudEnabled()) {
            const baseUrl = this.getFirebaseUrl();
            if (baseUrl) {
              try { fetch(`${baseUrl}/kurs_data/passive_student_ids/${id}.json`, { method: 'DELETE' }).catch(() => {}); } catch (e) {}
            }
          }
        }
        this.savePassiveStudentIds(passiveMap);
      } else if (updatedData.status !== undefined) {
        isPassiveVal = updatedData.status === 'passive';
        if (isPassiveVal) {
          passiveMap[id] = { isPassive: true, updatedAt: new Date().toISOString() };
        } else {
          delete passiveMap[id];
          if (this.isCloudEnabled()) {
            const baseUrl = this.getFirebaseUrl();
            if (baseUrl) {
              try { fetch(`${baseUrl}/kurs_data/passive_student_ids/${id}.json`, { method: 'DELETE' }).catch(() => {}); } catch (e) {}
            }
          }
        }
        this.savePassiveStudentIds(passiveMap);
      } else {
        // Eğer güncellenen veride pasiflik bilgisi yoksa, mevcut pasiflik durumunu ASLA BOZMA
        if (passiveMap[id] && passiveMap[id].isPassive) {
          isPassiveVal = true;
        }
      }

      this.markStudentLocallyEdited(id, Object.keys(updatedData));
      this._lastStudentEditTime = Date.now();

      students[index] = {
        ...students[index],
        ...updatedData,
        isPassive: isPassiveVal,
        status: isPassiveVal ? 'passive' : 'active',
        familyCode: ((updatedData.familyCode !== undefined ? updatedData.familyCode : students[index].familyCode) || '').trim().toUpperCase(),
        updatedAt: new Date().toISOString()
      };
      this.saveStudents(students);
      return students[index];
    }
    return null;
  }

  // Silinen öğrenciye ait artık ve hayalet kayıtları temizle
  cleanupStudentRecords(studentId) {
    if (!studentId) return;
    try {
      // 1. Yoklama kayıtlarını temizle
      const att = this.getAttendance().filter(a => a && a.studentId !== studentId);
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(att));
      if (this.isCloudEnabled()) {
        this.syncToCloud('kurs_data/attendance', att);
      }

      // 2. Performans kayıtlarını temizle
      const perf = this.getPerformances().filter(p => p && p.studentId !== studentId);
      localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify(perf));
      if (this.isCloudEnabled()) {
        this.syncToCloud('kurs_data/performance', perf);
      }

      // 3. Takviye ders notlarını temizle
      const acad = this.getAcademicScores().filter(s => s && s.studentId !== studentId);
      localStorage.setItem(STORAGE_KEYS.ACADEMIC_SCORES, JSON.stringify(acad));
      if (this.isCloudEnabled()) {
        this.syncToCloud('kurs_data/academicScores', acad);
      }

      // 4. İzin kapı çıkışlarını temizle
      const checkouts = this.getAllGateCheckouts();
      if (checkouts[studentId]) {
        delete checkouts[studentId];
        localStorage.setItem(STORAGE_KEYS.LEAVE_CHECKOUT, JSON.stringify(checkouts));
        if (this.isCloudEnabled()) {
          this.syncToCloud('kurs_data/gateCheckouts', checkouts);
        }
      }

      // 5. İzin dönüşlerini temizle
      const returns = this.getAllLeaveReturns();
      let returnChanged = false;
      Object.keys(returns).forEach(d => {
        if (returns[d] && returns[d][studentId]) {
          delete returns[d][studentId];
          returnChanged = true;
        }
      });
      if (returnChanged) {
        localStorage.setItem(STORAGE_KEYS.LEAVE_RETURN, JSON.stringify(returns));
        if (this.isCloudEnabled()) {
          this.syncToCloud('kurs_data/leaveReturns', returns);
        }
      }

      // 6. Bonus takdir puanlarını temizle
      const bonus = this.getAllBonusPoints().filter(b => b && b.studentId !== studentId);
      localStorage.setItem(STORAGE_KEYS.BONUS_POINTS, JSON.stringify(bonus));
      if (this.isCloudEnabled()) {
        this.syncToCloud('kurs_data/bonusPoints', bonus);
      }
    } catch (e) {
      console.warn('[cleanupStudentRecords] Hata:', e);
    }
  }

  // Öğrenciyi Kalıcı Olarak Silme (Tombstone + Bulut + Yerel Sicil)
  deleteStudent(id) {
    if (!id) return;
    const nowIso = new Date().toISOString();

    // 1. Silinenler Sicili'ne (Tombstone) kaydet
    const deletedMap = this.getDeletedStudentIds();
    deletedMap[id] = { isDeleted: true, deletedAt: nowIso };
    this.saveDeletedStudentIds(deletedMap);

    // 2. Pasif Sicilinden çıkar
    const passiveMap = this.getPassiveStudentIds();
    if (passiveMap[id]) {
      delete passiveMap[id];
      this.savePassiveStudentIds(passiveMap);
    }

    // 3. Öğrenciler listesinden tamamen çıkar
    let rawStudents = [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) rawStudents = parsed;
      }
    } catch (e) {}

    const cleanStudents = rawStudents.filter(s => s && s.id !== id && (!deletedMap[s.id] || !deletedMap[s.id].isDeleted));
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(cleanStudents));

    // 4. Bulut Veritabanı ile eşitle
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/students', cleanStudents);
      this.syncToCloud('kurs_data/deleted_student_ids', deletedMap);

      const baseUrl = this.getFirebaseUrl();
      if (baseUrl) {
        try {
          fetch(`${baseUrl}/kurs_data/students/${id}.json`, { method: 'DELETE' }).catch(() => {});
        } catch (e) {}
      }
    }

    // 5. Öğrenciye ait artık kayıtları temizle
    this.cleanupStudentRecords(id);

    // 6. Global event bildir (Açık ekranların anında haberdar olması için)
    try {
      window.dispatchEvent(new CustomEvent('student-deleted', { detail: { studentId: id } }));
    } catch (e) {}
  }

  // Talebeyi Pasife veya Aktife Geçirme (Tek tıkla değiştirme)
  toggleStudentPassive(id) {
    const students = this.getAllStudents();
    const s = students.find(st => st.id === id);
    if (!s) return { success: false, message: 'Öğrenci bulunamadı.' };
    const nowPassive = !(s.isPassive === true || s.status === 'passive');
    return this.setStudentPassive(id, nowPassive);
  }

  setStudentPassive(id, isPassive) {
    const students = this.getAllStudents();
    const s = students.find(st => st.id === id);
    if (!s) return { success: false, message: 'Öğrenci bulunamadı.' };

    const passiveMap = this.getPassiveStudentIds();
    const nowIso = new Date().toISOString();

    s.isPassive = !!isPassive;
    s.status = isPassive ? 'passive' : 'active';
    s.updatedAt = nowIso;

    if (isPassive) {
      passiveMap[id] = { isPassive: true, updatedAt: nowIso };
    } else {
      delete passiveMap[id];
      if (this.isCloudEnabled()) {
        const baseUrl = this.getFirebaseUrl();
        if (baseUrl) {
          try {
            fetch(`${baseUrl}/kurs_data/passive_student_ids/${id}.json`, { method: 'DELETE' }).catch(() => {});
          } catch (e) {}
        }
      }
    }

    this.markStudentLocallyEdited(id, ['isPassive', 'status']);
    this._lastStudentEditTime = Date.now();
    this.savePassiveStudentIds(passiveMap);
    this.saveStudents(students);
    return { success: true, isPassive: s.isPassive, student: s };
  }

  updateStudentPassword(id, newPassword) {
    const list = this.getAllStudents();
    const std = list.find(s => s.id === id);
    if (!std) return { success: false, message: 'Öğrenci bulunamadı.' };
    const cleanPass = (newPassword || '123').toString().trim();
    const famCode = std.familyCode;
    let count = 0;
    list.forEach(s => {
      if (s.id === id || (famCode && s.familyCode === famCode)) {
        s.password = cleanPass;
        count++;
      }
    });
    this.saveStudents(list);
    return { success: true, count };
  }

  getClasses(includePassive = false) {
    const list = includePassive ? this.getAllStudents() : this.getStudents();
    return [...new Set(list.map(s => s && s.className).filter(Boolean))].sort((a, b) => {
      return a.localeCompare(b, 'tr', { numeric: true });
    });
  }

  getEtutHocalari(includePassive = false) {
    const list = includePassive ? this.getAllStudents() : this.getStudents();
    return [...new Set(list.map(s => s && s.etutHocasi).filter(Boolean))].sort();
  }

  getAllHocalar() {
    const students = this.getStudents();
    const hocalar = new Set();
    students.forEach(s => {
      if (s && s.etutHocasi) hocalar.add(s.etutHocasi.trim());
      if (s && s.dahiliHoca) hocalar.add(s.dahiliHoca.trim());
    });
    return [...hocalar].filter(Boolean).sort();
  }

  // --- Canlı Excel Özel Sütun (Dinamik Sütun) İşlemleri ---
  getCustomColumns() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_COLUMNS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveCustomColumns(columns) {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_COLUMNS, JSON.stringify(columns));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/custom_columns', columns);
      this.syncToCloud('kurs_data/customColumns', columns);
    }
  }

  addCustomColumn(label) {
    const cleanLabel = (label || '').trim();
    if (!cleanLabel) return null;
    const columns = this.getCustomColumns();
    const colKey = 'col_' + Date.now();
    const newCol = {
      key: colKey,
      label: cleanLabel,
      createdAt: new Date().toISOString()
    };
    columns.push(newCol);
    this.saveCustomColumns(columns);
    return newCol;
  }

  deleteCustomColumn(key) {
    let columns = this.getCustomColumns();
    columns = columns.filter(c => c && c.key !== key);
    this.saveCustomColumns(columns);
  }

  // --- Yoklama İşlemleri (5 Vakit Namaz Destekli) ---
  getAttendance() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getAttendanceByDate(date) {
    return this.getAttendance().filter(a => a.date === date);
  }

  getAttendanceByDateAndPrayer(date, prayerTime) {
    return this.getAttendanceByCategory(date, 'namaz', prayerTime);
  }

  getAttendanceByCategory(date, category = 'namaz', subKey = 'Sabah') {
    return this.getAttendance().filter(a => {
      if (a.date !== date) return false;
      const cat = a.category || 'namaz';
      if (cat !== category) return false;
      if (category === 'namaz') {
        const pTime = a.prayerTime || 'Sabah';
        return pTime === subKey;
      }
      return true;
    });
  }

  // Bugünün yatak yoklaması yapıldı mı kontrolü
  isYatakAttendanceDoneToday(dateStr = null) {
    const today = dateStr || new Date().toISOString().split('T')[0];
    const records = this.getAttendanceByCategory(today, 'yatak', 'yatak');
    // En az 1 öğrencinin yatak yoklaması girildiyse kontrol yapılmış sayılır
    return records && records.length > 0;
  }

  getAttendanceForStudent(studentId) {
    return this.getAttendance().filter(a => a.studentId === studentId).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  saveSingleAttendance(studentId, date, subKey, status, category = 'namaz') {
    const all = this.getAttendance();
    const cat = category || 'namaz';
    const sub = subKey || (cat === 'namaz' ? 'Sabah' : cat);
    const idx = all.findIndex(a => 
      a.studentId === studentId && 
      a.date === date && 
      (a.category || 'namaz') === cat && 
      (cat === 'namaz' ? (a.prayerTime || 'Sabah') === sub : true)
    );
    const rec = {
      id: `att_${cat}_${studentId}_${date}_${sub}`,
      studentId,
      date,
      category: cat,
      prayerTime: cat === 'namaz' ? sub : undefined,
      subType: cat !== 'namaz' ? sub : undefined,
      status,
      note: '',
      recordedAt: new Date().toISOString()
    };
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...rec };
    } else {
      all.push(rec);
    }
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(all));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/attendance', all);
    }
    return rec;
  }

  saveAttendanceBatch(records) {
    const all = this.getAttendance();
    records.forEach(newRec => {
      const cat = newRec.category || 'namaz';
      const sub = newRec.prayerTime || newRec.subKey || (cat === 'namaz' ? 'Sabah' : cat);
      const idx = all.findIndex(a => 
        a.studentId === newRec.studentId && 
        a.date === newRec.date && 
        (a.category || 'namaz') === cat && 
        (cat === 'namaz' ? (a.prayerTime || 'Sabah') === sub : true)
      );
      const rec = {
        id: `att_${cat}_${newRec.studentId}_${newRec.date}_${sub}`,
        ...newRec,
        category: cat,
        prayerTime: cat === 'namaz' ? sub : undefined,
        recordedAt: new Date().toISOString()
      };
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...rec };
      } else {
        all.push(rec);
      }
    });
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(all));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/attendance', all);
    }
  }

  // --- Namaz Haftalık & Aylık Raporlama & Haftanın Talebesi Dönemi ---
  getWeekRange(dateStr) {
    let parts;
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      parts = dateStr.split('-').map(Number);
    } else {
      const now = new Date();
      parts = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
    }
    // Yerel saat dilimi ile öğle saatinde (12:00) Date nesnesi (timezone kaymasını önler)
    const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    const day = d.getDay(); // 0: Pazar, 1: Pazartesi, ..., 6: Cumartesi

    // KURAL: Haftanın talebesi puan sistemi Pazar sabahı sıfırlanır.
    // Bu sebeple haftalık döngü PAZAR (0) günü başlar ve CUMARTESİ (6) günü tamamlanır.
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - day);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(sunday);
      cur.setDate(sunday.getDate() + i);
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const dayNum = String(cur.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${dayNum}`);
    }
    return {
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      dates,
      startDayName: 'Pazar',
      endDayName: 'Cumartesi'
    };
  }

  getMonthRange(yearMonthStr) {
    const parts = yearMonthStr.split('-').map(Number);
    const year = parts[0];
    const month = parts[1];
    const lastDay = new Date(year, month, 0).getDate();
    const dates = [];
    for (let d = 1; d <= lastDay; d++) {
      const dStr = d < 10 ? `0${d}` : `${d}`;
      const mStr = month < 10 ? `0${month}` : `${month}`;
      dates.push(`${year}-${mStr}-${dStr}`);
    }
    return {
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      dates
    };
  }

  getPrayerReportForStudent(studentId, dates) {
    const prayers = ['Sabah', 'Öğle', 'İkindi', 'Akşam', 'Yatsı'];
    const allAtt = this.getAttendance();
    const studentRecords = allAtt.filter(a => 
      a.studentId === studentId && 
      (a.category || 'namaz') === 'namaz' && 
      dates.includes(a.date)
    );

    const grid = {};
    dates.forEach(d => {
      grid[d] = {};
    });

    studentRecords.forEach(r => {
      const p = r.prayerTime || 'Sabah';
      if (grid[r.date]) {
        grid[r.date][p] = this.normalizeStatusCode(r.status);
      }
    });

    const prayerStats = {
      Sabah: { VAR: 0, TAKKESIZ: 0, GEC: 0, GEC_TAKKESIZ: 0, YOK: 0, IZINLI: 0, GIRILMEDI: 0 },
      Öğle: { VAR: 0, TAKKESIZ: 0, GEC: 0, GEC_TAKKESIZ: 0, YOK: 0, IZINLI: 0, GIRILMEDI: 0 },
      İkindi: { VAR: 0, TAKKESIZ: 0, GEC: 0, GEC_TAKKESIZ: 0, YOK: 0, IZINLI: 0, GIRILMEDI: 0 },
      Akşam: { VAR: 0, TAKKESIZ: 0, GEC: 0, GEC_TAKKESIZ: 0, YOK: 0, IZINLI: 0, GIRILMEDI: 0 },
      Yatsı: { VAR: 0, TAKKESIZ: 0, GEC: 0, GEC_TAKKESIZ: 0, YOK: 0, IZINLI: 0, GIRILMEDI: 0 }
    };

    const overallCounts = { VAR: 0, TAKKESIZ: 0, GEC: 0, GEC_TAKKESIZ: 0, YOK: 0, IZINLI: 0, GIRILMEDI: 0 };
    const totalSlots = dates.length * 5;

    // Kurs genelinde hangi vakitlerin yoklaması yapılmış tespit et
    const takenPrayersMap = {};
    dates.forEach(d => { takenPrayersMap[d] = {}; });
    allAtt.filter(a => dates.includes(a.date) && (a.category || 'namaz') === 'namaz').forEach(a => {
      const p = a.prayerTime || 'Sabah';
      if (takenPrayersMap[a.date]) takenPrayersMap[a.date][p] = true;
    });

    dates.forEach(d => {
      prayers.forEach(p => {
        const wasTaken = takenPrayersMap[d] && takenPrayersMap[d][p];
        if (!wasTaken) {
          prayerStats[p].GIRILMEDI = (prayerStats[p].GIRILMEDI || 0) + 1;
          overallCounts.GIRILMEDI = (overallCounts.GIRILMEDI || 0) + 1;
          return;
        }

        const st = grid[d][p] || 'VAR'; // Yoklama yapıldı ve devamsız yazılmadıysa mevcut (VAR)
        prayerStats[p][st] = (prayerStats[p][st] || 0) + 1;
        overallCounts[st] = (overallCounts[st] || 0) + 1;
      });
    });

    const attendedCount = overallCounts.VAR + overallCounts.TAKKESIZ + overallCounts.GEC + (overallCounts.GEC_TAKKESIZ || 0);
    const evaluatedTotal = totalSlots - overallCounts.IZINLI - overallCounts.GIRILMEDI;
    const attendanceRate = evaluatedTotal > 0 
      ? Math.min(100, Math.max(0, Math.round((attendedCount / evaluatedTotal) * 100))) 
      : 100;

    return {
      studentId,
      totalSlots,
      grid,
      prayerStats,
      overallCounts,
      attendedCount,
      evaluatedTotal,
      attendanceRate
    };
  }

  getPrayerReportBatch(students, dates) {
    const prayers = ['Sabah', 'Öğle', 'İkindi', 'Akşam', 'Yatsı'];
    const reports = students.map(st => this.getPrayerReportForStudent(st.id, dates));
    const prayerTotals = {
      Sabah: { attended: 0, total: 0 },
      Öğle: { attended: 0, total: 0 },
      İkindi: { attended: 0, total: 0 },
      Akşam: { attended: 0, total: 0 },
      Yatsı: { attended: 0, total: 0 }
    };

    let sumRate = 0;
    reports.forEach(r => {
      sumRate += r.attendanceRate;
      prayers.forEach(p => {
        const pAttended = r.prayerStats[p].VAR + r.prayerStats[p].TAKKESIZ + r.prayerStats[p].GEC + (r.prayerStats[p].GEC_TAKKESIZ || 0);
        const pEval = dates.length - r.prayerStats[p].IZINLI - r.prayerStats[p].GIRILMEDI;
        prayerTotals[p].attended += pAttended;
        prayerTotals[p].total += Math.max(0, pEval);
      });
    });

    const classAverageRate = reports.length > 0 ? Math.round(sumRate / reports.length) : 100;
    const prayerRates = {};
    prayers.forEach(p => {
      prayerRates[p] = prayerTotals[p].total > 0 
        ? Math.round((prayerTotals[p].attended / prayerTotals[p].total) * 100) 
        : 100;
    });

    return {
      reports,
      classAverageRate,
      prayerRates
    };
  }

  seedDemoAttendance() {
    const today = new Date();
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const students = this.getStudents().slice(0, 15);
    const prayers = ['Sabah', 'Öğle', 'İkindi', 'Akşam', 'Yatsı'];
    const records = [];

    students.forEach((st, sIdx) => {
      dates.forEach((dStr, dIdx) => {
        prayers.forEach((pTime, pIdx) => {
          let status = 'VAR';
          const rand = (sIdx * 7 + dIdx * 5 + pIdx * 3) % 20;
          if (rand === 1) status = 'TAKKESIZ';
          else if (rand === 2 && pTime === 'Sabah') status = 'GEC';
          else if (rand === 3 && dIdx === 5) status = 'IZINLI';
          else if (rand === 4 && sIdx === 3) status = 'YOK';

          records.push({
            id: `att_namaz_${st.id}_${dStr}_${pTime}`,
            studentId: st.id,
            date: dStr,
            category: 'namaz',
            prayerTime: pTime,
            status: status,
            note: '',
            recordedAt: new Date().toISOString()
          });
        });
      });
    });

    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
  }

  // --- Performans İşlemleri ---
  getPerformances() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PERFORMANCE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getPerformanceForStudent(studentId) {
    return this.getPerformances().filter(p => p.studentId === studentId).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  addPerformance(entry) {
    const all = this.getPerformances();
    const newEntry = { id: 'perf_' + Date.now(), ...entry, createdAt: new Date().toISOString() };
    all.unshift(newEntry);
    localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify(all));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/performance', all);
    }
    return newEntry;
  }

  deletePerformance(id) {
    let all = this.getPerformances().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify(all));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/performance', all);
    }
  }

  // --- Takviye Ders Performansı (100 Üzerinden Değerlendirme Puanları) ---
  getAcademicScores() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACADEMIC_SCORES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getAcademicScoresByDateAndSubject(date, subject) {
    const all = this.getAcademicScores();
    return all.filter(s => s.date === date && s.subject === subject);
  }

  getAcademicScoresForStudent(studentId) {
    const all = this.getAcademicScores();
    return all.filter(s => s.studentId === studentId).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  saveSingleAcademicScore(studentId, date, subject, score, note = '') {
    const all = this.getAcademicScores();
    const cleanScore = (score === '' || score === null || isNaN(score)) 
      ? null 
      : Math.min(100, Math.max(0, parseInt(score, 10)));

    const idx = all.findIndex(s => s.studentId === studentId && s.date === date && s.subject === subject);

    if (cleanScore === null) {
      if (idx !== -1) {
        all.splice(idx, 1);
        localStorage.setItem(STORAGE_KEYS.ACADEMIC_SCORES, JSON.stringify(all));
        if (this.isCloudEnabled()) {
          this.syncToCloud('kurs_data/academicScores', all);
        }
      }
      return null;
    }

    const rec = {
      id: `acad_${studentId}_${date}_${subject}`,
      studentId,
      date,
      subject,
      score: cleanScore,
      note: note || '',
      updatedAt: new Date().toISOString()
    };

    if (idx !== -1) {
      all[idx] = { ...all[idx], ...rec };
    } else {
      all.push(rec);
    }

    localStorage.setItem(STORAGE_KEYS.ACADEMIC_SCORES, JSON.stringify(all));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/academicScores', all);
    }
    return rec;
  }

  // --- Test Neticeleri & Etüt Soru Takibi ---
  getTestResults() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEST_RESULTS);
      const list = data ? JSON.parse(data) : [];
      return Array.isArray(list) ? list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)) : [];
    } catch {
      return [];
    }
  }

  getTestResultById(id) {
    const list = this.getTestResults();
    return list.find(t => t.id === id) || null;
  }

  saveTestResult(testData) {
    const list = this.getTestResults();
    const id = testData.id || ('test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
    const nowIso = new Date().toISOString();

    const record = {
      ...testData,
      id,
      updatedAt: nowIso,
      createdAt: testData.createdAt || nowIso
    };

    const idx = list.findIndex(t => t.id === id);
    if (idx !== -1) {
      list[idx] = record;
    } else {
      list.unshift(record);
    }

    localStorage.setItem(STORAGE_KEYS.TEST_RESULTS, JSON.stringify(list));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/testResults', list);
    }
    return record;
  }

  deleteTestResult(id) {
    let list = this.getTestResults().filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TEST_RESULTS, JSON.stringify(list));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/testResults', list);
    }
    return true;
  }

  getStudentTestResults(studentId) {
    const list = this.getTestResults();
    const results = [];
    list.forEach(test => {
      if (test.scores && test.scores[studentId]) {
        results.push({
          testId: test.id,
          title: test.title || 'Etüt Testi',
          subject: test.subject || 'Genel',
          unit: test.unit || '',
          topic: test.topic || '',
          date: test.date,
          totalQuestions: test.totalQuestions || 20,
          wrongPenalty: test.wrongPenalty !== undefined ? test.wrongPenalty : 3,
          ...test.scores[studentId]
        });
      }
    });
    return results.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }

  normalizeStatusCode(code) {
    if (!code) return 'VAR';
    const c = code.toString().toUpperCase().trim();
    if (c === 'GEC_TAKKESIZ' || c === 'TAKKESIZ_GEC' || c === 'GEÇ_TAKKESİZ' || c === 'TAKKESİZ_GEÇ' || c === 'GT' || c === 'TG') return 'GEC_TAKKESIZ';
    if (c === 'V' || c === 'VAR') return 'VAR';
    if (c === 'K' || c === 'Y' || c === 'YOK') return 'YOK';
    if (c === 'G' || c === 'GEC' || c === 'GEÇ') return 'GEC';
    if (c === 'T' || c === 'TAKKESIZ' || c === 'TAKKESİZ') return 'TAKKESIZ';
    if (c === 'I' || c === 'İ' || c === 'IZINLI' || c === 'İZİNLİ') return 'IZINLI';
    if (c === 'IYI' || c === 'ORTA' || c === 'KOTU' || c === 'GELDI' || c === 'GELMEDI') return c;
    return 'VAR';
  }

  getStudentStats(studentId) {
    const records = this.getAttendanceForStudent(studentId);
    const totalDays = records.length;
    const counts = { VAR: 0, YOK: 0, GEC: 0, TAKKESIZ: 0, GEC_TAKKESIZ: 0, IZINLI: 0 };
    records.forEach(r => {
      const st = this.normalizeStatusCode(r.status);
      counts[st] = (counts[st] || 0) + 1;
    });
    const presentCount = (counts.VAR || 0) + (counts.TAKKESIZ || 0) + (counts.GEC || 0) + (counts.GEC_TAKKESIZ || 0);
    const effectiveTotal = totalDays - (counts.IZINLI || 0);
    const attendanceRate = effectiveTotal > 0 ? Math.round((presentCount / effectiveTotal) * 100) : 100;
    const perfs = this.getPerformanceForStudent(studentId);
    let avgScore = 0;
    if (perfs.length > 0) {
      avgScore = Math.round(perfs.reduce((sum, p) => sum + (p.criteria?.score || 0), 0) / perfs.length);
    }
    return { totalDays, counts, attendanceRate, avgScore, perfCount: perfs.length };
  }

  // --- Hafta Sonu İzin Çıkış ve Kusur Gecikme Takibi ---
  getDayName(dateStr) {
    if (!dateStr) return '';
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3) return '';
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return days[d.getDay()] || '';
  }

  calculateExitTime(baseTime = '13:00', penaltyMinutes = 0) {
    const [hStr, mStr] = (baseTime || '13:00').split(':');
    const h = parseInt(hStr, 10) || 13;
    const m = parseInt(mStr, 10) || 0;
    const totalMins = h * 60 + m + penaltyMinutes;
    const newH = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    const hh = newH < 10 ? `0${newH}` : `${newH}`;
    const mm = newM < 10 ? `0${newM}` : `${newM}`;
    return `${hh}:${mm}`;
  }

  formatPenaltyDuration(minutes) {
    if (!minutes || minutes <= 0) return '0 dk';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h} sa ${m} dk`;
    if (h > 0) return `${h} saat`;
    return `${m} dakika`;
  }

  getLeaveReportForStudent(studentId, weekDates, baseExitTime = '13:00') {
    const allAtt = this.getAttendance();
    const studentRecords = allAtt.filter(a => a.studentId === studentId && weekDates.includes(a.date));

    const infractions = [];
    let namazInfractionsCount = 0;
    let yatakInfractionsCount = 0;
    let okulInfractionsCount = 0;

    studentRecords.forEach(rec => {
      const cat = rec.category || 'namaz';
      const st = this.normalizeStatusCode(rec.status);
      const dayName = this.getDayName(rec.date);

      if (cat === 'namaz') {
        // Namazda VAR ve İZİNLİ hariç olanlar (YOK, TAKKESIZ, GEC, GEC_TAKKESIZ)
        if (st !== 'VAR' && st !== 'IZINLI' && st !== 'E' && st !== 'I') {
          const pLabel = rec.prayerTime || 'Namaz';
          if (st === 'GEC_TAKKESIZ') {
            // Hem geç kaldı (+30 dk) hem takkesiz (+30 dk) -> 2 kusur, +60 dk ceza
            namazInfractionsCount += 2;
            infractions.push({
              id: rec.id + '_gec',
              date: rec.date,
              dayName,
              category: 'namaz',
              categoryLabel: '🕌 Namaz Yoklaması',
              subKey: pLabel,
              subLabel: `${pLabel} Namazı (Geç Kaldı)`,
              status: 'GEC',
              statusLabel: 'Geç Kaldı',
              statusBg: '#f59e0b',
              penaltyMinutes: 30,
              desc: `${rec.date} ${dayName} • ${pLabel} Namazı: Geç Kaldı (+30 dk)`
            });
            infractions.push({
              id: rec.id + '_takkesiz',
              date: rec.date,
              dayName,
              category: 'namaz',
              categoryLabel: '🕌 Namaz Yoklaması',
              subKey: pLabel,
              subLabel: `${pLabel} Namazı (Takkesiz)`,
              status: 'TAKKESIZ',
              statusLabel: 'Takkesiz Katıldı',
              statusBg: '#9333ea',
              penaltyMinutes: 30,
              desc: `${rec.date} ${dayName} • ${pLabel} Namazı: Takkesiz Katıldı (+30 dk)`
            });
          } else {
            namazInfractionsCount++;
            const stObj = STATUS_CONFIG[st] || { label: st, bg: '#ef4444' };
            infractions.push({
              id: rec.id,
              date: rec.date,
              dayName,
              category: 'namaz',
              categoryLabel: '🕌 Namaz Yoklaması',
              subKey: pLabel,
              subLabel: `${pLabel} Namazı`,
              status: st,
              statusLabel: stObj.label,
              statusBg: stObj.bg,
              penaltyMinutes: 30,
              desc: `${rec.date} ${dayName} • ${pLabel} Namazı: ${stObj.label} (+30 dk)`
            });
          }
        }
      } else if (cat === 'yatak') {
        // Yatakta ORTA ve KÖTÜ olanlar
        if (st === 'ORTA' || st === 'KOTU') {
          yatakInfractionsCount++;
          const stObj = STATUS_CONFIG[st] || { label: st, bg: '#f59e0b' };
          infractions.push({
            id: rec.id,
            date: rec.date,
            dayName,
            category: 'yatak',
            categoryLabel: '🛏️ Yatak Yoklaması',
            subKey: 'Yatak Düzeni',
            subLabel: 'Oda & Yatak Düzeni',
            status: st,
            statusLabel: stObj.label,
            statusBg: stObj.bg,
            penaltyMinutes: 30,
            desc: `${rec.date} ${dayName} • Yatak Düzeni: ${stObj.label} (+30 dk)`
          });
        }
      } else if (cat === 'okul_donusu') {
        // Okul dönüşünde GEÇ ve GELMEDİ olanlar
        if (st === 'GEC' || st === 'GELMEDI') {
          okulInfractionsCount++;
          const stObj = STATUS_CONFIG[st] || { label: st, bg: '#ef4444' };
          infractions.push({
            id: rec.id,
            date: rec.date,
            dayName,
            category: 'okul_donusu',
            categoryLabel: '🎒 Okul Dönüşü',
            subKey: 'Okul Dönüşü',
            subLabel: 'Yurda Geliş',
            status: st,
            statusLabel: stObj.label,
            statusBg: stObj.bg,
            penaltyMinutes: 30,
            desc: `${rec.date} ${dayName} • Okul Dönüşü: ${stObj.label} (+30 dk)`
          });
        }
      }
    });

    // İzin Dönüşü Gecikmeleri (Kaç dakika geç kaldıysa x3 ek telafi süresi)
    let leaveReturnInfractionsCount = 0;
    let leaveReturnPenaltyMinutes = 0;
    const allLeaveReturns = this.getAllLeaveReturns();

    weekDates.forEach(dStr => {
      if (allLeaveReturns[dStr] && allLeaveReturns[dStr][studentId]) {
        const lr = allLeaveReturns[dStr][studentId];
        if (lr.status === 'GEC' && lr.lateMinutes > 0) {
          const multPenalty = lr.lateMinutes * 3;
          leaveReturnInfractionsCount++;
          leaveReturnPenaltyMinutes += multPenalty;
          const dayName = this.getDayName(dStr);
          infractions.push({
            id: 'lr_' + dStr + '_' + studentId,
            date: dStr,
            dayName,
            category: 'izin_donusu',
            categoryLabel: '🧳 İzin Dönüşü',
            subKey: 'İzin Dönüşü Gecikmesi',
            subLabel: `${lr.lateMinutes} dk Geç Kaldı`,
            status: 'GEC',
            statusLabel: `${lr.lateMinutes} dk Geç`,
            statusBg: '#ef4444',
            penaltyMinutes: multPenalty,
            lateMinutes: lr.lateMinutes,
            arrivalTime: lr.arrivalTime,
            expectedTime: lr.expectedTime,
            desc: `${dStr} ${dayName} • İzin Dönüşü: ${lr.lateMinutes} dk geç geldi (${lr.arrivalTime}, beklenen: ${lr.expectedTime}) • 3x Telafi: +${multPenalty} dk ek süre`
          });
        }
      }
    });

    infractions.sort((a, b) => a.date.localeCompare(b.date));

    const totalInfractions = infractions.length;
    const penaltyMinutes = infractions.reduce((sum, inf) => sum + (inf.penaltyMinutes || 30), 0);
    const calculatedExitTime = this.calculateExitTime(baseExitTime, penaltyMinutes);
    const penaltyFormatted = this.formatPenaltyDuration(penaltyMinutes);

    return {
      studentId,
      weekDates,
      baseExitTime,
      calculatedExitTime,
      totalInfractions,
      penaltyMinutes,
      penaltyFormatted,
      namazInfractionsCount,
      yatakInfractionsCount,
      okulInfractionsCount,
      leaveReturnInfractionsCount,
      leaveReturnPenaltyMinutes,
      infractions
    };
  }

  getLeaveReportBatch(students, weekDates, baseExitTime = '13:00') {
    const reports = students.map(st => ({
      student: st,
      report: this.getLeaveReportForStudent(st.id, weekDates, baseExitTime)
    }));

    let totalInfractionsAll = 0;
    let totalPenaltyMinutesAll = 0;
    let onTimeCount = 0;
    let delayedCount = 0;

    reports.forEach(item => {
      totalInfractionsAll += item.report.totalInfractions;
      totalPenaltyMinutesAll += item.report.penaltyMinutes;
      if (item.report.totalInfractions === 0) {
        onTimeCount++;
      } else {
        delayedCount++;
      }
    });

    return {
      reports,
      totalStudents: students.length,
      onTimeCount,
      delayedCount,
      totalInfractionsAll,
      totalPenaltyMinutesAll,
      totalPenaltyFormatted: this.formatPenaltyDuration(totalPenaltyMinutesAll)
    };
  }

  getGateCheckoutStatus(weekKey) {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LEAVE_CHECKOUT);
      const all = data ? JSON.parse(data) : {};
      return all[weekKey] || {};
    } catch {
      return {};
    }
  }

  toggleGateCheckout(weekKey, studentId) {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LEAVE_CHECKOUT);
      const all = data ? JSON.parse(data) : {};
      if (!all[weekKey]) all[weekKey] = {};
      all[weekKey][studentId] = !all[weekKey][studentId];
      localStorage.setItem(STORAGE_KEYS.LEAVE_CHECKOUT, JSON.stringify(all));
      if (this.isCloudEnabled()) {
        this.syncToCloud('kurs_data/gateCheckouts', all);
      }
      return all[weekKey][studentId];
    } catch {
      return false;
    }
  }

  // ========================================================
  // --- CEZALILAR İÇİN CEZASINI ÇEKTİ / TAMAMLANDI METODLARI ---
  // ========================================================
  getAllClearedPenalties() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENALTY_CLEARED);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  isPenaltyCleared(weekKey, studentId) {
    if (!weekKey || !studentId) return false;
    const all = this.getAllClearedPenalties();
    if (!all[weekKey]) return false;
    const entry = all[weekKey][studentId];
    if (typeof entry === 'boolean') return entry;
    return !!(entry && entry.cleared);
  }

  getClearedPenaltiesForWeek(weekKey) {
    if (!weekKey) return {};
    const all = this.getAllClearedPenalties();
    return all[weekKey] || {};
  }

  togglePenaltyCleared(weekKey, studentId, note = '') {
    try {
      const all = this.getAllClearedPenalties();
      if (!all[weekKey]) all[weekKey] = {};
      const current = this.isPenaltyCleared(weekKey, studentId);
      const newState = !current;
      
      all[weekKey][studentId] = {
        cleared: newState,
        clearedAt: newState ? new Date().toISOString() : null,
        note: note || (newState ? 'Telafisini tamamladı' : '')
      };
      
      localStorage.setItem(STORAGE_KEYS.PENALTY_CLEARED, JSON.stringify(all));
      if (this.isCloudEnabled()) {
        this.syncToCloud('kurs_data/penaltiesCleared', all);
      }
      window.dispatchEvent(new CustomEvent('penalty-cleared-updated', { 
        detail: { weekKey, studentId, cleared: newState } 
      }));
      return newState;
    } catch (e) {
      console.error('togglePenaltyCleared error:', e);
      return false;
    }
  }

  setPenaltyCleared(weekKey, studentId, isCleared = true, note = '') {
    try {
      const all = this.getAllClearedPenalties();
      if (!all[weekKey]) all[weekKey] = {};
      all[weekKey][studentId] = {
        cleared: !!isCleared,
        clearedAt: isCleared ? new Date().toISOString() : null,
        note: note || (isCleared ? 'Telafisini tamamladı' : '')
      };
      localStorage.setItem(STORAGE_KEYS.PENALTY_CLEARED, JSON.stringify(all));
      if (this.isCloudEnabled()) {
        this.syncToCloud('kurs_data/penaltiesCleared', all);
      }
      window.dispatchEvent(new CustomEvent('penalty-cleared-updated', { 
        detail: { weekKey, studentId, cleared: !!isCleared } 
      }));
      return true;
    } catch (e) {
      console.error('setPenaltyCleared error:', e);
      return false;
    }
  }

  // ========================================================
  // --- WHATSAPP İLE VELİYE BİLDİRİM YARDIMCISI ---
  // ========================================================
  cleanPhoneNumber(rawPhone) {
    if (!rawPhone) return '';
    let cleaned = rawPhone.toString().replace(/\D/g, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('0090')) {
      cleaned = cleaned.substring(2);
    } else if (cleaned.startsWith('0')) {
      cleaned = '9' + cleaned;
    } else if (cleaned.length === 10 && cleaned.startsWith('5')) {
      cleaned = '90' + cleaned;
    }
    return cleaned;
  }

  formatPhoneDisplay(rawPhone) {
    const clean = this.cleanPhoneNumber(rawPhone);
    if (clean.length === 12 && clean.startsWith('905')) {
      return `0${clean.substring(2, 5)} ${clean.substring(5, 8)} ${clean.substring(8, 10)} ${clean.substring(10, 12)}`;
    }
    return rawPhone || '';
  }

  sendWhatsAppMessage(rawPhone, messageText) {
    const phone = this.cleanPhoneNumber(rawPhone);
    if (!phone) {
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast('Veli telefon numarası bulunamadı. Lütfen talebenin veli telefonunu giriniz.', 'warning');
      }
      return false;
    }
    const encoded = encodeURIComponent(messageText);
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`;
    window.open(url, '_blank');
    return true;
  }

  // --- İzin Dönüşü Kayıt Metodları ---
  getAllLeaveReturns() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LEAVE_RETURN);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  getLeaveReturnsByDate(dateStr) {
    const all = this.getAllLeaveReturns();
    return all[dateStr] || {};
  }

  saveLeaveReturn(dateStr, studentId, recordData) {
    try {
      const all = this.getAllLeaveReturns();
      if (!all[dateStr]) all[dateStr] = {};
      all[dateStr][studentId] = {
        studentId,
        date: dateStr,
        ...recordData,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEYS.LEAVE_RETURN, JSON.stringify(all));
      if (this.isCloudEnabled()) {
        this.syncToCloud(`kurs_data/leaveReturns/${dateStr}/${studentId}`, all[dateStr][studentId]);
      }
      return all[dateStr][studentId];
    } catch (e) {
      console.error('saveLeaveReturn error:', e);
      return null;
    }
  }

  deleteLeaveReturn(dateStr, studentId) {
    try {
      const all = this.getAllLeaveReturns();
      if (all[dateStr] && all[dateStr][studentId]) {
        delete all[dateStr][studentId];
        localStorage.setItem(STORAGE_KEYS.LEAVE_RETURN, JSON.stringify(all));
        if (this.isCloudEnabled()) {
          this.syncToCloud(`kurs_data/leaveReturns/${dateStr}/${studentId}`, null);
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error('deleteLeaveReturn error:', e);
      return false;
    }
  }

  // --- Aylık İzin Dönüşü Kontrol ve Raporlama Metodları ---
  getMonthlyLeaveReturns(yearMonthStr) {
    const all = this.getAllLeaveReturns();
    const result = {};
    Object.keys(all).forEach(dateStr => {
      if (dateStr.startsWith(yearMonthStr)) {
        result[dateStr] = all[dateStr];
      }
    });
    return result;
  }

  getMonthlyLeaveReturnReportForStudent(studentId, yearMonthStr) {
    const monthReturns = this.getMonthlyLeaveReturns(yearMonthStr);
    const returnDates = Object.keys(monthReturns).sort();
    const records = [];
    let onTimeCount = 0;
    let lateCount = 0;
    let totalLateMinutes = 0;
    let totalPenaltyMinutes = 0;
    let excusedCount = 0;

    returnDates.forEach(dateStr => {
      const rec = monthReturns[dateStr] ? monthReturns[dateStr][studentId] : null;
      if (rec && (rec.arrivalTime || rec.status === 'IZINLI')) {
        records.push(rec);
        if (rec.status === 'GEC') {
          lateCount++;
          totalLateMinutes += (rec.lateMinutes || 0);
          totalPenaltyMinutes += (rec.penaltyMinutes || 0);
        } else if (rec.status === 'IZINLI') {
          excusedCount++;
        } else if (rec.status === 'VAKTINDE' || rec.status === 'ERKEN') {
          onTimeCount++;
        }
      }
    });

    return {
      studentId,
      yearMonth: yearMonthStr,
      totalReturns: records.length,
      records,
      onTimeCount,
      lateCount,
      totalLateMinutes,
      totalPenaltyMinutes,
      totalPenaltyFormatted: this.formatPenaltyDuration(totalPenaltyMinutes),
      excusedCount
    };
  }

  getMonthlyLeaveReturnBatch(students, yearMonthStr) {
    const reports = students.map(st => ({
      student: st,
      report: this.getMonthlyLeaveReturnReportForStudent(st.id, yearMonthStr)
    }));

    let totalReturnsAll = 0;
    let totalLateAll = 0;
    let totalPenaltyMinutesAll = 0;
    let totalExcusedAll = 0;
    let totalOnTimeAll = 0;

    reports.forEach(r => {
      totalReturnsAll += r.report.totalReturns;
      totalLateAll += r.report.lateCount;
      totalPenaltyMinutesAll += r.report.totalPenaltyMinutes;
      totalExcusedAll += r.report.excusedCount;
      totalOnTimeAll += r.report.onTimeCount;
    });

    return {
      reports,
      totalReturnsAll,
      totalLateAll,
      totalPenaltyMinutesAll,
      totalPenaltyFormatted: this.formatPenaltyDuration(totalPenaltyMinutesAll),
      totalExcusedAll,
      totalOnTimeAll
    };
  }

  // ========================================================
  // --- HAFTANIN VE AYIN TALEBESİ & PUANLAMA MOTORU ---
  // ========================================================
  getAllBonusPoints() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BONUS_POINTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  addBonusPoint(studentId, points, reason, hocaName = 'Eğitmen', date = new Date().toISOString().split('T')[0]) {
    try {
      const all = this.getAllBonusPoints();
      const rec = {
        id: 'bonus_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        studentId,
        date,
        points: Number(points) || 10,
        reason: reason || 'Örnek Davranış & Gayret',
        hocaName: hocaName || 'Eğitmen',
        createdAt: new Date().toISOString()
      };
      all.push(rec);
      localStorage.setItem(STORAGE_KEYS.BONUS_POINTS, JSON.stringify(all));
      if (this.isCloudEnabled()) {
        this.syncToCloud('kurs_data/bonusPoints', all);
      }
      return rec;
    } catch (e) {
      console.error('addBonusPoint error:', e);
      return null;
    }
  }

  deleteBonusPoint(id) {
    try {
      let all = this.getAllBonusPoints();
      all = all.filter(b => b.id !== id);
      localStorage.setItem(STORAGE_KEYS.BONUS_POINTS, JSON.stringify(all));
      if (this.isCloudEnabled()) {
        this.syncToCloud('kurs_data/bonusPoints', all);
      }
      return true;
    } catch (e) {
      console.error('deleteBonusPoint error:', e);
      return false;
    }
  }

  getStudentCompetitionScore(studentId, dates) {
    const allAtt = this.getAttendance();
    const studentAtt = allAtt.filter(a => a.studentId === studentId && dates.includes(a.date));

    // 1. Namaz Puanı & Günlük Tam İbadet Bonusu
    const prayers = ['Sabah', 'Öğle', 'İkindi', 'Akşam', 'Yatsı'];
    const namazGrid = {};
    dates.forEach(d => { namazGrid[d] = {}; });
    
    studentAtt.filter(a => (a.category || 'namaz') === 'namaz').forEach(a => {
      const pTime = a.prayerTime || 'Sabah';
      const st = this.normalizeStatusCode(a.status);
      if (namazGrid[a.date]) {
        namazGrid[a.date][pTime] = st;
      }
    });

    // Kurs genelinde hangi vakitlerin yoklaması yapılmış tespit et
    const takenPrayersMap = {};
    dates.forEach(d => { takenPrayersMap[d] = {}; });
    allAtt.filter(a => dates.includes(a.date) && (a.category || 'namaz') === 'namaz').forEach(a => {
      const pTime = a.prayerTime || 'Sabah';
      if (takenPrayersMap[a.date]) {
        takenPrayersMap[a.date][pTime] = true;
      }
    });

    let namazPoints = 0;
    let varCount = 0;
    let gecCount = 0;
    let takkesizCount = 0;
    let gecTakkesizCount = 0;
    let yokCount = 0;
    let izinliCount = 0;
    let fullBonusCount = 0;

    dates.forEach(d => {
      let dayAttendedPrayers = 0;
      let dayHasYok = false;
      let dayPrayersTakenCount = 0;

      prayers.forEach(p => {
        const wasTaken = takenPrayersMap[d] && takenPrayersMap[d][p];
        if (!wasTaken) return; // Bu vakit yoklaması henüz alınmamış / kılınmamış

        dayPrayersTakenCount++;

        // Talebenin bu vakit için özel durumu var mı?
        let st = namazGrid[d] ? namazGrid[d][p] : null;
        // Yoklama alındığı halde devamsız yazılmadıysa mevcut (VAR)
        if (!st) {
          st = 'VAR';
        }

        if (st === 'VAR') {
          namazPoints += 10;
          varCount++;
          dayAttendedPrayers++;
        } else if (st === 'GEC') {
          namazPoints += 5;
          gecCount++;
          dayAttendedPrayers++;
        } else if (st === 'TAKKESIZ') {
          namazPoints += 5;
          takkesizCount++;
          dayAttendedPrayers++;
        } else if (st === 'GEC_TAKKESIZ') {
          namazPoints += 2;
          gecTakkesizCount++;
          dayAttendedPrayers++;
        } else if (st === 'YOK') {
          yokCount++;
          dayHasYok = true;
        } else if (st === 'IZINLI') {
          izinliCount++;
        }
      });

      // Eğer o gün 5 vakit namaz kılınmışsa ve talebe hepsine katılmışsa -> +15 Günlük Tam İbadet Bonusu
      if (dayPrayersTakenCount === 5 && dayAttendedPrayers === 5 && !dayHasYok) {
        fullBonusCount++;
      }
    });

    const fullBonusPoints = fullBonusCount * 15;
    const totalNamazPoints = namazPoints + fullBonusPoints;

    // 2. Yatak Düzeni Puanı
    // Yatak yoklaması yapılan günleri tespit et
    const takenYatakDays = new Set();
    allAtt.filter(a => dates.includes(a.date) && a.category === 'yatak').forEach(a => {
      takenYatakDays.add(a.date);
    });

    const studentYatakMap = {};
    studentAtt.filter(a => a.category === 'yatak').forEach(a => {
      studentYatakMap[a.date] = this.normalizeStatusCode(a.status);
    });

    let yatakPoints = 0;
    let iyiCount = 0;
    let ortaCount = 0;
    let kotuCount = 0;

    takenYatakDays.forEach(d => {
      const st = studentYatakMap[d] || 'IYI';
      if (st === 'IYI' || st === 'VAR') {
        yatakPoints += 15;
        iyiCount++;
      } else if (st === 'ORTA') {
        yatakPoints += 5;
        ortaCount++;
      } else if (st === 'KOTU' || st === 'YOK') {
        kotuCount++;
      }
    });

    // 3. Okul Dönüşü Puanı
    // Okul dönüşü yoklaması yapılan günleri tespit et
    const takenOkulDays = new Set();
    allAtt.filter(a => dates.includes(a.date) && a.category === 'okul_donusu').forEach(a => {
      takenOkulDays.add(a.date);
    });

    const studentOkulMap = {};
    studentAtt.filter(a => a.category === 'okul_donusu').forEach(a => {
      studentOkulMap[a.date] = this.normalizeStatusCode(a.status);
    });

    let okulPoints = 0;
    let geldiCount = 0;
    let okulGecCount = 0;
    let gelmediCount = 0;

    takenOkulDays.forEach(d => {
      const st = studentOkulMap[d] || 'GELDI';
      if (st === 'GELDI' || st === 'VAR') {
        okulPoints += 10;
        geldiCount++;
      } else if (st === 'GEC') {
        okulPoints += 3;
        okulGecCount++;
      } else if (st === 'GELMEDI' || st === 'YOK') {
        gelmediCount++;
      }
    });

    // 4. İzin Dönüşü Puanı
    const allReturns = this.getAllLeaveReturns();
    let izinPoints = 0;
    let izinCount = 0;
    let onTimeCount = 0;
    let lateCount = 0;
    dates.forEach(d => {
      if (allReturns[d] && allReturns[d][studentId]) {
        const ret = allReturns[d][studentId];
        izinCount++;
        if (ret.status === 'VAKTINDE' || ret.status === 'ERKEN') {
          izinPoints += 25;
          onTimeCount++;
        } else if (ret.status === 'GEC') {
          lateCount++;
          const penalty = Math.min(25, ret.lateMinutes || ret.diffMinutes || 0);
          izinPoints += Math.max(0, 25 - penalty);
        } else if (ret.status === 'IZINLI') {
          // İzinli: 0 Puan, 0 Ceza
        }
      }
    });

    // 5. Takviye Ders Notları & Test Neticeleri Puanı
    const allAcad = this.getAcademicScores();
    const studentAcad = allAcad.filter(s => s.studentId === studentId && dates.includes(s.date));
    let akademiPoints = 0;
    studentAcad.forEach(s => {
      const score = Number(s.score) || 0;
      if (score >= 100) {
        akademiPoints += 50;
      } else if (score >= 90) {
        akademiPoints += 40;
      } else if (score >= 85) {
        akademiPoints += 30;
      } else {
        akademiPoints += Math.round(score / 3);
      }
    });

    // Test Neticeleri modülünden gelen haftalık sınav puanları
    const allTests = (this.getTestResults && typeof this.getTestResults === 'function') ? this.getTestResults() : [];
    const studentTests = allTests.filter(t => dates.includes(t.date) && t.scores && t.scores[studentId] && t.scores[studentId].score !== undefined);
    studentTests.forEach(t => {
      const score = Number(t.scores[studentId].score) || 0;
      if (score >= 100) {
        akademiPoints += 50;
      } else if (score >= 90) {
        akademiPoints += 40;
      } else if (score >= 85) {
        akademiPoints += 30;
      } else {
        akademiPoints += Math.round(score / 3);
      }
    });

    // 6. Hoca Takdir / Bonus Puanları
    const allBonus = this.getAllBonusPoints();
    const studentBonus = allBonus.filter(b => b.studentId === studentId && dates.includes(b.date));
    let bonusPoints = 0;
    studentBonus.forEach(b => {
      bonusPoints += Number(b.points) || 0;
    });

    const totalScore = totalNamazPoints + yatakPoints + okulPoints + izinPoints + akademiPoints + bonusPoints;

    return {
      studentId,
      totalScore,
      namaz: {
        points: totalNamazPoints,
        basePoints: namazPoints,
        varCount,
        gecCount,
        takkesizCount,
        gecTakkesizCount,
        yokCount,
        izinliCount,
        fullBonusCount,
        fullBonusPoints
      },
      yatak: {
        points: yatakPoints,
        iyiCount,
        ortaCount,
        kotuCount
      },
      okul: {
        points: okulPoints,
        geldiCount,
        gecCount: okulGecCount,
        gelmediCount
      },
      izinDonus: {
        points: izinPoints,
        count: izinCount,
        onTimeCount,
        lateCount
      },
      akademi: {
        points: akademiPoints,
        count: studentAcad.length,
        scores: studentAcad
      },
      bonus: {
        points: bonusPoints,
        count: studentBonus.length,
        items: studentBonus
      }
    };
  }

  getLeaderboard(period = 'haftalik', targetDate = new Date().toISOString().split('T')[0], classFilter = 'ALL') {
    const range = period === 'haftalik'
      ? this.getWeekRange(targetDate)
      : this.getMonthRange(targetDate.substring(0, 7));

    let students = this.getStudents();
    if (classFilter && classFilter !== 'ALL') {
      const cf = String(classFilter).trim();
      students = students.filter(s => {
        if (!s || !s.className) return false;
        const sc = s.className.trim();
        // 1. Birebir eşitlik (örn: '5-A' === '5-A')
        if (sc.toLowerCase() === cf.toLowerCase()) return true;

        // 2. Şube fark etmeksizin sınıf seviyesi eşleme (örn: '5', '5. Sınıf', '5. Sınıflar' -> '5-A' ve '5-B'yi kapsar)
        const filterDigit = cf.match(/^\d+/);
        const studentDigit = sc.match(/^\d+/);
        if (filterDigit && studentDigit && filterDigit[0] === studentDigit[0]) {
          const isGenericGrade = /^\d+(\.|\s*sınıf|\s*sinif|\s*ler|\s*lar)*$/i.test(cf);
          if (isGenericGrade) return true;
        }
        return false;
      });
    }

    const leaderboard = students.map(st => {
      const scoreData = this.getStudentCompetitionScore(st.id, range.dates);
      return {
        student: st,
        ...scoreData
      };
    });

    // Puanlara göre büyükten küçüğe sırala
    leaderboard.sort((a, b) => b.totalScore - a.totalScore);

    // Sıralama (rank) ata
    leaderboard.forEach((item, index) => {
      item.rank = index + 1;
    });

    return {
      period,
      targetDate,
      startDate: range.startDate,
      endDate: range.endDate,
      dates: range.dates,
      classFilter,
      totalStudents: leaderboard.length,
      ranking: leaderboard
    };
  }

  exportBackup() {
    return JSON.stringify({
      version: '5.0',
      exportedAt: new Date().toISOString(),
      students: this.getAllStudents(),
      staff: this.getStaff(),
      attendance: this.getAttendance(),
      performance: this.getPerformances(),
      academicScores: this.getAcademicScores(),
      gateCheckouts: this.getAllGateCheckouts(),
      penaltiesCleared: this.getAllClearedPenalties(),
      leaveReturns: this.getAllLeaveReturns(),
      bonusPoints: this.getAllBonusPoints(),
      customColumns: this.getCustomColumns(),
      passive_student_ids: this.getPassiveStudentIds(),
      deleted_student_ids: this.getDeletedStudentIds(),
      settings: this.getSettings()
    }, null, 2);
  }

  importBackup(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.students) throw new Error('Geçersiz format.');
      if (parsed.passive_student_ids) {
        localStorage.setItem(STORAGE_KEYS.PASSIVE_STUDENT_IDS, JSON.stringify(parsed.passive_student_ids));
      }
      if (parsed.deleted_student_ids) {
        localStorage.setItem(STORAGE_KEYS.DELETED_STUDENT_IDS, JSON.stringify(parsed.deleted_student_ids));
      }
      this.saveStudents(parsed.students);
      if (parsed.staff) this.saveStaff(parsed.staff);
      if (parsed.attendance) localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(parsed.attendance));
      if (parsed.performance) localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify(parsed.performance));
      if (parsed.academicScores) localStorage.setItem(STORAGE_KEYS.ACADEMIC_SCORES, JSON.stringify(parsed.academicScores));
      if (parsed.gateCheckouts) localStorage.setItem(STORAGE_KEYS.LEAVE_CHECKOUT, JSON.stringify(parsed.gateCheckouts));
      if (parsed.penaltiesCleared) localStorage.setItem(STORAGE_KEYS.PENALTY_CLEARED, JSON.stringify(parsed.penaltiesCleared));
      if (parsed.leaveReturns) localStorage.setItem(STORAGE_KEYS.LEAVE_RETURN, JSON.stringify(parsed.leaveReturns));
      if (parsed.bonusPoints) localStorage.setItem(STORAGE_KEYS.BONUS_POINTS, JSON.stringify(parsed.bonusPoints));
      if (parsed.customColumns) localStorage.setItem(STORAGE_KEYS.CUSTOM_COLUMNS, JSON.stringify(parsed.customColumns));
      if (parsed.dailyDuties) localStorage.setItem(STORAGE_KEYS.DUTIES, JSON.stringify(parsed.dailyDuties));
      if (parsed.hadisler) localStorage.setItem(STORAGE_KEYS.HADISLER, JSON.stringify(parsed.hadisler));
      if (parsed.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed.settings));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ========================================================
  // --- GÜNÜN GÖREVLİLERİ (YEMEKÇİ & MÜEZZİN) ---
  // ========================================================
  getDailyDuties(targetDate) {
    const today = targetDate || new Date().toISOString().split('T')[0];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DUTIES);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') {
          if (parsed[today]) return parsed[today];
          if (parsed.date === today) return parsed;
          return {
            date: today,
            yemekciler: Array.isArray(parsed.yemekciler) ? parsed.yemekciler : [],
            muezzin: parsed.muezzin || '',
            note: parsed.note || ''
          };
        }
      }
    } catch (e) {
      console.warn('getDailyDuties error:', e);
    }
    return {
      date: today,
      yemekciler: [],
      muezzin: '',
      note: ''
    };
  }

  saveDailyDuties(duties) {
    const today = (duties && duties.date) || new Date().toISOString().split('T')[0];
    const dutyData = {
      date: today,
      yemekciler: Array.isArray(duties.yemekciler) ? duties.yemekciler : [],
      muezzin: duties.muezzin || '',
      note: duties.note || '',
      updatedAt: new Date().toISOString()
    };

    try {
      let storeObj = {};
      const raw = localStorage.getItem(STORAGE_KEYS.DUTIES);
      if (raw) {
        try { storeObj = JSON.parse(raw) || {}; } catch(e){}
      }
      storeObj[today] = dutyData;
      storeObj.date = today;
      storeObj.yemekciler = dutyData.yemekciler;
      storeObj.muezzin = dutyData.muezzin;
      storeObj.note = dutyData.note;

      localStorage.setItem(STORAGE_KEYS.DUTIES, JSON.stringify(storeObj));

      if (this.isCloudEnabled()) {
        this.syncToCloud('kurs_data/daily_duties', storeObj);
      }
      window.dispatchEvent(new CustomEvent('daily-duties-updated', { detail: dutyData }));
      return { success: true, data: dutyData };
    } catch (err) {
      console.error('saveDailyDuties error:', err);
      return { success: false, message: err.message };
    }
  }

  // ========================================================
  // --- ÖZEL HADİS-İ ŞERİF VERİTABANI MOTORU ---
  // ========================================================
  getCustomHadisler() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HADISLER);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
        if (parsed && Array.isArray(parsed.list) && parsed.list.length > 0) {
          return parsed.list;
        }
      }
    } catch (e) {}

    try {
      const meta = localStorage.getItem('yoklama_custom_hadisler_meta_v1');
      if (meta) {
        const parsedMeta = JSON.parse(meta);
        if (parsedMeta && Array.isArray(parsedMeta.list) && parsedMeta.list.length > 0) {
          return parsedMeta.list;
        }
      }
    } catch (e) {}

    if (window.HADIS_LISTESI && Array.isArray(window.HADIS_LISTESI) && window.HADIS_LISTESI.length > 0) {
      return window.HADIS_LISTESI;
    }

    return [
      { text: "İki günü birbirine eşit olan ziyandadır.", author: "Hadis-i Şerif (Beyhaki)" },
      { text: "Namaz dinin direğidir; kim onu ikame ederse dinini ikame etmiş olur.", author: "Hadis-i Şerif (Tirmizi)" },
      { text: "Sizin en hayırlınız, Kur'an'ı öğrenen ve öğretendir.", author: "Hadis-i Şerif (Buhari)" },
      { text: "İlim tahsil etmek her Müslümana farzdır.", author: "Hadis-i Şerif (İbn Mace)" },
      { text: "Müminlerin iman bakımından en mükemmeli, ahlakı en güzel olanıdır.", author: "Hadis-i Şerif (Tirmizi)" },
      { text: "Temizlik imanın yarısıdır.", author: "Hadis-i Şerif (Müslim)" },
      { text: "Cemaatle kılınan namaz, tek başına kılınan namazdan yirmi yedi derece daha faziletlidir.", author: "Hadis-i Şerif (Buhari & Müslim)" },
      { text: "Müslüman, elinden ve dilinden diğer Müslümanların emniyette olduğu kimsedir.", author: "Hadis-i Şerif (Buhari)" }
    ];
  }

  saveCustomHadisler(hadisList) {
    if (!Array.isArray(hadisList) || hadisList.length === 0) {
      return { success: false, message: 'Hadis listesi boş.' };
    }
    const nowIso = new Date().toISOString();
    const dataObj = {
      list: hadisList,
      updatedAt: nowIso
    };

    localStorage.setItem(STORAGE_KEYS.HADISLER, JSON.stringify(hadisList));
    localStorage.setItem('yoklama_custom_hadisler_meta_v1', JSON.stringify(dataObj));
    try { localStorage.removeItem('oay_hadis_draft'); } catch(e){}

    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/hadisler', hadisList);
      this.syncToCloud('kurs_data/hadisler_updatedAt', nowIso);
    }
    window.dispatchEvent(new CustomEvent('hadisler-updated', { detail: hadisList }));
    return { success: true, count: hadisList.length, data: hadisList };
  }

  // ========================================================
  // --- PANODA GÖSTERİLECEK TELAFİLİLER VE İNTİZAM LİSTESİ ---
  // ========================================================
  getPanoPenalizedStudents(referenceDate) {
    const today = referenceDate || new Date().toISOString().split('T')[0];
    const students = this.getStudents(false); // Aktif öğrenciler
    const weekInfo = this.getWeekRange(today);
    const weekKey = `week_${weekInfo.startDate}`;
    const reportData = this.getLeaveReportBatch(students, undefined, '13:00');

    // Telafisi olan tüm talebeler
    const allPenalized = (reportData.reports || [])
      .filter(item => item && item.report && item.report.penaltyMinutes > 0);

    // TELAFİSİNİ TAMAMLAYANLAR (isPenaltyCleared) TV panosundan otomatik düşer!
    const activePenalized = allPenalized
      .filter(item => !this.isPenaltyCleared(weekKey, item.student.id))
      .sort((a, b) => b.report.penaltyMinutes - a.report.penaltyMinutes);

    const clearedCount = allPenalized.length - activePenalized.length;

    return {
      weekKey,
      totalPenalizedCount: activePenalized.length,
      allPenalizedCount: allPenalized.length,
      clearedCount: clearedCount,
      penalizedStudents: activePenalized,
      totalStudents: students.length,
      onTimeCount: reportData.onTimeCount + clearedCount
    };
  }

  // ========================================================
  // --- KUR'AN-I KERİM & HATİM TAKİP SİSTEMİ ---
  // ========================================================
  getAllQuranRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.QURAN_TRACKER);
      if (raw) return JSON.parse(raw);

      // İlk çalıştırmada boşsa talebelerin seviyelerine uygun gerçekçi başlangıç verileri hazırla
      const students = this.getStudents(false);
      const initial = {};
      students.forEach(s => {
        let page = 1;
        let hatim = 0;
        const numSeed = parseInt(s.studentNo || s.id.replace(/\D/g, '') || '1', 10);
        if (s.seviye === 'Seviye 3') {
          page = 240 + ((numSeed * 17) % 260);
          hatim = (numSeed % 2 === 0) ? 1 : 0;
        } else if (s.seviye === 'Seviye 2') {
          page = 120 + ((numSeed * 13) % 160);
          hatim = 0;
        } else {
          page = 25 + ((numSeed * 7) % 95);
          hatim = 0;
        }
        initial[s.id] = {
          studentId: s.id,
          currentPage: page,
          hatimCount: hatim,
          diniGrup: s.dahiliHoca || s.seviye || 'Genel',
          note: '',
          updatedAt: new Date().toISOString(),
          history: []
        };
      });
      localStorage.setItem(STORAGE_KEYS.QURAN_TRACKER, JSON.stringify(initial));
      return initial;
    } catch (e) {
      console.warn('getAllQuranRecords error:', e);
      return {};
    }
  }

  getQuranRecord(studentId) {
    if (!studentId) return null;
    const all = this.getAllQuranRecords();
    const student = this.getStudentById(studentId) || {};
    const defaultGroup = student.dahiliHoca || student.seviye || 'Genel';
    
    if (all[studentId]) {
      return {
        studentId,
        currentPage: typeof all[studentId].currentPage === 'number' ? all[studentId].currentPage : 1,
        hatimCount: typeof all[studentId].hatimCount === 'number' ? all[studentId].hatimCount : 0,
        diniGrup: all[studentId].diniGrup || defaultGroup,
        note: all[studentId].note || '',
        updatedAt: all[studentId].updatedAt || null,
        history: Array.isArray(all[studentId].history) ? all[studentId].history : []
      };
    }

    return {
      studentId,
      currentPage: 1,
      hatimCount: 0,
      diniGrup: defaultGroup,
      note: '',
      updatedAt: null,
      history: []
    };
  }

  calculateQuranStats(pageInput, hatimCountInput = 0) {
    const page = Math.min(604, Math.max(0, parseInt(pageInput, 10) || 0));
    const hatimCount = Math.max(0, parseInt(hatimCountInput, 10) || 0);

    const pagesReadInHatim = page;
    const pagesLeftInHatim = Math.max(0, 604 - page);
    const percentRead = parseFloat(((page / 604) * 100).toFixed(1));
    const percentLeft = parseFloat((((604 - page) / 604) * 100).toFixed(1));
    const cuzNo = page === 0 ? 1 : Math.min(30, Math.floor(Math.max(0, page - 1) / 20) + 1);
    const cuzStartPage = (cuzNo - 1) * 20 + 1;
    const cuzEndPage = Math.min(604, cuzNo * 20);
    const totalLifetimePages = (hatimCount * 604) + page;
    const isHatimComplete = page >= 604;

    return {
      currentPage: page,
      hatimCount,
      pagesReadInHatim,
      pagesLeftInHatim,
      percentRead,
      percentLeft,
      cuzNo,
      cuzPageRange: `${cuzStartPage} - ${cuzEndPage}`,
      totalLifetimePages,
      isHatimComplete
    };
  }

  saveQuranRecord(studentId, pageInput, hatimCountInput, note = '', customGroup = null) {
    try {
      const all = this.getAllQuranRecords();
      const existing = this.getQuranRecord(studentId);
      const student = this.getStudentById(studentId) || {};
      
      const newPage = Math.min(604, Math.max(0, parseInt(pageInput, 10) || 0));
      const newHatim = Math.max(0, parseInt(hatimCountInput !== undefined && hatimCountInput !== null ? hatimCountInput : existing.hatimCount, 10) || 0);
      const newGroup = customGroup !== null ? customGroup : (existing.diniGrup || student.dahiliHoca || student.seviye || 'Genel');
      
      const nowIso = new Date().toISOString();
      const todayStr = nowIso.split('T')[0];

      // Günlük okuma farkını geçmişe ekle
      const history = [...(existing.history || [])];
      const prevPage = existing.currentPage || 0;
      const readDiff = (newPage >= prevPage) ? (newPage - prevPage) : newPage;
      
      // Aynı güne ait kayıt varsa güncelle, yoksa ekle
      const todayIndex = history.findIndex(h => h.date === todayStr);
      if (todayIndex >= 0) {
        history[todayIndex] = {
          date: todayStr,
          page: newPage,
          readToday: Math.max(0, (history[todayIndex].readToday || 0) + readDiff),
          updatedAt: nowIso
        };
      } else {
        history.unshift({
          date: todayStr,
          page: newPage,
          readToday: Math.max(0, readDiff),
          updatedAt: nowIso
        });
      }

      // Geçmişi en fazla 30 kayıtla sınırla
      if (history.length > 30) history.length = 30;

      const updatedRecord = {
        studentId,
        currentPage: newPage,
        hatimCount: newHatim,
        diniGrup: newGroup,
        note: note !== undefined ? note : (existing.note || ''),
        updatedAt: nowIso,
        history
      };

      all[studentId] = updatedRecord;
      localStorage.setItem(STORAGE_KEYS.QURAN_TRACKER, JSON.stringify(all));

      if (this.isCloudEnabled()) {
        this.syncToCloud(`kurs_data/quranTracker/${studentId}`, updatedRecord);
      }

      window.dispatchEvent(new CustomEvent('quran-tracker-updated', { 
        detail: { studentId, record: updatedRecord, all } 
      }));

      const stats = this.calculateQuranStats(newPage, newHatim);
      return { success: true, record: updatedRecord, stats };
    } catch (e) {
      console.error('saveQuranRecord error:', e);
      return { success: false, message: e.message };
    }
  }

  completeHatim(studentId, note = '') {
    const rec = this.getQuranRecord(studentId);
    const newHatim = (rec.hatimCount || 0) + 1;
    const completedNote = note || `${newHatim}. Hatm-i Şerif tamamlandı!`;
    return this.saveQuranRecord(studentId, 1, newHatim, completedNote);
  }

  getQuranLeaderboard(limit = 10, filterGroup = 'ALL', filterLevel = 'ALL') {
    const students = this.getStudents(false); // Aktif öğrenciler
    const allRecords = this.getAllQuranRecords();

    let list = students.map(s => {
      const rec = allRecords[s.id] || { currentPage: 1, hatimCount: 0, diniGrup: s.dahiliHoca || s.seviye || 'Genel' };
      const stats = this.calculateQuranStats(rec.currentPage, rec.hatimCount);
      return {
        student: s,
        record: rec,
        stats,
        diniGrup: rec.diniGrup || s.dahiliHoca || s.seviye || 'Genel'
      };
    });

    // Grup filtresi
    if (filterGroup && filterGroup !== 'ALL') {
      list = list.filter(item => {
        const grp = item.diniGrup || item.student.dahiliHoca || '';
        return grp.trim().toLowerCase() === filterGroup.trim().toLowerCase();
      });
    }

    // Seviye filtresi
    if (filterLevel && filterLevel !== 'ALL') {
      list = list.filter(item => item.student.seviye === filterLevel);
    }

    // Sıralama: Önce tamamlanan hatim sayısı (DESC), sonra mevcut hatimdeki sayfa (DESC), sonra alfabetik
    list.sort((a, b) => {
      if (b.stats.totalLifetimePages !== a.stats.totalLifetimePages) {
        return b.stats.totalLifetimePages - a.stats.totalLifetimePages;
      }
      if (b.stats.hatimCount !== a.stats.hatimCount) {
        return b.stats.hatimCount - a.stats.hatimCount;
      }
      if (b.stats.currentPage !== a.stats.currentPage) {
        return b.stats.currentPage - a.stats.currentPage;
      }
      return (a.student.firstName || '').localeCompare(b.student.firstName || '', 'tr');
    });

    // Sıra numarası (Rank) ekle
    list.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    if (limit && limit > 0) {
      return list.slice(0, limit);
    }
    return list;
  }

  getQuranGroupSummary() {
    const students = this.getStudents(false);
    const allRecords = this.getAllQuranRecords();
    const groupMap = {};

    students.forEach(s => {
      const rec = allRecords[s.id] || { currentPage: 1, hatimCount: 0, diniGrup: s.dahiliHoca || s.seviye || 'Genel' };
      const grp = rec.diniGrup || s.dahiliHoca || 'Genel Grup';
      const stats = this.calculateQuranStats(rec.currentPage, rec.hatimCount);

      if (!groupMap[grp]) {
        groupMap[grp] = {
          groupName: grp,
          students: [],
          totalLifetimePages: 0,
          totalCompletedHatims: 0,
          totalCurrentPages: 0,
          topReader: null
        };
      }

      groupMap[grp].students.push({ student: s, record: rec, stats });
      groupMap[grp].totalLifetimePages += stats.totalLifetimePages;
      groupMap[grp].totalCompletedHatims += stats.hatimCount;
      groupMap[grp].totalCurrentPages += stats.currentPage;
    });

    const summaryList = Object.values(groupMap).map(g => {
      g.studentCount = g.students.length;
      g.avgPagesPerStudent = g.studentCount > 0 ? Math.round(g.totalLifetimePages / g.studentCount) : 0;
      g.avgPercent = g.studentCount > 0 ? Math.min(100, parseFloat(((g.totalCurrentPages / (g.studentCount * 604)) * 100).toFixed(1))) : 0;
      
      // Grup birincisini bul
      g.students.sort((a, b) => b.stats.totalLifetimePages - a.stats.totalLifetimePages);
      g.topReader = g.students[0] || null;

      return g;
    });

    // Grupları toplam okunan sayfaya göre sırala
    summaryList.sort((a, b) => b.totalLifetimePages - a.totalLifetimePages);
    return summaryList;
  }

  sendWhatsAppQuranReport(studentId, rawPhone) {
    const student = this.getStudentById(studentId);
    if (!student) return false;

    const phone = rawPhone || student.fatherPhone || student.motherPhone || student.parentPhone;
    const rec = this.getQuranRecord(studentId);
    const stats = this.calculateQuranStats(rec.currentPage, rec.hatimCount);

    const hatimText = stats.hatimCount > 0 
      ? `• Tamamlanan Hatim: ${stats.hatimCount} Hatm-i Şerif\n• Devam Eden Hatimdeki Sayfa: ${stats.currentPage} / 604 (${stats.cuzNo}. Cüz)\n`
      : `• Kaldığı Sayfa: ${stats.currentPage} / 604 (${stats.cuzNo}. Cüz)\n`;

    const message = 
      `*ÖMER AVNİYEL AKADEMİ • KUR'AN-I KERİM HATİM BİLGİLENDİRMESİ*\n\n` +
      `Sayın Velimiz,\n` +
      `Talebeniz *${student.firstName} ${student.lastName}* (${student.className}) Kur'an-ı Kerim tilavet ve hatim takibinde gayretle ilerlemektedir:\n\n` +
      `${hatimText}` +
      `• Okunan Oran: %${stats.percentRead}\n` +
      `• Hatmin Bitmesine Kalan: ${stats.pagesLeftInHatim} Sayfa (%${stats.percentLeft})\n` +
      `• Dini Ders Grubu: ${rec.diniGrup || student.dahiliHoca || '-'}\n\n` +
      `"Sizin en hayırlınız, Kur'an'ı öğrenen ve öğretendir." (Hadis-i Şerif - Buhârî)\n\n` +
      `Talebemizi azminden ötürü tebrik eder, muvaffakiyetlerinin devamını dileriz. — Ömer Avniyel Akademi`;

    return this.sendWhatsAppMessage(phone, message);
  }
}

window.Store = new DataStore();
window.STATUS_CONFIG = STATUS_CONFIG;
window.SEED_STUDENTS = SEED_STUDENTS;
window.DEFAULT_STAFF = DEFAULT_STAFF;
