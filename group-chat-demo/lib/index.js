var express = require('express');
var app = express();

var config = require('./config.js');

var path = require('path');
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'jade');

app.use(express.static('public'));

var port = process.env.PORT || config.serverPort;
var server = app.listen(port);
var io = require('socket.io').listen(server);

console.log('Server started at port ' + port);

// configure Redis client connections
var redisConnector = require('./redis_client.js'),
  redisCredentials = config.redis;

var redisClient = redisConnector.createClient(redisCredentials), 
  redisSubscriber = redisConnector.createClient(redisCredentials);

//redisSubscriber.subscribe('messages');

// configure datastore
var Datastore = require('./datastore.js');
var datastore = new Datastore(redisClient);

// authentication
var auth = require('./auth.js');
auth(app, datastore, redisClient);

// rest apis
var router = express.Router();
app.use('/rest', router);
require('./rest.js')(router, datastore, auth);

// init chat features
require('./chat.js')(io, redisClient, redisSubscriber, datastore);