#!/usr/bin/python3
import sys, os, selectors, socket, time, random
sys.path.append("../core")
from message import Message

def prog_spk(data):
    os.system("play --no-show-progress --null --channels 1 synth 0.2 sawtooth %d&" % int(float(data)))

nodes = [
  {"id": 7, "signal": "setstate", "function": prog_spk, "defaultState": -1, "displayName": "Speaker"},
  {"id": 6, "signal": "setstate", "function": lambda x: None, "defaultState": 0, "displayName": "Lamp"}
]

def getState(nodeID):
    for i in range(len(nodes)):
        if nodes[i]["id"] == nodeID:
            return states[i]
    return None

sel = selectors.DefaultSelector()

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(("127.0.0.1", 55942))
sock.setblocking(False)
sel.register(sock, selectors.EVENT_READ, data=None)
buf = ""

states = []
for i in range(len(nodes)):
    if "defaultState" in nodes[i]:
        states.append(nodes[i]["defaultState"])
    else:
        states.append(None)

prescaler = 0
stateIndex = 0

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
                for i in range(len(nodes)):
                    node = nodes[i]
                    if m.dest == node["id"]:
                        if m.name == "setstate":
                            states[i] = m.content
                        if m.name == node["signal"]:
                            node["function"](m.content)
                    
    
    time.sleep(0.1)
    if prescaler % 2 == 0:
        sock.sendall(Message(nodes[stateIndex]["id"], 0, "state", states[stateIndex]).stringify().encode("utf-8"))
        stateIndex += 1
        if stateIndex >= len(nodes):
            stateIndex = 0
        prescaler = 0
    prescaler += 1
    
    sys.stdout.write("\r")
    for i in range(len(nodes)):
        node = nodes[i]
        if node["displayName"] != None:
            sys.stdout.write("%s: %s   " % (node["displayName"], states[i]))
    sys.stdout.flush()
