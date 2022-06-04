import * as React from 'react';

import Backends from './backends';
import Home from './components/home';
import Workspace from './components/workspace';
import icons from './icons';
import pool from './pool';
import Store from './store';


export default class App extends React.Component {
  constructor() {
    super();

    this.store = new Store((workspaces) => {
      this.setState({ workspaces });
    });

    this.state = {
      current: null,
      workspaces: null
    };

    pool.add(async () => {
      await this.store.initialize();
    });
  }

  render() {
    return (
      <>
        {this.state.current
          ? <Workspace
            backend={this.state.current.backend}
            workspace={this.state.current.workspace}
            onClose={() => {
              this.setState({ current: null });
            }} />
          : (
            <Home
              workspaces={this.state.workspaces}
              createWorkspace={(backend) => {
                pool.add(async () => {
                  let name = await backend.findName();
                  let workspace = {
                    id: backend.id,
                    lastOpened: Date.now(),
                    name,
                    source: await backend.saveSource(),
                    type: backend.constructor.name
                  };

                  await this.store.save({
                    ...this.state.workspaces,
                    [workspace.id]: workspace
                  });

                  this.setState({
                    current: {
                      backend,
                      workspace
                    }
                  });
                });
              }}
              openWorkspace={(workspaceId) => {
                let workspace = this.state.workspaces[workspaceId];
                let backend = new Backends[workspace.type](workspace.source, workspace.id);

                pool.add(async () => {
                  await backend.loadTree();

                  this.setState({
                    current: {
                      backend,
                      workspace
                    }
                  });
                });
              }}
              removeWorkspace={(workspaceId) => {
                pool.add(async () => {
                  let { [workspaceId]: _, ...workspaces } = this.state.workspaces;
                  await this.store.save(workspaces);
                });
              }} />
          )}

        <div dangerouslySetInnerHTML={{ __html: icons }} />
      </>
    );
  }
}
