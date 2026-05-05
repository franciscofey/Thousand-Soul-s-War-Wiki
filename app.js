const STORAGE_KEYS = {
  users: "tsw_users",
  characters: "tsw_characters",
  session: "tsw_session",
};

const starterUsers = [
  { email: "gm@quincy.com", password: "gmquincy", username: "GM Quincy", role: "admin" },
  { email: "elses@quincy.com", password: "elsesquincy", username: "Elses", role: "admin" },
  { email: "sigma@quincy.com", password: "sigmaquincy", username: "Sigma", role: "main-admin" },
];

const starterCharacters = [
  {
    id: makeId(),
    name: "Uryu Ishida",
    race: "Quincy",
    affiliation: "Wandenreich",
    ability: "Heilig Pfeil precision and spiritual archery",
    image: "assets/uryu-reference.png",
    notes: "Child | 2001 | 2003",
    overview: "A precise Quincy archer with disciplined spiritual control and a calm tactical style.",
    history: "Raised within the Quincy tradition, Uryu keeps detailed records of his training, rivalries, and wartime decisions.",
    equipment: "Quincy bow, spiritual arrows, Seele Schneider, and utility items for ranged engagements.",
    abilities: "Expert marksmanship, Hirenkyaku movement, spiritual thread perception, and high reiatsu control.",
    zanpakuto: { name: "", activationCommand: "", shikai: "", bankai: "" },
    stats: { attack: 82, defense: 68, speed: 76, health: 64, reiatsu: 88 },
  },
  {
    id: makeId(),
    name: "Kaien Shiba",
    race: "Shinigami",
    affiliation: "Gotei 13",
    ability: "Water-type zanpakuto techniques",
    image: "",
    notes: "Lieutenant archive profile",
    overview: "A loyal Shinigami officer known for balanced combat instincts and strong command presence.",
    history: "Served as a lieutenant in the Gotei 13 and left a record of mentorship, duty, and sacrifice.",
    equipment: "Standard Shinigami robes, zanpakuto, and division field gear.",
    abilities: "Zanjutsu, Hoho, spiritual pressure control, and water-based release techniques.",
    zanpakuto: {
      name: "Nejibana",
      activationCommand: "Rankle the seas and skies",
      shikai: "Nejibana changes shape and channels water into piercing and sweeping attacks.",
      bankai: "Unknown or unrecorded.",
    },
    stats: { attack: 72, defense: 70, speed: 74, health: 78, reiatsu: 80 },
  },
  {
    id: makeId(),
    name: "Nelliel Tu Odelschwanck",
    race: "Arrancar",
    affiliation: "Hueco Mundo",
    ability: "Cero Doble and lance combat",
    image: "",
    notes: "Former Espada profile",
    overview: "A powerful Arrancar with a composed temperament and tremendous spiritual pressure.",
    history: "Former Espada records describe a warrior displaced by betrayal and later defined by restraint.",
    equipment: "Arrancar uniform, broken mask remains, and resurreccion weaponry.",
    abilities: "Cero Doble, high-speed combat, lance techniques, Hierro, and overwhelming reiatsu.",
    zanpakuto: {
      name: "Gamuza",
      activationCommand: "Declare",
      shikai: "Arrancar do not use Shikai; this field can describe Resurreccion notes if desired.",
      bankai: "Arrancar do not use Bankai; this field can hold Segunda Etapa or advanced release notes.",
    },
    stats: { attack: 88, defense: 83, speed: 78, health: 86, reiatsu: 90 },
  },
];

const factionCopy = {
  Shinigamis: "Soul Reaper records, divisions, zanpakuto details, and combat sheets.",
  Quincy: "Quincy bloodline profiles, affiliations, spiritual weapons, and techniques.",
  Arrancar: "Hueco Mundo files for Arrancar, resurrecion notes, and battle statistics.",
};

let users = loadCollection(STORAGE_KEYS.users, starterUsers);
let characters = loadCollection(STORAGE_KEYS.characters, starterCharacters).map(normalizeCharacter);
saveCollection(STORAGE_KEYS.characters, characters);
let currentUser = getSessionUser();
let currentPage = "Shinigamis";
let selectedCharacterId = null;
let editingCharacterId = null;

