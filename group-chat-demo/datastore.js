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

      var userObj = {
        'id': id,
        'username': username,
        'email': email,
        'displayName': displayName,
        'password': password
      };
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

    if (callback) {
      var valueObj = JSON.parse(value);
      if (valueObj && valueObj.password) valueObj.password = null; 
      callback(err, valueObj);
    } 
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

    if (!userId) {
      if (callback) callback(err, null);
      return;
    }

    var userKey = 'user:' + userId;
    redisClient.get(userKey, function(err1, userValue) {
      if (err1) {
        if (callback) callback(err1, userValue);
        return;
      }

      if (callback) callback(err1, JSON.parse(userValue));
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

    var groupObj = {
      'id': id,
      'title': title,
      'creatorId': createId,
      'creatorUser': createUser,
      'creatorDate': new Date().getTime()
    }

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
    if (callback) callback(err, JSON.parse(value));
  });
}

Datastore.prototype.addMembersToGroup = function(groupId, members) {
  if (!members) return;
  for (m in members) {
    this.redisClient.rpush('group:' + groupId + ':members', JSON.stringify(members[m]));
  }
}

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
        results.push(JSON.parse(res[idx]));
      }

      callback(err, results);
    }
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

