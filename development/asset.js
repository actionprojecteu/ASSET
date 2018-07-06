var sourceJSON;
var exportAnchorElement;
var assetAppElement;
var popupElement;
var popupContainerElement;
var canvasElement;
var editArray;
var edge;
var mouseOverElement;
var selectedElement;
var descriptionElement;
var descriptionTable;
var detailTemplate;
var title;

var globalJSON = {"mainObjects": [], "edges": [], "details": [], "title" : ""}; // the workflow elements and edges and details and title

var saved; //stores the boolean in which the workflow was exported or not


//Helpers for the canvas zoom functions
var slider;
var currentScale;
var minScale;
var maxScale;
var sketchCache;
var step;

/*
	 Called when body is initialized
	 
	 TO DO: FIX ZOOM
		 MAYBE ADD ERROR CATCHING
		make anchor into buttons and not refresh all the time
*/
function initialize() {
	
	localStorage.setItem("globalJSON", JSON.stringify(globalJSON)); //maps tuple of two lists (main Objects and edges)

	assetAppElement = Polymer.dom(this.root).querySelector("asset-app"); //adds asset-app as a field

	//adds popup element as field
	popupElement = Polymer.dom(assetAppElement.root).querySelector("#popup");
	popupContainerElement = Polymer.dom(assetAppElement.root).querySelector("#popupContainer");

	canvasElement = Polymer.dom(assetAppElement.root).querySelector("#workflowSketchCanvas"); // the canvas added

	mouseOverElement = null;
	selectedElement = null; // element that is currently selected
	sourceJSON = null;
	currentElement = null;

	edge = null;
	
	descriptionElement = Polymer.dom(assetAppElement.root).querySelector("#descriptionSection"); //description section added
	descriptionTable = Polymer.dom(assetAppElement.root).querySelector("#table");
	detailTemplate = [
			{name: 'Name', detail: 'WorkflowElement'},
			{name: 'Description', detail: 'Workflow description'},
			{name: 'Author', detail: 'Jeffrey'},
		];
	
	//canvas container: adds the canvas so it doesnt expand and stuff
    var canvasholder = Polymer.dom(assetAppElement.root).querySelector("#canvasContainerSection");
    canvasElement.width = canvasholder.offsetWidth;
    canvasElement.height = canvasholder.offsetHeight;
	
	//this is zoom stuff just saving all the properties of the slider so we dont have to keep accessing it
	slider = Polymer.dom(assetAppElement.root).querySelector("#sizeSlider");
	currentScale = slider.immediateValue;
	minScale = slider.min;
	maxScale = slider.max;
	step = slider.step;

	title = Polymer.dom(assetAppElement.root).querySelector("#title");
	globalJSON["title"] = title.innerHTML; //saves the title
	
	exportAnchorElement = Polymer.dom(assetAppElement.root).querySelector("#exportAnchor"); //adds export button as a field
	exportAnchorElement.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(localStorage.getItem("globalJSON"))); // returns the workflow file and the globalJSON
	exportAnchorElement.download = globalJSON["title"] + ".json"; //sets download name to title

	//for saving and warnings
	saved = true;
	window.onbeforeunload = function() {
		if (!saved){
			return "Data will be lost if you leave the page, are you sure?";
		}
	};

	//to load the images
	eventFire((Polymer.dom((Polymer.dom(assetAppElement.root).querySelector("#elementsSelect")).root).querySelector("[id='Tasks Catagories']")), 'click'); 
	eventFire((Polymer.dom((Polymer.dom(assetAppElement.root).querySelector("#elementsSelect")).root).querySelector("[id='EarthCubeTools']")), 'click');
	
	Polymer.dom(assetAppElement.root).querySelector("#populateDetailsSection").innerHTML = "";

	//helpers for delete press
	canvasElement.tabIndex = 1000;
	canvasElement.style.outline = "none";
	window.addEventListener("keydown", buttonPressed);
}

