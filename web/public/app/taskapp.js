var api_url = '../api/tasks';
var mocks_api_url = '../api/mocks';

$(function(){

initDataLoad(api_url);


$('.designs_table tbody').on('click', 'tr', function(e) {
    var id = $(this).find('.td_id').html();
    showTaskModal(id);
})



$("#uploadbutton").click(function(e) {

    $('#uploadform .submit-btn').click();
    e.preventDefault();

});


// $('#fileupload').change(function (e) {

//     $("#uploadform").submit();
//     e.preventDefault();

// });

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
                var jobStat = {all:0, done:0};
                $(data.jobs).each(function(i,v) {
                    jobStat.all++;
                    if (v.data!=null) jobStat.done++;
                });
                processprogressbar.css('width', (jobStat.done/jobStat.all)*100+'%');
                if (jobStat.all > jobStat.done) {
                    processProgress(designId);
                } else {
                    $('#exampleModal').modal('hide');
                    showTaskModal(designId);
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
        row.find('.td_id').html(d.id);
        row.find('.td_title').html(d.title);
        row.find('.td_file_name').html(d.file_name);
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
    $.ajax({
        type:'GET',
        url: mocks_api_url,
    
        cache:false,
        contentType: false,
        processData: false,
    
        success:function(data){
            console.log(data);
            $(data.result).each(function(i, v) {
                $('<option>').attr('value', v.id).html(v.title).appendTo('.select-mock')
            })
            $('.select-mock option').mousedown(function(e) {
                e.preventDefault();
                var originalScrollTop = $(this).parent().scrollTop();
                console.log(originalScrollTop);
                $(this).prop('selected', $(this).prop('selected') ? false : true);
                var self = this;
                $(this).parent().focus();
                setTimeout(function() {
                    $(self).parent().scrollTop(originalScrollTop);
                }, 0);
                
                return false;
            });
            
        },
    
        error: function(data){
            console.log(data);
        }
    });
};

var showTaskModal = function(taskId) {
    $('#taskModal').modal('show');
    $('#taskModal').find('table').hide();
    $('#taskModal').find('.progress-bar').show();

    $.ajax({
        type:'GET',
        url: api_url + '/' + taskId,
    
        cache:false,
        contentType: false,
        processData: false,
    
        success:function(data){
            console.log(data);
            $('#taskModal input').val(data.title);
            var tableEl = $('#taskModal table');
            var taskJobs = (data.jobs !== null)?data.jobs:[] ;
			tableEl.empty();
			$('<tr><td>' + 'ZIP' + '</td><td><a href="/" target="_blank"></a></td></tr>')
                    .find('a').attr('href', '../ziptask/'+taskId ).html('Downlaod').parents('tr').appendTo(tableEl);
            $(taskJobs).each(function(i,v){
				if (!v.data) return;
                $('<tr><td>' + v.mock.title + '</td><td><a href="/" target="_blank"></a></td></tr>')
                    .find('a').attr('href', '../download/'+v.data.outputs[0] ).html('Downlaod').parents('tr').appendTo(tableEl);
            });
            $('#taskModal').find('.progress-bar').hide();
            $('#taskModal').find('table').show();
        },
    
        error: function(data){
            console.log(data);
        }
    });
    
}

var showNewTaskModal = function() {
    $('#exampleModal').modal('show');
	$('#uploadform').show();
    $('#uploadprogress-container').hide();
	$('#processprogress-container').hide();
    $("#uploadbutton").removeAttr('disabled');
	$('#uploadprogress-container .progress-bar').css('width', '0%');
    $('#uploadprogresspercentage').html('0%');

}
