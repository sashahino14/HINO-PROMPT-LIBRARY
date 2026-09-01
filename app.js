/* =========================================================
THE PROMPTS CITY
APPLICATION PRINCIPALE + AUTHENTIFICATION SUPABASE
Google + GitHub + Email
Apple exclu
========================================================= */


/* =========================================================
SUPABASE
========================================================= */

const SUPABASE_URL =
  "https://ifvpspvvshefjbjfaquk.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_n-2p9FipWg9pdZtbYV1qXQ_zznheM1S";

const supabaseClient =
  window.supabase &&
  typeof window.supabase.createClient === "function"
    ? window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      )
    : null;


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
  current: null,
  authMode: "login"
};


const $ = id =>
  document.getElementById(id);


/* =========================================================
INITIALISATION
========================================================= */

async function init() {

  try {

    const response =
      await fetch("./data/index.json");

    if (!response.ok) {

      throw new Error(
        "Index HTTP " + response.status
      );

    }

    state.index =
      await response.json();

    state.all =
      state.index.prompts || [];


    $("total").textContent =
      Number(
        state.index.total ||
        state.all.length
      ).toLocaleString("fr-FR");


    /*
     * L'index possède déjà la catégorie
     * de chaque prompt.
     */

    const categories =
      buildCategoryCounts(
        state.all
      );


    $("categories-count").textContent =
      Object.keys(categories).length;


    buildCategories(
      categories
    );


    filter();


  } catch (error) {

    console.error(
      "Erreur initialisation :",
      error
    );


    $("results").textContent =
      "Impossible de charger la bibliothèque.";

  }

}


/* =========================================================
CATÉGORIES
========================================================= */

const VIDEO_TERMS = [
  "video",
  "vidéo",
  "text-to-video",
  "image-to-video",
  "text to video",
  "image to video",
  "cinematic video",
  "video generation",
  "génération vidéo",
  "video prompt",
  "prompt vidéo",
  "animation video",
  "ai video",
  "vidéo ia"
];

const VIDEO_MODELS = [
  ["kling", "Kling"],
  ["wan", "Wan"],
  ["vidu", "Vidu"],
  ["veo", "Veo"],
  ["runway", "Runway"],
  ["hailuo", "Hailuo"],
  ["pika", "Pika"],
  ["seedance", "Seedance"],
  ["sora", "Sora"],
  ["luma", "Luma"],
  ["dream machine", "Luma Dream Machine"],
  ["minimax", "MiniMax"]
];


function getPromptSearchText(prompt) {

  return normalize(
    [
      prompt.title,
      prompt.description,
      prompt.category,
      prompt.content,
      prompt.prompt,
      prompt.source,
      prompt.model,
      prompt.tool
    ]
      .filter(Boolean)
      .join(" ")
  );

}


function isVideoPrompt(prompt) {

  const text =
    getPromptSearchText(prompt);

  return VIDEO_TERMS.some(
    term =>
      text.includes(
        normalize(term)
      )
  ) || VIDEO_MODELS.some(
    ([term]) =>
      text.includes(
        normalize(term)
      )
  );

}


function getVideoModels(prompt) {

  const text =
    getPromptSearchText(prompt);

  return VIDEO_MODELS
    .filter(
      ([term]) =>
        text.includes(
          normalize(term)
        )
    )
    .map(
      ([, name]) =>
        name
    );

}


function getVideoPromptCount(prompts) {

  return prompts.filter(
    isVideoPrompt
  ).length;

}


function buildCategoryCounts(prompts) {

  const counts = {};


  for (const prompt of prompts) {

    const category =
      prompt.category ||
      "Sans catégorie";


    counts[category] =
      (counts[category] || 0) + 1;

  }


  return Object.fromEntries(
    Object.entries(counts)
      .sort(
        (a, b) => b[1] - a[1]
      )
  );

}


