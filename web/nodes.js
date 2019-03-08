function loadf(url, callback, timeout = null, timeoutCallback = null) {
  var xhttp = new XMLHttpRequest();
  xhttp._callback = callback;
  xhttp.onreadystatechange = function() {
    if(this.readyState == 4) {
      this._callback();
    }
  };
  if(timeout != null) {
    xhttp.timeout = timeout;
  }
  if(timeoutCallback != null) {
    xhttp.ontimeout = timeoutCallback;
  }
  xhttp.open("GET", url);
  xhttp.send();
}

function httpPost(url, postData, callback, urlEncoded = true) {
  var xhttp = new XMLHttpRequest();
  xhttp._callback = callback;
  xhttp.onreadystatechange = function() {
    if(this.readyState == 4) {
      this._callback();
    }
  };
  xhttp.open("POST", url);
  if(urlEncoded) {
    xhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  }
  xhttp.send(postData);
}

var nodeData;

var nodes = []; //elem, type, props, values
var wires = []; //start: elem, type, index; end: elem, type, index

var canvas;
var ctx;

var ruleid = 1;

function init() {
  var params = new URLSearchParams(window.location.search);
  if(params.has("ruleid")) {
    ruleid = parseInt(params.get("ruleid"));
  }
  
  canvas = document.getElementById("wires");
  canvas.addEventListener("click", function() {
    if(wireIsDragging) {
      for(var i = 0; i < wires.length; i++) {
        if(wires[i] == wireDragTarget) {
          wires.splice(i, 1);
          wireIsDragging = false;
          if(wireDragTarget.start.elem != null) { updateNode(wireDragTarget.start.elem); }
          if(wireDragTarget.end.elem != null) { updateNode(wireDragTarget.end.elem); }
          wireDragTarget = null;
          draw();
          return;
        }
      }
    }
  });
  ctx = canvas.getContext("2d");
  resize();
  
  document.getElementById("info_title").value = "Rule id " + ruleid;
  
  loadf("../nodetypes.json", function() {
    nodeData = JSON.parse(this.responseText);
    initToolbox();
    
    loadf("load.php?ruleid=" + ruleid, function() {
      var data = JSON.parse(this.responseText);
      if(data["title"] != null) {
        document.getElementById("info_title").value = data["title"];
      }
      importNodes(data["action"]);
      importTriggers(data["triggers"]);
    });
  });
  
  initTriggers();
}
document.addEventListener("DOMContentLoaded", init);
document.addEventListener("mouseup", nodeDragStop);
window.addEventListener("resize", resize);

var nodeIsDragging = false;
var nodeDragTarget = null;
var nodeDragOffset = [0, 0];
function nodeDragStart(e) {
  nodeDragTarget = this;
  var bb = nodeDragTarget.getBoundingClientRect();
  nodeDragOffset = [bb.left - e.clientX, bb.top - e.clientY];
  nodeIsDragging = true;
}
function nodeDragStop(e) {
  nodeIsDragging = false;
  nodeDragTarget = null;
}
var wireIsDragging = false;
var wireDragTarget = null;
var mousePos = {x: 0, y: 0};
function mouseMove(e) {
  mousePos.x = e.clientX;
  mousePos.y = e.clientY;
  if(nodeIsDragging) {
    nodeDragTarget.style.left = (e.clientX + nodeDragOffset[0]) + "px";
    nodeDragTarget.style.top = (e.clientY + nodeDragOffset[1]) + "px";
  }
  if(nodeIsDragging || wireIsDragging) {
    draw();
  }
}
document.addEventListener("mousemove", mouseMove);

