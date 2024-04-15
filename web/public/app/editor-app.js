var designModel;
var zoom;
var drag = {};
var viewport;
var selectedLayerId;

$(function(){

// var textrenderTimer = setInterval(function () {
//     // console.log('tick')
//     $(designModel.layers).each(function (i, l) {
//         console.log(l.pending_textrender_id);
//         // if (l.pending_textrender_id > 0 ) {
//             ajaxCheckTextrender(l.pending_textrender_id, textrenderTimer);
//         // }
//     })
// }, 2000);

var hash = window.location.hash.substring(1); 
var api_url = '../api/v0/design/get-design/' + hash

$.ajax({
    type:'GET',
    url: api_url,

    cache:false,
    contentType: false,
    processData: false,

    success:function(data){
        console.log(data);
        designModel = data.result.data;
        designModel.id = data.result.id;
        render(designModel, viewport);
    },

    error: function(data){
        console.log(data);
    }
});




// designModel = getDemoDesignModel();

viewport = $('#viewport');

viewport.on('mousedown', onMouseDown);
viewport.on('mouseup', onMouseUp);
// viewport.on('mouseout', onMouseUp);
viewport.on('mousemove', onMouseMove);

$(window).resize(function() {
    render(designModel, viewport);
});

$('#edit_layer_panel #positiontab input').on("change keyup paste", function(){
    editLayerModalOk();
});

$('#edit_layer_panel #texttab #texteditapplybtn').on("click", function(){
    var l = designModel.layers[selectedLayerId];
    var newText = {
        text: $('textarea.layer_text').val(),
        direction: 'rtl',
        kind: 'point',
        font_family: $('input.layer_text_font').val(),
        size: $('input.layer_text_size').val(),
        width: 0,
        align: $('input.layer_text_align').val(),
        color: hexToRgb( $('input.layer_text_color').val() ),
        ttx: l.text.ttx, tty:l.text.tty
    }

    editTextLayerApply(selectedLayerId, newText);
});

})

function render(){
    var d = designModel;
    var zoom = calcZoom();
    console.log('zoom:'+zoom);
    d.w = d.doc_width * zoom;
    d.h = d.doc_height * zoom;
    viewport.css('width', d.w);
    viewport.css('height', d.h);
    var viewportContents = $('<div />');
    var layersContents = $('<div />');
    $(designModel.layers).each(function(e, l){
        

        layersContents.append(renderLayerPanelItem(e,l));

        if (l.visible == false) return;
        var layerDiv = $('<div />', {
            id: 'ca_layer_i_'+e,
            class: 'ca_layer draggable'
        })
        l.w = zoom * l.width
        l.h = zoom * l.height
        l.x = zoom * l.left
        l.y = zoom * l.top
        l.r = (typeof l.r == 'undefined') ? 0 : l.r;
        layerDiv.css('z-index', 99-e);
        layerDiv.css('width', l.w);
        layerDiv.css('height', l.h);
        layerDiv.css('left', l.x);
        layerDiv.css('top', l.y);
        layerDiv.css('transform', 'rotate('+l.r+'deg)');
        layerDiv.css('background-image', 'url(' + l.imageurl + ')');
        layerDiv.data('lid', e);
        // layerDiv.attr('onclick','alert('+e+')');
        layerDiv.on('click', function(){
            // openEditLayerModal(e);
        })
        viewportContents.append(layerDiv);
    })
    viewport.html('');
    viewport.append(viewportContents);
    layerPanel = $('.layers-panel');
    layerPanel.html('');
    layerPanel.append(layersContents);


    // setInteract()


}

function renderLayerPanelItem (e, l) {
    var layerItem = $('<div />', {
        class: 'layer_item'
    })
    // layerItem.html(l.name);
    layerItem.data('lid', e);
    var checkbox = $('<input class="toggle-checkbox" name="visible" type="checkbox">')
    if (l.visible == true)    checkbox.attr('checked', true)
    var label = $('<label class="toggle-checker toggle-checkerV"></label>')
    checkbox.change(function(l){
        designModel.layers[e].visible = $(this).is(":checked");
        l.width = 10;
        render();
    })
    checkbox.attr('id', 'ca_layer_item_' + e)
    label  .attr('for', 'ca_layer_item_' + e)
    layerItem.append(checkbox).append(label);
    var checkbox = $('<input class="toggle-checkbox" name="locked" type="checkbox">')
    if (l.locked == true)    checkbox.attr('checked', true)
    var label = $('<label class="toggle-checker toggle-checkerL"></label>')
    checkbox.change(function(l){
        designModel.layers[e].locked = $(this).is(":checked");
    })
    checkbox.attr('id', 'ca_layer_item_l_' + e)
    label  .attr('for', 'ca_layer_item_l_' + e)
    layerItem.append(checkbox).append(label);
    var checkbox = $('<input class="toggle-checkbox" name="easy" type="checkbox">')
    if (l.easy == true)    checkbox.attr('checked', true)
    var label = $('<label class="toggle-checker toggle-checkerE"></label>')
    checkbox.change(function(l){
        designModel.layers[e].easy = $(this).is(":checked");
    })
    checkbox.attr('id', 'ca_layer_item_e_' + e)
    label  .attr('for', 'ca_layer_item_e_' + e)
    layerItem.append(checkbox).append(label);
    return layerItem.append(l.name);
}

