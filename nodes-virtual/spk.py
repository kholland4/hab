#!/usr/bin/python3
import sys, os, selectors, socket, time, random
sys.path.append("../core")
from message import Message

NODE_ID = 7

sel = selectors.DefaultSelector()

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(("127.0.0.1", 55942))
sock.setblocking(False)
sel.register(sock, selectors.EVENT_READ, data=None)
buf = ""

state = "1"

prescaler = 0

while True:
    events = sel.select(timeout=0)
    for key, mask in events:
        data = sock.recv(1024)
        if data is None:
            print("disconnected")
            sys.exit()
        else:
            buf += data.decode("utf-8")
            while "\0" in buf:
                idx = buf.find("\0")
                data = buf[0:idx]
                buf = buf[idx + 1:]
                
                #print("received data %s" % data)
                m = Message(data)
                #print(m)
                if m.dest == NODE_ID and m.name == "setstate":
                    state = m.content
                    #sock.sendall(Message(1, 0, "state", state).stringify().encode("utf-8"))
                    os.system("play --no-show-progress --null --channels 1 synth 0.2 sawtooth %d&" % int(float(state)))
    
    time.sleep(0.1)
    if prescaler % 20 == 0:
        sock.sendall(Message(NODE_ID, 0, "state", state).stringify().encode("utf-8"))
        prescaler = 0
    prescaler += 1
