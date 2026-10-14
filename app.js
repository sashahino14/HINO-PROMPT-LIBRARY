/* =========================================================
   THE PROMPTS CITY
   APPLICATION PRINCIPALE
   Sans authentification
========================================================= */


/* =========================================================
   ÉTAT GLOBAL
========================================================= */

const state = {
  index: null,
  all: [],
  filtered: [],
  category: "all",
  query: "",
  page: 1,
  perPage: 24,
  chunks: new Map(),
  current: null
};


const $ = id => document.getElementById(id);


/* =========================================================
   INITIALISATION
========================================================= */

async function init() {
  try {
    const response = await fetch("./data/index.json");

    if (!response.ok) {
      throw new Error("Index HTTP " + response.status);
    }

    state.index = await response.json();
    state.all = state.index.prompts || [];

    $("total").textContent = Number(
      state.index.total || state.all.length
    ).toLocaleString("fr-FR");

    const categories = buildCategoryCounts(state.all);

    $("categories-count").textContent =
      Object.keys(categories).length;

    buildCategories(categories);
    filter();

  } catch (error) {
    console.error("Erreur initialisation :", error);
    $("results").textContent =
      "Impossible de charger la bibliothèque.";
  }
}


/* =========================================================
   CATÉGORIES
========================================================= */

function buildCategoryCounts(prompts) {
  const counts = {};

  for (const prompt of prompts) {
    const category = prompt.category || "Sans catégorie";
    counts[category] = (counts[category] || 0) + 1;
  }

  return Object.fromEntries(
    Object.entries(counts).sort((a, b) => b[1] - a[1])
  );
}


function buildCategories(categories) {
  const box = $("categories");
  box.innerHTML = "";

  const all = document.createElement("button");
  all.className = "category active";
  all.textContent = "Toutes";
  all.dataset.category = "all";

  all.onclick = () => {
    state.category = "all";
    filter();
  };

  box.appendChild(all);

  for (const [name, count] of Object.entries(categories)) {
    const button = document.createElement("button");

    button.className = "category";
    button.dataset.category = name;
    button.textContent =
      `${name} · ${Number(count).toLocaleString("fr-FR")}`;

    button.onclick = () => {
      state.category = name;
      filter();
    };

    box.appendChild(button);
  }
}


/* =========================================================
   NORMALISATION
========================================================= */

function normalize(value) {
  return String(value || "")
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}


/* =========================================================
   FILTRAGE
========================================================= */

function filter() {
  const query = normalize(state.query);

  state.filtered = state.all.filter(prompt => {
    if (
      state.category !== "all" &&
      prompt.category !== state.category
    ) {
      return false;
    }

    if (!query) {
      return true;
    }

    return normalize([
      prompt.title,
      prompt.description,
      prompt.category
    ].join(" ")).includes(query);
  });

  state.page = 1;
  render();
}


/* =========================================================
   RENDU
========================================================= */

async function render() {
  document.querySelectorAll(".category").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.category === state.category
    );
  });

  const total = state.filtered.length;

  const pages = Math.max(
    1,
    Math.ceil(total / state.perPage)
  );

  const start = (state.page - 1) * state.perPage;

  const visible = state.filtered.slice(
    start,
    start + state.perPage
  );

  const grid = $("grid");
  grid.innerHTML = "";

  $("empty").classList.toggle(
    "hidden",
    visible.length !== 0
  );

  for (const prompt of visible) {
    const card = createCard(prompt);
    grid.appendChild(card);

    // Enrichissement asynchrone des cartes.
    enrichCard(card, prompt);
  }

  $("results").textContent =
    `${total.toLocaleString("fr-FR")} résultat${total > 1 ? "s" : ""}`;

  pagination(pages);
}


/* =========================================================
   CARTE
========================================================= */

function createCard(prompt) {
  const card = document.createElement("article");
  card.className = "card";

  const media = getMedia(prompt);

  if (media.length) {
    addCardImage(card, prompt, media[0]);
  }

  const category = document.createElement("div");
  category.className = "card-category";
  category.textContent = prompt.category || "Sans catégorie";

  const title = document.createElement("h3");
  title.textContent = prompt.title || "Prompt sans titre";

  const description = document.createElement("p");
  description.textContent = prompt.description || "Prompt IA.";

  const footer = document.createElement("div");
  footer.className = "card-footer";

  const view = document.createElement("button");
  view.className = "view";
  view.textContent = "Voir le prompt";
  view.onclick = () => openPrompt(prompt);

  footer.appendChild(view);
  card.append(category, title, description, footer);

  return card;
}


/* =========================================================
   ENRICHISSEMENT DES CARTES
========================================================= */

async function enrichCard(card, prompt) {
  if (getMedia(prompt).length || !prompt.chunk) {
    return;
  }

  try {
    const data = await getChunk(prompt.chunk);

    const current = findPromptInChunk(data, prompt.id);

    if (!current) {
      return;
    }

    const media = getMedia(current);

    if (!media.length || card.querySelector(".card-image")) {
      return;
    }

    addCardImage(card, current, media[0]);

  } catch (error) {
    console.error(
      "Impossible de charger le média :",
      prompt.id,
      error
    );
  }
}


/* =========================================================
   IMAGE CARTE
========================================================= */