function onMouseDown(e) {
    var el = $(e.target)
    var lid = el.data('lid')
    if (lid==null) return
    var layer = designModel.layers[lid]
    drag = {
        mouseDown: true,
        targetLayerId : lid,
        startX: event.clientX,
        startY: event.clientY,
        layerStartTop: layer.top,
        layerStartLeft: layer.left
    }
    console.log(drag)
    openEditLayerModal(drag.targetLayerId);

}

function onMouseUp(e) {
    drag.mouseDown = false;
}

function onMouseMove(e) {
    if (!drag.mouseDown) return
    console.log(e.clientX)
    var x = event.clientX;
    var y = event.clientY;
    //
    deltaDragX = x - drag.startX 
    deltaDragY = y - drag.startY
    newLeft = drag.layerStartLeft + (deltaDragX / zoom)
    newTop  = drag.layerStartTop  + (deltaDragY / zoom)
    designModel.layers[drag.targetLayerId].left = newLeft
    designModel.layers[drag.targetLayerId].top  = newTop
    // designModel.selectedLayerId
    render()

}


function calcZoom() {
    var realWidth = designModel.doc_width;
    var parentWidth = viewport.parent().width();
    zoom = (parentWidth/realWidth);
    return zoom;
}

function onLayerSelect(argument) {
    // body...
}

function openEditLayerModal(layerIndex) {
    selectedLayerId = layerIndex;
    var l = designModel.layers[layerIndex];
    var pn = $('#edit_layer_panel');
    // alert()
    pn.find('.layer_index').val(layerIndex);
    pn.find('.layer_w').val(l.w);
    pn.find('.layer_x').val(l.x);
    pn.find('.layer_y').val(l.y);
    pn.find('.layer_r').val(l.r);
    if (typeof l.text == 'undefined') {
        $('#ca_text_tab').hide();
        $('#ca_position_tab a').tab('show')
        return;
    } else {        
        $('#ca_text_tab').show();
        $('#ca_text_tab a').tab('show')
        txt = l.text;
        pn.find('.layer_text').val(txt.value);
        pn.find('.layer_text_font').val(txt.font);
        pn.find('.layer_text_size').val(txt.size);
        pn.find('.layer_text_color').val(rgbToHex(txt.color.r,txt.color.g,txt.color.b));
        pn.find('.layer_text_align').val(txt.align);
    }
}

function ajaxCheckTextrender(layer) {
    setTimeout(function() {
        console.log(layer);
        if (layer.pending_textrender_id > 0 ) {
            var textrenderId = layer.pending_textrender_id;
            var api_url = '../api/v0/design/edit-text/textrender/' + textrenderId;
            console.log(api_url);
            $.get(api_url, function (e) {
                // console.log(e);
                // return;
                if (e.result!=null && "imageurl" in e.result) {
                    layer.imageurl = e.result.imageurl;
                    if (layer.text.align=='center') {
                        layer.left = layer.text.ttx - (e.result.width / 2)
                    }
                    if (layer.text.align=='right') {
                        layer.left = layer.text.ttx - e.result.width
                    }
                    if (layer.text.align=='left') {
                        layer.left = layer.text.ttx;
                    }
                    layer.width = e.result.width;
                    layer.height = e.result.height;
                    render();
                    console.log(layer);
        
                } else {
                    ajaxCheckTextrender(layer)
                }
            })
        }
    }, 2000);
}
function editLayerModalOk() {
    var p = $('#edit_layer_panel');
    var layerIndex = p.find('.layer_index').val();
    var l = designModel.layers[layerIndex];
    l.height = (p.find('.layer_w').val() / zoom) * (l.height/l.width)  ;
    l.width = p.find('.layer_w').val() / zoom;
    l.left = p.find('.layer_x').val() / zoom;
    l.top = p.find('.layer_y').val() / zoom;
    l.r = p.find('.layer_r').val();
    render();
}

