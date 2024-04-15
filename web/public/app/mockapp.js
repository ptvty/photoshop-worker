var api_url = '../api/mocks';

$(function(){

initDataLoad(api_url);


$('.designs_table tbody').on('click', '.btn_view', function(e) {
    var id = $(this).parents('tr').data('id');
    showMockModal(id);
})

$('.designs_table tbody').on('click', '.btn_proccess', function(e) {
    var id = $(this).parents('tr').data('id');
	var url = api_url + '/' + id;
    $.ajax({
        type:'PATCH',
        url: url,
		data: { do_proccess_psd: 'true' }
	});
})

$("#uploadbutton").click(function(e) {

    $('#uploadform .submit-btn').click();
    e.preventDefault();

});


$('#inputpsdfile').change(function (e) {
	var fname = $(this).val().match(/^.*?([^\\/.]*)[^\\/]*$/)[1];
	var nameEl = $('#inputdname');
	if (nameEl.val() == '')
		nameEl.val(fname);
    //$("#uploadform").submit();
 });

$('#uploadform').submit(function(e) {

    $('#uploadform').toggle();
    $('#uploadprogress-container').toggle();
    $("#uploadbutton").attr('disabled', 'true');
    e.preventDefault();
    var formData = new FormData(this);
    var postUrl = api_url;
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
            if (data.ok == false) {
                alert(data.status);
                $('#uploadform').toggle();
                $('#uploadprogress-container').toggle();
                $("#uploadbutton").removeAttr('disabled');
            } else {
                $('#uploadprogress-container .progress-bar').removeClass('progress-bar-animated');
                $('#processprogress-container').toggle();
                processProgress(data.id);
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

function processProgress(designId) {
    processprogressbar = $('#processprogress-container .progress-bar');
    console.log(processprogressbar.width())
    processprogressbar.css('width', processprogressbar.width() + 12);
    setTimeout(function() {
        var url = api_url + "/" + designId

        $.ajax({
            type:'GET',
            url: url,

            cache:false,
            contentType: false,
            processData: false,

            success:function(data){
                console.log(data);
                if (data.layer_tree == null) {
                    processProgress(designId);
                } else {
                    processprogressbar.css('width', '100%');
                    $('#exampleModal').modal('hide');
                    showMockModal(designId);
                }

            },

            error: function(data){
                console.log(data);
            }
        });
    }, 7000);
}


function render(data) {
    tbl = $('.designs_table');
    tr = $('.designs_table tbody tr');
    $(data).each(function(i,d) {
        var row = tr.clone();
        row.data('id', d.id);
        row.find('.td_id').html(d.id);
        row.find('.td_title').html(d.title);
        row.find('.td_file_name').html(d.file_name);
        row.find('.thumb').attr('src', '../download/'+d.data_json.thumb_dir);
        row.show();
        tbl.find('tbody').append(row);
    })
    tbl.show();
}


var initDataLoad = function(api_url) {
    $.ajax({
        type:'GET',
        url: api_url,
    
        cache:false,
        contentType: false,
        processData: false,
    
        success:function(data){
            console.log(data);
            render(data.result);
            $('.initialprogress').hide();
    
    
        },
    
        error: function(data){
            console.log(data);
        }
    });
};

var showMockModal = function(mockId) {
    $('#mockModal').modal('show');
    $('#mockModal').find('form').hide();
    $('#mockModal').find('.progress-bar').show();
    $('#mockModal').find('.btn-save').off().on('click', function() {
        saveMockModal(mockId)
    });
    $.ajax({
        type:'GET',
        url: api_url + '/' + mockId,
    
        cache:false,
        contentType: false,
        processData: false,
    
        success:function(data){
            console.log(data);
            $('#mockModal input').val(data.title);
            var smartSelectEl = $('#mockModal select');
            smartSelectEl.empty();
            var smartObjects = (data.data_json)?data.data_json.smart_layers:[] ;
            $(smartObjects).each(function(i,v){
                $('<option>').attr('value', i).html(v.name).appendTo(smartSelectEl);
            });
            $('#mockModal').find('.progress-bar').hide();
            $('#mockModal').find('form').show();
            smartSelectEl.val(data.data_json.default_smart_layer);
        },
    
        error: function(data){
            console.log(data);
        }
    });
    
}

var saveMockModal = function (mockId) {
    var url = api_url + "/" + mockId;
    var title = $('#mockModal input').val();
    var default_smart_layer = $('#mockModal select').val();
    $.ajax({
        url: url,
        method: "PATCH",
        data: {
            title: title,
            default_smart_layer: default_smart_layer
        },
        complete: function() {
            $('#mockModal').modal('hide');
        }
    })
}