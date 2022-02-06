import * as React from 'react';

import Icon from './icon';
import FilesBackend from '../backends/files';
import FSAccessBackend from '../backends/fs-access';
import pool from '../pool';
import * as util from '../util';


export default class Select extends React.Component {
  constructor() {
    super();

    this.controller = new AbortController();
  }

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
      <div className="dropzone-root"
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
        <div className="dropzone-center">
          <p>Drop, select or paste a markdown file.</p>
          <div className="dropzone-buttons">
            <button type="button" onClick={() => {
              if (window.showOpenFilePicker) {
                pool.add(async () => {
                  let handles = await util.wrapAbortable(window.showOpenFilePicker({
                    multiple: true,
                    types: [
                      { description: 'Markdown files',
                        accept: { 'text/markdown': ['.md'] } }
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
                input.accept = '.md,text/markdown';
                input.addEventListener('change', () => {
                  let backend = new FilesBackend(input.files);
                  this.props.onSelect(backend);
                });

                input.click();
              }
            }}>Select files</button>
            {window.showDirectoryPicker && (
              <button type="button" onClick={() => {
                pool.add(async () => {
                  let handle = await util.wrapAbortable(window.showDirectoryPicker());

                  if (handle) {
                    let backend = new FSAccessBackend([handle]);
                    this.props.onSelect(backend);
                  }
                })
              }}>Select directory</button>
            )}
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
{/*
          <div className="recent-root">
            <div className="recent-header">
              <h2 className="recent-title">Recent files</h2>
            </div>
            <ul className="recent-list">
              <li className="recent-entry">
                <button className="recent-name">
                  <Icon name="file" />
                  <span>README.md</span>
                </button>
                <button className="recent-remove"><Icon name="close" /></button>
              </li>
              <li className="recent-entry">
                <button className="recent-name">
                  <Icon name="file" />
                  <span>concepts</span>
                </button>
                <button className="recent-remove"><Icon name="close" /></button>
              </li>
              <li className="recent-entry">
                <button className="recent-name">
                  <Icon name="directory" />
                  <span>concepts</span>
                </button>
                <button className="recent-remove"><Icon name="close" /></button>
              </li>
            </ul>
          </div> */}
        </div>
      </div>
    );
  }
}
