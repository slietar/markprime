import HighlightJs from 'highlight.js/lib/common';
import MarkdownIt from 'markdown-it';
import * as React from 'react';


export default class MarkdownRenderer extends React.Component {
  static name = 'markdown';

  constructor(props) {
    super(props);

    this.md = new MarkdownIt({
      highlight(str, lang) {
        if (lang && HighlightJs.getLanguage(lang)) {
          try {
            return `<pre><code data-language="${HighlightJs.getLanguage(lang).name}">` + HighlightJs.highlight(str, { language: lang }).value + '</code></pre>';
          } catch (err) {

          }
        }

        return '';
      }
    });

    this.refMain = React.createRef();
    this.refRoot = React.createRef();
  }

  componentDidMount() {
    this.renderMarkdown();
  }

  componentDidUpdate() {
    this.renderMarkdown();
  }

  renderMarkdown() {
    this.refMain.current.innerHTML = this.md.render(this.props.contents);
  }

  getOffset() {
    return this.refRoot.current.scrollTop;
  }

  setOffset(value) {
    this.refRoot.current.scrollTop = value;
  }

  render() {
    return (
      <div className="display-root" ref={this.refRoot}>
        <main ref={this.refMain} />
      </div>
    );
  }


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
