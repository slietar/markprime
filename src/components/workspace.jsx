import * as React from 'react';

import Aside from './aside';
import pool from '../pool';
import { findEntryFromRelativePath } from '../filesystem';


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

  get rootPathname() {
    return `/workspace/${this.props.workspace.id}/`;
  }

  handlePath() {
    if (this.props.path !== '/') {
      let entry = findEntryFromRelativePath(this.props.backend.tree, '.' + this.props.path);

      if (entry) {
        this.selectFile(entry, this.props.onDone);
      } else {
        navigation.navigate(this.rootPathname, { history: 'replace' });
      }
    } else {
      this.selectFile(null, this.props.onDone);
    }
  }

  componentDidMount() {
    this.handlePath();
  }

  componentDidUpdate(prevProps) {
    if (this.props !== prevProps) {
      this.handlePath();
    }
  }

  componentWillUnmount() {
    if (this.fileController) {
      this.fileController.abort();
    }
  }

  selectFile(fileEntry, callback) {
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
              callback();
            }
          });
        });
      }, { signal: this.fileController.signal });
    } else {
      this.setState({ selectedFile: null });
      callback();
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
          currentEntryPath={this.props.path}
          name={this.props.workspace.name}
          tree={this.props.backend.tree}
          workspacePathname={this.rootPathname.slice(0, -1)} />
        {contents}
      </div>
    );
  }
}