/*
	Called when the title loses focus or pressed enter 

	Saves the title to globalJSON and download file
*/
function saveTitle(e) {
	if (globalJSON["title"] != title.innerHTML) {
		globalJSON["title"] = title.innerHTML;
		exportAnchorElement.download = globalJSON["title"] + ".json";
		localStorage.setItem("globalJSON", JSON.stringify(globalJSON));
		exportAnchorElement.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(localStorage.getItem("globalJSON")));
		saved = false;
	}
}

/*
	Prevents alert from showing
	Called when the download button is clicked
*/
function downloaded(e) {
	saved = true;
}

/*
	zooms in the canvas and moves the slider to appropriate place

	Also im thinking of adding a cache for the result canvas so people dont lag too hard if scrolling is spammed this is of lesser priority
*/
function zoomIn() {
	//decreases the value of the slider and saves the value
	slider.decrement();
	currentScale = slider.immediateValue;
}

/* 
	zooms out the canvas
	see zoomIn()
*/
function zoomOut() {
	//increases value of the slider
	slider.increment();
	currentScale = slider.immediateValue;
}

/*
	displays the popup that says popupText at X, Y
	
	TODO: maybe center better and make popup less fat
*/
function displayPopup(popupText, clientX, clientY) {
	try {
		popupElement.style.visibility = "visible";
		popupElement.innerHTML = popupText;

        if (clientX === null) {
            console.log("function displayPopup bad args");
        } else {
		    popupContainerElement.style.left = clientX + "px";
            popupContainerElement.style.top = clientY + "px";
        }
    } catch(err) {
		console.log("Could not Display popup : " + err.message);
	}
}

/*
	hides popup
*/
function closePopup() {
	popupElement.style.visibility = "hidden";
}

/*
	prevents wierd stuff from happening
*/
function allowDrop(e) {
	e.preventDefault();
}

/*
	Called When the canvas is clicked
	Checks for things (delete edge), set selectedElement, displays description table
*/
var selected = false;
function canvasClick(e) {
	//get coordinates of the click
	title.blur();
	var rect = canvasElement.getBoundingClientRect();
	var x = e.clientX - rect.left; 
	var y = e.clientY - rect.top;

	//loop through the workflow elements
	var g = globalJSON;
	for (var i = 0; i < g.mainObjects.length; i++) {

		var element = g.mainObjects[i]; //the current element

		if( (x >= (element.startX - 4) / currentScale && x <= (element.endX + 4) / currentScale ) && ( y >= (element.startY - 4) / currentScale && y <= (element.endY + 4) / currentScale ) ) { // checks if click was in bounds of the element
			selectedElement = element.id; //sets the currently selected element to be this element

			if (edge != null && edge != selectedElement) { //check if the edge exists already
				if (checkIfExists()) {
					return;
				}
				globalJSON.edges.push([edge, selectedElement]);
				if (checkIfCycleExists()) {
					alert("You created a cycle!");
					globalJSON.edges.pop();
				}
				edge= null;
			}
			
			//if (selected == true) {
			//	break;
			//}
			selected = true;
			descriptionTable.style.visibility = "visible";
			descriptionTable.editName(element.name);
			descriptionTable.loadDetails(globalJSON.details[i]);

			drawToCanvas(g); //redraw everything but highlight element
			return;
		}
	}
	resetTable();
	selectedElement = null; //deselect element
	currentElement = null;
	edge = null;
	drawToCanvas(g); //draw that

	//JS SO DUMB WTF I CANT BELIEVE I HAVE TO DO THIS
	//if (selected == true) {
	//	selected = false;
	//	setTimeout(() => canvasClick(e), 10);
	//}
}
/*
	Creates copy of template description
*/
function newTemplate() {
	var newInstance = JSON.parse(JSON.stringify(detailTemplate));
	return newInstance;
}

