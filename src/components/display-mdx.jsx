import * as esbuild from 'esbuild-wasm';
import * as mdx from '@mdx-js/mdx'
import * as React from 'react';
import * as ReactRuntime from 'react/jsx-runtime';

import pool from '../pool';


window.React = React;
window.ReactRuntime = ReactRuntime;

let esbuildInit = null;


export default class Display extends React.Component {
  constructor() {
    super();

    this.refRoot = React.createRef();

    this.state = {
      contents: null,
      errorMessage: null
    };
  }

  componentDidMount() {
    if (!esbuildInit) {
      esbuildInit = esbuild.initialize({
        wasmURL: 'esbuild.wasm',
      });

      pool.add(() => esbuildInit);
    }

    this.bundle();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.props !== prevProps) {
      this.bundle();
    }
  }

  bundle() {
    if (this.state.contents || this.state.errorMessage) {
      this.setState({
        contents: null,
        errorMessage: null
      });
    }

    pool.add(async () => {
      await esbuildInit;

      let contents = this.props.file.contents;
      let compiled = await mdx.compile(contents);

      let input = compiled.value;
      let name = 'index.js';
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

        plugins: [
          {
            name: 'loadsx',
            setup(build) {
              build.onResolve({ filter: /^entry$/ }, (args) => {
                return { path: '/' + name };
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
                return { path: '/' + name.substring(1) };
              });

              build.onLoad({ filter: /.*/, namespace: 'known' }, async (args) => {
                return { contents: `module.exports = window.${known[args.path]}` };
              });

              build.onLoad({ filter: new RegExp(`^/${name}$`) }, async (args) => {
                return { contents: input, loader: 'jsx' };
              });

              build.onLoad({ filter: /.*/, namespace: 'http-url' }, async (args) => {
                let text = cache[args.path];

                return { contents: text, loader: 'jsx' };
              });
            }
          }
        ]
      });

      let decoder = new TextDecoder();
      let outputText = decoder.decode(result.outputFiles[0].contents);

      let outputUrl = URL.createObjectURL(new Blob([outputText], { type: 'text/javascript' }));
      let { default: contentsProducer } = await import(outputUrl);

      this.setState({ contents: contentsProducer() });
    }).catch((err) => {
      this.setState({ errorMessage: err.message || true });
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
        {this.state.contents
          ? (
            <main>{this.state.contents}</main>
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
}
