#include "C:\\projects\\photoshop-worker\\worker\\JSX\\json2.js";
#include "C:\\projects\\photoshop-worker\\worker\\JSX\\json2.js";

//https://github.com/buraktamturk/adobe-javascript-http-client
#include "C:\\projects\\photoshop-worker\\worker\\JSX\\http.jsx";

// Array.isArray shim
if (typeof Array.isArray === 'undefined') {
  Array.isArray = function(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  }
};

///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////

var helper = {};

///////////////////////////////////////////////////////////////////////

helper.getJob = function getJob(url) {
	var data = $http({
		method: 'GET',
		forcejson: true,
		url: url
	});
	return data;
};

///////////////////////////////////////////////////////////////////////

helper.postOutput = function postOutput(url, payload) {
	var res = $http({
		method: 'POST',
		forcejson: false,
		url: url,
		payload: payload
	});
	return res;
};

///////////////////////////////////////////////////////////////////////

helper.taskLayerTree = function taskLayerTree(doc) {
	var layers = doc.layers;
	var tree = [];
	for (var layerIndex = 0; layerIndex < layers.length; layerIndex++) {
		var layer = layers[layerIndex];
		var node = {
			name: layer.name,
			type: layer.typename
		};
		if (layer.typename === 'LayerSet') {
			node.layers = helper.taskLayerTree(layer);
		}
		if (layer.kind) {
			node.kind = layer.kind.toString();
		}
		tree.push(node);
	}
	return tree;
};

///////////////////////////////////////////////////////////////////////

helper.getLayerByIndexArray = function(doc, indexArray) {
	var layer = doc;
	for(var i = 0; i < indexArray.length; i++) {
		layer = layer.layers[indexArray[i]];
	}
	return layer;
};

///////////////////////////////////////////////////////////////////////

helper.taskSmartReplace = function taskSmartReplace(doc, to, fromFileDir) {
	try {
		var layerTo = helper.getLayerByIndexArray(doc, to);
	} catch (e) {
		return false; // layers index out of range
	}
	if (layerTo.kind != "LayerKind.SMARTOBJECT") {
		return false; // layer not a smart object
	}
	helper.replaceContents(fromFileDir, layerTo);
};

///////////////////////////////////////////////////////////////////////

// Replace SmartObject Contents
// https://gist.github.com/laryn/0a1f6bf0dab5b713395a835f9bfa805c
helper.replaceContents = function replaceContents(newFile, theSO) {
    app.activeDocument.activeLayer = theSO;
    // =======================================================
    var idplacedLayerReplaceContents = stringIDToTypeID("placedLayerReplaceContents");
    var desc3 = new ActionDescriptor();
    var idnull = charIDToTypeID("null");
    desc3.putPath(idnull, new File(newFile));
    var idPgNm = charIDToTypeID("PgNm");
    desc3.putInteger(idPgNm, 1);
    executeAction(idplacedLayerReplaceContents, desc3, DialogModes.NO);
    return app.activeDocument.activeLayer;
};

///////////////////////////////////////////////////////////////////////

helper.taskSmartReplaceResized = function taskSmartReplaceResized(doc, to, fromFileDir, resizeMode) {
	try {
		var layerTo = helper.getLayerByIndexArray(doc, to);
	} catch (e) {
		return false; // layers index out of range
	}
	if (layerTo.kind != "LayerKind.SMARTOBJECT") {
		return false; // layer not a smart object
	}
	helper.replaceContentsResized(fromFileDir, layerTo, doc, resizeMode);
};

///////////////////////////////////////////////////////////////////////

helper.replaceContentsResized = function replaceContentsResized(fromFileDir, theSO, doc, resizeMode) {
    app.activeDocument.activeLayer = theSO;
    // =======================================================
	// open so
	app.runMenuItem(stringIDToTypeID('placedLayerEditContents'));
	var docSO = app.activeDocument;
	try {
		app.open( new File( fromFileDir ) );
		var docFrom = app.activeDocument;
		docFrom.layers[0].duplicate(docSO);
	} catch (e) {
		return false;
	}
	if (!config.debugDontClose) {
		docFrom.close(SaveOptions.DONOTSAVECHANGES);
	}
	app.activeDocument = docSO;
	helper.resizeLayer(docSO, docSO.activeLayer, resizeMode);
	docSO.save();
	
	if (!config.debugDontClose) {
		docSO.close(SaveOptions.DONOTSAVECHANGES);
	}
    return true;
};

///////////////////////////////////////////////////////////////////////

