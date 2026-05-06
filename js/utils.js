import { AFFILIATIONS } from "./constants.js";

export function makeId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `tsw-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function supportsZanpakuto(race) {
  return race === "Shinigami" || race === "Arrancar";
}

export function normalizeAffiliation(affiliation, race) {
  if (AFFILIATIONS.includes(affiliation)) return affiliation;
  if (AFFILIATIONS.includes(race)) return race;
  return "NPC";
}

export function normalizeCharacter(character) {
  const normalizedAffiliation = normalizeAffiliation(character.affiliation, character.race);
  const personalAbility = normalizePersonalAbility(character.ability);

  return {
    ...character,
    affiliation: normalizedAffiliation,
    ability: character.race === "Quincy" ? personalAbility : { name: "", description: "" },
    overview: character.overview || "",
    history: character.history || "",
    equipment: character.equipment || "",
    abilities: character.abilities || "",
    updatedByName: character.updatedByName || "",
    updatedAt: character.updatedAt || character.updated_at || "",
    record: {
      wins: Number(character.record?.wins || 0),
      losses: Number(character.record?.losses || 0),
    },
    zanpakuto: {
      name: character.zanpakuto?.name || "",
      activationCommand: character.zanpakuto?.activationCommand || "",
      shikai: character.zanpakuto?.shikai || "",
      bankai: character.zanpakuto?.bankai || "",
    },
    stats: {
      health: Number(character.stats?.health || 0),
      attack: Number(character.stats?.attack || 0),
      defense: Number(character.stats?.defense || 0),
      speed: Number(character.stats?.speed || 0),
      reiatsu: Number(character.stats?.reiatsu || 0),
    },
  };
}

export function characterFromRow(row) {
  return normalizeCharacter({
    id: row.id,
    name: row.name,
    race: row.race,
    affiliation: row.affiliation,
    ability: row.ability,
    image: row.image,
    notes: row.notes,
    overview: row.overview,
    history: row.history,
    equipment: row.equipment,
    abilities: row.abilities,
    updatedByName: row.updated_by_name,
    updatedAt: row.updated_at,
    record: {
      wins: row.wins,
      losses: row.losses,
    },
    zanpakuto: {
      name: row.zanpakuto_name,
      activationCommand: row.activation_command,
      shikai: row.shikai,
      bankai: row.bankai,
    },
    stats: {
      health: row.health,
      attack: row.attack,
      defense: row.defense,
      speed: row.speed,
      reiatsu: row.reiatsu,
    },
  });
}

export function normalizePersonalAbility(ability) {
  if (!ability) return { name: "", description: "" };
  if (typeof ability === "object") {
    return {
      name: ability.name || "",
      description: ability.description || "",
    };
  }
  try {
    const parsed = JSON.parse(ability);
    if (parsed && typeof parsed === "object") {
      return {
        name: parsed.name || "",
        description: parsed.description || "",
      };
    }
  } catch (_error) {
    // Old rows stored this as plain text.
  }
  return {
    name: ability,
    description: "",
  };
}

export function characterToRow(character, currentUser) {
  return {
    id: character.id,
    name: character.name,
    race: character.race,
    affiliation: character.affiliation,
    ability: character.race === "Quincy" ? JSON.stringify(character.ability) : "",
    image: character.image,
    notes: character.notes,
    overview: character.overview,
    history: character.history,
    equipment: character.equipment,
    abilities: character.abilities,
    zanpakuto_name: character.zanpakuto.name,
    activation_command: character.zanpakuto.activationCommand,
    shikai: character.zanpakuto.shikai,
    bankai: character.zanpakuto.bankai,
    health: character.stats.health,
    attack: character.stats.attack,
    defense: character.stats.defense,
    speed: character.stats.speed,
    reiatsu: character.stats.reiatsu,
    wins: character.record.wins,
    losses: character.record.losses,
    updated_by_name: currentUser?.username || currentUser?.email || "",
  };
}

export function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function formatSpanishDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const formatted = new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date).replace(",", "");

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatText(value) {
  return escapeHtml(value || "").replace(/\n/g, "<br>");
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[character];
  });
}

export function getFunctionErrorMessage(error, functionName) {
  if (error.message?.includes("Failed to send a request")) {
    return `The Supabase Edge Function "${functionName}" is not deployed yet. Deploy it from the Supabase CLI, or create this user manually in Supabase Auth.`;
  }
  return error.message;
}

export function clearSupabaseSessionCache() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith("sb-") && key.endsWith("-auth-token"))
    .forEach((key) => localStorage.removeItem(key));
}
