var redis = require('redis');
var redisClient = redis.createClient(6379, 'localhost');
var Datastore = require('./datastore.js');

var datastore = new Datastore(redisClient);

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
/*
datastore.createUser('admin', 'admin@localhost.com', 'Administrator', 'a', userCallback);
datastore.createUser('khiem', 'dohoangkhiem@gmail.com', 'Khiem', 'a', userCallback);
datastore.createUser('andy', 'andy@yahoo.com', 'Andy Awesome', 'a', userCallback);
datastore.createUser('tom', 'tommy@outlook.com', 'Tom Tom', 'a', userCallback);
datastore.createUser('claire', 'st.claire@gmail.com', 'Saint Claire', 'a', userCallback);
datastore.createUser('selena', 'selena@gmail.com', 'Selena Gomez', 'a', userCallback);
datastore.createUser('andrea', 'andrea@google.com', 'Andrea Italiano', 'a', userCallback);
datastore.createUser('jim', 'jimmy@gmail.com', 'Jimmy', 'a', userCallback);
datastore.createUser('noname', 'noname@nodomain.noext', 'No Name', 'a', userCallback);*/




/*var groupCallback = function(err, res) {
  if (err) { 
    console.log('Error: ' + err);
    return;
  }

  console.log('Response: ' + res);
  datastore.getGroup(res, function(err, value) {
    console.log('Got group ' + JSON.stringify(value));
  });
};

datastore.getUserByName('admin', function(err, userObj) {
  if (err) {
    console.log('Error: ' + err);
    return;
  } 

  datastore.createGroup('Global', userObj.id, userObj.username, new Date().getTime(), groupCallback);
  datastore.createGroup('Misc', userObj.id, userObj.username, new Date().getTime(), groupCallback);

});

datastore.getUserByName('khiem', function(err, userObj) {
  if (err) {
    console.log('Error: ' + err);
    return;
  } 

  datastore.createGroup('Football', userObj.id, userObj.username, new Date().getTime(), groupCallback);

});

datastore.getUserByName('tom', function(err, userObj) {
  if (err) {
    console.log('Error: ' + err);
    return;
  } 

  datastore.createGroup('Movie', userObj.id, userObj.username, new Date().getTime(), groupCallback);
});

datastore.getUserByName('selena', function(err, userObj) {
  if (err) {
    console.log('Error: ' + err);
    return;
  } 

  datastore.createGroup('Music', userObj.id, userObj.username, new Date().getTime(), groupCallback);
});*/


datastore.getGroupMessages(1, 20, function(err, reply) {
  if (err) {
    console.log('Error: ' + err);
    return;
  }

  console.log(reply);
});





