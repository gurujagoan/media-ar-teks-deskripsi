/*
 * Modul Generative AI.
 * Penyedia: Google Gemini (API key gratis dari aistudio.google.com) atau Pollinations.ai (sk_ key).
 * API key dimasukkan pengguna lewat tombol "⚙ GenAI" dan disimpan hanya di browser-nya.
 * Bila key kosong atau layanan gagal, modul jatuh ke evaluator/generator cadangan (offline)
 * agar alur belajar tidak terputus.
 */
(function () {
  var K = window.KONTEN;

  function parseJSON(s) {
    s = String(s || '').replace(/```json|```/g, '');
    var a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b <= a) throw new Error('Respons AI bukan JSON');
    return JSON.parse(s.slice(a, b + 1));
  }

  // Konfigurasi penyedia AI disimpan HANYA di browser pengguna (localStorage), tidak di repositori.
  function cfg() {
    try { return JSON.parse(localStorage.getItem('genai-cfg') || '{}'); } catch (e) { return {}; }
  }
  function simpanCfg(c) { try { localStorage.setItem('genai-cfg', JSON.stringify(c)); } catch (e) { } }
  function aktif() { var c = cfg(); return !!(c.key && c.provider); }

  async function chat(system, user, timeoutMs) {
    var c = cfg();
    if (!c.key) throw new Error('GenAI belum diaktifkan (API key kosong)');
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, (timeoutMs || 60000) + 30000);
    try {
      var r, d;
      if (c.provider === 'gemini') {
        // Bila model sedang penuh (503/429) atau tidak tersedia (404), coba model cadangan.
        var daftar = [c.model, 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']
          .filter(function (m, i, a) { return m && a.indexOf(m) === i; });
        var galat = '';
        for (var i = 0; i < daftar.length; i++) {
          for (var coba = 0; coba < 2; coba++) {
            r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(daftar[i]) + ':generateContent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': c.key },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: system }] },
                contents: [{ role: 'user', parts: [{ text: user }] }],
                generationConfig: { temperature: 0.8, responseMimeType: 'application/json' }
              }),
              signal: ctrl.signal
            });
            if (r.ok) {
              d = await r.json();
              return (d.candidates && d.candidates[0] && d.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('')) || '';
            }
            galat = 'Gemini HTTP ' + r.status + ' (' + daftar[i] + ')';
            if (r.status === 400 || r.status === 401 || r.status === 403) throw new Error(galat + ' – periksa API key');
            if (r.status === 404) break; // model tidak ada → langsung model berikutnya
            await new Promise(function (ok) { setTimeout(ok, 1200); });
          }
        }
        throw new Error(galat || 'Gemini tidak merespons');
      }
      // OpenAI-kompatibel: Pollinations (sk_ key) atau penyedia lain
      var url = c.provider === 'pollinations' ? 'https://gen.pollinations.ai/v1/chat/completions' : (c.url || '');
      r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.key },
        body: JSON.stringify({
          model: c.model || 'openai',
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
        }),
        signal: ctrl.signal
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      d = await r.json();
      return d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '';
    } finally { clearTimeout(t); }
  }

  async function uji() {
    var j = parseJSON(await chat('Balas HANYA JSON valid.', 'Kirim {"status":"siap","sapaan":"satu kalimat sapaan bahasa Indonesia"}', 30000));
    return j.sapaan || 'siap';
  }

  var FAKTA = Object.keys(K.hotspot).map(function (k) {
    return '- ' + K.hotspot[k].judul + ': ' + K.hotspot[k].fakta;
  }).join('\n');

  function clamp(n) { n = Math.round(Number(n)); return isNaN(n) ? 2 : Math.max(1, Math.min(4, n)); }
  function acak(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ---------------- 1. Penilai teks deskripsi ----------------
  async function nilaiDeskripsi(teks) {
    var sys = 'Anda dosen Bahasa Indonesia yang ramah dan teliti. Anda menilai teks deskripsi mahasiswa tentang rumah adat Melayu Pontianak yang baru mereka amati dalam media VR.\n' +
      'Fakta objek yang diamati:\n' + FAKTA + '\n\n' +
      'Nilai dengan rubrik skala 1-4 untuk empat aspek:\n' +
      '1. struktur: ada identifikasi/gambaran umum, deskripsi bagian, dan simpulan/kesan.\n' +
      '2. isi: rincian sesuai fakta objek, tidak keliru, cukup lengkap.\n' +
      '3. diksi: kata sifat, kata indrawi, kata konkret, majas yang tepat.\n' +
      '4. ejaan: ejaan dan kalimat efektif sesuai EYD V.\n' +
      'Balas HANYA dengan JSON valid tanpa teks lain, format:\n' +
      '{"struktur":n,"isi":n,"diksi":n,"ejaan":n,"kekuatan":"1-2 kalimat","saran":["saran 1","saran 2","saran 3"],"contohPerbaikan":"ambil satu kalimat lemah dari teks mahasiswa lalu tulis versi perbaikannya dengan format: Asli: ... -> Perbaikan: ...","pantun":"pantun nasihat Melayu 4 baris bersajak a-b-a-b yang menyemangati, baris dipisah \\n"}';
    try {
      var j = parseJSON(await chat(sys, 'Teks mahasiswa:\n"""' + teks + '"""'));
      var hasil = {
        sumber: 'GenAI',
        skor: { struktur: clamp(j.struktur), isi: clamp(j.isi), diksi: clamp(j.diksi), ejaan: clamp(j.ejaan) },
        kekuatan: String(j.kekuatan || ''),
        saran: Array.isArray(j.saran) ? j.saran.slice(0, 4).map(String) : [String(j.saran || '')],
        contohPerbaikan: String(j.contohPerbaikan || ''),
        pantun: String(j.pantun || acak(K.pantun))
      };
      return hasil;
    } catch (e) {
      console.warn('GenAI gagal, memakai penilai cadangan:', e);
      return nilaiOffline(teks);
    }
  }

  function nilaiOffline(teks) {
    var low = teks.toLowerCase();
    var kata = low.split(/\s+/).filter(Boolean);
    var par = teks.split(/\n\s*\n|\n/).filter(function (p) { return p.trim().length > 20; });
    var kalimat = teks.split(/[.!?]+/).filter(function (s) { return s.trim().length > 3; });
    var adaIdent = /(merupakan|adalah|ialah)/.test(low.slice(0, 250));
    var adaKesan = K.kataKesan.some(function (k) { return low.indexOf(k) >= 0; });
    var struktur = 1 + (adaIdent ? 1 : 0) + (adaKesan ? 1 : 0) + (par.length >= 3 ? 1 : 0);
    var bagian = ['tiang', 'tangga', 'serambi', 'saprah', 'jendela', 'pintu', 'atap', 'pucuk rebung', 'ornamen', 'dapur', 'selang', 'sungai', 'kapuas', 'belian', 'lisplang'];
    var nBagian = bagian.filter(function (b) { return low.indexOf(b) >= 0; }).length;
    var isi = nBagian >= 6 ? 4 : nBagian >= 4 ? 3 : nBagian >= 2 ? 2 : 1;
    var nSifat = K.kataSifat.filter(function (s) { return new RegExp('\\b' + s + '\\b').test(low); }).length;
    var majas = /(bagai|bak|laksana|seperti|bagaikan)/.test(low);
    var diksi = Math.min(4, 1 + (nSifat >= 3 ? 1 : 0) + (nSifat >= 6 ? 1 : 0) + (majas ? 1 : 0));
    var awalKapital = kalimat.filter(function (s) { return /^[A-Z"“]/.test(s.trim()); }).length / Math.max(1, kalimat.length);
    var ejaan = Math.min(4, 1 + (awalKapital > 0.9 ? 1 : 0) + (/[.!?]\s*$/.test(teks.trim()) ? 1 : 0) + (!/\s{2,}\S/.test(teks.replace(/\n/g, ' ')) && !/\b(yg|dgn|tdk|krn)\b/.test(low) ? 1 : 0));
    var saran = [];
    if (!adaIdent) saran.push('Awali dengan paragraf identifikasi, misalnya: "Rumah adat Melayu Pontianak merupakan ..."');
    if (!adaKesan) saran.push('Tutup dengan simpulan atau kesan pribadi, misalnya "Rumah ini mencerminkan ..."');
    if (nBagian < 5) saran.push('Tambahkan rincian bagian lain yang sudah Anda amati (misalnya serambi, ornamen pucuk rebung, atau dapur).');
    if (nSifat < 5) saran.push('Perkaya kata sifat dan kata indrawi (kokoh, lapang, curam, berkilau, berdesir).');
    if (!majas) saran.push('Coba gunakan satu majas perbandingan, misalnya "bagai", "laksana", atau "seperti".');
    if (kata.length < 80) saran.push('Teks masih pendek (' + kata.length + ' kata). Kembangkan menjadi 100–200 kata.');
    if (!saran.length) saran.push('Pertahankan! Coba variasikan awal kalimat agar tidak monoton.');
    return {
      sumber: 'Penilai cadangan (offline)',
      skor: { struktur: Math.min(4, struktur), isi: isi, diksi: diksi, ejaan: ejaan },
      kekuatan: 'Teks Anda menyebut ' + nBagian + ' bagian rumah dan memakai ' + nSifat + ' kata sifat/indrawi.',
      saran: saran.slice(0, 4),
      contohPerbaikan: 'Asli: "Rumahnya bagus." -> Perbaikan: "Rumah panggung itu tampak anggun dengan dinding kuning dan atap pelana yang curam menjulang."',
      pantun: acak(K.pantun)
    };
  }

  // ---------------- 2. Generator variasi latihan visual ----------------
  var PILIHAN = {
    dinding: ['kuning', 'hijau', 'putih', 'coklat'],
    atap: ['coklat', 'hijau', 'merah'],
    tangga: [3, 5, 7],
    jendela: [2, 4]
  };

  function validasiSpek(j) {
    function pilih(v, arr) { return arr.indexOf(v) >= 0 ? v : acak(arr); }
    return {
      dinding: pilih(String(j.dinding || '').toLowerCase(), PILIHAN.dinding),
      atap: pilih(String(j.atap || '').toLowerCase(), PILIHAN.atap),
      tangga: pilih(Number(j.tangga), PILIHAN.tangga),
      jendela: pilih(Number(j.jendela), PILIHAN.jendela),
      ornamen: j.ornamen === undefined ? Math.random() > 0.5 : !!j.ornamen,
      saprahan: j.saprahan === undefined ? Math.random() > 0.5 : !!j.saprahan,
      sampan: j.sampan === undefined ? Math.random() > 0.5 : !!j.sampan,
      meriam: j.meriam === undefined ? Math.random() > 0.5 : !!j.meriam,
      cerita: String(j.cerita || 'Sebuah rumah Melayu lain di tepian Kapuas menanti untuk Anda deskripsikan.')
    };
  }

  async function buatVariasi(sebelumnya) {
    var sys = 'Anda perancang latihan pengamatan untuk mata kuliah Bahasa Indonesia (menulis teks deskripsi). Buat SATU variasi rumah adat Melayu Pontianak yang akan digambar ulang dalam 3D, berbeda dari variasi sebelumnya.\n' +
      'Balas HANYA JSON valid: {"dinding":"kuning|hijau|putih|coklat","atap":"coklat|hijau|merah","tangga":3|5|7,"jendela":2|4,"ornamen":true|false,"saprahan":true|false,"sampan":true|false,"meriam":true|false,"cerita":"1-2 kalimat konteks suasana budaya Melayu Pontianak yang memancing rasa ingin tahu, misalnya menjelang Idulfitri, pesta pernikahan, atau sore di tepian Kapuas"}';
    try {
      var j = parseJSON(await chat(sys, 'Variasi sebelumnya: ' + JSON.stringify(sebelumnya || {}) + '. Buat variasi baru.', 45000));
      var s = validasiSpek(j); s.sumber = 'GenAI'; return s;
    } catch (e) {
      console.warn('GenAI gagal, variasi acak cadangan:', e);
      var s2 = validasiSpek({});
      s2.cerita = acak([
        'Menjelang Idulfitri, sebuah keluarga Melayu di tepian Kapuas bersiap menyambut tamu.',
        'Sore hari di Kampung Beting: angin sungai berembus dan sampan-sampan pulang dari pasar.',
        'Rumah ini sedang bersiap menggelar saprahan untuk pesta pernikahan kerabat.'
      ]);
      s2.sumber = 'Generator cadangan (offline)';
      return s2;
    }
  }

  function deskripsiSpek(s) {
    return 'dinding ' + s.dinding + ', atap ' + s.atap + ', ' + s.tangga + ' anak tangga, ' + s.jendela + ' jendela, ornamen pucuk rebung ' + (s.ornamen ? 'ada' : 'tidak ada') +
      ', saprahan ' + (s.saprahan ? 'ada' : 'tidak ada') + ', sampan ' + (s.sampan ? 'ada' : 'tidak ada') + ', meriam karbit ' + (s.meriam ? 'ada' : 'tidak ada');
  }

  async function cekPengamatan(spek, teks) {
    var sys = 'Anda dosen Bahasa Indonesia. Bandingkan deskripsi singkat mahasiswa dengan spesifikasi objek 3D yang sebenarnya, lalu beri umpan balik ketepatan pengamatan.\n' +
      'Spesifikasi sebenarnya: ' + deskripsiSpek(spek) + '.\n' +
      'Balas HANYA JSON valid: {"benar":["rincian yang tepat"],"keliru":["rincian yang salah beserta yang benar"],"terlewat":["rincian penting yang belum disebut"],"skor":0-100,"komentar":"1-2 kalimat umpan balik yang menyemangati dan memberi langkah perbaikan"}';
    try {
      var j = parseJSON(await chat(sys, 'Deskripsi mahasiswa:\n"""' + teks + '"""', 45000));
      return {
        sumber: 'GenAI',
        benar: [].concat(j.benar || []).map(String), keliru: [].concat(j.keliru || []).map(String),
        terlewat: [].concat(j.terlewat || []).map(String),
        skor: Math.max(0, Math.min(100, Math.round(Number(j.skor) || 0))), komentar: String(j.komentar || '')
      };
    } catch (e) {
      console.warn('GenAI gagal, pemeriksa cadangan:', e);
      return cekOffline(spek, teks);
    }
  }

  function cekOffline(s, teks) {
    var low = teks.toLowerCase().replace(/cokelat/g, 'coklat');
    var angka = { 3: 'tiga', 5: 'lima', 7: 'tujuh', 2: 'dua', 4: 'empat' };
    var benar = [], keliru = [], terlewat = [];
    function cekWarna(label, nilai, kunci) {
      var re = new RegExp(kunci + '[^.,;]{0,25}?(kuning|hijau|putih|coklat|merah)');
      var m = low.match(re);
      if (!m) terlewat.push('warna ' + label + ' (' + nilai + ')');
      else if (m[1] === nilai) benar.push('warna ' + label + ' ' + nilai);
      else keliru.push('warna ' + label + ': Anda menulis ' + m[1] + ', seharusnya ' + nilai);
    }
    cekWarna('dinding', s.dinding, 'dinding');
    cekWarna('atap', s.atap, 'atap');
    function cekJumlah(label, nilai, kunci) {
      var re = new RegExp('(\\d+|dua|tiga|empat|lima|enam|tujuh)\\s+(buah\\s+)?(anak\\s+)?' + kunci);
      var m = low.match(re);
      if (!m) terlewat.push('jumlah ' + label + ' (' + nilai + ')');
      else if (m[1] === String(nilai) || m[1] === angka[nilai]) benar.push(nilai + ' ' + label);
      else keliru.push('jumlah ' + label + ': Anda menulis ' + m[1] + ', seharusnya ' + nilai);
    }
    cekJumlah('anak tangga', s.tangga, 'tangga');
    cekJumlah('jendela', s.jendela, 'jendela');
    [['ornamen', /pucuk rebung|ornamen|ukiran/, 'ornamen pucuk rebung'], ['saprahan', /saprah/, 'saprahan di serambi'],
     ['sampan', /sampan|perahu/, 'sampan di sungai'], ['meriam', /meriam/, 'meriam karbit']].forEach(function (x) {
      var disebut = x[1].test(low);
      if (s[x[0]] && disebut) benar.push(x[2]);
      else if (s[x[0]] && !disebut) terlewat.push(x[2]);
      else if (!s[x[0]] && disebut && !/tidak|tanpa|belum/.test(low)) keliru.push(x[2] + ' sebenarnya tidak ada');
    });
    var total = benar.length + keliru.length + terlewat.length;
    var skor = Math.round(100 * benar.length / Math.max(1, total));
    return {
      sumber: 'Pemeriksa cadangan (offline)', benar: benar, keliru: keliru, terlewat: terlewat, skor: skor,
      komentar: skor >= 75 ? 'Pengamatan Anda teliti! Lengkapi rincian yang terlewat agar deskripsi makin hidup.' : 'Amati sekali lagi dari beberapa sudut pandang, lalu sebutkan warna, jumlah, dan benda di sekitar rumah secara rinci.'
    };
  }

  window.GenAI = {
    nilaiDeskripsi: nilaiDeskripsi, buatVariasi: buatVariasi, cekPengamatan: cekPengamatan, deskripsiSpek: deskripsiSpek,
    cfg: cfg, simpanCfg: simpanCfg, aktif: aktif, uji: uji
  };
})();
