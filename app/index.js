/**
 * CoPlay is a dynamic playlist generated through social integration between
 * Spotify users. It should be use as a reference for Telia Zone API
 * integrations.
 * Copyright (C) 2016  Telia

 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';

const express = require('express');
const app = express();
const http = require('http').Server(app);
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const morgan = require('morgan');  // request logger

require('./services/spotify-service').setup();
require('./services/socket-service').setup(http);

const kServerPort = Number(process.env.PORT);
if (!kServerPort || isNaN(kServerPort)) {
  throw Error(`Invalid port (${kServerPort})`);
}

require('./services/mongo-service')();

app.use(morgan('combined'));  // request logger

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

app.set('trust proxy', 'loopback');  // ensure request IPs are passed along properly

app.engine('.hbs', exphbs({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: 'app/views/layouts',
  partialsDir: 'app/views/partials'
}));
app.set('view engine', '.hbs');
app.set('views', 'app/views');

if (process.env.NODE_ENV === 'development') {
  app.use('/static', express.static(__dirname + '/public'));
} else {
  // NOTE: Intentionally not handling static requests in non-development mode
  // - those should go through the nginx reverse proxy
}

// configure routes
require('./routes/api-routes')(app);
require('./routes/page-routes')(app, kServerPort);
require('./routes/webhook-routes')(app);

http.listen(kServerPort, () => {
  console.log(`Application listening on port ${kServerPort}`);
});
