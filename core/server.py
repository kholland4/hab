#!/usr/bin/python3
import selectors, socket, time, atexit, MySQLdb, json, time, math
from message import Message

DEBUG = False

#INSERT INTO nodes (name, groups) VALUES("env/tick", "env")
internalNodeIDs = {
  "env/tick": 3
}

nodeStates = {}
def storeNodeState(nodeID, state):
    nodeStates[nodeID] = state
def getNodeState(nodeID):
    if nodeID in nodeStates:
        return nodeStates[nodeID]
    return None

_vars = {}
def setVar(name, value):
    _vars[name] = value
def getVar(name):
    if name in _vars:
        return _vars[name]
    return None

def sendToAll(message):
    #print("sending", message)
    active = sel.get_map()
    for n, key in active.items():
        if key.fileobj != lsock:
            sock = key.fileobj
            sock.sendall(message.stringify().encode("utf-8"))

def processRaw(data, sock=None):
    if data.startswith("querystate"):
        if sock != None:
            sock.sendall(json.dumps(nodeStates).encode("utf-8"))
            if DEBUG:
                print("closing connection to %s" % str(sock.getpeername()))
            sel.unregister(sock)
            sock.shutdown(socket.SHUT_RDWR)
            sock.close()
    elif data.startswith("forward"):
        if DEBUG:
            print("closing connection to %s" % str(sock.getpeername()))
        sel.unregister(sock)
        sock.shutdown(socket.SHUT_RDWR)
        sock.close()
        
        d = data[7:]
        m = Message(d)
        if m != None:
            if m.dest == 0:
                processRaw(d)
            else:
                sendToAll(m)
                if m.name == "setstate":
                    storeNodeState(m.dest, m.content)
    else:
        try:
            m = Message(data)
            if not (type(m.src) is int) or not (type(m.dest) is int) or not (type(m.name) is str) or not (type(m.content) is str):
                return
            processMessage(m)
        except:
            pass

def processMessage(message):
    global sql
    #global db
    #print("received", message)
    
    oldState = getNodeState(message.src)
    if message.name == "state":
        storeNodeState(message.src, message.content)
    newState = getNodeState(message.src)
    
    src_id = int(message.src)
    
    c = sql.cursor()
    c.execute("""SELECT name, groups FROM nodes WHERE id=%s LIMIT 1""", (src_id,))
    res = c.fetchone()
    if res == None:
        c.close()
        sql.commit()
        return
    src_name = res[0]
    src_groups = res[1]
    
    #c = sql.cursor()
    c.execute("""SELECT ruleid, trigger_id, trigger_name, trigger_group FROM triggers WHERE (trigger_id=%s OR trigger_id IS NULL) AND (trigger_messagename=%s OR trigger_messagename IS NULL) AND (trigger_oldstate=%s OR trigger_oldstate IS NULL) AND (trigger_newstate=%s OR trigger_newstate IS NULL)""", (message.src, message.name, oldState, newState))
    rules = c.fetchall()
    for rule in rules:
        rule_id = rule[0]
        trigger_id = rule[1]
        trigger_name = rule[2]
        trigger_groups = rule[3]
        
        match = False
        if trigger_id != None:
            if int(trigger_id) == int(src_id):
                match = True
        if trigger_name != None:
            if trigger_name == src_name:
                match = True
        
        #TODO: group and name based matching
        
        if match:
            #c = sql.cursor()
            c.execute("""SELECT action FROM rules WHERE id=%s LIMIT 1""", (rule_id,))
            res = c.fetchone()
            runRule(res[0], message)
    c.close()
    sql.commit()

def getNodeID(nodeName):
    global sql
    
    name = nodeName
    
    c = sql.cursor()
    c.execute("""SELECT id FROM nodes WHERE name=%s LIMIT 1""", (name,))
    res = c.fetchone()
    c.close()
    sql.commit()
    
    return res[0]

def num(s):
    if (type(s) is int) or (type(s) is float):
        return s
    try:
        return int(s)
    except ValueError:
        return float(s)
    except TypeError:
        return 0

runRuleMessage = None

def getNodeProps(name):
    return nodeData[name] #FIXME if not present