function genNodeInner(outer, props, values, nodeType=null) {
  var title = document.createElement("div");
  title.className = "node node_title";
  title.innerText = props.title;
  outer.appendChild(title);
  
  var deleteButton = document.createElement("div");
  deleteButton.className = "node node_delete";
  deleteButton.innerText = "x";
  deleteButton.addEventListener("click", function() { deleteNode(this.parentElement); });
  outer.appendChild(deleteButton);
  
  var container = document.createElement("div");
  container.className = "node rel_container_outer";
  container.style.height = Math.max(props.in.length * 20, props.out.length * 20) + "px";
  
  var inputContainer = document.createElement("div");
  inputContainer.className = "node rel_container_left";
  for(var i = 0; i < props.in.length; i++) {
    var connectorContainer = document.createElement("div");
    connectorContainer.className = "node node_input_outer";
    
    var connector = document.createElement("div");
    connector.className = "node node_input c_type_" + props.in[i].type;
    connector.dataset.type = "in";
    connector.dataset.index = i;
    connector.addEventListener("mousedown", function(e) {
      e.stopPropagation();
    });
    connector.addEventListener("click", function(e) {
      handleWire(this.parentElement.parentElement.parentElement.parentElement, this.dataset.type, this.dataset.index);
    });
    connectorContainer.appendChild(connector);
    
    var textbox = document.createElement("div");
    textbox.className = "node node_input_textbox";
    if(getWireAt(outer, "in", i) != null || props.in[i].type == "any") {
      textbox.innerText = props.in[i].name;
    } else if(props.in[i].type == "bool") {
      var input = document.createElement("select");
      input.className = "node node_input_entry node_input_dropdown";
      var el = document.createElement("option"); el.value = "1"; el.innerText = "true"; input.appendChild(el);
      var el = document.createElement("option"); el.value = "0"; el.innerText = "false"; input.appendChild(el);
      if(values[i] != null) {
        input.value = values[i];
      }
      input.dataset.index = i;
      input.addEventListener("change", function(e) {
        values[this.dataset.index] = this.value;
      });
      textbox.appendChild(input);
    } else {
      var input = document.createElement("input");
      input.className = "node node_input_entry";
      input.placeholder = props.in[i].name;
      if(props.in[i].type == "number") { input.type = "number"; }
      if(props.in[i].type == "string") { input.type = "text"; }
      if(props.in[i].type == "bool") { input.type = "checkbox"; }
      if(values[i] != null) {
        input.value = values[i];
      }
      input.dataset.index = i;
      input.addEventListener("change", function(e) {
        if(this.type == "number") {
          values[this.dataset.index] = parseFloat(this.value);
        } else if(this.type == "text") {
          values[this.dataset.index] = this.value;
        } else {
          values[this.dataset.index] = this.value;
        }
      });
      textbox.appendChild(input);
    }
    connectorContainer.appendChild(textbox);
    
    inputContainer.appendChild(connectorContainer);
  }
  container.appendChild(inputContainer);
  
  var outputContainer = document.createElement("div");
  outputContainer.className = "node rel_container_right";
  for(var i = 0; i < props.out.length; i++) {
    var connectorContainer = document.createElement("div");
    connectorContainer.className = "node node_output_outer";
    
    var connector = document.createElement("div");
    connector.className = "node node_output c_type_" + props.out[i].type;
    connector.dataset.type = "out";
    connector.dataset.index = i;
    connector.addEventListener("mousedown", function(e) {
      e.stopPropagation();
      handleWire(this.parentElement.parentElement.parentElement.parentElement, this.dataset.type, this.dataset.index);
    });
    /*connector.addEventListener("mouseup", function(e) {
      handleWire(this.parentElement.parentElement.parentElement.parentElement, this.dataset.type, this.dataset.index);
    });*/
    connectorContainer.appendChild(connector);
    
    var textbox = document.createElement("div");
    textbox.className = "node node_output_textbox";
    textbox.innerText = props.out[i].name;
    connectorContainer.appendChild(textbox);
    
    outputContainer.appendChild(connectorContainer);
  }
  container.appendChild(outputContainer);
  outer.appendChild(container);
}

function genNode(props, nodeType=null) {
  var outer = document.createElement("div");
  outer.className = "node node_outer";
  
  var values = [];
  for(var i = 0; i < props.in.length; i++) {
    if(props.in[i].default != undefined) {
      values.push(props.in[i].default);
    } else if(props.in[i].type == "number") {
      values.push(0);
    } else if(props.in[i].type == "string") {
      values.push("");
    } else {
      values.push(null);
    }
  }
  
  genNodeInner(outer, props, values, nodeType);
  
  outer.addEventListener("mousedown", nodeDragStart);
  outer.addEventListener("mouseup", nodeDragStop);
  
  nodes.push({elem: outer, type: nodeType, props: props, values: values});
  
  return outer;
}

