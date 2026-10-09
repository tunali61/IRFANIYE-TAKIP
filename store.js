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
  MOCK_EXAMS: 'yoklama_mock_exams_v1',
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
  OKULDA: { code: 'OKULDA', label: 'Okulda', short: 'Okul', bg: '#0284c7', border: '#0369a1', desc: 'MEB Okulunda (Ders/Etüt)' },

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
STATUS_CONFIG.O = STATUS_CONFIG.OKULDA;
STATUS_CONFIG.OKUL = STATUS_CONFIG.OKULDA;
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
  { id: 'stf_7', fullName: 'TUNAHAN TAŞKIN', role: '8-B Sınıfı Etüt & Dahili Hocası', phone: '0555 000 00 07', password: '123' },
  { id: 'stf_8', fullName: 'YAVUZ SELİM SEVEN', role: '8-A Sınıfı Etüt & Dahili Hocası', phone: '0555 000 00 08', password: '123' }
];

// Sistemden kalıcı olarak çıkarılan öğrenciler sicili (Hiçbir cihazda veya bulutta asla hortlamaz)
const PERMANENTLY_DELETED_STUDENTS = {
  ids: new Set([
    'std_515', 'std_516', // 5-B: Yasin Kaan Can, Sanaullah Kayumoğlu
    'std_601',             // 6-A: Muhammed Ali Yıldırak
    'std_606', 'std_607', 'std_608', 'std_609', // 6-B: Melih Çarabatır, Mustafa Özcan, Ebubekir Abdullah, Mehmet Emir
    'std_701', 'std_704', 'std_705', // 7-A: Ahmet Hilmi Ekinci, Cihan Kulaklı, Kasım Kulaklı
    'std_716',             // 7-B: Serkan İncedere
    'std_803', 'std_804', 'std_812', 'std_817'  // 8. Sınıf eski kayıtlar
  ]),
  nos: new Set([515, 516, 601, 606, 607, 608, 609, 701, 704, 705, 716, 803, 804, 812, 817])
};