function addCardImage(card, prompt, url) {
  const imageContainer = document.createElement("div");
  imageContainer.className = "card-image";

  const image = document.createElement("img");
  image.src = url;
  image.alt = prompt.title || "Illustration du prompt";
  image.loading = "lazy";
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";

  image.onerror = () => {
    imageContainer.remove();
  };

  imageContainer.appendChild(image);
  card.prepend(imageContainer);
}


/* =========================================================
   MÉDIAS
========================================================= */

function getMedia(prompt) {
  if (!prompt) {
    return [];
  }

  const media = prompt.source_media;

  if (!media) {
    return [];
  }

  if (typeof media === "string") {
    return [media];
  }

  if (Array.isArray(media)) {
    return media.filter(Boolean);
  }

  return [];
}


/* =========================================================
   CHUNKS
========================================================= */

async function getChunk(name) {
  if (state.chunks.has(name)) {
    return state.chunks.get(name);
  }

  const response = await fetch("./data/chunks/" + name);

  if (!response.ok) {
    throw new Error("Chunk HTTP " + response.status);
  }

  const data = await response.json();

  state.chunks.set(name, data);

  return data;
}


/* =========================================================
   RECHERCHE DANS UN CHUNK
========================================================= */

function findPromptInChunk(data, id) {
  if (Array.isArray(data)) {
    return data.find(item => item.id === id);
  }

  if (data && Array.isArray(data.prompts)) {
    return data.prompts.find(item => item.id === id);
  }

  if (data && data[id]) {
    return data[id];
  }

  return null;
}


/* =========================================================
   OUVERTURE DU PROMPT
========================================================= */

async function openPrompt(prompt) {
  try {
    let data = null;

    if (prompt.chunk) {
      data = await getChunk(prompt.chunk);
    }

    let current = findPromptInChunk(data, prompt.id);

    if (!current) {
      current = prompt;
    }

    state.current = current;

    $("modal-category").textContent = current.category || "";
    $("modal-title").textContent =
      current.title || "Prompt sans titre";
    $("modal-description").textContent =
      current.description || "";
    $("modal-content").textContent =
      current.content || current.prompt || "";
    $("modal-meta").textContent =
      current.source ? `Source : ${current.source}` : "";

    renderModalMedia(current);

    $("modal").classList.remove("hidden");
    document.body.style.overflow = "hidden";

  } catch (error) {
    console.error(error);
    alert("Impossible de charger ce prompt.");
  }
}


/* =========================================================
   IMAGE MODALE
========================================================= */

function renderModalMedia(prompt) {
  const container = $("modal-image-container");
  const image = $("modal-image");
  const counter = $("modal-image-count");

  const media = getMedia(prompt);

  if (!media.length) {
    container.classList.add("hidden");
    image.src = "";
    counter.textContent = "";
    return;
  }

  image.src = media[0];
  image.alt = prompt.title || "Illustration du prompt";
  image.referrerPolicy = "no-referrer";

  image.onerror = () => {
    container.classList.add("hidden");
  };

  counter.textContent =
    media.length > 1 ? `${media.length} images` : "";

  container.classList.remove("hidden");
}


/* =========================================================
   FERMETURE MODALE
========================================================= */

function closeModal() {
  $("modal").classList.add("hidden");
  document.body.style.overflow = "";
}


/* =========================================================
   PAGINATION
========================================================= */

function pagination(pages) {
  const box = $("pagination");
  box.innerHTML = "";

  if (pages <= 1) {
    return;
  }

  function button(text, page, active = false) {
    const element = document.createElement("button");

    element.className = "page" + (active ? " active" : "");
    element.textContent = text;

    element.onclick = () => {
      state.page = page;
      render();

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    };

    box.appendChild(element);
  }

  if (state.page > 1) {
    button("‹", state.page - 1);
  }

  let start = Math.max(1, state.page - 3);
  let end = Math.min(pages, start + 6);

  if (end - start < 6) {
    start = Math.max(1, end - 6);
  }

  for (let page = start; page <= end; page++) {
    button(page, page, page === state.page);
  }

  if (state.page < pages) {
    button("›", state.page + 1);
  }
}


/* =========================================================
   RECHERCHE
========================================================= */

$("search").addEventListener("input", event => {
  state.query = event.target.value;
  filter();
});


/* =========================================================
   RANDOM
========================================================= */

$("random").onclick = () => {
  if (!state.all.length) {
    return;
  }

  const prompt = state.all[
    Math.floor(Math.random() * state.all.length)
  ];

  openPrompt(prompt);
};


/* =========================================================
   MODALE PROMPT
========================================================= */

$("close").onclick = closeModal;
$("backdrop").onclick = closeModal;


/* =========================================================
   COPIE
========================================================= */

$("copy").onclick = async () => {
  if (!state.current) {
    return;
  }

  const content =
    state.current.content ||
    state.current.prompt ||
    "";

  try {
    await navigator.clipboard.writeText(content);

    $("toast").classList.add("show");

    setTimeout(() => {
      $("toast").classList.remove("show");
    }, 1600);

  } catch (error) {
    console.error(error);
  }
};


/* =========================================================
   RACCOURCIS CLAVIER
========================================================= */

document.addEventListener("keydown", event => {
  if (
    event.key === "/" &&
    document.activeElement.tagName !== "INPUT"
  ) {
    event.preventDefault();
    $("search").focus();
  }

  if (event.key === "Escape") {
    closeModal();
  }
});


/* =========================================================
   DÉMARRAGE APPLICATION
========================================================= */

init();