helper.resizeLayer = function resizeLayer(doc, layer, resizeMode) {

	var layerWidth  = layer.bounds[2]-layer.bounds[0];
	var layerHeight = layer.bounds[3]-layer.bounds[1];
	//var layerHeight = layer.bounds[2]-layer.bounds[0];
	//var layerWidth  = layer.bounds[3]-layer.bounds[1];
	layerHeight = layerHeight.toString().replace(' px', '');
	layerWidth  = layerWidth.toString().replace(' px', '');
	var docHeight = doc.height.toString().replace(' px', '');
	var docWidth  = doc.width.toString().replace(' px', '');
	if (resizeMode == null || resizeMode == 'stretch') {
		layer.translate(docWidth/2-layerWidth/2,docHeight/2-layerHeight/2);
		var widthPercent = docWidth/layerWidth*100;
		var heightPercent = docHeight/layerHeight*100;
		var anchor = AnchorPosition.MIDDLECENTER;
		layer.resize(widthPercent, heightPercent, anchor);
	}
	if (resizeMode == 'fit' || resizeMode == 'fill') {
		var layerRatio = layerHeight / layerWidth;
		var docRatio  = doc.height / doc.width;
		if ( (resizeMode == 'fit' && layerRatio > docRatio) || (resizeMode == 'fill' && layerRatio < docRatio) ) {
			var height = docHeight;
			var width  = docHeight / layerRatio;
		} else {
			var width  = docWidth;
			var height = docWidth * layerRatio;
		}
		layer.translate(docWidth/2-layerWidth/2,docHeight/2-layerHeight/2);
		var widthPercent = width/layerWidth*100;
		var heightPercent = height/layerHeight*100;
		var anchor = AnchorPosition.MIDDLECENTER;
		layer.resize(widthPercent, heightPercent, anchor);
	}
	if (resizeMode == 'center') {
		layer.translate(docWidth/2-layerWidth/2,docHeight/2-layerHeight/2);
	}	
	if (resizeMode == 'tile') {
		layer.translate(-layer.bounds[0],-layer.bounds[1]);
		var rows = Math.ceil(docHeight / layerHeight);
		var cols = Math.ceil(docWidth / layerWidth);
		for (var row = 0; row < rows; row++) {
			for (var col = 0; col < cols; col++) {
				var newLayer = layer.duplicate();
				layerX = col * layerWidth;
				layerY = row * layerHeight;
				newLayer.translate(layerX, layerY);
			}
		}
	}

};

///////////////////////////////////////////////////////////////////////

helper.resizeImageDEPERICATED = function resizeImage(doc, height, width, resizeMode) {
	var fWidth = height;
	var fHeight = width;
	if (resizeMode == null || resizeMode == 'stretch') {
		doc.resizeImage(UnitValue(fHeight,"px"), UnitValue(fWidth,"px"), null, ResampleMethod.BICUBIC);
	}
	if (resizeMode == 'fit') {
		doc.resizeImage(UnitValue(fWidth,"px"), UnitValue(fHeight,"px"), null, ResampleMethod.BICUBIC);
	}
	if (resizeMode == 'fill') {
		doc.resizeImage(UnitValue(fWidth,"px"), UnitValue(fHeight,"px"), null, ResampleMethod.BICUBIC);
	}
	if (resizeMode == 'tile') {
		// needs no resize handled in caller
	}
	if (resizeMode == 'center') {
		// needs no resize handled in caller
	}
};

///////////////////////////////////////////////////////////////////////

helper.saveJpeg = function saveJpeg(doc, outputDir, quality) {
	// our web export options
	var options = new ExportOptionsSaveForWeb();
	options.quality = quality;
	options.format = SaveDocumentType.JPEG;
	options.optimized = true;
	doc.exportDocument(File(outputDir),ExportType.SAVEFORWEB,options);
};

///////////////////////////////////////////////////////////////////////

helper.saveJpg = function saveJpeg(doc, outputDir, quality) {
	var saveFile = new File(outputDir);
	var saveOptions = new JPEGSaveOptions();
	saveOptions.embedColorProfile = true;
	saveOptions.formatOptions = FormatOptions.STANDARDBASELINE;
	saveOptions.matte = MatteType.NONE;
	saveOptions.quality = quality;
	doc.saveAs(saveFile, saveOptions, true, Extension.LOWERCASE);
};

///////////////////////////////////////////////////////////////////////

helper.savePsd = function savePsd(doc, outputDir) {
	var saveFile = new File(outputDir);
	var saveOptions = new PhotoshopSaveOptions();
	saveOptions.alphaChannels = false;
	saveOptions.annotations = false;
	saveOptions.embedColorProfile = true;
	saveOptions.layers = true;
	saveOptions.spotColors = false;
	doc.saveAs(saveFile, saveOptions, true, Extension.LOWERCASE);
};

