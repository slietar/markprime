import * as React from 'react';

import Display from './components/display';
import DisplayMdx from './components/display-mdx';
import Select from './components/select';
import Aside from './components/aside';
import icons from './icons';
import pool from './pool';
import Store from './store';


export default class App extends React.Component {
  constructor() {
    super();

    this.backend = null;
    this.fileController = null;
    this.fileOffsets = {};
    this.refDisplay = React.createRef();
    this.store = new Store((recentFiles) => {
      this.setState({ recentFiles });
    });

    this.state = {
      activeFile: null,
      recentFiles: null,
      tree: null
    };

    pool.add(async () => {
      await this.store.initialize();
    });
  }

  selectFile(fileId) {
    if (this.fileController) {
      this.fileController.abort();
      this.fileController = null;
    }

    if (this.state.activeFile) {
      this.fileOffsets[this.state.activeFile.id] = this.refDisplay.current.getOffset();
    }

    if (fileId !== null) {
      this.fileController = new AbortController();
      this.backend.watch(fileId, (activeFile, initial) => {
        this.setState({ activeFile }, () => {
          if (initial) {
            this.refDisplay.current.setOffset(this.fileOffsets[fileId] ?? 0);
          }
        });
      }, { signal: this.fileController.signal });
    }
  }

  render() {
    return (
      <>
        {this.state.tree
          ? (
            <div className="window-root">
              <Aside activeFileId={this.state.activeFile?.id} tree={this.state.tree}
                onClose={() => {
                  this.backend = null;
                  this.setState({ tree: null });
                }}
                onSelect={(fileId) => {
                  this.selectFile(fileId);
                }} />
              {this.state.activeFile && (
                this.state.activeFile.mdx
                  ? <DisplayMdx file={this.state.activeFile} ref={this.refDisplay} />
                  : <Display file={this.state.activeFile} ref={this.refDisplay} />
              )}
            </div>
          )
          : (
            <Select recentFiles={this.state.recentFiles}
              onSelect={(backend) => {
                pool.add(async () => {
                  await backend.syncStore?.(this.store);
                  let tree = await backend.loadTree();

                  this.backend = backend;
                  this.setState({ tree });
                });
              }}
              onRemoveRecentFile={(infoId) => {
                pool.add(async () => {
                  this.store.remove(infoId);
                });
              }} />
          )}

        <div dangerouslySetInnerHTML={{ __html: icons }} />
      </>
    );
  }
}
