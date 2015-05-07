var redis = require('redis');
var redisClient = redis.createClient(6379, 'localhost');
var Datastore = require('../datastore.js');

var datastore = new Datastore(redisClient);

var simpleLog = function(err, reply) {
  if (err) {
    console.log('Error: ' + err);
    return;
  }

  console.log(reply);
}

var createUserCount = 0, createGroupCount = 0;

var userCallback = function(err, res) {
  if (err) {
    console.log('Error: ' + err);
    return;
  }

  console.log('Response: ' + res);
  datastore.getUser(res, function(err, value) {
    console.log('Got user ' + JSON.stringify(value));
  });

  createUserCount++;

  if (createUserCount == 9) {
    createGroups();
  }
}

var groupCallback = function(err, res) {
  if (err) { 
    console.log('Error: ' + err);
    return;
  }

  console.log('Response: ' + res);
  datastore.getGroup(res, function(err, value) {
    console.log('Got group ' + JSON.stringify(value));
  });

  createGroupCount++;

  if (createGroupCount == 5) {
    assignGroups();
  }
};

datastore.createUser('admin', 'admin@localhost.com', 'Administrator', 'a', userCallback);
datastore.createUser('khiem', 'dohoangkhiem@gmail.com', 'Khiem', 'a', userCallback);
datastore.createUser('andy', 'andy@yahoo.com', 'Andy Awesome', 'a', userCallback);
datastore.createUser('tom', 'tommy@outlook.com', 'Tom Tom', 'a', userCallback);
datastore.createUser('claire', 'st.claire@gmail.com', 'Saint Claire', 'a', userCallback);
datastore.createUser('selena', 'selena@gmail.com', 'Selena Gomez', 'a', userCallback);
datastore.createUser('andrea', 'andrea@google.com', 'Andrea Italiano', 'a', userCallback);
datastore.createUser('jim', 'jimmy@gmail.com', 'Jimmy', 'a', userCallback);
datastore.createUser('noname', 'noname@nodomain.noext', 'No Name', 'a', userCallback);


function createGroups() {
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
  });

}

var assignedGroups = 0;
var assignGroupsLog = function(err, reply) {
  simpleLog(err, reply);

  assignedGroups++;
  if (assignedGroups == 8) {
    printInfo();
  }
}

function assignGroups() {
  datastore.addUserToGroup(2, 2, assignGroupsLog);
  datastore.addUserToGroup(2, 3, assignGroupsLog);

  datastore.addUserToGroup(4, 5, assignGroupsLog);

  datastore.addUserToGroup(3, 2, assignGroupsLog);
  datastore.addUserToGroup(3, 4, assignGroupsLog);

  datastore.addUserToGroup(7, 2, assignGroupsLog);
  datastore.addUserToGroup(8, 3, assignGroupsLog);

  datastore.addUserToGroup(9, 5, assignGroupsLog);
}

function printInfo() {
  datastore.getGroupMessages(1, 20, function(err, reply) {
    if (err) {
      console.log('Error: ' + err);
      return;
    }

    console.log(reply);
  });

  datastore.getAllUsers(simpleLog);

  datastore.getAllGroups(simpleLog);
}

//datastore.removeUserFromGroup(2, 3, simpleLog);


