import HighlightJs from 'highlight.js/lib/common';
import MarkdownIt from 'markdown-it';
import * as React from 'react';

import { findEntryFromRelativePath } from '../filesystem';
import pool from '../pool';


export default class MarkdownRenderer extends React.Component {
  static name = 'markdown';

  objects = new Map();
  refRoot = React.createRef();
  renderCount = 0;

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

    this.state = {
      htmlContents: null,
      oldContents: null
    };
  }

  componentDidMount() {
    this.renderMarkdown();
  }

  componentDidUpdate() {
    if (this.state.htmlContents === null) {
      this.renderMarkdown();
    }
  }

  componentWillUnmount() {
    for (let object of this.objects.values()) {
      URL.revokeObjectURL(object.url);
    }
  }

  renderMarkdown() {
    let env = {};
    let tokens = this.md.parse(this.props.contents, env);

    let renderIndex = this.renderCount++;

    let traverseTokens = async (tokens) => {
      for (let token of tokens) {
        if (token.type === 'image') {
          let srcAttr = token.attrs.find(([key, _value]) => (key === 'src'));

          if (!(/^https?:\/\/|data:/i).test(srcAttr[1])) {
            let entry = findEntryFromRelativePath(this.props.entry.parent, srcAttr[1]);

            if (entry) {
              let url;

              if (this.objects.has(entry)) {
                let object = this.objects.get(entry);
                object.lastRenderIndex = renderIndex;
                url = object.url;
              } else {
                let blob = await entry.getBlob();
                url = URL.createObjectURL(blob);

                this.objects.set(entry, {
                  lastModified: 0,
                  lastRenderIndex: renderIndex,
                  url
                });
              }

              srcAttr[1] = url;
            } else {
              srcAttr[1] = '';
            }
          }
        }

        if (token.children) {
          await traverseTokens(token.children);
        }
      }
    };

    pool.add(async () => {
      await traverseTokens(tokens);

      for (let [entry, object] of this.objects.entries()) {
        if (object.lastRenderIndex !== renderIndex) {
          this.objects.delete(entry);
          URL.revokeObjectURL(object.url);
        }
      }

      this.setState({
        htmlContents: this.md.renderer.render(tokens, this.md.options, env)
      });
    });
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
        {(this.state.htmlContents !== null)
          ? <main dangerouslySetInnerHTML={{ __html: this.state.htmlContents }} />
          : <div className="display-loading">Loading</div>}
      </div>
    );
  }

  static getDerivedStateFromProps(props, state) {
    if (props.contents !== state.oldContents) {
      return {
        htmlContents: null,
        oldContents: props.contents
      };
    }

    return null;
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
