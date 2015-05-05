var express = require('express');
var app = express();

var path = require('path');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(express.static('public'));

var port = process.env.PORT || 3000;
var server = app.listen(port);
var io = require('socket.io').listen(server);

// Configure Redis client connection
var redis = require('redis');
var credentials;
// Check if we are in BlueMix or localhost
if(process.env.VCAP_SERVICES) {
  // On BlueMix read connection settings from
  // VCAP_SERVICES environment variable
  var env = JSON.parse(process.env.VCAP_SERVICES);
  credentials = env['redis-2.6'][0]['credentials'];
} else {
  // On localhost just hardcode the connection details
  credentials = { "host": "127.0.0.1", "port": 6379 }
}
// Connect to Redis
var redisClient, redisSubscriber;

var connectToRedis = function() {
  redisClient = redis.createClient(credentials.port, credentials.host);
  redisSubscriber = redis.createClient(credentials.port, credentials.host);
  if('password' in credentials) {
    redisClient.auth(credentials.password);
    redisSubscriber.auth(credentials.password);
  }
};
connectToRedis();
redisSubscriber.subscribe('messages');

var Datastore = require('./datastore.js');
var datastore = new Datastore(redisClient);

var router = express.Router();

app.use('/rest', router);

require('./rest.js')(router, datastore);
require('./auth.js')(app, datastore);
require('./chat.js')(io, redisClient, redisSubscriber, datastore);