/*
	Clear table and reset it
*/
function resetTable() {
	descriptionTable.clear();
	descriptionTable.style.visibility = "hidden";
}

/*
	Called when object is dropped into the canvas

	TODO: minor bug: if something not an object is dragged then the thing bugs out
	implement stacking
*/
function drop(e) {

	//setup variables
	var rect = canvasElement.getBoundingClientRect();

	var ctx = canvasElement.getContext("2d");
	
	var src = localStorage.getItem("currentDragElement"); //currently dragged element
	
	//create new image object and set it as src
	var imgElement = new Image();
	imgElement.src = src;

	//width and height of original src
	var w = imgElement.width;
	var h = imgElement.height;        

	//width and height of new image (keeping same aspect ratio of the old), scale it to height of scalingNum
	var scalingNum = 75;
	w = scalingNum * w /h;
	h = scalingNum;
	imgElement.height = h + "px";
	imgElement.width = w + "px";

	//getting the bounds of the image
	var startX = e.clientX - rect.left - parseInt(w/2);
	var startY = e.clientY - rect.top - parseInt(h/2);
	var endX = startX + w;
	var endY = startY + h;

	var index = checkifOverlapping(startX, startY, endX, endY);//check if overlapping

	var activeWorkflowElement = JSON.parse(localStorage.getItem("activeWorkflowElement")); //The current set of workflow diagrams that is being used ex: "common tasks" and "earthcube tools"

	var newElement = {"id": "d"+(new Date()).getTime(), "name": "", "imageSource": "", "properties": [], "startX": startX, "startY": startY, "endX": endX, "endY": endY}; //create new element

	//finds which element the currently dragged element adds fields to the new Element
	for( var i = 0; i < activeWorkflowElement.elements.length; i++) {
		if( activeWorkflowElement.elements[i].imageSource == src ) {
			newElement.name = activeWorkflowElement.elements[i].elementName; //saves name
			newElement.imageSource = src; //saves image
			
			//saves properties
			for (var j = 0; j < activeWorkflowElement.elements[i].properties.length; j++) {
				var value = null;

				if(activeWorkflowElement.elements[i].properties[j].propertyType == "Number") {
					value = 0;
				} else if(activeWorkflowElement.elements[i].properties[j].propertyType == "Boolean") {
					value = "false";
				} else {
					value = "";
				}

				newElement.properties.push({"propertyName": activeWorkflowElement.elements[i].properties[j].propertyName, "propertyType": activeWorkflowElement.elements[i].properties[j].propertyType, "propertyValue": value});
			}
		}
	}

	if( index == -1) { // if not overlapping with other element
		globalJSON.mainObjects.push(newElement); //pushed into mainobjects
		globalJSON.details.push(newTemplate());
		
		//draws the image to the canvas
		ctx.drawImage(imgElement, startX/currentScale, startY/currentScale, w/currentScale, h/currentScale);

	} else {
	}

	//replace old globalJSON and download link
	localStorage.setItem("globalJSON", JSON.stringify(globalJSON));

	exportAnchorElement.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(localStorage.getItem("globalJSON")));

	saved = false;
}

function getWorkflowElementById(id) {
	for(var i = 0; i < globalJSON.mainObjects.length; i++) {
		if (globalJSON.mainObjects[i].id === id) {
			return globalJSON.mainObjects[i];
		}
	}
}

/*
	Puts the workflow elements onto the bottom toolbar
	called when and activeWorkflowElement Button is pressed
*/
function populateWorkflowElementsDetail(workflowElementsDetail) {

	var populateWorkflowElementsDetailElement = Polymer.dom(assetAppElement.root).querySelector("#populateDetailsSection");
	populateWorkflowElementsDetailElement.innerHTML = workflowElementsDetail;

}

