import { findFormat } from './formats';


export async function createTree(initialData, options) {
  let index = 0;
  let createId = () => (index++).toString();

  let processItemDirectory = async (id, item, depth) => {
    let childrenRaw = await Promise.all(
      item.children
        .filter((childData) => !options.getName(childData).startsWith('.'))
        .map(async (childData) => await processItem(childData, depth + 1))
    );

    let children = childrenRaw.filter((child) => (child !== null));

    let hasFormattableFiles = children.some((entry) => (entry.kind === 'directory') ? entry.hasFormattableFiles : entry.format);
    let hasImmediateFormattableFiles = children.some((entry) => (entry.kind === 'file') && entry.format);
    let childrenWithFormattableFiles = children.filter((entry) => (entry.kind === 'directory') && entry.hasFormattableFiles);

    let entry = {
      ...item,
      id,
      get path() {
        return this.parent
          ? (this.parent.path + this.name + '/')
          : '/';
      },
      children,
      collapseChild: hasFormattableFiles && !hasImmediateFormattableFiles && (childrenWithFormattableFiles.length === 1)
        ? childrenWithFormattableFiles[0]
        : null,
      hasFormattableFiles,
      parent: null,
      truncated: (children.length !== childrenRaw.length)
    };

    for (let child of children) {
      child.parent = entry;
    }

    return entry;
  };

  let processItem = async (data, depth) => {
    if ((depth > (options?.maxDepth ?? 5)) || (index >= (options?.maxEntryCount ?? 100))) {
      return null;
    }

    let item = await options.processItem(data);
    let id = item.id ?? createId();

    switch (item.kind) {
      case 'directory': {
        return await processItemDirectory(id, item, depth);
      }

      case 'file': {
        return {
          ...item,
          id,
          format: item.format ?? findFormat(item.name),
          parent: null,
          get path() {
            return (this.parent?.path ?? '/') + this.name;
          },
          async getMetadata() {
            return {
              name: await this.format.getName(this)
            };
          }
        };
      }
    }
  };

  return Array.isArray(initialData)
    ? await processItemDirectory(createId(), { kind: 'directory', name: null, children: initialData }, 0)
    : await processItem(initialData, 0);
}


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