function buildCategories(categories) {

  const box =
    $("categories");


  box.innerHTML = "";


  const all =
    document.createElement("button");


  all.className =
    "category active";


  all.textContent =
    "Toutes";


  all.dataset.category =
    "all";


  all.onclick = () => {

    state.category =
      "all";

    filter();

  };


  box.appendChild(
    all
  );


  /* =========================
     FILTRE VIDÉO
     ========================= */

  const videoCount =
    getVideoPromptCount(
      state.all
    );


  const videoButton =
    document.createElement(
      "button"
    );


  videoButton.className =
    "category";


  videoButton.dataset.category =
    "__video__";


  videoButton.textContent =
    `Vidéo · ${videoCount.toLocaleString("fr-FR")}`;


  videoButton.onclick = () => {

    state.category =
      "__video__";

    filter();

  };


  box.appendChild(
    videoButton
  );


  for (
    const [name, count]
    of Object.entries(categories)
  ) {

    const button =
      document.createElement("button");


    button.className =
      "category";


    button.dataset.category =
      name;


    button.textContent =
      `${getCategoryLabel(name)} · ${Number(count).toLocaleString("fr-FR")}`;


    button.onclick = () => {

      state.category =
        name;

      filter();

    };


    box.appendChild(
      button
    );

  }

}


/* =========================================================
NORMALISATION
========================================================= */

function normalize(value) {

  return String(value || "")
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );

}



/* =========================================================
TRADUCTION DES MÉTADONNÉES — FRANÇAIS
Les prompts eux-mêmes restent dans leur langue originale.
========================================================= */

const CATEGORY_LABELS_FR = {
  "Product Marketing": "Marketing produit",
  "Social Media": "Réseaux sociaux",
  "Profile / Avatar": "Profil / Avatar",
  "Others": "Autres",
  "Poster / Flyer": "Affiche / Flyer",
  "Comic / Storyboard": "BD / Storyboard",
  "E-commerce": "E-commerce",
  "Game Asset": "Ressources de jeu",
  "Infographic / Educational": "Infographie / Éducation",
  "App / Web Design": "Design d'applications / Web",
  "YouTube Thumbnail": "Miniature YouTube"
};

function getCategoryLabel(category) {

  if (!category) {
    return "Sans catégorie";
  }

  return (
    CATEGORY_LABELS_FR[category] ||
    category
  );
}

/* =========================================================
FILTRAGE
========================================================= */

function filter() {

  const query =
    normalize(
      state.query
    );


  state.filtered =
    state.all.filter(
      prompt => {

        if (
          state.category === "__video__"
        ) {

          if (!isVideoPrompt(prompt)) {

            return false;

          }

        } else if (
          state.category !== "all" &&
          prompt.category !==
            state.category
        ) {

          return false;

        }


        if (!query) {

          return true;

        }


        return getPromptSearchText(
          prompt
        ).includes(
          query
        );

      }
    );


  state.page =
    1;


  render();

}


/* =========================================================
RENDU
========================================================= */

async function render() {

  document
    .querySelectorAll(".category")
    .forEach(
      button => {

        button.classList.toggle(
          "active",
          button.dataset.category ===
            state.category
        );

      }
    );


  const total =
    state.filtered.length;


  const pages =
    Math.max(
      1,
      Math.ceil(
        total /
        state.perPage
      )
    );


  const start =
    (state.page - 1) *
    state.perPage;


  const visible =
    state.filtered.slice(
      start,
      start + state.perPage
    );


  const grid =
    $("grid");


  grid.innerHTML =
    "";


  $("empty").classList.toggle(
    "hidden",
    visible.length !== 0
  );


  /*
   * Les cartes sont affichées
   * immédiatement.
   */

  for (
    const prompt
    of visible
  ) {

    const card =
      createCard(
        prompt
      );


    grid.appendChild(
      card
    );


    /*
     * On ne bloque surtout pas
     * le rendu principal.
     */

    enrichCard(
      card,
      prompt
    );

  }


  $("results").textContent =
    `${total.toLocaleString("fr-FR")} résultat${total > 1 ? "s" : ""}`;


  pagination(
    pages
  );

}


/* =========================================================
CARTE
========================================================= */

