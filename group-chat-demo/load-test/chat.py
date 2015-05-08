from socketIO_client import SocketIO, LoggingNamespace
import thread
import threading

total_users = 0
total_msg_sent = 0
total_msg_received = 0

user_lock = threading.Lock()
msg_sent_lock = threading.Lock()
msg_received_lock = threading.Lock()


def print_message(*args):
    global total_msg_received, msg_received_lock
    print 'Got message: %s' % args
    msg_received_lock.acquire()
    total_msg_received += 1
    print 'Total message received = %s' % total_msg_received
    msg_received_lock.release()


def print_users_online(*args):
    print 'Users online = %s' % args[0]


def group_ready(*args):
    print 'Group %s ready' % args[0]


def load_group_error(*args):
    print 'Load group %s error: ' % args[0]


def on_event(*args):
    print '%s' % args


def create_socket(idx):
    global total_users, total_msg_received, total_msg_sent, user_lock, msg_sent_lock, msg_received_lock
    name = 'test-%s' % idx
    with SocketIO('localhost', 3000, LoggingNamespace) as socketIO:
        socketIO.emit('login', {'id': name, 'username': name})

        user_lock.acquire()
        total_users += 1
        user_lock.release()

        #socketIO.on('online-counter', print_users_online)

        socketIO.on('chat-message', print_message)

        socketIO.wait(seconds=10)

        socketIO.emit('chat-message', {
            'groupId': 1,
            'msg': 'Message from %s' % name,
            'fromId': idx,
        })

        msg_sent_lock.acquire()
        total_msg_sent += 1
        msg_sent_lock.release()

        socketIO.on('load-group-error', load_group_error)

        socketIO.on('group-ready', group_ready)

        socketIO.wait(seconds=10000000)

for idx in range(1, 201):
    print idx
    thread.start_new_thread(create_socket, (idx, ))

while 1:
    pass
