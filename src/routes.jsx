import React from 'react';
import { Router, Route, IndexRoute } from 'react-router';
import { createHistory } from 'history';
import Application from './components/routes/application';
import Index from './components/routes/index';

export default (
  <Router history={createHistory()}>
    <Route path="/" component={Application}>
      <IndexRoute component={Index} />
    </Route>
  </Router>
);
