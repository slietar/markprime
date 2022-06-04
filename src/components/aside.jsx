import * as React from 'react';

import Icon from './icon';
import * as util from '../util';


export default class Aside extends React.Component {
  render() {
    let renderItem = (item) => {
      switch (item.kind) {
        case 'directory': return (
          <li key={item.name}>
            <div><span>{item.name}</span></div>
            {(item.children.length > 0) && renderItems(item.children)}
          </li>
        );

        case 'file': return (
          <li className={util.formatClass({ '_active': (this.props.activeFileId === item.id) })} key={item.name}>
            <button type="button" onClick={() => {
              this.props.onSelect(item);
            }}>{item.name}</button>
          </li>
        );
      }
    };

    let renderItems = (items) => (
      <ul>
        {items.map((item) => renderItem(item))}
      </ul>
    );

    return (
      <aside className="aside-root">
        <div className="aside-header">
          <button className="aside-back" onClick={() => {
            this.props.onClose();
          }}>
            <Icon name="arrow-back" />
            <span>Home</span>
          </button>
          <div className="aside-title">{this.props.name ?? 'Untitled workspace'}</div>
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
