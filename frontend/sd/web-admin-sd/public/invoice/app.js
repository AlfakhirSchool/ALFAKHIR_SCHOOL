(function(){
  var satuan=["","Satu","Dua","Tiga","Empat","Lima","Enam","Tujuh","Delapan","Sembilan","Sepuluh",
    "Sebelas","Dua Belas","Tiga Belas","Empat Belas","Lima Belas","Enam Belas","Tujuh Belas","Delapan Belas","Sembilan Belas"];

  function terbilang(n){
    n = Math.floor(Math.abs(n));
    if(n === 0) return "Nol";
    function t(n){
      if(n < 20) return satuan[n];
      if(n < 100) return (satuan[Math.floor(n/10)]+" Puluh "+satuan[n%10]).trim();
      if(n < 200) return ("Seratus "+t(n-100)).trim();
      if(n < 1000) return (satuan[Math.floor(n/100)]+" Ratus "+t(n%100)).trim();
      if(n < 2000) return ("Seribu "+t(n-1000)).trim();
      if(n < 1000000) return (t(Math.floor(n/1000))+" Ribu "+t(n%1000)).trim();
      if(n < 1000000000) return (t(Math.floor(n/1000000))+" Juta "+t(n%1000000)).trim();
      return (t(Math.floor(n/1000000000))+" Miliar "+t(n%1000000000)).trim();
    }
    return t(n).replace(/\s+/g," ").trim();
  }

  function fmtRp(n){ return "Rp " + Math.round(n).toLocaleString("id-ID"); }
  function fmtNum(n){ return Math.round(n).toLocaleString("id-ID"); }
  function parseNum(s){ return parseInt(String(s).replace(/[^\d-]/g,""),10) || 0; }

  function isMoneyField(el){ return el && (el.classList.contains("f-jumlah") || el.id === "in-potongan"); }
  document.addEventListener("focusin", function(e){
    if(isMoneyField(e.target)){ e.target.value = String(parseNum(e.target.value)); }
  });
  document.addEventListener("focusout", function(e){
    if(isMoneyField(e.target)){ e.target.value = fmtNum(parseNum(e.target.value)); }
  });
  function esc(s){
    var d=document.createElement("div"); d.textContent=s; return d.innerHTML;
  }

  var DEFAULT_KELAS = {
    SD: ["1A An Na'im","1B Al Ma'wa","1C Al Adn","1D Darussalam"],
    SMP: ["Al Haytham","Al Khawarizmi","Ibnu Khaldun","Ibnu Rusyd","Ibnu Sina"]
  };

  function kelasKey(unit){ return "afKelasList_" + unit; }

  function loadKelasList(unit){
    var fallback = (DEFAULT_KELAS[unit] || []).slice();
    try {
      var l = JSON.parse(localStorage.getItem(kelasKey(unit)));
      return (l && l.length) ? l : fallback;
    } catch(e){ return fallback; }
  }
  function saveKelasList(unit, list){ localStorage.setItem(kelasKey(unit), JSON.stringify(list)); }

  function currentUnit(){ return document.getElementById("in-unit").value; }

  function renderKelasSelect(selected){
    var unit = currentUnit();
    var list = loadKelasList(unit);
    var sel = document.getElementById("in-kelas-select");
    sel.innerHTML = "";
    var noneOpt = document.createElement("option");
    noneOpt.value = "__none__"; noneOpt.textContent = "Belum Ada Kelas (Siswa Baru)";
    sel.appendChild(noneOpt);
    list.forEach(function(k){
      var opt = document.createElement("option");
      opt.value = k; opt.textContent = k;
      sel.appendChild(opt);
    });
    var addOpt = document.createElement("option");
    addOpt.value = "__add__"; addOpt.textContent = "+ Tambah Kelas Baru";
    sel.appendChild(addOpt);
    if(selected && list.indexOf(selected) === -1){
      list.push(selected); saveKelasList(unit, list);
      var opt2 = document.createElement("option");
      opt2.value = selected; opt2.textContent = selected;
      sel.insertBefore(opt2, addOpt);
    }
    sel.value = selected ? (list.indexOf(selected) > -1 ? selected : selected) : "__none__";
    document.getElementById("in-kelas").value = sel.value === "__none__" ? "" : sel.value;
  }

  function setKelasValue(v){
    renderKelasSelect(v);
  }

  renderKelasSelect(document.getElementById("in-kelas").value);

  document.getElementById("in-unit").addEventListener("change", function(){ renderKelasSelect(null); });

  document.getElementById("in-kelas-select").addEventListener("change", function(){
    var v = this.value;
    var newInput = document.getElementById("in-kelas-new");
    if(v === "__add__"){
      newInput.style.display = "block";
      newInput.value = "";
      newInput.focus();
    } else {
      newInput.style.display = "none";
      document.getElementById("in-kelas").value = v === "__none__" ? "" : v;
    }
  });

  document.getElementById("in-kelas-new").addEventListener("keydown", function(e){
    if(e.key === "Enter"){
      e.preventDefault();
      var v = this.value.trim();
      if(v){
        var unit = currentUnit();
        var list = loadKelasList(unit);
        if(list.indexOf(v) === -1){ list.push(v); saveKelasList(unit, list); }
        this.style.display = "none";
        renderKelasSelect(v);
      }
    }
  });

  var itemsBody = document.getElementById("in-items-body");

  function addRow(ket, jumlah){
    var tr = document.createElement("tr");
    tr.innerHTML =
      '<td><input class="f-ket" value="'+(ket||"")+'"></td>'+
      '<td><input class="f-jumlah" value="'+(jumlah||"0")+'"></td>'+
      '<td><button type="button" class="btn btn-danger" style="margin:0;padding:5px 10px;">&times;</button></td>';
    tr.querySelector("button").addEventListener("click", function(){ tr.remove(); });
    itemsBody.appendChild(tr);
  }

  addRow("SPP (Sumbangan Pembinaan Pendidikan)", "0");
  addRow("Uang Masuk / Uang Pangkal", "0");
  addRow("Ekskul (Kegiatan Ekstrakurikuler)", "0");
  addRow("UKT (Uang Kegiatan Tahunan)", "0");

  document.getElementById("btn-add-row").addEventListener("click", function(){ addRow("", "0"); });

  var bulanIndo = ["januari","februari","maret","april","mei","juni","juli","agustus","september","oktober","november","desember"];
  var bulanIndoCap = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  var bulanRomawi = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

  function bulanTahun(){
    var parts = document.getElementById("in-tanggal").value.trim().split(/\s+/);
    return parts.length >= 2 ? parts.slice(-2).join(" ") : document.getElementById("in-tanggal").value;
  }

  function buildInvoiceNo(unit){
    var parts = document.getElementById("in-tanggal").value.trim().split(/\s+/);
    var monthIdx = parts.length >= 2 ? bulanIndo.indexOf(parts[parts.length-2].toLowerCase()) : -1;
    var romawi = monthIdx >= 0 ? bulanRomawi[monthIdx] : bulanRomawi[new Date().getMonth()];
    var tahun = parts.length >= 1 ? parts[parts.length-1] : String(new Date().getFullYear());
    var urut = String(parseInt(document.getElementById("in-noUrut").value,10) || 0).padStart(4,"0");
    return urut + "/KWT/AF-" + unit + "/" + romawi + "/" + tahun;
  }

  function rebuildUntuk(){
    var checked = Array.prototype.slice.call(document.querySelectorAll(".untuk-chk:checked")).map(function(c){ return c.value; });
    var text = "";
    if(checked.length === 1){
      text = checked[0];
    } else if(checked.length > 1){
      text = checked.slice(0, -1).join(", ") + " & " + checked[checked.length - 1];
    }
    if(text) text += " bulan " + bulanTahun();
    document.getElementById("in-untuk").value = text;
  }

  document.querySelectorAll(".untuk-chk").forEach(function(chk){
    chk.addEventListener("change", rebuildUntuk);
  });
  document.getElementById("in-tanggal").addEventListener("input", rebuildUntuk);

  function generate(){
    var unit = document.getElementById("in-unit").value;
    var isKuitansi = true;

    var qrUrl = "https://" + (unit === "SD" ? "sdialfakhir.sch.id" : "smpialfakhir.sch.id");
    document.getElementById("out-qr").src = "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=" + encodeURIComponent(qrUrl);

    document.getElementById("out-doctitle").firstChild.textContent = "Bukti Pembayaran ";
    document.getElementById("out-doctitle-suffix").style.display = isKuitansi ? "none" : "";
    document.getElementById("tabel-rincian-wrap").style.display = isKuitansi ? "none" : "";
    document.getElementById("kuitansi-lines-wrap").style.display = isKuitansi ? "" : "none";

    document.getElementById("in-papersize-wrap").style.display = isKuitansi ? "" : "none";
    document.getElementById("papersize-note").style.display = isKuitansi ? "" : "none";
    var papersize = isKuitansi ? document.getElementById("in-papersize").value : "A4";
    var sheetEl = document.querySelector(".sheet");
    sheetEl.classList.toggle("a5", isKuitansi && papersize === "A5");
    sheetEl.classList.toggle("a4l", isKuitansi && papersize === "A4");
    document.getElementById("print-orientation").textContent = !isKuitansi
      ? "@page{size:A4 portrait;margin:0;}"
      : (papersize === "A5" ? "@page{size:A5 landscape;margin:0;}" : "@page{size:A4 landscape;margin:0;}");
    document.getElementById("out-papersize-note").textContent =
      isKuitansi ? (papersize === "A5" ? " Dicetak pada kertas A5 landscape (21 × 14,8 cm)." : " Dicetak pada kertas A4 landscape (29,7 × 21 cm).") : "";

    document.getElementById("out-rek-sd").classList.toggle("active", unit === "SD");
    document.getElementById("out-rek-smp").classList.toggle("active", unit === "SMP");

    document.getElementById("logo-sd").style.display = "";
    document.getElementById("logo-smp").style.display = "";
    document.getElementById("logo-divider-el").style.display = "";
    document.getElementById("watermark-sd").style.display = unit === "SD" ? "" : "none";
    document.getElementById("watermark-smp").style.display = unit === "SMP" ? "" : "none";
    document.getElementById("seal-sd").style.display = unit === "SD" ? "" : "none";
    document.getElementById("seal-smp").style.display = unit === "SMP" ? "" : "none";

    var nama = document.getElementById("in-nama").value;
    var kelas = document.getElementById("in-kelas").value;
    var untuk = document.getElementById("in-untuk").value;

    document.getElementById("out-nama").textContent = nama;
    document.getElementById("out-kelas").textContent = kelas;
    document.getElementById("out-invno").textContent = buildInvoiceNo(unit);
    document.getElementById("out-tanggal").textContent = document.getElementById("in-tanggal").value;
    document.getElementById("out-status").textContent = document.getElementById("in-status").value;
    document.getElementById("out-signdate").textContent = "Depok, " + document.getElementById("in-tanggal").value;

    var signer = sessionStorage.getItem("afKuitansiSigner") || "nurhidayati";
    var isMia = signer === "miaandini";
    document.getElementById("ttd-nurhidayati").style.display = isMia ? "none" : "";
    document.getElementById("ttd-mia").style.display = isMia ? "" : "none";
    document.getElementById("out-sign-name").textContent = isMia ? "Mia Andini Caniago, S.Ak." : "Nurhidayati, S.Pd.";

    document.getElementById("out-untuk-nama").textContent = nama || "(Siswa Baru)";
    document.getElementById("out-untuk-kelas").textContent = kelas;
    document.getElementById("out-untuk-kelas-wrap").style.display = kelas ? "" : "none";
    document.getElementById("out-untuk-line").style.display = (nama || kelas) ? "" : "none";

    var rows = itemsBody.querySelectorAll("tr");
    var outBody = document.getElementById("out-items-body");
    outBody.innerHTML = "";
    var subtotal = 0;
    var rincianRows = [];
    rows.forEach(function(row, i){
      var ket = row.querySelector(".f-ket").value;
      var jumlah = parseNum(row.querySelector(".f-jumlah").value);
      subtotal += jumlah;
      var tr = document.createElement("tr");
      tr.innerHTML = "<td>"+(i+1)+"</td><td>"+esc(ket)+"</td><td>"+fmtNum(jumlah)+"</td>";
      outBody.appendChild(tr);
      if(jumlah > 0){
        var namaSingkat = ket.split("(")[0].trim() || ket;
        rincianRows.push("<tr><td>"+(rincianRows.length+1)+"</td><td>"+esc(namaSingkat)+"</td><td class=\"kit-nominal\">Rp "+fmtNum(jumlah)+"</td></tr>");
      }
    });

    var potonganRaw = parseNum(document.getElementById("in-potongan").value);
    var potonganMode = document.getElementById("in-potongan-mode").value;
    var potongan = potonganMode === "pct" ? Math.round(subtotal * potonganRaw / 100) : potonganRaw;
    var grand = subtotal - potongan;

    document.getElementById("out-subtotal").textContent = fmtRp(subtotal);
    document.getElementById("out-potongan").textContent = fmtRp(potongan);
    document.getElementById("out-grand").textContent = fmtRp(grand);
    document.getElementById("out-jumlah-kuitansi").textContent = fmtRp(grand);
    document.getElementById("out-subtotal-row").style.display = potongan > 0 ? "" : "none";
    document.getElementById("out-potongan-row").style.display = potongan > 0 ? "" : "none";
    document.getElementById("out-subtotal-kuitansi").textContent = fmtRp(subtotal);
    document.getElementById("out-potongan-kuitansi").textContent = "-" + fmtRp(potongan);
    document.getElementById("out-rincian-kuitansi").innerHTML = rincianRows.join("");
    document.getElementById("out-terbilang").textContent = terbilang(grand) + " Rupiah";
    fitSheet();
  }

  document.getElementById("btn-generate").addEventListener("click", generate);
  function cleanFilenamePart(s){
    return String(s||"").trim().replace(/[\\/:*?"<>|]+/g,"");
  }

  document.getElementById("btn-print").addEventListener("click", function(){
    generate();
    saveHistory();
    localStorage.setItem("afInvoiceNoUrut", String((parseInt(document.getElementById("in-noUrut").value,10)||0) + 1));

    var nama = cleanFilenamePart(document.getElementById("in-nama").value || "Siswa");
    var unit = cleanFilenamePart(document.getElementById("in-unit").value || "");
    var tanggal = cleanFilenamePart(document.getElementById("in-tanggal").value || "").replace(/\s+/g,"-");
    var originalTitle = document.title;
    document.title = nama + " _" + unit + "_ " + tanggal;

    window.print();
    document.title = originalTitle;
  });

  var HISTORY_KEY = "afKuitansiHistory";

  function captureState(){
    var rows = Array.prototype.slice.call(itemsBody.querySelectorAll("tr")).map(function(row){
      return { ket: row.querySelector(".f-ket").value, jumlah: row.querySelector(".f-jumlah").value };
    });
    var checks = Array.prototype.slice.call(document.querySelectorAll(".untuk-chk")).map(function(c){ return c.checked; });
    return {
      papersize: document.getElementById("in-papersize").value,
      unit: document.getElementById("in-unit").value,
      nama: document.getElementById("in-nama").value,
      kelas: document.getElementById("in-kelas").value,
      noUrut: document.getElementById("in-noUrut").value,
      tanggal: document.getElementById("in-tanggal").value,
      status: document.getElementById("in-status").value,
      potongan: document.getElementById("in-potongan").value,
      potonganMode: document.getElementById("in-potongan-mode").value,
      untuk: document.getElementById("in-untuk").value,
      checks: checks,
      rows: rows
    };
  }

  function restoreState(s){
    document.getElementById("in-papersize").value = s.papersize;
    document.getElementById("in-unit").value = s.unit;
    document.getElementById("in-nama").value = s.nama;
    setKelasValue(s.kelas);
    document.getElementById("in-noUrut").value = s.noUrut;
    document.getElementById("in-tanggal").value = s.tanggal;
    document.getElementById("in-status").value = s.status;
    document.getElementById("in-potongan").value = s.potongan;
    document.getElementById("in-potongan-mode").value = s.potonganMode || "rp";
    document.getElementById("in-untuk").value = s.untuk;
    var chkEls = document.querySelectorAll(".untuk-chk");
    (s.checks||[]).forEach(function(v,i){ if(chkEls[i]) chkEls[i].checked = v; });
    itemsBody.innerHTML = "";
    (s.rows||[]).forEach(function(r){ addRow(r.ket, r.jumlah); });
    generate();
  }

  function loadHistory(){
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch(e){ return []; }
  }

  function saveHistory(){
    var list = loadHistory();
    list.unshift({
      ts: new Date().toISOString(),
      noKwt: document.getElementById("out-invno").textContent,
      nama: document.getElementById("in-nama").value,
      jumlah: document.getElementById("out-jumlah-kuitansi").textContent,
      oleh: sessionStorage.getItem("afKuitansiUserName") || "-",
      state: captureState()
    });
    if(list.length > 500) list = list.slice(0,500);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  }

  function renderRiwayat(){
    var list = loadHistory();
    var body = document.getElementById("riwayat-body");
    body.innerHTML = "";
    document.getElementById("riwayat-empty").style.display = list.length ? "none" : "block";
    list.forEach(function(item, i){
      var d = new Date(item.ts);
      var tgl = d.toLocaleDateString("id-ID") + " " + d.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});
      var tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #eee";
      tr.innerHTML =
        "<td style=\"padding:6px 8px;\">"+esc(tgl)+"</td>"+
        "<td style=\"padding:6px 8px;\">"+esc(item.nama)+"</td>"+
        "<td style=\"padding:6px 8px;\">"+esc(item.oleh||"-")+"</td>"+
        "<td style=\"padding:6px 8px;text-align:right;\">"+esc(item.jumlah)+"</td>"+
        "<td style=\"padding:6px 8px;white-space:nowrap;\">"+
          "<button type=\"button\" class=\"btn btn-secondary riwayat-buka\" style=\"padding:4px 10px;margin:0;\">Tampilkan</button>"+
        "</td>";
      tr.querySelector(".riwayat-buka").addEventListener("click", function(){
        restoreState(item.state);
        document.getElementById("riwayat-modal").style.display = "none";
      });
      body.appendChild(tr);
    });
  }

  document.getElementById("btn-riwayat").addEventListener("click", function(){
    renderRiwayat();
    document.getElementById("riwayat-modal").style.display = "flex";
  });
  document.getElementById("riwayat-close").addEventListener("click", function(){
    document.getElementById("riwayat-modal").style.display = "none";
  });

  // auto-isi tanggal hari ini & no urut lanjutan, tetap bisa diedit manual
  var today = new Date();
  document.getElementById("in-tanggal").value = today.getDate() + " " + bulanIndoCap[today.getMonth()] + " " + today.getFullYear();
  document.getElementById("in-noUrut").value = localStorage.getItem("afInvoiceNoUrut") || "1";
  rebuildUntuk();

  // autosave draft supaya data gak hilang kalau refresh/nutup tab gak sengaja
  var DRAFT_KEY = "afDraftState";
  var draftTimer = null;
  function saveDraft(){
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function(){
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(captureState())); } catch(e){}
    }, 300);
  }
  document.querySelector(".toolbar").addEventListener("input", saveDraft);
  document.querySelector(".toolbar").addEventListener("change", saveDraft);

  var draft = null;
  try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch(e){}
  if(draft){
    var todayStr = document.getElementById("in-tanggal").value;
    restoreState(draft);
    if(draft.tanggal !== todayStr){ document.getElementById("in-tanggal").value = todayStr; }
  }

  generate();

  // auto-scale preview sheet biar pas di layar hp/tablet
  function fitSheet(){
    var wrap = document.querySelector(".sheet-scroll");
    var sheet = document.querySelector(".sheet");
    if(!wrap || !sheet) return;
    sheet.style.transform = "";
    var natural = sheet.getBoundingClientRect().width;
    var avail = wrap.clientWidth;
    var scale = avail < natural ? avail / natural : 1;
    sheet.style.transform = scale < 1 ? "scale(" + scale + ")" : "";
    wrap.style.height = scale < 1 ? (sheet.getBoundingClientRect().height * scale) + "px" : "";
  }
  window.addEventListener("resize", fitSheet);
  window.addEventListener("load", fitSheet);
  fitSheet();
})();
