export type Group = {
  slug: string;
  displayName: string;
  whitelist: string[];
};

// Compact format: [slug, displayName, [name, ...]]
type CompactGroup = [string, string, string[]];

let cachedGroups: Group[] | null = null;

function loadGroups(): Group[] {
  if (cachedGroups) return cachedGroups;

  const raw = process.env.GROUPS_CONFIG;
  if (!raw) {
    cachedGroups = [];
    return cachedGroups;
  }

  const compact = JSON.parse(raw) as CompactGroup[];
  cachedGroups = compact.map(([slug, displayName, names]) => ({
    slug,
    displayName,
    whitelist: names,
  }));
  return cachedGroups;
}

export function getGroups(): Group[] {
  return loadGroups();
}

export function getGroup(slug: string): Group | undefined {
  return loadGroups().find((g) => g.slug === slug);
}

export function findByName(
  group: Group,
  name: string
): string | undefined {
  return group.whitelist.find(
    (entry) => entry.toLowerCase() === name.toLowerCase()
  );
}
