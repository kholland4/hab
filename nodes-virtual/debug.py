#!/usr/bin/python3
import sys, selectors, socket, time, random, os
sys.path.append("../core")
from message import Message

sel = selectors.DefaultSelector()

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(("127.0.0.1", 55942))
sock.setblocking(False)
sel.register(sock, selectors.EVENT_READ, data=None)
buf = ""

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
                if m.dest == 1 and (m.name == "sound" or m.name == "setstate"):
                    freq = 100
                    try:
                        freq = int(float(m.content))
                    except ValueError:
                        pass
                    os.system("play --no-show-progress --null --channels 1 synth 0.2 sine %d&" % freq)
    
    time.sleep(0.05)
