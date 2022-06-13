export default /* abstract */ class CommonBackend {
  /* abstract */ async findTreeName() {
    return null;
  }

  async getMetadata() {
    let mainEntry = await this._findMainEntry();

    return {
      mainEntry,
      name: await this._findName(mainEntry)
    };
  }

  async _findMainEntry() {
    let rootEntries = this.tree.children.filter((child) => (child.kind === 'file') && child.format);

    for (let entry of rootEntries) {
      let basename = entry.name.split('.').slice(0, -1).join('.');

      if (['index', 'main', 'readme'].includes(basename.toLowerCase())) {
        return entry;
      }
    }

    if (rootEntries.length === 1) {
      return rootEntries[0];
    }

    return null;
  }

  async _findName(mainEntry) {
    if (mainEntry) {
      let metadata = await mainEntry.getMetadata();

      if (metadata.name) {
        return metadata.name;
      }
    }

    // for (let entry of tree.children) {
    //   let name = await entry.format?.findName?.();

    //   if (name) {
    //     return name;
    //   }
    // }

    {
      let name = await this.getTreeName();

      if (name) {
        return name;
      }
    }

    let formatOtherFilesCount = (count) => (count > 0)
      ? ` (+ ${count} file${(count > 1) ? 's' : ''})`
      : '';

    let rootEntries = this.tree.children.filter((child) => (child.kind === 'file'));
    let rootEntriesFormattable = rootEntries.filter((child) => child.format);

    for (let child of rootEntriesFormattable) {
      let name = await child.format.getName(child);

      if (name) {
        return name + formatOtherFilesCount(rootEntriesFormattable.length - 1);
      }
    }

    if (rootEntriesFormattable.length > 0) {
      return rootEntriesFormattable[0].name + formatOtherFilesCount(rootEntriesFormattable.length - 1);
    }

    return null;
  }
}
