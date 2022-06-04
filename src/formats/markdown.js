export default class MarkdownFormat {
  static name = 'markdown';

  // TODO: make compliant with CommonMark
  static async findName(contents) {
    if (contents[0] === '#') {
      let newlineIndex = contents.search('\n');

      return (
        newlineIndex >= 0
          ? contents.substring(1, newlineIndex)
          : contents.substring(1)
      ).trim() || null;
    }

    return null;
  }
}