def evalNode(nodes, nodeOutputs, i):
    node = nodes[i]
    props = getNodeProps(node["type"])
    inputs = []
    for n in node["in"]:
        if n == None:
            inputs.append(None) #FIXME
        elif n["type"] == "literal":
            inputs.append(n["value"])
        elif n["type"] == "node":
            if nodeOutputs[n["value"]] == None:
                evalNode(nodes, nodeOutputs, n["value"])
            inputs.append(nodeOutputs[n["value"]][int(n["index"])])
    outputs = []
    for n in range(len(props["out"])):
        outputs.append(None)
    
    typ = node["type"]
    if typ == "io:state":
        outputs[0] = getNodeState(getNodeID(inputs[0]))
    elif typ == "io:setstate":
        if num(inputs[2]):
            dest = getNodeID(inputs[0])
            val = str(inputs[1])
            #print("Set state for node %s value %s" % (inputs[0], val))
            sendToAll(Message(0, dest, "setstate", val))
            storeNodeState(dest, val)
    elif typ == "io:message":
        if num(inputs[3]):
            dest = getNodeID(inputs[0])
            val = str(inputs[2])
            sendToAll(Message(0, dest, inputs[1], val))
            if inputs[1] == "setstate":
                storeNodeState(dest, val)
    elif typ == "io:message_data":
        if runRuleMessage != None:
            outputs[0] = runRuleMessage.content
        else:
            outputs[0] = None
    
    
    
    elif typ == "vars:get":
        outputs[0] = getVar(str(inputs[0]))
    elif typ == "vars:set":
        if num(inputs[2]):
            setVar(str(inputs[0]), inputs[1])
    
    
    
    elif typ == "math:add":
        outputs[0] = num(inputs[0]) + num(inputs[1])
    elif typ == "math:subtract":
        outputs[0] = num(inputs[0]) - num(inputs[1])
    elif typ == "math:multiply":
        outputs[0] = num(inputs[0]) * num(inputs[1])
    elif typ == "math:divide":
        outputs[0] = num(inputs[0]) / num(inputs[1])
    elif typ == "math:bitwise":
        mode = inputs[1]
        op1 = int(num(inputs[0]))
        op2 = int(num(inputs[2]))
        if mode == "&" or mode == "and":
            outputs[0] = int(inputs[0] & inputs[2])
        elif mode == "|" or mode == "or":
            outputs[0] = int(op1 | op2)
        elif mode == "^" or mode == "xor":
            outputs[0] = int(op1 ^ op2)
        elif mode == "~" or mode == "not":
            outputs[0] = int(~op1)
        else:
            outputs[0] = 0
    elif typ == "math:modulo":
        outputs[0] = num(inputs[0]) % int(num(inputs[1]))
    elif typ == "math:round_floor":
        outputs[0] = math.floor(num(inputs[0]))
    elif typ == "math:round_ceil":
        outputs[0] = math.ceil(num(inputs[0]))
    elif typ == "math:round":
        outputs[0] = round(num(inputs[0]))
    elif typ == "math:pow":
        outputs[0] = math.pow(num(inputs[0]), num(inputs[1]))
    
    
    
    elif typ == "input:number":
        outputs[0] = num(inputs[0])
    elif typ == "input:string":
        outputs[0] = str(inputs[0])
    elif typ == "input:bool":
        outputs[0] = (num(inputs[0]) == 1)
    
    
    elif typ == "logic:compare":
        mode = inputs[1]
        op1 = num(inputs[0])
        op2 = num(inputs[2])
        if mode == "==":
            outputs[0] = int(inputs[0] == inputs[2])
        elif mode == "!=":
            outputs[0] = int(inputs[0] != inputs[2])
        elif mode == ">":
            outputs[0] = int(op1 > op2)
        elif mode == "<":
            outputs[0] = int(op1 < op2)
        elif mode == ">=":
            outputs[0] = int(op1 >= op2)
        elif mode == "<=":
            outputs[0] = int(op1 <= op2)
        else:
            outputs[0] = 0
    elif typ == "logic:bool_logic":
        mode = inputs[1]
        op1 = bool(num(inputs[0]))
        op2 = bool(num(inputs[2]))
        if mode == "&" or mode == "&&" or mode == "and":
            outputs[0] = int(inputs[0] and inputs[2])
        elif mode == "|" or mode == "||" or mode == "or":
            outputs[0] = int(op1 or op2)
        elif mode == "^" or mode == "xor":
            outputs[0] = int(op1 != op2)
        elif mode == "!" or mode == "not":
            outputs[0] = int(not op1)
        else:
            outputs[0] = 0
    elif typ == "logic:sel":
        if num(inputs[2]) == 0:
            outputs[0] = inputs[0]
        elif num(inputs[2]) == 1:
            outputs[0] = inputs[1]
        else:
            outputs[0] = inputs[0]
    
    
    
    elif typ == "env:time":
        outputs[0] = time.time()
    
    
    
    elif typ == "conv:RGBtoColor":
        outputs[0] = (((num(inputs[0]) >> 4) & 15) << 8) | (((num(inputs[1]) >> 4) & 15) << 4) | ((num(inputs[2]) >> 4) & 15)
    elif typ == "conv:ColortoRGB":
        val = num(inputs[0])
        outputs[0] = ((val >> 8) & 15) << 4
        outputs[1] = ((val >> 4) & 15) << 4
        outputs[2] = (val & 15) << 4
    
    
    
    elif typ == "string:sel_list":
        d = inputs[0].split(",")
        val = num(inputs[1])
        if val >= 0 and val < len(d):
            outputs[0] = d[val]
        else:
            outputs[0] = d[0]
    
    nodeOutputs[i] = outputs

