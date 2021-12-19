import * as React from 'react';

import Display from './components/display';
import Select from './components/select';
import Aside from './components/aside';
import pool from './pool';


export default class App extends React.Component {
  constructor() {
    super();

    this.backend = null;
    this.fileController = null;
    this.fileOffsets = {};
    this.refDisplay = React.createRef();

    this.state = {
      activeFile: null,
      tree: null
    };
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
      // pool.add(async () => {
      //   this.setState({
      //     activeFile: await this.backend.get(fileId)
      //   });
      // });

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
              <Aside activeFileId={this.state.activeFile?.id} tree={this.state.tree} onSelect={(fileId) => {
                this.selectFile(fileId);
              }} />
              {this.state.activeFile && <Display file={this.state.activeFile} ref={this.refDisplay} />}
            </div>
          )
          : (
            <Select onSelect={(backend) => {
              pool.add(async () => {
                let tree = await backend.loadTree();

                this.backend = backend;
                this.setState({ tree });
              });
            }}/>
          )}
      </>
    );
  }
}
