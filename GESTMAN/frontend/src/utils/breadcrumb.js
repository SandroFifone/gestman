// Funzione di utilità per generare la sequenza breadcrumb in base allo stato
export function getBreadcrumbItems({ page, selectedCivico }) {
  const items = ["Home"];
  if (page === "assets" && selectedCivico) {
    items.push("Civici");
    items.push("Assets");
  } else if (page === "assets") {
    items.push("Civici");
  } else if (page === "users") {
    items.push("Utenti");
  }
  // Espandibile per altre sezioni
  return items;
}
