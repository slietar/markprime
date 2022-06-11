import * as React from 'react';

import Backends from './backends';
import Home from './components/home';
import Workspace from './components/workspace';
import icons from './icons';
import pool from './pool';
import Store from './store';
import * as util from './util';


export default class App extends React.Component {
  routeLoadDeferred = null;

  constructor() {
    super();

    this.store = new Store((workspaces) => {
      this.setState({ workspaces });
    });

    this.state = {
      currentPage: null,
      loading: true,
      workspaces: null
    };
  }

  componentDidMount() {
    pool.add(async () => {
      await this.store.initialize();

      let gotoUrl = async (url) => {
        // console.log('=>>', url);

        let homePattern = new URLPattern('/', location.origin);
        let workspacePattern = new URLPattern('/workspace/:workspaceId/*', location.origin);

        if (homePattern.test(url)) {
          this.setState({
            currentPage: { name: 'home' },
            loading: false
          });
        } else {
          let match = workspacePattern.exec(url);

          if (match) {
            let path = '/' + match.pathname.groups[0];
            let workspaceId = match.pathname.groups.workspaceId;

            this.routeLoadDeferred = util.defer();

            this.setState({
              currentPage: { name: 'workspace', path, workspaceId },
              loading: false
            });

            await this.routeLoadDeferred.promise;
          } else {
            navigation.navigate('/', { history: 'replace' });
          }
        }
      };

      gotoUrl(navigation.currentEntry.url);

      navigation.addEventListener('navigate', (event) => {
        if (event.canTransition) {
          event.transitionWhile(gotoUrl(event.destination.url));
        }
      });
    });
  }

  render() {
    let component = (() => {
      switch (this.state.currentPage?.name) {
        case 'home': return (
          <Home
            workspaces={this.state.workspaces}
            createWorkspace={(backend) => {
              this.setState({ loading: true });

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

                navigation.navigate(`/workspace/${workspace.id}/`);
              });
            }}
            removeWorkspace={(workspaceId) => {
              pool.add(async () => {
                let { [workspaceId]: _, ...workspaces } = this.state.workspaces;
                await this.store.save(workspaces);
              });
            }} />
        );

        case 'workspace': return (
          <WorkspaceRoute
            app={this}
            key={this.state.currentPage.workspaceId}
            path={this.state.currentPage.path}
            workspaceId={this.state.currentPage.workspaceId}
            onDone={() => {
              this.routeLoadDeferred.resolve();
              this.routeLoadDeferred = null;
            }} />
        );

        default: return null;
      }
    })();

    return (
      <>
        <LazyContent loader={<Loader />} loading={this.state.loading}>
          {component}
        </LazyContent>
        <div dangerouslySetInnerHTML={{ __html: icons }} />
      </>
    );
  }
}


function WorkspaceRoute(props) {
  let [backend, setBackend] = React.useState(null);
  let workspace = props.app.state.workspaces[props.workspaceId];

  React.useEffect(() => {
    if (!workspace) {
      navigation.navigate('/', { history: 'replace' });
      return;
    }

    let backend = new Backends[workspace.type](workspace.source, workspace.id);

    pool.add(async () => {
      await backend.loadTree();
      setBackend(backend);
    });
  }, []);

  return (
    <LazyContent loader={<Loader />} loading={!backend}>
      <Workspace
        backend={backend}
        onDone={props.onDone}
        path={props.path}
        workspace={workspace} />
    </LazyContent>
  );
}


function Loader() {
  return (
    <div className="loader-outer">
      <div className="loader-inner">Loading</div>
    </div>
  );
}

function LazyContent(props) {
  let [loaderVisible, setLoaderVisible] = React.useState(false);

  let delayBeforeLoaderVisible = 200;
  let delayAfterLoaderVisible = 600;

  let timeoutId = React.useRef(null);
  let loaderVisibleTime = React.useRef(null);

  React.useEffect(() => {
    if (props.loading && !loaderVisible) {
      timeoutId.current = setTimeout(() => {
        timeoutId.current = null;
        loaderVisibleTime.current = Date.now();
        setLoaderVisible(true);
      }, delayBeforeLoaderVisible);
    }

    if (!props.loading && loaderVisible) {
      let delay = delayAfterLoaderVisible - (Date.now() - loaderVisibleTime.current);

      if (delay > 0) {
        timeoutId.current = setTimeout(() => {
          timeoutId.current = null;
          loaderVisibleTime.current = null;
          setLoaderVisible(false);
        }, delay);
      } else {
        setLoaderVisible(false);
        loaderVisibleTime.current = null;
      }
    }

    return () => {
      if (timeoutId.current !== null) {
        clearTimeout(timeoutId.current);
        timeoutId.current = null;
      }
    };
  }, [props.loading]);

  return loaderVisible
    ? props.loader
    : props.loading
      ? null
      : props.children;
}
