var models = require('./models.js');
var config = require('./config.js');
var jwt   = require("jsonwebtoken");
var jwtSecret = require('./config.js').jwtSecret;

module.exports = function(io, redisClient, redisSubscriber, datastore, sessionMiddleware) {

  // configure Socket.io with Redis Adapter
  var adapter = require('socket.io-redis');

  //io.set('transports', ['websocket']);

  io.adapter(adapter({
    pubClient: redisClient,
    subClient: redisSubscriber
  }));

  io.use(function(socket, next) {
    sessionMiddleware(socket.request, socket.request.res, function(error) {
      if (error) return next(error);

      if (socket.request.session && socket.request.session.passport) {
        return next();
      }
        
      if (socket.request.query && socket.request.query.token) {
        var token = socket.request.query.token;
        try {
          jwt.verify(token, jwtSecret, function(err, decoded) {
            if (err) { 
              return next(new Error(err));
            }
            if (decoded == null || decoded == undefined || decoded.id < 0 || !decoded.username) {
              return next(new Error('Invalid token'));
            }

            socket.request.user = decoded;
            return next();
          });
        } catch (ex) {
          if (ex) return next(new Error(ex));
          else return next(new Error('Authentication error'));
        }
      } else {
        return next(new Error('No token provided'));
      }
    });
  });
  
  // socket hash maps userId with respective socket objects
  var socketHash = {};

  // maps groupId to ownerId
  var groupHash = {};

  // socket.io listen for messages
  var chat = io.on('connection', function(socket) {  

    setInterval(function() {
      io.sockets.emit('online-counter', Object.keys(socketHash).length);
    }, 5000);

    // user logged in and send info to server
    // TODO: SECURED
    socket.on('login', function(user) {
      console.log('User ' + user.username + ' has just logged in');
      socket.userId = user.id;
      socket.username = user.username;
      if (!(user.id in socketHash)) socketHash[user.id] = [];
      socketHash[user.id].push(socket);

      // find user's group
      datastore.getUserGroups(user.id, function(err, groupIds) {
        if (groupIds) {
          for (idx in groupIds) {
            socket.join(+groupIds[idx]);
          }
          console.log('User ' + user.username + ' joined ' + groupIds.length + ' groups successfully');
        }
      });

      // for demo: always join global
      socket.join(1);
    });

    // when client sends 'load-group' event to start a group, this is after user successfully creates a group
    socket.on('load-group', function(groupId) {

      console.log('User ' + socket.userId + ' wants to load group ' + groupId);

      datastore.getGroup(groupId, function(err, groupObj) {
        if (err) {
          socket.emit('load-group-error', err);
          return;
        }

        console.log('get group', groupObj);

        if (!groupObj) {
          socket.emit('load-group-error', 'Group with id ' + groupId + ' not found');
          return;
        }

        console.log(socket.userId, groupObj.creatorId, typeof(socket.userId), typeof(groupObj.creatorId));
        if (socket.userId != groupObj.creatorId) {
          socket.emit('load-group-error', 'You are not owner of this group ');
          return; 
        }

        console.log('Initializing group ' + groupId + ', title = ' + groupObj.title);

        socket.join(groupId);

        datastore.getGroupMembers(groupId, function(err2, members) {
          if (err2) {
            socket.emit('load-group-error', err2);
            return;
          }

          for (var idx in members) {
            var mSockets = socketHash[members[idx]];
            if (!mSockets || mSockets.length == 0) continue;
            for (var idx1 in mSockets) mSockets[idx1].join(groupId);

            io.to(groupId).emit('group-ready', groupObj);
                
            /*mSocket.emit('joined-group', { 
              'groupId': groupId, 
              'groupTitle': groupData.groupTitle, 
              'owner': { 'id': socket.userId, 'username': socket.username }
            });*/ 
          }
        });
      }); 
    });

    // when an user wants to join a group
    socket.on('join-group', function(groupId) {
      // check if user is addded to group
      datastore.isMemberOf(socket.userId, groupId, function(err, reply) {
        if (err) {
          socket.emit('join-group-error', err);
          return;
        }

        if (reply < 0) {
          socket.emit('join-group-error', 'User id ' + socket.userId + ' is not added to group id ' + groupId);
          return;
        }

        socket.join(groupId);
        io.to(groupId).emit('joined-group', { userId: socket.userId, username: socket.username, groupId: groupId });
      }); 
    });

    // an user add his friends to group
    socket.on('add-to-group', function(groupId, userIds) {

      if (!groupId) {
        socket.emit('add-to-group-error', 'Unknown group id');
        return;
      }

      if (!userIds || userIds.length <= 0) {
        socket.emit('add-to-group-error', 'Empty list of user ids to add');
        return;
      }

      // check if user is addded to group
      datastore.isMemberOf(socket.userId, groupId, function(err, reply) {
        if (err) {
          socket.emit('add-to-group-error', err);
          return;
        }

        if (reply < 0) {
          socket.emit('add-to-group-error', 'User id ' + socket.userId + ' is not a member of group id ' + groupId);
          return;
        }

        datastore.getMultipleUsers(userIds, function(err1, userList) {
          if (err1) {
            socket.emit('add-to-group-error', err1);
            return;
          }

          for (idx in userList) {
            // find socket for user with id userIds[idx]
            var mSockets = socketHash[userList[idx].id];
            if (mSockets && mSockets.length > 0) {
              for (var idx1 in mSockets) mSockets[idx1].join(groupId);
            }
            
            io.to(groupId).emit('joined-group', { 
              userId: userList[idx].id, 
              username: userList[idx].username, 
              groupId: groupId, 
              addedBy: { userId: socket.userId, username: socket.username }
            });
          }  
        });
      }); 
    });

    // got message from client socket
    socket.on('chat-message', function(msgData) {
      
      console.log('Got message ' + JSON.stringify(msgData));

      var groupId = +msgData.groupId;

      if (!socket.userId || !socket.username) {
        console.log('Unknown user id = ' + socket.userId + ', username = ' + socket.username + '. Message ignored!');
        return;
      }

      if (socket.rooms.indexOf(groupId) == -1) {
        console.log('User id ' + socket.userId + ' does not belong to room with id ' + groupId + '. Message ignored');
        return;
      }

      console.log('From socket internal: id = ' + socket.userId + ', user = ' + socket.username);

      var msgObj = models.Message.createMessage({
        'groupId': msgData.groupId,
        'msg': msgData.msg,
        'fromId': socket.userId,
        'fromUser': socket.username,
        'timestamp': new Date().getTime()
      });

      // store message then publish
      datastore.addMessage(groupId, msgObj, function(err, res) {
        if (err) {
          socket.emit('send-msg-error', err);
        } else {
          //redisClient.publish('messages', JSON.stringify(msgObj));
          io.to(groupId).emit('chat-message', msgObj);
        }
      });

      //socket.broadcast.to(groupId).emit('message', { msg: message, user: data.user, img: data.img});
    });

    // user leaves group
    socket.on('leave', function(groupId) {
      var userId = socket.userId;
      for (idx in socketHash[userId]) {
        socketHash[userId][idx].leave(groupId);
      }
      io.to(groupId).emit('user-left-group', socket.userId, socket.username);
    });

    // a socket disconnects
    socket.on('disconnect', function() {
      //socket.broadcast.emit('notice', socket.nickname + ' has left the chat.');
      if (socket.userId in socketHash) {
        var disconnected = socketHash[socket.userId].splice(socketHash[socket.userId].indexOf(socket), 1);
        disconnected = null;
        if (socketHash[socket.userId].length <= 0) {
          console.log('User ' + socket.username + ' disconnects');
          delete socketHash[socket.userId];
        }
      }
    });
  });


  /*redisSubscriber.on('message', function(channel, msgData) {
    console.log('Subscriber got message from channel = ' + channel + ', msg = ' + msgData);
    if (channel == 'messages') {
      
      //io.emit('msg', JSON.parse(message));
      var msgObj = models.Message.createMessage(JSON.parse(msgData));
      io.to(msgObj.groupId).emit('message', msgObj);
    }
  });*/


  // returns list of connected client sockets in the room with given roomId
  function findClientsSocket(io,roomId, namespace) {
    var res = [],
      ns = io.of(namespace ||"/");    // the default namespace is "/"

    if (ns) {
      for (var id in ns.connected) {
        if(roomId) {
          var index = ns.connected[id].rooms.indexOf(roomId) ;
          if(index !== -1) {
            res.push(ns.connected[id]);
          }
        }
        else {
          res.push(ns.connected[id]);
        }
      }
    }
    return res;
  }

}