function updateNode(elem) {
  var outer = elem;
  
  var props;
  var nodeType;
  var values;
  for(var i = 0; i < nodes.length; i++) {
    if(nodes[i].elem == outer) {
      props = nodes[i].props;
      nodeType = nodes[i].type;
      values = nodes[i].values;
    }
  }
  if(props == null) {
    return;
  }
  
  while(outer.firstChild) { outer.removeChild(outer.firstChild); }
  
  genNodeInner(outer, props, values, nodeType);
  
  //nodes.push({elem: outer, type: nodeType, props: props});
}

function deleteNode(elem) {
  var index = null;
  for(var i = 0; i < nodes.length; i++) {
    if(nodes[i].elem == elem) {
      index = i;
      break;
    }
  }
  if(index == null) {
    return;
  }
  
  for(var i = 0; i < wires.length; i++) {
    if(wires[i].start.elem == elem) {
      wires.splice(i, 1);
      i--;
      updateNode(wires[i].end.elem);
    } else if(wires[i].end.elem == elem) {
      wires.splice(i, 1);
      i--;
      updateNode(wires[i].start.elem);
    }
  }
  
  if(elem.parentElement) {
    elem.parentElement.removeChild(elem);
  }
  nodes.splice(index, 1);
  drawWires();
}

function getWireAt(node, type, index) {
  for(var i = 0; i < wires.length; i++) {
    if(wires[i].start.elem == node && wires[i].start.type == type && wires[i].start.index == index) {
      return {index: i, type: "start"};
    }
    if(wires[i].end.elem == node && wires[i].end.type == type && wires[i].end.index == index) {
      return {index: i, type: "end"};
    }
  }
  return null;
}

function handleWire(node, type, index) {
  var wireData = getWireAt(node, type, index);
  //console.log(wireData);
  if((wireData == null && !wireIsDragging) || (wireData != null && !wireIsDragging && type == "out")) {
    var wire = {};
    if(type == "in") {
      wire.end = {elem: node, type: type, index: index};
      wire.start = {elem: null, type: null, index: null};
    } else if(type == "out") {
      wire.end = {elem: null, type: null, index: null};
      wire.start = {elem: node, type: type, index: index};
    }
    wireIsDragging = true;
    wireDragTarget = wire;
    wires.push(wire);
    if(type == "in") {
      updateNode(wire.end.elem);
    }
  } else if(wireIsDragging) { //wireData == null && 
    var wire = wireDragTarget;
    if(type == "out" && wire.start.elem == null) {
      wire.start.elem = node;
      wire.start.type = type;
      wire.start.index = index;
      wireIsDragging = false;
      wireDragTarget = null;
    } else if(type == "in" && wire.end.elem == null) {
      wire.end.elem = node;
      wire.end.type = type;
      wire.end.index = index;
      wireIsDragging = false;
      wireDragTarget = null;
      updateNode(wire.end.elem);
    } else {
      
    }
  } else if(wireData != null && type == "in") {
    var wire = wires[wireData.index];
    var oldEnd = wire.end.elem;
    wire.end.elem = null;
    wire.end.type = null;
    wire.end.index = null;
    wireIsDragging = true;
    wireDragTarget = wire;
    updateNode(oldEnd);
  }
  draw();
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
}

function calcHandlePos(nodeElem, type, index) {
  if(nodeElem == null && type == null && index == null) {
    return {x: mousePos.x, y: mousePos.y};
  }
  
  var elem = null;
  if(type == "in") {
    elem = nodeElem.children[2].children[0].children[index].children[0];
  } else if(type == "out") {
    elem = nodeElem.children[2].children[1].children[index].children[0];
  } else {
    return {x: 0, y: 0};
  }
  var bb = elem.getBoundingClientRect();
  return {x: bb.left + 5, y: bb.top + 5};
}