function createCard(prompt) {

  const card =
    document.createElement(
      "article"
    );


  card.className =
    "card";


  /*
   * L'index peut déjà contenir
   * une image.
   */

  const media =
    getMedia(
      prompt
    );


  if (media.length) {

    addCardImage(
      card,
      prompt,
      media[0]
    );

  }


  const category =
    document.createElement(
      "div"
    );


  category.className =
    "card-category";


  /* =========================
     BADGE VIDÉO
     ========================= */

  if (isVideoPrompt(prompt)) {

    const videoBadge =
      document.createElement(
        "span"
      );


    videoBadge.textContent =
      "VIDÉO";


    videoBadge.style.display =
      "inline-block";


    videoBadge.style.marginLeft =
      "8px";


    videoBadge.style.padding =
      "3px 8px";


    videoBadge.style.borderRadius =
      "999px";


    videoBadge.style.background =
      "#111";


    videoBadge.style.color =
      "#fff";


    videoBadge.style.fontSize =
      "10px";


    videoBadge.style.fontWeight =
      "700";


    videoBadge.style.letterSpacing =
      ".04em";


    category.appendChild(
      videoBadge
    );


    const videoModels =
      getVideoModels(
        prompt
      );


    if (videoModels.length) {

      const model =
        document.createElement(
          "span"
        );


      model.textContent =
        videoModels.join(
          " · "
        );


      model.style.marginLeft =
        "7px";


      model.style.fontSize =
        "11px";


      model.style.fontWeight =
        "600";


      model.style.opacity =
        ".65";


      category.appendChild(
        model
      );

    }

  }


  category.textContent =
    getCategoryLabel(prompt.category);


  const title =
    document.createElement(
      "h3"
    );


  title.textContent =
    prompt.title ||
    "Prompt sans titre";


  const description =
    document.createElement(
      "p"
    );


  description.textContent =
    prompt.description ||
    "Prompt IA.";


  const footer =
    document.createElement(
      "div"
    );


  footer.className =
    "card-footer";


  const view =
    document.createElement(
      "button"
    );


  view.className =
    "view";


  view.textContent =
    "Voir le prompt";


  view.onclick =
    () =>
      openPrompt(
        prompt
      );


  footer.appendChild(
    view
  );


  card.append(
    category,
    title,
    description,
    footer
  );


  return card;

}


/* =========================================================
ENRICHISSEMENT DES CARTES
========================================================= */

