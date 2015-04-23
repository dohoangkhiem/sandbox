//var redis = require('redis');
//var redisClient = redis.createClient(6379, 'localhost');
//var Datastore = require('./datastore.js');

//var datastore = new Datastore(redisClient);

module.exports = function(router, datastore) {
  
  router.get('/', function(req, res) {
    res.json({ message: 'hooray! welcome to our api!' });   
  });

  /**
   * User resources
   */
  router.route('/user/:user_id')
    .get(function(req, res) {
      var userId = req.params.user_id;
      console.log('Getting information about user with id = ' + userId);
      datastore.getUser(userId, function(err, reply) {
        if (err) res.json({ error: err });
        else res.json(reply);
      });

    })

  router.route('/group/:group_id')
    .get(function(req, res) {
      var groupId = req.params.group_id;
      datastore.getGroup(groupId, function(err, reply) {
        if (err) res.json( { error: err } );
        else res.json(reply);
      });
    });

  router.route('/user')
    .put(function(req, res) {
      if (!req.body){
        res.json({ error: 'Null payload' });
        return;
      }

      var username = req.body.username;
      var email = req.body.email;
      var displayName = req.body.displayName || username;
      var password = req.body.password;

      console.log(req.body);

      res.json({message: 'OK'});
      // check if username or email exists already

        // if not create new user  
    });

}