function editTextLayerApply(layerId, textObject) {
    // var l = {
    //     text: $('textarea.layer_text').val(),
    //     direction: 'rtl',
    //     kind: 'point',
    //     font_family: $('input.layer_text_font').val(),
    //     size: $('input.layer_text_size').val(),
    //     width: 0,
    //     align: $('input.layer_text_align').val(),
    //     color: hexToRgb( $('input.layer_text_color').val() )
    // }

    console.log(textObject)
    // return;
    designModel.layers[layerId].text = textObject
    designModel.layers[layerId].text.font = textObject.font_family
    designModel.layers[layerId].text.value = textObject.text

    var api_url = '../api/v0/design/edit-text/' + designModel.id + '/' + layerId;

    $.ajax({
        type:'POST',
        url: api_url,
        data: JSON.stringify(textObject),
        cache:false,
        contentType: false,
        processData: false,

        success:function(data){
            console.log(data);
            designModel.layers[layerId].pending_textrender_id = data.result.textrender_id;
            ajaxCheckTextrender(designModel.layers[layerId])
        },

        error: function(data){
            console.log(data);
        }
    });

}

function getDemoDesignModel() {
    var text1 = {
        text: 'Hello World',
        align: 'center',
        direction: 'rtl',
        size: 72,
        font: 'IRYekan',
        color: [23,7,200],
        kind: 'point'
    }

    var text2 = {
        text: 'Lorem ipsum dolor sit ammat!',
        align: 'center',
        direction: 'rtl',
        size: 24,
        font: 'IRYekan',
        color: [23,7,200],
        kind: 'bound'
    }

    var layer0 = {
        title: 'image layer',
        width: 500,
        height: 500,
        top: 33,
        left: 340,
        image: '../ly/255/0.png',
        type: 'image'
    }

    var layer1 = {
        title: 'text layer',
        width: 100,
        height: 200,
        top: 330,
        left: 34,
        image: '../ly/255/1.png',
        type: 'text',
        text: text1
    }


    var layer2 = {
        title: 'text layer 2',
        visible: false,
        width: 600,
        height: 350,
        top: 703,
        left: 504,
        image: '../ly/255/2.png',
        type: 'text',
        text: text2
    }

    var designModel = {
        title: 'New Design',
        width: 1450,
        height: 800,
        layers: [
            layer0,
            layer1,
            layer2
        ]
    }

    return designModel;
}

function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}


$(function(){

$("#uploadbutton").click(function(e) {

    $('#uploadform .submit-btn').click();
    e.preventDefault();

});


$("#addtextbutton").click(function(e) {

    $('#uploadform .submit-btn').click();
    var text = {
        text: $('#addtextinput').val(),
        value: $('#addtextinput').val(),
        direction: 'rtl',
        kind: 'point',
        font_family: "Arial",
        font: "Arial",
        size: 48,
        width: 0,
        align: "center",
        ttx: designModel.doc_width/2, tty: 100,
        color: {r: 200, g: 200, b: 200}
    }

    // var text = {
    //     align: "center",
    //     color: {r: 200, g: 200, b: 200},
    //     font: "Arial",
    //     size: 48,
    //     ttx: 5, tty: 5,
    //     value: "..."
    // }
    var layerId = addLayer({
        visible  : true,
        opacity: 1,
        name : $('#addtextinput').val(),
        top: 50,
        blending : "normal",
        left: designModel.doc_width/2,
        text: text,
        imageurl : '...',
        height : 10,
        width : 10
    })
    editTextLayerApply(layerId, text)
    e.preventDefault();

});


$('#uploadform').submit(function(e) {

    $('#uploadform').toggle();
    $('#uploadprogress-container').toggle();
    $("#uploadbutton").attr('disabled', 'true');
    e.preventDefault();
    var formData = new FormData(this);
    var postUrl = $(this).attr('action');
    $.ajax({
        type:'POST',
        url: postUrl,
        data:formData,
        xhr: function() {
                var myXhr = $.ajaxSettings.xhr();
                if(myXhr.upload){
                    myXhr.upload.addEventListener('progress',progress, false);
                }
                return myXhr;
        },
        cache:false,
        contentType: false,
        processData: false,

        success:function(data){
            console.log(data);
            $('#uploadform').toggle();
            $('#uploadprogress-container').toggle();
            $("#uploadbutton").removeAttr('disabled');
            if (data.ok == false) {
                alert(data.status);
            } else {
                // add layer
                addLayer({
                    blending : "normal",
                    visible  : true,
                    top: 50,
                    left: 50,
                    imageurl : '../'+data.file_path,
                    name : data.file_name,
                    height : data.height,
                    width : data.width
                })
                $('#add_layer_modal').modal('hide')
            }

        },

        error: function(data){
            console.log(data);
        }
    });

    e.preventDefault();

});


})

function progress(e){
    if(!e.lengthComputable) return;
    var max = e.total;
    var current = e.loaded;

    var Percentage = (current * 100)/max;
    console.log(Percentage);

    $('#uploadprogress-container .progress-bar').css('width', Percentage+'%');
    $('#uploadprogresspercentage').html(Math.round(Percentage)+'%');

    if(Percentage >= 100)
    {
       // process completed  
    }
}


function addLayer(layer) {
    designModel.layers.unshift(layer)
    render()
    return 0
}