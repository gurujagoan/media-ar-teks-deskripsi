/* Alur belajar: Sambutan → Bertandang (VR) → Struktur → Menulis + GenAI → Variasi GenAI → Tamat */
(function () {
  var K = window.KONTEN, R = window.RumahMelayu;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var isi = $('#isi'), kata = $('#kata-pemandu');
  var rig = $('#rig'), kamera = $('#kamera'), rumahEl = $('#rumah'), varEl = $('#variasi'), hsEl = $('#hotspots');
  var MIN_HOTSPOT = 6;

  var S = {
    tahap: 0, mulai: Date.now(), salam: false, aktif: null,
    terjawab: {}, catatan: [], strukturOK: false, teks: '', nilai: null, revisi: 0,
    variasi: null, hasilVariasi: [], ingat: ''
  };
  try { S.teks = localStorage.getItem('bertandang-teks') || ''; } catch (e) { }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function jumlahKata(t) { return (t.trim().match(/\S+/g) || []).length; }

  // ---------------- Pemandu (narator) + suara ----------------
  function pemandu(teks) {
    kata.textContent = teks;
    if (window.speechSynthesis) speechSynthesis.cancel();
  }
  $('#tombol-dengar').addEventListener('click', function () {
    if (!window.speechSynthesis) return alert('Peramban ini belum mendukung suara.');
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(kata.textContent);
    u.lang = 'id-ID'; u.rate = 0.95;
    var v = speechSynthesis.getVoices().filter(function (x) { return /^id|^ms/i.test(x.lang); })[0];
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  });

  // ---------------- Timer ----------------
  setInterval(function () {
    var d = Math.floor((Date.now() - S.mulai) / 1000);
    $('#timer').textContent = '⏱ ' + String(Math.floor(d / 60)).padStart(2, '0') + ':' + String(d % 60).padStart(2, '0');
  }, 1000);

  // ---------------- Kamera & sudut pandang ----------------
  var VP = {
    depan: { p: [0, 3.2, 15], r: [-6, 0, 0] },
    dekat: { p: [1.2, 1.7, 8.6], r: [-3, 6, 0] },
    samping: { p: [15, 3.2, -1], r: [-6, 90, 0] },
    belakang: { p: [-4, 3.2, -19], r: [-5, 192, 0] },
    atas: { p: [0, 15, 19], r: [-32, 0, 0] }
  };
  function resetLook() {
    var lc = kamera.components['look-controls'];
    if (lc && lc.pitchObject) { lc.pitchObject.rotation.x = 0; lc.yawObject.rotation.y = 0; }
    kamera.object3D.position.set(0, 0, 0);
  }
  function pandang(nama) {
    var v = VP[nama];
    rig.object3D.position.set(v.p[0], v.p[1], v.p[2]);
    rig.object3D.rotation.set(v.r[0] * Math.PI / 180, v.r[1] * Math.PI / 180, 0, 'YXZ');
    resetLook();
  }
  function lihatKe(target) {
    var cx = target[0], cz = target[2] + 2;
    var dx = cx, dz = cz, L = Math.hypot(dx, dz);
    if (L < 0.5) { dx = 0; dz = 1; L = 1; }
    var jarak = target[1] > 5 ? 9 : 5.5;
    var P = [target[0] + dx / L * jarak, Math.max(1.6, target[1] + 0.6), target[2] + dz / L * jarak];
    var yaw = Math.atan2(P[0] - target[0], P[2] - target[2]);
    var pitch = Math.atan2(target[1] - P[1], Math.hypot(P[0] - target[0], P[2] - target[2]));
    rig.object3D.position.set(P[0], P[1], P[2]);
    rig.object3D.rotation.set(pitch, yaw, 0, 'YXZ');
    resetLook();
  }
  document.querySelectorAll('[data-vp]').forEach(function (b) {
    b.addEventListener('click', function () { pandang(b.dataset.vp); });
  });
  kamera.setAttribute('position', '0 0 0');

  // ---------------- Hotspot 3D ----------------
  var labelEl = $('#label-hotspot'), mouse = { x: 0, y: 0 };
  $('.panggung').addEventListener('mousemove', function (e) {
    var r = this.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    labelEl.style.left = mouse.x + 'px'; labelEl.style.top = mouse.y + 'px';
  });
  function buatHotspot() {
    R.HOTSPOT.forEach(function (h, i) {
      var e = document.createElement('a-entity');
      e.setAttribute('position', h.pos.join(' '));
      e.setAttribute('id', 'hs-' + h.id);
      var bola = document.createElement('a-sphere');
      bola.setAttribute('radius', '0.32');
      bola.setAttribute('material', 'color: #E3A72F; emissive: #E3A72F; emissiveIntensity: 0.55; opacity: 0.95; transparent: true');
      bola.setAttribute('class', 'klik');
      bola.setAttribute('denyut', '');
      bola.dataset.id = h.id;
      var nomor = document.createElement('a-text');
      nomor.setAttribute('value', String(i + 1));
      nomor.setAttribute('align', 'center');
      nomor.setAttribute('color', '#2B1B12');
      nomor.setAttribute('width', '5');
      nomor.setAttribute('position', '0 0 0.34');
      nomor.setAttribute('look-at', '');
      e.appendChild(bola); e.appendChild(nomor);
      bola.addEventListener('click', function () { bukaHotspot(h.id); });
      bola.addEventListener('mouseenter', function () { labelEl.textContent = (i + 1) + '. ' + K.hotspot[h.id].judul; labelEl.hidden = false; });
      bola.addEventListener('mouseleave', function () { labelEl.hidden = true; });
      hsEl.appendChild(e);
    });
  }
  AFRAME.registerComponent('look-at', {
    tick: function () {
      var cam = this.el.sceneEl.camera; if (!cam) return;
      var p = new AFRAME.THREE.Vector3(); cam.getWorldPosition(p);
      this.el.object3D.lookAt(p);
    }
  });
  function tandaiHotspot(id) {
    var b = document.querySelector('#hs-' + id + ' a-sphere');
    if (b) b.setAttribute('material', 'color: #2F6B3A; emissive: #2F6B3A; emissiveIntensity: 0.4');
  }

  function bukaPintu() {
    var obj = rumahEl.getObject3D('rumah'); if (!obj) return;
    var engsel = obj.getObjectByName('engselPintu'); if (!engsel) return;
    var t0 = performance.now();
    (function anim(t) {
      var k = Math.min(1, (t - t0) / 1200);
      engsel.rotation.y = -1.6 * (1 - Math.pow(1 - k, 3));
      if (k < 1) requestAnimationFrame(anim);
    })(t0);
  }

  // ---------------- Langkah / navigasi ----------------
  function setTahap(n) {
    S.tahap = n;
    document.querySelectorAll('#langkah li').forEach(function (li) {
      var i = +li.dataset.i;
      li.className = i === n ? 'aktif' : i < n ? 'selesai' : '';
    });
    [tahap0, tahap1, tahap2, tahap3, tahap4, tahap5][n]();
    $('.panel').scrollTop = 0;
  }

  // ---------- 0. Sambutan ----------
  function tahap0() {
    pemandu('Assalamualaikum, selamat datang di tepian Sungai Kapuas! Saya Pak Long. Hari ini kita akan bertandang ke rumah adat Melayu Pontianak, mengamatinya dengan teliti, lalu menuliskannya menjadi teks deskripsi yang hidup.');
    isi.innerHTML =
      '<h2>Menulis Teks Deskripsi lewat Pengamatan Imersif</h2>' +
      '<div class="kartu emas"><b>Mengapa media ini?</b><p>Teks deskripsi yang baik lahir dari pengamatan yang teliti. Di sini Anda bisa "mendatangi" rumah Melayu Pontianak dalam 3D/VR, mengamati setiap bagiannya, lalu menulis dengan bantuan umpan balik kecerdasan buatan.</p></div>' +
      '<h3>Tujuan pembelajaran</h3><ol>' +
      '<li>Mengidentifikasi ciri dan bagian objek melalui pengamatan 3D/VR.</li>' +
      '<li>Memilih diksi yang tepat: kata sifat, kata indrawi, kata konkret, dan majas.</li>' +
      '<li>Menyusun teks deskripsi dengan struktur <i>identifikasi – deskripsi bagian – simpulan/kesan</i>.</li>' +
      '<li>Merevisi tulisan berdasarkan umpan balik GenAI.</li></ol>' +
      '<h3>Alur (± 15–20 menit)</h3><ol>' +
      '<li><b>Bertandang</b>: beri salam, jelajahi rumah, dan jawab tantangan diksi di setiap titik (± 6 menit).</li>' +
      '<li><b>Struktur</b>: pilah kalimat ke dalam struktur teks deskripsi (± 2 menit).</li>' +
      '<li><b>Menulis</b>: tulis teks deskripsi dan dapatkan umpan balik GenAI (± 6 menit).</li>' +
      '<li><b>Variasi AI</b>: GenAI merancang rumah baru, lalu Anda uji ketelitian mengamati (± 3 menit).</li></ol>' +
      '<div class="kartu"><b>Perangkat</b><ul>' +
      '<li>Laptop: seret layar untuk menoleh, tombol W/A/S/D untuk berjalan.</li>' +
      '<li>Ponsel: gerakkan ponsel untuk menoleh. Tekan ikon kacamata untuk mode VR (Cardboard/headset).</li>' +
      '<li>AR: tombol <b>📱 Lihat di AR</b> menampilkan rumah di atas meja Anda melalui kamera.</li>' +
      '<li>GenAI: ' + (GenAI.aktif() ? '<b class="ok">aktif</b>.' : '<b class="lewat">mode offline</b>. Tekan <b>⚙ GenAI</b> di atas dan masukkan API key Gemini gratis untuk umpan balik AI penuh.') + '</li></ul></div>' +
      '<div class="baris-tombol"><button class="tombol emas" id="mulai">Mulai Bertandang →</button></div>';
    $('#mulai').onclick = function () { S.mulai = Date.now(); setTahap(1); };
    pandang('depan');
  }

  // ---------- 1. Bertandang ----------
  function tahap1() {
    rumahEl.setAttribute('visible', true); varEl.setAttribute('visible', false);
    if (!S.salam) {
      pandang('dekat');
      pemandu('Kita sudah sampai di kaki tangga rumah. Dalam adat Melayu, apa yang patut dilakukan seorang tamu sebelum naik ke rumah?');
      isi.innerHTML = '<h2>Adab Bertandang</h2><p>Pilih tindakan yang tepat untuk membuka pintu rumah.</p>' +
        '<div class="pilihan" id="opsi-salam">' +
        '<button data-b="0">Langsung naik tangga dan masuk ke rumah.</button>' +
        '<button data-b="1">Berdiri di kaki tangga, mengucapkan salam, lalu menunggu dipersilakan naik.</button>' +
        '<button data-b="0">Memanggil tuan rumah dengan suara keras dari tepi jalan.</button></div><p id="umpan-salam"></p>';
      document.querySelectorAll('#opsi-salam button').forEach(function (b) {
        b.onclick = function () {
          if (b.dataset.b === '1') {
            b.classList.add('benar'); S.salam = true;
            $('#umpan-salam').innerHTML = '<b class="ok">Tepat!</b> Memberi salam dan menunggu dipersilakan adalah adab bertandang orang Melayu.';
            bukaPintu();
            setTimeout(tahap1, 1400);
          } else {
            b.classList.add('salah');
            $('#umpan-salam').innerHTML = '<b class="ng">Kurang tepat.</b> Ingat pepatah: <i>"di mana bumi dipijak, di situ langit dijunjung"</i>. Hormati adat tuan rumah.';
          }
        };
      });
      return;
    }
    hsEl.setAttribute('visible', true);
    if (!hsEl.children.length) buatHotspot();
    Object.keys(S.terjawab).forEach(tandaiHotspot);
    pemandu('Waalaikumsalam, silakan naik! Klik bulatan emas di rumah atau pilih nomor di bawah. Amati setiap bagian, baca maknanya, lalu jawab tantangan pilihan kata. Frasa yang tepat akan masuk ke Catatan Pengamatan Anda.');
    renderJelajah();
  }

  function renderJelajah() {
    var n = Object.keys(S.terjawab).length;
    var html = '<h2>Jelajahi Rumah Melayu Pontianak</h2>' +
      '<div class="bar" title="Kemajuan pengamatan"><i style="width:' + (n / R.HOTSPOT.length * 100) + '%"></i></div>' +
      '<p class="sumber">' + n + ' dari ' + R.HOTSPOT.length + ' bagian telah diamati (minimal ' + MIN_HOTSPOT + ' untuk lanjut)</p>' +
      '<div class="daftar-hotspot">' + R.HOTSPOT.map(function (h, i) {
        var c = (S.terjawab[h.id] ? 'selesai ' : '') + (S.aktif === h.id ? 'aktif' : '');
        return '<button class="' + c + '" data-h="' + h.id + '">' + (i + 1) + '. ' + K.hotspot[h.id].judul + '</button>';
      }).join('') + '</div><div id="kartu-hotspot"></div>' +
      '<h3>📝 Catatan Pengamatan</h3><div class="catatan">' +
      (S.catatan.length ? S.catatan.map(function (c) { return '<span class="chip">' + esc(c) + '</span>'; }).join('') : '<span class="sumber">Belum ada catatan. Jawab tantangan di setiap titik.</span>') +
      '</div><div class="baris-tombol"><button class="tombol" id="lanjut1" ' + (n >= MIN_HOTSPOT ? '' : 'disabled') + '>Lanjut: Susun Struktur →</button></div>';
    isi.innerHTML = html;
    isi.querySelectorAll('[data-h]').forEach(function (b) { b.onclick = function () { bukaHotspot(b.dataset.h); }; });
    $('#lanjut1').onclick = function () { setTahap(2); };
    if (S.aktif) renderKartu(S.aktif);
  }

  function bukaHotspot(id) {
    if (S.tahap !== 1 || !S.salam) return;
    S.aktif = id;
    var h = R.HOTSPOT.filter(function (x) { return x.id === id; })[0];
    lihatKe(h.pos);
    renderJelajah();
    var k = $('#kartu-hotspot'); if (k) k.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  var urutan = {};
  function urutanAcak(id, n) {
    if (!urutan[id]) {
      var a = []; for (var i = 0; i < n; i++) a.push(i);
      for (var j = n - 1; j > 0; j--) { var r = Math.floor(Math.random() * (j + 1)); var t = a[j]; a[j] = a[r]; a[r] = t; }
      urutan[id] = a;
    }
    return urutan[id];
  }

  function renderKartu(id) {
    var d = K.hotspot[id];
    pemandu(d.judul + '. ' + d.fakta);
    var box = $('#kartu-hotspot');
    box.innerHTML = '<div class="kartu"><h3>' + esc(d.judul) + '</h3><p>' + esc(d.fakta) + '</p>' +
      '<p class="nilai-lokal">🌿 Kearifan lokal: ' + esc(d.nilai) + '</p>' +
      '<p><b>Tantangan diksi:</b> ' + esc(d.tanya) + '</p><div class="pilihan" id="opsi-h">' +
      urutanAcak(id, d.pilihan.length).map(function (i) { return '<button data-i="' + i + '">' + esc(d.pilihan[i]) + '</button>'; }).join('') +
      '</div><p id="umpan-h"></p></div>';
    if (S.terjawab[id]) {
      box.querySelector('[data-i="' + d.benar + '"]').classList.add('benar');
      $('#umpan-h').innerHTML = '<span class="ok">✔ Sudah dijawab. Frasa tersimpan di catatan.</span>';
    }
    box.querySelectorAll('#opsi-h button').forEach(function (b) {
      b.onclick = function () {
        if (S.terjawab[id]) return;
        if (+b.dataset.i === d.benar) {
          b.classList.add('benar');
          S.terjawab[id] = true;
          if (S.catatan.indexOf(d.frasa) < 0) S.catatan.push(d.frasa);
          tandaiHotspot(id);
          pemandu('Bagus! Frasa "' + d.frasa + '" masuk ke catatan Anda. Lanjutkan ke bagian lain.');
          setTimeout(renderJelajah, 900);
        } else {
          b.classList.add('salah');
          $('#umpan-h').innerHTML = '<span class="ng">Belum tepat. Amati lagi objeknya di layar 3D, lalu pilih kata yang paling sesuai.</span>';
        }
      };
    });
  }

  // ---------- 2. Struktur ----------
  function tahap2() {
    hsEl.setAttribute('visible', false);
    pandang('depan');
    pemandu('Teks deskripsi punya tiga bagian: identifikasi atau gambaran umum, deskripsi bagian, dan simpulan atau kesan. Tentukan setiap kalimat masuk ke bagian mana.');
    var lbl = { identifikasi: 'Identifikasi', bagian: 'Deskripsi bagian', simpulan: 'Simpulan/Kesan' };
    var jaw = {};
    isi.innerHTML = '<h2>Susun Struktur Teks Deskripsi</h2>' +
      '<div class="kartu emas"><b>Ingat:</b><ul><li><b>Identifikasi</b>: memperkenalkan objek secara umum.</li><li><b>Deskripsi bagian</b>: merinci bagian-bagian objek dengan kata sifat dan kata indrawi.</li><li><b>Simpulan/kesan</b>: pendapat atau kesan penulis terhadap objek.</li></ul></div>' +
      K.struktur.map(function (s, i) {
        return '<div class="kalimat-struktur" data-k="' + i + '"><p>' + esc(s.t) + '</p><div class="opsi">' +
          Object.keys(lbl).map(function (k) { return '<button data-v="' + k + '">' + lbl[k] + '</button>'; }).join('') + '</div></div>';
      }).join('') +
      '<p id="umpan-s"></p><div class="baris-tombol"><button class="tombol emas" id="periksa-s">Periksa</button><button class="tombol" id="lanjut2" disabled>Lanjut: Menulis →</button></div><div id="teks-model"></div>';
    isi.querySelectorAll('.kalimat-struktur').forEach(function (row) {
      row.querySelectorAll('button').forEach(function (b) {
        b.onclick = function () {
          row.querySelectorAll('button').forEach(function (x) { x.classList.remove('dipilih'); });
          b.classList.add('dipilih'); jaw[row.dataset.k] = b.dataset.v; row.classList.remove('benar', 'salah');
        };
      });
    });
    $('#periksa-s').onclick = function () {
      var benar = 0;
      isi.querySelectorAll('.kalimat-struktur').forEach(function (row) {
        var ok = jaw[row.dataset.k] === K.struktur[row.dataset.k].k;
        row.classList.toggle('benar', ok); row.classList.toggle('salah', !ok); if (ok) benar++;
      });
      if (benar === K.struktur.length) {
        S.strukturOK = true;
        $('#umpan-s').innerHTML = '<b class="ok">Sempurna! Semua kalimat tepat.</b> Inilah teks utuhnya bila disusun berurutan:';
        var urut = ['identifikasi', 'bagian', 'simpulan'].map(function (k) {
          return '<p>' + K.struktur.filter(function (s) { return s.k === k; }).map(function (s) { return esc(s.t); }).join(' ') + '</p>';
        }).join('');
        $('#teks-model').innerHTML = '<div class="kartu hijau">' + urut + '</div>';
        $('#lanjut2').disabled = false;
        pemandu('Hebat! Perhatikan contoh teks utuhnya: ada pengenalan umum, rincian bagian dengan kata-kata yang hidup, dan kesan penulis di akhir.');
      } else {
        $('#umpan-s').innerHTML = '<b class="ng">' + benar + ' dari ' + K.struktur.length + ' benar.</b> Perbaiki kalimat yang bertanda merah. Petunjuk: kalimat berisi pendapat atau perasaan termasuk simpulan/kesan.';
      }
    };
    $('#lanjut2').onclick = function () { setTahap(3); };
  }

  // ---------- 3. Menulis + GenAI ----------
  function tahap3() {
    pandang('depan');
    pemandu('Sekarang giliran Anda menulis. Pakai catatan pengamatan sebagai bahan, susun menjadi tiga paragraf, lalu minta umpan balik GenAI. Anda boleh merevisi dan menilai ulang.');
    isi.innerHTML = '<h2>Tulis Teks Deskripsi Anda</h2>' +
      '<p>Deskripsikan <b>rumah adat Melayu Pontianak</b> yang baru Anda amati (100–200 kata, tiga paragraf).</p>' +
      '<h3>📝 Catatan Pengamatan (klik untuk menyisipkan)</h3><div class="catatan">' +
      S.catatan.map(function (c) { return '<span class="chip" data-c="' + esc(c) + '">' + esc(c) + '</span>'; }).join('') + '</div>' +
      '<textarea id="teks" placeholder="Paragraf 1 – Identifikasi: Rumah adat Melayu Pontianak merupakan ...&#10;&#10;Paragraf 2 – Deskripsi bagian: Di bagian depan ...&#10;&#10;Paragraf 3 – Simpulan/kesan: Rumah ini mencerminkan ..."></textarea>' +
      '<div class="hitung" id="hitung">0 kata</div>' +
      '<div class="baris-tombol"><button class="tombol emas" id="nilai">✨ Nilai dengan GenAI</button><button class="tombol" id="lanjut3" ' + (S.nilai ? '' : 'disabled') + '>Lanjut: Variasi AI →</button></div>' +
      '<div id="hasil-nilai"></div>';
    var ta = $('#teks');
    ta.value = S.teks;
    function hitung() {
      S.teks = ta.value;
      try { localStorage.setItem('bertandang-teks', S.teks); } catch (e) { }
      $('#hitung').textContent = jumlahKata(ta.value) + ' kata';
    }
    ta.oninput = hitung; hitung();
    isi.querySelectorAll('.chip').forEach(function (c) {
      c.onclick = function () {
        var p = ta.selectionStart || ta.value.length;
        ta.value = ta.value.slice(0, p) + c.dataset.c + ta.value.slice(p);
        ta.focus(); hitung();
      };
    });
    if (S.nilai) tampilNilai(S.nilai);
    $('#nilai').onclick = async function () {
      if (jumlahKata(ta.value) < 60) { $('#hasil-nilai').innerHTML = '<p class="ng">Tulis minimal 60 kata agar umpan balik bermakna.</p>'; return; }
      var b = this; b.disabled = true;
      $('#hasil-nilai').innerHTML = '<div class="kartu"><div class="memuat">GenAI sedang membaca dan menilai tulisan Anda…</div></div>';
      var h = await GenAI.nilaiDeskripsi(ta.value);
      S.nilai = h; S.revisi++;
      tampilNilai(h);
      b.disabled = false; b.textContent = '✨ Nilai ulang setelah revisi';
      $('#lanjut3').disabled = false;
      pemandu('Umpan balik sudah keluar. Baca sarannya, perbaiki tulisan Anda, lalu nilai ulang. Begitulah penulis yang baik bekerja: menulis, menerima masukan, merevisi.');
    };
    $('#lanjut3').onclick = function () { setTahap(4); };
  }

  function tampilNilai(h) {
    var s = h.skor, total = Math.round((s.struktur + s.isi + s.diksi + s.ejaan) / 16 * 100);
    h.total = total;
    var nama = { struktur: 'Struktur', isi: 'Ketepatan isi', diksi: 'Diksi', ejaan: 'Ejaan & kalimat' };
    $('#hasil-nilai').innerHTML = '<div class="kartu hijau"><div style="display:flex;justify-content:space-between;align-items:center"><div><b>Skor teks deskripsi</b><div class="sumber">Penilai: ' + esc(h.sumber) + ' · revisi ke-' + S.revisi + '</div></div><div class="skor-besar">' + total + '</div></div>' +
      Object.keys(nama).map(function (k) {
        return '<div class="aspek"><span>' + nama[k] + '</span><div class="bar"><i style="width:' + (s[k] / 4 * 100) + '%"></i></div><b>' + s[k] + '/4</b></div>';
      }).join('') +
      '<h3>Kekuatan</h3><p>' + esc(h.kekuatan) + '</p>' +
      '<h3>Saran perbaikan</h3><ul>' + h.saran.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
      (h.contohPerbaikan ? '<h3>Contoh perbaikan kalimat</h3><p>' + esc(h.contohPerbaikan) + '</p>' : '') +
      '<h3>Pantun dari Pak Long</h3><div class="pantun">' + esc(h.pantun) + '</div></div>';
  }

  // ---------- 4. Variasi GenAI ----------
  function tahap4() {
    pemandu('Mari uji ketelitian mata Anda. GenAI akan merancang sebuah rumah Melayu yang berbeda: warna, jumlah anak tangga, jendela, dan benda di sekitarnya. Amati baik-baik, lalu deskripsikan dalam 3 sampai 5 kalimat.');
    isi.innerHTML = '<h2>Latihan Variasi Visual dari GenAI</h2>' +
      '<div class="kartu emas">GenAI membuat spesifikasi rumah baru secara acak, lalu aplikasi menggambarnya dalam 3D. Setiap latihan berbeda, jadi Anda bisa berlatih berulang kali.</div>' +
      '<div class="baris-tombol"><button class="tombol emas" id="buat-var">🎲 Buat Variasi dengan GenAI</button></div><div id="area-var"></div>' +
      '<div class="baris-tombol"><button class="tombol garis" id="kembali-utama">↩ Kembali ke rumah utama</button><button class="tombol" id="lanjut4" ' + (S.hasilVariasi.length ? '' : 'disabled') + '>Selesai →</button></div>';
    if (S.variasi) renderVariasi();
    $('#buat-var').onclick = async function () {
      var b = this; b.disabled = true;
      $('#area-var').innerHTML = '<div class="kartu"><div class="memuat">GenAI sedang merancang rumah baru…</div></div>';
      S.variasi = await GenAI.buatVariasi(S.variasi);
      tampilkanVariasi3D(S.variasi);
      renderVariasi();
      b.disabled = false; b.textContent = '🎲 Variasi lain';
    };
    $('#kembali-utama').onclick = function () {
      varEl.setAttribute('visible', false); rumahEl.setAttribute('visible', true); pandang('depan');
    };
    $('#lanjut4').onclick = function () { setTahap(5); };
  }

  function tampilkanVariasi3D(spek) {
    var opt = Object.assign({}, spek); delete opt.cerita; delete opt.sumber;
    varEl.setAttribute('rumah-melayu', { opt: JSON.stringify(opt) });
    rumahEl.setAttribute('visible', false); varEl.setAttribute('visible', true); hsEl.setAttribute('visible', false);
    pandang('depan');
  }

  function renderVariasi() {
    var v = S.variasi;
    $('#area-var').innerHTML = '<div class="kartu"><p><b>Situasi:</b> ' + esc(v.cerita) + '</p><p class="sumber">Dirancang oleh: ' + esc(v.sumber) + ' · Gunakan tombol sudut pandang (Depan, Samping, Udara) untuk mengamati.</p>' +
      '<textarea id="teks-var" style="min-height:120px" placeholder="Contoh: Rumah panggung itu berdinding ... dengan atap berwarna ... Tangganya terdiri atas ... anak tangga ..."></textarea>' +
      '<div class="baris-tombol"><button class="tombol emas" id="cek-var">🔍 Periksa Pengamatan</button></div><div id="hasil-var"></div></div>';
    $('#cek-var').onclick = async function () {
      var t = $('#teks-var').value;
      if (jumlahKata(t) < 15) { $('#hasil-var').innerHTML = '<p class="ng">Tulis minimal 3 kalimat (±15 kata).</p>'; return; }
      var b = this; b.disabled = true;
      $('#hasil-var').innerHTML = '<div class="memuat">GenAI membandingkan deskripsi Anda dengan objek 3D…</div>';
      var h = await GenAI.cekPengamatan(v, t);
      S.hasilVariasi.push(h.skor);
      function daftar(arr, cls, ikon) { return arr.length ? '<ul>' + arr.map(function (x) { return '<li class="' + cls + '">' + ikon + ' ' + esc(x) + '</li>'; }).join('') + '</ul>' : '<p class="sumber">–</p>'; }
      $('#hasil-var').innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center"><b>Ketepatan pengamatan</b><span class="skor-besar">' + h.skor + '</span></div>' +
        '<p class="sumber">Pemeriksa: ' + esc(h.sumber) + '</p>' +
        '<h3>Tepat</h3>' + daftar(h.benar, 'ok', '✔') + '<h3>Keliru</h3>' + daftar(h.keliru, 'ng', '✘') + '<h3>Terlewat</h3>' + daftar(h.terlewat, 'lewat', '•') +
        '<p>' + esc(h.komentar) + '</p><details><summary>Lihat spesifikasi sebenarnya</summary><p>' + esc(GenAI.deskripsiSpek(v)) + '</p></details>';
      b.disabled = false;
      $('#lanjut4').disabled = false;
      pemandu(h.skor >= 75 ? 'Mata Anda jeli! Coba variasi lain untuk mengasah ketelitian.' : 'Tidak apa-apa. Putar sudut pandang dan amati lagi: warna, jumlah, dan benda di sekitar rumah.');
    };
  }

  // ---------- 5. Tamat ----------
  function tahap5() {
    varEl.setAttribute('visible', false); rumahEl.setAttribute('visible', true); pandang('atas');
    var durasi = Math.round((Date.now() - S.mulai) / 60000);
    var rata = S.hasilVariasi.length ? Math.round(S.hasilVariasi.reduce(function (a, b) { return a + b; }, 0) / S.hasilVariasi.length) : '-';
    var pantun = K.pantun[2];
    pemandu('Terima kasih sudah bertandang! Ingatlah: deskripsi yang hidup lahir dari mata yang teliti dan kata yang tepat.');
    isi.innerHTML = '<h2>Tamat – Ringkasan Belajar</h2>' +
      '<div class="kartu hijau"><ul>' +
      '<li>Durasi belajar: <b>' + durasi + ' menit</b></li>' +
      '<li>Bagian rumah yang diamati: <b>' + Object.keys(S.terjawab).length + ' / ' + R.HOTSPOT.length + '</b></li>' +
      '<li>Skor teks deskripsi terakhir: <b>' + (S.nilai ? S.nilai.total : '-') + '</b> (revisi ' + S.revisi + ' kali)</li>' +
      '<li>Rata-rata ketepatan pengamatan variasi: <b>' + rata + '</b> (' + S.hasilVariasi.length + ' latihan)</li></ul></div>' +
      '<h3>Teks deskripsi Anda</h3><div class="kartu">' + (S.teks ? esc(S.teks).replace(/\n/g, '<br>') : '<i>Belum ada teks.</i>') + '</div>' +
      '<h3>Refleksi</h3><p>Bagian mana dari rumah Melayu Pontianak yang paling sulit Anda deskripsikan, dan mengapa? Tuliskan di forum kelas.</p>' +
      '<div class="pantun">' + esc(pantun) + '</div>' +
      '<div class="baris-tombol"><button class="tombol emas" onclick="window.print()">🖨 Simpan ringkasan (PDF)</button><button class="tombol garis" id="ulang">↺ Ulangi dari awal</button></div>';
    $('#ulang').onclick = function () { location.reload(); };
  }

  // ---------------- Pengaturan GenAI ----------------
  var dlg = $('#dialog-ai');
  function statusAI() { $('#status-ai').classList.toggle('on', GenAI.aktif()); }
  statusAI();
  $('#buka-ai').onclick = function () {
    var c = GenAI.cfg();
    $('#ai-provider').value = c.provider || 'gemini';
    $('#ai-key').value = c.key || '';
    $('#ai-model').value = c.model || '';
    $('#ai-hasil').textContent = GenAI.aktif() ? 'Status: GenAI aktif.' : 'Status: mode offline (belum ada API key).';
    dlg.showModal();
  };
  $('#ai-provider').onchange = function () {
    $('#ai-model').placeholder = this.value === 'gemini' ? 'gemini-flash-latest' : 'openai';
  };
  $('#ai-uji').onclick = async function () {
    GenAI.simpanCfg({ provider: $('#ai-provider').value, key: $('#ai-key').value.trim(), model: $('#ai-model').value.trim() });
    $('#ai-hasil').textContent = 'Menguji koneksi…';
    try {
      var s = await GenAI.uji();
      $('#ai-hasil').innerHTML = '<span class="ok">✔ Tersambung. AI menyapa: "' + esc(s) + '"</span>';
    } catch (e) {
      $('#ai-hasil').innerHTML = '<span class="ng">✘ Gagal: ' + esc(e.message) + '. Periksa key/model. Aplikasi tetap memakai mode offline.</span>';
    }
    statusAI();
  };
  $('#ai-hapus').onclick = function () {
    GenAI.simpanCfg({}); $('#ai-key').value = ''; statusAI();
    $('#ai-hasil').textContent = 'Key dihapus. Mode offline aktif.';
  };

  // Mulai setelah adegan siap
  var scene = document.querySelector('a-scene');
  function siap() {
    // ?tahap=n&lihat=id : lompat langsung (untuk demo dosen/penilai)
    var q = new URLSearchParams(location.search), n = +q.get('tahap') || 0;
    if (n > 0) { S.salam = true; bukaPintu(); }
    setTahap(Math.min(5, Math.max(0, n)));
    if (n === 1 && q.get('lihat') && K.hotspot[q.get('lihat')]) bukaHotspot(q.get('lihat'));
  }
  if (scene.hasLoaded) siap(); else scene.addEventListener('loaded', siap);
})();