/*
	returns -1 if false or error

	returns i (index of first element overlapped if true)
*/
function checkifOverlapping(sx, sy, ex, ey) {

	try {

		for(var i = 0; i < globalJSON.mainObjects.length; i++) {

			var overlapValue = isOverlap(sx, sy, ex, ey, globalJSON.mainObjects[i].startX, globalJSON.mainObjects[i].startY, globalJSON.mainObjects[i].endX, globalJSON.mainObjects[i].endY);
			
			if( overlapValue == true )
				return i;

		}

		return -1;

	} catch(err) {
		
		return -1;
	}
}

/*
	returns true if there is overlap
*/
function isOverlap(sx1, sy1, ex1, ey1, sx2, sy2, ex2, ey2) {
    return ( !( ey1 < sy2 || sy1 > ey2 || ex1 < sx2 || sx1 > ex2 ) );
}

function drawToCanvas(js) {

	try {
		
		var ctx = canvasElement.getContext('2d');
		var indexDictionary = {};

		ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

		for(var i = 0; i < js.mainObjects.length; i++) {

			var mainObject = js.mainObjects[i];

			indexDictionary[mainObject.id] = i;

			ctx.beginPath();
			if( selectedElement == mainObject.id ) {
				if (edge == selectedElement) {
					ctx.strokeStyle="orange";
					ctx.fillStyle="orange";
					ctx.fillRect((mainObject.startX - 5) / currentScale , (mainObject.startY - 5) / currentScale, (mainObject.endX - mainObject.startX + 10)/currentScale, (mainObject.endY - mainObject.startY + 10)/currentScale);
					ctx.fillStyle="black";
				} else {
					ctx.strokeStyle = "green";
					ctx.fillStyle="green";
					ctx.fillRect((mainObject.startX - 5) / currentScale , (mainObject.startY - 5) / currentScale, (mainObject.endX - mainObject.startX + 10)/currentScale, (mainObject.endY - mainObject.startY + 10)/currentScale);
					ctx.fillStyle="black";
				}
			} else {
				ctx.strokeStyle="black";
			}

			 	var imgElement = new Image();
			 	imgElement.src = mainObject.imageSource;

			 	ctx.drawImage(imgElement, mainObject.startX/currentScale, mainObject.startY/currentScale, (mainObject.endX - mainObject.startX)/currentScale, (mainObject.endY - mainObject.startY)/currentScale);
			

		}
		
		for(var i = 0; i < js.edges.length; i++) {

			drawEdge(getWorkflowElementById(js.edges[i][0]),getWorkflowElementById(js.edges[i][1]));
		} 

	} catch(err) {
	 	console.log("Could not draw onto canvas : " + err.message);
	}

}

function importWorkflow(e) {

	try {

		var importText = "<center>Import Workflow Sketch</center><br><input type='file' id='fileToLoad' accept='application/json'><br><button onclick='loadWorkflowSketch()'>Load Workflow</button>";

		displayPopup(importText, e.clientX, e.clientY - 10);

	} catch(err) {
		alert("Could not import workflow sketch : " + err.message);
	}
}

function loadWorkflowSketch() {

	try {

		var uploadFileElement = Polymer.dom(assetAppElement.root).querySelector("#fileToLoad").files[0];
		var fileReader = new FileReader();

		fileReader.onload = function(fileLoadedEvent) {
			var textFromFileLoaded = fileLoadedEvent.target.result;
			globalJSON = JSON.parse(textFromFileLoaded);
			closePopup();
			
			//setting download link
			localStorage.setItem("globalJSON", JSON.stringify(globalJSON));
			exportAnchorElement.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(localStorage.getItem("globalJSON")));

			Polymer.dom(assetAppElement.root).querySelector("#title").innerHTML = globalJSON["title"]; //title change
			exportAnchorElement.download = globalJSON["title"] + ".json"; //download name set to the new one
			canvasClick(fileLoadedEvent); //simulates click in the canvas not on an element to reset all the variables
			selected = false;
		};
	  
		fileReader.readAsText(uploadFileElement, "UTF-8");

	} catch(err) {
		alert("Cannot load Workflow from invalid JSON : " + err.message);
	}

}

