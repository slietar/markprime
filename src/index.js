import * as React from 'react';
import * as ReactDOM from 'react-dom';

import App from './app';
import pool from './pool';


document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(<App />, document.getElementById('root'));
});
