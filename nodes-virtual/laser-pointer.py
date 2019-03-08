#!/usr/bin/python3
import sys, requests, time, atexit, selectors, socket, time, random
from random import randint
sys.path.append("../core")
from message import Message

sel = selectors.DefaultSelector()

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(("127.0.0.1", 55942))
sock.setblocking(False)
sel.register(sock, selectors.EVENT_READ, data=None)
buf = ""

state = "0"

prescaler = 0

#---------

def write(x, y, laserState = 1):
    #ser.write(bytearray([x, y]))
    x = min(max(x, 0), 255)
    y = min(max(y, 0), 255)
    val = ((x & 255) << 8) | (y & 254) | laserState
    #r = requests.post("http://192.168.15.175/hab/web/sendmessage.php", data = {"data": "0,8,setstate,%d" % val})
    sock.sendall(("forward0,8,setstate,%d\0" % val).encode("utf-8"))

#write(90, 90, 1)

enabled = False

currPos = [90, 90]
bounds = [[30, 180], [40, 85]]
speeds = [5, 3]
target = [90, 90]

def onExit():
    write(90, 90, 0)
atexit.register(onExit)

time.sleep(0.5)

while True:
    events = sel.select(timeout=0)
    for key, mask in events:
        data = sock.recv(1024)
        if data is None:
            print("disconnected")
            write(90, 90, 0)
            sys.exit()
        else:
            try:
                buf += data.decode("utf-8")
                while "\0" in buf:
                    idx = buf.find("\0")
                    data = buf[0:idx]
                    buf = buf[idx + 1:]
                    
                    #print("received data %s" % data)
                    m = Message(data)
                    print(m)
                    if m.dest == 9 and m.name == "setstate":
                        state = m.content
                        enabled = bool(int(state))
                        if enabled:
                            write(currPos[0], currPos[1], 1)
                        else:
                            write(currPos[0], currPos[1], 0)
            except:
                pass
    
    if enabled:
        if currPos[0] != target[0] and currPos[1] != target[1]: #FIXME
            for coord in [0, 1]:
                if currPos[coord] < target[coord]:
                    currPos[coord] = currPos[coord] + min(abs(currPos[coord] - target[coord]), speeds[coord])
                elif currPos[coord] > target[coord]:
                    currPos[coord] = currPos[coord] - min(abs(currPos[coord] - target[coord]), speeds[coord])
            write(currPos[0], currPos[1])
            #print("(%d, %d)" % (currPos[0], currPos[1]))
            time.sleep(0.07)
        else:
            time.sleep(randint(0, 20) / 10.0)
            target = [randint(bounds[0][0], bounds[0][1]), randint(bounds[1][0], bounds[1][1])]
            #print("target: (%d, %d)" % (target[0], target[1]))
            
            speeds[0] = randint(5, 10)
            speeds[1] = randint(3, 8)
    
    #if prescaler % 5 == 0:
    sock.sendall(Message(9, 0, "state", str(int(enabled))).stringify().encode("utf-8"))
    #    prescaler = 0
    #prescaler += 1

time.sleep(1)
