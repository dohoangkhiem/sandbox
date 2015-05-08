from socketIO_client import SocketIO, LoggingNamespace

def print_message(*args):
    print 'Got message: %s' % args

def print_users_online(*args):
    print 'Users online = %s' % args[0]

with SocketIO('localhost', 3000, LoggingNamespace) as socketIO:
    socketIO.emit('login', { 'id': 1, 'username': 'admin' })
    
    socketIO.on('online-counter', print_users_online);

    socketIO.on('new-message', print_message);

    socketIO.wait(seconds=10000000)