async function enrichCard(
  card,
  prompt
) {

  /*
   * Si le prompt possède déjà
   * un média, inutile de charger
   * son chunk.
   */

  if (
    getMedia(prompt).length
  ) {

    return;

  }


  if (!prompt.chunk) {

    return;

  }


  try {

    const data =
      await getChunk(
        prompt.chunk
      );


    const current =
      findPromptInChunk(
        data,
        prompt.id
      );


    if (!current) {

      return;

    }


    const media =
      getMedia(
        current
      );


    if (!media.length) {

      return;

    }


    /*
     * Évite les doublons.
     */

    if (
      card.querySelector(
        ".card-image"
      )
    ) {

      return;

    }


    addCardImage(
      card,
      current,
      media[0]
    );


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

function addCardImage(
  card,
  prompt,
  url
) {

  const imageContainer =
    document.createElement(
      "div"
    );


  imageContainer.className =
    "card-image";


  const image =
    document.createElement(
      "img"
    );


  image.src =
    url;


  image.alt =
    prompt.title ||
    "Illustration du prompt";


  image.loading =
    "lazy";


  image.decoding =
    "async";


  image.referrerPolicy =
    "no-referrer";


  image.onerror =
    () => {

      imageContainer.remove();

    };


  imageContainer.appendChild(
    image
  );


  /*
   * Insérer l'image
   * au début de la carte.
   */

  card.prepend(
    imageContainer
  );

}


/* =========================================================
MÉDIAS
========================================================= */

function getMedia(prompt) {

  if (!prompt) {

    return [];

  }


  const media =
    prompt.source_media;


  if (!media) {

    return [];

  }


  if (
    typeof media === "string"
  ) {

    return [
      media
    ];

  }


  if (
    Array.isArray(media)
  ) {

    return media.filter(
      Boolean
    );

  }


  return [];

}


/* =========================================================
CHUNKS
========================================================= */

async function getChunk(name) {

  if (
    state.chunks.has(name)
  ) {

    return state.chunks.get(
      name
    );

  }


  const response =
    await fetch(
      "./data/chunks/" + name
    );


  if (!response.ok) {

    throw new Error(
      "Chunk HTTP " +
      response.status
    );

  }


  const data =
    await response.json();


  state.chunks.set(
    name,
    data
  );


  return data;

}


/* =========================================================
RECHERCHE DANS UN CHUNK
========================================================= */

function findPromptInChunk(
  data,
  id
) {

  if (
    Array.isArray(data)
  ) {

    return data.find(
      item => item.id === id
    );

  }


  if (
    data &&
    Array.isArray(
      data.prompts
    )
  ) {

    return data.prompts.find(
      item => item.id === id
    );

  }


  if (
    data &&
    data[id]
  ) {

    return data[id];

  }


  return null;

}


/* =========================================================
OUVERTURE DU PROMPT
========================================================= */

async function openPrompt(
  prompt
) {

  try {

    let data =
      null;


    if (
      prompt.chunk
    ) {

      data =
        await getChunk(
          prompt.chunk
        );

    }


    let current =
      findPromptInChunk(
        data,
        prompt.id
      );


    if (!current) {

      current =
        prompt;

    }


    state.current =
      current;


    $("modal-category").textContent =
      current.category ||
      "";


    $("modal-title").textContent =
      current.title ||
      "Prompt sans titre";


    $("modal-description").textContent =
      current.description ||
      "";


    $("modal-content").textContent =
      current.content ||
      current.prompt ||
      "";


    $("modal-meta").textContent =
      current.source
        ? `Source : ${current.source}`
        : "";


    renderModalMedia(
      current
    );


    $("modal").classList.remove(
      "hidden"
    );


    document.body.style.overflow =
      "hidden";


  } catch (error) {

    console.error(
      error
    );


    alert(
      "Impossible de charger ce prompt."
    );

  }

}


/* =========================================================
IMAGE MODALE
========================================================= */

function renderModalMedia(
  prompt
) {

  const container =
    $("modal-image-container");


  const image =
    $("modal-image");


  const counter =
    $("modal-image-count");


  const media =
    getMedia(
      prompt
    );


  if (!media.length) {

    container.classList.add(
      "hidden"
    );


    image.src =
      "";


    counter.textContent =
      "";


    return;

  }


  image.src =
    media[0];


  image.alt =
    prompt.title ||
    "Illustration du prompt";


  image.referrerPolicy =
    "no-referrer";


  image.onerror =
    () => {

      container.classList.add(
        "hidden"
      );

    };


  if (
    media.length > 1
  ) {

    counter.textContent =
      `${media.length} images`;

  } else {

    counter.textContent =
      "";

  }


  container.classList.remove(
    "hidden"
  );

}


/* =========================================================
FERMETURE MODALE
========================================================= */

function closeModal() {

  $("modal").classList.add(
    "hidden"
  );


  document.body.style.overflow =
    "";

}


/* =========================================================
PAGINATION
========================================================= */

function pagination(
  pages
) {

  const box =
    $("pagination");


  box.innerHTML =
    "";


  if (
    pages <= 1
  ) {

    return;

  }


  function button(
    text,
    page,
    active = false
  ) {

    const button =
      document.createElement(
        "button"
      );


    button.className =
      "page" +
      (
        active
          ? " active"
          : ""
      );


    button.textContent =
      text;


    button.onclick =
      () => {

        state.page =
          page;


        render();


        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });

      };


    box.appendChild(
      button
    );

  }


  if (
    state.page > 1
  ) {

    button(
      "‹",
      state.page - 1
    );

  }


  let start =
    Math.max(
      1,
      state.page - 3
    );


  let end =
    Math.min(
      pages,
      start + 6
    );


  if (
    end - start < 6
  ) {

    start =
      Math.max(
        1,
        end - 6
      );

  }


  for (
    let page = start;
    page <= end;
    page++
  ) {

    button(
      page,
      page,
      page === state.page
    );

  }


  if (
    state.page < pages
  ) {

    button(
      "›",
      state.page + 1
    );

  }

}


/* =========================================================
RECHERCHE
========================================================= */

$("search").addEventListener(
  "input",
  event => {

    state.query =
      event.target.value;


    filter();

  }
);


/* =========================================================
RANDOM
========================================================= */

$("random").onclick =
  () => {

    if (
      !state.all.length
    ) {

      return;

    }


    const prompt =
      state.all[
        Math.floor(
          Math.random() *
          state.all.length
        )
      ];


    openPrompt(
      prompt
    );

  };


/* =========================================================
MODALE PROMPT
========================================================= */

$("close").onclick =
  closeModal;


$("backdrop").onclick =
  closeModal;


/* =========================================================
COPIE
========================================================= */