var canvasDragElement = null;
var originalDragElement = null;

function mouseDownFunction(e) {
	try {
		var g = globalJSON;
		var x = e.clientX - canvasElement.getBoundingClientRect().left;
		var y = e.clientY - canvasElement.getBoundingClientRect().top;
		for (var i = 0; i < g.mainObjects.length; i++) {
		
			if( (x >=( g.mainObjects[i].startX - 4)/currentScale && x <= (g.mainObjects[i].endX + 4)/currentScale ) && ( y >= (g.mainObjects[i].startY - 4)/currentScale && y <= (g.mainObjects[i].endY + 4)/currentScale ) ) {

				canvasDragElement = {"element": g.mainObjects[i], "offsetX": (e.clientX - g.mainObjects[i].startX), "offsetY": (e.clientY - g.mainObjects[i].startY)};
				originalDragElement = JSON.parse(JSON.stringify(g.mainObjects[i]));
				return;

			}
		}

		canvasDragElement = null;
		
	} catch(err) {
		canvasDragElement = null;
		console.log("Could not start drag : " + err.message);
	}
}

function mouseMoveFunction(e) {
	try {

		if( canvasDragElement == null ) {
			mouseOverElement = null;

		} else {
			var g = globalJSON;
			var xDifference = canvasDragElement.element.startX ;
			var yDifference = canvasDragElement.element.startY;

			canvasDragElement.element.startX = e.clientX - canvasDragElement.offsetX;
			canvasDragElement.element.startY = e.clientY - canvasDragElement.offsetY;

			xDifference =  canvasDragElement.element.startX - xDifference;
			yDifference = canvasDragElement.element.startY - yDifference;

			canvasDragElement.element.endX += xDifference;
			canvasDragElement.element.endY += yDifference;

			setTimeout(() => function() {
				canvasDragElement.element.startX += xDifference;
				canvasDragElement.element.endX += xDifference;
				canvasDragElement.element.startY += yDifference;
				canvasDragElement.element.endY += yDifference;
			}, 30);
			
			drawToCanvas(globalJSON);
			localStorage.setItem("globalJSON", JSON.stringify(g));
			exportAnchorElement.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(localStorage.getItem("globalJSON")));

		}

	} catch(err) {
		console.log("Failed to drag : " + err.message);
	}
}

function mouseUpFunction(e) {

	try {

		if( canvasDragElement == null )
			return;

		if( canvasDragElement.element.startX == originalDragElement.startX && canvasDragElement.element.endX == originalDragElement.endX && canvasDragElement.element.startY == originalDragElement.startY && canvasDragElement.element.endY == originalDragElement.endY ) {
			canvasDragElement = null;
			return;
		}

		for( var i = 0; i < globalJSON.mainObjects.length; i++ ) {

			if( globalJSON.mainObjects[i].id == canvasDragElement.element.id )
				continue;

			if( isOverlap(canvasDragElement.element.startX, canvasDragElement.element.startY, canvasDragElement.element.endX, canvasDragElement.element.endY, globalJSON.mainObjects[i].startX, globalJSON.mainObjects[i].startY, globalJSON.mainObjects[i].endX, globalJSON.mainObjects[i].endY) == true) {
				for( var j = 0; j < globalJSON.mainObjects.length; j++ ) {
					if( globalJSON.mainObjects[j].id == canvasDragElement.element.id ) {
						globalJSON.mainObjects[j] = originalDragElement;
						canvasDragElement = null;
						localStorage.setItem("globalJSON", JSON.stringify(globalJSON));
						exportAnchorElement.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(localStorage.getItem("globalJSON")));
						drawToCanvas(globalJSON);
						return;
					}
				}
			}	
		}
		canvasDragElement = null;

	} catch(err) {

		alert("Could not move element : " + err.message);
	}
}