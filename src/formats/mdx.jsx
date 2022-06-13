import * as esbuild from 'esbuild-wasm';
import * as mdx from '@mdx-js/mdx';
import * as React from 'react';
import * as ReactRuntime from 'react/jsx-runtime';
import * as ReactDOM from 'react-dom';

import { findEntryFromRelativePath } from '../filesystem';
import pool from '../pool';


window.React = React;
window.ReactRuntime = ReactRuntime;

let esbuildInit = null;


export default class MDXRenderer extends React.Component {
  refMain = React.createRef();
  refRoot = React.createRef();

  unmounted = false;

  constructor(props) {
    super(props);

    this.state = {
      contents: null,
      errorMessage: null
    };
  }

  componentDidMount() {
    if (!esbuildInit) {
      esbuildInit = esbuild.initialize({
        wasmURL: '/esbuild.wasm',
      });

      pool.add(() => esbuildInit);
    }

    this.bundle();
  }

  componentDidUpdate(prevProps, prevState, _snapshot) {
    if (this.props !== prevProps) {
      this.bundle();
    }

    if ((this.state.document !== prevState.document) && this.state.document) {
      ReactDOM.render(this.state.document.contents, this.refMain.current);

      this.refMain.current.adoptedStyleSheets = this.state.document.styleSheet
        ? [this.state.document.styleSheet]
        : [];
    }
  }

  componentWillUnmount() {
    this.unmounted = true;
  }

  bundle() {
    if (this.state.document || this.state.errorMessage) {
      this.setState({
        document: null,
        errorMessage: null
      });
    }

    pool.add(async () => {
      await esbuildInit;

      let cache = {};

      let resolveUrl = async (path, importer = null) => {
        let url = importer ? new URL(path, importer) : path;
        let res = await fetch(url);

        cache[res.url] = await res.text();
        return res.url;
      };

      let known = {
        'react': 'React',
        'react/jsx-runtime': 'ReactRuntime'
      };

      let result = await esbuild.build({
        entryPoints: ['entry'],
        bundle: true,
        format: 'esm',
        loader: {
          '.css': 'file'
        },
        outdir: '.',

        plugins: [
          {
            name: 'loadsx',
            setup: (build) => {
              build.onResolve({ filter: /^entry$/ }, (args) => {
                return {
                  path: this.props.entry.path,
                  namespace: 'local',
                  pluginData: { entry: this.props.entry }
                };
              });

              build.onResolve({ filter: /^react(?:\/jsx-runtime)?$/ }, (args) => {
                return {
                  path: args.path,
                  namespace: 'known'
                };
              });

              build.onResolve({ filter: /^https?:\/\// }, async (args) => {
                return {
                  path: await resolveUrl(args.path),
                  namespace: 'http-url'
                };
              });

              build.onResolve({ filter: /^[@a-z].*/ }, async (args) => {
                return {
                  path: await resolveUrl('https://unpkg.com/' + args.path),
                  namespace: 'http-url'
                };
              });

              build.onResolve({ filter: /.*/, namespace: 'http-url' }, async (args) => {
                return {
                  path: await resolveUrl(args.path, args.importer),
                  namespace: 'http-url',
                };
              });

              build.onResolve({ filter: /\..+$/ }, (args) => {
                return {
                  path: args.path,
                  namespace: 'local',
                  pluginData: { entry: findEntryFromRelativePath(args.pluginData.entry.parent, args.path) }
                };
              });

              build.onLoad({ filter: /.*/, namespace: 'known' }, async (args) => {
                return { contents: `module.exports = window.${known[args.path]}` };
              });

              build.onLoad({ filter: /.*\.mdx?$/, namespace: 'local' }, async (args) => {
                let { entry } = args.pluginData;
                let text = await (await entry.getBlob()).text();
                let compiled = await mdx.compile(text);

                return {
                  contents: compiled.value,
                  loader: 'jsx',
                  pluginData: { entry }
                };
              });

              build.onLoad({ filter: /.*$/, namespace: 'local' }, async (args) => {
                let { entry } = args.pluginData;
                let text = await (await entry.getBlob()).text();

                return {
                  contents: text,
                  loader: 'jsx',
                  pluginData: { entry }
                };
              });

              build.onLoad({ filter: /.*\.css/, namespace: 'http-url' }, async (args) => {
                return { contents: cache[args.path], loader: 'css' };
              });

              build.onLoad({ filter: /.*/, namespace: 'http-url' }, async (args) => {
                let text = cache[args.path];

                return { contents: text, loader: 'jsx' };
              });
            }
          }
        ]
      });

      if (this.unmounted) {
        return;
      }

      let decoder = new TextDecoder();
      let outputFile = result.outputFiles.find((outputFile) => outputFile.path === '/entry.js');
      let outputText = decoder.decode(outputFile.contents);

      // TODO: avoid URL leak
      let outputUrl = URL.createObjectURL(new Blob([outputText], { type: 'text/javascript' }));
      let { default: contentsProducer } = await import(outputUrl);

      let styleSheet = null;
      let cssFile = result.outputFiles.find((outputFile) => outputFile.path === '/entry.css');

      if (cssFile) {
        styleSheet = new CSSStyleSheet();
        await styleSheet.replace(decoder.decode(cssFile.contents));
      }

      if (!this.unmounted) {
        this.setState({
          document: {
            contents: contentsProducer(),
            styleSheet
          }
        });
      }
    }).catch((err) => {
      window.err = err;
      if (!this.unmounted) {
        this.setState({ errorMessage: err.message || true });
      }
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
        {this.state.document
          ? (
            <main ref={(ref) => {
              let shadow = ref?.shadowRoot ?? ref?.attachShadow({ mode: 'open' });
              this.refMain.current = shadow;
            }}>
            {this.state.document.contents}</main>
          )
          : (
            this.state.errorMessage
              ? <div className="display-error">An error occured{typeof this.state.errorMessage === 'string' ? `: « ${this.state.errorMessage} »` : ''}</div>
              : <div className="display-loading">Loading</div>
          )}
      </div>
    );
  }


  static getDerivedStateFromError(err) {
    return {
      contents: null,
      errorMessage: err.message || true
    };
  }

  static async getName(entry) {
    return null;
  }
}
