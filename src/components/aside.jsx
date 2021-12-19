import * as React from 'react';

import * as util from '../util';


export default class Aside extends React.Component {
  render() {
    let renderItem = (item) => {
      switch (item.kind) {
        case 'dir': return (
          <li key={item.name}>
            <div>{item.name}</div>
            {(item.children.length > 0) && renderItems(item.children)}
          </li>
        );
        case 'file': return (
          <li className={util.formatClass({ '_active': (this.props.activeFileId === item.id) })} key={item.name}>
            <button type="button" onClick={() => {
              this.props.onSelect(item.id);
            }}>{item.name}</button>
          </li>
        );
      }
      return (
        <li className={util.formatClass({ '_active': (item.kind === 'file') && (this.props.activeFileId === item.id) })} key={item.name}>
          <button type="button" onClick={() => {
            this.props.onSelect(item.id);
          }}>{item.name}</button>
          {(item.kind === 'dir') && (item.children.length > 0) && renderItems(item.children)}
        </li>
      )
    };

    let renderItems = (items) => (
      <ul>
        {items.map((item) => renderItem(item))}
      </ul>
    );

    return (
      <aside className="aside-root">
        <div className="aside-title">{this.props.tree.name ?? 'Notebook'}</div>
        <div className="aside-tree">
          {renderItems(this.props.tree.children)}
        </div>

      </aside>
    );
  }
}
