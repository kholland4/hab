class Message:
    src = None
    dest = None
    name = None
    content = None
    def __init__(self, src, dest=None, name=None, content=None):
        if src != None and dest == None and name == None and content == None:
            #from string
            data = src
            if type(data) is bytes:
                data = data.decode("utf-8")
            if data[len(data) - 1] == "\0":
                data = data[0:len(data) - 1]
            vals = data.split(",", 3)
            if len(vals) != 4:
                #TODO: error?
                return
            self.src = int(vals[0])
            self.dest = int(vals[1])
            self.name = vals[2]
            self.content = vals[3]
        else:
            self.src = src
            self.dest = dest
            self.name = name
            self.content = content
    
    def __repr__(self):
        return "%d -> %d '%s' %s" % (self.src, self.dest, self.name, self.content)
    
    def stringify(self):
        return "%d,%d,%s,%s\0" % (self.src, self.dest, self.name, self.content)
