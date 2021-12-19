import * as React from 'react';

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
                    let backend = new FSAccessBackend(handle);
                    this.props.onSelect(backend);
                  }
                })
              }}>Select directory</button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
