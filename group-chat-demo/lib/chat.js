var models = require('./models.js');

module.exports = function(io, redisClient, redisSubscriber, datastore) {

  // configure Socket.io with Redis Adapter
  var adapter = require('socket.io-redis');

  io.adapter(adapter({
    pubClient: redisClient,
    subClient: redisSubscriber
  }));

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

      console.log(socketHash, Object.keys(socketHash).length);
      console.log('Number of online user = ' + Object.keys(socketHash).length);

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

      datastore.getGroup(groupId, function(err, groupObj) {
        if (err) {
          socket.emit('load-group-error', err);
          return;

          if (!groupObj) {
            socket.emit('load-group-error', 'Group with id ' + groupId + ' not found');
            return;
          }

          console.log('Initializing group ' + groupId + ', title = ' + title);

          socket.join(groupId);

          datastore.getGroupMembers(groupId, function(err2, members) {
            if (err2) {
              socket.emit('load-group-error', err2);
              return;
            }

            if (members && members.length > 0) {
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
            } else {
              socket.emit('group-ready', groupObj);
            }

          });
        }
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
        io.to(groupId).emit('joined-group', { userId: socket.userId, username: socket.username });
      }); 
    });



    // got message from client socket
    socket.on('message', function(msgData) {
      
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
        'timestamp': msgData.timestamp
      });

      // store message then publish
      datastore.addMessage(groupId, msgObj, function(err, res) {
        if (err) {
          socket.emit('send-msg-error', err);
        } else {
          //redisClient.publish('messages', JSON.stringify(msgObj));
          io.to(groupId).emit('message', msgObj);
        }
      });

      //socket.broadcast.to(groupId).emit('message', { msg: message, user: data.user, img: data.img});
    });

    socket.on('disconnect', function() {
      //socket.broadcast.emit('notice', socket.nickname + ' has left the chat.');
      console.log(socketHash);
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