///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////

var config = {
	debugMode: false,
	debugDontClose: false,
	dirBase:   "",
	dirOutputs: "",
	dirInputs:  "",
};

///////////////////////////////////////////////////////////////////////

if (config.debugMode) {
		
} else {
	app.displayDialogs = DialogModes.NO;  
}

function main(args) {
	var performanceStart = new Date();
	
	if (args.length < 2) {
		return 'ERR:1:insufficient parameters passed to script, expected serverUrl and jobId';
	}

	var serverUrl = args[0];
	var jobId = args[1];
	var getJobUrl = serverUrl + '/get-job/' + jobId;
	try {
		var job = helper.getJob(getJobUrl).payload;
	} catch (e) {
		return 'ERR:3:could not get or json parse job detail : ' + getJobUrl + e;
	}
	if (typeof job === 'undefined' || job === null) {
		return 'ERR:2:job detail invalid';
	}	
	if (!job.input || !job.input.recipe) {
		return 'ERR:41:missing required job input payload';
	}
	var recipe = job.input.recipe;
	if (!recipe.tasks || !recipe.base) {
		return 'ERR:4:missing required recipe properties';
	}
	
	if (!job.input.config || !job.input.config.dirInputs || !job.input.config.dirOutputs) {
		return 'ERR:42:missing job config';
		// override currnet config for (configKey in recipe.config) config[configKey] = recipe.config[configKey]
	}
	config.dirInputs = job.input.config.dirInputs;
	config.dirOutputs = job.input.config.dirOutputs;
	
	var baseFileDir = config.dirInputs + '\\' + recipe.base;
	try {
		app.open( new File( baseFileDir ) );
	} catch (error) {
		return 'ERR:45:can not open base file:' + baseFileDir;
	}
	var doc = app.activeDocument;


	var tasks = recipe.tasks;
	if (!Array.isArray(tasks)) {
		return 'ERR:5:recipe tasks not an array';
	}
	for (taskIndex in tasks) {
		var task = tasks[taskIndex];
		var taskInfo = 'taskIndex ' + taskIndex + ', jobId ' + jobId + '.';
		if (!task.type) {
			return 'ERR:6:malformed recipe task. ' + taskInfo;
		}
		
		if (task.type === 'smart_replace') {
			if (!task.from || !task.to) {
				return 'ERR:7:task params insufficient, smart_replace needs from and to. ' + taskInfo;
			}
			var fromFileDir = config.dirInputs + '\\' + task.from;
			var taskResult = helper.taskSmartReplace(doc, task.to, fromFileDir);
			if (taskResult === false) {
				return 'ERR:8:task smart_replace failed. ' + taskInfo;
			}
		}

		if (task.type === 'smart_replace_resized') {
			if (!task.from || !task.to) {
				return 'ERR:9:task params insufficient, smart_replace_resized needs from and to. ' + taskInfo;
			}
			var resizeMode = (task.resizeMode) ? task.resizeMode : null;
			var fromFileDir = config.dirInputs + '\\' + task.from;
			var taskResult = helper.taskSmartReplaceResized(doc, task.to, fromFileDir, resizeMode);
			if (taskResult === false) {
				return 'ERR:10:task smart_replace_resized failed. ' + taskInfo;
			}
		}

		if (task.type === 'layer_tree') {
			var taskResult = helper.taskLayerTree(doc);
			if (taskResult === false) {
				return 'ERR:11:task layer_tree failed. ' + taskInfo;
			} else {
				var updateUrl = serverUrl + '/update-job/' + jobId + '?update=layer_tree';
				helper.postOutput(updateUrl, taskResult)
			}
		}

		// in case base doc lost focus
		app.activeDocument = doc;
	}
	
	// save to outputs
	for (outputIndex in recipe.outputs) {
		var output = recipe.outputs[outputIndex];
		if (!output.type || !output.fileName) {
			return 'ERR:21:output type or fileName invalid';
		}
		var fileName = config.dirOutputs + '\\' + output.fileName;
		if (output.type === 'jpg') {
			var quality = (output.quality) ? output.quality : 10;
			helper.saveJpg(doc, fileName, quality);
		}
		if (output.type === 'psd') {
			helper.savePsd(doc, fileName);
		}
	}

	if (!config.debugDontClose) {
		doc.close(SaveOptions.DONOTSAVECHANGES);
	}
	
	var performanceEnd = new Date(); 
	var performance = performanceEnd - performanceStart;
	return "OKY:1:took " + performance;
}
