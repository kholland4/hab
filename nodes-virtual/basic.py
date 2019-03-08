#!/usr/bin/python3
import sys, selectors, socket, time, random

sel = selectors.DefaultSelector()

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(("127.0.0.1", 5942))
sock.setblocking(False)
sel.register(sock, selectors.EVENT_READ, data=None)

while True:
    events = sel.select(timeout=0)
    for key, mask in events:
        data = sock.recv(1024)
        if data is None:
            print("disconnected")
            sys.exit()
        else:
            print("received data %s" % data)
    
    time.sleep(0.1)
    if random.randint(0, 5) == 0:
        sock.sendall(b"1,0,test,hello world")
