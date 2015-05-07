var models = require('./models.js');

function Datastore(redisClient) {
  this.redisClient = redisClient;
}

// export class as a module for public use from outside via require()
module.exports = Datastore;


Datastore.prototype.createUser = function(username, email, displayName, password, callback) {
  var redisClient = this.redisClient;

  redisClient.hget('users', username, function(error, res) {
    if (error) {
      if (callback) callback(error, null);
      return;
    }

    if (res) {
      if (callback) callback('User \'' + username + '\' existed already', null)
      return;
    }

    redisClient.incr('user_id', function(err, id) {
      if (err) {
        if (callback) callback(err, id);
        return;
      }

      var userObj = models.User.createUser({
        'id': id,
        'username': username,
        'email': email,
        'displayName': displayName,
        'password': password
      });

      var key = 'user:' + id;
      redisClient.set(key, JSON.stringify(userObj), function(err1, res) {
        if (err1) {
          if (callback) callback(err1, res);
          return;
        }

        // add to users hash
        redisClient.hset('users', username, id, function(err2, res) {
          if (callback) callback(err2, id);  
        });
        
        
      });
    });
  });
}

Datastore.prototype.getUser = function(userId, callback) {
  this.redisClient.get('user:' + userId, function(err, value) {
    if (err) {
      if (callback) callback(err, value);
      return;
    }

    if (value == null || value == undefined) {
      if (callback) callback('Error: User with id ' + userId + ' does not exist', null);
      return;
    }

    if (callback) {
      var valueObj = JSON.parse(value);
      var returnedObj = models.User.createUser(valueObj);
      callback(err, returnedObj);
    } 
  });
}

Datastore.prototype.getMultipleUsers = function(userIds, callback) {
  var multi = this.redisClient.multi();
  var results = [];
  for (idx in userIds) {
    multi.get('user:' + userIds[idx], function(err, value) {
      if (!err && value) {
        var valueObj = JSON.parse(value);
        results.push(models.User.createUser(valueObj));
      }
    })
  }

  multi.exec(function(err, reply) {
    if (callback) callback(err, results);
  });
}

Datastore.prototype.getUserByName = function(username, callback) {
  // find user id
  var redisClient = this.redisClient;
  redisClient.hget('users', username, function(err, userId) {
    if (err) {
      if (callback) callback(err, userId);
      return;
    }

    if (userId == null || userId == undefined) {
      if (callback) callback(err, null);
      return;
    }

    var userKey = 'user:' + userId;
    redisClient.get(userKey, function(err1, userValue) {
      if (err1) {
        if (callback) callback(err1, userValue);
        return;
      }

      var valueObj = JSON.parse(userValue);

      if (callback) callback(err1, models.User.createUser(valueObj));
    })
  })
}

Datastore.prototype.createGroup = function(title, createId, createUser, createDate, callback) {
  var redisClient = this.redisClient;
  redisClient.incr('group_id', function(err, id) {
    if (err) {
      if (callback) callback(err, id);
      return;
    }

    var groupObj = models.Group.createGroup({
      'id': id,
      'title': title,
      'creatorId': createId,
      'creatorUser': createUser,
      'creatorDate': new Date().getTime()
    });

    var key = 'group:' + id;
    redisClient.set(key, JSON.stringify(groupObj), function(err1, res) {
      if (err1) {
        if (callback) callback(err1, res);
        return;
      }

      // add to groups hash
      redisClient.hset('groups', id, title, function(err2, res) {
        if (callback) callback(err2, id);  
      });
    });
  }); 
}

Datastore.prototype.getGroup = function(groupId, callback) {
  var redisClient = this.redisClient;
  redisClient.get('group:' + groupId, function(err, value) {
    if (err) {
      if (callback) callback(err, value);
      return;
    }

    if (value == null || value == undefined) {
      if (callback) callback('Error: Group with id ' + groupId + ' does not exist', null);
      return;
    }

    var returnedObj = models.Group.createGroup(JSON.parse(value));
    if (callback) callback(err, returnedObj);
  });
}