const els = {
  loginPage: document.querySelector("#loginPage"),
  appPage: document.querySelector("#appPage"),
  loginForm: document.querySelector("#loginForm"),
  loginEmail: document.querySelector("#loginEmail"),
  loginPassword: document.querySelector("#loginPassword"),
  loginError: document.querySelector("#loginError"),
  navButtons: [...document.querySelectorAll(".nav-link")],
  adminNav: document.querySelector("#adminNav"),
  authArea: document.querySelector("#authArea"),
  loginToggle: document.querySelector("#loginToggle"),
  mainNav: document.querySelector("#mainNav"),
  menuToggle: document.querySelector("#menuToggle"),
  userArea: document.querySelector(".user-area"),
  profileButton: document.querySelector("#profileButton"),
  profilePanel: document.querySelector("#profilePanel"),
  profileForm: document.querySelector("#profileForm"),
  profileUsername: document.querySelector("#profileUsername"),
  profilePassword: document.querySelector("#profilePassword"),
  logoutButton: document.querySelector("#logoutButton"),
  searchInput: document.querySelector("#searchInput"),
  characterList: document.querySelector("#characterList"),
  newCharacterButton: document.querySelector("#newCharacterButton"),
  wikiPage: document.querySelector("#wikiPage"),
  adminPage: document.querySelector("#adminPage"),
  characterTemplate: document.querySelector("#characterTemplate"),
  editorTemplate: document.querySelector("#editorTemplate"),
};

function loadCollection(key, fallback) {
  const stored = localStorage.getItem(key);
  if (stored) return JSON.parse(stored);
  localStorage.setItem(key, JSON.stringify(fallback));
  return fallback;
}

function saveCollection(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getSessionUser() {
  const email = localStorage.getItem(STORAGE_KEYS.session);
  return users.find((user) => user.email === email) || null;
}

function isEditor() {
  return currentUser && ["admin", "main-admin"].includes(currentUser.role);
}

function isMainAdmin() {
  return currentUser?.email === "sigma@quincy.com" && currentUser?.role === "main-admin";
}

function init() {
  bindEvents();
  render();
}

function bindEvents() {
  els.loginForm.addEventListener("submit", handleLogin);
  els.loginToggle.addEventListener("click", () => els.loginPage.classList.toggle("hidden"));
  els.logoutButton.addEventListener("click", handleLogout);
  els.profileButton.addEventListener("click", () => els.profilePanel.classList.toggle("hidden"));
  els.profileForm.addEventListener("submit", handleProfileSave);
  els.searchInput.addEventListener("input", render);
  els.newCharacterButton.addEventListener("click", () => startEditor(null));
  els.menuToggle.addEventListener("click", () => els.mainNav.classList.toggle("open"));

  els.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentPage = button.dataset.page;
      selectedCharacterId = null;
      editingCharacterId = null;
      els.mainNav.classList.remove("open");
      render();
    });
  });
}

function handleLogin(event) {
  event.preventDefault();
  const email = els.loginEmail.value.trim().toLowerCase();
  const password = els.loginPassword.value;
  const user = users.find((candidate) => candidate.email === email && candidate.password === password);

  if (!user) {
    els.loginError.textContent = "Email or password is incorrect.";
    return;
  }

  currentUser = user;
  localStorage.setItem(STORAGE_KEYS.session, user.email);
  els.loginForm.reset();
  els.loginPage.classList.add("hidden");
  els.loginError.textContent = "";
  render();
}

function handleLogout() {
  currentUser = null;
  selectedCharacterId = null;
  editingCharacterId = null;
  localStorage.removeItem(STORAGE_KEYS.session);
  els.loginPage.classList.add("hidden");
  render();
}

