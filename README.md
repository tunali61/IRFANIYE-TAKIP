# Öğrenci Yoklama & Performans Takip Sistemi

Öğretmen ve okul/kurs personelinin öğrencilerin yoklamasını alabildiği, kılık-kıyafet ve namaz durumlarını özel kodlarla işaretleyebildiği, performans notlarını girebildiği; velilerin ise kendilerine ait **Aile Kodu** ile sadece kendi çocuklarını (kardeşler dahil) salt-okunur olarak görüntüleyebildiği modern bir web uygulamasıdır.

---

## 🚀 Hızlı Başlangıç

Harici hiçbir program veya kütüphane (Node.js, Python vb.) kurmanıza gerek yoktur!

1. **Doğrudan Açma:**  
   Klasör içindeki `index.html` dosyasına çift tıklayarak istediğiniz tarayıcıda (Google Chrome, Microsoft Edge, Firefox vb.) hemen açabilirsiniz.

2. **Yerel Ağda / WiFi Üzerinde Paylaşma:**  
   `start_app.ps1` dosyasına sağ tıklayıp **"PowerShell ile Çalıştır"** diyerek yerel bir sunucu başlatabilir, aynı WiFi ağına bağlı cep telefonları veya tabletlerden `http://[BILGISAYAR_IP_ADRESINIZ]:8080` adresiyle erişebilirsiniz.

---

## 👥 Roller ve Güvenlik

### 1. 🔒 Personel / Yönetici Modu (Tam Yetki)
- **Varsayılan PIN:** `1234` *(Ayarlar sekmesinden dilediğiniz zaman değiştirebilirsiniz)*
- **Yetkiler:**
  - Günlük yoklama alma ve güncelleme
  - Öğrenci ekleme, düzenleme, silme ve kardeş öğrenci tanımlama
  - Ders bazlı performans notları, puanları ve öğretmen görüşü girme
  - Veri yedekleme (JSON indir) ve geri yükleme

### 2. 👨‍👩‍👧 Veli Portalı (Salt-Okunur / Değişiklik Yapılamaz)
- Veliler (Anne ve Baba) kendilerine verilen **Ortak Aile Kodu** ile sisteme giriş yapar.
- **Kardeş Desteği:** Aynı aile koduna sahip olan tüm kardeşler üst sekmelerde listelenir. Veli tek tıkla çocuklar arasında geçiş yapabilir.
- **Görüntülenen Bilgiler:**
  - Günlük yoklama ve durum geçmişi (Hangi gün takkesiz, namazda yok, geç vb.)
  - Kursa devam yüzdesi ve 7 durumun sayısal istatistiği
  - Performans karnesi, yıldızlar, öğretmen geri bildirim notları ve başarı rozetleri
  - **Karne / Rapor Yazdır:** Veliler dilediklerinde temiz bir karne çıktısı veya PDF alabilirler.

---

## 🏷️ Özel Yoklama Durum Kodları ve Renkleri

| Kod | Durum | Renk | Açıklama |
|---|---|---|---|
| **V** | Var / Geldi | Yeşil | Kursta ve dersinde hazır bulundu |
| **T** | Takkesiz | Mor | Kursta mevcut fakat takkesi yok |
| **Y** | Namazda Yok | Koyu Kırmızı / Bordo | Kursta var fakat namaza katılmadı |
| **G** | Geç Kaldı | Sarı / Amber | Ders veya etüte geç geldi |
| **E** | Eşofmanlı | Mavi / İndigo | Kıyafet kuralına uymadı, eşofmanlı geldi |
| **K** | Kursta Yok | Kırmızı | Kursta yok / Tamamen devamsız |
| **İ** | İzinli / Raporlu | Turkuaz | Mazeretli / İzinli |

---

## 👨‍👩‍👧‍👦 Hazır Örnek Aile Kodları (Test İçin)

Uygulama ilk açıldığında doğrudan test edebilmeniz için zengin demo verilerle gelir:

- **`YILMAZ2026`**: Ahmet Yılmaz (8-A) ve Ali Yılmaz (5-B) — **2 Kardeş**
- **`DEMIR2026`**: Bilal Demir (7-A) ve Ömer Faruk Demir (6-A) — **2 Kardeş**
- **`CAN2026`**: Yusuf Can Kaya (8-A) — Tek Çocuk
- **`YILDIZ2026`**: Hamza Yıldız (5-B) — Tek Çocuk

---

## 💾 Veri Güvenliği ve Yedekleme

- Girilen tüm öğrenci kayıtları, yoklamalar ve performans değerlendirmeleri bilgisayarınızın tarayıcı hafızasında (LocalStorage) güvenle saklanır.
- **Ayarlar** sekmesinden tek tıkla **"Yedek Dosyası İndir (JSON)"** diyerek tüm sistemi yedekleyebilir; başka bir bilgisayara aktarmak istediğinizde **"Yedekten Geri Yükle"** butonunu kullanabilirsiniz.
