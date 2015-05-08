var test = require('unit.js');

var models = require('../lib/models.js');

var user1 = new models.User(1, 'khiem', 'khiem@gmail.com', 'khiem');

test.assert(user1.id == 1);
test.assert(user1.username == 'khiem');
test.assert(user1.email == 'khiem@gmail.com');
test.assert(user1.displayName == 'khiem');
test.assert(user1.password == null);

var user2 = models.User.createUser(user1);
test.assert(user2.id == 1);
test.assert(user2.username == 'khiem');
test.assert(user2.email == 'khiem@gmail.com');
test.assert(user2.displayName == 'khiem');
test.assert(user2.password == null);

