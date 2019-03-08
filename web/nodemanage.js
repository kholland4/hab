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

var nodeList;

function init() {
  loadf("getnodes.php", function() {
    nodeList = JSON.parse(this.responseText);
    for(var i = 0; i < nodeList.length; i++) {
      nodeList[i].elem = null;
      if(nodeList[i].displayName != null) {
        var elem = genItem(nodeList[i]);
        document.getElementById("main").appendChild(elem);
        nodeList[i].elem = elem;
      }
    }
  });
}
document.addEventListener("DOMContentLoaded", init);

function getNode(id) {
  for(var i = 0; i < nodeList.length; i++) {
    if(nodeList[i].id == id) {
      return nodeList[i];
    }
  }
  return null;
}

function genItem(data) {
  var container = document.createElement("div");
  container.className = "item item_outer";
  container.dataset.id = data["id"];
  
  var infoboxLeft = document.createElement("div");
  infoboxLeft.className = "item infobox_left";
  
  var displayName = document.createElement("div");
  displayName.className = "item ib_largeText";
  displayName.innerText = data["display_name"];
  infoboxLeft.appendChild(displayName);
  
  var name = document.createElement("div");
  name.className = "item ib_smallText";
  name.innerText = data["name"];
  infoboxLeft.appendChild(name);
  
  container.appendChild(infoboxLeft);
  
  var infoboxRight = document.createElement("div");
  infoboxRight.className = "item infobox_right";
  
  var buttonEdit = document.createElement("img");
  buttonEdit.className = "item ib_button";
  buttonEdit.src = "https://material.io/tools/icons/static/icons/baseline-edit-24px.svg";
  buttonEdit.dataset.id = data["id"];
  buttonEdit.onclick = function() { openPopup(this.dataset.id); };
  infoboxRight.appendChild(buttonEdit);
  
  container.appendChild(infoboxRight);
  
  return container;
}

function openPopup(id) {
  var data = getNode(id);
  var container = document.getElementById("popup");
  while(container.firstChild) { container.removeChild(container.firstChild); }
  
  container.style.display = "block";
}
