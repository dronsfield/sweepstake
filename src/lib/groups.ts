export type WhitelistEntry = {
  phoneNumber: string;
  name: string;
};

export type Group = {
  slug: string;
  displayName: string;
  whitelist: WhitelistEntry[];
};

// Compact format: [slug, displayName, [[phone, name], ...]]
type CompactGroup = [string, string, [string, string][]];

let cachedGroups: Group[] | null = null;

function loadGroups(): Group[] {
  if (cachedGroups) return cachedGroups;

  const raw = process.env.GROUPS_CONFIG;
  if (!raw) {
    cachedGroups = [];
    return cachedGroups;
  }

  const compact = JSON.parse(raw) as CompactGroup[];
  cachedGroups = compact.map(([slug, displayName, entries]) => ({
    slug,
    displayName,
    whitelist: entries.map(([phoneNumber, name]) => ({ phoneNumber, name })),
  }));
  return cachedGroups;
}

export function getGroups(): Group[] {
  return loadGroups();
}

export function getGroup(slug: string): Group | undefined {
  return loadGroups().find((g) => g.slug === slug);
}

export function findByPhone(
  group: Group,
  phoneNumber: string
): WhitelistEntry | undefined {
  return group.whitelist.find((entry) => entry.phoneNumber === phoneNumber);
}
