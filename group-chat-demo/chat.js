module.exports = function(io, redisClient, redisSubscriber, datastore) {

  // socket hash maps userId with respective socket object
  var socketHash = {};

  // maps groupId to ownerId
  var groupHash = {};

  // socket.io listen for messages
  var chat = io.on('connection', function(socket) {  
    // When a message is received, broadcast it 
    // to all users except the originating client
    /*
    socket.on('msg', function(data) {
      var jsonData = JSON.stringify(data);      
      redisClient.lpush('messages', jsonData);
      redisClient.ltrim('messages', 0, 99);  
      
      //socket.broadcast.emit('msg', data);        
      console.log('Publish message ' + jsonData);
      redisClient.publish('messages', jsonData);
    });

    // When a user joins the chat, send a notice
    // to all users except the originating client
    socket.on('join', function(nickname) {
      // Attach the user's nickname to the socket
      socket.nickname = nickname;
      socket.broadcast.emit('notice', nickname + ' has joined the chat.');
    });

    // When a user disconnects, send a notice
    // to all users except the originating client
    socket.on('disconnect', function() {
      socket.broadcast.emit('notice', socket.nickname + ' has left the chat.');
    });
  });

  redisSubscriber.on('message', function(channel, message) {
      if (channel == 'messages') {
        console.log('Subscriber got message ' + message);
        io.emit('msg', JSON.parse(message));
      }
  });

  */
  ///////////////////

    // user logged in and send info to server
    socket.on('login', function(user) {
      socket.userId = user.id;
      socket.username = user.username;
      socketHash[user.id] = socket;
    });

    // when client sends 'load-group' event to start a group, this is after user successfully create a group
    socket.on('load-group', function(groupData) {
      var groupId = groupData.groupId;
      socket.join(groupId);
      var members = groupData.members;
      if (members.length > 0) {
        for (idx in members) {
          var mSocket = socketHash[members[idx]];
          mSocket.join(groupId);
          mSocket.emit('joined-group', { 
            'groupId': groupId, 
            'groupTitle': groupData.groupTitle, 
            'owner': { 'id': socket.userId, 'username': socket.username }
          });
        }
      }
    });

    socket.on('message', function(msgData) {
      var groupId = msgData.groupId;

      var msgObj = {
        'msg': msgData.msg,
        'fromId': msgData.fromId,
        'timestamp': msgData.timestamp
      }

      // store message then publish
      datastore.addMessage(groupId, msgObj, function(err, res) {
        if (err) {
          socket.emit('send-msg-error', err);
        } else {
          redisClient.publish('messages', JSON.stringify(msgData));
        }
      });

      //socket.broadcast.to(groupId).emit('message', { msg: message, user: data.user, img: data.img});
    });
  })


  redisSubscriber.on('message', function(channel, msgData) {
    if (channel == 'messages') {
      console.log('Subscriber got message ' + msgData);
      //io.emit('msg', JSON.parse(message));
      var msgObj = JSON.parse(msgData);
      io.to(msgObj.groupId).emit('message', msgObj);
    }
  });


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