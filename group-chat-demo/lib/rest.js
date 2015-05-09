var jwt = require('jsonwebtoken');
var jwtSecret = require('./config.js').jwtSecret;

module.exports = function(router, datastore, auth) {
  
  router.get('/', auth.isAuthenticated, function(req, res) {
    res.json({ message: 'hooray! welcome to our api!' });   
  });

  /**
   * User resources
   */
  router.route('/user/:user_id')
    .get(auth.isAuthenticated, function(req, res) {

      var userId = req.params.user_id;
      console.log('Getting information about user with id = ' + userId);
      datastore.getUser(userId, function(err, reply) {
        if (err) res.json({ error: err });
        else res.json(reply);
      });

    });

  router.route('/user')
    .post(function(req, res) {
      if (!req.body){
        res.json({ error: 'Null payload' });
        return;
      }

      var username = req.body.username;
      var email = req.body.email;
      var displayName = req.body.displayName || username;
      var password = req.body.password;

      if (isBlank(username) || isBlank(email) || isBlank(password)) {
        res.json({ error: 'Username, email and password must not be empty' });
        return;
      }
     
      // check if username or email exists already
      datastore.getUserByName(username, function(err, reply) {
        if (err) {
          res.json({ error: err });
          return;
        }

        if (reply) {
          res.json({ error: 'User ' + username + ' already existed' });
          return;
        }

        console.log('Creating user ' + username);
        datastore.createUser(username, email, displayName, password, function(err2, reply2) {
          if (err2) {
            res.json({ error: err });
            return;
          }

          res.json({ 'message': 'OK', 'userId': reply2 });
        });
      });
    });

  /**
   * Group resources
   */

  // get information about group
  router.route('/group/:groupId')
    .get(auth.isAuthenticated, function(req, res) {
      var groupId = req.params.groupId;
      datastore.getGroup(groupId, function(err, reply) {
        if (err) res.json( { error: err } );
        else res.json(reply);
      });
    });


  // get members of given group
  router.route('/group/:groupId/members')
    .get(auth.isAuthenticated, function(req, res) {
      var groupId = req.params.groupId;
      var userId = req.user.id;
      datastore.isMemberOf(userId, groupId, function(err, reply) {
        if (err) { 
          res.json({ error: err });
          return;
        }

        if (reply < 0) {
          res.json({ error: 'User ' + req.user.username + ' is not a member of group with id ' + groupId });
          return;
        }

        console.log('Getting members from group id = ' + groupId);
        
        datastore.getGroupMembers(groupId, function(err2, reply2) {
          if (err2) {
            res.json({ error: err2 });
          } else {
            var memIds = [];
            for (idx in reply2) memIds.push(reply2[idx]);
            datastore.getMultipleUsers(memIds, function(err3, userList) {
              if (err3) res.json({ error: err3 });
              else res.json(userList);
            });
          }
        });

      });
    });
    
  // create new group
  router.route('/group')
    .post(auth.isAuthenticated, function(req, res) {
      if (!req.body){
        res.json({ error: 'Null payload' });
        return;
      }

      var userId = req.user.id;
      var username = req.user.username;

      var title = req.body.title;
      var memberIds = req.body.members;

      if (isBlank(title)) {
        res.json({ error: 'Group title must be provided' });
        return;
      }

      if (!memberIds || memberIds.length <= 0) {
        res.json({ error: 'Group members must not be empty' });
        return; 
      }

      datastore.createGroup(title, userId, username, new Date().getTime(), function(err, groupId) {
        if (err) {
          res.json({ error: err });
          return;
        }

        var count = 0;
        var warning = [];
        for (idx in memberIds) {
          datastore.addUserToGroup(memberIds[idx], groupId, function(err2, reply2) {
            if (err2) {
              warning.push(err2);
            }
            count++;

            if (count == memberIds.length) {
              if (warning.length > 0) {
                res.json({ groupId: groupId, warning: warning.join('\n'), message: 'OK with warning' });
              } else {
                res.json({ groupId: groupId, message: 'OK' });
              }
            }
          });
        }
      });

    });

  // join a group
  router.route('/group/:groupId/join')
    .post(auth.isAuthenticated, function(req, res) {
      var groupId = req.params.groupId;
      var userId = req.user.id;
      var username = req.user.username;

      datastore.addUserToGroup(userId, groupId, function(err, reply) {
        if (err) {
          res.json({ error: err });
          return;
        }

        res.json({ message: 'OK' });
      });
    });

  // leave a group
  router.route('/group/:groupId/leave')
    .post(auth.isAuthenticated, function(req, res) {
      var groupId = req.params.groupId;
      var userId = req.user.id;
      var username = req.user.username;

      datastore.removeUserFrom(userId, groupId, function(err, reply) {
        if (err) {
          res.json({ error: err });
          return;
        }

        res.json({ message: 'OK' });
      });
    });

  // add users to a group
  router.route('/group/:groupId/members/add')
    .post(auth.isAuthenticated, function(req, res) {

      if (!req.body){
        res.json({ error: 'Null payload' });
        return;
      }

      var userId = req.user.id;
      var username = req.user.username;

      var userIds = req.body.userIds;

      if (!userIds) {
        res.json({ error: 'Empty list of userIds' });
        return;        
      }

      if (!Array.isArray(userIds)) {
        userIds = [userIds];
      }

      var groupId = req.params.groupId;

      var count = 0, warning = [], added = 0;

      for (idx in userIds) {
        datastore.addUserToGroup(userIds[idx], groupId, function(err, reply) {
          if (err) {
            warning.push(err);
          } else added++;
          count++;

          if (count == userIds.length) {
            if (warning.length > 0) {
              res.json({ groupId: groupId, warning: warning.join('\n'), message: 'OK with warning', count: added });
            } else {
              res.json({ groupId: groupId, message: 'OK' , count: added });
            }
          }
        });
      }

    });

  // remove an user from a group
  router.route('/group/:groupId/members/remove')
    .post(auth.isAuthenticated, function(req, res) {
      res.json({ error: 'Unfortunately this API is not supported yet.' });
    });

  /**
   * Message resources
   */

  // get group messages
  router.route('/messages/:groupId')
    .get(auth.isAuthenticated, function(req, res) {
      var groupId = req.params.groupId;
      var userId = req.user.id;

      var retrieve = function() {
        datastore.getGroupMessages(groupId, 25, function(err2, reply2) {
          if (err2) { 
            res.json({ error: err2 });
          } else {
            res.json(reply2);
          }
        });
      };

      // dirty hack here: global room for all
      if (groupId == 1) {
        retrieve();
      } else {
        datastore.isMemberOf(userId, groupId, function(err, reply) {
          if (err) { 
            res.json({ error: err });
            return;
          }

          if (reply < 0) {
            res.json({ error: 'User ' + req.user.username + ' is not a member of group with id ' + groupId });
            return;
          }

          console.log('Getting messages from group id = ' + groupId);
          retrieve();

        });
      }
        
    });

  router.route('/get_token')
    .get(auth.isAuthenticated, function(req, res) {
      var token = jwt.sign(req.user, jwtSecret, { expiresInMinutes: 60*5 });
      res.json({token: token});
    });

  router.route('/verify_token')
    .get(auth.isAuthenticated, function(req, res) {
      var token = req.query.token;
      try {
        jwt.verify(token, jwtSecret, function(err, decoded) {
          if (err) res.json({ error: err });
          else res.json(decoded);
        });
      } catch (ex) {
        console.log('Error: ' + ex);
        res.json({error: ex});
      }
    });
}

function isBlank(str) {
  return (str == null || str == undefined || str.trim().length == 0);
}