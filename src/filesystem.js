export function findEntryFromRelativePath(startEntry, path) {
  let entry = startEntry;

  for (let segment of path.split('/')) {
    if (!entry) {
      return null;
    }

    if ((segment.length < 1) || (segment === '.')) {
      continue;
    } else if (segment === '..') {
      entry = entry.parent;
    } else if (entry.kind === 'directory') {
      entry = entry.children.find((child) => (child.name === segment))
        || entry.children.find((child) => (child.name.toLowerCase() === segment.toLowerCase()));
    }
  }

  return entry ?? null;
}