$("copy").onclick =
  async () => {

    if (
      !state.current
    ) {

      return;

    }


    const content =
      state.current.content ||
      state.current.prompt ||
      "";


    try {

      await navigator.clipboard.writeText(
        content
      );


      $("toast").classList.add(
        "show"
      );


      setTimeout(
        () =>
          $("toast").classList.remove(
            "show"
          ),
        1600
      );


    } catch (error) {

      console.error(
        error
      );

    }

  };


/* =========================================================
RACCOURCIS CLAVIER
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "/" &&
      document.activeElement.tagName !== "INPUT"
    ) {

      event.preventDefault();


      $("search").focus();

    }


    if (
      event.key === "Escape"
    ) {

      closeModal();

      closeAuthModal();

    }

  }
);


/* =========================================================
=========================================================
AUTHENTIFICATION SUPABASE
=========================================================
========================================================= */


/* =========================================================
ÉLÉMENTS AUTH
========================================================= */

const authButton =
  $("auth-button");


const authUser =
  $("auth-user");


const authUserEmail =
  $("auth-user-email");


const logoutButton =
  $("logout-button");


const authModal =
  $("auth-modal");


const authBackdrop =
  $("auth-backdrop");


const authClose =
  $("auth-close");


const authTitle =
  $("auth-title");


const authForm =
  $("auth-form");


const authEmail =
  $("auth-email");


const authPassword =
  $("auth-password");


const authSubmit =
  $("auth-submit");


const authSwitch =
  $("auth-switch");


const authSwitchText =
  $("auth-switch-text");


const googleLogin =
  $("google-login");


const githubLogin =
  $("github-login");


const authError =
  $("auth-error");


const authSuccess =
  $("auth-success");


/* =========================================================
VÉRIFICATION DES ÉLÉMENTS AUTH
========================================================= */

const authElementsAvailable =
  Boolean(
    authButton &&
    authUser &&
    authUserEmail &&
    logoutButton &&
    authModal &&
    authBackdrop &&
    authClose &&
    authTitle &&
    authForm &&
    authEmail &&
    authPassword &&
    authSubmit &&
    authSwitch &&
    authSwitchText &&
    googleLogin &&
    githubLogin &&
    authError &&
    authSuccess
  );


/* =========================================================
MESSAGES AUTH
========================================================= */

function showAuthError(
  message
) {

  if (
    !authError ||
    !authSuccess
  ) {

    return;

  }


  authError.textContent =
    message;


  authError.style.display =
    "block";


  authSuccess.style.display =
    "none";

}


function showAuthSuccess(
  message
) {

  if (
    !authSuccess ||
    !authError
  ) {

    return;

  }


  authSuccess.textContent =
    message;


  authSuccess.style.display =
    "block";


  authError.style.display =
    "none";

}


function clearAuthMessages() {

  if (authError) {

    authError.textContent =
      "";

    authError.style.display =
      "none";

  }


  if (authSuccess) {

    authSuccess.textContent =
      "";

    authSuccess.style.display =
      "none";

  }

}


/* =========================================================
OUVRIR AUTH
========================================================= */

function openAuthModal(
  mode = "login"
) {

  if (
    !authModal ||
    !authEmail
  ) {

    return;

  }


  state.authMode =
    mode;


  updateAuthMode();


  clearAuthMessages();


  authModal.classList.remove(
    "hidden"
  );


  document.body.style.overflow =
    "hidden";


  setTimeout(
    () => {

      authEmail.focus();

    },
    50
  );

}


/* =========================================================
FERMER AUTH
========================================================= */

function closeAuthModal() {

  if (
    !authModal
  ) {

    return;

  }


  authModal.classList.add(
    "hidden"
  );


  document.body.style.overflow =
    "";


  clearAuthMessages();

}


/* =========================================================
MODE LOGIN / SIGNUP
========================================================= */

function updateAuthMode() {

  if (
    !authTitle ||
    !authSubmit ||
    !authSwitch ||
    !authSwitchText ||
    !authPassword
  ) {
    return;
  }

  const login =
    state.authMode === "login";


  if (login) {

    authTitle.textContent =
      "Connexion";

    authSubmit.textContent =
      "Se connecter";

    authSwitchText.textContent =
      "Vous n'avez pas encore de compte ?";

    authSwitch.textContent =
      "Créer un compte";

    authPassword.autocomplete =
      "current-password";

  } else {

    authTitle.textContent =
      "Créer un compte";

    authSubmit.textContent =
      "Créer mon compte";

    authSwitchText.textContent =
      "Vous avez déjà un compte ?";

    authSwitch.textContent =
      "Se connecter";

    authPassword.autocomplete =
      "new-password";

  }

}


