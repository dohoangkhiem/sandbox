module.exports = {
  User: User,
  Group: Group,
  Message: Message
};

function User(id, username, email, displayName, password) {
  this.id = id;
  this.username = username;
  this.email = email;
  this.displayName = displayName;
  this.password = password;
}

User.createUser = function(obj) {
  return new User(obj.id, obj.username, obj.email, obj.displayName, obj.password);
}

function Group(id, title, creatorId, creatorUser, creatorDate) {
  this.id = id;
  this.title = title;
  this.creatorId = creatorId;
  this.creatorUser = creatorUser;
  this.creatorDate = creatorDate;
}

Group.createGroup = function(obj) {
  return new Group(obj.id, obj.title, obj.creatorId, obj.creatorUser, obj.creatorDate);
}

function GroupMember(userId, username, joinedDate) {
  
}

function Message(groupId, msg, fromId, fromUser, timestamp) {
  this.groupId = groupId;
  this.msg = msg;
  this.fromId = fromId;
  this.fromUser = fromUser;
  this.timestamp = timestamp;
}

Message.createMessage = function(obj) {
  return new Message(obj.groupId, obj.msg, obj.fromId, obj.fromUser, obj.timestamp);
}