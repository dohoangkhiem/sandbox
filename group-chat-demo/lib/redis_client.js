// Configure Redis client connection
var redis = require('redis');
var config = require('./config.js')
var defaultCredentials = { "host": "127.0.0.1", "port": 6379 };

module.exports = {
  createClient: function() {

    if (process.env.REDISTOGO_URL) {
      var rtg   = require("url").parse(process.env.REDISTOGO_URL);
      var client = redis.createClient(rtg.port, rtg.hostname, { detect_buffers: true });
      client.auth(rtg.auth.split(":")[1]);
      return client;
    } else {
      var credentials = config.redis;

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
  }
};
  