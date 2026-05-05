import { pageCopy, starterCharacters } from "./js/constants.js";
import { db, SUPABASE_IS_CONFIGURED } from "./js/supabaseClient.js";
import {
  characterFromRow,
  characterToRow,
  clearSupabaseSessionCache,
  escapeHtml,
  formatSpanishDate,
  formatText,
  getFunctionErrorMessage,
  getInitials,
  makeId,
  normalizeCharacter,
  supportsZanpakuto,
} from "./js/utils.js";

let profiles = [];
let characters = starterCharacters.map(normalizeCharacter);
let currentUser = null;
let currentSession = null;
let currentPage = "Shinigami";
let selectedCharacterId = null;
let editingCharacterId = null;

const els = {
  loginPage: document.querySelector("#loginPage"),
  appPage: document.querySelector("#appPage"),
  loginForm: document.querySelector("#loginForm"),
  loginEmail: document.querySelector("#loginEmail"),
  loginPassword: document.querySelector("#loginPassword"),
  loginError: document.querySelector("#loginError"),
  navButtons: [...document.querySelectorAll("#mainNav .nav-link")],
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

async function init() {
  bindEvents();
  render();

  if (!SUPABASE_IS_CONFIGURED) {
    showNotice("Supabase is not configured yet. The site is showing sample data only.");
    return;
  }

  const { data } = await db.auth.getSession();
  currentSession = data.session;
  await refreshCurrentUser();
  await loadCharacters();

  db.auth.onAuthStateChange(async (_event, session) => {
    currentSession = session;
    await refreshCurrentUser();
    await loadCharacters();
    render();
  });
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

async function refreshCurrentUser() {
  if (!currentSession?.user) {
    currentUser = null;
    return null;
  }

  const { data, error } = await db
    .from("profiles")
    .select("id,email,username,role")
    .eq("id", currentSession.user.id)
    .single();

  if (error) {
    currentUser = null;
    return error;
  }

  currentUser = data;
  return null;
}

async function loadCharacters() {
  if (!db) return;

  const { data, error } = await db.from("characters").select("*").order("name", { ascending: true });
  if (error) {
    showNotice(error.message);
    return;
  }

  characters = data.map(characterFromRow);
  render();
}

async function handleLogin(event) {
  event.preventDefault();
  if (!db) {
    els.loginError.textContent = "Configure Supabase first.";
    return;
  }

  const email = els.loginEmail.value.trim().toLowerCase();
  const password = els.loginPassword.value;
  const { data, error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    els.loginError.textContent = error.message;
    return;
  }

  currentSession = data.session;
  const profileError = await refreshCurrentUser();
  if (profileError || !currentUser) {
    currentUser = {
      id: data.session.user.id,
      email: data.session.user.email,
      username: data.session.user.email,
      role: "user",
    };
    showNotice("Login worked, but this account does not have an admin role yet.");
  }

  els.loginForm.reset();
  els.loginPage.classList.add("hidden");
  els.loginError.textContent = "";
  render();
}

async function handleLogout(event) {
  event?.preventDefault();
  event?.stopPropagation();

  currentUser = null;
  currentSession = null;
  selectedCharacterId = null;
  editingCharacterId = null;
  els.loginPage.classList.add("hidden");
  render();

  if (db) {
    const { error } = await db.auth.signOut();
    if (error) await db.auth.signOut({ scope: "local" });
    clearSupabaseSessionCache();
  }
}

async function handleProfileSave(event) {
  event.preventDefault();
  if (!currentUser) return;

  const username = els.profileUsername.value.trim();
  const password = els.profilePassword.value;
  const { error: profileError } = await db.from("profiles").update({ username }).eq("id", currentUser.id);

  if (profileError) {
    showNotice(profileError.message);
    return;
  }

  if (password) {
    const { error: passwordError } = await db.auth.updateUser({ password });
    if (passwordError) {
      showNotice(passwordError.message);
      return;
    }
  }

  els.profilePassword.value = "";
  els.profilePanel.classList.add("hidden");
  await refreshCurrentUser();
  render();
}

function render() {
  if (!pageCopy[currentPage] && currentPage !== "Admin") currentPage = "Shinigami";
  if (!currentUser && currentPage === "Admin") currentPage = "Shinigami";

  els.appPage.classList.remove("hidden");
  els.profilePanel.classList.add("hidden");
  els.authArea.classList.toggle("hidden", Boolean(currentUser));
  els.userArea.classList.toggle("hidden", !currentUser);
  if (currentUser) els.loginPage.classList.add("hidden");

  if (currentUser) {
    els.profileButton.textContent = currentUser.username || currentUser.email;
    els.profileUsername.value = currentUser.username || "";
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

function isEditor() {
  return currentUser && ["admin", "main-admin"].includes(currentUser.role);
}

function isMainAdmin() {
  return currentUser?.role === "main-admin";
}

function getFilteredCharacters() {
  const query = els.searchInput.value.trim().toLowerCase();
  return characters
    .filter((character) => character.affiliation === currentPage)
    .filter((character) => {
      if (!query) return true;
      const searchable = [
        character.name,
        character.race,
        character.affiliation,
        character.ability?.name,
        character.ability?.description,
        character.overview,
        character.history,
        character.equipment,
        character.abilities,
        character.zanpakuto?.name,
        character.zanpakuto?.activationCommand,
        character.zanpakuto?.shikai,
        character.zanpakuto?.bankai,
        character.notes,
      ].join(" ").toLowerCase();
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
        <span class="tab-meta">${escapeHtml(character.race)}</span>
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
      <p>${pageCopy[currentPage]}</p>
    </div>
  `;
  els.wikiPage.append(heading);

  if (editingCharacterId !== null) {
    els.wikiPage.append(createEditor(characters.find((character) => character.id === editingCharacterId)));
    return;
  }

  if (!selected) {
    els.wikiPage.insertAdjacentHTML("beforeend", '<div class="empty-state">Create the first file for this affiliation.</div>');
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
  const rows = [
    ["Raza", character.race],
    ["Afiliacion", character.affiliation],
  ];

  rows.push(
    ["Vida", character.stats.health],
    ["Ataque", character.stats.attack],
    ["Bloqueo", character.stats.defense],
    ["Velocidad", character.stats.speed],
    ["Reiatsu", character.stats.reiatsu],
    ["Ultima edicion", character.updatedByName],
    ["Fecha", formatSpanishDate(character.updatedAt)],
  );

  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "fact-row";
    row.innerHTML = `<div class="fact-label">${label}</div><div class="fact-value">${escapeHtml(String(value || ""))}</div>`;
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
            <dt>Nombre</dt>
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
  const personalAbilitySection =
    character.race === "Quincy"
      ? `
        <section class="article-section">
          <h3>Habilidad personal</h3>
          <dl class="zanpakuto-list">
            <div>
              <dt>Nombre</dt>
              <dd>${formatText(character.ability.name)}</dd>
            </div>
            <div>
              <dt>Descripcion</dt>
              <dd>${formatText(character.ability.description)}</dd>
            </div>
          </dl>
        </section>
      `
      : "";

  panel.innerHTML = `
    <section class="article-section">
      <h3>Descripcion general</h3>
      <p>${formatText(character.overview)}</p>
    </section>
    <section class="article-section">
      <h3>Historia</h3>
      <p>${formatText(character.history)}</p>
    </section>
    <section class="article-section">
      <h3>Equipamento</h3>
      <p>${formatText(character.equipment)}</p>
    </section>
    <section class="article-section">
      <h3>Habilidades de raza</h3>
      <p>${formatText(character.abilities)}</p>
    </section>
    ${personalAbilitySection}
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
  if (!character && editingCharacterId) {
    showNotice("No pude encontrar esta ficha para editarla. Refresca la pagina e intenta otra vez.");
    editingCharacterId = null;
    renderWikiPage();
    return document.createElement("div");
  }

  const form = els.editorTemplate.content.firstElementChild.cloneNode(true);
  const data = character || {
    name: "",
    race: currentPage === "NPC" ? "Quincy" : currentPage,
    affiliation: currentPage,
    ability: { name: "", description: "" },
    image: "",
    notes: "",
    overview: "",
    history: "",
    equipment: "",
    abilities: "",
    zanpakuto: { name: "", activationCommand: "", shikai: "", bankai: "" },
    stats: { health: 50, attack: 50, defense: 50, speed: 50, reiatsu: 50 },
  };
  const normalizedData = normalizeCharacter(data);

  form.elements.name.value = normalizedData.name;
  form.elements.race.value = normalizedData.race;
  form.elements.affiliation.value = normalizedData.affiliation;
  form.elements.personalAbilityName.value = normalizedData.ability.name;
  form.elements.personalAbilityDescription.value = normalizedData.ability.description;
  form.elements.health.value = normalizedData.stats.health;
  form.elements.attack.value = normalizedData.stats.attack;
  form.elements.defense.value = normalizedData.stats.defense;
  form.elements.speed.value = normalizedData.stats.speed;
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

  syncRaceFields(form);
  form.elements.race.addEventListener("change", () => syncRaceFields(form));

  form.querySelector(".delete-character").classList.toggle("hidden", !character);
  form.querySelector(".cancel-edit").addEventListener("click", () => {
    editingCharacterId = null;
    renderWikiPage();
  });
  form.querySelector(".delete-character").addEventListener("click", async () => {
    if (!character?.id) {
      showNotice("No pude encontrar esta ficha para eliminarla.");
      return;
    }
    await deleteCharacter(character.id);
  });
  form.addEventListener("submit", (event) => saveCharacter(event, character));

  return form;
}

async function saveCharacter(event, existingCharacter) {
  event.preventDefault();
  if (!isEditor()) {
    showNotice("Tu cuenta no tiene permisos para editar fichas.");
    return;
  }

  const form = event.currentTarget;
  const race = form.elements.race.value;
  const updated = {
    id: existingCharacter?.id || makeId(),
    name: form.elements.name.value.trim(),
    race,
    affiliation: form.elements.affiliation.value,
    ability:
      race === "Quincy"
        ? {
            name: form.elements.personalAbilityName.value.trim(),
            description: form.elements.personalAbilityDescription.value.trim(),
          }
        : { name: "", description: "" },
    image: form.elements.image.value.trim(),
    notes: form.elements.notes.value.trim(),
    overview: form.elements.overview.value.trim(),
    history: form.elements.history.value.trim(),
    equipment: form.elements.equipment.value.trim(),
    abilities: form.elements.abilities.value.trim(),
    zanpakuto: supportsZanpakuto(race)
      ? {
          name: form.elements.zanpakutoName.value.trim(),
          activationCommand: form.elements.activationCommand.value.trim(),
          shikai: form.elements.shikai.value.trim(),
          bankai: form.elements.bankai.value.trim(),
        }
      : { name: "", activationCommand: "", shikai: "", bankai: "" },
    stats: {
      health: Number(form.elements.health.value),
      attack: Number(form.elements.attack.value),
      defense: Number(form.elements.defense.value),
      speed: Number(form.elements.speed.value),
      reiatsu: Number(form.elements.reiatsu.value),
    },
  };

  const row = characterToRow(updated, currentUser);
  const { error } = await db.from("characters").upsert(row);
  if (error) {
    showNotice(error.message);
    return;
  }

  currentPage = updated.affiliation;
  selectedCharacterId = updated.id;
  editingCharacterId = null;
  await loadCharacters();
}

async function deleteCharacter(characterId) {
  if (!isEditor()) {
    showNotice("Tu cuenta no tiene permisos para eliminar fichas.");
    return;
  }

  const { error } = await db.from("characters").delete().eq("id", characterId);
  if (error) {
    showNotice(error.message);
    return;
  }

  selectedCharacterId = null;
  editingCharacterId = null;
  await loadCharacters();
}

function renderAdminPage() {
  if (!isMainAdmin()) {
    currentPage = "Shinigami";
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
        <p>Manage editor accounts and character files stored in Supabase.</p>
      </div>
    </div>
    <div class="admin-grid">
      <form id="accountForm" class="admin-card account-form">
        <h3>Create account</h3>
        <label>Email <input name="email" type="email" required /></label>
        <label>Username <input name="username" required /></label>
        <label>Password <input name="password" type="password" required minlength="6" /></label>
        <label>Role
          <select name="role">
            <option value="user">User</option>
            <option value="admin">Admin editor</option>
          </select>
        </label>
        <button class="primary-action" type="submit">Create account</button>
        <p class="login-copy">Requires the Supabase Edge Function in <code>supabase/functions/create-user</code>.</p>
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
  loadProfiles();
  renderAdminCharacterIndex();
}

async function handleCreateAccount(event) {
  event.preventDefault();
  const form = event.currentTarget;

  const { error } = await db.functions.invoke("create-user", {
    body: {
      email: form.elements.email.value.trim().toLowerCase(),
      username: form.elements.username.value.trim(),
      password: form.elements.password.value,
      role: form.elements.role.value,
    },
  });

  if (error) {
    showNotice(getFunctionErrorMessage(error, "create-user"));
    return;
  }

  form.reset();
  await loadProfiles();
}

async function loadProfiles() {
  const { data, error } = await db.from("profiles").select("id,email,username,role").order("email", { ascending: true });
  if (error) {
    showNotice(error.message);
    return;
  }
  profiles = data;
  renderAccounts();
}

function renderAccounts() {
  const accountList = els.adminPage.querySelector("#accountList");
  if (!accountList) return;
  accountList.innerHTML = "";

  profiles.forEach((profile) => {
    const row = document.createElement("div");
    row.className = "account-row";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(profile.username || profile.email)}</strong>
        <span>${escapeHtml(profile.email || "")} - ${escapeHtml(profile.role)}</span>
      </div>
    `;
    const deleteButton = document.createElement("button");
    deleteButton.className = "danger-action";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.disabled = profile.id === currentUser.id;
    deleteButton.addEventListener("click", async () => {
      const { error } = await db.functions.invoke("delete-user", { body: { userId: profile.id } });
      if (error) {
        showNotice(getFunctionErrorMessage(error, "delete-user"));
        return;
      }
      await loadProfiles();
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
        <span>${escapeHtml(character.affiliation)} - ${escapeHtml(character.race)}</span>
      </div>
    `;
    const editButton = document.createElement("button");
    editButton.className = "primary-action small";
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
      currentPage = character.affiliation;
      selectedCharacterId = character.id;
      startEditor(character.id);
      render();
    });
    row.append(editButton);
    adminCharacterList.append(row);
  });
}

function syncRaceFields(form) {
  const isQuincy = form.elements.race.value === "Quincy";
  form.querySelectorAll(".ability-field").forEach((field) => field.classList.toggle("hidden", !isQuincy));
  form.querySelector(".zanpakuto-fields").classList.toggle("hidden", isQuincy);
  form.elements.personalAbilityName.required = isQuincy;
  form.elements.personalAbilityDescription.required = isQuincy;
}

function showNotice(message) {
  els.characterList.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
}

init();
