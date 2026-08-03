(function(){
  // Auto-bypass: user sudah login via sistem alfakhir
  var gate = document.getElementById("login-gate");
  if(gate) gate.style.display = "none";
  sessionStorage.setItem("afKuitansiAuth", "1");
  sessionStorage.setItem("afKuitansiUserName", "Admin Keuangan");
  sessionStorage.setItem("afKuitansiSigner", "kuitansi.alfakhir");
  document.addEventListener("DOMContentLoaded", function(){
    var gb = document.getElementById("btn-generate");
    if(gb) gb.click();
    var lo = document.getElementById("btn-logout");
    if(lo) lo.style.display = "none";
  });
})();