Datastore.prototype.getMultipleGroups = function(groupIds, callback) {
  var multi = this.redisClient.multi();
  var results = [];
  for (idx in groupIds) {
    multi.get('group:' + groupIds[idx], function(err, value) {
      if (!err && value) {
        var valueObj = JSON.parse(value);
        results.push(models.Group.createGroup(valueObj));
      }
    })
  }

  multi.exec(function(err, reply) {
    callback(err, results);
  });
}

Datastore.prototype.addUserToGroup = function(userId, groupId, callback) {
  var multi = this.redisClient.multi();
  this.getUser(userId, function(err, userObj) {
    if (err) {
      if (callback) callback(err, userObj);
      return;
    }

    if (userObj == null || userObj == undefined) {
      if (callback) callback('Error: user id ' + userId + ' does not exist', null);
      return;
    }

    var timestamp = new Date().getTime();
    multi.zadd('group:' + groupId + ':members', timestamp, userId);
    multi.zadd('user:' + userId + ':groups', timestamp, groupId);

    multi.exec(function(err, reply) {
      if (callback) callback(err, reply);
    });
  });
  
}

// get all groups that the given user belong to, returns list of group ids
Datastore.prototype.getUserGroups = function(userId, callback) {
  this.redisClient.zrange('user:' + userId + ':groups', 0, -1, callback);
}

Datastore.prototype.getGroupMembers = function(groupId, callback) {
  this.redisClient.zrange('group:' + groupId + ':members', 0, -1, callback);
}

Datastore.prototype.removeUserFromGroup = function(userId, groupId, callback) {
  var multi = this.redisClient.multi();
  this.getUser(userId, function(err, userObj) {
    if (err) {
      if (callback) callback(err, userObj);
      return;
    }

    if (userObj == null || userObj == undefined) {
      if (callback) callback('Error: user id ' + userId + ' does not exist', null);
      return;
    }

    multi.zrem('group:' + groupId + ':members', userId);

    multi.zrem('user:' + userId + ':groups', groupId);

    multi.exec(function(err, reply) {
      if (callback) callback(err, reply);
    });
  });

}

// add a message to group
Datastore.prototype.addMessage = function(groupId, messageObj, callback) {
  this.redisClient.zadd('group:' + groupId + ':messages', messageObj.timestamp, JSON.stringify(messageObj), function(err, res) {
    if (callback) callback(err, res);
  });
}

Datastore.prototype.getGroupMessages = function(groupId, maxNumber, callback) {
  this.redisClient.zrevrange('group:' + groupId + ':messages', 0, maxNumber - 1, function(err, res) {
    if (err) {
      if (callback) callback(err, res);
      return;
    }

    if (callback) { 
      var results = [];
      for (idx in res) {
        results.push(models.Message.createMessage(JSON.parse(res[idx])));
      }

      callback(err, results);
    }
  });
}

Datastore.prototype.isMemberOf = function(userId, groupId, callback) {
  var redisClient = this.redisClient;
  redisClient.zrank('group:' + groupId + ':members', userId, function(err, reply) {
    if (err) {
      if (callback) callback(err, reply);
      return;
    }

    if (reply == null && callback) { 
      callback(err, -1);
      return;
    }

    reply = reply*1;
    if (callback) callback(err, reply);
  });
}

Datastore.prototype.getAllGroups = function(callback) {
  var redisClient = this.redisClient;
  redisClient.hgetall('groups', function(err, res) {
    if (err) {
      if (callback) callback(err, res);
      return;
    }

    if (callback) callback(err, res);
  });
}

Datastore.prototype.getAllUsers = function(callback) {
  this.redisClient.hgetall('users', function(err, res) {
    if (err) {
      if (callback) callback(err, res);
      return;
    }

    if (callback) callback(err, res);
  });
}

