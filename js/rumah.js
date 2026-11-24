/*
 * Model 3D Rumah Adat Melayu Pontianak (prosedural, dibangun dengan three.js).
 * Dipakai bersama oleh: adegan VR (A-Frame) dan skrip ekspor GLB untuk AR.
 * Satuan: meter. Bagian depan rumah menghadap sumbu +Z (ke arah sungai).
 */
(function (root) {
  var WARNA = {
    dinding: { kuning: '#E9C46A', hijau: '#5E9C5A', putih: '#EFE8D8', coklat: '#9C7A5B' },
    atap: { coklat: '#5B3A29', hijau: '#2E5E3A', merah: '#8E2B2B' }
  };

  var DEFAULT = {
    dinding: 'kuning', atap: 'coklat', tangga: 5, jendela: 4,
    ornamen: true, saprahan: true, sampan: true, meriam: false, lingkungan: true
  };

  function buildRumah(THREE, opt) {
    opt = Object.assign({}, DEFAULT, opt || {});
    var cDinding = WARNA.dinding[opt.dinding] || opt.dinding;
    var cAtap = WARNA.atap[opt.atap] || opt.atap;
    var cList = '#2F6B3A', cKayu = '#4A2F22', cBelian = '#3B2A22', cEmas = '#E3A72F';

    var g = new THREE.Group();
    g.name = 'RumahMelayuPontianak';
    var cache = {};
    function M(c) {
      if (!cache[c]) cache[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.0 });
      return cache[c];
    }
    function add(mesh, x, y, z, name, parent) {
      mesh.position.set(x, y, z);
      if (name) mesh.name = name;
      (parent || g).add(mesh);
      return mesh;
    }
    function box(w, h, d, c, x, y, z, name, parent) {
      return add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)), x, y, z, name, parent);
    }
    function cyl(r, h, c, x, y, z, seg) {
      return add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 10), M(c)), x, y, z);
    }
    // Atap pelana: prisma segitiga, bubungan sejajar sumbu Z
    function pelana(lebar, tinggi, z0, z1, yAlas, c, name) {
      var s = new THREE.Shape();
      s.moveTo(-lebar / 2, 0); s.lineTo(lebar / 2, 0); s.lineTo(0, tinggi); s.lineTo(-lebar / 2, 0);
      var geo = new THREE.ExtrudeGeometry(s, { depth: z1 - z0, bevelEnabled: false });
      return add(new THREE.Mesh(geo, M(c)), 0, yAlas, z0, name);
    }
    // Atap limas: piramida segi empat
    function limas(w, h, d, c, x, y, z, name) {
      var geo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
      geo.rotateY(Math.PI / 4);
      var m = add(new THREE.Mesh(geo, M(c)), x, y + h / 2, z, name);
      m.scale.set(w, h, d);
      return m;
    }

    var FL = 1.8;  // tinggi lantai rumah induk
    var FS = 1.6;  // tinggi lantai serambi & dapur

    // ---------- Lingkungan: tanah tepian & Sungai Kapuas ----------
    if (opt.lingkungan) {
      box(34, 0.1, 22, '#7C9A45', 0, -0.05, -5, 'tanah');
      box(34, 0.06, 2, '#9C8455', 0, -0.02, 6.6, 'tebing');
      box(34, 0.04, 12, '#3A7CA5', 0, -0.12, 13.5, 'sungai');
      // jalan titian kayu dari tepian ke tangga
      box(1.4, 0.08, 2.4, '#8D6E52', 0, 0.02, 6.4, 'titian');
    }

    // ---------- Tiang kayu belian ----------
    var xs = [-3.4, -1.15, 1.15, 3.4];
    [-5.0, -2.8, -0.6, 1.0].forEach(function (z) {
      xs.forEach(function (x) { cyl(0.13, FL, cBelian, x, FL / 2, z); });
    });
    [2.4, 3.9].forEach(function (z) {
      xs.forEach(function (x) { cyl(0.12, FS, cBelian, x, FS / 2, z); });
    });
    [-8.8, -6.2].forEach(function (z) {
      [-2.3, 0, 2.3].forEach(function (x) { cyl(0.11, FS, cBelian, x, FS / 2, z); });
    });

    // ---------- Rumah induk ----------
    box(7.6, 0.2, 6.6, cKayu, 0, FL, -2, 'lantaiInduk');
    var HW = 2.8, yW = FL + 0.1 + HW / 2;
    box(7, HW, 6, cDinding, 0, yW, -2, 'dindingInduk');
    // list / papan les hijau di bawah & atas dinding
    box(7.1, 0.16, 6.1, cList, 0, FL + 0.18, -2);
    box(7.1, 0.16, 6.1, cList, 0, FL + 0.1 + HW - 0.08, -2);
    // tiang sudut dinding
    [[-3.5, 1.0], [3.5, 1.0], [-3.5, -5.0], [3.5, -5.0]].forEach(function (p) {
      box(0.18, HW, 0.18, cList, p[0], yW, p[1]);
    });

    // Pintu (berengsel, dapat dibuka)
    var engsel = new THREE.Group();
    engsel.name = 'engselPintu';
    engsel.position.set(-0.55, FL + 0.1, 1.04);
    g.add(engsel);
    box(1.3, 2.25, 0.05, cList, 0, FL + 0.1 + 1.1, 1.01); // kusen
    var daun = box(1.1, 2.1, 0.06, '#5A3825', 0.55, 1.05, 0.02, 'pintu', engsel);
    box(0.08, 0.08, 0.08, cEmas, 0.95, 1.05, 0.06, 'gagang', engsel);
    box(1.1, 2.1, 0.02, '#1E140E', 0, FL + 0.1 + 1.05, 1.005, 'ruangDalam'); // gelap di balik pintu

    // Jendela depan (+ samping bila 4)
    function jendela(x, z, rotY) {
      var jg = new THREE.Group();
      jg.position.set(x, FL + 0.1 + 1.45, z);
      jg.rotation.y = rotY || 0;
      g.add(jg);
      box(1.25, 1.45, 0.05, cList, 0, 0, 0, null, jg);
      box(1.05, 1.25, 0.06, '#24170F', 0, 0, 0.01, null, jg);
      for (var i = -2; i <= 2; i++) box(0.05, 1.25, 0.07, '#C9A46A', i * 0.2, 0, 0.03, null, jg); // kisi-kisi
      // daun jendela terbuka ke samping
      box(0.5, 1.25, 0.04, '#6B4630', -0.85, 0, 0.12, null, jg);
      box(0.5, 1.25, 0.04, '#6B4630', 0.85, 0, 0.12, null, jg);
    }
    jendela(-2.3, 1.03); jendela(2.3, 1.03);
    if (opt.jendela >= 4) { jendela(3.53, -2, Math.PI / 2); jendela(-3.53, -2, -Math.PI / 2); }

    // ---------- Atap rumah induk: pelana curam ----------
    var yAtap = FL + 0.1 + HW;
    var lebarAtap = 8.6, tinggiAtap = 3.0;
    pelana(lebarAtap, tinggiAtap, -5.6, 1.6, yAtap, cAtap, 'atapInduk');
    // tebeng (dinding segitiga) depan
    var tb = new THREE.Shape();
    tb.moveTo(-3.5, 0); tb.lineTo(3.5, 0); tb.lineTo(0, 2.45); tb.lineTo(-3.5, 0);
    add(new THREE.Mesh(new THREE.ExtrudeGeometry(tb, { depth: 0.05, bevelEnabled: false }), M(cDinding)), 0, yAtap, 1.6, 'tebeng');
    // lubang angin di tebeng
    box(0.9, 0.45, 0.03, '#24170F', 0, yAtap + 0.9, 1.67);

    // Lisplang (papan les) miring + ornamen pucuk rebung
    var sudut = Math.atan2(tinggiAtap, lebarAtap / 2);
    var panjang = Math.sqrt(Math.pow(lebarAtap / 2, 2) + tinggiAtap * tinggiAtap);
    [-1, 1].forEach(function (sisi) {
      var l = box(panjang, 0.3, 0.08, cList, sisi * lebarAtap / 4, yAtap + tinggiAtap / 2, 1.7, 'lisplang');
      l.rotation.z = -sisi * sudut;
      if (opt.ornamen) {
        for (var i = 1; i <= 7; i++) {
          var t = i / 8;
          var px = sisi * (lebarAtap / 2) * (1 - t);
          var py = yAtap + tinggiAtap * t;
          var pr = add(new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 3), M(cEmas)), px, py - 0.32, 1.76, 'pucukRebung');
          pr.rotation.z = Math.PI; // ujung menghadap ke bawah seperti renda lisplang
        }
      }
    });
    if (opt.ornamen) {
      // ornamen puncak bersilang di ujung bubungan
      var o1 = box(0.12, 1.0, 0.1, cEmas, -0.22, yAtap + tinggiAtap + 0.25, 1.65, 'ornamenPuncak');
      o1.rotation.z = 0.5;
      var o2 = box(0.12, 1.0, 0.1, cEmas, 0.22, yAtap + tinggiAtap + 0.25, 1.65);
      o2.rotation.z = -0.5;
    }
    // bubungan
    box(0.22, 0.18, 7.3, '#3A251A', 0, yAtap + tinggiAtap + 0.02, -2, 'bubungan');

    // ---------- Serambi (selasar depan) ----------
    box(7.6, 0.18, 3.2, cKayu, 0, FS, 2.6, 'lantaiSerambi');
    var yPagar = FS + 0.09;
    for (var px = -3.6; px <= 3.61; px += 0.6) {
      if (Math.abs(px) < 0.8) continue; // celah untuk tangga
      box(0.07, 0.8, 0.07, '#E8DCC0', px, yPagar + 0.4, 4.15);
    }
    box(2.85, 0.08, 0.1, cList, -2.2, yPagar + 0.82, 4.15);
    box(2.85, 0.08, 0.1, cList, 2.2, yPagar + 0.82, 4.15);
    [-3.75, 3.75].forEach(function (x) {
      for (var pz = 1.4; pz <= 4.1; pz += 0.6) box(0.07, 0.8, 0.07, '#E8DCC0', x, yPagar + 0.4, pz);
      box(0.1, 0.08, 2.9, cList, x, yPagar + 0.82, 2.7);
    });
    // tiang & atap limas serambi
    [-3.7, 3.7].forEach(function (x) { box(0.14, 2.3, 0.14, cList, x, FS + 1.15, 4.1); });
    limas(8.3, 1.5, 3.9, cAtap, 0, FS + 2.3, 2.7, 'atapSerambi');

    // ---------- Tangga depan (jumlah anak tangga ganjil) ----------
    var n = opt.tangga;
    var naik = FS / (n + 1);
    for (var i = 1; i <= n; i++) {
      box(1.3, 0.07, 0.34, '#7A5638', 0, naik * i, 4.25 + (n + 1 - i) * 0.32, 'anakTangga');
    }
    var pjTangga = (n + 1) * 0.32;
    [-0.68, 0.68].forEach(function (x) {
      var ib = box(0.1, 0.12, Math.sqrt(pjTangga * pjTangga + FS * FS), '#5A3E2A', x, FS / 2, 4.25 + pjTangga / 2, 'ibuTangga');
      ib.rotation.x = Math.atan2(FS, pjTangga);
      var pg = box(0.06, 0.06, Math.sqrt(pjTangga * pjTangga + FS * FS), cList, x, FS / 2 + 0.85, 4.25 + pjTangga / 2);
      pg.rotation.x = Math.atan2(FS, pjTangga);
    });

    // ---------- Saprahan di serambi ----------
    if (opt.saprahan) {
      box(2.2, 0.02, 1.2, '#F4EBD0', -2.1, FS + 0.1, 2.6, 'kainSaprah');
      box(2.24, 0.021, 0.08, '#B71C1C', -2.1, FS + 0.1, 2.0);
      box(2.24, 0.021, 0.08, '#B71C1C', -2.1, FS + 0.1, 3.2);
      var piring = [[-2.85, 2.2], [-2.1, 2.2], [-1.35, 2.2], [-2.85, 3.0], [-2.1, 3.0], [-1.35, 3.0]];
      piring.forEach(function (p) { cyl(0.15, 0.03, '#FFFFFF', p[0], FS + 0.13, p[1], 16); });
      cyl(0.22, 0.1, '#C6862E', -2.1, FS + 0.16, 2.6, 16); // dulang hidangan tengah
      cyl(0.1, 0.12, '#FFFDF5', -1.6, FS + 0.17, 2.6, 12);
      cyl(0.1, 0.12, '#7B3F00', -2.6, FS + 0.17, 2.6, 12);
    }

    // ---------- Selang (titian penghubung) & dapur ----------
    box(1.6, 0.15, 0.8, cKayu, 0, FS, -5.6, 'selang');
    box(5.4, 0.2, 3.4, cKayu, 0, FS, -7.5, 'lantaiDapur');
    box(5, 2.3, 3, cDinding, 0, FS + 0.1 + 1.15, -7.5, 'dindingDapur');
    box(5.1, 0.14, 3.1, cList, 0, FS + 0.18, -7.5);
    pelana(6.0, 1.7, -9.4, -5.6, FS + 0.1 + 2.3, cAtap, 'atapDapur');
    box(0.8, 1.2, 0.05, '#24170F', 1.4, FS + 1.4, -5.98); // jendela dapur
    cyl(0.12, 1.4, '#6D6D6D', 1.8, FS + 3.6, -8.2, 8); // cerobong asap

    // ---------- Sampan di Sungai Kapuas ----------
    if (opt.sampan && opt.lingkungan) {
      var sp = new THREE.Group();
      sp.name = 'sampan';
      sp.position.set(5.5, 0.05, 11);
      sp.rotation.y = 0.35;
      g.add(sp);
      box(3.2, 0.32, 0.8, '#6B4226', 0, 0, 0, null, sp);
      var hd = add(new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 4), M('#6B4226')), 2.05, 0, 0, null, sp);
      hd.rotation.z = -Math.PI / 2; hd.scale.set(1, 1, 0.9);
      var bl = add(new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 4), M('#6B4226')), -2.05, 0, 0, null, sp);
      bl.rotation.z = Math.PI / 2; bl.scale.set(1, 1, 0.9);
      box(2.9, 0.05, 0.6, '#A1784F', 0, 0.15, 0, null, sp);
      var dy = box(0.06, 1.6, 0.06, '#C9A46A', 0.3, 0.75, 0.25, 'dayung', sp);
      dy.rotation.z = 0.6;
    }

    // ---------- Meriam karbit di tepian ----------
    if (opt.meriam && opt.lingkungan) {
      var mr = new THREE.Group();
      mr.name = 'meriamKarbit';
      mr.position.set(-6.5, 0.45, 5.4);
      mr.rotation.y = -0.25;
      g.add(mr);
      var batang = add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 3.6, 16), M('#6D4C41')), 0, 0, 0, null, mr);
      batang.rotation.x = Math.PI / 2 - 0.12;
      [-1.2, -0.2, 0.8].forEach(function (z) {
        var rg = add(new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.05, 6, 20), M(cEmas)), 0, z * 0.12, z, null, mr);
        rg.rotation.x = -0.12;
      });
      box(0.9, 0.4, 0.3, '#5B4636', 0, -0.3, -1.2, null, mr);
      box(0.9, 0.4, 0.3, '#5B4636', 0, -0.3, 1.0, null, mr);
    }

    return g;
  }

  // Titik interaksi (hotspot) dalam koordinat model (meter)
  var HOTSPOT = [
    { id: 'tiang', pos: [3.4, 0.9, 3.9] },
    { id: 'tangga', pos: [0, 1.0, 5.6] },
    { id: 'serambi', pos: [2.4, 2.4, 3.0] },
    { id: 'saprahan', pos: [-2.1, 2.1, 2.6] },
    { id: 'jendela', pos: [2.3, 3.4, 1.4] },
    { id: 'atap', pos: [0, 7.2, -1.5] },
    { id: 'ornamen', pos: [-2.3, 6.5, 2.0] },
    { id: 'dapur', pos: [2.9, 3.0, -7.5] },
    { id: 'sungai', pos: [5.5, 0.9, 11] }
  ];

  var api = { buildRumah: buildRumah, WARNA: WARNA, DEFAULT: DEFAULT, HOTSPOT: HOTSPOT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RumahMelayu = api;
})(typeof window !== 'undefined' ? window : globalThis);
