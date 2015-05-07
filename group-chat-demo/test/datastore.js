var redis = require('redis-mock');
var test = require('unit.js');

var Datastore = require('../datastore.js');
var datastore = new Datastore(redis.createClient());

var userCallback = function(err, res) {
  if (err) {
    console.log('Error: ' + err);
    return;
  }

  console.log('Response: ' + res);
  datastore.getUser(res, function(err, value) {
    console.log('Got user ' + JSON.stringify(value));
  });
}

datastore.createUser('admin', 'admin@localhost.com', 'Administrator', 'a', function(err, reply) {
  test.assert(err == null || err == undefined);

  console.log('Response: ' + reply);

  test.assert(!isNaN(+reply));

  test.assert(reply > 0);
  
  datastore.getUser(reply, function(err2, reply2) {
    console.log('Got user ' + JSON.stringify(reply2));
    test.assert(reply2.username == 'admin');
    test.assert(reply2.email == 'admin@localhost.com');
    test.assert(reply2.displayName == 'Administrator');
    test.assert(reply2.password == null);
  });
  
});



