import logo from './favicon.ico';
import './App.css';
import React, { useState, useRef, useCallback } from 'react';
import ReactJson from 'react-json-view'

function App() {
  const rawHeaderLen = 16;
  const packetOffset = 0;
  const headerOffset = 4;
  const verOffset = 6;
  const opOffset = 8;
  const seqOffset = 12;

  const ws = useRef(0);
  const [message, setMessage] = useState('');
  const [readyState, setReadyState] = useState('正在链接中');
  const [messageCount, setMessageCount] = useState(0);
  const [wsUrl, setWsUrl] = useState('ws://192.168.100.35:3102/sub');  
  const [memberId, setMemberId] = useState('');
  const [isAUth, setAuth] = useState(false);
  const [receiverId, setReceiverId] = useState('');
  const [msgBody, setMsgBody] = useState('textBody');
  const [newMessage, setNewMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [newMsgJson, setNewMsgJson] = useState(Object);
  const [currMsgJson, setCurrMsgJson] = useState(Object);
  const [connState, setConnState] = useState('Connect');

  let heartbeatInterval = null;

  const webSocketInit = useCallback(() => {
    const stateArr = [
      '正在链接中',
      '已经链接并且可以通讯',
      '连接正在关闭',
      '连接已关闭或者没有链接成功',
    ];
    if (!ws.current || ws.current.readyState === 3) {
      ws.current = new WebSocket(wsUrl); //'ws://192.168.100.35:3102/sub'
      ws.current.binaryType = 'arraybuffer';
      ws.current.onopen = _e => {
          //console.log(ws.current.readyState);
          setReadyState(stateArr[ws.current?.readyState ?? 0]);
        };
        //auth();
      ws.current.onclose = _e =>
        setReadyState(stateArr[ws.current?.readyState ?? 0]);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
      ws.current.onerror = e =>
        setReadyState(stateArr[ws.current?.readyState ?? 0]);
      ws.current.onmessage = e => {
        //setMessage(e.data);
        handleNewMessage(e);
      };
    }
  }, [ws, wsUrl]);

  const auth = (mid) => {
    var token = '{"mid":"'+mid+'", "imei":"imei001", "platform":"web", "accepts":[1000,1001,1002]}'
    var headerBuf = new ArrayBuffer(rawHeaderLen);
    var headerView = new DataView(headerBuf, 0);
    var bodyBuf = textEncoder.encode(token);
    headerView.setInt32(packetOffset, rawHeaderLen + bodyBuf.byteLength);
    headerView.setInt16(headerOffset, rawHeaderLen);
    headerView.setInt16(verOffset, 1);
    headerView.setInt32(opOffset, 7);
    headerView.setInt32(seqOffset, 1);
    ws.current.binaryType = 'arraybuffer';       
    ws.current.send(mergeArrayBuffer(headerBuf, bodyBuf));
    //appendMsg("send: auth token: " + token);
    console.log("send: auth token: " + token);
    setAuth(true);
  }   
  
  /*
  useLayoutEffect(() => {
    getRandomInt();
    webSocketInit();
    return () => {
      //ws.current?.close();
    };
  }, [ws, getRandomInt, webSocketInit]);
  */

  const handleWsUrl = (evt) => {
    //console.log(evt.target.value);
    setWsUrl(evt.target.value);
  }

  const handleMemberId = (evt) => {
    setMemberId(evt.target.value);
  }

  const handleReceiverId = (evt) => {
    setReceiverId(evt.target.value);
  }

  const handleMsgBody = (evt) => {
    setMsgBody(evt.target.value);
  }

  const handleNewMessage = (evt) => {
    var data  = evt.data;
    var dataView = new DataView(data, 0);
    var packetLen = dataView.getInt32(packetOffset);
    var headerLen = dataView.getInt16(headerOffset);
    var ver = dataView.getInt16(verOffset);
    var op = dataView.getInt32(opOffset);
    var seq = dataView.getInt32(seqOffset);

    console.log("receiveHeader: packetLen=" + packetLen, "headerLen=" + headerLen, "ver=" + ver, "op=" + op, "seq=" + seq);
    switch(op) {
      case 3:
        console.log("receive: heartbeat reply");
        //setMessage("{heartbeat reply}");
        //setMessageCount(messageCount+1);
        break;
      case 8:
        console.log("receive: auth reply");
        //setMessage("receive: auth reply");
        //setInRoom(true);
        heartbeat();
        heartbeatInterval = setInterval(heartbeat, 30 * 1000);
        break;              
      default:
        var msgBody = textDecoder.decode(data.slice(headerLen, packetLen));
        //messageReceived(ver, msgBody);
        //appendMsg("receive: ver=" + ver + " op=" + op + " seq=" + seq + " message=" + msgBody);
        console.log("receive: ver=" + ver + " op=" + op + " seq=" + seq + " message=" + msgBody);
        setMessage(msgBody);
        try {
          let msgObj = JSON.parse(msgBody);
          setCurrMsgJson(msgObj);
          //console.log(msgObj);
          chatMessages.push({is: true, op: op, msg: msgBody, msgObj: msgObj});        
          //console.log(messageCount);
          setMessageCount(messageCount+1);
          //console.log(messageCount);
          //console.log("msg: " + msgObj);
          let messageId = msgObj.id;
          let mid = msgObj.mid;
          console.log("id:" + messageId);
          console.log("mid:" + mid);
          //let mid = parseInt(memberId);
          if (mid !== null && messageId !== null && (op !== 203)) {
            ack(mid, messageId);
          }
        } catch(e) {
          console.error(e);
        }
        break
    }    
  }

  const  heartbeat = () => {
    var headerBuf = new ArrayBuffer(rawHeaderLen);
    var headerView = new DataView(headerBuf, 0);
    headerView.setInt32(packetOffset, rawHeaderLen);
    headerView.setInt16(headerOffset, rawHeaderLen);
    headerView.setInt16(verOffset, 1);
    headerView.setInt32(opOffset, 2);
    headerView.setInt32(seqOffset, 1);
    ws.current.send(headerBuf);
    console.log("send: heartbeat");
    //setappendMsg("send: heartbeat");
    //setMessage("{send heartbeat}");
}

  const mergeArrayBuffer = (ab1, ab2) => {
    var u81 = new Uint8Array(ab1),
        u82 = new Uint8Array(ab2),
        res = new Uint8Array(ab1.byteLength + ab2.byteLength);
    res.set(u81, 0);
    res.set(u82, ab1.byteLength);
    return res.buffer;
  }

  const textDecoder = new TextDecoder();
  const textEncoder = new TextEncoder();

  const updateNewMessage = (evt) => {
    setNewMessage(evt.target.value);
    setNewMsgJson(JSON.parse(evt.target.value));
    //console.log(newMsgJson);
  }

  const  sendMessage = () => {    
    //setNewMessage(event.target.value);
    //var msg = newMessage
    console.log("websocket ready status :" + ws.current.readyState);
    console.log("send message:" + newMessage)
    //'{"ackId":"ack101","sid":"l_209714522882049_199188241121281","sender":"199188241121281","senderName":"121281","senderIcon":"icon","mid":"209714522882049", "type":10, "body":"{\\"msg\\":{\\"text\\":\\"23qq\\"},\\"type\\":0,\\"timestamp\\":1647420917311}"}'
    var headerBuf = new ArrayBuffer(rawHeaderLen);
    var headerView = new DataView(headerBuf, 0);
    var bodyBuf = textEncoder.encode(newMessage);
    headerView.setInt32(packetOffset, rawHeaderLen + bodyBuf.byteLength);
    headerView.setInt16(headerOffset, rawHeaderLen);
    headerView.setInt16(verOffset, 1);
    headerView.setInt32(opOffset, 22);
    headerView.setInt32(seqOffset, 1);
    ws.current.send(mergeArrayBuffer(headerBuf, bodyBuf));
  }

  const handleGenerateLinkMessage = () => {
      let mid = parseInt(memberId);
      let rid = parseInt(receiverId);
      let sid = "l_"+mid+"_"+rid;
      if (rid > mid) {
        sid = "l_"+rid+"_"+mid;
      }
      var timestamp = new Date().getTime();
      let bodyObj = {msg: {text: msgBody, type: 0, timestamp: timestamp}}
      let msgObj = {sid: sid, sender: memberId, mid: receiverId, type: 10,
        body: JSON.stringify(bodyObj)
      }      
      let msg = JSON.stringify(msgObj);
      setNewMessage(msg);
  }

  const handleGeneratePrivateMessage = () => {
    let mid = parseInt(memberId);
    let rid = parseInt(receiverId);
    var timestamp = new Date().getTime();
      let bodyObj = {msg: {text: msgBody, type: 8, timestamp: timestamp}}
      let msgObj = {sender: memberId, mid: receiverId, type: 8,
        body: JSON.stringify(bodyObj)
      }      
      let msg = JSON.stringify(msgObj);
      setNewMessage(msg);
  }

  const handleGenerateFriendMessage = () => {
    let mid = parseInt(memberId);
    let rid = parseInt(receiverId);
    var timestamp = new Date().getTime();
      let bodyObj = {msg: {text: msgBody, type: 8, timestamp: timestamp}}
      let msgObj = {sender: memberId, mid: receiverId, type: 0,
        body: JSON.stringify(bodyObj)
      }      
      let msg = JSON.stringify(msgObj);
      setNewMessage(msg);
      setNewMsgJson(msgObj);
  }

  const  ack = (mid, msgId) => {
    let bodyObj = {memberId: mid, messageIds: [msgId]};
    let ackMsg = JSON.stringify(bodyObj);
    var headerBuf = new ArrayBuffer(rawHeaderLen);
    var headerView = new DataView(headerBuf, 0);
    var bodyBuf = textEncoder.encode(ackMsg);
    headerView.setInt32(packetOffset, rawHeaderLen + bodyBuf.byteLength);
    headerView.setInt16(headerOffset, rawHeaderLen);
    headerView.setInt16(verOffset, 1);
    headerView.setInt32(opOffset, 24);
    headerView.setInt32(seqOffset, 1);
    ws.current.send(mergeArrayBuffer(headerBuf, bodyBuf));
    console.log("send: ack mid:" + mid + " msgId:" + msgId);
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <div>          
          WS URL:
          <MemberBox value={wsUrl} updateStateProp={handleWsUrl}/>
          <button onClick={() => {              
              if (ws.current?.readyState !== 1) {
                webSocketInit();
                setConnState('Disconnect');
              } else {
                ws.current?.close();
                setConnState('Connect');
              }              
            }} disabled={ws.current?.readyState === 0 && wsUrl === ""}>{connState} 
          </button>
        </div>             
        <div>
          Sender:<MemberBox value={memberId} updateStateProp={handleMemberId} />
          <button onClick={() => {
              if (ws.current?.readyState !== 1) {
                console.log('尚未链接成功');
                //setMessage('正在链接');
                return;
              }
              auth(memberId);            
            }} disabled={memberId === "" && !isAUth}>
             login             
          </button>
        </div>             
        <div>  
         Receiver:<MemberBox value={receiverId} updateStateProp={handleReceiverId}/>
        </div>             
        <div>  
         Message Body:
          <MemberBox value={msgBody} updateStateProp={handleMsgBody} />
          <button onClick={handleGenerateLinkMessage} disabled={receiverId === ""|| memberId === ""}>generate link message</button>
          <button onClick={handleGeneratePrivateMessage} disabled={receiverId === ""|| memberId === ""}>generate private message</button>
          <button onClick={handleGenerateFriendMessage} disabled={receiverId === ""|| memberId === ""}>generate friend message</button>
        </div>
        <div>
          <button onClick={sendMessage} disabled={newMessage === "" && ws.current?.readyState !== 1}>Send Message</button>
        </div>
        <div>
          <ChatBox value={newMessage} updateStateProp={updateNewMessage} />
                   
        </div>
      </header>
      <div className='container'>
        <div>
          <div>new message: <ReactJson src={newMsgJson} collapsed='true' /></div>
          <StatusRow status={readyState && currMsgJson} count={messageCount > 0 && messageCount} />
          <MessagesTable messages={chatMessages}/>  
        </div>
      </div>      
    </div>
  );
}

export default App;

class MemberBox extends React.Component {  
  render() {    
    return (      
       <input type="text" value={this.props.value} onChange={this.props.updateStateProp}/>
    );
  }
}
class ChatBox extends React.Component {
  render() {
    return (
      <textarea value={this.props.value} onChange={this.props.updateStateProp} />
    );
  }
}

class StatusRow extends React.Component {
  render() {
    const status = this.props.status;
    const count = this.props.count;
    return (
      <span>The latest recerived message: <ReactJson src={status} collapsed='true' /> {count}</span>
    )
  }
}

class MessageRow extends React.Component {
  render() {
    const message = this.props.message.is? 
      this.props.message.msg:
      <span style={{color: 'gray'}}>
        {this.props.message.msg}
      </span>;
    const op = this.props.message.op;
    const msgObj = this.props.message.msgObj;
    return (
      <tr>
        <td className='messageCol'>op:{op}</td>
        <td className='messageCol'><ReactJson src={msgObj} collapsed='true' /></td>
      </tr>
    );
  }
}

let id = 0;

class MessagesTable extends React.Component {
  render() {
    const rows = [];
    let mc = 0;
    this.props.messages.forEach(msg => {
      if (mc % 2 === 1) {
        msg.is = true
      }
      rows.push(
        <MessageRow
          message={msg}
          key={id++}
           />
      );
    })
    return (
      <table>
        <thead>
          <tr>
            <th>Op</th>
            <th>Body</th>
          </tr>
        </thead>
        <tbody>
          {rows}
        </tbody>
      </table>
    );
  }
}
