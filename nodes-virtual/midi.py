#!/usr/bin/python3
from __future__ import print_function
import sys, socket, time, mido
import selectors34 as selectors
sys.path.append("../core")
from message import Message

sel = selectors.DefaultSelector()

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(("127.0.0.1", 55942))
sock.setblocking(False)
sel.register(sock, selectors.EVENT_READ, data=None)
buf = ""

port = mido.open_input("Midi Through Port-0")

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
                
                m = Message(data)
                print(m)
    
    msg = port.receive()
    if msg.type == "note_on" or msg.type == "note_off":
        sock.sendall(Message(4, 0, msg.type, msg.note).stringify().encode("utf-8"))
    
    time.sleep(0.01)