/* =========================================================
MISE À JOUR DE L'INTERFACE UTILISATEUR
========================================================= */


function updateLandingAccess(user) {

  if (user) {

    if (typeof window.hideLandingPage === "function") {
      window.hideLandingPage();
    }

    return;
  }

  if (typeof window.showLandingPage === "function") {
    window.showLandingPage();
  }

}

function updateAuthUI(user) {

  updateLandingAccess(user);

  if (
    !authButton ||
    !authUser ||
    !authUserEmail ||
    !logoutButton
  ) {
    return;
  }


  if (user) {

    authButton.style.display =
      "none";

    authUser.style.display =
      "flex";

    authUserEmail.textContent =
      user.email ||
      user.user_metadata?.full_name ||
      "Utilisateur";

    authUserEmail.title =
      user.email ||
      "";

  } else {

    authButton.style.display =
      "";

    authUser.style.display =
      "none";

    authUserEmail.textContent =
      "";

    authUserEmail.title =
      "";

  }

}


/* =========================================================
BOUTON CONNEXION
========================================================= */

if (authButton) {

  authButton.onclick =
    () => {

      openAuthModal(
        "login"
      );

    };

}


/* =========================================================
SWITCH LOGIN / SIGNUP
========================================================= */

if (authSwitch) {

  authSwitch.onclick =
    () => {

      state.authMode =
        state.authMode === "login"
          ? "signup"
          : "login";

      updateAuthMode();

      clearAuthMessages();

    };

}


/* =========================================================
FERMETURE AUTH
========================================================= */

if (authClose) {

  authClose.onclick =
    closeAuthModal;

}


if (authBackdrop) {

  authBackdrop.onclick =
    closeAuthModal;

}


/* =========================================================
INSCRIPTION / CONNEXION PAR EMAIL
========================================================= */

if (authForm) {

  authForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      clearAuthMessages();


      if (!supabaseClient) {

        showAuthError(
          "Le service d'authentification n'est pas disponible."
        );

        return;

      }


      const email =
        authEmail.value.trim();

      const password =
        authPassword.value;


      if (!email || !password) {

        showAuthError(
          "Veuillez remplir tous les champs."
        );

        return;

      }


      if (password.length < 6) {

        showAuthError(
          "Le mot de passe doit contenir au moins 6 caractères."
        );

        return;

      }


      authSubmit.disabled =
        true;


      try {

        if (
          state.authMode === "signup"
        ) {

          const {
            data,
            error
          } =
            await supabaseClient.auth.signUp({
              email,
              password
            });


          if (error) {
            throw error;
          }


          if (
            data &&
            data.session
          ) {

            showAuthSuccess(
              "Compte créé avec succès."
            );


            setTimeout(
              () => {

                closeAuthModal();

              },
              800
            );

          } else {

            showAuthSuccess(
              "Compte créé. Vérifiez votre adresse e-mail pour confirmer votre compte."
            );

          }

        } else {

          const {
            error
          } =
            await supabaseClient.auth.signInWithPassword({
              email,
              password
            });


          if (error) {
            throw error;
          }


          closeAuthModal();

        }

      } catch (error) {

        console.error(
          "Erreur Auth :",
          error
        );


        let message =
          error?.message ||
          "Une erreur est survenue.";


        const lower =
          message.toLowerCase();


        if (
          lower.includes("invalid login") ||
          lower.includes("invalid credentials")
        ) {

          message =
            "Adresse e-mail ou mot de passe incorrect.";

        } else if (
          lower.includes("user already registered")
        ) {

          message =
            "Cette adresse e-mail possède déjà un compte.";

        } else if (
          lower.includes("password should be at least")
        ) {

          message =
            "Le mot de passe doit contenir au moins 6 caractères.";

        } else if (
          lower.includes("email not confirmed")
        ) {

          message =
            "Votre adresse e-mail n'est pas encore confirmée.";

        }


        showAuthError(
          message
        );

      } finally {

        authSubmit.disabled =
          false;

      }

    }
  );

}