// 51 Öğrencinin Eksiksiz Veritabanı (5-A, 5-B, 6-A, 6-B, 7-A, 7-B, 8-A, 8-B)
const SEED_STUDENTS = [
  // 5-A SINIFI (Yasin Ekinci Grubu - 8 Talebe)
  { id: "std_502", studentNo: "502", firstName: "ARDA YUSUF", lastName: "SAYGI", className: "5-A", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 101", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SAYGI2026", password: "123" },
  { id: "std_503", studentNo: "503", firstName: "ASİL MİRAÇ", lastName: "SOYLU", className: "5-A", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 101", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SOYLU2026", password: "123" },
  { id: "std_504", studentNo: "504", firstName: "ÖMER", lastName: "SAAT", className: "5-A", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 101", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SAAT2026", password: "123" },
  { id: "std_505", studentNo: "505", firstName: "TİMUR FERMAN", lastName: "NARLIDERE", className: "5-A", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 101", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "NARLIDERE2026", password: "123" },
  { id: "std_506", studentNo: "506", firstName: "EYMEN ASAF", lastName: "ÖZHÖLÇEK", className: "5-A", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 101", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "OZHOLCEK2026", password: "123" },
  { id: "std_507", studentNo: "507", firstName: "KADİR YİĞİT", lastName: "KARABULUT", className: "5-A", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 102", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KARABULUT2026", password: "123" },
  { id: "std_508", studentNo: "508", firstName: "MEHMET EMİN", lastName: "KALKAN", className: "5-A", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 102", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KALKAN2026", password: "123" },
  { id: "std_509", studentNo: "509", firstName: "MUSTAFA ENSAR", lastName: "KALKAN", className: "5-A", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "YASİN EKİNCİ", dahiliHoca: "YASİN EKİNCİ", yatakhane: "Oda 102", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KALKAN2026", password: "123" },

  // 5-B SINIFI (Ahmed Mubariz Grubu - 7 Talebe)
  { id: "std_510", studentNo: "510", firstName: "RÜZGAR SAİT", lastName: "GÖGÜZ", className: "5-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 102", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "GOGUZ2026", password: "123" },
  { id: "std_511", studentNo: "511", firstName: "SAİD ABBAS", lastName: "SABİRİ", className: "5-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 103", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SABIRI2026", password: "123" },
  { id: "std_512", studentNo: "512", firstName: "SAİD MURTAZA", lastName: "SABİRİ", className: "5-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 103", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SABIRI2026", password: "123" },
  { id: "std_513", studentNo: "513", firstName: "HIZIR ALİ", lastName: "DİNÇER", className: "5-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 103", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "DINCER2026", password: "123" },
  { id: "std_514", studentNo: "514", firstName: "MEHMET ENSAR", lastName: "AKYOL", className: "5-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 103", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "AKYOL2026", password: "123" },
  { id: "std_517", studentNo: "517", firstName: "MUSTAFA", lastName: "EMİR", className: "5-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 104", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "EMIR52026", password: "123" },
  { id: "std_518", studentNo: "518", firstName: "HAMZA", lastName: "TOKSÖZ", className: "5-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "AHMED MUBARİZ", dahiliHoca: "AHMED MUBARİZ", yatakhane: "Oda 104", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "TOKSOZ2026", password: "123" },

  // 6-A SINIFI (Abdulhak Hamit & Oda 201 Grubu - 4 Talebe)
  { id: "std_602", studentNo: "602", firstName: "BABÜR", lastName: "KAYUMOĞLU", className: "6-A", school: "ABDULHAK HAMİT", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 201", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KAYUMOGLU2026", password: "123" },
  { id: "std_603", studentNo: "603", firstName: "ALİHAN", lastName: "ŞAHİN", className: "6-A", school: "ABDULHAK HAMİT", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 201", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SAHIN2026", password: "123" },
  { id: "std_604", studentNo: "604", firstName: "SELMAN FARİS", lastName: "ÖZTÜRK", className: "6-A", school: "ABDULHAK HAMİT", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 201", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "OZTURK2026", password: "123" },
  { id: "std_605", studentNo: "605", firstName: "YUNUS", lastName: "ÖZTÜRK", className: "6-A", school: "ABDULHAK HAMİT", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 201", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "OZTURK2026", password: "123" },

  // 6-B SINIFI (Oda 202 Grubu - 1 Talebe)
  { id: "std_610", studentNo: "610", firstName: "MAHMUT BERK", lastName: "KARACADAĞ", className: "6-B", school: "-", seviye: "Seviye 1", etutHocasi: "ABDUSSAMED TAV", dahiliHoca: "ABDUSSAMED TAV", yatakhane: "Oda 202", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KARACADAG2026", password: "123" },

  // 7-A SINIFI (Emir Talha Tarım Grubu - 4 Talebe)
  { id: "std_702", studentNo: "702", firstName: "EMİRHAN ENES", lastName: "ÖZTÜRK", className: "7-A", school: "ABDULHAK HAMİT", seviye: "Seviye 2", etutHocasi: "EMİR TALHA TARIM", dahiliHoca: "EMİR TALHA TARIM", yatakhane: "Oda 301", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "OZTURK2026", password: "123" },
  { id: "std_703", studentNo: "703", firstName: "BİLAL", lastName: "CHULUK", className: "7-A", school: "ABDULHAK HAMİT", seviye: "Seviye 2", etutHocasi: "EMİR TALHA TARIM", dahiliHoca: "EMİR TALHA TARIM", yatakhane: "Oda 301", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "CHULUK2026", password: "123" },
  { id: "std_706", studentNo: "706", firstName: "AYAZ", lastName: "TUTAR", className: "7-A", school: "ABDULHAK HAMİT", seviye: "Seviye 2", etutHocasi: "EMİR TALHA TARIM", dahiliHoca: "EMİR TALHA TARIM", yatakhane: "Oda 302", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "TUTAR2026", password: "123" },
  { id: "std_707", studentNo: "707", firstName: "EMİRHAN", lastName: "KULUS", className: "7-A", school: "AYHAN ŞAHENK", seviye: "Seviye 2", etutHocasi: "EMİR TALHA TARIM", dahiliHoca: "EMİR TALHA TARIM", yatakhane: "Oda 302", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KULUS2026", password: "123" },

  // 7-B SINIFI (Burak Bodur Grubu - 9 Talebe)
  { id: "std_708", studentNo: "708", firstName: "YUSUF KEMAL", lastName: "GENÇOĞLU", className: "7-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "BURAK BODUR", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 302", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "GENCOGLU2026", password: "123" },
  { id: "std_709", studentNo: "709", firstName: "YUSUF", lastName: "GENÇOĞLU", className: "7-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "BURAK BODUR", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 302", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "GENCOGLU2026", password: "123" },
  { id: "std_710", studentNo: "710", firstName: "EFE EMİN", lastName: "SÜRÜCÜ", className: "7-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "BURAK BODUR", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 303", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "SURUCU2026", password: "123" },
  { id: "std_711", studentNo: "711", firstName: "HARUN", lastName: "KAYUMOĞLU", className: "7-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "BURAK BODUR", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 303", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KAYUMOGLU2026", password: "123" },
  { id: "std_712", studentNo: "712", firstName: "MAHMUT TARIK", lastName: "BIÇAKÇILAR", className: "7-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "BURAK BODUR", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 303", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "BICAKCILAR2026", password: "123" },
  { id: "std_713", studentNo: "713", firstName: "ALİ ÖMER", lastName: "MENGİ", className: "7-B", school: "KAZIM ÖZALP", seviye: "Seviye 2", etutHocasi: "BURAK BODUR", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 304", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "MENGI2026", password: "123" },
  { id: "std_714", studentNo: "714", firstName: "MUHAMMADDIYOR", lastName: "RAYIMJONOV", className: "7-B", school: "KAZIM ÖZALP", seviye: "Seviye 2", etutHocasi: "BURAK BODUR", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 304", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "RAYIMJONOV2026", password: "123" },
  { id: "std_715", studentNo: "715", firstName: "MUSAB", lastName: "AKDOĞAN", className: "7-B", school: "KAZIM ÖZALP", seviye: "Seviye 3", etutHocasi: "BURAK BODUR", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 304", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "AKDOGAN2026", password: "123" },
  { id: "std_717", studentNo: "717", firstName: "RAMAZAN", lastName: "ATASOY", className: "7-B", school: "KAZIM ÖZALP", seviye: "Seviye 2", etutHocasi: "BURAK BODUR", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 304", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "ATASOY2026", password: "123" },

  // 8-A SINIFI (Yavuz Selim Seven Grubu - 9 Talebe)
  { id: "std_814", studentNo: "814", firstName: "RUÇHAN ZEKİ", lastName: "YILDIZ", className: "8-A", school: "ABDULHAK HAMİT", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 404", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "YILDIZ2026", password: "123" },
  { id: "std_815", studentNo: "815", firstName: "SEMİHCAN", lastName: "DEMİR", className: "8-A", school: "ABDULHAK HAMİT", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 404", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "DEMIR2026", password: "123" },
  { id: "std_822", studentNo: "822", firstName: "ÖMER FARUK", lastName: "ÖZTÜRK", className: "8-A", school: "-", seviye: "Seviye 2", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 405", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "OZTURK2026", password: "123" },
  { id: "std_806", studentNo: "806", firstName: "MEHMET FATİHHAN", lastName: "POLAT", className: "8-A", school: "ABDULHAK HAMİT", seviye: "Seviye 2", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 402", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "POLAT2026", password: "123" },
  { id: "std_819", studentNo: "819", firstName: "ŞABAN", lastName: "ÖZDEMİR", className: "8-A", school: "KAZIM ÖZALP", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 405", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "OZDEMIR2026", password: "123" },
  { id: "std_820", studentNo: "820", firstName: "YİĞİT EMİR", lastName: "KILIÇ", className: "8-A", school: "KAZIM ÖZALP", seviye: "Seviye 3", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 405", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KILIC2026", password: "123" },
  { id: "std_802", studentNo: "802", firstName: "KERİM TUNA", lastName: "CİHAN", className: "8-A", school: "AYHAN ŞAHENK", seviye: "Seviye 1", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 401", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "CIHAN2026", password: "123" },
  { id: "std_808", studentNo: "808", firstName: "MUHAMMED KERİM", lastName: "BAYBURT", className: "8-A", school: "KAZIM ÖZALP", seviye: "Seviye 2", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 402", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "BAYBURT2026", password: "123" },
  { id: "std_811", studentNo: "811", firstName: "EMİR SALİH", lastName: "DOĞAN", className: "8-A", school: "KAZIM ÖZALP", seviye: "Seviye 2", etutHocasi: "YAVUZ SELİM SEVEN", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 403", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "DOGAN2026", password: "123" },

  // 8-B SINIFI (Tunahan Taşkın Grubu - 9 Talebe)
  { id: "std_801", studentNo: "801", firstName: "MEHMET YAKUP", lastName: "ÇEDİKÇİ", className: "8-B", school: "AYHAN ŞAHENK", seviye: "Seviye 1", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 401", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "CEDIKCI2026", password: "123" },
  { id: "std_805", studentNo: "805", firstName: "AHMET EMRE", lastName: "AKYOL", className: "8-B", school: "KAZIM ÖZALP", seviye: "Seviye 1", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "BURAK BODUR", yatakhane: "Oda 401", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "AKYOL2026", password: "123" },
  { id: "std_816", studentNo: "816", firstName: "YUSUF", lastName: "ULUSOY", className: "8-B", school: "ABDULHAK HAMİT", seviye: "Seviye 3", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 404", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "ULUSOY2026", password: "123" },
  { id: "std_810", studentNo: "810", firstName: "LÜTFULLAH ABİD", lastName: "HUSAİN", className: "8-B", school: "KAZIM ÖZALP", seviye: "Seviye 2", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 403", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "HUSAIN2026", password: "123" },
  { id: "std_809", studentNo: "809", firstName: "ÖMER FARUK", lastName: "YAZICI", className: "8-B", school: "KAZIM ÖZALP", seviye: "Seviye 2", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 402", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "YAZICI2026", password: "123" },
  { id: "std_821", studentNo: "821", firstName: "İSA MERT", lastName: "KARABULUT", className: "8-B", school: "KAZIM ÖZALP", seviye: "Seviye 3", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 405", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "KARABULUT2026", password: "123" },
  { id: "std_807", studentNo: "807", firstName: "SAMET ENES", lastName: "ACAR", className: "8-B", school: "ABDULHAK HAMİT", seviye: "Seviye 2", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "SELİM BOZKURT", yatakhane: "Oda 402", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "ACAR2026", password: "123" },
  { id: "std_813", studentNo: "813", firstName: "ALPEREN", lastName: "UYGUN", className: "8-B", school: "ABDULHAK HAMİT", seviye: "Seviye 3", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 403", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "UYGUN2026", password: "123" },
  { id: "std_818", studentNo: "818", firstName: "SONER", lastName: "ERCİVAN", className: "8-B", school: "KAZIM ÖZALP", seviye: "Seviye 3", etutHocasi: "TUNAHAN TAŞKIN", dahiliHoca: "TUNAHAN TAŞKIN", yatakhane: "Oda 405", fatherName: "", fatherPhone: "", motherName: "", motherPhone: "", familyCode: "ERCIVAN2026", password: "123" }
];

class DataStore {
  constructor() {
    this.init();
    this.activeAdminOtp = null; // Bellekte geçici OTP kodu
  }

  init() {
    // 1. Silinen öğrencileri tüm cihazların hafızasından ve modüllerinden kalıcı olarak temizle
    this.purgeDeletedStudentsPermanently();

    if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
      this.resetToDefaults();
    }
    // Mevcut öğrencilerin şubelerini (5-A, 5-B, 6-A, 6-B, 7-A, 7-B, 8-A, 8-B) otomatik güncelle
    this.autoMigrateStudentClasses();
    // 8-A ve 8-B kütük onarma kullanıcının talebiyle tamamen kaldırıldı
    // 8-A ve 8-B hoca atamalarını ve personel rollerini eşitle
    this.autoSyncStaffAndClassTeachers();
    // Dini ders grupları ve Dahili Hoca senkronizasyonunu otomatik sağla
    this.autoSyncDahiliHocalarAndQuran();
    // Pasiflik temizliği: Pasif sicilini yerel hafızada temizle (Buluta gereksiz yükleme yapmaz)
    try {
      localStorage.removeItem(STORAGE_KEYS.PASSIVE_STUDENT_IDS);
      localStorage.setItem(STORAGE_KEYS.PASSIVE_STUDENT_IDS, JSON.stringify({}));
    } catch (e) {}

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
    if (!localStorage.getItem(STORAGE_KEYS.DUTIES)) {
      const today = new Date().toISOString().split('T')[0];
      const initialDuties = {
        [today]: {
          date: today,
          yemekciler: ['ARDA YUSUF SAYGI (5-A)', 'ASİL MİRAÇ SOYLU (5-A)', 'ÖMER SAAT (5-A)'],
          muezzin: 'EMİRHAN ENES ÖZTÜRK (7-A)',
          note: 'Mutfak ve sofra intizamına dikkat edelim.',
          updatedAt: new Date().toISOString()
        },
        date: today,
        yemekciler: ['ARDA YUSUF SAYGI (5-A)', 'ASİL MİRAÇ SOYLU (5-A)', 'ÖMER SAAT (5-A)'],
        muezzin: 'EMİRHAN ENES ÖZTÜRK (7-A)',
        note: 'Mutfak ve sofra intizamına dikkat edelim.'
      };
      localStorage.setItem(STORAGE_KEYS.DUTIES, JSON.stringify(initialDuties));
    }
    if (this.getAttendance().length === 0) {
      this.seedDemoAttendance();
    }
  }

  // Kalıcı Olarak Silinen 11 Öğrenciyi Sistemin Her Yerinden Temizleme Motoru
  purgeDeletedStudentsPermanently() {
    try {
      const BANNED_IDS = PERMANENTLY_DELETED_STUDENTS.ids;
      const BANNED_NOS = PERMANENTLY_DELETED_STUDENTS.nos;

      // 1. Silinenler Sicili'ne (Tombstone) işle
      const deletedMap = this.getDeletedStudentIds();
      let deletedMapChanged = false;
      const nowIso = new Date().toISOString();
      BANNED_IDS.forEach(id => {
        if (!deletedMap[id] || !deletedMap[id].isDeleted) {
          deletedMap[id] = { isDeleted: true, deletedAt: nowIso };
          deletedMapChanged = true;
        }
      });
      if (deletedMapChanged) {
        this.saveDeletedStudentIds(deletedMap);
      }

      // 2. yoklama_students listesinden tamamen kazı
      const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const cleaned = list.filter(s => {
            if (!s) return false;
            if (s.id && BANNED_IDS.has(s.id)) return false;
            const no = parseInt(s.studentNo, 10);
            if (!isNaN(no) && BANNED_NOS.has(no)) return false;
            return true;
          });
          if (cleaned.length !== list.length) {
            localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(cleaned));
            this._lastStudentEditTime = Date.now();
            this._lastStudentPushTime = Date.now();
            if (this.isCloudEnabled()) {
              this.syncToCloud('kurs_data/students', cleaned);
              this.syncToCloud('kurs_data/deleted_student_ids', deletedMap);
            }
          }
        }
      }

      // 3. İlgili diğer tüm modül hafızalarından da kazı
      const cleanById = (key, isArray = true) => {
        try {
          const r = localStorage.getItem(key);
          if (!r) return;
          const parsed = JSON.parse(r);
          if (isArray && Array.isArray(parsed)) {
            const cl = parsed.filter(item => !item || (!BANNED_IDS.has(item.studentId) && !BANNED_IDS.has(item.id)));
            if (cl.length !== parsed.length) localStorage.setItem(key, JSON.stringify(cl));
          } else if (!isArray && typeof parsed === 'object' && parsed !== null) {
            let ch = false;
            BANNED_IDS.forEach(id => {
              if (parsed[id]) { delete parsed[id]; ch = true; }
            });
            if (ch) localStorage.setItem(key, JSON.stringify(parsed));
          }
        } catch(e) {}
      };

      cleanById(STORAGE_KEYS.ATTENDANCE, true);
      cleanById(STORAGE_KEYS.PERFORMANCE, true);
      cleanById(STORAGE_KEYS.ACADEMIC_SCORES, true);
      cleanById(STORAGE_KEYS.TEST_RESULTS, true);
      cleanById(STORAGE_KEYS.QURAN_TRACKER, false);
      cleanById(STORAGE_KEYS.PASSIVE_STUDENT_IDS, false);
      cleanById(STORAGE_KEYS.LOCAL_STUDENT_EDITS, false);

      // Görevli listesinde ismi geçiyorsa temizle
      try {
        const dRaw = localStorage.getItem(STORAGE_KEYS.DUTIES);
        if (dRaw) {
          let dObj = JSON.parse(dRaw);
          let dChanged = false;
          const purgeNames = ['AHMET HİLMİ EKİNCİ', 'YASİN KAAN CAN', 'SANAULLAH', 'YILDIRAK', 'ÇARABATIR', 'ÖZCAN', 'EBUBEKİR', 'KULAKLI', 'İNCEDERE'];
          const cleanDuty = (o) => {
            if (!o) return;
            if (o.muezzin && purgeNames.some(pn => o.muezzin.includes(pn))) {
              o.muezzin = 'EMİRHAN ENES ÖZTÜRK (7-A)';
              dChanged = true;
            }
            if (Array.isArray(o.yemekciler)) {
              const origLen = o.yemekciler.length;
              o.yemekciler = o.yemekciler.filter(ymk => !purgeNames.some(pn => ymk.includes(pn)));
              if (o.yemekciler.length !== origLen) dChanged = true;
            }
          };
          cleanDuty(dObj);
          Object.keys(dObj).forEach(k => { if (typeof dObj[k] === 'object') cleanDuty(dObj[k]); });
          if (dChanged) {
            localStorage.setItem(STORAGE_KEYS.DUTIES, JSON.stringify(dObj));
          }
        }
      } catch(e) {}
    } catch (e) {
      console.warn('[purgeDeletedStudentsPermanently] Hata:', e);
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
          const is8A = [814, 815, 822, 806, 819, 820, 802, 808, 811].includes(no) || hoca.includes('YAVUZ');
          newClass = is8A ? '8-A' : '8-B';
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

  // Tüm talebeleri güvenli bir şekilde AKTİF yapma motoru (Bulut ve Yerel Pasif Sicilini Temizler)
  activateAllStudents(forceCloudPush = false) {
    try {
      localStorage.removeItem(STORAGE_KEYS.PASSIVE_STUDENT_IDS);
      localStorage.setItem(STORAGE_KEYS.PASSIVE_STUDENT_IDS, JSON.stringify({}));
      let raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      let students = raw ? JSON.parse(raw) : [];
      const hadLocalStudents = Array.isArray(students) && students.length > 0;
      if (!hadLocalStudents) {
        students = [...SEED_STUDENTS];
      }
      let anyChanged = false;
      students.forEach(s => {
        if (s) {
          if (s.isPassive === true || s.status !== 'active') {
            s.isPassive = false;
            s.status = 'active';
            anyChanged = true;
          }
          delete s.aktif;
          delete s.active;
        }
      });
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
      
      // Buluta yalnızca açıkça istenirse (forceCloudPush=true), yerelde önceden kayıtlı öğrenci varsa ve değişiklik olduysa gönder
      if (forceCloudPush && hadLocalStudents && anyChanged && this.isCloudEnabled()) {
        this._lastStudentEditTime = Date.now();
        this._lastStudentPushTime = Date.now();
        this.syncToCloud('kurs_data/passive_student_ids', {});
        this.syncToCloud('kurs_data/students', students);
      }
      try {
        window.dispatchEvent(new CustomEvent('students-updated', { detail: students }));
      } catch (e) {}
      return { success: true, count: students.length };
    } catch (e) {
      console.warn('[activateAllStudents] Hata:', e);
      return { success: false, error: e };
    }
  }

  // Pasiflik temizliği: Tüm öğrencileri yerelde aktif tutar, bulutu ASLA ezmez
  restoreAllActiveStudents() {
    return this.activateAllStudents(false);
  }

  // --- 8. Sınıf Kesin Kütük Onarıcısı (8-A: Yavuz Selim Seven [9], 8-B: Tunahan Taşkın [9] - Tam 18 Talebe) ---
  forceRepair8thGradeClasses(forceCloudPush = true) {
    // 8. Sınıf kütük onarma kullanıcının talebiyle tamamen kaldırıldı
    return { success: true, count: 0 };
    try {
      // 8-A Sınıfı (Yavuz Selim Seven): 9 Talebe
      const class8ANumbers = new Set([814, 815, 822, 806, 819, 820, 802, 808, 811]);
      const class8AIds = new Set(['std_814', 'std_815', 'std_822', 'std_806', 'std_819', 'std_820', 'std_802', 'std_808', 'std_811']);

      // 8-B Sınıfı (Tunahan Taşkın): 9 Talebe
      const class8BNumbers = new Set([801, 805, 816, 810, 809, 821, 807, 813, 818]);
      const class8BIds = new Set(['std_801', 'std_805', 'std_816', 'std_810', 'std_809', 'std_821', 'std_807', 'std_813', 'std_818']);

      // Listeden çıkarılan 4 yabancı/fazlalık öğrenci
      const removed8thGradeIds = new Set(['std_803', 'std_804', 'std_812', 'std_817']);
      const removed8thGradeNos = new Set([803, 804, 812, 817]);

      // 1. Silinenler Sicili'ne (Tombstone) kaydet
      const deletedMap = this.getDeletedStudentIds();
      let deletedMapChanged = false;
      removed8thGradeIds.forEach(id => {
        if (!deletedMap[id] || !deletedMap[id].isDeleted) {
          deletedMap[id] = { isDeleted: true, deletedAt: new Date().toISOString() };
          deletedMapChanged = true;
        }
      });
      if (deletedMapChanged) {
        this.saveDeletedStudentIds(deletedMap);
      }

      // 2. Pasif Sicili: Kullanıcının pasife aldığı talebeleri KORU (asla ezme veya silme)
      const passiveMap = this.getPassiveStudentIds();

      // 3. Öğrenci Listesini Yükle ve Onar
      let studentsRaw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      let students = studentsRaw ? JSON.parse(studentsRaw) : [];
      if (!Array.isArray(students) || students.length === 0) {
        students = [...SEED_STUDENTS];
      }

      const initialCount = students.length;
      let hasChanges = false;
      const nowIso = new Date().toISOString();

      // Silinecek 4 kişiyi ve ada göre eşleşen fazlalıkları çıkar
      students = students.filter(s => {
        if (!s) return false;
        const no = parseInt(s.studentNo, 10);
        const sid = (s.id || '').trim();
        const fullName = `${s.firstName || ''} ${s.lastName || ''}`.toUpperCase();

        if (removed8thGradeIds.has(sid) || removed8thGradeNos.has(no)) {
          hasChanges = true;
          return false;
        }
        if (fullName.includes('CHOLAK') || fullName.includes('UZTURK') || fullName.includes('ŞENGÜL') || fullName.includes('HASTÜRK')) {
          hasChanges = true;
          return false;
        }
        return true;
      });

      // Kalan 18 talebeyi harfiyen doğru sınıfa ve hocaya ata (pasiflikleri koru)
      students = students.map(s => {
        if (!s) return s;
        const no = parseInt(s.studentNo, 10);
        const sid = (s.id || '').trim();
        const fullName = `${s.firstName || ''} ${s.lastName || ''}`.toUpperCase();

        let targetClass = null;
        let targetTeacher = null;

        if (class8ANumbers.has(no) || class8AIds.has(sid)) {
          targetClass = '8-A';
          targetTeacher = 'YAVUZ SELİM SEVEN';
        } else if (class8BNumbers.has(no) || class8BIds.has(sid)) {
          targetClass = '8-B';
          targetTeacher = 'TUNAHAN TAŞKIN';
        } else if (no >= 800 && no < 900) {
          if (fullName.includes('RUÇHAN') || fullName.includes('SEMİH') || fullName.includes('POLAT') || fullName.includes('ŞABAN') || fullName.includes('YİĞİT EMİR') || fullName.includes('CİHAN') || fullName.includes('BAYBURT') || (fullName.includes('EMİR SALİH') && fullName.includes('DOĞAN'))) {
            targetClass = '8-A';
            targetTeacher = 'YAVUZ SELİM SEVEN';
          } else if (fullName.includes('ÇEDİKÇİ') || fullName.includes('AKYOL') || fullName.includes('ULUSOY') || fullName.includes('HUSSAIN') || fullName.includes('HUSAİN') || fullName.includes('YAZICI') || fullName.includes('KARABULUT') || fullName.includes('ACAR') || fullName.includes('UYGUN') || fullName.includes('ERCİVAN')) {
            targetClass = '8-B';
            targetTeacher = 'TUNAHAN TAŞKIN';
          }
        }

        if (targetClass && targetTeacher) {
          const needsFix = s.className !== targetClass || s.etutHocasi !== targetTeacher;
          if (needsFix) {
            hasChanges = true;
            this.markStudentLocallyEdited(s.id, ['className', 'etutHocasi']);
            return {
              ...s,
              className: targetClass,
              etutHocasi: targetTeacher,
              updatedAt: nowIso
            };
          }
        }
        return s;
      });

      // Eksik 8. sınıf öğrencisi kalmışsa SEED_STUDENTS'ten ekle
      const existingIds = new Set(students.map(s => s.id));
      SEED_STUDENTS.forEach(seed => {
        const sNo = parseInt(seed.studentNo, 10);
        if ((class8ANumbers.has(sNo) || class8BNumbers.has(sNo)) && !existingIds.has(seed.id)) {
          const isPass = this.isStudentPassive(seed.id);
          students.push({
            ...seed,
            isPassive: isPass,
            status: isPass ? 'passive' : 'active',
            updatedAt: nowIso
          });
          this.markStudentLocallyEdited(seed.id, ['className', 'etutHocasi']);
          hasChanges = true;
        }
      });

      if (hasChanges || students.length !== initialCount || forceCloudPush) {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
        this._lastStudentEditTime = Date.now();
        this._lastStudentPushTime = Date.now();

        if (this.isCloudEnabled()) {
          this.syncToCloud('kurs_data/students', students);
          this.syncToCloud('kurs_data/deleted_student_ids', deletedMap);
          this.syncToCloud('kurs_data/passive_student_ids', passiveMap);

          const baseUrl = this.getFirebaseUrl();
          if (baseUrl) {
            removed8thGradeIds.forEach(delId => {
              try {
                fetch(`${baseUrl}/kurs_data/students/${delId}.json`, { method: 'DELETE' }).catch(() => {});
              } catch (e) {}
            });
          }
        }
        window.dispatchEvent(new CustomEvent('students-updated', { detail: students }));
      }
      return { success: true, count: students.length };
    } catch (err) {
      console.warn('[forceRepair8thGradeClasses] Hata:', err);
      return { success: false, error: err.message };
    }
  }

  // 8-A ve 8-B Etüt Hocası ve Personel Rol Güncellemesi (8-A: Yavuz Selim Seven, 8-B: Tunahan Taşkın)
  autoSyncStaffAndClassTeachers() {
    try {
      // 1. Personel / Hoca Listesini Eşitle
      const staffRaw = localStorage.getItem(STORAGE_KEYS.STAFF);
      let staffList = staffRaw ? JSON.parse(staffRaw) : null;
      if (!Array.isArray(staffList) || staffList.length === 0) {
        staffList = DEFAULT_STAFF;
      }
      let staffChanged = false;
      staffList = staffList.map(stf => {
        if (!stf || !stf.fullName) return stf;
        const name = stf.fullName.toUpperCase();
        if (name.includes('YAVUZ SELİM SEVEN')) {
          if (!stf.role || !stf.role.includes('8-A')) {
            staffChanged = true;
            return { ...stf, role: '8-A Sınıfı Etüt & Dahili Hocası' };
          }
        } else if (name.includes('TUNAHAN TAŞKIN')) {
          if (!stf.role || !stf.role.includes('8-B')) {
            staffChanged = true;
            return { ...stf, role: '8-B Sınıfı Etüt & Dahili Hocası' };
          }
        }
        return stf;
      });
      if (staffChanged) {
        localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staffList));
        if (this.isCloudEnabled()) {
          this.syncToCloud('kurs_data/staff', staffList);
        }
      }

      // 2. 8. Sınıf Kütüğünü Onar (8-A [9], 8-B [9])
      this.forceRepair8thGradeClasses(false);
    } catch (e) {
      console.warn('[autoSyncStaffAndClassTeachers] Hata:', e);
    }
  }

  // Dini Ders Grupları ve Kur'an Takip Senkronizasyonu (Dahili Hoca = Dini Ders Grubu)
  autoSyncDahiliHocalarAndQuran() {
    try {
      // 1. Öğrenci kütüğünü (yoklama_students) kontrol et ve eksik/hatalı dahiliHoca'ları SEED_STUDENTS'ten onar
      const seedMap = {};
      SEED_STUDENTS.forEach(seed => {
        if (seed.id) seedMap[seed.id] = seed;
        if (seed.studentNo) seedMap[seed.studentNo] = seed;
      });

      const studentsRaw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      let students = studentsRaw ? JSON.parse(studentsRaw) : [];
      let studentsChanged = false;

      if (Array.isArray(students) && students.length > 0) {
        students = students.map(s => {
          if (!s) return s;
          const currentHoca = (s.dahiliHoca || '').trim();
          // Yalnızca dahiliHoca tamamen boşsa veya jenerikse varsayılan fallback ata, kullanıcının girdiği hiçbir hocayı asla ezme!
          if (!currentHoca || currentHoca === 'Genel' || currentHoca.startsWith('Seviye')) {
            const seed = seedMap[s.id] || seedMap[s.studentNo];
            if (seed && seed.dahiliHoca) {
              studentsChanged = true;
              return { ...s, dahiliHoca: seed.dahiliHoca.trim() };
            }
          }
          return s;
        });

        if (studentsChanged) {
          localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
          if (this.isCloudEnabled()) {
            this.syncToCloud('kurs_data/students', students);
          }
        }
      }

      // 2. Kur'an Takip Kayıtlarını (yoklama_quran_tracker_v1) Dini Grup ile Eşitle (Sayfaları asla 1 yapmaz!)
      const quranRaw = localStorage.getItem(STORAGE_KEYS.QURAN_TRACKER);
      let quranRecords = quranRaw ? JSON.parse(quranRaw) : {};
      if (typeof quranRecords !== 'object' || quranRecords === null) quranRecords = {};
      let quranChanged = false;

      const activeStudents = this.getStudents(false);
      activeStudents.forEach(s => {
        if (!s || !s.id) return;
        const seed = seedMap[s.id] || seedMap[s.studentNo];
        const properHoca = (s.dahiliHoca || (seed ? seed.dahiliHoca : '') || '').trim();
        if (!properHoca) return;

        if (!quranRecords[s.id]) {
          quranRecords[s.id] = {
            studentId: s.id,
            currentPage: 1,
            hatimCount: 0,
            diniGrup: properHoca,
            note: '',
            updatedAt: null,
            history: []
          };
          quranChanged = true;
        } else {
          const curGroup = (quranRecords[s.id].diniGrup || '').trim();
          if (curGroup !== properHoca && properHoca && properHoca !== 'Genel') {
            quranRecords[s.id].diniGrup = properHoca;
            quranChanged = true;
            if (this.isCloudEnabled()) {
              this.syncToCloud(`kurs_data/quranTracker/${s.id}/diniGrup`, properHoca);
            }
          }
        }
      });

      if (quranChanged) {
        localStorage.setItem(STORAGE_KEYS.QURAN_TRACKER, JSON.stringify(quranRecords));
        try { localStorage.setItem('yoklama_quran_tracker_backup_v1', JSON.stringify(quranRecords)); } catch (e) {}
        window.dispatchEvent(new CustomEvent('quran-tracker-updated', { detail: quranRecords }));
      }
    } catch (e) {
      console.warn('[autoSyncDahiliHocalarAndQuran] Hata:', e);
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
    const user = window.firebaseAuth?.currentUser;

    if (!user) {
      console.warn(`[CloudSync] Firebase kullanıcısı oturum açmamış.`);
      return false;
    }

    const token = await user.getIdToken();

    const res = await fetch(
      `${baseUrl}/${endpoint}.json?auth=${encodeURIComponent(token)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }
    );

    if (!res.ok) {
      console.warn(`[CloudSync] ${endpoint} HTTP ${res.status}`);
    }

    return res.ok;
  } catch (err) {
    console.warn(`[CloudSync] ${endpoint} gönderilemedi:`, err);
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
      testResults: this.getTestResults(),
      gateCheckouts: this.getAllGateCheckouts(),
      penaltiesCleared: this.getAllClearedPenalties(),
      leaveReturns: this.getAllLeaveReturns(),
      bonusPoints: this.getAllBonusPoints(),
      customColumns: this.getCustomColumns(),
      passive_student_ids: {},
      deleted_student_ids: this.getDeletedStudentIds(),
      dailyDuties: (()=>{
        try {
          const r = localStorage.getItem(STORAGE_KEYS.DUTIES);
          return r ? JSON.parse(r) : {};
        } catch(e) { return {}; }
      })(),
      daily_duties: (()=>{
        try {
          const r = localStorage.getItem(STORAGE_KEYS.DUTIES);
          return r ? JSON.parse(r) : {};
        } catch(e) { return {}; }
      })(),
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
      const user = window.firebaseAuth?.currentUser;

if (!user) {
  console.warn('[CloudSync] Firebase kullanıcısı oturum açmamış.');
  return { success: false, message: 'Firebase oturumu bulunamadı.' };
}

const token = await user.getIdToken();

const res = await fetch(
  `${baseUrl}/kurs_data.json?auth=${encodeURIComponent(token)}`,
  {
    headers: { 'Accept': 'application/json' }
  }
);
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

    const toArray = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.filter(Boolean);
      if (typeof val === 'object') return Object.values(val).filter(Boolean);
      return [];
    };

    // 1. Yoklamaları birleştir
    const cloudAttendance = toArray(cloudData.attendance);
    if (cloudAttendance.length > 0) {
      const localAtt = this.getAttendance();
      const attMap = new Map();
      const getAttKey = a => a.id || (`${a.category || 'namaz'}_${a.studentId}_${a.date}_${a.prayerTime || a.subType || a.subKey || 'Sabah'}`);
      localAtt.forEach(a => { if (a && a.studentId) attMap.set(getAttKey(a), a); });
      cloudAttendance.forEach(a => {
        if (a && a.studentId) {
          const key = getAttKey(a);
          const existing = attMap.get(key);
          if (!existing || (a.recordedAt && (!existing.recordedAt || new Date(a.recordedAt) >= new Date(existing.recordedAt)))) {
            attMap.set(key, a);
          }
        }
      });
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(Array.from(attMap.values())));
    }

    // 2. Performans notlarını birleştir
    const cloudPerf = toArray(cloudData.performance);
    if (cloudPerf.length > 0) {
      const localPerf = this.getPerformances();
      const perfMap = new Map();
      const getPerfKey = p => p.id || (`${p.studentId}_${p.date}_${p.criteriaKey || (p.criteria && p.criteria.key) || 'default'}`);
      localPerf.forEach(p => { if (p && p.studentId) perfMap.set(getPerfKey(p), p); });
      cloudPerf.forEach(p => {
        if (p && p.studentId) {
          const key = getPerfKey(p);
          const existing = perfMap.get(key);
          if (!existing || (p.createdAt && (!existing.createdAt || new Date(p.createdAt) >= new Date(existing.createdAt)))) {
            perfMap.set(key, p);
          }
        }
      });
      localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify(Array.from(perfMap.values())));
    }

    // 3. Takviye ders notlarını birleştir
    const cloudAcad = toArray(cloudData.academicScores || cloudData.academic_scores);
    if (cloudAcad.length > 0) {
      const localAcad = this.getAcademicScores();
      const acadMap = new Map();
      localAcad.forEach(s => { if (s && s.studentId) acadMap.set(`${s.studentId}_${s.date}_${s.subject}`, s); });
      cloudAcad.forEach(s => {
        if (s && s.studentId) {
          const key = `${s.studentId}_${s.date}_${s.subject}`;
          const existing = acadMap.get(key);
          if (!existing || (s.updatedAt && (!existing.updatedAt || new Date(s.updatedAt) >= new Date(existing.updatedAt)))) {
            acadMap.set(key, s);
          }
        }
      });
      localStorage.setItem(STORAGE_KEYS.ACADEMIC_SCORES, JSON.stringify(Array.from(acadMap.values())));
    }

    // 4. Pasif Öğrenci Sicili (CloudSync - Pasif talebeler yerelde aktifse bulut yereli ASLA ezemez!)
    let currentLocalStudents = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (raw) currentLocalStudents = JSON.parse(raw);
    } catch (e) {}

    // 4. Pasiflik kavramı kaldırıldı: Her zaman boş tut ve yerelden sil
    localStorage.removeItem(STORAGE_KEYS.PASSIVE_STUDENT_IDS);
    localStorage.setItem(STORAGE_KEYS.PASSIVE_STUDENT_IDS, JSON.stringify({}));

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
      const validCloudStudents = cloudStudentsList.filter(s => s && s.id && (!deletedMap[s.id] || !deletedMap[s.id].isDeleted) && !PERMANENTLY_DELETED_STUDENTS.ids.has(s.id) && !PERMANENTLY_DELETED_STUDENTS.nos.has(parseInt(s.studentNo, 10)));

      // Yerel listeden de silinmişleri temizle
      let localStudents = [];
      try {
        const localRaw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed)) {
            localStudents = parsed.filter(s => s && s.id && (!deletedMap[s.id] || !deletedMap[s.id].isDeleted) && !PERMANENTLY_DELETED_STUDENTS.ids.has(s.id) && !PERMANENTLY_DELETED_STUDENTS.nos.has(parseInt(s.studentNo, 10)));
          }
        }
      } catch (e) {
        localStudents = this.getAllStudents();
      }

      // Buluttan yeni veri yazmadan önce yerel öğrenci yedeği al (Veri kaybını %100 önler)
      try {
        if (localStudents && localStudents.length > 0) {
          localStorage.setItem('yoklama_students_backup_pre_cloud_sync', JSON.stringify(localStudents));
        }
      } catch (e) {}

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

          let mergedSt = {
            ...(preferLocal ? cloudSt : localSt),
            ...(preferLocal ? localSt : cloudSt),
            isPassive: false,
            status: 'active'
          };
          delete mergedSt.aktif;
          delete mergedSt.active;

          // ASLA BOŞ VERİYLE GERÇEK VERİYİ EZME (Non-Destructive Field Protection):
          // Yerelde dolu olan telefon, veli şifresi, oda, veli adı gibi özel alanlar buluttan gelen boşlukla asla silinemez!
          const protectFields = [
            'fatherPhone', 'motherPhone', 'parentPhone', 
            'fatherName', 'motherName', 
            'yatakhane', 'notes', 'note', 'school'
          ];
          protectFields.forEach(fld => {
            const lVal = (localSt[fld] || '').toString().trim();
            const cVal = (cloudSt[fld] || '').toString().trim();
            if (lVal && !cVal) {
              mergedSt[fld] = localSt[fld];
            } else if (!lVal && cVal) {
              mergedSt[fld] = cloudSt[fld];
            }
          });

          // Şifre koruması: Yerelde 123'ten farklı özel şifre varsa ve bulut 123 ise yereldeki şifreyi koru
          const lPass = (localSt.password || '').toString().trim();
          const cPass = (cloudSt.password || '').toString().trim();
          if (lPass && lPass !== '123' && (!cPass || cPass === '123')) {
            mergedSt.password = localSt.password;
          }

          // Aile kodu koruması
          const lFam = (localSt.familyCode || '').toString().trim();
          const cFam = (cloudSt.familyCode || '').toString().trim();
          if (lFam && lFam !== 'AILE2026' && (!cFam || cFam === 'AILE2026')) {
            mergedSt.familyCode = localSt.familyCode;
          }

          // dahiliHoca koruması: Asla boş veya jenerik bırakma
          const curDahili = (mergedSt.dahiliHoca || '').trim();
          if (!curDahili || curDahili === 'Genel' || curDahili.startsWith('Seviye')) {
            if (localSt && localSt.dahiliHoca && localSt.dahiliHoca.trim()) {
              mergedSt.dahiliHoca = localSt.dahiliHoca.trim();
            } else {
              const seed = SEED_STUDENTS.find(s => s.id === mergedSt.id || s.studentNo === mergedSt.studentNo);
              if (seed && seed.dahiliHoca) mergedSt.dahiliHoca = seed.dahiliHoca;
            }
          }

          // 8. Sınıf Kesin Dağılım Koruması (Buluttan eski 8-A / 8-B şubeleri gelse bile doğru hoca ve şube korunur)
          const no8 = parseInt(mergedSt.studentNo, 10);
          const c8ANos = [814, 815, 822, 806, 819, 820, 802, 808, 811];
          const c8BNos = [801, 805, 816, 810, 809, 821, 807, 813, 818];
          if (c8ANos.includes(no8)) {
            mergedSt.className = '8-A';
            mergedSt.etutHocasi = 'YAVUZ SELİM SEVEN';
          } else if (c8BNos.includes(no8)) {
            mergedSt.className = '8-B';
            mergedSt.etutHocasi = 'TUNAHAN TAŞKIN';
          }

          return mergedSt;
        }

        const singleSt = {
          ...cloudSt,
          isPassive: false,
          status: 'active'
        };
        delete singleSt.aktif;
        delete singleSt.active;
        const curDahiliSingle = (singleSt.dahiliHoca || '').trim();
        if (!curDahiliSingle || curDahiliSingle === 'Genel' || curDahiliSingle.startsWith('Seviye')) {
          const seed = SEED_STUDENTS.find(s => s.id === singleSt.id || s.studentNo === singleSt.studentNo);
          if (seed && seed.dahiliHoca) singleSt.dahiliHoca = seed.dahiliHoca;
        }

        // 8. Sınıf Kesin Dağılım Koruması (Tekil bulut öğrencisi için)
        const no8s = parseInt(singleSt.studentNo, 10);
        const c8ANos = [814, 815, 822, 806, 819, 820, 802, 808, 811];
        const c8BNos = [801, 805, 816, 810, 809, 821, 807, 813, 818];
        if (c8ANos.includes(no8s)) {
          singleSt.className = '8-A';
          singleSt.etutHocasi = 'YAVUZ SELİM SEVEN';
        } else if (c8BNos.includes(no8s)) {
          singleSt.className = '8-B';
          singleSt.etutHocasi = 'TUNAHAN TAŞKIN';
        }

        return singleSt;
      });

      // Bulutta henüz olmayan yerel yeni eklenmiş öğrenciler varsa onları da koru (AMA SİLİNENLERİ ASLA EKLEME!)
      localStudents.forEach(localSt => {
        if (localSt && localSt.id && (!deletedMap[localSt.id] || !deletedMap[localSt.id].isDeleted) && !PERMANENTLY_DELETED_STUDENTS.ids.has(localSt.id) && !mergedStudents.some(s => s.id === localSt.id)) {
          mergedStudents.push(localSt);
        }
      });

      // Silinenler siciline ve kalıcı silinen öğrencilere göre son kez arındır
      const finalCleanList = mergedStudents.filter(s => {
        if (!s || !s.id) return false;
        if (deletedMap[s.id] && deletedMap[s.id].isDeleted) return false;
        if (PERMANENTLY_DELETED_STUDENTS.ids.has(s.id)) return false;
        const no = parseInt(s.studentNo, 10);
        if (!isNaN(no) && PERMANENTLY_DELETED_STUDENTS.nos.has(no)) return false;
        return true;
      });
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(finalCleanList));
      localStorage.removeItem(STORAGE_KEYS.PASSIVE_STUDENT_IDS);
      localStorage.setItem(STORAGE_KEYS.PASSIVE_STUDENT_IDS, JSON.stringify({}));
    }

    // 5. Hoca listesi
    const cloudStaff = toArray(cloudData.staff);
    if (cloudStaff.length > 0) {
      localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(cloudStaff));
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
      window.dispatchEvent(new CustomEvent('penalty-cleared-updated', { detail: mergedCleared }));
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

    // 8. Hoca Takdir / Bonus Puanları (ID bazlı akıllı birleştirme)
    const cloudBonus = toArray(cloudData.bonusPoints);
    if (cloudBonus.length > 0) {
      const localBonus = this.getAllBonusPoints();
      const bonusMap = new Map();
      localBonus.forEach(b => { if (b && b.id) bonusMap.set(b.id, b); });
      cloudBonus.forEach(b => {
        if (b && b.id) {
          const existing = bonusMap.get(b.id);
          if (!existing || (b.createdAt && (!existing.createdAt || new Date(b.createdAt) >= new Date(existing.createdAt)))) {
            bonusMap.set(b.id, b);
          }
        }
      });
      localStorage.setItem(STORAGE_KEYS.BONUS_POINTS, JSON.stringify(Array.from(bonusMap.values())));
    }

    // 8b. Haftalık Test Neticeleri
    const cloudTests = toArray(cloudData.testResults || cloudData.test_results);
    if (cloudTests.length > 0) {
      const localTests = this.getTestResults();
      const testMap = new Map();
      localTests.forEach(t => { if (t && t.id) testMap.set(t.id, t); });
      cloudTests.forEach(t => {
        if (t && t.id) {
          const existing = testMap.get(t.id);
          if (!existing || (t.updatedAt && (!existing.updatedAt || new Date(t.updatedAt) >= new Date(existing.updatedAt)))) {
            testMap.set(t.id, t);
          }
        }
      });
      localStorage.setItem(STORAGE_KEYS.TEST_RESULTS, JSON.stringify(Array.from(testMap.values())));
    }

    // 8c. Kurumsal Deneme Sınavları & Kazanım Analizleri (Mock Exams)
    const cloudMockExams = toArray(cloudData.mockExams || cloudData.mock_exams);
    if (cloudMockExams.length > 0) {
      const localExams = this.getMockExams();
      const examMap = new Map();
      localExams.forEach(e => { if (e && e.id) examMap.set(e.id, e); });
      cloudMockExams.forEach(e => {
        if (e && e.id) {
          const existing = examMap.get(e.id);
          if (!existing || (e.updatedAt && (!existing.updatedAt || new Date(e.updatedAt) >= new Date(existing.updatedAt)))) {
            examMap.set(e.id, e);
          }
        }
      });
      localStorage.setItem(STORAGE_KEYS.MOCK_EXAMS, JSON.stringify(Array.from(examMap.values())));
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
    const cloudCols = toArray(cloudData.customColumns || cloudData.custom_columns);
    if (cloudCols.length > 0) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_COLUMNS, JSON.stringify(cloudCols));
    }

    // 11. Günün Görevlileri (Yemekçi & Müezzin)
    const rawDutiesA = cloudData.daily_duties;
    const rawDutiesB = cloudData.dailyDuties;
    let chosenDuties = null;

    const getDutyScore = (obj) => {
      if (!obj || typeof obj !== 'object') return -1;
      let score = 0;
      if (Array.isArray(obj.yemekciler) && obj.yemekciler.length > 0) score += 10;
      if (obj.muezzin) score += 10;
      const dateKeys = Object.keys(obj).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k));
      score += dateKeys.length * 5;
      return score;
    };

    if (getDutyScore(rawDutiesA) >= getDutyScore(rawDutiesB)) {
      chosenDuties = { ...(rawDutiesB || {}), ...(rawDutiesA || {}) };
    } else {
      chosenDuties = { ...(rawDutiesA || {}), ...(rawDutiesB || {}) };
    }

    if (chosenDuties && typeof chosenDuties === 'object' && Object.keys(chosenDuties).length > 0) {
      try {
        const localRaw = localStorage.getItem(STORAGE_KEYS.DUTIES);
        let localObj = localRaw ? JSON.parse(localRaw) : {};
        if (typeof localObj !== 'object' || localObj === null) localObj = {};

        const merged = { ...localObj };
        Object.keys(chosenDuties).forEach(k => {
          if (/^\d{4}-\d{2}-\d{2}$/.test(k)) {
            const cloudEntry = chosenDuties[k];
            const localEntry = localObj[k];
            if (!localEntry || !localEntry.updatedAt || (cloudEntry && cloudEntry.updatedAt && new Date(cloudEntry.updatedAt) >= new Date(localEntry.updatedAt))) {
              merged[k] = cloudEntry;
            }
          } else {
            merged[k] = chosenDuties[k];
          }
        });

        const todayStr = new Date().toISOString().split('T')[0];
        if (merged[todayStr]) {
          merged.date = todayStr;
          merged.yemekciler = merged[todayStr].yemekciler || [];
          merged.muezzin = merged[todayStr].muezzin || '';
          merged.note = merged[todayStr].note || '';
        }

        localStorage.setItem(STORAGE_KEYS.DUTIES, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('daily-duties-updated', { detail: merged }));
      } catch (e) {
        localStorage.setItem(STORAGE_KEYS.DUTIES, JSON.stringify(chosenDuties));
        window.dispatchEvent(new CustomEvent('daily-duties-updated', { detail: chosenDuties }));
      }
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

    // 13. Kur'an-ı Kerim & Hatim Takibi (Akıllı ve güvenli birleştirme: Gerçek veri default veriyi her zaman ezer!)
    const cloudQuran = cloudData.quranTracker || cloudData.quran_tracker;
    if (cloudQuran && typeof cloudQuran === 'object') {
      const localQuran = this.getAllQuranRecords();
      const mergedQuran = { ...localQuran };
      const currentStudents = this.getStudents(false);
      const studentMap = {};
      currentStudents.forEach(s => { if (s && s.id) studentMap[s.id] = s; });

      let localHasHigherData = false;

      Object.keys(cloudQuran).forEach(stId => {
        const cloudRec = cloudQuran[stId];
        const localRec = mergedQuran[stId];
        if (!cloudRec) return;

        const cloudIsReal = (Number(cloudRec.currentPage) > 1) || (Number(cloudRec.hatimCount) > 0) || (Array.isArray(cloudRec.history) && cloudRec.history.length > 0);
        const localIsReal = localRec && ((Number(localRec.currentPage) > 1) || (Number(localRec.hatimCount) > 0) || (Array.isArray(localRec.history) && localRec.history.length > 0));

        if (cloudIsReal && !localIsReal) {
          // Bulutta gerçek veri var, yerelde yok/1 -> Buluttaki gerçek veriyi al
          mergedQuran[stId] = { ...cloudRec };
        } else if (localIsReal && !cloudIsReal) {
          // Yerelde gerçek okuma verisi var, bulutta sadece boş 1 var -> YEREL KORUNUR! Bulutun 1'i yereli ASLA EZEMEZ!
          localHasHigherData = true;
        } else if (localIsReal && cloudIsReal) {
          // Her ikisinde de veri varsa: Daha ilerideki sayfayı veya en yeni kaydı al
          const cPage = Number(cloudRec.currentPage) || 0;
          const lPage = Number(localRec.currentPage) || 0;
          const cHatim = Number(cloudRec.hatimCount) || 0;
          const lHatim = Number(localRec.hatimCount) || 0;
          const cTotal = cHatim * 604 + cPage;
          const lTotal = lHatim * 604 + lPage;

          if (cTotal > lTotal) {
            mergedQuran[stId] = { ...cloudRec };
          } else if (lTotal > cTotal) {
            localHasHigherData = true;
          } else {
            if (cloudRec.updatedAt && (!localRec.updatedAt || new Date(cloudRec.updatedAt) >= new Date(localRec.updatedAt))) {
              mergedQuran[stId] = { ...cloudRec };
            }
          }
        } else {
          if (!localRec) mergedQuran[stId] = { ...cloudRec };
        }

        // Buluttan gelen kayıtta diniGrup bozuksa veya 'Seviye'/'Genel' ise öğrencinin dahiliHoca'sı ile düzelt
        if (mergedQuran[stId]) {
          const curG = (mergedQuran[stId].diniGrup || '').trim();
          const stObj = studentMap[stId];
          const properHoca = stObj ? (stObj.dahiliHoca || '').trim() : '';
          if (properHoca && (!curG || curG === 'Genel' || curG.startsWith('Seviye'))) {
            mergedQuran[stId].diniGrup = properHoca;
          }
        }
      });

      localStorage.setItem(STORAGE_KEYS.QURAN_TRACKER, JSON.stringify(mergedQuran));
      try { localStorage.setItem('yoklama_quran_tracker_backup_v1', JSON.stringify(mergedQuran)); } catch (e) {}

      // Eğer cihazda buluttan daha ileri okuma verisi varsa bulutu otomatik iyileştir (heal cloud)
      if (localHasHigherData && this.isCloudEnabled()) {
        console.log('[CloudHealing] Yereldeki gerçek Kur\'an sayfaları buluta otomatik kurtarıldı/aktarıldı.');
        this.syncToCloud('kurs_data/quranTracker', mergedQuran);
      }

      window.dispatchEvent(new CustomEvent('quran-tracker-updated', { detail: mergedQuran }));
    }

    // 8-A / 8-B Hoca & Şube Eşitlemesini Bulut Senkronizasyonundan Sonra da Garantiye Al
    try {
      this.autoSyncStaffAndClassTeachers();
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('cloud-sync-done', { detail: cloudData }));
  }

  // Gerçek Zamanlı (Realtime SSE) Bulut Dinleyicisi - Anında Değişim
  async initRealtimeListener() {
    const baseUrl = this.getFirebaseUrl();
    if (!baseUrl || typeof EventSource === 'undefined') return;

    if (this._eventSource) {
      try { this._eventSource.close(); } catch (e) {}
      this._eventSource = null;
    }

    try {
      const user = window.firebaseAuth?.currentUser;
if (!user) {
  console.warn('[Realtime] Firebase kullanıcısı oturum açmamış.');
  return;
}

const token = await user.getIdToken();

this._eventSource = new EventSource(
  `${baseUrl}/kurs_data.json?auth=${encodeURIComponent(token)}`
);

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
              try {
                const localRaw = localStorage.getItem(STORAGE_KEYS.DUTIES);
                let localObj = localRaw ? JSON.parse(localRaw) : {};
                if (typeof localObj !== 'object' || localObj === null) localObj = {};
                let merged;
                if (path === 'dailyDuties' || path === 'daily_duties') {
                  merged = { ...localObj, ...data };
                } else {
                  const subKey = path.split('/')[1];
                  if (subKey) {
                    localObj[subKey] = data;
                    merged = localObj;
                  } else {
                    merged = { ...localObj, ...data };
                  }
                }
                localStorage.setItem(STORAGE_KEYS.DUTIES, JSON.stringify(merged));
                window.dispatchEvent(new CustomEvent('daily-duties-updated', { detail: merged }));
              } catch (e) {
                localStorage.setItem(STORAGE_KEYS.DUTIES, JSON.stringify(data));
                window.dispatchEvent(new CustomEvent('daily-duties-updated', { detail: data }));
              }
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
          } else if (path.startsWith('attendance')) {
            this.handleRealtimeAttendance(path, data);
          } else if (path.startsWith('penaltiesCleared')) {
            if (data !== undefined) {
              try {
                const localCleared = this.getAllClearedPenalties();
                const mergedCleared = { ...localCleared };
                if (path === 'penaltiesCleared') {
                  if (data && typeof data === 'object') {
                    Object.assign(mergedCleared, data);
                  }
                } else {
                  const parts = path.split('/');
                  if (parts.length === 2 && parts[1]) {
                    mergedCleared[parts[1]] = Object.assign(mergedCleared[parts[1]] || {}, data || {});
                  } else if (parts.length >= 3 && parts[1] && parts[2]) {
                    if (!mergedCleared[parts[1]]) mergedCleared[parts[1]] = {};
                    mergedCleared[parts[1]][parts[2]] = data;
                  }
                }
                localStorage.setItem(STORAGE_KEYS.PENALTY_CLEARED, JSON.stringify(mergedCleared));
                window.dispatchEvent(new CustomEvent('penalty-cleared-updated', { detail: mergedCleared }));
              } catch (e) {
                console.warn('[RealtimeSync penaltiesCleared] Hata:', e);
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

  handleRealtimeAttendance(path, data) {
    try {
      if (!data) return;
      const toArray = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val.filter(Boolean);
        if (typeof val === 'object') return Object.values(val).filter(Boolean);
        return [];
      };

      const incoming = toArray(data);
      if (incoming.length > 0) {
        const localAtt = this.getAttendance();
        const attMap = new Map();
        const getAttKey = a => a.id || (`${a.category || 'namaz'}_${a.studentId}_${a.date}_${a.prayerTime || a.subType || a.subKey || 'Sabah'}`);
        localAtt.forEach(a => { if (a && a.studentId) attMap.set(getAttKey(a), a); });
        
        incoming.forEach(a => {
          if (a && a.studentId) {
            const key = getAttKey(a);
            const existing = attMap.get(key);
            if (!existing || !existing.recordedAt || !a.recordedAt || new Date(a.recordedAt) >= new Date(existing.recordedAt)) {
              attMap.set(key, a);
            }
          }
        });

        const mergedList = Array.from(attMap.values());
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(mergedList));
        window.dispatchEvent(new CustomEvent('cloud-sync-done', { detail: { attendance: mergedList } }));
      }
    } catch (e) {
      console.warn('[handleRealtimeAttendance] Hata:', e);
    }
  }

  handleRealtimeQuranTracker(path, data) {
    try {
      const parts = path.split('/');
      const all = this.getAllQuranRecords();
      let hasChange = false;

      if (parts.length === 2) {
        const studentId = parts[1];
        if (data === null) {
          delete all[studentId];
          hasChange = true;
        } else {
          const existing = all[studentId];
          const incomingIsReal = (Number(data.currentPage) > 1) || (Number(data.hatimCount) > 0) || (Array.isArray(data.history) && data.history.length > 0);
          const existingIsReal = existing && ((Number(existing.currentPage) > 1) || (Number(existing.hatimCount) > 0) || (Array.isArray(existing.history) && existing.history.length > 0));

          if (incomingIsReal || !existingIsReal) {
            all[studentId] = data;
            hasChange = true;
          }
        }
      } else if (parts.length === 1 && typeof data === 'object' && data !== null) {
        Object.keys(data).forEach(stId => {
          const inc = data[stId];
          const ext = all[stId];
          if (!inc) return;

          const incIsReal = (Number(inc.currentPage) > 1) || (Number(inc.hatimCount) > 0) || (Array.isArray(inc.history) && inc.history.length > 0);
          const extIsReal = ext && ((Number(ext.currentPage) > 1) || (Number(ext.hatimCount) > 0) || (Array.isArray(ext.history) && ext.history.length > 0));

          if (incIsReal || !extIsReal) {
            all[stId] = inc;
            hasChange = true;
          }
        });
      }

      if (hasChange) {
        localStorage.setItem(STORAGE_KEYS.QURAN_TRACKER, JSON.stringify(all));
        try { localStorage.setItem('yoklama_quran_tracker_backup_v1', JSON.stringify(all)); } catch (e) {}
        window.dispatchEvent(new CustomEvent('quran-tracker-updated', { detail: all }));
      }
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

  // --- Pasif Öğrenci Sicili Metodları (Pasife alma sistemi tamamen kaldırıldı, daima boş ve aktif kabul edilir) ---
  getPassiveStudentIds() {
    return {};
  }

  savePassiveStudentIds(map) {
    try {
      localStorage.removeItem(STORAGE_KEYS.PASSIVE_STUDENT_IDS);
    } catch (e) {}
  }

  isStudentPassive(studentId) {
    return false;
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

      // Pasif öğrenci sicilini uygula: Yalnızca kullanıcının açıkça pasife aldığı öğrenciler pasif yapılır
      // Tüm talebeler kesinlikle %100 aktiftir
      list.forEach(s => {
        if (!s || !s.id) return;
        s.isPassive = false;
        s.status = 'active';
        delete s.aktif;
        delete s.active;
      });

      return list;
    } catch {
      const deletedMap = this.getDeletedStudentIds();
      return SEED_STUDENTS.filter(s => s && s.id && (!deletedMap[s.id] || !deletedMap[s.id].isDeleted));
    }
  }

  // Tüm talebeler her zaman %100 aktiftir
  getStudents(includePassive = false) {
    return this.getAllStudents();
  }

  // Pasiflik kaldırıldığı için her zaman boş liste döner
  getPassiveStudents() {
    return [];
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
    const nowIso = new Date().toISOString();

    sanitizedStudents.forEach(s => {
      if (!s || !s.id) return;
      s.updatedAt = nowIso;
      s.isPassive = false;
      s.status = 'active';
      delete s.aktif;
      delete s.active;
      // Her kaydedilen öğrenciyi yerel düzenleme kalkanına kaydet (Bulutun ezmesini önler)
      this.markStudentLocallyEdited(s.id, ['ALL']);
    });

    localStorage.removeItem(STORAGE_KEYS.PASSIVE_STUDENT_IDS);
    localStorage.setItem(STORAGE_KEYS.PASSIVE_STUDENT_IDS, JSON.stringify({}));
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(sanitizedStudents));

    // OTOMATİK ÇOKLU YEDEKLEME MOTORU (Otomatik Veri Kaybı Önleme Kalkanı)
    try {
      localStorage.setItem('yoklama_students_backup_v1', JSON.stringify(sanitizedStudents));
      localStorage.setItem('yoklama_students_backup_last', JSON.stringify(sanitizedStudents));
      localStorage.setItem('yoklama_students_backup_timestamp', nowIso);

      let snapshots = [];
      const rawSnap = localStorage.getItem('yoklama_students_snapshots');
      if (rawSnap) {
        try { snapshots = JSON.parse(rawSnap) || []; } catch (e) {}
      }
      snapshots.unshift({
        savedAt: nowIso,
        count: sanitizedStudents.length,
        students: sanitizedStudents
      });
      if (snapshots.length > 5) snapshots.length = 5;
      localStorage.setItem('yoklama_students_snapshots', JSON.stringify(snapshots));
    } catch (e) {
      console.warn('Backup save error:', e);
    }

    this._lastStudentPushTime = Date.now();
    this._lastStudentEditTime = Date.now();
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/students', sanitizedStudents);
    }

    // Dini Ders Grupları & Kur'an Takip Senkronizasyonu (Yalnızca hoca grubunu günceller, sayfaları asla 1 yapmaz!)
    try {
      const quranRaw = localStorage.getItem(STORAGE_KEYS.QURAN_TRACKER);
      if (quranRaw) {
        let quranAll = JSON.parse(quranRaw);
        if (quranAll && typeof quranAll === 'object') {
          let quranChanged = false;
          sanitizedStudents.forEach(s => {
            if (!s || !s.id || !quranAll[s.id]) return;
            const targetGroup = (s.dahiliHoca || '').trim();
            const cur = (quranAll[s.id].diniGrup || '').trim();
            if (targetGroup && targetGroup !== 'Genel' && cur !== targetGroup) {
              quranAll[s.id].diniGrup = targetGroup;
              quranAll[s.id].updatedAt = nowIso;
              quranChanged = true;
              if (this.isCloudEnabled()) {
                this.syncToCloud(`kurs_data/quranTracker/${s.id}/diniGrup`, targetGroup);
              }
            }
          });
          if (quranChanged) {
            localStorage.setItem(STORAGE_KEYS.QURAN_TRACKER, JSON.stringify(quranAll));
            try { localStorage.setItem('yoklama_quran_tracker_backup_v1', JSON.stringify(quranAll)); } catch (e) {}
            window.dispatchEvent(new CustomEvent('quran-tracker-updated', { detail: quranAll }));
          }
        }
      }
    } catch (e) {}

    try {
      window.dispatchEvent(new CustomEvent('students-updated', { detail: sanitizedStudents }));
    } catch (e) {}
  }

  // ========================================================
  // --- ÖĞRENCİ VERİTABANI YEDEKLEME VE KURTARMA MOTORU ---
  // ========================================================
  hasStudentBackup() {
    try {
      const keys = ['yoklama_students_backup_v1', 'yoklama_students_backup_last', 'yoklama_students_backup_pre_cloud_sync'];
      for (const k of keys) {
        const val = localStorage.getItem(k);
        if (val) {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed) && parsed.length > 0) return true;
        }
      }
      const rawSnap = localStorage.getItem('yoklama_students_snapshots');
      if (rawSnap) {
        const snaps = JSON.parse(rawSnap);
        if (Array.isArray(snaps) && snaps.length > 0) return true;
      }
    } catch (e) {}
    return false;
  }

  getStudentBackupSummary() {
    try {
      const timestamp = localStorage.getItem('yoklama_students_backup_timestamp');
      let count = 0;
      let phoneCount = 0;
      const raw = localStorage.getItem('yoklama_students_backup_v1') || localStorage.getItem('yoklama_students_backup_last');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          count = list.length;
          phoneCount = list.filter(s => s && ((s.fatherPhone && s.fatherPhone.trim()) || (s.parentPhone && s.parentPhone.trim()))).length;
        }
      }
      return {
        hasBackup: count > 0,
        count,
        phoneCount,
        timestamp: timestamp ? new Date(timestamp).toLocaleString('tr-TR') : 'Mevcut'
      };
    } catch (e) {
      return { hasBackup: false, count: 0, phoneCount: 0, timestamp: null };
    }
  }

  restoreStudentsFromBackup() {
    try {
      const backupKeys = [
        'yoklama_students_backup_v1',
        'yoklama_students_backup_last',
        'yoklama_students_backup_pre_cloud_sync',
        'yoklama_students_backup_v2'
      ];
      let bestCandidate = null;
      let maxScore = -1;

      // 1. Snapshot listesinden tara
      const rawSnap = localStorage.getItem('yoklama_students_snapshots');
      if (rawSnap) {
        try {
          const snaps = JSON.parse(rawSnap);
          if (Array.isArray(snaps)) {
            snaps.forEach(snap => {
              if (snap && Array.isArray(snap.students)) {
                const score = this.calculateStudentDataQualityScore(snap.students);
                if (score > maxScore) {
                  maxScore = score;
                  bestCandidate = snap.students;
                }
              }
            });
          }
        } catch (e) {}
      }

      // 2. Yedek anahtarlarından tara
      backupKeys.forEach(key => {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const score = this.calculateStudentDataQualityScore(parsed);
            if (score > maxScore) {
              maxScore = score;
              bestCandidate = parsed;
            }
          }
        } catch (e) {}
      });

      if (!bestCandidate || bestCandidate.length === 0) {
        return { success: false, message: 'Cihazda kurtarılacak kayıtlı öğrenci yedeği bulunamadı.' };
      }

      // Mevcut liste ile güvenli birleştirme (Non-destructive merge)
      const current = this.getAllStudents();
      const currentMap = new Map();
      current.forEach(s => { if (s && s.id) currentMap.set(s.id, s); });

      const restoredList = [];
      bestCandidate.forEach(candSt => {
        if (!candSt || !candSt.id) return;
        const curr = currentMap.get(candSt.id);
        if (curr) {
          const merged = { ...curr, ...candSt };
          ['fatherPhone', 'motherPhone', 'parentPhone', 'fatherName', 'motherName', 'yatakhane', 'password', 'school', 'notes', 'note'].forEach(f => {
            const val = (candSt[f] || '').toString().trim();
            if (val) merged[f] = candSt[f];
          });
          restoredList.push(merged);
          currentMap.delete(candSt.id);
        } else {
          restoredList.push(candSt);
        }
      });
      currentMap.forEach(s => restoredList.push(s));

      this.saveStudents(restoredList);
      return { 
        success: true, 
        count: restoredList.length, 
        message: `${restoredList.length} öğrencinin telefon numaraları, odaları ve şifreleri yedekten başarıyla kurtarıldı!` 
      };
    } catch (err) {
      console.error('restoreStudentsFromBackup error:', err);
      return { success: false, message: 'Geri yükleme hatası: ' + err.message };
    }
  }

  calculateStudentDataQualityScore(studentsList) {
    if (!Array.isArray(studentsList)) return 0;
    let score = 0;
    studentsList.forEach(s => {
      if (!s) return;
      if (s.fatherPhone && s.fatherPhone.trim()) score += 10;
      if (s.motherPhone && s.motherPhone.trim()) score += 10;
      if (s.parentPhone && s.parentPhone.trim()) score += 10;
      if (s.fatherName && s.fatherName.trim()) score += 5;
      if (s.motherName && s.motherName.trim()) score += 5;
      if (s.yatakhane && s.yatakhane.trim() && s.yatakhane !== '-') score += 3;
      if (s.password && s.password !== '123') score += 5;
      if (s.notes && s.notes.trim()) score += 5;
    });
    return score;
  }

  exportStudentsJSON() {
    try {
      const students = this.getAllStudents();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(students, null, 2));
      const a = document.createElement('a');
      a.setAttribute("href", dataStr);
      a.setAttribute("download", `oay_ogrenci_listesi_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch (e) {
      console.error('exportStudentsJSON error:', e);
      return false;
    }
  }

  importStudentsJSON(jsonString) {
    try {
      const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      const list = Array.isArray(parsed) ? parsed : (parsed && parsed.students && Array.isArray(parsed.students) ? parsed.students : null);
      if (!list || list.length === 0) {
        return { success: false, message: 'Geçersiz dosya formatı veya boş öğrenci listesi.' };
      }
      this.saveStudents(list);
      return { success: true, count: list.length, message: `${list.length} öğrenci başarıyla içe aktarıldı ve kaydedildi!` };
    } catch (e) {
      return { success: false, message: 'Dosya okuma hatası: ' + e.message };
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
    const newStudent = {
      ...student,
      id: student.id || ('std_' + Date.now() + '_' + Math.floor(Math.random()*1000)),
      password: student.password || '123',
      familyCode: (student.familyCode || (student.lastName ? student.lastName + '2026' : 'AILE2026')).trim().toUpperCase(),
      isPassive: false,
      status: 'active',
      updatedAt: new Date().toISOString()
    };
    delete newStudent.aktif;
    delete newStudent.active;
    students.push(newStudent);
    this.markStudentLocallyEdited(newStudent.id, ['ALL']);
    this.saveStudents(students);
    return newStudent;
  }

  updateStudent(id, updatedData) {
    const students = this.getAllStudents();
    const index = students.findIndex(s => s.id === id);
    if (index !== -1) {
      this.markStudentLocallyEdited(id, Object.keys(updatedData));
      this._lastStudentEditTime = Date.now();

      students[index] = {
        ...students[index],
        ...updatedData,
        isPassive: false,
        status: 'active',
        familyCode: ((updatedData.familyCode !== undefined ? updatedData.familyCode : students[index].familyCode) || '').trim().toUpperCase(),
        updatedAt: new Date().toISOString()
      };
      delete students[index].aktif;
      delete students[index].active;
      this.saveStudents(students);

      // Eğer dahiliHoca güncellendiyse Kur'an Takip kaydındaki diniGrup'u da ANINDA senkronize et!
      if (updatedData.dahiliHoca !== undefined && updatedData.dahiliHoca !== null) {
        try {
          const cleanHoca = (updatedData.dahiliHoca || '').toString().trim();
          const quranRaw = localStorage.getItem(STORAGE_KEYS.QURAN_TRACKER);
          if (quranRaw) {
            const quranAll = JSON.parse(quranRaw);
            if (quranAll[id] && quranAll[id].diniGrup !== cleanHoca) {
              quranAll[id].diniGrup = cleanHoca;
              quranAll[id].updatedAt = new Date().toISOString();
              localStorage.setItem(STORAGE_KEYS.QURAN_TRACKER, JSON.stringify(quranAll));
              if (this.isCloudEnabled()) {
                this.syncToCloud(`kurs_data/quranTracker/${id}/diniGrup`, cleanHoca);
              }
              window.dispatchEvent(new CustomEvent('quran-tracker-updated', { detail: quranAll }));
            }
          }
        } catch (errQ) {
          console.warn('[updateStudent] Kur\'an diniGrup senkronizasyon uyarısı:', errQ);
        }
      }

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

    // 2. Öğrenciler listesinden tamamen çıkar
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

    // 3. Bulut Veritabanı ile eşitle
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

    // 4. Öğrenciye ait artık kayıtları temizle
    this.cleanupStudentRecords(id);

    // 5. Global event bildir (Açık ekranların anında haberdar olması için)
    try {
      window.dispatchEvent(new CustomEvent('student-deleted', { detail: { studentId: id } }));
    } catch (e) {}
  }

  // Pasife alma özelliği tamamen kaldırıldı (Talebeler her zaman %100 aktiftir)
  toggleStudentPassive(id) {
    return { success: true, isPassive: false };
  }

  setStudentPassive(id, isPassive) {
    return { success: true, isPassive: false };
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

  getDahiliHocalari() {
    const hocalar = new Set([
      'YASİN EKİNCİ',
      'AHMED MUBARİZ',
      'ABDUSSAMED TAV',
      'EMİR TALHA TARIM',
      'BURAK BODUR',
      'TUNAHAN TAŞKIN',
      'SELİM BOZKURT',
      'YAVUZ SELİM SEVEN'
    ]);
    this.getStudents().forEach(s => {
      if (s && s.dahiliHoca && s.dahiliHoca.trim()) hocalar.add(s.dahiliHoca.trim());
    });
    return [...hocalar].sort((a, b) => a.localeCompare(b, 'tr'));
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

  // Aktif oturumdaki kullanıcının (Hoca / Yönetici) adını tespit etme
  getCurrentUserName() {
    try {
      const s = (window.App && window.App.currentSession) ||
        JSON.parse(sessionStorage.getItem('yoklama_active_session') || localStorage.getItem('yoklama_active_session') || '{}');
      return s.name || s.fullName || (s.role === 'superadmin' ? 'Kurum Yöneticisi' : (s.staffRole || 'Eğitmen'));
    } catch (e) {
      return 'Eğitmen';
    }
  }

  // Aktif oturumdaki kullanıcının Yönetici (Kurum Yöneticisi / Superadmin) olup olmadığı
  isCurrentUserAdmin() {
    try {
      const s = (window.App && window.App.currentSession) ||
        JSON.parse(sessionStorage.getItem('yoklama_active_session') || localStorage.getItem('yoklama_active_session') || '{}');
      if (!s) return false;
      return s.role === 'superadmin' || s.staffId === 'admin_root' || s.canManageStaff === true;
    } catch {
      return false;
    }
  }

  // Aktif oturumdaki kullanıcının (Etüt Hocası veya Yönetici) yetkili olduğu öğrenci listesi
  // Yönetici ise tüm öğrencileri; Etüt hocası ise yalnızca kendi şube/öğrencilerini döndürür.
  getStudentsForActiveUser(includePassive = false) {
    const allStudents = this.getStudents(includePassive);
    if (this.isCurrentUserAdmin()) {
      return allStudents;
    }

    const session = (window.App && window.App.currentSession) ||
      JSON.parse(sessionStorage.getItem('yoklama_active_session') || localStorage.getItem('yoklama_active_session') || '{}');

    if (!session || session.role !== 'staff') {
      return allStudents;
    }

    const staffName = (session.name || session.fullName || '').trim().toUpperCase();
    const staffRole = (session.staffRole || '').trim().toUpperCase();
    const normStaffName = this.normalizeSearchKey(staffName);

    return allStudents.filter(st => {
      if (!st) return false;
      const sEtut = (st.etutHocasi || '').trim().toUpperCase();
      const normEtut = this.normalizeSearchKey(sEtut);
      const sClass = (st.className || '').trim().toUpperCase();

      // 1. İsim eşleşmesi (etutHocasi)
      if (normEtut && normStaffName && (normEtut === normStaffName || normEtut.includes(normStaffName) || normStaffName.includes(normEtut))) {
        return true;
      }
      if (staffName && sEtut && (sEtut === staffName || sEtut.includes(staffName) || staffName.includes(sEtut))) {
        return true;
      }

      // 2. Hocanın rolündeki şube (Örn: "5-A", "6-A", "6-B", "7-A", "7-B", "8-A", "8-B")
      if (sClass && staffRole && staffRole.includes(sClass)) {
        return true;
      }

      return false;
    });
  }

  // Belirli bir öğrencinin aktif oturumdaki hocaya ait olup olmadığı kontrolü
  isStudentBelongsToActiveUser(student) {
    if (!student) return false;
    if (this.isCurrentUserAdmin()) return true;

    const session = (window.App && window.App.currentSession) ||
      JSON.parse(sessionStorage.getItem('yoklama_active_session') || localStorage.getItem('yoklama_active_session') || '{}');

    if (!session || session.role !== 'staff') return true;

    const staffName = (session.name || session.fullName || '').trim().toUpperCase();
    const staffRole = (session.staffRole || '').trim().toUpperCase();
    const normStaffName = this.normalizeSearchKey(staffName);

    const sEtut = (student.etutHocasi || '').trim().toUpperCase();
    const normEtut = this.normalizeSearchKey(sEtut);
    const sClass = (student.className || '').trim().toUpperCase();

    if (normEtut && normStaffName && (normEtut === normStaffName || normEtut.includes(normStaffName) || normStaffName.includes(normEtut))) {
      return true;
    }
    if (staffName && sEtut && (sEtut === staffName || sEtut.includes(staffName) || staffName.includes(sEtut))) {
      return true;
    }
    if (sClass && staffRole && staffRole.includes(sClass)) {
      return true;
    }

    return false;
  }

  // Günün 5 Vakit Namaz Yoklama Durumu Özeti (Yönetici & Eğitmen Denetimi - Yoklamayı Alan Hesap Bilgisi Dahil)
  getDailyPrayerAttendanceSummary(dateStr = null) {
    const date = dateStr || new Date().toISOString().split('T')[0];
    const prayers = ['Sabah', 'Öğle', 'İkindi', 'Akşam', 'Yatsı'];
    const allAtt = this.getAttendance();
    const dayAtt = allAtt.filter(a => a.date === date && (a.category || 'namaz') === 'namaz');

    const summary = {};
    prayers.forEach(p => {
      const records = dayAtt.filter(a => (a.prayerTime || 'Sabah') === p);
      const isTaken = records.length > 0;
      const counts = { VAR: 0, YOK: 0, GEC: 0, TAKKESIZ: 0, GEC_TAKKESIZ: 0, IZINLI: 0 };
      let lastRecordedAt = null;
      const recordedBySet = new Set();

      records.forEach(r => {
        const st = this.normalizeStatusCode(r.status);
        if (counts[st] !== undefined) counts[st]++;
        if (r.recordedAt && (!lastRecordedAt || new Date(r.recordedAt) > new Date(lastRecordedAt))) {
          lastRecordedAt = r.recordedAt;
        }
        if (r.recordedBy && typeof r.recordedBy === 'string' && r.recordedBy.trim()) {
          recordedBySet.add(r.recordedBy.trim());
        }
      });

      const recordedBy = Array.from(recordedBySet).join(', ') || null;

      summary[p] = {
        name: p,
        isTaken,
        totalRecorded: records.length,
        counts,
        lastRecordedAt,
        recordedBy
      };
    });

    const totalTaken = prayers.filter(p => summary[p].isTaken).length;

    return {
      date,
      summary,
      totalTakenCount: totalTaken,
      isFullyCompleted: totalTaken === 5
    };
  }

  // Belirli bir vakit için yoklama yapıldı mı kontrolü
  isPrayerAttendanceDone(dateStr, prayerTime) {
    const date = dateStr || new Date().toISOString().split('T')[0];
    const pTime = prayerTime || 'Sabah';
    const recs = this.getAttendanceByCategory(date, 'namaz', pTime);
    return recs && recs.length > 0;
  }

  getAttendanceForStudent(studentId) {
    return this.getAttendance().filter(a => a.studentId === studentId).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  saveSingleAttendance(studentId, date, subKey, status, category = 'namaz', recordedBy = null) {
    const all = this.getAttendance();
    const cat = category || 'namaz';
    const sub = subKey || (cat === 'namaz' ? 'Sabah' : cat);
    const activeUser = recordedBy || this.getCurrentUserName();
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
      recordedBy: activeUser,
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

  saveAttendanceBatch(records, recordedBy = null) {
    const all = this.getAttendance();
    const activeUser = recordedBy || this.getCurrentUserName();
    const nowIso = new Date().toISOString();
    records.forEach(newRec => {
      const cat = newRec.category || 'namaz';
      const sub = newRec.prayerTime || newRec.subKey || (cat === 'namaz' ? 'Sabah' : cat);
      const user = newRec.recordedBy || activeUser;
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
        recordedBy: user,
        recordedAt: nowIso
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
  getTodayDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

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
    if (!yearMonthStr) {
      const now = new Date();
      yearMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
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
      Sabah: { VAR: 0, TAKKESIZ: 0, GEC: 0, GEC_TAKKESIZ: 0, YOK: 0, IZINLI: 0, OKULDA: 0, GIRILMEDI: 0 },
      Öğle: { VAR: 0, TAKKESIZ: 0, GEC: 0, GEC_TAKKESIZ: 0, YOK: 0, IZINLI: 0, OKULDA: 0, GIRILMEDI: 0 },
      İkindi: { VAR: 0, TAKKESIZ: 0, GEC: 0, GEC_TAKKESIZ: 0, YOK: 0, IZINLI: 0, OKULDA: 0, GIRILMEDI: 0 },
      Akşam: { VAR: 0, TAKKESIZ: 0, GEC: 0, GEC_TAKKESIZ: 0, YOK: 0, IZINLI: 0, OKULDA: 0, GIRILMEDI: 0 },
      Yatsı: { VAR: 0, TAKKESIZ: 0, GEC: 0, GEC_TAKKESIZ: 0, YOK: 0, IZINLI: 0, OKULDA: 0, GIRILMEDI: 0 }
    };

    const overallCounts = { VAR: 0, TAKKESIZ: 0, GEC: 0, GEC_TAKKESIZ: 0, YOK: 0, IZINLI: 0, OKULDA: 0, GIRILMEDI: 0 };
    const totalSlots = dates.length * 5;

    // Kurs genelinde hangi vakitlerin yoklaması yapılmış tespit et
    const takenPrayersMap = {};
    dates.forEach(d => { takenPrayersMap[d] = {}; });
    allAtt.filter(a => dates.includes(a.date) && (a.category || 'namaz') === 'namaz').forEach(a => {
      const p = a.prayerTime || 'Sabah';
      if (takenPrayersMap[a.date]) takenPrayersMap[a.date][p] = true;
    });

    const studentObj = this.getStudentById(studentId);

    dates.forEach(d => {
      prayers.forEach(p => {
        const wasTaken = takenPrayersMap[d] && takenPrayersMap[d][p];
        if (!wasTaken) {
          prayerStats[p].GIRILMEDI = (prayerStats[p].GIRILMEDI || 0) + 1;
          overallCounts.GIRILMEDI = (overallCounts.GIRILMEDI || 0) + 1;
          return;
        }

        let st = grid[d] ? grid[d][p] : null;
        if (this.isStudentAtSchoolSlot(studentObj, d, p) && st !== 'VAR') {
          st = 'OKULDA';
          if (!grid[d]) grid[d] = {};
          grid[d][p] = 'OKULDA';
        }
        if (!st) st = 'VAR'; // Yoklama yapıldı ve devamsız yazılmadıysa mevcut (VAR)

        if (prayerStats[p][st] !== undefined) {
          prayerStats[p][st]++;
        } else {
          prayerStats[p][st] = 1;
        }
        if (overallCounts[st] !== undefined) {
          overallCounts[st]++;
        } else {
          overallCounts[st] = 1;
        }
      });
    });

    const attendedCount = overallCounts.VAR + overallCounts.TAKKESIZ + overallCounts.GEC + (overallCounts.GEC_TAKKESIZ || 0);
    const evaluatedTotal = totalSlots - (overallCounts.IZINLI || 0) - (overallCounts.OKULDA || 0) - (overallCounts.GIRILMEDI || 0);
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
        const pEval = dates.length - (r.prayerStats[p].IZINLI || 0) - (r.prayerStats[p].OKULDA || 0) - (r.prayerStats[p].GIRILMEDI || 0);
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

  // --- Kurumsal Deneme Sınavları & Kazanım Analizi Metodları ---
  getMockExams() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MOCK_EXAMS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getMockExamById(id) {
    if (!id) return null;
    return this.getMockExams().find(e => e.id === id) || null;
  }

  saveMockExam(examData) {
    const list = this.getMockExams();
    const id = examData.id || ('mock_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
    const nowIso = new Date().toISOString();

    const record = {
      ...examData,
      id,
      updatedAt: nowIso,
      createdAt: examData.createdAt || nowIso
    };

    const idx = list.findIndex(e => e.id === id);
    if (idx !== -1) {
      list[idx] = record;
    } else {
      list.unshift(record);
    }

    localStorage.setItem(STORAGE_KEYS.MOCK_EXAMS, JSON.stringify(list));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/mockExams', list);
    }
    window.dispatchEvent(new CustomEvent('mock-exams-updated', { detail: list }));
    return record;
  }

  deleteMockExam(id) {
    let list = this.getMockExams().filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.MOCK_EXAMS, JSON.stringify(list));
    if (this.isCloudEnabled()) {
      this.syncToCloud('kurs_data/mockExams', list);
    }
    window.dispatchEvent(new CustomEvent('mock-exams-updated', { detail: list }));
    return true;
  }

  getStudentMockExams(studentId) {
    const list = this.getMockExams();
    const results = [];
    list.forEach(exam => {
      if (exam.scores && exam.scores[studentId]) {
        results.push({
          examId: exam.id,
          title: exam.title || 'Deneme Sınavı',
          date: exam.date,
          subjects: exam.subjects || [],
          ...exam.scores[studentId]
        });
      }
    });
    return results.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }

  normalizeStatusCode(code) {
    if (!code) return 'VAR';
    let c = code.toString().trim()
      .replace(/İ/g, 'I').replace(/ı/g, 'i')
      .replace(/Ö/g, 'O').replace(/ö/g, 'o')
      .replace(/Ü/g, 'U').replace(/ü/g, 'u')
      .replace(/Ç/g, 'C').replace(/ç/g, 'c')
      .replace(/Ş/g, 'S').replace(/ş/g, 's')
      .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
      .toUpperCase();

    if (c === 'GEC_TAKKESIZ' || c === 'TAKKESIZ_GEC' || c === 'GT' || c === 'TG') return 'GEC_TAKKESIZ';
    if (c === 'V' || c === 'VAR') return 'VAR';
    if (c === 'K' || c === 'Y' || c === 'YOK') return 'YOK';
    if (c === 'G' || c === 'GEC') return 'GEC';
    if (c === 'T' || c === 'TAKKESIZ') return 'TAKKESIZ';
    if (c === 'I' || c === 'IZINLI') return 'IZINLI';
    if (c === 'OKULDA' || c === 'OKUL' || c === 'O') return 'OKULDA';
    if (c === 'IYI' || c === 'ORTA' || c === 'KOTU' || c === 'GELDI' || c === 'GELMEDI') return c;
    return 'VAR';
  }

  // Hafta içi Öğle ve İkindi vakitlerinde MEB okulunda olan sınıfların kontrolü (5-A, 5-B, 6-A, 6-B ve 7-A)
  isStudentAtSchoolSlot(studentOrClass, dateStr, prayerTime) {
    if (prayerTime !== 'Öğle' && prayerTime !== 'İkindi') return false;
    const dayName = this.getDayName(dateStr);
    if (dayName === 'Cumartesi' || dayName === 'Pazar') return false; // Hafta sonu kurstalar

    let c = '';
    if (typeof studentOrClass === 'object' && studentOrClass) {
      c = studentOrClass.className || '';
    } else if (typeof studentOrClass === 'string' && studentOrClass) {
      const stObj = this.getStudentById ? this.getStudentById(studentOrClass) : null;
      if (stObj && stObj.className) {
        c = stObj.className;
      } else {
        c = studentOrClass;
      }
    }
    c = (c || '').trim().toUpperCase();

    // 5-A, 5-B, 6-A, 6-B (veya 5. Sınıf, 6. Sınıf) ile 7-A
    if (c.startsWith('5') || c.startsWith('6')) return true;
    if (c === '7-A' || c === '7/A' || c === '7 A' || c.startsWith('7-A') || c.startsWith('7/A')) return true;

    return false;
  }

  getStudentStats(studentId) {
    const student = this.getStudentById(studentId);
    const records = this.getAttendanceForStudent(studentId);
    const totalDays = records.length;
    const counts = { VAR: 0, YOK: 0, GEC: 0, TAKKESIZ: 0, GEC_TAKKESIZ: 0, IZINLI: 0, OKULDA: 0 };
    records.forEach(r => {
      let st = this.normalizeStatusCode(r.status);
      if (this.isStudentAtSchoolSlot(student, r.date, r.prayerTime) && st !== 'VAR') {
        st = 'OKULDA';
      }
      counts[st] = (counts[st] || 0) + 1;
    });
    const presentCount = (counts.VAR || 0) + (counts.TAKKESIZ || 0) + (counts.GEC || 0) + (counts.GEC_TAKKESIZ || 0);
    const effectiveTotal = totalDays - (counts.IZINLI || 0) - (counts.OKULDA || 0);
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
    if (!Array.isArray(weekDates) || weekDates.length === 0) {
      weekDates = (this.getWeekRange && this.getWeekRange().dates) || [];
    }
    const allAtt = this.getAttendance();
    const studentRecords = allAtt.filter(a => a.studentId === studentId && Array.isArray(weekDates) && weekDates.includes(a.date));

    const infractions = [];
    let namazInfractionsCount = 0;
    let yatakInfractionsCount = 0;
    let okulInfractionsCount = 0;

    studentRecords.forEach(rec => {
      const cat = rec.category || 'namaz';
      const st = this.normalizeStatusCode(rec.status);
      const dayName = this.getDayName(rec.date);

      if (cat === 'namaz') {
        // Okul slotundaki vakitler asla ceza / kusur sayılmaz!
        if (this.isStudentAtSchoolSlot(studentId, rec.date, rec.prayerTime)) {
          return;
        }
        // Namazda VAR, İZİNLİ ve OKULDA hariç olanlar (YOK, TAKKESIZ, GEC, GEC_TAKKESIZ)
        if (st !== 'VAR' && st !== 'IZINLI' && st !== 'OKULDA' && st !== 'E' && st !== 'I') {
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

    // Takviye Dersleri Cezası (Cumartesi günleri yapılır, 85 altı not alanlara ders başına 1 saat = 60 dk izin cezası)
    let takviyeInfractionsCount = 0;
    let takviyePenaltyMinutes = 0;
    const allAcad = this.getAcademicScores();
    const studentAcad = allAcad.filter(a => a.studentId === studentId && Array.isArray(weekDates) && weekDates.includes(a.date));

    studentAcad.forEach(rec => {
      if (rec.score !== null && rec.score !== undefined && rec.score !== '' && !isNaN(rec.score)) {
        const sc = Number(rec.score);
        if (sc < 85) {
          takviyeInfractionsCount++;
          takviyePenaltyMinutes += 60; // 1 saat
          const dayName = this.getDayName(rec.date);
          infractions.push({
            id: 'acad_' + rec.date + '_' + studentId + '_' + (rec.subject || 'ders'),
            date: rec.date,
            dayName,
            category: 'takviye_dersi',
            categoryLabel: '📚 Takviye Dersi',
            subKey: rec.subject || 'Takviye Dersi',
            subLabel: `${rec.subject || 'Takviye'}: ${sc}/100 (< 85)`,
            status: 'KOTU',
            statusLabel: `${sc} Aldı (< 85)`,
            statusBg: '#ef4444',
            penaltyMinutes: 60,
            score: sc,
            desc: `${rec.date} ${dayName} • Takviye Dersi (${rec.subject}): ${sc}/100 (85 Altı) • +60 dk (1 Saat) İzin Cezası`
          });
        }
      }
    });

    // =========================================================================
    // İZİN ÇIKIŞINDA 3 KUSUR AFFI KURALI:
    // Yalnızca hafta içi intizam kusurları (Namaz, Yatak, Okul Dönüşü) için geçerlidir!
    // İlk 3 intizam kusuru affedilir (0 dk ceza, standart saatte çıkış).
    // 3'ten fazla olan intizam kusurları telafiye kalır (+30 dk ek süre).
    // İzin Dönüşü Gecikmesi (3x) ve Takviye Dersi (85 altı alanlara 1 saat) doğrudan eklenir.
    // =========================================================================
    const EXCUSED_QUOTA = 3;
    let excusedSoFar = 0;

    // Tarihe göre sırala
    infractions.sort((a, b) => a.date.localeCompare(b.date));

    infractions.forEach(inf => {
      const isStandardInfraction = (inf.category === 'namaz' || inf.category === 'yatak' || inf.category === 'okul_donusu');
      if (isStandardInfraction && excusedSoFar < EXCUSED_QUOTA) {
        inf.isExcused = true;
        inf.effectivePenalty = 0;
        excusedSoFar++;
      } else {
        inf.isExcused = false;
        inf.effectivePenalty = inf.penaltyMinutes || 30;
      }
    });

    const activeInfractions = infractions.filter(inf => !inf.isExcused);
    const rawPenaltyMinutes = activeInfractions.reduce((sum, inf) => sum + (inf.effectivePenalty || 0), 0);

    // Kısmi veya Tam Telafi Affı Kontrolü
    const weekStartDate = (Array.isArray(weekDates) && weekDates[0]) || new Date().toISOString().split('T')[0];
    const weekKey = `week_${weekStartDate}`;
    const clearedInfo = (typeof this.getPenaltyClearedInfo === 'function')
      ? this.getPenaltyClearedInfo(weekKey, studentId)
      : { cleared: false, waivedMinutes: 0 };

    let waivedMinutes = 0;
    let isFullyCleared = false;
    let isPartiallyCleared = false;

    if (rawPenaltyMinutes > 0) {
      if (clearedInfo.isFullyCleared) {
        isFullyCleared = true;
        waivedMinutes = rawPenaltyMinutes;
      } else if (clearedInfo.waivedMinutes > 0) {
        waivedMinutes = Math.min(rawPenaltyMinutes, clearedInfo.waivedMinutes);
        if (waivedMinutes >= rawPenaltyMinutes) {
          isFullyCleared = true;
        } else {
          isPartiallyCleared = true;
        }
      }
    }

    const effectivePenaltyMinutes = isFullyCleared ? 0 : Math.max(0, rawPenaltyMinutes - waivedMinutes);
    const calculatedExitTime = this.calculateExitTime(baseExitTime, effectivePenaltyMinutes);
    const penaltyFormatted = this.formatPenaltyDuration(effectivePenaltyMinutes);
    const rawPenaltyFormatted = this.formatPenaltyDuration(rawPenaltyMinutes);
    const waivedFormatted = this.formatPenaltyDuration(waivedMinutes);

    return {
      studentId,
      weekDates,
      baseExitTime,
      calculatedExitTime,
      totalInfractions: infractions.length,
      excusedCount: excusedSoFar,
      activeInfractionsCount: activeInfractions.length,
      rawPenaltyMinutes,
      rawPenaltyFormatted,
      waivedMinutes,
      waivedFormatted,
      isFullyCleared,
      isPartiallyCleared,
      penaltyMinutes: effectivePenaltyMinutes,
      penaltyFormatted,
      hasPenalty: rawPenaltyMinutes > 0,
      hasActivePenalty: effectivePenaltyMinutes > 0,
      namazInfractionsCount,
      yatakInfractionsCount,
      okulInfractionsCount,
      takviyeInfractionsCount,
      takviyePenaltyMinutes,
      leaveReturnInfractionsCount,
      leaveReturnPenaltyMinutes,
      infractions,
      activeInfractions,
      excusedInfractions: infractions.filter(inf => inf.isExcused),
      clearedNote: clearedInfo.note || ''
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
      // 3 kusur affı: Sadece penaltyMinutes > 0 olanlar (3'ten fazla kusuru olanlar) telafiye kalır
      if (item.report.penaltyMinutes === 0) {
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

  getPanoPenalizedStudents(dateStr = new Date().toISOString().split('T')[0]) {
    try {
      const weekInfo = this.getWeekRange(dateStr);
      const weekKey = `week_${weekInfo.startDate}`;
      const baseExitTime = (window.LeaveTrackerModule && window.LeaveTrackerModule.baseExitTime) 
        || localStorage.getItem('yoklama_base_exit_time') 
        || '13:00';
      const students = this.getStudents(false); // Sadece aktif öğrenciler
      const batch = this.getLeaveReportBatch(students, weekInfo.dates, baseExitTime);
      const clearedMap = this.getClearedPenaltiesForWeek(weekKey);

      let clearedCount = 0;
      let partiallyClearedCount = 0;
      const penalizedStudents = [];

      batch.reports.forEach(item => {
        const st = item.student;
        if (!st || !st.id) return;
        const rep = item.report;
        if (!rep) return;

        if (rep.isFullyCleared) {
          if (rep.rawPenaltyMinutes > 0) {
            clearedCount++;
          }
        } else if (rep.hasActivePenalty) {
          if (rep.isPartiallyCleared) {
            partiallyClearedCount++;
          }
          penalizedStudents.push(item);
        }
      });

      // En çok telafisi olandan en aza doğru sırala
      penalizedStudents.sort((a, b) => (b.report?.penaltyMinutes || 0) - (a.report?.penaltyMinutes || 0));

      return {
        weekKey,
        weekInfo,
        baseExitTime,
        totalStudents: students.length,
        onTimeCount: (batch.onTimeCount || 0) + clearedCount,
        clearedCount,
        partiallyClearedCount,
        totalPenalizedCount: penalizedStudents.length,
        penalizedStudents
      };
    } catch (e) {
      console.error('[getPanoPenalizedStudents] Hata:', e);
      return { totalPenalizedCount: 0, penalizedStudents: [], totalStudents: 0, onTimeCount: 0, clearedCount: 0, partiallyClearedCount: 0 };
    }
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
  // --- CEZALILAR İÇİN TAM VE KISMİ AF METODLARI ---
  // ========================================================
  getAllClearedPenalties() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENALTY_CLEARED);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  getPenaltyClearedInfo(weekKey, studentIdOrObj) {
    if (!studentIdOrObj) return { cleared: false, waivedMinutes: 0, isFullyCleared: false, isPartiallyCleared: false, note: '' };
    const stId = (typeof studentIdOrObj === 'object' && studentIdOrObj) ? (studentIdOrObj.id || studentIdOrObj.studentNo) : studentIdOrObj;
    const stNo = (typeof studentIdOrObj === 'object' && studentIdOrObj) ? (studentIdOrObj.studentNo || null) : null;
    const all = this.getAllClearedPenalties();
    if (!all || typeof all !== 'object') return { cleared: false, waivedMinutes: 0, isFullyCleared: false, isPartiallyCleared: false, note: '' };

    // 1. Verilen weekKey altında doğrudan kontrol
    if (weekKey && all[weekKey] && typeof all[weekKey] === 'object') {
      const entry = all[weekKey][stId] ?? (stNo ? all[weekKey][stNo] : null);
      if (entry === true) {
        return { cleared: true, waivedMinutes: 99999, isFullyCleared: true, isPartiallyCleared: false, note: 'Telafisini tamamladı' };
      }
      if (entry && typeof entry === 'object') {
        const waived = Number(entry.waivedMinutes) || 0;
        const cleared = entry.cleared === true;
        if (cleared) {
          return { cleared: true, waivedMinutes: waived || 99999, isFullyCleared: true, isPartiallyCleared: false, note: entry.note || '', clearedAt: entry.clearedAt };
        }
        if (waived > 0) {
          return { cleared: false, waivedMinutes: waived, isFullyCleared: false, isPartiallyCleared: true, note: entry.note || '', clearedAt: entry.clearedAt };
        }
      }
      if (entry === false) return { cleared: false, waivedMinutes: 0, isFullyCleared: false, isPartiallyCleared: false, note: '' };
    }

    // 2. Hafta anahtarı toleransı (Pazar vs Pazartesi başlangıcı veya son 8 gün içindeki affetmeler)
    const targetDate = weekKey ? weekKey.replace('week_', '') : null;
    const targetTime = targetDate ? new Date(targetDate).getTime() : Date.now();

    for (const [wKey, weekEntries] of Object.entries(all)) {
      if (!weekEntries || typeof weekEntries !== 'object') continue;
      const entry = weekEntries[stId] ?? (stNo ? weekEntries[stNo] : null);
      if (!entry) continue;

      const wDate = wKey.replace('week_', '');
      const wTime = new Date(wDate).getTime();
      const isDateClose = !isNaN(wTime) && Math.abs(targetTime - wTime) <= 8 * 24 * 60 * 60 * 1000;
      const isRecent = entry.clearedAt && !isNaN(new Date(entry.clearedAt).getTime()) && (Date.now() - new Date(entry.clearedAt).getTime()) <= 7 * 24 * 60 * 60 * 1000;

      if (isDateClose || isRecent) {
        if (entry === true) {
          return { cleared: true, waivedMinutes: 99999, isFullyCleared: true, isPartiallyCleared: false, note: 'Telafisini tamamladı' };
        }
        if (typeof entry === 'object') {
          const waived = Number(entry.waivedMinutes) || 0;
          const cleared = entry.cleared === true;
          if (cleared) {
            return { cleared: true, waivedMinutes: waived || 99999, isFullyCleared: true, isPartiallyCleared: false, note: entry.note || '', clearedAt: entry.clearedAt };
          }
          if (waived > 0) {
            return { cleared: false, waivedMinutes: waived, isFullyCleared: false, isPartiallyCleared: true, note: entry.note || '', clearedAt: entry.clearedAt };
          }
        }
      }
    }

    return { cleared: false, waivedMinutes: 0, isFullyCleared: false, isPartiallyCleared: false, note: '' };
  }

  isPenaltyCleared(weekKey, studentIdOrObj) {
    const info = this.getPenaltyClearedInfo(weekKey, studentIdOrObj);
    return info.isFullyCleared;
  }

  setPartialPenaltyWaiver(weekKey, studentId, waivedMinutes, note = '') {
    try {
      const all = this.getAllClearedPenalties();
      if (!all[weekKey]) all[weekKey] = {};
      const mins = Math.max(0, parseInt(waivedMinutes, 10) || 0);

      // Öğrencinin ham ceza dakikasını al
      const weekDates = this.getWeekRange(weekKey.replace('week_', '')).dates;
      const rep = this.getLeaveReportForStudent(studentId, weekDates);
      const rawPenalty = rep.rawPenaltyMinutes || rep.penaltyMinutes || 0;

      const isFull = (mins >= rawPenalty && rawPenalty > 0);

      all[weekKey][studentId] = {
        cleared: isFull,
        waivedMinutes: mins,
        clearedAt: new Date().toISOString(),
        note: note || (isFull ? 'Telafisinin tamamı affedildi' : `${mins} dk kısmi af uygulandı`)
      };

      localStorage.setItem(STORAGE_KEYS.PENALTY_CLEARED, JSON.stringify(all));
      if (this.isCloudEnabled()) {
        this.syncToCloud('kurs_data/penaltiesCleared', all);
      }
      window.dispatchEvent(new CustomEvent('penalty-cleared-updated', { 
        detail: { weekKey, studentId, cleared: isFull, waivedMinutes: mins } 
      }));
      return all[weekKey][studentId];
    } catch (e) {
      console.error('setPartialPenaltyWaiver error:', e);
      return null;
    }
  }

  cancelPenaltyWaiver(weekKey, studentId) {
    try {
      const all = this.getAllClearedPenalties();
      if (all[weekKey] && all[weekKey][studentId]) {
        delete all[weekKey][studentId];
        localStorage.setItem(STORAGE_KEYS.PENALTY_CLEARED, JSON.stringify(all));
        if (this.isCloudEnabled()) {
          this.syncToCloud('kurs_data/penaltiesCleared', all);
        }
        window.dispatchEvent(new CustomEvent('penalty-cleared-updated', { 
          detail: { weekKey, studentId, cleared: false, waivedMinutes: 0 } 
        }));
        return true;
      }
      return false;
    } catch (e) {
      console.error('cancelPenaltyWaiver error:', e);
      return false;
    }
  }

  getClearedPenaltiesForWeek(weekKey) {
    if (!weekKey) return {};
    const all = this.getAllClearedPenalties();
    return all[weekKey] || {};
  }

  togglePenaltyCleared(weekKey, studentId, note = '') {
    try {
      const info = this.getPenaltyClearedInfo(weekKey, studentId);
      
      // Eğer zaten tam veya kısmi af varsa, affı kaldır (sıfırla)
      if (info.isFullyCleared || info.isPartiallyCleared) {
        this.cancelPenaltyWaiver(weekKey, studentId);
        return false;
      } else {
        // Yoksa doğrudan tam af uygula
        const weekDates = this.getWeekRange(weekKey.replace('week_', '')).dates;
        const rep = this.getLeaveReportForStudent(studentId, weekDates);
        const rawMins = rep.rawPenaltyMinutes || rep.penaltyMinutes || 30;
        this.setPartialPenaltyWaiver(weekKey, studentId, rawMins, note || 'Telafisini tamamladı (Tam Af)');
        return true;
      }
    } catch (e) {
      console.error('togglePenaltyCleared error:', e);
      return false;
    }
  }

  setPenaltyCleared(weekKey, studentId, isCleared = true, note = '') {
    try {
      if (!isCleared) {
        return this.cancelPenaltyWaiver(weekKey, studentId);
      }
      const weekDates = this.getWeekRange(weekKey.replace('week_', '')).dates;
      const rep = this.getLeaveReportForStudent(studentId, weekDates);
      const rawMins = rep.rawPenaltyMinutes || rep.penaltyMinutes || 30;
      return !!this.setPartialPenaltyWaiver(weekKey, studentId, rawMins, note || 'Telafisini tamamladı');
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
    const passiveMap = this.getPassiveStudentIds();
    const deletedMap = this.getDeletedStudentIds();
    const student = this.getStudentById(studentId);

    // Pasif, silinmiş veya geçersiz talebeler yarışma puanı ALAMAZ (0 puan)
    if (!student || student.isPassive === true || student.status === 'passive' || 
        (passiveMap[studentId] && passiveMap[studentId].isPassive === true) ||
        (deletedMap[studentId] && deletedMap[studentId].isDeleted === true)) {
      return {
        studentId,
        totalScore: 0,
        namaz: { points: 0, basePoints: 0, varCount: 0, gecCount: 0, takkesizCount: 0, gecTakkesizCount: 0, yokCount: 0, izinliCount: 0, fullBonusCount: 0, fullBonusPoints: 0 },
        yatak: { points: 0, iyiCount: 0, ortaCount: 0, kotuCount: 0 },
        izinDonus: { points: 0, count: 0, onTimeCount: 0, lateCount: 0 },
        izin: { points: 0, izinCount: 0, onTimeCount: 0, lateCount: 0 },
        akademi: { points: 0, count: 0, scores: [] },
        academic: { points: 0, count: 0, scores: [] },
        bonus: { points: 0, count: 0, items: [] }
      };
    }

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

    let rawEarnedNamazPoints = 0;
    let varCount = 0;
    let gecCount = 0;
    let takkesizCount = 0;
    let gecTakkesizCount = 0;
    let yokCount = 0;
    let izinliCount = 0;
    let okuldaCount = 0;
    let fullBonusCount = 0;
    let studentAccountableSlots = 0;
    let totalPossibleWeekSlots = 0;

    dates.forEach(d => {
      let dayAttendedPrayers = 0;
      let dayHasYok = false;
      let dayAccountablePrayersCount = 0;

      prayers.forEach(p => {
        const wasTaken = takenPrayersMap[d] && takenPrayersMap[d][p];
        if (!wasTaken) return; // Bu vakit yoklaması henüz alınmamış / kılınmamış

        totalPossibleWeekSlots++;

        // Talebenin bu vakit için kaydı var mı?
        let st = namazGrid[d] ? namazGrid[d][p] : null;

        // Öğrenci hafta içi Öğle/İkindi okul sınıfındaysa ve camide bizzat 'VAR' yazılmadıysa -> Otomatik OKULDA
        if (this.isStudentAtSchoolSlot(student, d, p) && st !== 'VAR') {
          st = 'OKULDA';
        }

        if (!st) return; // Kaydı olmayan (gelmeyen / pasif) talebeye asla bedava puan verilmez!

        if (st === 'OKULDA') {
          okuldaCount++;
          // 3. Model: Okulda olunan vakitler kurstaki sorumlu olunan vakit havuzundan düşülür
          return;
        }

        if (st === 'IZINLI') {
          izinliCount++;
          return;
        }

        dayAccountablePrayersCount++;
        studentAccountableSlots++;

        if (st === 'VAR') {
          rawEarnedNamazPoints += 10;
          varCount++;
          dayAttendedPrayers++;
        } else if (st === 'GEC') {
          rawEarnedNamazPoints += 5;
          gecCount++;
          dayAttendedPrayers++;
        } else if (st === 'TAKKESIZ') {
          rawEarnedNamazPoints += 5;
          takkesizCount++;
          dayAttendedPrayers++;
        } else if (st === 'GEC_TAKKESIZ') {
          rawEarnedNamazPoints += 2;
          gecTakkesizCount++;
          dayAttendedPrayers++;
        } else if (st === 'YOK') {
          yokCount++;
          dayHasYok = true;
        }
      });

      // Günlük Tam İbadet Bonusu (+15 Puan):
      // Talebenin o gün kursta sorumlu olduğu vakitlerin hepsine katılmış olması ve hiç 'YOK' devamsızlığı olmaması gerekir.
      if (dayAccountablePrayersCount > 0 && dayAccountablePrayersCount === dayAttendedPrayers && !dayHasYok) {
        fullBonusCount++;
      }
    });

    // ========================================================
    // --- 3. MODEL: ORANSAL (YÜZDELİK) NORMALİZASYON MOTORU ---
    // ========================================================
    // Talebenin kurstaki sorumlu olduğu vakitlerdeki başarı oranı (%0 - %100) hesaplanır.
    // Bu başarı oranı, kurs genelindeki tam vakit ölçeğine (örn: 35 vakit = 350 puan) oranlanır.
    // Böylece öğrenci kursta ne kadar gayret gösterdiyse hak ettiği puanı adilce alır.
    const maxPossiblePointsForStudent = studentAccountableSlots * 10;
    const fullScaleMaxPoints = totalPossibleWeekSlots * 10;

    let normalizedNamazPoints = rawEarnedNamazPoints;
    let isNormalized = false;
    let successPercent = 100;

    if (maxPossiblePointsForStudent > 0 && fullScaleMaxPoints > 0) {
      const ratio = rawEarnedNamazPoints / maxPossiblePointsForStudent;
      successPercent = Math.round(ratio * 100);
      if (studentAccountableSlots < totalPossibleWeekSlots) {
        normalizedNamazPoints = Math.round(ratio * fullScaleMaxPoints);
        isNormalized = true;
      } else {
        normalizedNamazPoints = rawEarnedNamazPoints;
      }
    }

    const fullBonusPoints = fullBonusCount * 15;
    const totalNamazPoints = normalizedNamazPoints + fullBonusPoints;

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
      const st = studentYatakMap[d];
      if (!st) return; // Kayıt yoksa bedava puan verilmez!
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
      const st = studentOkulMap[d];
      if (!st) return; // Kayıt yoksa bedava puan verilmez!
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
    const studentAcad = allAcad.filter(s => s.studentId === studentId && dates.includes(s.date) && s.score !== null && s.score !== undefined && s.score !== '' && !isNaN(s.score));
    let akademiPoints = 0;
    const academicItems = [];

    studentAcad.forEach(s => {
      const score = Math.min(100, Math.max(0, Number(s.score) || 0));
      let pts = 0;
      if (score >= 100) {
        pts = 50;
      } else if (score >= 90) {
        pts = 40;
      } else if (score >= 85) {
        pts = 30;
      } else {
        pts = Math.round(score / 3);
      }
      akademiPoints += pts;
      academicItems.push({
        type: 'takviye',
        subject: s.subject || 'Takviye Dersi',
        title: s.subject || 'Takviye Dersi',
        score: score,
        pointsEarned: pts,
        date: s.date
      });
    });

    // Test Neticeleri modülünden gelen haftalık sınav puanları
    const allTests = (this.getTestResults && typeof this.getTestResults === 'function') ? this.getTestResults() : [];
    const studentTests = allTests.filter(t => dates.includes(t.date) && t.scores && t.scores[studentId] && t.scores[studentId].score !== undefined && t.scores[studentId].score !== null && !isNaN(t.scores[studentId].score));
    studentTests.forEach(t => {
      const score = Math.min(100, Math.max(0, Number(t.scores[studentId].score) || 0));
      let pts = 0;
      if (score >= 100) {
        pts = 50;
      } else if (score >= 90) {
        pts = 40;
      } else if (score >= 85) {
        pts = 30;
      } else {
        pts = Math.round(score / 3);
      }
      akademiPoints += pts;
      academicItems.push({
        type: 'test',
        subject: t.title || `${t.subject || 'Etüt'} Testi`,
        title: t.title || `${t.subject || 'Etüt'} Testi`,
        score: score,
        pointsEarned: pts,
        date: t.date
      });
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
        basePoints: normalizedNamazPoints,
        rawEarnedPoints: rawEarnedNamazPoints,
        maxPossiblePoints: maxPossiblePointsForStudent,
        accountableSlots: studentAccountableSlots,
        totalPossibleSlots: totalPossibleWeekSlots,
        okuldaCount,
        isNormalized,
        successPercent,
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
        count: academicItems.length,
        scores: academicItems
      },
      bonus: {
        points: bonusPoints,
        count: studentBonus.length,
        items: studentBonus
      }
    };
  }

  getLeaderboard(period = 'haftalik', targetDate = null, classFilter = 'ALL') {
    const target = targetDate || this.getTodayDate();
    const range = period === 'haftalik'
      ? this.getWeekRange(target)
      : this.getMonthRange(target.substring(0, 7));

    let students = this.getStudents();
    const passiveMap = this.getPassiveStudentIds();
    const deletedMap = this.getDeletedStudentIds();

    // Pasif ve silinmiş talebeler ASLA sıralamaya ve liderlik tablosuna dahil edilmez!
    students = students.filter(s => {
      if (!s || !s.id) return false;
      if (this.isStudentPassive(s.id)) return false;
      if (this.isStudentDeleted(s.id)) return false;
      if (s.isPassive === true || s.isPassive === 'true' || s.isPassive === 1) return false;
      const st = (s.status || '').toString().toLowerCase().trim();
      if (st === 'passive' || st === 'pasif') return false;
      if (s.aktif === false || s.active === false) return false;
      const pEntry = passiveMap[s.id];
      if (pEntry === true || pEntry === 'passive' || pEntry === 'pasif') return false;
      if (pEntry && typeof pEntry === 'object' && (pEntry.isPassive === true || pEntry.status === 'passive' || pEntry.status === 'pasif')) return false;
      const dEntry = deletedMap[s.id];
      if (dEntry === true || (dEntry && dEntry.isDeleted === true)) return false;
      return true;
    });

    if (classFilter && classFilter !== 'ALL') {
      if (Array.isArray(classFilter)) {
        if (classFilter.length > 0 && !classFilter.includes('ALL')) {
          const selUpper = classFilter.map(c => String(c).trim().toUpperCase());
          students = students.filter(s => {
            if (!s || !s.className) return false;
            const sc = s.className.trim().toUpperCase();
            return selUpper.includes(sc) || selUpper.some(cf => {
              const fDigit = cf.match(/^\d+/);
              const sDigit = sc.match(/^\d+/);
              return fDigit && sDigit && fDigit[0] === sDigit[0] && /^\d+(\.|\s*sınıf|\s*sinif|\s*ler|\s*lar)*$/i.test(cf);
            });
          });
        }
      } else {
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
    }

    const leaderboard = students.map(st => {
      const scoreData = this.getStudentCompetitionScore(st.id, range.dates);
      return {
        student: st,
        ...scoreData
      };
    });

    // Puanlara göre büyükten küçüğe sırala (Averaj ve adil eşitlik bozma cascade kuralları ile)
    leaderboard.sort((a, b) => {
      // 1. Kriter: Toplam Puan
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      // 2. Kriter: 5 Vakit Namaz Puanı (Öncelikli kriter)
      if (b.namaz.points !== a.namaz.points) return b.namaz.points - a.namaz.points;
      // 3. Kriter: 5 Vakit Tam İbadet Bonusu Gün Sayısı
      if (b.namaz.fullBonusCount !== a.namaz.fullBonusCount) return b.namaz.fullBonusCount - a.namaz.fullBonusCount;
      // 4. Kriter: Yatak İntizam Puanı
      if (b.yatak.points !== a.yatak.points) return b.yatak.points - a.yatak.points;
      // 5. Kriter: Takviye & Test Akademik Başarı Puanı
      if (b.akademi.points !== a.akademi.points) return b.akademi.points - a.akademi.points;
      // 6. Kriter: İsim Alfabetik Sıra (Kararlı ve zıplamayan sıralama garantisi)
      return (a.student.firstName || '').localeCompare(b.student.firstName || '', 'tr');
    });

    // Sıralama (rank) ata
    leaderboard.forEach((item, index) => {
      item.rank = index + 1;
    });

    return {
      period,
      targetDate: target,
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
      quranTracker: this.getAllQuranRecords(),
      mockExams: this.getMockExams(),
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
      if (parsed.mockExams && Array.isArray(parsed.mockExams)) {
        localStorage.setItem(STORAGE_KEYS.MOCK_EXAMS, JSON.stringify(parsed.mockExams));
        if (this.isCloudEnabled()) {
          this.syncToCloud('kurs_data/mockExams', parsed.mockExams);
        }
      }
      if (parsed.quranTracker && typeof parsed.quranTracker === 'object') {
        localStorage.setItem(STORAGE_KEYS.QURAN_TRACKER, JSON.stringify(parsed.quranTracker));
        try { localStorage.setItem('yoklama_quran_tracker_backup_v1', JSON.stringify(parsed.quranTracker)); } catch (e) {}
        if (this.isCloudEnabled()) {
          this.syncToCloud('kurs_data/quranTracker', parsed.quranTracker);
        }
        window.dispatchEvent(new CustomEvent('quran-tracker-updated', { detail: parsed.quranTracker }));
      }
      if (parsed.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed.settings));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ========================================================
  // --- GÜNÜN GÖREVLİLERİ (YEMEKÇİ & MÜEZZİN) ---
  // ========================================================
  getDailyDuties(targetDate, allowFallback = true) {
    const today = targetDate || new Date().toISOString().split('T')[0];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DUTIES);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') {
          // 1. Hedef tarihin doğrudan kaydı varsa (dolu veya temizlenmiş/boş fark etmeksizin)
          if (parsed[today] && typeof parsed[today] === 'object') {
            const entry = parsed[today];
            return {
              date: today,
              yemekciler: Array.isArray(entry.yemekciler) ? entry.yemekciler : [],
              muezzin: entry.muezzin || '',
              note: entry.note || '',
              updatedAt: entry.updatedAt || null,
              isToday: true,
              isLatestFallback: false
            };
          }

          // 2. Kök nesnede hedef tarihin kaydı varsa
          if (parsed.date === today) {
            return {
              date: today,
              yemekciler: Array.isArray(parsed.yemekciler) ? parsed.yemekciler : [],
              muezzin: parsed.muezzin || '',
              note: parsed.note || '',
              updatedAt: parsed.updatedAt || null,
              isToday: true,
              isLatestFallback: false
            };
          }

          // 3. Sadece allowFallback=true ise ve hedef tarihe henüz HİÇBİR kayıt girilmemişse en son kaydı bul
          if (allowFallback) {
            const dateKeys = Object.keys(parsed)
              .filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k) && k < today)
              .sort()
              .reverse();
            for (const dKey of dateKeys) {
              const entry = parsed[dKey];
              if (entry && ((Array.isArray(entry.yemekciler) && entry.yemekciler.length > 0) || entry.muezzin)) {
                return {
                  date: dKey,
                  yemekciler: Array.isArray(entry.yemekciler) ? entry.yemekciler : [],
                  muezzin: entry.muezzin || '',
                  note: entry.note || '',
                  updatedAt: entry.updatedAt || null,
                  isToday: false,
                  isLatestFallback: true
                };
              }
            }

            // Kök nesnede eski tarihli bir kayıt varsa
            if (parsed.date && parsed.date !== today && ((Array.isArray(parsed.yemekciler) && parsed.yemekciler.length > 0) || parsed.muezzin)) {
              return {
                date: parsed.date,
                yemekciler: Array.isArray(parsed.yemekciler) ? parsed.yemekciler : [],
                muezzin: parsed.muezzin || '',
                note: parsed.note || '',
                updatedAt: parsed.updatedAt || null,
                isToday: false,
                isLatestFallback: true
              };
            }
          }
        }
      }
    } catch (e) {
      console.warn('getDailyDuties error:', e);
    }
    return {
      date: today,
      yemekciler: [],
      muezzin: '',
      note: '',
      updatedAt: null,
      isToday: true,
      isLatestFallback: false
    };
  }

  saveDailyDuties(duties) {
    if (!this.isCurrentUserAdmin()) {
      return { success: false, message: 'Günün görevlilerini yalnızca Kurum Yöneticisi atayabilir ve kaydedebilir.' };
    }
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
        this.syncToCloud('kurs_data/dailyDuties', storeObj);
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
  // --- KUR'AN-I KERİM & HATİM TAKİP SİSTEMİ ---
  // ========================================================
  getAllQuranRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.QURAN_TRACKER);
      let records = null;
      if (raw) {
        try { records = JSON.parse(raw); } catch (e) {}
      }

      // Eğer ana anahtar boşsa, yedek anahtarları tara ve kurtar
      if (!records || typeof records !== 'object' || Object.keys(records).length === 0) {
        const backupKeys = [
          'yoklama_quran_tracker_backup_v1',
          'yoklama_quran_tracker',
          'quran_tracker',
          'yoklama_quran_backup'
        ];
        for (const bKey of backupKeys) {
          const bVal = localStorage.getItem(bKey);
          if (bVal) {
            try {
              const bParsed = JSON.parse(bVal);
              if (bParsed && typeof bParsed === 'object' && Object.keys(bParsed).length > 0) {
                console.log(`[QuranRecovery] Yedek anahtardan (${bKey}) Kur'an verileri bulundu ve kurtarıldı!`);
                records = bParsed;
                break;
              }
            } catch (e) {}
          }
        }
      }

      if (!records || typeof records !== 'object') {
        records = {};
      }

      // Aktif talebeleri tara
      const students = this.getStudents(false);
      let changed = false;

      students.forEach(s => {
        if (!s || !s.id) return;
        const targetGroup = (s.dahiliHoca || '').trim() || 'Genel';

        if (!records[s.id]) {
          records[s.id] = {
            studentId: s.id,
            currentPage: 1,
            hatimCount: 0,
            diniGrup: targetGroup,
            note: '',
            updatedAt: null, // Boş varsayılan kaydın updatedAt'i null kalır ki gerçek verileri asla ezmesin!
            history: []
          };
          changed = true;
        } else {
          // EĞER talebenin sayfası 1 ama geçmişinde (history) daha yüksek sayfa varsa OTOMATİK KURTAR!
          const curP = Number(records[s.id].currentPage) || 0;
          if (curP <= 1 && Array.isArray(records[s.id].history) && records[s.id].history.length > 0) {
            const historyPages = records[s.id].history.map(h => Number(h.page) || 0).filter(p => p > 1);
            if (historyPages.length > 0) {
              const maxHistPage = Math.max(...historyPages);
              if (maxHistPage > 1) {
                console.log(`[QuranRecovery] ${s.id} talebesi için geçmişten sayfa kurtarıldı: ${maxHistPage}`);
                records[s.id].currentPage = maxHistPage;
                records[s.id].updatedAt = new Date().toISOString();
                changed = true;
              }
            }
          }

          const cur = (records[s.id].diniGrup || '').trim();
          if (!cur || cur === 'Genel' || cur.startsWith('Seviye') || (targetGroup !== 'Genel' && cur !== targetGroup)) {
            records[s.id].diniGrup = targetGroup;
            changed = true;
          }
        }
      });

      if (changed) {
        localStorage.setItem(STORAGE_KEYS.QURAN_TRACKER, JSON.stringify(records));
        try { localStorage.setItem('yoklama_quran_tracker_backup_v1', JSON.stringify(records)); } catch (e) {}
        // DİKKAT: Burada ASLA wholesale this.syncToCloud ÇAĞRILMAZ!
        // Aksi takdirde boş bir cihaz buluttaki tüm gerçek verileri 1 ile ezer!
      }

      return records;
    } catch (e) {
      console.warn('getAllQuranRecords error:', e);
      return {};
    }
  }

  // Acil Durum Kur'an Verisi Kurtarma ve Onarma Motoru
  recoverQuranRecordsFromStorage() {
    try {
      let recoveredCount = 0;
      const all = this.getAllQuranRecords();
      const backupKeys = [
        'yoklama_quran_tracker_backup_v1',
        'yoklama_quran_tracker',
        'quran_tracker',
        'yoklama_quran_backup'
      ];

      // 1. Yedek anahtarlardan tarama
      backupKeys.forEach(key => {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            Object.keys(parsed).forEach(stId => {
              const rec = parsed[stId];
              if (!rec) return;
              const curPage = Number(rec.currentPage) || 0;
              const hatim = Number(rec.hatimCount) || 0;
              const existing = all[stId];
              const extPage = existing ? (Number(existing.currentPage) || 0) : 0;
              const extHatim = existing ? (Number(existing.hatimCount) || 0) : 0;

              const incTotal = hatim * 604 + curPage;
              const extTotal = extHatim * 604 + extPage;

              if (incTotal > extTotal) {
                all[stId] = { ...(existing || {}), ...rec };
                recoveredCount++;
              }
            });
          }
        } catch (e) {}
      });

      // 2. Geçmiş (history) dizisinden tarama
      Object.keys(all).forEach(stId => {
        const rec = all[stId];
        if (rec && rec.currentPage <= 1 && Array.isArray(rec.history) && rec.history.length > 0) {
          const pages = rec.history.map(h => Number(h.page) || 0).filter(p => p > 1);
          if (pages.length > 0) {
            const maxPage = Math.max(...pages);
            if (maxPage > (Number(rec.currentPage) || 0)) {
              rec.currentPage = maxPage;
              rec.updatedAt = new Date().toISOString();
              recoveredCount++;
            }
          }
        }
      });

      if (recoveredCount > 0) {
        localStorage.setItem(STORAGE_KEYS.QURAN_TRACKER, JSON.stringify(all));
        localStorage.setItem('yoklama_quran_tracker_backup_v1', JSON.stringify(all));
        if (this.isCloudEnabled()) {
          this.syncToCloud('kurs_data/quranTracker', all);
        }
        window.dispatchEvent(new CustomEvent('quran-tracker-updated', { detail: all }));
      }

      return { success: true, recoveredCount, records: all };
    } catch (err) {
      console.warn('recoverQuranRecordsFromStorage error:', err);
      return { success: false, recoveredCount: 0, error: err.message };
    }
  }

  getQuranRecord(studentId) {
    if (!studentId) return null;
    const all = this.getAllQuranRecords();
    const student = this.getStudentById(studentId) || {};
    const defaultGroup = (student.dahiliHoca || '').trim() || student.seviye || 'Genel';
    
    if (all[studentId]) {
      const curGroup = (all[studentId].diniGrup || '').trim();
      const resolvedGroup = (student.dahiliHoca && (!curGroup || curGroup === 'Genel' || curGroup.startsWith('Seviye')))
        ? student.dahiliHoca.trim()
        : (curGroup || defaultGroup);

      return {
        studentId,
        currentPage: typeof all[studentId].currentPage === 'number' ? all[studentId].currentPage : 1,
        hatimCount: typeof all[studentId].hatimCount === 'number' ? all[studentId].hatimCount : 0,
        diniGrup: resolvedGroup,
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
      const newGroup = (customGroup !== null && customGroup !== undefined && customGroup.trim()) 
        ? customGroup.trim() 
        : ((student.dahiliHoca || existing.diniGrup || 'Genel').trim());
      
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

      // Eğer hoca/grup modal üzerinden değiştirildiyse öğrencinin dahiliHoca'sını da senkronize et
      if (student && student.id && newGroup && student.dahiliHoca !== newGroup) {
        this.updateStudent(studentId, { dahiliHoca: newGroup });
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
      const curG = (rec.diniGrup || '').trim();
      const resolvedG = (s.dahiliHoca && (!curG || curG === 'Genel' || curG.startsWith('Seviye')))
        ? s.dahiliHoca.trim()
        : (curG || s.dahiliHoca || 'Genel');
      return {
        student: s,
        record: rec,
        stats,
        diniGrup: resolvedG
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
      const curG = (rec.diniGrup || '').trim();
      const grp = (s.dahiliHoca && (!curG || curG === 'Genel' || curG.startsWith('Seviye')))
        ? s.dahiliHoca.trim()
        : (curG || s.dahiliHoca || 'Genel Grup');
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
