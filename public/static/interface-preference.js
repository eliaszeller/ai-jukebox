(() => {
  let choice = "elias";
  try { choice = localStorage.getItem("jukebox-interface") || choice; } catch {}
  document.documentElement.dataset.interface = ["elias", "james", "oliver"].includes(choice) ? choice : "elias";
})();
