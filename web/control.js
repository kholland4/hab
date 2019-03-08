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

/*var controlList = [
  {"id": 1, "name": "test/debug", "groups": "test", "displayName": "debug test", "controlType": "toggle", "controlValue": 1, "elem": []}
];*/
var controlList;
var isLoading = 0;

function init() {
  loadf("getcontrols.php", function() {
    controlList = JSON.parse(this.responseText);
    for(var i = 0; i < controlList.length; i++) {
      controlList[i].elem = [];
      if(controlList[i].displayName != null) {
        var elem = genControlItem(controlList[i]);
        document.getElementById("main").appendChild(elem);
        controlList[i].elem.push(elem);
      }
    }
    updateStateReq();
  });
  
  setInterval(function() {
    if(isLoading <= 0) {
      updateStateReq();
    }
  }, 500);
}

function updateStateReq() {
  isLoading++;
  loadf("getstate.php?r=" + Math.random(), function() {
    if(this.status == 200) {
      var data;
      try {
        data = JSON.parse(this.responseText);
      } catch(e) {
        
      }
      if(data != undefined) {
        updateState(data);
      }
    }
    isLoading--;
  }, 4000, function() { isLoading--; /* TODO: show error */});
}
document.addEventListener("DOMContentLoaded", init);

function updateState(data) {
  for(var i = 0; i < controlList.length; i++) {
    if(controlList[i].id in data) {
      controlList[i].controlValue = data[controlList[i].id];
      for(var n = 0; n < controlList[i].elem.length; n++) {
        updateControlValue(controlList[i].elem[n]);
      }
    }
  }
}

function getControl(id) {
  for(var i = 0; i < controlList.length; i++) {
    if(controlList[i].id == id) {
      return controlList[i];
    }
  }
  return null;
}

function parseEnum(str, index) {
  if(str.indexOf(":") != -1) {
    var data = str.substring(str.indexOf(":") + 1);
    var vals = data.split(",");
    if(index < vals.length) {
      return vals[index];
    } else {
      return index.toString();
    }
  } else {
    return index.toString();
  }
}

function updateControlValue(elem) {
  var id = elem.dataset.id;
  var data = getControl(id);
  var t = elem.children[1];
  if(data["controlType"] == null) {
  
  } else if(data["controlType"] == "textbox") {
    t.children[0].placeholder = data["controlValue"];
  } else if(data["controlType"].startsWith("toggle")) {
    if(data["controlValue"] === parseEnum(data["controlType"], 1)) {
      t.children[0].children[0].children[0].className = "control toggle_inner toggle_inner_on";
      t.children[0].dataset.state = 1;
    } else {
      t.children[0].children[0].children[0].className = "control toggle_inner toggle_inner_off";
      t.children[0].dataset.state = 0;
    }
  } else if(data["controlType"] == "text") {
    t.children[0].innerText = data["controlValue"];
  } else if(data["controlType"] == "color") {
    if(data["controlValue"] != "0") {
      t.children[1].children[0].children[0].className = "control toggle_inner toggle_inner_on";
      t.children[1].dataset.state = 1;
      
      var data = parseInt(data["controlValue"]);
      var val = "#" + ((data >> 8) & 15).toString(16) + "0" + ((data >> 4) & 15).toString(16) + "0" + (data & 15).toString(16) + "0";
      t.children[0].defaultValue = val;
    } else {
      t.children[1].children[0].children[0].className = "control toggle_inner toggle_inner_off";
      t.children[1].dataset.state = 0;
    }
  }
}

function sendControlUpdate(id, value) {
  httpPost("sendmessage.php", "data=" + encodeURIComponent("0," + id + ",setstate," + value), function() {});
}