function draw() {
  drawWires();
}
function drawWires() {
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.fill();
  
  for(var i = 0; i < wires.length; i++) {
    ctx.beginPath();
    var startPos = calcHandlePos(wires[i].start.elem, wires[i].start.type, wires[i].start.index);
    var endPos = calcHandlePos(wires[i].end.elem, wires[i].end.type, wires[i].end.index);
    ctx.moveTo(startPos.x, startPos.y);
    ctx.bezierCurveTo(Math.max((startPos.x + endPos.x) / 2, startPos.x + 50), startPos.y, Math.min((startPos.x + endPos.x) / 2, endPos.x - 50), endPos.y, endPos.x, endPos.y);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function initToolbox() {
  var container = document.getElementById("toolbox");
  var lastCategory = "";
  for(var key in nodeData) {
    if("category" in nodeData[key]) {
      if(nodeData[key].category != lastCategory) {
        var item = document.createElement("div");
        item.className = "toolbox toolbox_label";
        item.innerText = nodeData[key].category;
        container.appendChild(item);
      }
      lastCategory = nodeData[key].category;
    } else {
      lastCategory = "";
    }
    var item = document.createElement("div");
    item.className = "toolbox toolbox_item toolbox_node";
    item.innerText = nodeData[key].title;
    item.dataset.key = key;
    item.addEventListener("mousedown", function(e) {
      var node = genNode(nodeData[this.dataset.key], this.dataset.key);
      document.getElementById("main").appendChild(node);
      nodeIsDragging = true;
      nodeDragTarget = node;
      nodeDragOffset = [0, 0];
    });
    container.appendChild(item);
  }
}

function initTriggers() {
  
}

function addTrigger() {
  document.getElementById("triggerList").appendChild(genTrigger());
}

function genTrigger() {
  var container = document.createElement("div");
  
  var label = document.createElement("span");
  label.innerText = "Trigger on ";
  container.appendChild(label);
  
  var nodeTypeSel = document.createElement("select");
  var opt = document.createElement("option"); opt.value = "trigger_id"; opt.innerText = "node id"; nodeTypeSel.appendChild(opt);
  var opt = document.createElement("option"); opt.value = "trigger_name"; opt.innerText = "node name"; nodeTypeSel.appendChild(opt);
  var opt = document.createElement("option"); opt.value = "trigger_group"; opt.innerText = "node from group"; nodeTypeSel.appendChild(opt);
  nodeTypeSel.value = "trigger_name";
  container.appendChild(nodeTypeSel);
  
  var nodeTypeInput = document.createElement("input");
  nodeTypeInput.type = "text";
  container.appendChild(nodeTypeInput);
  
  var label = document.createElement("span");
  label.innerText = "message name ";
  container.appendChild(label);
  
  var messageNameInput = document.createElement("input");
  messageNameInput.type = "text";
  container.appendChild(messageNameInput);
  
  var label = document.createElement("span");
  label.innerText = "state ";
  container.appendChild(label);
  
  var oldStateInput = document.createElement("input");
  oldStateInput.type = "text";
  oldStateInput.style.width = "100px";
  container.appendChild(oldStateInput);
  
  var label = document.createElement("span");
  label.innerText = " to ";
  container.appendChild(label);
  
  var newStateInput = document.createElement("input");
  newStateInput.type = "text";
  newStateInput.style.width = "100px";
  container.appendChild(newStateInput);
  
  var deleteButton = document.createElement("button");
  deleteButton.onclick = function() { this.parentElement.parentElement.removeChild(this.parentElement); };
  deleteButton.innerText = "Remove";
  container.appendChild(deleteButton);
  
  return container;
}

function exportNodes() {
  var output = [];
  for(var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    var nodeOutput = {type: node.type, in: [], out: [], pos: []};
    for(var n = 0; n < node.props.in.length; n++) {
      var wireData = getWireAt(node.elem, "in", n);
      if(wireData == null) {
        nodeOutput.in.push({type: "literal", value: node.values[n], index: null});
      } else {
        var index = 0;
        for(var x = 0; x < nodes.length; x++) {
          if(nodes[x].elem == wires[wireData.index].start.elem) {
            index = x;
            break;
          }
        }
        nodeOutput.in.push({type: "node", value: index, index: parseInt(wires[wireData.index].start.index)});
      }
    }
    for(var n = 0; n < node.props.out.length; n++) {
      nodeOutput.out.push({}); //TODO
    }
    var bb = node.elem.getBoundingClientRect();
    nodeOutput.pos = [bb.left, bb.top];
    output.push(nodeOutput);
  }
  return JSON.stringify(output);
}

function importNodes(data) {
  if(data == null) {
    data = "[]";
  }
  data = JSON.parse(data);
  for(var i = 0; i < nodes.length; i++) {
    if(nodes[i].elem.parentElement) {
      nodes[i].elem.parentElement.removeChild(nodes[i].elem);
    }
  }
  nodes = [];
  wires = [];
  for(var i = 0; i < data.length; i++) {
    var nodeRaw = data[i];
    var type = nodeRaw.type;
    var elem = genNode(nodeData[type], type);
    for(var n = 0; n < nodeRaw.in.length; n++) {
      if(nodeRaw.in[n] != null) {
        if(nodeRaw.in[n].type == "literal") {
          nodes[i].values[n] = nodeRaw.in[n].value;
        }
      }
    }
    elem.style.left = nodeRaw.pos[0] + "px";
    elem.style.top = nodeRaw.pos[1] + "px";
    document.getElementById("main").appendChild(elem);
  }
  
  for(var i = 0; i < data.length; i++) {
    var nodeRaw = data[i];
    for(var n = 0; n < nodeRaw.in.length; n++) {
      if(nodeRaw.in[n] != null) {
        if(nodeRaw.in[n].type == "node") {
          var value = nodeRaw.in[n].value;
          var index = nodeRaw.in[n].index;
          var wire = {};
          wire.end = {elem: nodes[i].elem, type: "in", index: n};
          wire.start = {elem: nodes[value].elem, type: "out", index: index};
          wires.push(wire);
        }
      }
    }
    updateNode(nodes[i].elem);
  }
  drawWires();
}

function exportTriggers() {
  var output = [];
  var list = document.getElementById("triggerList").children;
  for(let item of list) {
    var props = {trigger_id: null, trigger_name: null, trigger_group: null, trigger_messagename: null, trigger_oldstate: null, trigger_newstate: null};
    if(item.children[1].value == "trigger_id") {
      props.trigger_id = item.children[2].value;
    } else if(item.children[1].value == "trigger_name") {
      props.trigger_name = item.children[2].value;
    } else if(item.children[1].value == "trigger_group") {
      props.trigger_group = item.children[2].value;
    }
    
    if(item.children[4].value != "") {
      props.trigger_messagename = item.children[4].value;
    }
    
    if(item.children[6].value != "") {
      props.trigger_oldstate = item.children[6].value;
    }
    
    if(item.children[8].value != "") {
      props.trigger_newstate = item.children[8].value;
    }
    
    output.push(props);  
  }
  return JSON.stringify(output);
}

function importTriggers(data) {
  //var triggersRaw = JSON.parse(data);
  var triggersRaw = data;
  var list = document.getElementById("triggerList");
  while(list.firstChild) { list.removeChild(list.firstChild); }
  for(let props of triggersRaw) {
    var item = genTrigger();
    if(props.trigger_id != null) {
      item.children[1].value = "trigger_id";
      item.children[2].value = props.trigger_id;
    } else if(props.trigger_name != null) {
      item.children[1].value = "trigger_name";
      item.children[2].value = props.trigger_name;
    } else if(props.trigger_group != null) {
      item.children[1].value = "trigger_group";
      item.children[2].value = props.trigger_group;
    }
    
    if(props.trigger_messagename != null) {
      item.children[4].value = props.trigger_messagename;
    }
    
    if(props.trigger_oldstate != null) {
      item.children[6].value = props.trigger_oldstate;
    }
    
    if(props.trigger_newstate != null) {
      item.children[8].value = props.trigger_newstate;
    }
    
    list.appendChild(item);  
  }
}

function saveServer() {
  var data = exportNodes();
  var triggers = exportTriggers();
  var title = document.getElementById("info_title").value;
  httpPost("save.php", "ruleid=" + ruleid + "&data=" + encodeURIComponent(data) + "&title=" + encodeURIComponent(title) + "&triggers=" + encodeURIComponent(triggers), function() {});
}
