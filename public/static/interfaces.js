(() => {
  const designs = {
    elias: { brand: "AI Jukebox", kicker: "", welcome: "", description: "" },
    james: { brand: "Midnight Radio", kicker: "YOUR PERSONAL AI MUSIC STUDIO", welcome: "Music for your kind of day.", description: "Pick a genre. Make it yours. Let the DJ handle the rest." },
    oliver: { brand: "Afterhours", kicker: "YOUR PERSONAL FREQUENCY", welcome: "Meet your new favorite song.", description: "A little inspiration. A sound that's yours. Stay a while." },
  };
  const selector = document.getElementById("interface-select");
  function apply(choice) {
    const design = designs[choice] || designs.elias;
    document.documentElement.dataset.interface = choice;
    selector.value = choice;
    for (const [id, value] of Object.entries({"ui-brand": design.brand, "ui-kicker": design.kicker, "ui-welcome": design.welcome, "ui-description": design.description})) document.getElementById(id).textContent = value;
    document.title = design.brand + " · AI Jukebox";
  }
  apply(document.documentElement.dataset.interface);
  selector.addEventListener("change", () => {
    apply(selector.value);
    try { localStorage.setItem("jukebox-interface", selector.value); } catch {}
  });
  document.querySelectorAll("[data-design-style]").forEach(button => button.addEventListener("click", () => {
    document.getElementById("f-style").value = button.dataset.designStyle;
    document.getElementById("f-mood").value = button.dataset.designMood;
    document.getElementById("home-create").click();
  }));
})();
