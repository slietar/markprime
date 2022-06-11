import * as React from 'react';

import Icon from './icon';
import Backends from '../backends';
import FilesBackend from '../backends/files';
import FSAccessBackend from '../backends/fs-access';
import pool from '../pool';
import * as util from '../util';
import { formatRelativeTime } from '../format';


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
    let workspaces = this.props.workspaces && Object.values(this.props.workspaces);

    if (!workspaces) {
      return (
        <div />
      );
    }

    return (
      <div
        className={util.formatClass('home-root', { 'home-root--split': (workspaces.length > 0) })}
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
          <div className="home-left">
            <div className="home-brand-root">
              <div className="home-brand-logo">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><g><rect fill="none" height="24" width="24" /></g><g><polygon points="17.2,3 6.8,3 1.6,12 6.8,21 17.2,21 22.4,12" /></g></svg>
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
                          {
                            description: 'Markdown or MDX files',
                            accept: {
                              'text/markdown': ['.md'],
                              'text/mdx': ['.mdx']
                            }
                          },
                        ]
                      }));

                      if (handles) {
                        let backend = FSAccessBackend.fromHandles(handles);
                        this.props.createWorkspace(backend);
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
                        let backend = FSAccessBackend.fromDirectoryHandle(handle);
                        this.props.createWorkspace(backend);
                      }
                    })
                  }}>Select directory</button>
                )}
                <button type="button" className="home-button home-button--github">
                  <Icon name="github" />
                  <div>Open GitHub gist</div>
                </button>
              </div>
            </div>
          </div>

          {(workspaces.length > 0) && (
            <div className="home-right recent-root">
              {/* <input type="text" placeholder="Search for files" className="recent-input" />
              <div className="recent-filters">
                <button type="button" className="recent-filter">
                  <Icon name="directory" />
                  <div>Directories</div>
                </button>
                <button type="button" className="recent-filter">
                  <Icon name="github" />
                  <div>GitHub gists</div>
                </button>
              </div> */}
              <div className="recent-list">
                {workspaces.map((workspace) => (
                  <div className="recent-entry-root" key={workspace.id}>
                    <a href={`/workspace/${workspace.id}/`} className="recent-entry-button">
                      <Icon name={Backends[workspace.type].getWorkspaceIcon(workspace.source)} className="recent-entry-icon" />
                      <div className="recent-entry-title">{workspace.name ?? 'Untitled workspace'}</div>
                      <div className="recent-entry-subtitle">Last opened {formatRelativeTime(workspace.lastOpened)}</div>
                    </a>
                    <div className="recent-entry-actions">
                      <button type="button" className="recent-entry-remove" onClick={() => {
                        this.props.removeWorkspace(workspace.id);
                      }}>
                        <Icon name="close" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}
