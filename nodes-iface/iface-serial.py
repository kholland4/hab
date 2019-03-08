#!/usr/bin/python3
import sys, selectors, socket, time, random, serial
sys.path.append("../core")
from message import Message

ser = serial.Serial("/dev/ttyACM0", 57600)

#purge buffer
while ser.in_waiting > 0:
    ser.read()

sel = selectors.DefaultSelector()

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(("127.0.0.1", 55942))
sock.setblocking(False)
sel.register(sock, selectors.EVENT_READ, data=None)

buf = b""

while True:
    events = sel.select(timeout=0)
    for key, mask in events:
        data = sock.recv(1024)
        if data is None:
            print("disconnected")
            sys.exit()
        else:
            #ser.write(data)
            buf += data
            while "\0" in buf.decode("ascii"):
                idx = buf.decode("ascii").find("\0")
                data = buf[0:idx]
                buf = buf[idx + 1:]
                
                ser.write(data)
                time.sleep(0.03)
    
    data = bytearray()
    while ser.in_waiting > 0:
        data += ser.read()
    sock.sendall(data)
    
    time.sleep(0.01)
