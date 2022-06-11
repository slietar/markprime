import * as React from 'react';

import Icon from './icon';
import * as util from '../util';


export default class Aside extends React.Component {
  render() {
    let renderItem = (item, prefix = '') => {
      switch (item.kind) {
        case 'directory': return item.collapseChild
          ? renderItem(item.collapseChild, prefix + item.name + '/')
          : (
            <li key={item.name}>
              <div><span>{prefix + item.name}</span></div>
              {(item.children.length > 0) && renderItems(item.children)}
            </li>
          );

        case 'file': return (
          <li className={util.formatClass({ '_active': (this.props.currentEntryPath === item.path) })} key={item.name}>
            <a href={this.props.workspacePathname + item.path}>{item.name}</a>
          </li>
        );
      }
    };

    let renderItems = (items) => (
      <ul>
        {items
          .filter((item) => (item.kind === 'directory') ? item.hasFormattableFiles : item.format)
          .map((item) => renderItem(item))}
      </ul>
    );

    return (
      <aside className="aside-root">
        <div className="aside-header">
          <a href="/" className="aside-back" onClick={(event) => {
            let entries = navigation.entries();
            let entry = entries.findLast((entry) => entry.url === new URL('/', location.origin).href);

            if (entry) {
              event.preventDefault();
              navigation.traverseTo(entry.key);
            }
          }}>
            <Icon name="arrow-back" />
            <span>Home</span>
          </a>
          <a href={this.props.workspacePathname + '/'} className="aside-title">{this.props.name ?? 'Untitled workspace'}</a>
        </div>
        <div className="aside-tree">
          {renderItems(this.props.tree.children)}
        </div>
        <button type="button" className="aside-preferences">
          <Icon name="settings" />
          <span>Preferences</span>
        </button>
      </aside>
    );
  }
}
