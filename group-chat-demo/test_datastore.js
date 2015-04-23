var redis = require('redis');
var redisClient = redis.createClient(6379, 'localhost');
var Datastore = require('./datastore.js');

var datastore = new Datastore(redisClient);

datastore.createUser('khiem', 'dohoangkhiem@gmail.com', 'khiem do', 'a', function(err, res) {
  if (err) console.log('Error: ' + err);
  console.log('Response: ' + res);
  datastore.getUser(res, function(err, value) {
    console.log('Got user ' + JSON.stringify(value));
  });
});