function handleProfileSave(event) {
  event.preventDefault();
  const username = els.profileUsername.value.trim();
  const password = els.profilePassword.value;

  users = users.map((user) => {
    if (user.email !== currentUser.email) return user;
    return { ...user, username, password: password || user.password };
  });

  saveCollection(STORAGE_KEYS.users, users);
  currentUser = getSessionUser();
  els.profilePassword.value = "";
  els.profilePanel.classList.add("hidden");
  render();
}

function showLogin() {
  els.loginPage.classList.remove("hidden");
  els.appPage.classList.remove("hidden");
  render();
}

function showApp() {
  els.loginPage.classList.add("hidden");
  els.appPage.classList.remove("hidden");
  render();
}

function render() {
  if (!currentUser && currentPage === "Admin") {
    currentPage = "Shinigamis";
  }

  els.appPage.classList.remove("hidden");
  els.profilePanel.classList.add("hidden");
  els.authArea.classList.toggle("hidden", Boolean(currentUser));
  els.userArea.classList.toggle("hidden", !currentUser);
  if (currentUser) {
    els.loginPage.classList.add("hidden");
  }

  if (currentUser) {
    els.profileButton.textContent = currentUser.username;
    els.profileUsername.value = currentUser.username;
  } else {
    els.profileButton.textContent = "";
    els.profileUsername.value = "";
  }

  els.adminNav.classList.toggle("hidden", !isMainAdmin());
  els.newCharacterButton.classList.toggle("hidden", !isEditor() || currentPage === "Admin");
  els.searchInput.disabled = currentPage === "Admin";

  els.navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.page === currentPage);
  });

  if (currentPage === "Admin") {
    renderAdminPage();
    return;
  }

  els.adminPage.classList.add("hidden");
  els.wikiPage.classList.remove("hidden");
  renderCharacterList();
  renderWikiPage();
}

function singularRace(page) {
  return page === "Shinigamis" ? "Shinigami" : page;
}

