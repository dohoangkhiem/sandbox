// Configure Redis client connection
var redis = require('redis');
var defaultCredentials = { "host": "127.0.0.1", "port": 6379 };

module.exports = {
  createClient: function(credentials) {
    if (!credentials) {
      console.log('No credentials provided. Using default credentials: host = 127.0.0.1, port = 6379');
      credentials = defaultCredentials;
    }

    var client = redis.createClient(credentials.port, credentials.host);
    if('password' in credentials) {
      client.auth(credentials.password);
    }
    return client;
  }
};
