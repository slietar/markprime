import * as React from 'react';

import Aside from './aside';
import pool from '../pool';


export default class Workspace extends React.Component {
  fileController = null;
  fileOffsets = {};
  refDisplay = React.createRef();

  constructor(props) {
    super(props);

    this.state = {
      selectedFile: null
    };
  }

  componentWillUnmount() {
    if (this.fileController) {
      this.fileController.abort();
    }
  }

  selectFile(fileEntry) {
    if (this.fileController) {
      this.fileController.abort();
      this.fileController = null;
    }

    if (this.state.selectedFile) {
      this.fileOffsets[this.state.selectedFile.entry.id] = this.refDisplay.current.getOffset();
    }

    if (fileEntry !== null) {
      this.fileController = new AbortController();

      this.props.backend.watch(fileEntry, (file, initial) => {
        pool.add(async () => {
          let contents = await file.text();

          this.setState({
            selectedFile: { contents, entry: fileEntry }
          }, () => {
            if (initial) {
              this.refDisplay.current.setOffset(this.fileOffsets[fileEntry.id] ?? 0);
            }
          });
        });
      }, { signal: this.fileController.signal });
    }
  }

  render() {
    let contents = null;

    if (this.state.selectedFile) {
      let Renderer = this.state.selectedFile.entry.format;
      contents = <Renderer
        contents={this.state.selectedFile.contents}
        entry={this.state.selectedFile.entry}
        ref={this.refDisplay} />;
    }

    return (
      <div className="window-root">
        <Aside
          activeFileId={this.state.selectedFile?.entry.id}
          name={this.props.workspace.name}
          tree={this.props.backend.tree}
          onClose={this.props.onClose}
          onSelect={(fileEntry) => {
            this.selectFile(fileEntry);
          }} />
        {contents}
      </div>
    );
  }
}