function getFilteredCharacters() {
  const query = els.searchInput.value.trim().toLowerCase();
  return characters
    .filter((character) => character.race === singularRace(currentPage))
    .filter((character) => {
      if (!query) return true;
      const searchable = [
        character.name,
        character.race,
        character.affiliation,
        character.ability,
        character.overview,
        character.history,
        character.equipment,
        character.abilities,
        character.zanpakuto?.name,
        character.zanpakuto?.activationCommand,
        character.zanpakuto?.shikai,
        character.zanpakuto?.bankai,
        character.notes,
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
}

function renderCharacterList() {
  const list = getFilteredCharacters();
  els.characterList.innerHTML = "";

  if (!list.length) {
    els.characterList.innerHTML = '<div class="empty-state">No character files found.</div>';
    selectedCharacterId = null;
    return;
  }

  if (!list.some((character) => character.id === selectedCharacterId)) selectedCharacterId = list[0].id;

  list.forEach((character) => {
    const button = document.createElement("button");
    button.className = "character-tab";
    button.classList.toggle("active", character.id === selectedCharacterId);
    button.innerHTML = `
        <span class="tab-avatar">${escapeHtml(getInitials(character.name))}</span>
      <span>
        <span class="tab-name">${escapeHtml(character.name)}</span>
        <span class="tab-meta">${escapeHtml(character.affiliation)}</span>
      </span>
    `;
    button.addEventListener("click", () => {
      selectedCharacterId = character.id;
      editingCharacterId = null;
      renderWikiPage();
      renderCharacterList();
    });
    els.characterList.append(button);
  });
}

function renderWikiPage() {
  const selected = characters.find((character) => character.id === selectedCharacterId);
  els.wikiPage.innerHTML = "";

  const heading = document.createElement("div");
  heading.className = "page-heading";
  heading.innerHTML = `
    <div>
      <h2>${currentPage}</h2>
      <p>${factionCopy[currentPage]}</p>
    </div>
  `;
  els.wikiPage.append(heading);

  if (editingCharacterId !== null) {
    els.wikiPage.append(createEditor(characters.find((character) => character.id === editingCharacterId)));
    return;
  }

  if (!selected) {
    els.wikiPage.insertAdjacentHTML("beforeend", '<div class="empty-state">Create the first file for this faction.</div>');
    return;
  }

  const layout = document.createElement("div");
  layout.className = "sheet-layout";
  layout.append(createDetailsPanel(selected));
  layout.append(createCharacterSheet(selected));
  els.wikiPage.append(layout);
}

function createCharacterSheet(character) {
  const node = els.characterTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector("h2").textContent = character.name;
  node.querySelector("p").textContent = character.notes || `${character.race} profile`;

  const image = node.querySelector(".portrait");
  if (character.image) {
    image.src = character.image;
    image.alt = `${character.name} portrait`;
  } else {
    image.replaceWith(createEmptyPortrait(character));
  }

  const facts = node.querySelector(".facts");
  [
    ["Raza", character.race],
    ["Affiliation", character.affiliation],
    ["Habilidad personal", character.ability],
    ["Ataque", character.stats.attack],
    ["Defensa", character.stats.defense],
    ["Velocidad", character.stats.speed],
    ["Vida", character.stats.health],
    ["Reiatsu", character.stats.reiatsu],
  ].forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "fact-row";
    row.innerHTML = `<div class="fact-label">${label}</div><div class="fact-value">${escapeHtml(String(value))}</div>`;
    facts.append(row);
  });

  return node;
}

function createDetailsPanel(character) {
  const panel = document.createElement("article");
  panel.className = "details-panel article-panel";
  const zanpakutoSections = supportsZanpakuto(character.race)
    ? `
      <section class="article-section">
        <h3>Zanpakuto</h3>
        <dl class="zanpakuto-list">
          <div>
            <dt>Nombre de Zanpakuto</dt>
            <dd>${formatText(character.zanpakuto.name)}</dd>
          </div>
          <div>
            <dt>Comando de activacion</dt>
            <dd>${formatText(character.zanpakuto.activationCommand)}</dd>
          </div>
          <div>
            <dt>Shikai</dt>
            <dd>${formatText(character.zanpakuto.shikai)}</dd>
          </div>
          <div>
            <dt>Bankai</dt>
            <dd>${formatText(character.zanpakuto.bankai)}</dd>
          </div>
        </dl>
      </section>
    `
    : "";

  panel.innerHTML = `
    <section class="article-section">
      <h3>Overview</h3>
      <p>${formatText(character.overview)}</p>
    </section>
    <section class="article-section">
      <h3>History</h3>
      <p>${formatText(character.history)}</p>
    </section>
    <section class="article-section">
      <h3>Equipment</h3>
      <p>${formatText(character.equipment)}</p>
    </section>
    <section class="article-section">
      <h3>Habilidades</h3>
      <p>${formatText(character.abilities)}</p>
    </section>
    ${zanpakutoSections}
  `;

  if (isEditor()) {
    const editButton = document.createElement("button");
    editButton.className = "primary-action small";
    editButton.textContent = "Edit file";
    editButton.addEventListener("click", () => startEditor(character.id));
    panel.append(editButton);
  }

  return panel;
}

function createStatLine(label, value) {
  const width = Math.max(0, Math.min(100, Number(value)));
  return `
    <div class="stat-line">
      <strong>${label}</strong>
      <span class="bar"><span style="width: ${width}%"></span></span>
      <span>${width}</span>
    </div>
  `;
}

function createEmptyPortrait(character) {
  const fallback = document.createElement("div");
  fallback.className = "empty-portrait portrait";
  fallback.textContent = getInitials(character.name);
  return fallback;
}

function startEditor(characterId) {
  editingCharacterId = characterId || "";
  renderWikiPage();
}

function createEditor(character) {
  const form = els.editorTemplate.content.firstElementChild.cloneNode(true);
  const data = character || {
    name: "",
    race: singularRace(currentPage),
    affiliation: "",
    ability: "",
    image: "",
    notes: "",
    overview: "",
    history: "",
    equipment: "",
    abilities: "",
    zanpakuto: { name: "", activationCommand: "", shikai: "", bankai: "" },
    stats: { attack: 50, defense: 50, speed: 50, health: 50, reiatsu: 50 },
  };
  const normalizedData = normalizeCharacter(data);

  form.elements.name.value = normalizedData.name;
  form.elements.race.value = normalizedData.race;
  form.elements.affiliation.value = normalizedData.affiliation;
  form.elements.ability.value = normalizedData.ability;
  form.elements.attack.value = normalizedData.stats.attack;
  form.elements.defense.value = normalizedData.stats.defense;
  form.elements.speed.value = normalizedData.stats.speed;
  form.elements.health.value = normalizedData.stats.health;
  form.elements.reiatsu.value = normalizedData.stats.reiatsu;
  form.elements.image.value = normalizedData.image;
  form.elements.notes.value = normalizedData.notes;
  form.elements.overview.value = normalizedData.overview;
  form.elements.history.value = normalizedData.history;
  form.elements.equipment.value = normalizedData.equipment;
  form.elements.abilities.value = normalizedData.abilities;
  form.elements.zanpakutoName.value = normalizedData.zanpakuto.name;
  form.elements.activationCommand.value = normalizedData.zanpakuto.activationCommand;
  form.elements.shikai.value = normalizedData.zanpakuto.shikai;
  form.elements.bankai.value = normalizedData.zanpakuto.bankai;

  syncZanpakutoFields(form);
  form.elements.race.addEventListener("change", () => syncZanpakutoFields(form));

  form.querySelector(".delete-character").classList.toggle("hidden", !character);
  form.querySelector(".cancel-edit").addEventListener("click", () => {
    editingCharacterId = null;
    renderWikiPage();
  });
  form.querySelector(".delete-character").addEventListener("click", () => {
    characters = characters.filter((candidate) => candidate.id !== character.id);
    saveCollection(STORAGE_KEYS.characters, characters);
    selectedCharacterId = null;
    editingCharacterId = null;
    render();
  });
  form.addEventListener("submit", (event) => saveCharacter(event, character));

  return form;
}

function saveCharacter(event, existingCharacter) {
  event.preventDefault();
  const form = event.currentTarget;
  const updated = {
    id: existingCharacter?.id || makeId(),
    name: form.elements.name.value.trim(),
    race: form.elements.race.value,
    affiliation: form.elements.affiliation.value.trim(),
    ability: form.elements.ability.value.trim(),
    image: form.elements.image.value.trim(),
    notes: form.elements.notes.value.trim(),
    overview: form.elements.overview.value.trim(),
    history: form.elements.history.value.trim(),
    equipment: form.elements.equipment.value.trim(),
    abilities: form.elements.abilities.value.trim(),
    zanpakuto: supportsZanpakuto(form.elements.race.value)
      ? {
          name: form.elements.zanpakutoName.value.trim(),
          activationCommand: form.elements.activationCommand.value.trim(),
          shikai: form.elements.shikai.value.trim(),
          bankai: form.elements.bankai.value.trim(),
        }
      : { name: "", activationCommand: "", shikai: "", bankai: "" },
    stats: {
      attack: Number(form.elements.attack.value),
      defense: Number(form.elements.defense.value),
      speed: Number(form.elements.speed.value),
      health: Number(form.elements.health.value),
      reiatsu: Number(form.elements.reiatsu.value),
    },
  };

  if (existingCharacter) {
    characters = characters.map((character) => (character.id === existingCharacter.id ? updated : character));
  } else {
    characters = [...characters, updated];
  }

  saveCollection(STORAGE_KEYS.characters, characters);
  currentPage = updated.race === "Shinigami" ? "Shinigamis" : updated.race;
  selectedCharacterId = updated.id;
  editingCharacterId = null;
  render();
}

function renderAdminPage() {
  if (!isMainAdmin()) {
    currentPage = "Shinigamis";
    render();
    return;
  }

  els.wikiPage.classList.add("hidden");
  els.adminPage.classList.remove("hidden");
  els.characterList.innerHTML = '<div class="empty-state">Admin account tools are open.</div>';

  els.adminPage.innerHTML = `
    <div class="page-heading">
      <div>
        <h2>Admin</h2>
        <p>Create users, remove accounts, and decide who can edit character files.</p>
      </div>
    </div>
    <div class="admin-grid">
      <form id="accountForm" class="admin-card account-form">
        <h3>Create account</h3>
        <label>Email <input name="email" type="email" required /></label>
        <label>Username <input name="username" required /></label>
        <label>Password <input name="password" type="password" required minlength="4" /></label>
        <label>Role
          <select name="role">
            <option value="user">User</option>
            <option value="admin">Admin editor</option>
          </select>
        </label>
        <button class="primary-action" type="submit">Create account</button>
      </form>
      <section class="admin-card">
        <h3>Accounts</h3>
        <div id="accountList" class="account-list"></div>
      </section>
    </div>
    <section class="admin-card">
      <h3>Character files</h3>
      <div id="adminCharacterList" class="account-list"></div>
    </section>
  `;

  els.adminPage.querySelector("#accountForm").addEventListener("submit", handleCreateAccount);
  renderAccounts();
  renderAdminCharacterIndex();
}

function handleCreateAccount(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.elements.email.value.trim().toLowerCase();

  if (users.some((user) => user.email === email)) {
    form.elements.email.setCustomValidity("This email already exists.");
    form.elements.email.reportValidity();
    return;
  }

  form.elements.email.setCustomValidity("");
  users = [
    ...users,
    {
      email,
      username: form.elements.username.value.trim(),
      password: form.elements.password.value,
      role: form.elements.role.value,
    },
  ];
  saveCollection(STORAGE_KEYS.users, users);
  form.reset();
  renderAccounts();
}

function renderAccounts() {
  const accountList = els.adminPage.querySelector("#accountList");
  accountList.innerHTML = "";

  users.forEach((user) => {
    const row = document.createElement("div");
    row.className = "account-row";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(user.username)}</strong>
        <span>${escapeHtml(user.email)} - ${escapeHtml(user.role)}</span>
      </div>
    `;
    const deleteButton = document.createElement("button");
    deleteButton.className = "danger-action";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.disabled = user.email === currentUser.email;
    deleteButton.addEventListener("click", () => {
      users = users.filter((candidate) => candidate.email !== user.email);
      saveCollection(STORAGE_KEYS.users, users);
      renderAccounts();
    });
    row.append(deleteButton);
    accountList.append(row);
  });
}

function renderAdminCharacterIndex() {
  const adminCharacterList = els.adminPage.querySelector("#adminCharacterList");
  adminCharacterList.innerHTML = "";

  characters.forEach((character) => {
    const row = document.createElement("div");
    row.className = "account-row";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(character.name)}</strong>
        <span>${escapeHtml(character.race)} - ${escapeHtml(character.affiliation)}</span>
      </div>
    `;
    const editButton = document.createElement("button");
    editButton.className = "primary-action small";
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
      currentPage = character.race === "Shinigami" ? "Shinigamis" : character.race;
      selectedCharacterId = character.id;
      startEditor(character.id);
      render();
    });
    row.append(editButton);
    adminCharacterList.append(row);
  });
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function normalizeCharacter(character) {
  return {
    ...character,
    overview: character.overview || "",
    history: character.history || "",
    equipment: character.equipment || "",
    abilities: character.abilities || character.ability || "",
    zanpakuto: {
      name: character.zanpakuto?.name || "",
      activationCommand: character.zanpakuto?.activationCommand || "",
      shikai: character.zanpakuto?.shikai || "",
      bankai: character.zanpakuto?.bankai || "",
    },
    stats: {
      attack: Number(character.stats?.attack || 0),
      defense: Number(character.stats?.defense || 0),
      speed: Number(character.stats?.speed || 0),
      health: Number(character.stats?.health || 0),
      reiatsu: Number(character.stats?.reiatsu || 0),
    },
  };
}

function supportsZanpakuto(race) {
  return race === "Shinigami" || race === "Arrancar";
}

function syncZanpakutoFields(form) {
  form.querySelector(".zanpakuto-fields").classList.toggle("hidden", !supportsZanpakuto(form.elements.race.value));
}

function formatText(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function makeId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `tsw-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[character];
  });
}

init();