def runRule(jsonData, message=None):
    global runRuleMessage
    #jsonData = """[{"type":"io:state","in":[{"type":"literal","value":"test/test","index":null}],"out":[{}]},{"type":"math:add","in":[{"type":"node","value":0,"index":"0"},{"type":"literal","value":"1","index":null}],"out":[{}]},{"type":"io:setstate","in":[{"type":"literal","value":"test/test","index":null},{"type":"node","value":1,"index":"0"},{"type":"literal","value":1,"index":null}],"out":[]}]"""
    nodes = json.loads(jsonData)
    runRuleMessage = message
    nodeOutputs = []
    for i in range(len(nodes)):
        #props = getNodeProps(nodes[i]["type"])
        nodeOutputs.append(None)
    for i in range(len(nodes)):
        if nodeOutputs[i] == None:
            nodeOutputs[i] = evalNode(nodes, nodeOutputs, i)

nodeData = None
with open("../nodetypes.json", "r") as f:
    nodeData = json.load(f)

sql = MySQLdb.connect("localhost", "php", "password", "hab")
#db = conn.cursor()
print("connected to sql server")

def closeSockets():
    active = sel.get_map()
    for n, key in active.items():
        if key.fileobj != lsock:
            sock = key.fileobj
            sock.close()
atexit.register(closeSockets)

sel = selectors.DefaultSelector()

lastTickTime = time.time()
tickCounter = 0
fracTickTime = time.time()
fracTickCounter = 0

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as lsock:
    lsock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    lsock.bind(("127.0.0.1", 55942))
    lsock.listen()
    print("listening")
    lsock.setblocking(False)
    sel.register(lsock, selectors.EVENT_READ, data=None)
    
    while True:
        events = sel.select(timeout=0)
        for key, mask in events:
            if key.data is None:
                #Accept connection
                sock = key.fileobj
                conn, addr = sock.accept()
                if DEBUG:
                    print("accepted connection from %s" % str(addr))
                conn.setblocking(False)
                #data = types.SimpleNamespace(addr=addr, inb=b'', outb=b'')
                events = selectors.EVENT_READ | selectors.EVENT_WRITE
                sel.register(conn, events, data={"addr": addr, "buf": ""})
            else:
                #Service connection
                sock = key.fileobj
                data = key.data
                if mask & selectors.EVENT_READ:
                    recv_data = sock.recv(1024)
                    if recv_data:
                        #print("received data %s from %s" % (recv_data, str(data["addr"])))
                        #processRaw(recv_data)
                        try:
                            data["buf"] += recv_data.decode("utf-8")
                            while "\0" in data["buf"]:
                                idx = data["buf"].find("\0")
                                useData = data["buf"][0:idx]
                                data["buf"] = data["buf"][idx + 1:]
                                processRaw(useData, sock)
                        except:
                            pass
                    else:
                        if DEBUG:
                            print("closing connection to %s" % str(data["addr"]))
                        sel.unregister(sock)
                        sock.shutdown(socket.SHUT_RDWR)
                        sock.close()
                #if mask & selectors.EVENT_WRITE
        
        timeNow = time.time()
        if timeNow - lastTickTime > 1:
            processMessage(Message(internalNodeIDs["env/tick"], 0, "1s", str(int(timeNow))))
            lastTickTime += 1
            
            if tickCounter % 5 == 0:
                processMessage(Message(internalNodeIDs["env/tick"], 0, "5s", str(int(timeNow))))
            if tickCounter % 15 == 0:
                processMessage(Message(internalNodeIDs["env/tick"], 0, "15s", str(int(timeNow))))
            if tickCounter % 30 == 0:
                processMessage(Message(internalNodeIDs["env/tick"], 0, "30s", str(int(timeNow))))
            if tickCounter % 60 == 0:
                processMessage(Message(internalNodeIDs["env/tick"], 0, "60s", str(int(timeNow))))
                tickCounter = 0
            
            tickCounter += 1
        if timeNow - fracTickTime > 0.25:
            processMessage(Message(internalNodeIDs["env/tick"], 0, "0.25s", str(int(timeNow))))
            fracTickTime += 0.25
            
            if fracTickCounter % 2 == 0:
                processMessage(Message(internalNodeIDs["env/tick"], 0, "0.5s", str(int(timeNow))))
            
            fracTickCounter += 1
        
        time.sleep(0.01)
