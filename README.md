# Vercel Demo Projesi 🚀

Bu basit bir static HTML sitesidir ve Vercel ile deploy edilebilir.

## Vercel Nedir?

Vercel, modern web uygulamalarını deploy etmek için bir cloud platformudur:
- ⚡ **Hızlı deployment**: Git push yaptığınızda otomatik deploy
- 🌍 **Global CDN**: Dünyanın her yerinden hızlı erişim
- 🔒 **Otomatik HTTPS**: SSL sertifikası otomatik
- 🎯 **Preview deployments**: Her branch için ayrı önizleme URL'i
- 🔄 **Instant rollback**: Eski versiyona anında geri dönüş

## Local Kullanım

### 1. Vercel CLI Kurulumu

İlk olarak Node.js kurulu olmalı. Sonra:

```bash
# Vercel CLI'yi global olarak yükle
npm install -g vercel

# veya
yarn global add vercel
```

### 2. Projeyi Local'de Çalıştırma

```bash
# Proje klasörüne git
cd ~/vercel-demo

# Vercel dev server'ı başlat (local development)
vercel dev

# Tarayıcınızda http://localhost:3000 açılacak
```

### 3. Vercel'e Deploy Etme

```bash
# İlk defa deploy ederken
vercel

# Sorulara cevap verin:
# - Set up and deploy? Yes
# - Which scope? (hesabınızı seçin)
# - Link to existing project? No
# - Project name? vercel-demo
# - In which directory is your code located? ./

# Production'a deploy
vercel --prod
```

## Node.js Olmadan Local Test

Eğer Node.js kurulu değilse, basit bir HTTP server ile test edebilirsiniz:

### Python ile (Python 3):
```bash
cd ~/vercel-demo
python3 -m http.server 8000

# http://localhost:8000 adresini tarayıcıda açın
```

### Python ile (Python 2):
```bash
cd ~/vercel-demo
python -m SimpleHTTPServer 8000
```

### PHP ile:
```bash
cd ~/vercel-demo
php -S localhost:8000
```

## Vercel CLI Komutları

```bash
# Login
vercel login

# Deploy (preview)
vercel

# Production deploy
vercel --prod

# Local development server
vercel dev

# Proje bilgilerini göster
vercel ls

# Logları göster
vercel logs

# Environment variables ayarla
vercel env add

# Projeyi sil
vercel remove
```

## Dosya Yapısı

```
vercel-demo/
├── index.html          # Ana sayfa
└── README.md          # Bu dosya
```

## Vercel ile Neler Deploy Edilebilir?

- ✅ Static HTML/CSS/JS siteleri (bu örnek gibi)
- ✅ Next.js uygulamaları
- ✅ React, Vue, Angular uygulamaları
- ✅ Svelte, Nuxt.js, Gatsby projeler
- ✅ Serverless Functions (API endpoints)

## Sonraki Adımlar

1. **Node.js Kurun**: [https://nodejs.org](https://nodejs.org)
2. **Vercel CLI Yükleyin**: `npm install -g vercel`
3. **Deploy Edin**: `vercel --prod`
4. **Vercel Dashboard**: [https://vercel.com/dashboard](https://vercel.com/dashboard)

## Faydalı Linkler

- 📚 [Vercel Docs](https://vercel.com/docs)
- 🎓 [Next.js Tutorial](https://nextjs.org/learn)
- 💬 [Vercel Community](https://github.com/vercel/vercel/discussions)

---

**Not**: Bu örnek proje production'a hazırdır ve Vercel'e deploy edilebilir!
