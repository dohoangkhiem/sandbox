var $chatTabs,
  $chatForm,
  $sendMsg,
  $msgText,
  $onlineCountSpan;

function initUI() {
  $chatForm = $('#chat-form');
  $sendMsg = $('#msg-button', $chatForm);
  $msgText = $('#msg-text', $chatForm);
  $chatTabs = $('#group-list-tabs').tabs().addClass("ui-tabs-vertical ui-helper-clearfix");
  $onlineCountSpan = $('.top-right span.online-users');
  $('ul > li', $chatTabs).removeClass("ui-corner-top" ).addClass( "ui-corner-left" ); 
}

function getCurrentGroupId() {
  return $('> ul > li.ui-tabs-active', $chatTabs).attr('group-id');
}

function getGroupMessages($tab, groupId) {
  $.get('/rest/messages/' + groupId, function(data) {
    if (data) {
      var htmlToAppend = [];
      for (var idx = data.length - 1; idx >= 0; idx--) {
        var msgData = data[idx];
        var evenOddClass = 'chat-msg-even';
        if (idx % 2 == 1) evenOddClass = 'chat-msg-odd';
        var html = '<li class = "ui-corner-left ' + evenOddClass + '"><strong>' + msgData.fromUser + ':&nbsp;</strong>' + msgData.msg + '</li>';
        htmlToAppend.push(html);           
      }

      $('ul.chat-messages', $tab).html('').append(htmlToAppend.join(''));
    }
    
  });
}


$(function() {
  initUI();
  
  // init socket.io
  var socket = io();

  socket.emit('login', user);

  var currentGroupId = getCurrentGroupId();
  var $globalTab = $('#group-' + currentGroupId , $chatTabs);
  getGroupMessages($globalTab, currentGroupId);

  // send message to group
  $sendMsg.click(function() {
    $chatForm.submit();
    return false;
  });

  $msgText.on('keydown', function(e) {
    if (e.keyCode == 13 && ! e.shiftKey) {
        $chatForm.submit();
        return false;
    }
  });

  $chatForm.on('submit', function(e) {
    // which is current group
    var groupId = getCurrentGroupId();
    var msg = $msgText.val();

    sendMessage(groupId, msg);

    $msgText.val('');

    return false;
  });

  socket.on('send-msg-error', function(err) {
    console.log('Send message error: ' + err);
  });

  socket.on('message', function(msgObj) {
    console.log('Got message ' + JSON.stringify(msgObj));
    appendMessage(msgObj.groupId, msgObj);
  });

  socket.on('online-counter', function(onlineCount) {
    console.log('Online counter: ' + onlineCount);
    $onlineCountSpan.text('Users online: ' + onlineCount);
  });

  function sendMessage(groupId, msg) {
    socket.emit('message', {
      'groupId': groupId,
      'msg': msg,
      'fromId': user.id,
      'timestamp': new Date().getTime()
    });
  }

  function appendMessage(groupId, msgObj) {
    var $msgPanel = $('#group-' + groupId , $chatTabs);
    var $lastMsg = $('ul.chat-messages li', $msgPanel).last();
    var nextClass = 'chat-msg-even';
    if ($lastMsg.hasClass('chat-msg-even')) nextClass = 'chat-msg-odd'; 
    $('ul.chat-messages', $msgPanel).append('<li class="ui-corner-left ' + nextClass + '"><strong>' + msgObj.fromUser + ':&nbsp;</strong>' 
      + msgObj.msg);
    $msgPanel.scrollTop($msgPanel.get(0).scrollHeight);
  }

});