function genControlItem(data) {
  var container = document.createElement("div");
  container.className = "control control_item_outer";
  container.dataset.id = data["id"];
  
  var name = document.createElement("div");
  name.className = "control control_item_name";
  name.innerText = data["displayName"];
  container.appendChild(name);
  
  var controlContainer = document.createElement("div");
  controlContainer.className = "control control_c_outer";
  if(data["controlType"] == null) {
  
  } else if(data["controlType"] == "textbox") {
    var textbox = document.createElement("input");
    textbox.className = "control control_c_textbox";
    textbox.value = data["controlValue"];
    controlContainer.appendChild(textbox);
    var button = document.createElement("button");
    button.className = "control control_c_textboxbutton";
    button.innerText = "Submit";
    button.dataset.id = data["id"];
    button.onclick = function() {
      sendControlUpdate(this.dataset.id, this.parentElement.children[0].value);
    };
    controlContainer.appendChild(button);
  } else if(data["controlType"].startsWith("toggle")) {
    var c = document.createElement("div");
    c.className = "control control_c_toggle";
    var toggleOuter = document.createElement("div");
    toggleOuter.className = "control toggle_outer";
    var toggleInner = document.createElement("div");
    if(data["controlValue"] === parseEnum(data["controlType"], 1)) {
      toggleInner.className = "control toggle_inner toggle_inner_on";
    } else {
      toggleInner.className = "control toggle_inner toggle_inner_off";
    }
    toggleOuter.appendChild(toggleInner);
    c.appendChild(toggleOuter);
    
    c.dataset.state = 0;
    c.dataset.id = data["id"];
    c.dataset.controlType = data["controlType"];
    c.onclick = function() {
      if(this.dataset.state == 0) {
        this.firstChild.firstChild.className = "control toggle_inner toggle_inner_on";
        this.dataset.state = 1;
      } else if(this.dataset.state == 1) {
        this.firstChild.firstChild.className = "control toggle_inner toggle_inner_off";
        this.dataset.state = 0;
      }
      sendControlUpdate(this.dataset.id, parseEnum(this.dataset.controlType, this.dataset.state));
    };
    controlContainer.appendChild(c);
  } else if(data["controlType"] == "text") {
    var text = document.createElement("div");
    text.className = "control control_c_text";
    text.innerText = data["controlValue"];
    controlContainer.appendChild(text);
  } else if(data["controlType"] == "color") {
    var color = document.createElement("input");
    color.type = "color";
    color.className = "control control_c_color";
    color.onchange = function() {
      var target = this.parentElement.children[1];
      if(target.dataset.state != 0) {
        var val = this.value.substring(1);
        val = val.substring(0, 1) + val.substring(2, 3) + val.substring(4, 5);
        
        target.dataset.state = parseInt(val, 16);
        
        sendControlUpdate(target.dataset.id, target.dataset.state);
      }
    };
    controlContainer.appendChild(color);
    
    var c = document.createElement("div");
    c.style.display = "inline-block";
    c.className = "control control_c_toggle";
    var toggleOuter = document.createElement("div");
    toggleOuter.className = "control toggle_outer";
    var toggleInner = document.createElement("div");
    if(parseInt(data["controlValue"]) > 0) {
      toggleInner.className = "control toggle_inner toggle_inner_on";
    } else {
      toggleInner.className = "control toggle_inner toggle_inner_off";
    }
    toggleOuter.appendChild(toggleInner);
    c.appendChild(toggleOuter);
    
    c.dataset.state = 0;
    c.dataset.id = data["id"];
    c.onclick = function() {
      if(this.dataset.state == 0) {
        this.firstChild.firstChild.className = "control toggle_inner toggle_inner_on";
        var val = this.parentElement.children[0].value.substring(1);
        val = val.substring(0, 1) + val.substring(2, 3) + val.substring(4, 5);
        
        this.dataset.state = parseInt(val, 16);
      } else {
        this.firstChild.firstChild.className = "control toggle_inner toggle_inner_off";
        this.dataset.state = 0;
      }
      sendControlUpdate(this.dataset.id, this.dataset.state);
    };
    controlContainer.appendChild(c);
  }
  container.appendChild(controlContainer);
  
  return container;
}