/* =========================================================
GOOGLE
========================================================= */

if (googleLogin) {

  googleLogin.onclick =
    async () => {

      clearAuthMessages();


      if (!supabaseClient) {

        showAuthError(
          "Le service d'authentification n'est pas disponible."
        );

        return;

      }


      googleLogin.disabled =
        true;


      try {

        const {
          error
        } =
          await supabaseClient.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo:
                "https://prompts-city.sashaurielhino.workers.dev/"
            }
          });


        if (error) {
          throw error;
        }

      } catch (error) {

        console.error(
          "Google Auth :",
          error
        );


        showAuthError(
          error?.message ||
          "Impossible de continuer avec Google."
        );

      } finally {

        googleLogin.disabled =
          false;

      }

    };

}


/* =========================================================
GITHUB
========================================================= */

if (githubLogin) {

  githubLogin.onclick =
    async () => {

      clearAuthMessages();


      if (!supabaseClient) {

        showAuthError(
          "Le service d'authentification n'est pas disponible."
        );

        return;

      }


      githubLogin.disabled =
        true;


      try {

        const {
          error
        } =
          await supabaseClient.auth.signInWithOAuth({
            provider: "github",
            options: {
              redirectTo:
                "https://prompts-city.sashaurielhino.workers.dev/"
            }
          });


        if (error) {
          throw error;
        }

      } catch (error) {

        console.error(
          "GitHub Auth :",
          error
        );


        showAuthError(
          error?.message ||
          "Impossible de continuer avec GitHub."
        );

      } finally {

        githubLogin.disabled =
          false;

      }

    };

}


/* =========================================================
DÉCONNEXION
========================================================= */

if (logoutButton) {

  logoutButton.onclick =
    async () => {

      if (!supabaseClient) {

        return;

      }


      logoutButton.disabled =
        true;


      try {

        const {
          error
        } =
          await supabaseClient.auth.signOut();


        if (error) {
          throw error;
        }


        updateAuthUI(
          null
        );

      } catch (error) {

        console.error(
          "Erreur déconnexion :",
          error
        );


        alert(
          "Impossible de vous déconnecter."
        );

      } finally {

        logoutButton.disabled =
          false;

      }

    };

}


/* =========================================================
ÉTAT AUTHENTIFICATION AU CHARGEMENT
========================================================= */

async function initAuth() {

  if (!supabaseClient) {

    console.warn(
      "Supabase JS n'est pas disponible."
    );

    updateAuthUI(
      null
    );

    return;

  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();


    if (error) {
      throw error;
    }


    updateAuthUI(
      data?.session?.user || null
    );


  } catch (error) {

    console.error(
      "Impossible de récupérer la session :",
      error
    );


    updateAuthUI(
      null
    );

  }


  supabaseClient.auth.onAuthStateChange(
    (_event, session) => {

      updateAuthUI(
        session?.user || null
      );

    }
  );

}


/* =========================================================
INITIALISATION AUTH
========================================================= */

if (authElementsAvailable) {

  updateAuthMode();

}

initAuth();
/* =========================================================
DÉMARRAGE APPLICATION
========================================================= */

init();


/* =========================================================
AUTH GATE — ACCÈS OBLIGATOIRE À LA BIBLIOTHÈQUE
========================================================= */

function setAuthGate(user) {

  const isAuthenticated = Boolean(user);

  document.body.classList.toggle(
    "auth-locked",
    !isAuthenticated
  );

  const gateButton =
    document.getElementById("auth-gate-button");

  if (gateButton) {

    gateButton.onclick = () => {

      openAuthModal("login");

    };

  }

}


/* =========================================================
INITIALISATION DU GATE
========================================================= */

async function initAuthGate() {

  if (!supabaseClient) {

    setAuthGate(null);

    return;

  }

  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();

    if (error) {

      throw error;

    }

    const user =
      data?.session?.user || null;

    setAuthGate(user);

  } catch (error) {

    console.error(
      "Impossible de vérifier l'authentification :",
      error
    );

    setAuthGate(null);

  }


  supabaseClient.auth.onAuthStateChange(
    (_event, session) => {

      setAuthGate(
        session?.user || null
      );

    }
  );

}


/* =========================================================
DÉMARRAGE DU GATE
========================================================= */

initAuthGate();

