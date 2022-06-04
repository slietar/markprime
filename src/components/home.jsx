import * as React from 'react';

import Icon from './icon';
import FilesBackend from '../backends/files';
import FSAccessBackend from '../backends/fs-access';
import pool from '../pool';
import * as util from '../util';


export default class Home extends React.Component {
  controller = new AbortController();

  componentDidMount() {
    document.addEventListener('paste', (event) => {
      let backend = FilesBackend.fromDataTransfer(event.clipboardData);

      if (backend) {
        this.props.onSelect(backend);
      }
    }, { signal: this.controller.signal });
  }

  componentWillUnmount() {
    this.controller.abort();
  }

  render() {
    return (
      <div className="home-root"
        onDragEnter={(event) => {
          if ((event.target === event.currentTarget) && !event.currentTarget.contains(event.relatedTarget)) {
            console.log('drag enter', event.dataTransfer.files[0]);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(event) => {
          event.preventDefault();

          let backend = FilesBackend.fromDataTransfer(event.dataTransfer);

          if (backend) {
            this.props.onSelect(backend);
          }
        }}>
        <div className="home-center">
          <div className="home-brand-root">
            <div className="home-brand-logo">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><g><rect fill="none" height="24" width="24"/></g><g><polygon points="17.2,3 6.8,3 1.6,12 6.8,21 17.2,21 22.4,12"/></g></svg>
            </div>
            <div className="home-brand-title">Markprime</div>
          </div>

          <div className="home-content">
            <p>Drop, select or paste a markdown file.</p>
            <div className="home-buttons">
              <button type="button" className="home-button" onClick={() => {
                if (window.showOpenFilePicker) {
                  pool.add(async () => {
                    let handles = await util.wrapAbortable(window.showOpenFilePicker({
                      multiple: true,
                      types: [
                        { description: 'Markdown or MDX files',
                          accept: {
                            'text/markdown': ['.md'],
                            'text/mdx': ['.mdx']
                          } },
                      ]
                    }));

                    if (handles) {
                      let backend = new FSAccessBackend(handles);
                      this.props.onSelect(backend);
                    }
                  });
                } else {
                  let input = document.createElement('input');
                  input.multiple = true;
                  input.type = 'file';
                  input.accept = '.md,.mdx,text/markdown,text/mdx';
                  input.addEventListener('change', () => {
                    let backend = new FilesBackend(input.files);
                    this.props.onSelect(backend);
                  });

                  input.click();
                }
              }}>Select files</button>
              {window.showDirectoryPicker && (
                <button type="button" className="home-button" onClick={() => {
                  pool.add(async () => {
                    let handle = await util.wrapAbortable(window.showDirectoryPicker());

                    if (handle) {
                      let backend = new FSAccessBackend([handle]);
                      this.props.onSelect(backend);
                    }
                  })
                }}>Select directory</button>
              )}
              <button type="button" className="home-button home-button--github">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" fill="currentColor" /></svg>
                <div>Open GitHub gist</div>
              </button>
            </div>

            {(this.props.recentFiles?.length > 0) && (
              <div className="recent-root">
                <div className="recent-header">
                  <h2 className="recent-title">Recent files</h2>
                </div>
                <ul className="recent-list">
                  {this.props.recentFiles
                    .sort((a, b) => b.date - a.date)
                    .map((info) => (
                      <li className="recent-entry" key={info.id}>
                        <button className="recent-name" onClick={() => {
                          pool.add(async () => {
                            let status = await info.handle.requestPermission();
                            if (status === 'granted') {
                              let backend = new FSAccessBackend([info.handle]);
                              this.props.onSelect(backend);
                            }
                          });
                        }}>
                          <Icon name={info.handle.kind} />
                          <span>{info.handle.name}</span>
                        </button>
                        <button className="recent-remove" onClick={() => {
                          this.props.onRemoveRecentFile(info.id);
                        }}>
                          <Icon name="close" />
                        </button>
                      </li>
                    ))
                  }
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
